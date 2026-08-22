"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Ticket, TrendingUp, Loader2, Activity, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-client";

interface Stats {
  vouchers: { total: number; used: number; remaining: number; usagePercentage: number };
  subscriptions: { active: number; expired: number; total: number };
  payments: { completed: number; pending: number; failed: number; totalRevenue: number };
  recent: { subscriptions: number; revenue: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<Stats>("/api/admin/dashboard-stats");
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message !== "Session expired"
              ? err.message
              : "Could not load dashboard statistics."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRetry = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading dashboard">
        <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Dashboard</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Overview of your ISP operations</p>
        </div>
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <AlertCircle className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load statistics</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={handleRetry} style={{ background: "var(--color-primary)", color: "#fff" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: "Active Subscribers", value: String(stats?.subscriptions.active ?? 0), icon: Users, iconColor: "var(--color-primary)", iconBg: "var(--color-primary-surface)" },
    { title: "Total Revenue", value: formatCurrency(stats?.payments.totalRevenue ?? 0), icon: DollarSign, iconColor: "var(--color-success)", iconBg: "var(--color-success-surface)" },
    { title: "Voucher Inventory", value: String(stats?.vouchers.remaining ?? 0), sub: `${stats?.vouchers.usagePercentage ?? 0}% redeemed`, icon: Ticket, iconColor: "var(--color-warning)", iconBg: "var(--color-warning-surface)" },
    { title: "Pending Payments", value: String(stats?.payments.pending ?? 0), icon: CreditCard, iconColor: "var(--color-error)", iconBg: "var(--color-error-surface)" },
  ];

  const detailRows = [
    { label: "New subscriptions (30d)", value: String(stats?.recent.subscriptions ?? 0) },
    { label: "Revenue (30d)", value: formatCurrency(stats?.recent.revenue ?? 0) },
    { label: "Completed payments", value: String(stats?.payments.completed ?? 0) },
    { label: "Failed payments", value: String(stats?.payments.failed ?? 0), highlight: (stats?.payments.failed ?? 0) > 0 },
  ];

  const voucherRows = [
    { label: "Total vouchers", value: String(stats?.vouchers.total ?? 0) },
    { label: "Used", value: String(stats?.vouchers.used ?? 0), color: "var(--color-warning)" },
    { label: "Remaining", value: String(stats?.vouchers.remaining ?? 0), color: "var(--color-success)" },
  ];

  const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: "8px", background: "var(--color-bg-subtle)" };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Dashboard</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Overview of your ISP operations</p>
      </div>
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <p style={{ fontSize: "13px", color: "var(--color-text-muted)", fontWeight: 500 }}>{card.title}</p>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: card.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon className="h-4 w-4" style={{ color: card.iconColor }} />
                  </div>
                </div>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)" }}>{card.value}</p>
                {card.sub && <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>{card.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Activity className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>Recent Activity</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {detailRows.map((r) => (
                <div key={r.label} style={{ ...rowStyle, padding: "12px 16px" }}>
                  <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{r.label}</span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: r.highlight ? "var(--color-error)" : "var(--color-text)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <TrendingUp className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>Voucher Inventory</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {voucherRows.map((r) => (
                <div key={r.label} style={{ ...rowStyle, padding: "12px 16px" }}>
                  <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{r.label}</span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: r.color || "var(--color-text)" }}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Redemption rate</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>{stats?.vouchers.usagePercentage ?? 0}%</span>
                </div>
                <div style={{ width: "100%", height: "6px", borderRadius: "3px", background: "var(--color-bg-subtle)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "3px", background: "var(--color-primary)", width: `${stats?.vouchers.usagePercentage ?? 0}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
