"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Package, Wifi, Signal, Gauge, Rocket, Star, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatDuration, formatCurrency } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-client";

interface Plan {
  id: number; name: string; slug: string; price: number; duration: number;
  description: string | null; icon: string; isActive: boolean; sortOrder: number;
}

const ICON_OPTIONS = [
  { value: "wifi", label: "Wifi", Icon: Wifi },
  { value: "signal", label: "Signal", Icon: Signal },
  { value: "gauge", label: "Gauge", Icon: Gauge },
  { value: "rocket", label: "Rocket", Icon: Rocket },
  { value: "star", label: "Star", Icon: Star },
];

const emptyForm = { name: "", slug: "", price: 0, duration: 1, description: "", icon: "wifi", sortOrder: 0, isActive: true };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const reload = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<Plan[]>("/api/admin/plans");
        if (!cancelled) {
          setPlans(data ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message !== "Session expired"
              ? err.message
              : "Could not load plans."
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

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setForm({ name: plan.name, slug: plan.slug, price: plan.price, duration: plan.duration, description: plan.description || "", icon: plan.icon || "wifi", sortOrder: plan.sortOrder, isActive: plan.isActive });
    setEditingId(plan.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await adminFetch(`/api/admin/plans/${editingId}`, { method: "PUT", body: form });
      } else {
        await adminFetch("/api/admin/plans", { method: "POST", body: form });
      }
      toast.success(editingId ? "Plan updated" : "Plan created", { description: `${form.name} has been ${editingId ? "updated" : "created"} successfully.` });
      setFormOpen(false);
      reload();
    } catch (err) {
      toast.error("Failed to save plan", { description: err instanceof Error ? err.message : "An error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/plans/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Plan deleted", { description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error("Failed to delete plan", { description: err instanceof Error ? err.message : "An error occurred." });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = plans.filter((p) => filter === "all" || (filter === "active" ? p.isActive : !p.isActive));

  const thStyle: React.CSSProperties = { padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" };
  const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: "15px", borderBottom: "1px solid var(--color-border-light)", verticalAlign: "middle" };
  const lastTd: React.CSSProperties = { ...tdStyle, borderBottom: "none" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "14px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Plans</h1>
          <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>Manage internet packages and pricing</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
            <SelectTrigger style={{ minWidth: "130px" }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "var(--color-primary)", color: "#000", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
            <Plus className="h-4 w-4" /> Add Plan
          </button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ padding: "24px 24px 0" }}>
            <DialogHeader style={{ marginBottom: "20px" }}>
              <DialogTitle style={{ fontSize: "17px", fontWeight: 600 }}>{editingId ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            </DialogHeader>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Plan Name</label>
                <Input placeholder="e.g. Basic" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Plan name" />
              </div>
              <div>
                <label style={labelStyle}>Slug</label>
                <Input placeholder="e.g. basic" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} aria-label="Plan slug" />
              </div>
              <div>
                <label style={labelStyle}>Price (TSh)</label>
                <Input type="number" placeholder="5000" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} aria-label="Plan price in Tanzanian shillings" />
              </div>
              <div>
                <label style={labelStyle}>Duration (days)</label>
                <Input type="number" placeholder="30" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} aria-label="Plan duration in days" />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <Input placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Plan description" />
              </div>
              <div>
                <label style={labelStyle}>Sort Order</label>
                <Input type="number" placeholder="0" value={form.sortOrder || ""} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} aria-label="Sort order" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Icon (shown on public pricing card)</label>
                <div role="radiogroup" aria-label="Plan icon" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {ICON_OPTIONS.map(({ value, label, Icon }) => {
                    const selected = form.icon === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${label} icon`}
                        title={label}
                        onClick={() => setForm({ ...form, icon: value })}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "10px",
                          border: `2px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                          background: selected ? "var(--color-primary-surface)" : "var(--color-bg-elevated)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 120ms ease",
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: selected ? "var(--color-primary)" : "var(--color-text-muted)" }} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", gridColumn: "1 / -1" }}>
                <input
                  id="plan-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: "16px", height: "16px", accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
                <label htmlFor="plan-active" style={{ fontSize: "15px", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  Visible to customers on the public site
                </label>
              </div>
            </div>
          </div>
          <DialogFooter style={{ padding: "20px 24px 24px" }}>
            <button onClick={() => setFormOpen(false)} disabled={saving} style={{ padding: "9px 20px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "15px", fontWeight: 500, background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "10px 26px", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, background: "var(--color-primary)", color: "#000", cursor: "pointer", opacity: saving || !form.name.trim() ? 0.5 : 1 }}>
              {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete Plan"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Plan"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />

      {error && !loading ? (
        <Card>
          <CardContent style={{ padding: "48px 20px", textAlign: "center" }}>
            <AlertCircle className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-error)" }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>Failed to load plans</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "20px" }}>{error}</p>
            <Button onClick={reload} style={{ background: "var(--color-primary)", color: "#000" }}>
              <RefreshCw className="h-4 w-4" style={{ marginRight: "6px" }} /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 className="h-8 w-8" style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "64px 20px", textAlign: "center" }}>
            <Package className="h-12 w-12" style={{ margin: "0 auto 16px", color: "var(--color-text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "4px" }}>No plans found</p>
            <p style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>{filter !== "all" ? "Try changing the filter" : "Create your first plan to get started"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={thStyle}>Plan Name</TableHead>
                  <TableHead style={thStyle}>Slug</TableHead>
                  <TableHead style={{ ...thStyle, textAlign: "right" }}>Price</TableHead>
                  <TableHead style={thStyle}>Duration</TableHead>
                  <TableHead style={thStyle}>Status</TableHead>
                  <TableHead style={{ ...thStyle, textAlign: "center" }}>Order</TableHead>
                  <TableHead style={{ ...thStyle, textAlign: "right" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((plan, idx) => {
                  const isLast = idx === filtered.length - 1;
                  const IconComp = ICON_OPTIONS.find((i) => i.value === plan.icon)?.Icon || Wifi;
                  return (
                    <TableRow key={plan.id} style={{ background: idx % 2 === 0 ? "transparent" : "var(--color-bg-subtle)" }}>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-primary-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <IconComp className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{plan.name}</span>
                            {plan.description && (
                              <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginTop: "2px" }}>{plan.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: "14px", padding: "2px 8px", borderRadius: "4px", background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)" }}>{plan.slug}</span>
                      </TableCell>
                      <TableCell style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>
                        {formatCurrency(plan.price)}
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <span style={{ color: "var(--color-text-secondary)" }}>{formatDuration(plan.duration)}</span>
                      </TableCell>
                      <TableCell style={isLast ? lastTd : tdStyle}>
                        <Badge style={{ background: plan.isActive ? "var(--color-success-surface)" : "var(--color-bg-subtle)", color: plan.isActive ? "var(--color-success)" : "var(--color-text-muted)", fontSize: "12px", fontWeight: 600, padding: "3px 10px" }}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ ...tdStyle, textAlign: "center" }}>
                        <span style={{ color: "var(--color-text-muted)" }}>{plan.sortOrder}</span>
                      </TableCell>
                      <TableCell style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                          <button onClick={() => openEdit(plan)} aria-label={`Edit plan ${plan.name}`} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-bg-elevated)", cursor: "pointer", display: "flex", alignItems: "center" }} title="Edit">
                            <Pencil className="h-3.5 w-3.5" style={{ color: "var(--color-text-secondary)" }} />
                          </button>
                          <button onClick={() => setDeleteTarget(plan)} aria-label={`Delete plan ${plan.name}`} style={{ padding: "6px 8px", border: "1px solid var(--color-error-surface)", borderRadius: "6px", background: "var(--color-error-surface)", cursor: "pointer", display: "flex", alignItems: "center" }} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--color-error)" }} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginTop: "12px", textAlign: "right" }}>
          Showing {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
