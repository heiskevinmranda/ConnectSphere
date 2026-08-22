"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Wifi, Activity, AlertTriangle, RefreshCw, ServerCrash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-client";

interface NetworkOverview {
  routers: { total: number; online: number; offline: number };
  accessPoints: { total: number; online: number; offline: number };
  clients: { total: number; maxCapacity: number };
  bandwidth: {
    download: number;
    upload: number;
    capacityDown: number;
    capacityUp: number;
    utilizationDown: number;
    utilizationUp: number;
  };
  activeAlerts: number;
  totalTrafficToday: string;
}

interface NetworkAlert {
  id: number;
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  device: string;
  timestamp: string;
}

const sevColor: Record<string, string> = {
  critical: "var(--color-error)",
  warning: "var(--color-warning)",
  info: "var(--color-text-muted)",
};

function formatAlertAge(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NetworkPage() {
  const [overview, setOverview] = useState<NetworkOverview | null>(null);
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, al] = await Promise.all([
          adminFetch<NetworkOverview>("/api/admin/network/overview"),
          adminFetch<NetworkAlert[]>("/api/admin/network/alerts"),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setAlerts(al ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message !== "Session expired"
              ? err.message
              : "Could not load network status. Check your connection and try again."
          );
        }
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

  // Poll for fresh telemetry every 30 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading network data">
        <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div>
        <PageHeader onRefresh={handleRefresh} refreshing={refreshing} />
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <ServerCrash className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load network data</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={handleRefresh} style={{ background: "var(--color-primary)", color: "#fff" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Routers Online",
      value: `${overview.routers.online}/${overview.routers.total}`,
      sub: `${overview.accessPoints.online}/${overview.accessPoints.total} access points`,
      icon: Wifi,
      iconColor: "var(--color-success)",
      iconBg: "var(--color-success-surface)",
    },
    {
      title: "Connected Clients",
      value: String(overview.clients.total),
      sub: `Capacity ${overview.clients.maxCapacity}`,
      icon: Activity,
      iconColor: "var(--color-primary)",
      iconBg: "var(--color-primary-surface)",
    },
    {
      title: "Bandwidth",
      value: `${overview.bandwidth.download.toFixed(1)} Mbps`,
      sub: `Up: ${overview.bandwidth.upload.toFixed(1)} Mbps · ↓${overview.bandwidth.utilizationDown}% ↑${overview.bandwidth.utilizationUp}%`,
      icon: Activity,
      iconColor: "var(--color-warning)",
      iconBg: "var(--color-warning-surface)",
    },
    {
      title: "Active Alerts",
      value: String(alerts.filter((a) => a.severity !== "info").length),
      sub: `Traffic today: ${overview.totalTrafficToday}`,
      icon: AlertTriangle,
      iconColor:
        alerts.some((a) => a.severity === "critical")
          ? "var(--color-error)"
          : "var(--color-success)",
      iconBg:
        alerts.some((a) => a.severity === "critical")
          ? "var(--color-error-surface)"
          : "var(--color-success-surface)",
    },
  ];

  return (
    <div>
      <PageHeader onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="net-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon className="h-5 w-5" style={{ color: c.iconColor }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{c.title}</p>
                    <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)" }}>{c.value}</p>
                    {c.sub && <p style={{ fontSize: "11px", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sub}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "16px" }}>Network Alerts</h3>
          {alerts.length === 0 ? (
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>No alerts. System is operating normally.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              {alerts.map((a) => (
                <li key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", borderRadius: "8px", background: "var(--color-bg-subtle)" }}>
                  <AlertTriangle className="h-4 w-4" style={{ marginTop: "2px", color: sevColor[a.severity] || "var(--color-text-muted)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)" }}>{a.message}</p>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {a.device} · {formatAlertAge(a.timestamp)}
                    </p>
                  </div>
                  <Badge style={{ background: sevColor[a.severity] ? `${sevColor[a.severity]}15` : "var(--color-bg-subtle)", color: sevColor[a.severity] || "var(--color-text-muted)", fontSize: "11px", textTransform: "capitalize" }}>{a.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Network</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Real-time network monitoring and alerts</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh network data"
        style={{ borderColor: "var(--color-border)", gap: "6px" }}
      >
        <RefreshCw className="h-4 w-4" style={{ animation: refreshing ? "spin 1s linear infinite" : undefined }} />
        Refresh
      </Button>
    </div>
  );
}
