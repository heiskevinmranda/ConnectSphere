"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, ChevronLeft, ChevronRight, Users, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface User {
  id: number;
  phoneNumber: string;
  plan: string;
  status: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  voucherCode: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "var(--color-success-surface)", color: "var(--color-success)" },
  expired: { bg: "var(--color-bg-subtle)", color: "var(--color-text-muted)" },
  cancelled: { bg: "var(--color-error-surface)", color: "var(--color-error)" },
  pending_payment: { bg: "var(--color-warning-surface)", color: "var(--color-warning)" },
};

export default function CustomersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem("adminToken");
    const params = new URLSearchParams({ page: String(page), limit: "15", search, status });
    fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) { setUsers(d.data.data || []); setTotalPages(d.data.pagination?.totalPages || 1); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const thStyle: React.CSSProperties = { padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" };
  const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: "13px", borderBottom: "1px solid var(--color-border-light)", verticalAlign: "middle" };
  const lastTd: React.CSSProperties = { ...tdStyle, borderBottom: "none" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Customers</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Manage your subscribers and payment records</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid var(--color-border)", borderRadius: "8px", background: "var(--color-bg-elevated)", fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", cursor: "pointer" }}>
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <CardContent style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
              <Search className="h-4 w-4" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              <Input
                placeholder="Search by phone number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: "36px" }}
              />
            </div>
            <Select value={status} onValueChange={(val) => { setStatus(val ?? "all"); setPage(1); }}>
              <SelectTrigger style={{ minWidth: "160px" }}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
              </SelectContent>
            </Select>
            <span style={{ fontSize: "13px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
              {users.length} result{users.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "64px 20px", textAlign: "center" }}>
            <Users className="h-12 w-12" style={{ margin: "0 auto 16px", color: "var(--color-text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "4px" }}>No customers found</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={thStyle}>Phone Number</TableHead>
                  <TableHead style={thStyle}>Plan</TableHead>
                  <TableHead style={thStyle}>Status</TableHead>
                  <TableHead style={{ ...thStyle, textAlign: "right" }}>Amount</TableHead>
                  <TableHead style={thStyle}>Valid Until</TableHead>
                  <TableHead style={thStyle}>Voucher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, idx) => {
                  const sc = STATUS_COLORS[u.status] || STATUS_COLORS.expired;
                  const isLast = idx === users.length - 1;
                  return (
                    <TableRow key={u.id} style={{ background: idx % 2 === 0 ? "transparent" : "var(--color-bg-subtle)" }}>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "13px", fontWeight: 500, color: "var(--color-text)" }}>{u.phoneNumber}</span>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{u.plan}</span>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <Badge style={{ background: sc.bg, color: sc.color, fontSize: "11px", fontWeight: 600, textTransform: "capitalize", padding: "3px 10px" }}>
                          {u.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "var(--color-text)" }}>
                        TSh {(u.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {u.endDate ? new Date(u.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                        </span>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        {u.voucherCode ? (
                          <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "12px", padding: "2px 8px", borderRadius: "4px", background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)" }}>{u.voucherCode}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", padding: "12px 0" }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Page {page} of {totalPages}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 14px", border: "1px solid var(--color-border)", borderRadius: "8px", background: "var(--color-bg-elevated)", fontSize: "13px", color: "var(--color-text-secondary)", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 14px", border: "1px solid var(--color-border)", borderRadius: "8px", background: "var(--color-bg-elevated)", fontSize: "13px", color: "var(--color-text-secondary)", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
