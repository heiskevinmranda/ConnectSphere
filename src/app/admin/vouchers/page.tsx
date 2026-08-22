"use client";

import { useState } from "react";
import { Upload, Wand2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";

export default function VouchersPage() {
  const [uploadCodes, setUploadCodes] = useState("");
  const [uploading, setUploading] = useState(false);

  const [genCount, setGenCount] = useState(1);
  const [genPrice, setGenPrice] = useState(1000);
  const [generating, setGenerating] = useState(false);

  const handleUpload = async () => {
    const codes = uploadCodes.split("\n").map((c) => c.trim()).filter(Boolean);
    if (codes.length === 0) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/vouchers/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ codes }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vouchers uploaded", { description: `${data.data.insertedCount} voucher codes have been added to inventory.` });
        setUploadCodes("");
      } else {
        toast.error("Upload failed", { description: data.message || "Could not upload vouchers." });
      }
    } catch {
      toast.error("Network error", { description: "Could not reach the server." });
    }
    setUploading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/vouchers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: genCount, price: genPrice }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vouchers generated", { description: `${data.data.generated} voucher codes generated at TSh ${genPrice.toLocaleString()} each.` });
      } else {
        toast.error("Generation failed", { description: data.message || "Could not generate vouchers." });
      }
    } catch {
      toast.error("Network error", { description: "Could not reach the server." });
    }
    setGenerating(false);
  };

  const cardHeader = (iconBg: string, iconColor: string, Icon: React.ElementType, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </div>
      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{title}</h3>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>Vouchers</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Upload or generate voucher codes for subscribers</p>
      </div>
      <div className="vouchers-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <Card>
          <CardContent style={{ padding: "24px" }}>
            {cardHeader("var(--color-primary-surface)", "var(--color-primary)", Upload, "Upload Vouchers")}
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px" }}>Paste voucher codes below, one per line.</p>
            <Textarea
              value={uploadCodes}
              onChange={(e) => setUploadCodes(e.target.value)}
              placeholder={"VCH001\nVCH002\nVCH003"}
              rows={6}
              style={{ fontFamily: "monospace", fontSize: "13px", marginBottom: "16px", resize: "vertical" }}
            />
            <button onClick={handleUpload} disabled={uploading || !uploadCodes.trim()} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: uploading || !uploadCodes.trim() ? 0.5 : 1 }}>
              {uploading ? <Loader2 className="h-4 w-4" style={{ animation: "spin 1s linear infinite" }} /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: "24px" }}>
            {cardHeader("var(--color-success-surface)", "var(--color-success)", Wand2, "Generate Vouchers")}
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px" }}>Auto-generate unique voucher codes.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "6px" }}>Count</label>
                <Input type="number" min={1} max={1000} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "6px" }}>Price (TSh)</label>
                <Select value={String(genPrice)} onValueChange={(v) => setGenPrice(Number(v))}>
                  <SelectTrigger style={{ width: "100%" }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1,000</SelectItem>
                    <SelectItem value="2000">2,000</SelectItem>
                    <SelectItem value="5000">5,000</SelectItem>
                    <SelectItem value="10000">10,000</SelectItem>
                    <SelectItem value="20000">20,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "var(--color-success)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: generating ? 0.5 : 1 }}>
              {generating ? <Loader2 className="h-4 w-4" style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
