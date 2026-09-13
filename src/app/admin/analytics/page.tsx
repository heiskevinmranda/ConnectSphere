"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-client";
import { formatCurrency } from "@/lib/utils";

interface VoucherAnalytics {
  voucherUsageByDay: Array<{ date: string; count: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
  voucherDistribution: Array<{
    price: number;
    total: number;
    available: number;
    used: number;
  }>;
  usageByPrice: Array<{ price: number; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; transactions: number }>;
  subscriberGrowth: Array<{ month: string; count: number }>;
}

interface SubscriptionAnalytics {
  statusDistribution: Array<{ status: string; count: number }>;
  expiringSoon: number;
  averageDuration: number;
}

const PIE_COLORS = ["#1a4731", "#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2"];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return month;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} '${String(year).slice(2)}`;
}

function formatDayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  if (!m || !d) return date;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} ${d}`;
}

const axisStyle = { fontSize: 11, fill: "var(--color-text-muted)" };

function ChartTooltipCurrency(value: unknown): string {
  return formatCurrency(Number(value));
}

export default function AnalyticsPage() {
  const [voucherData, setVoucherData] = useState<VoucherAnalytics | null>(null);
  const [subData, setSubData] = useState<SubscriptionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [v, s] = await Promise.all([
          adminFetch<VoucherAnalytics>("/api/admin/voucher-analytics"),
          adminFetch<SubscriptionAnalytics>("/api/admin/subscription-analytics"),
        ]);
        if (!cancelled) {
          setVoucherData(v);
          setSubData(s);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message !== "Session expired"
              ? err.message
              : "Could not load analytics data."
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

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading analytics">
        <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !voucherData || !subData) {
    return (
      <div>
        <PageHeader onRefresh={handleRefresh} refreshing={refreshing} />
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <AlertCircle className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load analytics</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={handleRefresh} style={{ background: "var(--color-primary)", color: "#000" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const revenue12m = voucherData.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const transactions12m = voucherData.monthlyRevenue.reduce((sum, m) => sum + m.transactions, 0);

  const kpiCards = [
    { title: "Revenue (12 months)", value: formatCurrency(revenue12m), icon: TrendingUp, iconColor: "var(--color-success)", iconBg: "var(--color-success-surface)" },
    { title: "Transactions (12 months)", value: String(transactions12m), icon: BarChart3, iconColor: "var(--color-primary)", iconBg: "var(--color-primary-surface)" },
    { title: "Expiring in 7 days", value: String(subData.expiringSoon), icon: Clock, iconColor: subData.expiringSoon > 0 ? "var(--color-warning)" : "var(--color-success)", iconBg: subData.expiringSoon > 0 ? "var(--color-warning-surface)" : "var(--color-success-surface)" },
    { title: "Avg subscription length", value: `${subData.averageDuration} days`, icon: Users, iconColor: "var(--color-primary)", iconBg: "var(--color-primary-surface)" },
  ];

  const hasRevenue = voucherData.monthlyRevenue.length > 0;
  const hasUsage = voucherData.voucherUsageByDay.length > 0;
  const hasPlanDist = voucherData.planDistribution.length > 0;
  const hasStock = voucherData.voucherDistribution.length > 0;
  const hasGrowth = voucherData.subscriberGrowth.length > 0;

  return (
    <div>
      <PageHeader onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <p style={{ fontSize: "15px", color: "var(--color-text-muted)", fontWeight: 500 }}>{card.title}</p>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: card.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon className="h-4 w-4" style={{ color: card.iconColor }} />
                  </div>
                </div>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)" }}>{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <ChartCard
          title="Monthly Revenue"
          subtitle="Completed payments over the last 12 months"
          empty={!hasRevenue}
          emptyMessage="No completed payments yet"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={voucherData.monthlyRevenue.map((m) => ({ ...m, label: formatMonthLabel(m.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a4731" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1a4731" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip formatter={ChartTooltipCurrency} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1a4731" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Subscriber Growth"
          subtitle="New subscriptions per month"
          empty={!hasGrowth}
          emptyMessage="No subscriptions yet"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={voucherData.subscriberGrowth.map((g) => ({ ...g, label: formatMonthLabel(g.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="count" name="New subscribers" stroke="#e67e22" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Voucher Redemptions"
          subtitle="Daily redemptions over the last 30 days"
          empty={!hasUsage}
          emptyMessage="No vouchers redeemed yet"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={voucherData.voucherUsageByDay.map((u) => ({ ...u, label: formatDayLabel(u.date) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} interval="preserveStartEnd" />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Bar dataKey="count" name="Redemptions" fill="#2d6a4f" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Voucher Stock by Price"
          subtitle="Available vs redeemed inventory"
          empty={!hasStock}
          emptyMessage="No vouchers in inventory"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={voucherData.voucherDistribution.map((d) => ({ ...d, label: `${(d.price / 1000).toFixed(d.price % 1000 === 0 ? 0 : 1)}k` }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="available" name="Available" stackId="stock" fill="#52b788" radius={[0, 0, 0, 0]} maxBarSize={40} />
              <Bar dataKey="used" name="Used" stackId="stock" fill="#1a4731" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Plan Popularity"
          subtitle="All subscriptions by plan"
          empty={!hasPlanDist}
          emptyMessage="No subscriptions yet"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={voucherData.planDistribution}
                dataKey="count"
                nameKey="plan"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                label={({ plan, percent }: { plan?: string; percent?: number }) =>
                  `${plan ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "var(--color-border)" }}
              >
                {voucherData.planDistribution.map((entry, index) => (
                  <Cell key={`cell-${entry.plan}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown, name: unknown) => [`${Number(value)} subscriptions`, String(name)]}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Subscription Status"
          subtitle="Current status distribution"
          empty={subData.statusDistribution.length === 0}
          emptyMessage="No subscriptions yet"
        >
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
            {subData.statusDistribution.map((s) => {
              const total = subData.statusDistribution.reduce((sum, x) => sum + x.count, 0);
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              const color =
                s.status === "active" ? "#2d6a4f" :
                s.status === "cancelled" ? "var(--color-error)" : "#868e96";
              return (
                <li key={s.status}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "15px", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{s.status}</span>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{s.count} · {pct}%</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", borderRadius: "3px", background: "var(--color-bg-subtle)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "3px", background: color, width: `${pct}%`, transition: "width 0.5s ease" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "14px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const tooltipLabelStyle: React.CSSProperties = {
  color: "var(--color-text)",
  fontWeight: 600,
};

function PageHeader({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
          <LineChartIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          Analytics
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Revenue, inventory and subscriber trends</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} aria-label="Refresh analytics" style={{ borderColor: "var(--color-border)", gap: "6px" }}>
        <RefreshCw className="h-4 w-4" style={{ animation: refreshing ? "spin 1s linear infinite" : undefined }} />
        Refresh
      </Button>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  empty,
  emptyMessage,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent style={{ padding: "20px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{title}</h3>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "12px" }}>{subtitle}</p>
        {empty ? (
          <div style={{ height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", background: "var(--color-bg-subtle)", borderRadius: "8px" }}>
            <BarChart3 className="h-6 w-6" style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
