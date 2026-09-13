"use client";

import { useEffect, useState } from "react";
import { Loader2, Router, Wifi, Search, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { adminFetch } from "@/lib/admin-client";

interface DeviceItem {
  id: number;
  name: string;
  type: "router" | "access_point";
  model: string | null;
  ip: string | null;
  macAddress: string | null;
  serialNumber: string | null;
  location: string | null;
  firmware: string | null;
  status: "online" | "offline";
  lastSeenAt: string | null;
}

function lastSeenLabel(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Never observed";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (diffMs < 60_000) return "Last seen just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}

export default function RoutersPage() {
  const [routers, setRouters] = useState<DeviceItem[]>([]);
  const [aps, setAps] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rt, ap] = await Promise.all([
          adminFetch<DeviceItem[]>("/api/admin/network/routers"),
          adminFetch<DeviceItem[]>("/api/admin/network/access-points"),
        ]);
        if (!cancelled) {
          setRouters(rt ?? []);
          setAps(ap ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message !== "Session expired"
              ? err.message
              : "Could not load hardware status."
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

  const matches = (d: DeviceItem): boolean => {
    if (search) {
      const haystack =
        `${d.name} ${d.ip ?? ""} ${d.model ?? ""} ${d.macAddress ?? ""} ${d.location ?? ""}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    if (filter !== "all" && d.status !== filter) return false;
    return true;
  };

  const filteredRouters = routers.filter(matches);
  const filteredAps = aps.filter(matches);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading hardware status"><Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} /></div>;
  }

  if (error) {
    return (
      <div>
        <PageHeader />
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <AlertCircle className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load hardware status</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={handleRetry} style={{ background: "var(--color-primary)", color: "#000" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusBadge = (status: string) => (
    <Badge style={{ background: status === "online" ? "var(--color-success-surface)" : "var(--color-error-surface)", color: status === "online" ? "var(--color-success)" : "var(--color-error)", fontSize: "12px", textTransform: "capitalize" }}>{status}</Badge>
  );

  return (
    <div>
      <PageHeader />
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search className="h-4 w-4" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <Input
            placeholder="Search by name, IP, model, MAC, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search devices"
            style={{ paddingLeft: "32px" }}
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
          <SelectTrigger style={{ minWidth: "140px" }} aria-label="Filter by status"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "12px" }}>Routers ({filteredRouters.length})</h3>
      <div className="hw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {filteredRouters.map((router) => (
          <Card key={router.id}>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-primary-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Router className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{router.name}</h4>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {router.model ?? "Model unknown"}{router.ip ? ` · ${router.ip}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                {statusBadge(router.status)}
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginLeft: "auto" }}>{lastSeenLabel(router.lastSeenAt)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                <span>Location: {router.location ?? "—"}</span>
                <span>MAC: {router.macAddress ?? "—"}</span>
                <span>Firmware: {router.firmware ?? "—"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredRouters.length === 0 && <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px", color: "var(--color-text-muted)", fontSize: "15px" }}>No routers found</p>}
      </div>

      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", marginBottom: "12px" }}>Access Points ({filteredAps.length})</h3>
      <div className="hw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {filteredAps.map((ap) => (
          <Card key={ap.id}>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-success-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wifi className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{ap.name}</h4>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ap.model ?? "Model unknown"}{ap.ip ? ` · ${ap.ip}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", color: "var(--color-text-muted)" }}>
                {statusBadge(ap.status)}
                <span>Location: {ap.location ?? "—"}</span>
                <span style={{ marginLeft: "auto" }}>{lastSeenLabel(ap.lastSeenAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredAps.length === 0 && <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px", color: "var(--color-text-muted)", fontSize: "15px" }}>No access points found</p>}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Routers & Access Points</h1>
      <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Device inventory and connection status</p>
    </div>
  );
}