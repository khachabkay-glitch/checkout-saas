"use client";

import { useState, useEffect, useCallback } from "react";

/* ────────────────────── TYPES ────────────────────── */

interface EnvVar {
  id: string;
  key: string;
  value: string;
  target: string[];
}

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

/* Project → domain mapping */
const PROJECTS: Record<string, string> = {
  "serravalle-checkout": "checkout.serravallee.it",
  "astheye-checkout": "checkout.astheye.com",
};
const PROJECT_LIST = Object.keys(PROJECTS);

interface Revenue {
  total_revenue: number;
  last_30d_revenue: number;
  total_orders: number;
  last_30d_orders: number;
  currency: string;
}

type Tab = "office" | "checkout";

/* ────────────────────── HELPERS ────────────────────── */

function fmt(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function mask(key: string) {
  if (key.length <= 12) return key;
  return key.slice(0, 8) + "••••" + key.slice(-4);
}

/* ────────────────────── COPY BUTTON ────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      style={s.copyBtn}
      title="Copy to clipboard"
    >
      {ok ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
    </button>
  );
}

/* ────────────────────── ENV VAR LABELS ────────────────────── */

const ENV_LABELS: Record<string, string> = {
  WHOP_API_KEY: "Whop API Key",
  WHOP_PRODUCT_ID: "Whop Product ID",
  WHOP_COMPANY_ID: "Whop Company ID",
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("office");
  const [loginErr, setLoginErr] = useState("");

  // ── Checkout tab state ──
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [cStatus, setCStatus] = useState<"idle" | "loading" | "saving" | "success" | "error">("idle");
  const [cMsg, setCMsg] = useState("");
  const [redeployMsg, setRedeployMsg] = useState("");

  // ── Office tab state ──
  const [configs, setConfigs] = useState<WhopConfig[]>([]);
  const [revs, setRevs] = useState<Record<string, Revenue>>({});
  const [officeLoading, setOfficeLoading] = useState(false);
  const [goingLiveId, setGoingLiveId] = useState<string | null>(null);
  const [liveSuccess, setLiveSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", product_id: "", company_id: "", api_key: "", target_project: "serravalle-checkout" });
  const [formErr, setFormErr] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hdrs = useCallback(
    () => ({ "x-admin-key": pw, "Content-Type": "application/json" }),
    [pw]
  );

  /* ── Fetch configs ── */
  const fetchConfigs = useCallback(async () => {
    setOfficeLoading(true);
    try {
      const res = await fetch("/api/admin/configs", {
        headers: { "x-admin-key": pw },
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch {}
    setOfficeLoading(false);
  }, [pw]);

  /* ── Fetch revenue for a config ── */
  const fetchRev = useCallback(
    async (cfg: WhopConfig) => {
      try {
        const res = await fetch("/api/admin/configs/revenue", {
          method: "POST",
          headers: hdrs(),
          body: JSON.stringify({ api_key: cfg.api_key }),
        });
        if (res.ok) {
          const data = await res.json();
          setRevs((p) => ({ ...p, [cfg.id]: data }));
        }
      } catch {}
    },
    [hdrs]
  );

  /* ── Fetch env vars for checkout tab ── */
  const fetchEnvVars = useCallback(async () => {
    setCStatus("loading");
    try {
      const res = await fetch("/api/admin/env-vars", {
        headers: { "x-admin-key": pw },
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setEnvVars(data.envVars || []);
      const vals: Record<string, string> = {};
      for (const v of data.envVars || []) vals[v.id] = v.value;
      setEdited(vals);
      setCStatus("idle");
    } catch (e: any) {
      setCStatus("error");
      setCMsg(e.message);
    }
  }, [pw]);

  /* ── On auth → load configs ── */
  useEffect(() => {
    if (authed) fetchConfigs();
  }, [authed, fetchConfigs]);

  /* ── Fetch revenue for each config once ── */
  useEffect(() => {
    for (const c of configs) {
      if (!revs[c.id]) fetchRev(c);
    }
  }, [configs, revs, fetchRev]);

  /* ── Load checkout data when switching to that tab ── */
  useEffect(() => {
    if (authed && tab === "checkout" && envVars.length === 0) fetchEnvVars();
  }, [tab, authed, envVars.length, fetchEnvVars]);

  /* ── Login ── */
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoginErr("");
    // Quick auth check
    const res = await fetch("/api/admin/configs", {
      headers: { "x-admin-key": pw },
    });
    if (res.status === 401) {
      setLoginErr("Invalid password.");
      return;
    }
    setAuthed(true);
  };

  /* ── Save checkout env vars ── */
  const saveCheckout = async () => {
    setCStatus("saving");
    setCMsg("");
    setRedeployMsg("");

    const updates = envVars
      .filter((v) => edited[v.id] !== v.value)
      .map((v) => ({ id: v.id, key: v.key, value: edited[v.id] }));

    if (updates.length === 0) {
      setCStatus("idle");
      setCMsg("No changes to save.");
      return;
    }

    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (data.error) {
        setCStatus("error");
        setCMsg(data.error);
        return;
      }
      setRedeployMsg(data.redeploy || "");
      setCStatus("success");
      setCMsg(`${updates.length} variable${updates.length > 1 ? "s" : ""} updated.`);
      await fetchEnvVars();
    } catch (e: any) {
      setCStatus("error");
      setCMsg(e.message);
    }
  };

  /* ── Go live on a specific project ── */
  const goLive = async (id: string, targetProject?: string) => {
    setGoingLiveId(id);
    setLiveSuccess(null);
    try {
      const res = await fetch("/api/admin/configs/go-live", {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ configId: id, targetProject }),
      });
      const data = await res.json();
      if (data.success) {
        setLiveSuccess(id);
        await fetchConfigs();
        setEnvVars([]); // force refresh on next checkout tab visit
        setTimeout(() => setLiveSuccess(null), 4000);
      }
    } catch {}
    setGoingLiveId(null);
  };

  /* ── Add / Edit config ── */
  const submitForm = async () => {
    setFormErr("");
    if (!form.name || !form.product_id || !form.company_id || !form.api_key) {
      setFormErr("All fields are required.");
      return;
    }
    setFormSaving(true);
    try {
      const isEdit = !!editId;
      const res = await fetch("/api/admin/configs", {
        method: isEdit ? "PATCH" : "POST",
        headers: hdrs(),
        body: JSON.stringify(isEdit ? { id: editId, ...form } : form),
      });
      if (res.ok) {
        setShowForm(false);
        setEditId(null);
        setForm({ name: "", product_id: "", company_id: "", api_key: "", target_project: "serravalle-checkout" });
        await fetchConfigs();
      } else {
        const d = await res.json();
        setFormErr(d.error || "Failed to save.");
      }
    } catch {
      setFormErr("Network error.");
    }
    setFormSaving(false);
  };

  /* ── Delete config ── */
  const deleteConfig = async (id: string) => {
    if (!confirm("Delete this config? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/configs", {
        method: "DELETE",
        headers: hdrs(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to delete.");
      }
      await fetchConfigs();
    } catch {}
    setDeletingId(null);
  };

  /* ── Open edit form ── */
  const startEdit = (c: WhopConfig) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      product_id: c.product_id,
      company_id: c.company_id,
      api_key: c.api_key,
      target_project: c.target_project || "serravalle-checkout",
    });
    setShowForm(true);
    setFormErr("");
  };

  const hasChanges = envVars.some((v) => edited[v.id] !== v.value);

  /* ════════════════ LOGIN SCREEN ════════════════ */
  if (!authed) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, maxWidth: 420 }}>
          <div style={s.logoRow}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <h1 style={s.title}>Checkout Admin</h1>
          </div>
          <p style={s.sub}>Enter the admin password to continue.</p>
          <form onSubmit={login}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password" style={s.input} autoFocus />
            <button type="submit" style={s.btnPrimary}>Continue</button>
          </form>
          {loginErr && <p style={s.errText}>{loginErr}</p>}
        </div>
      </div>
    );
  }

  /* ════════════════ MAIN LAYOUT ════════════════ */
  return (
    <div style={s.page}>
      {/* ── Tab Bar ── */}
      <div style={s.tabBar}>
        <button style={tab === "office" ? s.tabActive : s.tabBtn} onClick={() => setTab("office")}>
          The Office
        </button>
        <button style={tab === "checkout" ? s.tabActive : s.tabBtn} onClick={() => setTab("checkout")}>
          Current Checkout
        </button>
      </div>

      {/* ════════════ THE OFFICE TAB ════════════ */}
      {tab === "office" && (
        <div style={{ width: "100%", maxWidth: 880 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ ...s.title, fontSize: 22 }}>Whop Configurations</h1>
              <p style={{ ...s.sub, margin: "4px 0 0" }}>All saved Whop setups. Click to expand.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => fetchConfigs()} style={s.ghost} title="Refresh">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              </button>
              <button
                onClick={() => {
                  setEditId(null);
                  setForm({ name: "", product_id: "", company_id: "", api_key: "", target_project: "serravalle-checkout" });
                  setShowForm(true);
                  setFormErr("");
                }}
                style={s.btnPrimary}
              >
                + Add Config
              </button>
            </div>
          </div>

          {/* ── Add / Edit Form ── */}
          {showForm && (
            <div style={{ ...s.card, marginBottom: 20, maxWidth: "100%" }}>
              <h2 style={{ ...s.title, fontSize: 16, marginBottom: 16 }}>
                {editId ? "Edit Configuration" : "New Configuration"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={s.label}>Name</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Serravalle Main" style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Target Project</label>
                  <select value={form.target_project} onChange={(e) => setForm((f) => ({ ...f, target_project: e.target.value }))} style={{ ...s.input, cursor: "pointer" }}>
                    {PROJECT_LIST.map((p) => (
                      <option key={p} value={p}>{p} → {PROJECTS[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Product ID</label>
                  <input value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))} placeholder="prod_..." style={{ ...s.input, fontFamily: "monospace" }} />
                </div>
                <div>
                  <label style={s.label}>Company ID</label>
                  <input value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))} placeholder="biz_..." style={{ ...s.input, fontFamily: "monospace" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>API Key</label>
                  <input value={form.api_key} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} placeholder="apik_..." style={{ ...s.input, fontFamily: "monospace" }} />
                </div>
              </div>
              {formErr && <p style={{ ...s.errText, marginTop: 8 }}>{formErr}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowForm(false); setEditId(null); }}
                  style={{ ...s.ghost, padding: "8px 20px" }}
                >
                  Cancel
                </button>
                <button onClick={submitForm} disabled={formSaving} style={{ ...s.btnPrimary, width: "auto", padding: "8px 24px", opacity: formSaving ? 0.5 : 1 }}>
                  {formSaving ? "Saving..." : editId ? "Update" : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {officeLoading && configs.length === 0 && (
            <div style={{ ...s.card, maxWidth: "100%", textAlign: "center", padding: 48 }}>
              <div style={s.spinner} />
              <p style={{ color: "#888", marginTop: 16 }}>Loading configs...</p>
            </div>
          )}

          {/* ── Empty State ── */}
          {!officeLoading && configs.length === 0 && (
            <div style={{ ...s.card, maxWidth: "100%", textAlign: "center", padding: 48 }}>
              <p style={{ color: "#888", fontSize: 14 }}>No Whop configurations saved yet.</p>
              <p style={{ color: "#aaa", fontSize: 13 }}>Click "Add Config" to create your first one.</p>
            </div>
          )}

          {/* ── Config Cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {configs.map((c) => {
              const rev = revs[c.id];
              const isExpanded = expandedId === c.id;
              const isGoingLive = goingLiveId === c.id;
              const justWentLive = liveSuccess === c.id;

              return (
                <div
                  key={c.id}
                  style={{
                    ...s.card,
                    maxWidth: "100%",
                    cursor: "pointer",
                    border: c.is_live ? "1.5px solid #111" : "1px solid #e5e5e5",
                    transition: "all 0.15s",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  {/* ── Card Header ── */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111", margin: 0 }}>{c.name}</h3>
                      {c.is_live && (
                        <span style={s.liveBadge}>LIVE</span>
                      )}
                      {justWentLive && (
                        <span style={s.successBadge}>Deployed</span>
                      )}
                      <span style={{ fontSize: 10, color: "#999", fontWeight: 400 }}>
                        → {PROJECTS[c.target_project || "serravalle-checkout"] || c.target_project}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {rev ? (
                        <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
                          {fmt(rev.total_revenue, rev.currency)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#ccc" }}>loading...</span>
                      )}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#999"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* ── Expanded Content ── */}
                  {isExpanded && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 16 }}>
                      <div style={s.divider} />

                      {/* Revenue Row */}
                      {rev && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, margin: "16px 0" }}>
                          <div>
                            <p style={s.statLabel}>Lifetime Revenue</p>
                            <p style={s.statValue}>{fmt(rev.total_revenue, rev.currency)}</p>
                          </div>
                          <div>
                            <p style={s.statLabel}>Last 30 Days</p>
                            <p style={s.statValue}>{fmt(rev.last_30d_revenue, rev.currency)}</p>
                          </div>
                          <div>
                            <p style={s.statLabel}>Total Orders</p>
                            <p style={s.statValue}>{rev.total_orders}</p>
                          </div>
                          <div>
                            <p style={s.statLabel}>Orders (30d)</p>
                            <p style={s.statValue}>{rev.last_30d_orders}</p>
                          </div>
                        </div>
                      )}

                      <div style={s.divider} />

                      {/* Credentials */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0" }}>
                        <div style={s.credRow}>
                          <span style={s.credLabel}>Product ID</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={s.credValue}>{c.product_id}</code>
                            <CopyBtn text={c.product_id} />
                          </div>
                        </div>
                        <div style={s.credRow}>
                          <span style={s.credLabel}>Company ID</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={s.credValue}>{c.company_id}</code>
                            <CopyBtn text={c.company_id} />
                          </div>
                        </div>
                        <div style={s.credRow}>
                          <span style={s.credLabel}>API Key</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={s.credValue}>{mask(c.api_key)}</code>
                            <CopyBtn text={c.api_key} />
                          </div>
                        </div>
                      </div>

                      <div style={s.divider} />

                      {/* Action Buttons */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => startEdit(c)} style={{ ...s.ghost, padding: "6px 14px", fontSize: 12 }}>
                            Edit
                          </button>
                          {!c.is_live && (
                            <button
                              onClick={() => deleteConfig(c.id)}
                              disabled={deletingId === c.id}
                              style={{ ...s.ghost, padding: "6px 14px", fontSize: 12, color: "#dc2626", borderColor: "#fca5a5", opacity: deletingId === c.id ? 0.5 : 1 }}
                            >
                              {deletingId === c.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Per-Project Go Live Buttons */}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {PROJECT_LIST.map((proj) => {
                          const domain = PROJECTS[proj];
                          const isLiveHere = c.is_live && (c.target_project || "serravalle-checkout") === proj;
                          return (
                            <button
                              key={proj}
                              onClick={() => goLive(c.id, proj)}
                              disabled={isGoingLive || isLiveHere}
                              style={{
                                flex: 1,
                                padding: "10px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                color: isLiveHere ? "#059669" : "#fff",
                                background: isLiveHere ? "#ecfdf5" : "#111",
                                border: isLiveHere ? "1.5px solid #059669" : "1.5px solid #111",
                                borderRadius: 8,
                                cursor: isGoingLive || isLiveHere ? "default" : "pointer",
                                opacity: isGoingLive && !isLiveHere ? 0.5 : 1,
                                transition: "all 0.15s",
                                whiteSpace: "nowrap" as const,
                              }}
                            >
                              {isGoingLive && !isLiveHere
                                ? "Deploying..."
                                : isLiveHere
                                ? `✓ Live on ${domain}`
                                : `▶ ${domain}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════ CURRENT CHECKOUT TAB ════════════ */}
      {tab === "checkout" && (
        <div style={{ ...s.card, maxWidth: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={s.title}>Live Checkout Settings</h1>
              <p style={s.sub}>Current Whop values on checkout.serravallee.it</p>
            </div>
            <button onClick={() => fetchEnvVars()} style={s.ghost} title="Refresh">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            </button>
          </div>

          <div style={s.divider} />

          {cStatus === "loading" && (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={s.spinner} />
              <p style={{ color: "#888", marginTop: 16 }}>Loading...</p>
            </div>
          )}

          {cStatus !== "loading" && envVars.length === 0 && (
            <p style={{ color: "#999", textAlign: "center", padding: 32 }}>
              No WHOP environment variables found.
            </p>
          )}

          {envVars.map((v) => (
            <div key={v.id} style={{ marginBottom: 18, position: "relative" as const }}>
              <label style={s.label}>
                {ENV_LABELS[v.key] || v.key}
                <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400, marginLeft: 8, fontFamily: "monospace" }}>{v.key}</span>
              </label>
              <input
                type="text"
                value={edited[v.id] || ""}
                onChange={(e) => setEdited((p) => ({ ...p, [v.id]: e.target.value }))}
                style={{ ...s.input, fontFamily: "monospace", ...(edited[v.id] !== v.value ? { borderColor: "#f59e0b", background: "#fffbeb" } : {}) }}
                spellCheck={false}
              />
              {edited[v.id] !== v.value && (
                <span style={{ position: "absolute" as const, top: 0, right: 0, fontSize: 10, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                  Modified
                </span>
              )}
            </div>
          ))}

          {envVars.length > 0 && (
            <>
              <div style={s.divider} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div>
                  {cStatus === "success" && (
                    <p style={{ color: "#059669", fontSize: 13, fontWeight: 500, margin: 0 }}>
                      {cMsg}
                      {redeployMsg === "triggered" && (
                        <span style={s.successBadge}>Redeployment triggered</span>
                      )}
                    </p>
                  )}
                  {cStatus === "error" && <p style={s.errText}>{cMsg}</p>}
                  {cStatus === "idle" && cMsg && <p style={{ color: "#666", fontSize: 13 }}>{cMsg}</p>}
                </div>
                <button
                  onClick={saveCheckout}
                  disabled={!hasChanges || cStatus === "saving"}
                  style={{ ...s.btnPrimary, width: "auto", padding: "10px 28px", opacity: !hasChanges || cStatus === "saving" ? 0.4 : 1, cursor: !hasChanges || cStatus === "saving" ? "not-allowed" : "pointer" }}
                >
                  {cStatus === "saving" ? "Saving..." : "Save & Redeploy"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <p style={{ fontSize: 11, color: "#aaa", textAlign: "center" as const, marginTop: 16, lineHeight: 1.6 }}>
        Changes are applied to the live checkout at checkout.serravallee.it
        <br />
        Redeployment takes ~30 seconds after saving.
      </p>

      {tab === "office" && (
        <p style={{ fontSize: 11, color: "#bbb", textAlign: "center" as const, marginTop: 4 }}>
          Projects: {PROJECT_LIST.map((p) => `${p} → ${PROJECTS[p]}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

/* ────────────────────── STYLES ────────────────────── */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 24px 48px",
    background: "#fafafa",
    fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e5e5",
    padding: "24px 28px",
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  tabBar: {
    display: "flex",
    gap: 4,
    marginBottom: 24,
    background: "#f0f0f0",
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: {
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 500,
    color: "#666",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 600,
    color: "#111",
    background: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111",
    margin: 0,
  },
  sub: {
    fontSize: 13,
    color: "#888",
    margin: "6px 0 20px",
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    background: "#eee",
    margin: "16px 0",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#555",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    fontSize: 13,
    border: "1px solid #ddd",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
    color: "#111",
    background: "#fafafa",
  },
  btnPrimary: {
    width: "100%",
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    color: "#fff",
    background: "#111",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.15s",
    whiteSpace: "nowrap" as const,
  },
  ghost: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 8,
    cursor: "pointer",
    color: "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#999",
    padding: 4,
    display: "flex",
    alignItems: "center",
    borderRadius: 4,
    transition: "color 0.15s",
  },
  liveBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    background: "#111",
    padding: "2px 8px",
    borderRadius: 4,
    letterSpacing: "0.06em",
  },
  successBadge: {
    display: "inline-block",
    marginLeft: 8,
    fontSize: 10,
    fontWeight: 600,
    color: "#059669",
    background: "#ecfdf5",
    padding: "2px 8px",
    borderRadius: 4,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  errText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 500,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    margin: "0 0 2px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  statValue: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111",
    margin: 0,
  },
  credRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
  },
  credLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: 500,
    minWidth: 90,
  },
  credValue: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#333",
    background: "#f5f5f5",
    padding: "3px 8px",
    borderRadius: 4,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "3px solid #eee",
    borderTopColor: "#111",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
};
