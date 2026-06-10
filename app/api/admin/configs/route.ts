import { NextRequest, NextResponse } from "next/server";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN!;
const SELF_PROJECT = process.env.VERCEL_SELF_PROJECT || "checkout-saas";
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
  const value = JSON.stringify(configs);

  if (envId) {
    const r = await fetch(
      `https://api.vercel.com/v9/projects/${SELF_PROJECT}/env/${envId}${tq()}`,
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
    `https://api.vercel.com/v10/projects/${SELF_PROJECT}/env${tq()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "WHOP_CONFIGS",
        value,
        type: "encrypted",
        target: ["production", "preview"],
      }),
    }
  );
  return r.ok;
}

// GET — list all configs
export async function GET(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { configs } = await loadConfigs();
  return NextResponse.json({ configs });
}

// POST — add new config
export async function POST(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, product_id, company_id, api_key, target_project } = await req.json();
  if (!name || !product_id || !company_id || !api_key) {
    return NextResponse.json(
      { error: "All fields required" },
      { status: 400 }
    );
  }

  const { envId, configs } = await loadConfigs();

  const nc: WhopConfig = {
    id: crypto.randomUUID(),
    name,
    product_id,
    company_id,
    api_key,
    is_live: configs.length === 0,
    created_at: new Date().toISOString(),
    target_project: target_project || "serravalle-checkout",
  };

  configs.push(nc);

  if (!(await saveConfigs(envId, configs))) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ config: nc });
}

// PATCH — update config
export async function PATCH(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, product_id, company_id, api_key, target_project } = await req.json();
  if (!id)
    return NextResponse.json(
      { error: "Config ID required" },
      { status: 400 }
    );

  const { envId, configs } = await loadConfigs();
  const c = configs.find((c) => c.id === id);
  if (!c)
    return NextResponse.json({ error: "Config not found" }, { status: 404 });

  if (name !== undefined) c.name = name;
  if (product_id !== undefined) c.product_id = product_id;
  if (company_id !== undefined) c.company_id = company_id;
  if (api_key !== undefined) c.api_key = api_key;
  if (target_project !== undefined) c.target_project = target_project;

  if (!(await saveConfigs(envId, configs))) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ config: c });
}

// DELETE — remove config
export async function DELETE(req: NextRequest) {
  if (!auth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id)
    return NextResponse.json(
      { error: "Config ID required" },
      { status: 400 }
    );

  const { envId, configs } = await loadConfigs();
  const c = configs.find((c) => c.id === id);
  if (!c)
    return NextResponse.json({ error: "Config not found" }, { status: 404 });

  if (c.is_live) {
    return NextResponse.json(
      { error: "Cannot delete the live config" },
      { status: 400 }
    );
  }

  const filtered = configs.filter((c) => c.id !== id);

  if (!(await saveConfigs(envId, filtered))) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
