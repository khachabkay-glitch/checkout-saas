import { NextRequest, NextResponse } from "next/server";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN!;
const TARGET_PROJECT = process.env.VERCEL_TARGET_PROJECT || "serravalle-checkout";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
}

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return !!key && key === ADMIN_PASSWORD;
}

// GET — fetch current WHOP_* env vars from the target Vercel project
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${TARGET_PROJECT}/env${teamQuery()}`,
      { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      return NextResponse.json(
        { error: `Vercel API error: ${err}` },
        { status: listRes.status }
      );
    }

    const data = await listRes.json();
    const whopVars = (data.envs || []).filter((e: any) =>
      e.key.startsWith("WHOP_")
    );

    const decrypted = await Promise.all(
      whopVars.map(async (v: any) => {
        const r = await fetch(
          `https://api.vercel.com/v1/projects/${TARGET_PROJECT}/env/${v.id}${teamQuery()}`,
          { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
        );
        if (!r.ok) {
          return { id: v.id, key: v.key, value: "(unable to decrypt)", target: v.target };
        }
        const d = await r.json();
        return { id: d.id, key: d.key, value: d.value || "", target: d.target };
      })
    );

    return NextResponse.json({ envVars: decrypted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch env vars" },
      { status: 500 }
    );
  }
}

// POST — update env vars and trigger redeploy
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { updates } = await req.json();

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const results = [];
    for (const update of updates) {
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${TARGET_PROJECT}/env/${update.id}${teamQuery()}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${VERCEL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: update.value }),
        }
      );

      if (!patchRes.ok) {
        const err = await patchRes.text();
        results.push({ key: update.key, success: false, error: err });
      } else {
        results.push({ key: update.key, success: true });
      }
    }

    let redeployStatus = "skipped";
    try {
      const deploymentsRes = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${TARGET_PROJECT}&target=production&limit=1${VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ""}`,
        { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
      );

      const deploymentsData = await deploymentsRes.json();

      if (deploymentsData.deployments?.length > 0) {
        const latestDeployment = deploymentsData.deployments[0];

        const redeployRes = await fetch(
          `https://api.vercel.com/v13/deployments${teamQuery()}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${VERCEL_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: TARGET_PROJECT,
              deploymentId: latestDeployment.uid,
              target: "production",
            }),
          }
        );

        if (redeployRes.ok) {
          redeployStatus = "triggered";
        } else {
          const redeployErr = await redeployRes.text();
          redeployStatus = `failed: ${redeployErr}`;
        }
      } else {
        redeployStatus = "no deployments found";
      }
    } catch (redeployErr: any) {
      redeployStatus = `error: ${redeployErr.message}`;
    }

    return NextResponse.json({
      success: results.every((r) => r.success),
      results,
      redeploy: redeployStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update env vars" },
      { status: 500 }
    );
  }
}
