"use client";

import { useEffect, useState } from "react";
import { Loader2, Router, Wifi, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface RouterItem { id: string; name: string; ip: string; model: string; status: string; cpu: number; memory: number; uptime: string; }
interface AccessPoint { id: string; name: string; ssid: string; status: string; signal: number; clients: number; }

export default function RoutersPage() {
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [aps, setAps] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const headers = { Authorization: "Bearer " + token };
    Promise.all([
      fetch("/api/admin/network/routers", { headers }).then((r) => r.json()),
      fetch("/api/admin/network/access-points", { headers }).then((r) => r.json()),
    ]).then(([rt, ap]) => {
      if (rt.success) setRouters(rt.data || []);
      if (ap.success) setAps(ap.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredRouters = routers.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.ip.includes(search)) return false;
    if (filter !== "all" && r.status !== filter) return false;
    return true;
  });

  const filteredAps = aps.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.ssid.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all" && a.status !== filter) return false;
    return true;
  });

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} /></div>;
  }

  const renderBar = (label: string, value: number, color: string) => (
    <div style={{ marginTop: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{label}</span>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text)" }}>{value}%</span>
      </div>
      <div style={{ width: "100%", height: "5px", borderRadius: "3px", background: "var(--color-bg-subtle)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "3px", background: color, width: value + "%", transition: "width 0.3s ease" }} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Routers & Access Points</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Monitor hardware and wireless infrastructure</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search className="h-4 w-4" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <Input placeholder="Search by name, IP, or SSID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: "32px" }} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
          <SelectTrigger style={{ minWidth: "140px" }}><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", marginBottom: "12px" }}>Routers ({filteredRouters.length})</h3>
      <div className="hw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {filteredRouters.map((router) => (
          <Card key={router.id}>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-primary-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Router className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>{router.name}</h4>
                  <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{router.model} &middot; {router.ip}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Badge style={{ background: router.status === "online" ? "var(--color-success-surface)" : "var(--color-error-surface)", color: router.status === "online" ? "var(--color-success)" : "var(--color-error)", fontSize: "11px", textTransform: "capitalize" }}>{router.status}</Badge>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginLeft: "auto" }}>Uptime: {router.uptime}</span>
              </div>
              {renderBar("CPU", router.cpu, "var(--color-primary)")}
              {renderBar("Memory", router.memory, "var(--color-success)")}
            </CardContent>
          </Card>
        ))}
        {filteredRouters.length === 0 && <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px", color: "var(--color-text-muted)", fontSize: "13px" }}>No routers found</p>}
      </div>
      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", marginBottom: "12px" }}>Access Points ({filteredAps.length})</h3>
      <div className="hw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {filteredAps.map((ap) => (
          <Card key={ap.id}>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-success-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wifi className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                </div>
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>{ap.name}</h4>
                  <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>SSID: {ap.ssid}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                <Badge style={{ background: ap.status === "online" ? "var(--color-success-surface)" : "var(--color-error-surface)", color: ap.status === "online" ? "var(--color-success)" : "var(--color-error)", fontSize: "11px", textTransform: "capitalize" }}>{ap.status}</Badge>
                <span>Signal: {ap.signal}%</span>
                <span>Clients: {ap.clients}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredAps.length === 0 && <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px", color: "var(--color-text-muted)", fontSize: "13px" }}>No access points found</p>}
      </div>
    </div>
  );
}
