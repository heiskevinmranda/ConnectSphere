"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { adminFetch, downloadFile } from "@/lib/admin-client";

interface CustomerRow {
  id: number;
  phoneNumber: string;
  plan: string;
  status: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  voucherCode: string | null;
  type: "subscription" | "pending_payment";
  paymentReference?: string | null;
}

interface ListResponse {
  data: CustomerRow[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "var(--color-success-surface)", color: "var(--color-success)" },
  expired: { bg: "var(--color-bg-subtle)", color: "var(--color-text-muted)" },
  cancelled: { bg: "var(--color-error-surface)", color: "var(--color-error)" },
  pending_payment: { bg: "var(--color-warning-surface)", color: "var(--color-warning)" },
};

interface PendingDelete {
  kind: "subscription" | "payment";
  id: number;
  phone: string;
}

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "15",
          status: statusFilter,
        });
        if (search) params.set("search", search);
        const result = await adminFetch<ListResponse>(`/api/admin/users?${params}`);
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
              : "Could not load customers."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search, statusFilter, refreshKey]);

  const handleRetry = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (search) params.set("search", search);
      await downloadFile(
        `/api/admin/users/export?${params}`,
        `connectsphere-customers-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success("Customer list exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const endpoint =
      pendingDelete.kind === "payment"
        ? `/api/admin/payments/${pendingDelete.id}`
        : `/api/admin/subscriptions/${pendingDelete.id}`;
    try {
      await adminFetch(endpoint, { method: "DELETE" });
      toast.success(
        pendingDelete.kind === "payment"
          ? "Pending payment record deleted"
          : "Subscription deleted"
      );
      setPendingDelete(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "left",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-bg-subtle)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: "15px",
    borderBottom: "1px solid var(--color-border-light)",
    verticalAlign: "middle",
  };
  const lastTd: React.CSSProperties = { ...tdStyle, borderBottom: "none" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Customers</h1>
          <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Manage your subscribers and payment records</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          aria-label="Export customers as CSV"
          style={{ borderColor: "var(--color-border)", gap: "6px" }}
        >
          <Download className="h-4 w-4" style={{ animation: exporting ? "spin 1s linear infinite" : undefined }} />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <CardContent style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
              <Search className="h-4 w-4" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              <Input
                placeholder="Search by phone number..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                aria-label="Search customers by phone number"
                style={{ paddingLeft: "36px" }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val ?? "all"); setPage(1); }}>
              <SelectTrigger style={{ minWidth: "160px" }} aria-label="Filter by status">
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
            <span style={{ fontSize: "15px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }} aria-live="polite">
              {total} result{total !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && !loading ? (
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <AlertCircle className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load customers</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={handleRetry} style={{ background: "var(--color-primary)", color: "#000" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading customers">
          <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "64px 20px", textAlign: "center" }}>
            <Users className="h-12 w-12" style={{ margin: "0 auto 16px", color: "var(--color-text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "4px" }}>No customers found</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Try adjusting your search or filter criteria</p>
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
                  <TableHead style={{ ...thStyle, textAlign: "right" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u, idx) => {
                  const sc = STATUS_COLORS[u.status] || STATUS_COLORS.expired;
                  const isLast = idx === rows.length - 1;
                  return (
                    <TableRow key={`${u.type}-${u.id}`} style={{ background: idx % 2 === 0 ? "transparent" : "var(--color-bg-subtle)" }}>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "15px", fontWeight: 500, color: "var(--color-text)" }}>{u.phoneNumber}</span>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{u.plan}</span>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <Badge style={{ background: sc.bg, color: sc.color, fontSize: "12px", fontWeight: 600, textTransform: "capitalize", padding: "3px 10px" }}>
                          {u.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "var(--color-text)" }}>
                        TSh {(u.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        {u.endDate ? (
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {new Date(u.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        ) : u.type === "pending_payment" ? (
                          <Badge style={{ background: sc.bg, color: sc.color, fontSize: "10px", fontWeight: 600 }}>Awaiting payment</Badge>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>-</span>
                        )}
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        {u.voucherCode || u.paymentReference ? (
                          <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "14px", padding: "2px 8px", borderRadius: "4px", background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)" }}>
                            {(u.voucherCode ?? u.paymentReference ?? "").slice(0, 12)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>-</span>
                        )}
                      </TableCell>
                      <TableCell style={{ ...tdStyle, textAlign: "right" }}>
                        <button
                          type="button"
                          aria-label={`Delete ${u.type === "pending_payment" ? "pending payment" : "subscription"} for ${u.phoneNumber}`}
                          title={u.type === "pending_payment" ? "Delete pending payment record" : "Delete subscription"}
                          onClick={() =>
                            setPendingDelete({ kind: u.type === "pending_payment" ? "payment" : "subscription", id: u.id, phone: u.phoneNumber })
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            color: "var(--color-error)",
                            display: "inline-flex",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-error-surface)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", padding: "12px 0" }} aria-label="Pagination">
          <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Page {page} of {totalPages}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" style={{ borderColor: "var(--color-border)", gap: "4px" }}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Next page" style={{ borderColor: "var(--color-border)", gap: "4px" }}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title={pendingDelete?.kind === "payment" ? "Delete pending payment?" : "Delete subscription?"}
        description={
          pendingDelete?.kind === "payment"
            ? `This removes the abandoned payment record for ${pendingDelete.phone}. This action cannot be undone.`
            : `This permanently removes the ${pendingDelete?.phone} subscription and its history. This action cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
