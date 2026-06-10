import { NextRequest, NextResponse } from "next/server";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN!;
const SELF_PROJECT = process.env.VERCEL_SELF_PROJECT || "checkout-saas";
const TARGET_PROJECT =
  process.env.VERCEL_TARGET_PROJECT || "serravalle-checkout";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

interface WhopConfig {
  id: string;
  name: string;
  product_id: string;
  company_id: string;
  api_key: string;
  is_live: boolean;
  created_at: string;
  target_project?: string;
}

function tq() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
}

function auth(req: NextRequest): boolean {
  return req.headers.get("x-admin-key") === ADMIN_PASSWORD;
}

async function loadConfigs(): Promise<{
  envId: string | null;
  configs: WhopConfig[];
}> {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${SELF_PROJECT}/env${tq()}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return { envId: null, configs: [] };

  const data = await res.json();
  const v = (data.envs || []).find((e: any) => e.key === "WHOP_CONFIGS");
  if (!v) return { envId: null, configs: [] };

  const dec = await fetch(
    `https://api.vercel.com/v1/projects/${SELF_PROJECT}/env/${v.id}${tq()}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
      cache: "no-store",
    }
  );
  if (!dec.ok) return { envId: v.id, configs: [] };

  const d = await dec.json();
  try {
    return { envId: v.id, configs: JSON.parse(d.value || "[]") };
  } catch {
    return { envId: v.id, configs: [] };
  }
}

async function saveConfigs(
  envId: string | null,
  configs: WhopConfig[]
): Promise<boolean> {
  if (!envId) return false;
  const r = await fetch(
    `https://api.vercel.com/v9/projects/${SELF_PROJECT}/env/${envId}${tq()}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: JSON.stringify(configs) }),
    }
  );
  return r.ok;
}

async function getTargetEnvVarIds(proj: string): Promise<Record<string, string>> {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${proj}/env${tq()}`,
    {
      headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, string> = {};
  for (const e of data.envs || []) {
    if (e.key.startsWith("WHOP_")) map[e.key] = e.id;
  }
  return map;
}

async function upsertTargetEnvVar(
  proj: string,
  existingId: string | undefined,
  key: string,
  value: string
): Promise<boolean> {
  if (existingId) {
    const r = await fetch(
      `https://api.vercel.com/v9/projects/${proj}/env/${existingId}${tq()}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      }
    );
    return r.ok;
  }

  const r = await fetch(
    `https://api.vercel.com/v10/projects/${proj}/env${tq()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type: "encrypted",
        target: ["production", "preview"],
      }),
    }
  );
  return r.ok;
}

export async function POST(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { configId } = await req.json();
  if (!configId)
    return NextResponse.json(
      { error: "Config ID required" },
      { status: 400 }
    );

  const { envId, configs } = await loadConfigs();
  const config = configs.find((c) => c.id === configId);
  if (!config)
    return NextResponse.json({ error: "Config not found" }, { status: 404 });

  // Use target_project from config, fallback to default
  const proj = config.target_project || TARGET_PROJECT;

  // Get existing env var IDs on target project (one API call)
  const varIds = await getTargetEnvVarIds(proj);

  // Update all three env vars in parallel
  const results = await Promise.all([
    upsertTargetEnvVar(
      proj,
      varIds["WHOP_PRODUCT_ID"],
      "WHOP_PRODUCT_ID",
      config.product_id
    ),
    upsertTargetEnvVar(
      proj,
      varIds["WHOP_COMPANY_ID"],
      "WHOP_COMPANY_ID",
      config.company_id
    ),
    upsertTargetEnvVar(
      proj,
      varIds["WHOP_API_KEY"],
      "WHOP_API_KEY",
      config.api_key
    ),
  ]);

  if (results.some((r) => !r)) {
    return NextResponse.json(
      { error: "Failed to update some env vars on target" },
      { status: 500 }
    );
  }

  // Update is_live flags — only within configs targeting the same project
  for (const c of configs) {
    if ((c.target_project || TARGET_PROJECT) === proj) {
      c.is_live = c.id === configId;
    }
  }
  await saveConfigs(envId, configs);

  // Trigger redeploy of target project
  let redeployStatus = "skipped";
  try {
    const dRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${proj}&target=production&limit=1${
        VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ""
      }`,
      { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
    );
    const dData = await dRes.json();

    if (dData.deployments?.length > 0) {
      const rRes = await fetch(
        `https://api.vercel.com/v13/deployments${tq()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VERCEL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: proj,
            deploymentId: dData.deployments[0].uid,
            target: "production",
          }),
        }
      );
      redeployStatus = rRes.ok ? "triggered" : "failed";
    }
  } catch {
    redeployStatus = "error";
  }

  return NextResponse.json({
    success: true,
    redeploy: redeployStatus,
    config,
  });
}
