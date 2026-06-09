"use client";

import { useState, useEffect, useCallback } from "react";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  target: string[];
}

type Status = "idle" | "loading" | "saving" | "success" | "error";

const ENV_VAR_LABELS: Record<string, string> = {
  WHOP_API_KEY: "Whop API Key",
  WHOP_PRODUCT_ID: "Whop Product ID",
  WHOP_COMPANY_ID: "Whop Company ID",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [redeployStatus, setRedeployStatus] = useState("");

  const fetchEnvVars = useCallback(async (pw: string) => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/env-vars", {
        headers: { "x-admin-key": pw },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setStatus("error");
        setMessage("Invalid password.");
        return;
      }
      const data = await res.json();
      if (data.error) {
        setStatus("error");
        setMessage(data.error);
        return;
      }
      setEnvVars(data.envVars || []);
      const vals: Record<string, string> = {};
      for (const v of data.envVars || []) {
        vals[v.id] = v.value;
      }
      setEditedValues(vals);
      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to load.");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setAuthenticated(true);
    await fetchEnvVars(password);
  };

  const handleSave = async () => {
    setStatus("saving");
    setMessage("");
    setRedeployStatus("");

    const updates = envVars
      .filter((v) => editedValues[v.id] !== v.value)
      .map((v) => ({ id: v.id, key: v.key, value: editedValues[v.id] }));

    if (updates.length === 0) {
      setStatus("idle");
      setMessage("No changes to save.");
      return;
    }

    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": password,
        },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (data.error) {
        setStatus("error");
        setMessage(data.error);
        return;
      }

      setRedeployStatus(data.redeploy || "");
      setStatus("success");
      setMessage(
        `${updates.length} variable${updates.length > 1 ? "s" : ""} updated.`
      );

      await fetchEnvVars(password);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to save.");
    }
  };

  const hasChanges = envVars.some((v) => editedValues[v.id] !== v.value);

  if (!authenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoRow}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h1 style={styles.title}>Checkout Admin</h1>
          </div>
          <p style={styles.subtitle}>
            Enter the admin password to manage checkout settings.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={styles.primaryButton}>
              Continue
            </button>
          </form>
          {status === "error" && <p style={styles.errorText}>{message}</p>}
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingDot} />
          <p style={{ textAlign: "center", color: "#666", marginTop: 16 }}>
            Loading environment variables...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Checkout Settings</h1>
            <p style={styles.subtitle}>
              Manage Whop payment configuration for the live checkout.
            </p>
          </div>
          <button
            onClick={() => fetchEnvVars(password)}
            style={styles.ghostButton}
            title="Refresh"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <div style={styles.divider} />

        {envVars.length === 0 && status !== "error" && (
          <p style={{ color: "#999", textAlign: "center", padding: 32 }}>
            No WHOP environment variables found.
          </p>
        )}

        {envVars.map((v) => (
          <div key={v.id} style={styles.fieldGroup}>
            <label style={styles.label}>
              {ENV_VAR_LABELS[v.key] || v.key}
              <span style={styles.labelMeta}>{v.key}</span>
            </label>
            <input
              type="text"
              value={editedValues[v.id] || ""}
              onChange={(e) =>
                setEditedValues((prev) => ({
                  ...prev,
                  [v.id]: e.target.value,
                }))
              }
              style={{
                ...styles.input,
                ...(editedValues[v.id] !== v.value
                  ? styles.inputChanged
                  : {}),
              }}
              spellCheck={false}
            />
            {editedValues[v.id] !== v.value && (
              <span style={styles.changedBadge}>Modified</span>
            )}
          </div>
        ))}

        {envVars.length > 0 && (
          <>
            <div style={styles.divider} />
            <div style={styles.footerRow}>
              <div>
                {status === "success" && (
                  <p style={styles.successText}>
                    {message}
                    {redeployStatus === "triggered" && (
                      <span style={styles.redeployBadge}>
                        Redeployment triggered
                      </span>
                    )}
                  </p>
                )}
                {status === "error" && (
                  <p style={styles.errorText}>{message}</p>
                )}
                {status === "idle" && message && (
                  <p style={{ color: "#666", fontSize: 13 }}>{message}</p>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={!hasChanges || status === "saving"}
                style={{
                  ...styles.primaryButton,
                  ...(!hasChanges || status === "saving"
                    ? styles.disabledButton
                    : {}),
                  width: "auto",
                  padding: "10px 28px",
                }}
              >
                {status === "saving" ? "Saving..." : "Save & Redeploy"}
              </button>
            </div>
          </>
        )}
      </div>

      <p style={styles.footerNote}>
        Changes are applied to the live checkout at checkout.serravallee.it
        <br />
        Redeployment takes ~30 seconds after saving.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "#fafafa",
    fontFamily:
      'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e5e5",
    padding: 32,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    margin: "6px 0 20px",
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    background: "#eee",
    margin: "20px 0",
  },
  fieldGroup: {
    marginBottom: 18,
    position: "relative" as const,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#333",
    marginBottom: 6,
  },
  labelMeta: {
    fontSize: 11,
    color: "#aaa",
    fontWeight: 400,
    marginLeft: 8,
    fontFamily: "monospace",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "monospace",
    border: "1px solid #ddd",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
    color: "#111",
    background: "#fafafa",
  },
  inputChanged: {
    borderColor: "#f59e0b",
    background: "#fffbeb",
  },
  changedBadge: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    fontSize: 10,
    fontWeight: 600,
    color: "#f59e0b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  primaryButton: {
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
  },
  disabledButton: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  ghostButton: {
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
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  successText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 500,
    marginTop: 12,
  },
  redeployBadge: {
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
  loadingDot: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #eee",
    borderTopColor: "#111",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  footerNote: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center" as const,
    marginTop: 16,
    lineHeight: 1.6,
  },
};
