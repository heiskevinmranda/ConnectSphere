"use client";

import { useState } from "react";
import { Loader2, SearchCheck, Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface ActiveSubscription {
  plan: string;
  voucherCode: string | null;
  endDate: string;
  remainingTime?: string;
}

export function StatusSection() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActiveSubscription | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalize = (raw: string): string | null => {
    let normalized = raw.replace(/\D/g, "");
    if (normalized.startsWith("0")) normalized = "255" + normalized.substring(1);
    if (!normalized.startsWith("255")) normalized = "255" + normalized;
    if (!/^\+?255\d{9}$/.test(normalized) && !/^\d{12}$/.test(normalized)) return null;
    return "+" + normalized.replace(/^\+/, "");
  };

  const handleCheck = async () => {
    const fullPhone = normalize(phone);
    if (!fullPhone) {
      toast.error("Please enter a valid Tanzanian phone number");
      return;
    }

    setLoading(true);
    setChecked(false);
    setCopied(false);
    setResult(null);
    setNotFound(false);
    try {
      const res = await fetch("/api/subscriptions/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not check your subscription");
        return;
      }

      if (data.data?.isSubscribed && data.data.subscription) {
        // Fetch the voucher code for the active subscription.
        let voucher: string | null = data.data.subscription.voucherCode ?? null;
        if (!voucher) {
          try {
            const vRes = await fetch("/api/subscriptions/voucher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phoneNumber: fullPhone }),
            });
            const vData = await vRes.json();
            if (vRes.ok && vData.success && vData.data?.voucher) {
              voucher = vData.data.voucher as string;
            }
          } catch {
            /* voucher lookup is best-effort */
          }
        }
        setResult({
          plan: data.data.subscription.plan,
          voucherCode: voucher,
          endDate: data.data.subscription.endDate,
          remainingTime: data.data.subscription.remainingTime,
        });
      } else {
        setResult(null);
        setNotFound(true);
      }
      setChecked(true);
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyVoucher = async () => {
    if (!result?.voucherCode) return;
    try {
      await navigator.clipboard.writeText(result.voucherCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  return (
    <section id="status" style={{ padding: "64px 0", width: "100%" }} aria-labelledby="status-heading">
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "40px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <SearchCheck className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          <h2 id="status-heading" style={{ fontSize: "17px", fontWeight: 700, color: "var(--color-text)" }}>
            Check your connection
          </h2>
        </div>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
          Already subscribed? Enter your phone number to see your plan and voucher code.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheck();
          }}
          style={{ display: "flex", gap: "8px" }}
        >
          <div
            className="flex items-center overflow-hidden"
            style={{
              flex: 1,
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg)",
            }}
          >
            <span style={{ padding: "11px 12px", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text)", background: "var(--color-bg-subtle)", borderRight: "1px solid var(--color-border)" }}>+255</span>
            <input
              type="tel"
              inputMode="numeric"
              aria-label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="7XX XXX XXX"
              maxLength={12}
              disabled={loading}
              style={{ flex: 1, minWidth: 0, border: "none", background: "none", padding: "11px 12px", fontSize: "0.9rem", outline: "none" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ padding: "0 18px", background: "var(--color-primary)", color: "#000000", borderRadius: "var(--radius-md)", fontSize: "0.85rem", whiteSpace: "nowrap" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Checking..." : "Check"}
          </button>
        </form>

        {checked && result && (
          <div role="status" style={{ marginTop: "16px", padding: "16px", borderRadius: "var(--radius-md)", background: "var(--color-success-surface)" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-success)", textTransform: "capitalize", marginBottom: "4px" }}>
              {result.plan} plan active
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: result.voucherCode ? "10px" : 0 }}>
              Valid until{" "}
              {new Date(result.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              {result.remainingTime ? ` · ${result.remainingTime} remaining` : ""}
            </p>
            {result.voucherCode && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "'SF Mono', 'Consolas', monospace",
                    fontSize: "15px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "var(--color-primary)",
                    background: "var(--color-bg-elevated)",
                    border: "1px dashed var(--color-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 12px",
                  }}
                >
                  {result.voucherCode}
                </span>
                <button
                  type="button"
                  onClick={copyVoucher}
                  aria-label="Copy voucher code"
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "var(--color-success)" : "var(--color-text-muted)", padding: "4px" }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}

        {checked && notFound && (
          <div role="status" style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "var(--radius-md)", background: "var(--color-warning-surface)" }}>
            <p style={{ fontSize: "13px", color: "var(--color-warning)", fontWeight: 600 }}>
              No active subscription found for this number.
            </p>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              Choose a package below to get connected.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
