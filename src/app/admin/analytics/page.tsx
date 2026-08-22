"use client";

import { BarChart3, PieChart, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  const cards = [
    { title: "Voucher Usage", desc: "Track voucher redemption rates and popular price points.", icon: BarChart3, iconColor: "var(--color-primary)", iconBg: "var(--color-primary-surface)" },
    { title: "Plan Distribution", desc: "See which plans are most popular among your subscribers.", icon: PieChart, iconColor: "var(--color-success)", iconBg: "var(--color-success-surface)" },
    { title: "Revenue Trends", desc: "Monitor revenue over time with interactive charts.", icon: TrendingUp, iconColor: "var(--color-warning)", iconBg: "var(--color-warning-surface)" },
    { title: "Subscriber Growth", desc: "Track new subscriber acquisition and retention rates.", icon: Users, iconColor: "var(--color-primary)", iconBg: "var(--color-primary-surface)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Analytics</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Advanced analytics and reporting coming soon</p>
      </div>
      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardContent style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon className="h-5 w-5" style={{ color: c.iconColor }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>{c.title}</h3>
                    <p style={{ fontSize: "13px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{c.desc}</p>
                    <div style={{ marginTop: "16px", padding: "20px", borderRadius: "8px", background: "var(--color-bg-subtle)", textAlign: "center" }}>
                      <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Coming soon</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
