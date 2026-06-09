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
  const v = (data.envs || []).find((e) => e.key === "WHOP_CONFIGS");
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
  envId,
  configs
) {
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