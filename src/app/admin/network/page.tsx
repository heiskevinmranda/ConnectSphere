"use client";

import { useEffect, useState } from "react";
import { Loader2, Wifi, Activity, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Overview { routersOnline: number; routersTotal: number; activeClients: number; bandwidth: { upload: number; download: number }; alertsCount: number; }
interface Alert { id: string; type: string; message: string; severity: string; timestamp: string; }

export default function NetworkPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const headers = { Authorization: "Bearer " + token };
    Promise.all([
      fetch("/api/admin/network/overview", { headers }).then((r) => r.json()),
      fetch("/api/admin/network/alerts", { headers }).then((r) => r.json()),
    ]).then(([ov, al]) => {
      if (ov.success) setOverview(ov.data);
      if (al.success) setAlerts(al.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} /></div>;
  }

  const statCards = [
    { title: "Routers Online", value: `${overview?.routersOnline ?? 0}/${overview?.routersTotal ?? 0}`, icon: Wifi, iconColor: "var(--color-success)", iconBg: "var(--color-success-surface)" },
    { title: "Active Clients", value: String(overview?.activeClients ?? 0), icon: Activity, iconColor: "var(--color-primary)", iconBg: "var(--color-primary-surface)" },
    { title: "Bandwidth", value: `${overview?.bandwidth?.download ?? 0} Mbps`, sub: `Up: ${overview?.bandwidth?.upload ?? 0} Mbps`, icon: Activity, iconColor: "var(--color-warning)", iconBg: "var(--color-warning-surface)" },
    { title: "Alerts", value: String(alerts.length), icon: AlertTriangle, iconColor: "var(--color-error)", iconBg: "var(--color-error-surface)" },
  ];

  const sevColor: Record<string, string> = { critical: "var(--color-error)", warning: "var(--color-warning)", info: "var(--color-text-muted)" };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Network</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Real-time network monitoring and alerts</p>
      </div>
      <div className="net-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon className="h-5 w-5" style={{ color: c.iconColor }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{c.title}</p>
                    <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)" }}>{c.value}</p>
                    {c.sub && <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{c.sub}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "16px" }}>Active Alerts</h3>
          {alerts.length === 0 ? (
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>No active alerts. System is operating normally.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {alerts.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", borderRadius: "8px", background: "var(--color-bg-subtle)" }}>
                  <AlertTriangle className="h-4 w-4" style={{ marginTop: "2px", color: sevColor[a.severity] || "var(--color-text-muted)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)" }}>{a.message}</p>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{a.type}</p>
                  </div>
                  <Badge style={{ background: sevColor[a.severity] ? `${sevColor[a.severity]}15` : "var(--color-bg-subtle)", color: sevColor[a.severity] || "var(--color-text-muted)", fontSize: "11px", textTransform: "capitalize" }}>{a.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
