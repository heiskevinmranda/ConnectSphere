"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  Ticket,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { adminFetch, downloadFile } from "@/lib/admin-client";

interface VoucherRow {
  id: number;
  code: string;
  price: number;
  isUsed: boolean;
  subscriptionId: number | null;
  createdAt: string;
}

interface ListResponse {
  data: VoucherRow[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface TierStat {
  price: number;
  total: number;
  available: number;
  used: number;
}

interface PendingDelete {
  id: number;
  code: string;
}

const CODE_PATTERN = /^\d{10}$/;

export default function VouchersPage() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [tiers, setTiers] = useState<TierStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploading, setUploading] = useState(false);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [genCount, setGenCount] = useState("50");
  const [genPrice, setGenPrice] = useState("");
  const [generating, setGenerating] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          status: statusFilter,
        });
        if (priceFilter !== "all") params.set("price", priceFilter);
        if (search) params.set("search", search);
        const result = await adminFetch<ListResponse>(`/api/admin/vouchers?${params}`);
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
              : "Could not load vouchers."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, priceFilter, search, refreshKey]);

  // Summary tier cards; failures degrade gracefully since the table still works.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const analytics = await adminFetch<{ voucherDistribution: TierStat[] }>(
          "/api/admin/voucher-analytics"
        );
        if (!cancelled) setTiers(analytics.voucherDistribution ?? []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const reload = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleRetry = () => reload();

  const parsedUpload = useMemo(() => {
    const lines = uploadText
      .split(/[\s,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    const duplicatesInInput: string[] = [];
    for (const line of lines) {
      const code = line.replace(/\D/g, "");
      if (!CODE_PATTERN.test(code)) {
        invalid.push(line);
        continue;
      }
      if (seen.has(code)) {
        duplicatesInInput.push(code);
        continue;
      }
      seen.add(code);
      valid.push(code);
    }
    return { valid, invalid, duplicateCount: duplicatesInInput.length };
  }, [uploadText]);

  const handleUpload = async () => {
    if (!uploadPrice || parsedUpload.valid.length === 0) return;
    setUploading(true);
    try {
      const payload = {
        vouchers: parsedUpload.valid.map((code) => ({
          code,
          price: parseInt(uploadPrice),
        })),
      };
      const result = await adminFetch<{ insertedCount: number; skippedCount: number; message: string }>(
        "/api/admin/vouchers/upload",
        { method: "POST", body: payload }
      );
      toast.success(result.message || `Uploaded ${result.insertedCount} vouchers`);
      if (result.skippedCount > 0) {
        toast.info(`${result.skippedCount} code(s) already existed and were skipped`);
      }
      setUploadOpen(false);
      setUploadText("");
      setPage(1);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    const count = parseInt(genCount);
    if (!genPrice || isNaN(count) || count < 1) return;
    setGenerating(true);
    try {
      const result = await adminFetch<{ generated: number; message: string }>(
        "/api/admin/vouchers/generate",
        {
          method: "POST",
          body: { count, price: parseInt(genPrice) },
        }
      );
      toast.success(result.message || `Generated ${result.generated} vouchers`);
      setGenerateOpen(false);
      setPage(1);
      setStatusFilter("all");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/vouchers/${pendingDelete.id}`, { method: "DELETE" });
      toast.success(`Voucher ${pendingDelete.code} deleted`);
      setPendingDelete(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (priceFilter !== "all") params.set("price", priceFilter);
      await downloadFile(
        `/api/admin/vouchers/export?${params}`,
        `connectsphere-vouchers-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success("Voucher inventory exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const totalAvailable = tiers.reduce((sum, t) => sum + t.available, 0);
  const totalUsed = tiers.reduce((sum, t) => sum + t.used, 0);

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Vouchers</h1>
          <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Inventory of hotspot access codes</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="outline" onClick={() => setUploadOpen(true)} style={{ borderColor: "var(--color-border)", gap: "6px" }}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting} aria-label="Export voucher inventory as CSV" style={{ borderColor: "var(--color-border)", gap: "6px" }}>
            <Download className="h-4 w-4" /> {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button onClick={() => setGenerateOpen(true)} style={{ background: "var(--color-primary)", color: "#000", gap: "6px" }}>
            <PlusCircle className="h-4 w-4" /> Generate
          </Button>
        </div>
      </div>

      <div className="vouchers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <Card>
          <CardContent style={{ padding: "18px 20px" }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "6px" }}>Total Available</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: totalAvailable > 0 ? "var(--color-success)" : "var(--color-error)" }}>{totalAvailable.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: "18px 20px" }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "6px" }}>Redeemed</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)" }}>{totalUsed.toLocaleString()}</p>
          </CardContent>
        </Card>
        {tiers.slice(0, 2).map((t) => (
          <Card key={t.price}>
            <CardContent style={{ padding: "18px 20px" }}>
              <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "6px" }}>TSh {t.price.toLocaleString()} stock</p>
              <p style={{ fontSize: "24px", fontWeight: 700, color: t.available === 0 ? "var(--color-error)" : t.available <= 10 ? "var(--color-warning)" : "var(--color-success)" }}>{t.available.toLocaleString()}</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{t.available === 0 ? "Out of stock" : t.available <= 10 ? "Low stock" : `${t.used} redeemed all-time`}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <CardContent style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Input
              placeholder="Search by code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search vouchers by code"
              style={{ flex: 1, minWidth: "180px" }}
            />
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val ?? "all"); setPage(1); }}>
              <SelectTrigger style={{ minWidth: "140px" }} aria-label="Filter by status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="used">Used</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={(val) => { setPriceFilter(val ?? "all"); setPage(1); }}>
              <SelectTrigger style={{ minWidth: "150px" }} aria-label="Filter by price tier">
                <SelectValue placeholder="All Prices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.price} value={String(t.price)}>
                    TSh {t.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={reload} disabled={loading} aria-label="Refresh vouchers">
              <RefreshCw className="h-4 w-4" style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
            </Button>
            <span style={{ fontSize: "15px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }} aria-live="polite">
              {total} voucher{total !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && !loading ? (
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <AlertCircle className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load vouchers</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={handleRetry} style={{ background: "var(--color-primary)", color: "#000" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }} role="status" aria-label="Loading vouchers">
          <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "64px 20px", textAlign: "center" }}>
            <Ticket className="h-12 w-12" style={{ margin: "0 auto 16px", color: "var(--color-text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "4px" }}>No vouchers found</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "16px" }}>Generate new codes or adjust your filters</p>
            <Button onClick={() => setGenerateOpen(true)} variant="outline" style={{ borderColor: "var(--color-border)", gap: "6px" }}>
              <PlusCircle className="h-4 w-4" /> Generate vouchers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={thStyle}>Code</TableHead>
                  <TableHead style={thStyle}>Price</TableHead>
                  <TableHead style={thStyle}>Status</TableHead>
                  <TableHead style={thStyle}>Created</TableHead>
                  <TableHead style={{ ...thStyle, textAlign: "right" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v, idx) => {
                  const isLast = idx === rows.length - 1;
                  const deletable = !v.isUsed && v.subscriptionId === null;
                  return (
                    <TableRow key={v.id} style={{ background: idx % 2 === 0 ? "transparent" : "var(--color-bg-subtle)" }}>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "15px", fontWeight: 500, letterSpacing: "0.08em" }}>{v.code}</span>
                      </TableCell>
                      <TableCell style={{ ...(isLast ? lastTd : tdStyle), fontWeight: 600 }}>
                        TSh {v.price.toLocaleString()}
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <Badge style={v.isUsed ? { background: "var(--color-bg-subtle)", color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 600, padding: "3px 10px" } : { background: "var(--color-success-surface)", color: "var(--color-success)", fontSize: "12px", fontWeight: 600, padding: "3px 10px" }}>
                          {v.isUsed ? "Used" : "Available"}
                        </Badge>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </TableCell>
                      <TableCell style={{ ...(isLast ? lastTd : tdStyle), textAlign: "right" }}>
                        {deletable && (
                          <button
                            type="button"
                            aria-label={`Delete voucher ${v.code}`}
                            title="Delete voucher"
                            onClick={() => setPendingDelete({ id: v.id, code: v.code })}
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg" style={{ maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>Upload voucher codes</DialogTitle>
            <DialogDescription>Paste one 10-digit code per line. Duplicates and existing codes are skipped automatically.</DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
            <div>
              <Label htmlFor="upload-price">Price tier</Label>
              <Select value={uploadPrice} onValueChange={(val) => setUploadPrice(val ?? "")}>
                <SelectTrigger style={{ width: "100%", marginTop: "6px" }} aria-label="Upload price tier">
                  <SelectValue placeholder="Assign a price tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.price} value={String(t.price)}>TSh {t.price.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="upload-codes">Codes</Label>
              <Textarea
                id="upload-codes"
                placeholder={"1234567890\n0987654321\n1122334455"}
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                rows={8}
                style={{ marginTop: "6px", fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "15px" }}
              />
            </div>
            {uploadText.trim() && (
              <div style={{ fontSize: "14px", display: "flex", gap: "14px", flexWrap: "wrap" }} aria-live="polite">
                <span style={{ color: "var(--color-success)", fontWeight: 600 }}>{parsedUpload.valid.length} valid</span>
                {parsedUpload.invalid.length > 0 && (
                  <span style={{ color: "var(--color-error)" }}>{parsedUpload.invalid.length} invalid</span>
                )}
                {parsedUpload.duplicateCount > 0 && (
                  <span style={{ color: "var(--color-warning)" }}>{parsedUpload.duplicateCount} duplicate(s)</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
              style={{ padding: "9px 20px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "15px", fontWeight: 500, background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !uploadPrice || parsedUpload.valid.length === 0}
              style={{ padding: "10px 24px", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, background: "var(--color-primary)", color: "#000", cursor: uploading || !uploadPrice || parsedUpload.valid.length === 0 ? "not-allowed" : "pointer", opacity: uploading || !uploadPrice || parsedUpload.valid.length === 0 ? 0.5 : 1 }}
            >
              {uploading ? "Uploading..." : `Upload ${parsedUpload.valid.length || ""} voucher${parsedUpload.valid.length !== 1 ? "s" : ""}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate voucher codes</DialogTitle>
            <DialogDescription>Create fresh random 10-digit codes ready to sell or print.</DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
            <div>
              <Label htmlFor="gen-price">Price tier</Label>
              <Select value={genPrice} onValueChange={(val) => setGenPrice(val ?? "")}>
                <SelectTrigger style={{ width: "100%", marginTop: "6px" }} aria-label="Generate price tier">
                  <SelectValue placeholder="Choose a price" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.price} value={String(t.price)}>TSh {t.price.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gen-count">Quantity</Label>
              <Input
                id="gen-count"
                type="number"
                min={1}
                max={5000}
                value={genCount}
                onChange={(e) => setGenCount(e.target.value)}
                aria-label="Number of vouchers to generate"
                style={{ marginTop: "6px" }}
              />
            </div>
          </div>
          <DialogFooter style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => setGenerateOpen(false)}
              disabled={generating}
              style={{ padding: "9px 20px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "15px", fontWeight: 500, background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !genPrice}
              style={{ padding: "10px 24px", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, background: "var(--color-primary)", color: "#000", cursor: generating || !genPrice ? "not-allowed" : "pointer", opacity: generating || !genPrice ? 0.5 : 1 }}
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete voucher?"
        description={`Voucher ${pendingDelete?.code} will be permanently removed from inventory. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
