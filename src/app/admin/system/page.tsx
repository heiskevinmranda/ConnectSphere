"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Database,
  Server,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  ScrollText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { adminFetch } from "@/lib/admin-client";

interface HealthResponse {
  status: "OK" | "DEGRADED";
  checks: { api: "ok" | "error"; database: "ok" | "error" };
  version: string;
  environment: string;
  uptimeSeconds: number;
  latencyMs: number;
  timestamp: string;
}

interface AuditLogRow {
  id: number;
  actor: string;
  actorType: string;
  action: string;
  target: string | null;
  details: string | null;
  ip: string | null;
  status: string;
  createdAt: string;
}

type Tab = "health" | "audit" | "security";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function SystemPage() {
  const [tab, setTab] = useState<Tab>("health");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    adminFetch<{ role: string }>("/api/admin/me")
      .then((account) => setRole(account.role))
      .catch(() => {});
  }, []);

  const isSuperAdmin = role === "super_admin";

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; visible: boolean }> = [
    { id: "health", label: "Health", icon: Server, visible: true },
    { id: "audit", label: "Audit Log", icon: ScrollText, visible: isSuperAdmin },
    { id: "security", label: "Security", icon: KeyRound, visible: true },
  ];

  const activeTab: Tab = tabs.find((t) => t.id === tab && t.visible)?.id ?? "health";

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>System</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Health monitoring, audit trail and account security</p>
      </div>

      <div role="tablist" aria-label="System sections" style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--color-border)", marginBottom: "20px", overflowX: "auto" }}>
        {tabs.filter((t) => t.visible).map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--color-primary)" : "transparent"}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "health" && <HealthPanel />}
      {activeTab === "audit" && <AuditPanel />}
      {activeTab === "security" && <SecurityPanel />}
    </div>
  );
}

function HealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        if (!cancelled) {
          setHealth(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not reach the health endpoint.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading system health">
        <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const dbOk = health?.checks.database === "ok";
  const apiOk = health?.checks.api === "ok";

  const checkCards = [
    {
      label: "API Server",
      ok: apiOk && !!health,
      detail: health ? `${health.latencyMs}ms latency` : "No response",
      icon: Server,
    },
    {
      label: "Database",
      ok: dbOk,
      detail: dbOk ? "Query round-trip successful" : "Connection failed",
      icon: Database,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            aria-hidden
            style={{ width: "10px", height: "10px", borderRadius: "50%", background: health?.status === "OK" ? "var(--color-success)" : "var(--color-error)", boxShadow: health?.status === "OK" ? "0 0 0 3px var(--color-success-surface)" : "0 0 0 3px var(--color-error-surface)" }}
          />
          <span style={{ fontSize: "14px", fontWeight: 600, color: health?.status === "OK" ? "var(--color-success)" : "var(--color-error)" }} aria-live="polite">
            {error ? "Status unknown" : health?.status === "OK" ? "All systems operational" : "Degraded performance"}
          </span>
          {health && (
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              Checked {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); setRefreshKey((k) => k + 1); }} disabled={refreshing} aria-label="Refresh health status" style={{ borderColor: "var(--color-border)", gap: "6px" }}>
          <RefreshCw className="h-4 w-4" style={{ animation: refreshing ? "spin 1s linear infinite" : undefined }} />
          Refresh
        </Button>
      </div>

      {error && !loading ? (
        <Card style={{ marginBottom: "16px" }}>
          <CardContent style={{ padding: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertCircle className="h-5 w-5" style={{ color: "var(--color-error)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="sys-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "16px" }}>
        {checkCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: c.ok ? "var(--color-success-surface)" : "var(--color-error-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon className="h-5 w-5" style={{ color: c.ok ? "var(--color-success)" : "var(--color-error)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>{c.label}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.ok ? "var(--color-success)" : "var(--color-error)" }} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: c.ok ? "var(--color-success)" : "var(--color-error)", textTransform: "capitalize" }}>
                        {c.ok ? "Operational" : "Down"}
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>{c.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {health && (
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "16px" }}>Runtime Information</h3>
            <div>
              {[
                { label: "Application version", value: health.version },
                { label: "Environment", value: health.environment },
                { label: "Process uptime", value: formatUptime(health.uptimeSeconds) },
                { label: "Database engine", value: "SQLite (libsql) via Prisma ORM" },
                { label: "Payment provider", value: "AzamPay" },
              ].map((row, i) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--color-border-light)" }}>
                  <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AuditPanel() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState({ action: "", actor: "", status: "all" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery({ action: actionFilter, actor: actorFilter, status: statusFilter });
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [actionFilter, actorFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (query.action) params.set("action", query.action);
        if (query.actor) params.set("actor", query.actor);
        if (query.status !== "all") params.set("status", query.status);
        const result = await adminFetch<{ data: AuditLogRow[]; pagination: { total: number; totalPages: number } }>(
          `/api/admin/audit-logs?${params}`
        );
        if (!cancelled) {
          setError(null);
          setRows(result.data ?? []);
          setTotalPages(result.pagination?.totalPages ?? 1);
          setTotal(result.pagination?.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message !== "Session expired"
              ? err.message
              : "Could not load audit logs."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, query, refreshKey]);

  const handleRetry = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "left",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-bg-subtle)",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: "12.5px",
    borderBottom: "1px solid var(--color-border-light)",
    verticalAlign: "middle",
  };

  return (
    <div>
      <Card style={{ marginBottom: "16px" }}>
        <CardContent style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <Input
              placeholder="Filter by action e.g. payment."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by action"
              style={{ flex: 1, minWidth: "180px" }}
            />
            <Input
              placeholder="Filter by actor email"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              aria-label="Filter by actor"
              style={{ flex: 1, minWidth: "180px" }}
            />
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
              <SelectTrigger style={{ minWidth: "130px" }} aria-label="Filter by outcome">
                <SelectValue placeholder="All outcomes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }} aria-live="polite">
              {total} event{total !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
            <AlertCircle className="h-9 w-9" style={{ margin: "0 auto 14px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load audit logs</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px" }}>{error}</p>
            <Button onClick={handleRetry} style={{ background: "var(--color-primary)", color: "#fff" }}>Retry</Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "70px 0" }} role="status" aria-label="Loading audit logs">
          <Loader2 className="h-7 w-7" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "56px 20px", textAlign: "center" }}>
            <ScrollText className="h-11 w-11" style={{ margin: "0 auto 14px", color: "var(--color-text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "4px" }}>No audit events found</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Administrative actions will appear here as they happen</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={thStyle}>Time</TableHead>
                  <TableHead style={thStyle}>Action</TableHead>
                  <TableHead style={thStyle}>Actor</TableHead>
                  <TableHead style={thStyle}>Target</TableHead>
                  <TableHead style={thStyle}>Outcome</TableHead>
                  <TableHead style={thStyle}>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell style={tdStyle}>
                      <span style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell style={tdStyle}>
                      <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "12px", fontWeight: 600, color: "var(--color-primary)" }}>{log.action}</span>
                    </TableCell>
                    <TableCell style={tdStyle}>
                      <div>
                        <div style={{ fontSize: "12.5px", color: "var(--color-text)", overflowWrap: "anywhere" }}>{log.actor}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "capitalize" }}>{log.actorType}</div>
                      </div>
                    </TableCell>
                    <TableCell style={tdStyle}>
                      <span title={log.details ?? undefined} style={{ color: "var(--color-text-secondary)", fontSize: "12px" }}>
                        {log.target || "-"}
                      </span>
                    </TableCell>
                    <TableCell style={tdStyle}>
                      {log.status === "success" ? (
                        <Badge style={{ background: "var(--color-success-surface)", color: "var(--color-success)", fontSize: "10px", fontWeight: 700, padding: "2px 8px", textTransform: "uppercase" }}>Success</Badge>
                      ) : (
                        <Badge style={{ background: "var(--color-error-surface)", color: "var(--color-error)", fontSize: "10px", fontWeight: 700, padding: "2px 8px", textTransform: "uppercase" }}>Failure</Badge>
                      )}
                    </TableCell>
                    <TableCell style={tdStyle}>
                      <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "11px", color: "var(--color-text-muted)" }}>{log.ip || "-"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px" }} aria-label="Audit log pagination">
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Page {page} of {totalPages}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" style={{ borderColor: "var(--color-border)", gap: "4px" }}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Next page" style={{ borderColor: "var(--color-border)", gap: "4px" }}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

function SecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setFormError("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await adminFetch("/api/admin/account/password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      toast.success("Password updated", { description: "Use your new password next time you sign in." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Could not change password", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputGroup = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string
  ) => (
    <div>
      <Label htmlFor={`pw-${label.replace(/\s/g, "-").toLowerCase()}`}>{label}</Label>
      <Input
        id={`pw-${label.replace(/\s/g, "-").toLowerCase()}`}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={label.startsWith("Current") ? undefined : 8}
        style={{ marginTop: "6px" }}
      />
    </div>
  );

  return (
    <Card style={{ maxWidth: "480px" }}>
      <CardContent style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <ShieldCheck className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>Change password</h3>
        </div>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
          Choose a strong password of at least 8 characters.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {inputGroup("Current password", currentPassword, setCurrentPassword, "current-password")}
          {inputGroup("New password", newPassword, setNewPassword, "new-password")}
          {inputGroup("Confirm new password", confirmPassword, setConfirmPassword, "new-password")}
          {formError && (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--color-error)" }}>
              <ShieldAlert className="h-4 w-4" /> {formError}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            style={{
              alignSelf: "flex-start",
              padding: "10px 22px",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              background: "var(--color-primary)",
              color: "#fff",
              cursor: saving || !currentPassword || !newPassword || !confirmPassword ? "not-allowed" : "pointer",
              opacity: saving || !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
            }}
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
