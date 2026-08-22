"use client";

import { Database, Wifi, Server, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  { label: "Database", status: "operational" as const, icon: Database },
  { label: "API Server", status: "operational" as const, icon: Server },
  { label: "Network", status: "operational" as const, icon: Wifi },
  { label: "Storage", status: "operational" as const, icon: HardDrive },
];

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  operational: { dot: "var(--color-success)", text: "var(--color-success)", bg: "var(--color-success-surface)" },
  degraded: { dot: "var(--color-warning)", text: "var(--color-warning)", bg: "var(--color-warning-surface)" },
  down: { dot: "var(--color-error)", text: "var(--color-error)", bg: "var(--color-error-surface)" },
};

const sysInfo = [
  { label: "Application", value: "ConnectSphere ISP Portal" },
  { label: "Framework", value: "Next.js 16" },
  { label: "Database", value: "SQLite + Prisma" },
  { label: "Runtime", value: "Node.js" },
];

export default function SystemPage() {
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>System Health</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Overview of all system components</p>
      </div>
      <div className="sys-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "20px" }}>
        {items.map((item) => {
          const Icon = item.icon;
          const s = STATUS_STYLES[item.status];
          return (
            <Card key={item.label}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon className="h-5 w-5" style={{ color: s.text }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>{item.label}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.dot }} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: s.text, textTransform: "capitalize" }}>{item.status}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "16px" }}>System Information</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {sysInfo.map((row, i) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--color-border)" }}>
                <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{row.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
