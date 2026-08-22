"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/modules/notifications/hooks/use-toast";
import { formatDuration, formatCurrency, detectMNOProvider } from "@/lib/utils";

interface PaymentModalProps {
  plan: Record<string, unknown>;
  onClose: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
  onError: () => void;
}

export function PaymentModal({ plan, onClose, onSuccess, onError }: PaymentModalProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"input" | "initiating" | "waiting" | "processing">("input");

  const provider = detectMNOProvider("+255" + phone.replace(/\D/g, "").replace(/^0/, ""));

  const handlePay = async () => {
    if (!phone) { toast.error("Please enter your phone number"); return; }
    let normalized = phone.replace(/\D/g, "");
    if (normalized.startsWith("0")) normalized = "255" + normalized.substring(1);
    if (!normalized.startsWith("255")) normalized = "255" + normalized;
    const fullPhone = "+" + normalized;

    if (!/^\+255\d{9}$/.test(fullPhone)) {
      toast.error("Please enter a valid Tanzanian phone number");
      return;
    }

    setProcessing(true);
    setStep("initiating");

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhone, plan: plan.slug, amount: plan.price }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.data?.hasActiveSubscription) { toast.warning(data.data.message); }
        else { toast.error(data.message || "Payment failed"); }
        setProcessing(false); setStep("input"); return;
      }
      setStep("waiting");
      toast.success("Payment initiated! Check your phone for the prompt.");

      let attempts = 0;
      const poll = async () => {
        attempts++;
        setStep("processing");
        try {
          const sr = await fetch(`/api/payments/status/${data.data.paymentReference}`);
          const sd = await sr.json();
          if (sd.success && sd.data?.payment?.status === "completed") {
            toast.success("Payment completed!");
            onSuccess(sd.data);
          } else if (attempts < 20) {
            setTimeout(poll, 3000);
          } else {
            toast.warning("Payment is taking longer than expected.");
            setProcessing(false); setStep("input");
          }
        } catch {
          if (attempts < 20) setTimeout(poll, 3000);
          else { onError(); setProcessing(false); setStep("input"); }
        }
      };
      setTimeout(poll, 3000);
    } catch {
      toast.error("Payment failed. Please try again.");
      setProcessing(false); setStep("input");
    }
  };

  const stepMessage = () => {
    switch (step) {
      case "initiating": return "Initiating payment...";
      case "waiting": return "Check your phone for payment prompt";
      case "processing": return "Processing payment...";
      default: return "Enter your phone number to continue";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: "var(--radius-xl)",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)]" style={{ padding: "20px 20px 16px" }}>
          <h2 className="text-lg font-bold text-[var(--color-text)]">Complete Payment</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] flex items-center justify-center hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Processing Progress */}
        {processing && (
          <div className="text-center" style={{ padding: "24px 20px" }}>
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-surface)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4" style={{ animation: "spin 2s linear infinite" }}>
              <Loader2 className="h-8 w-8" />
            </div>
            <p className="font-bold text-[var(--color-text)] mb-2">{stepMessage()}</p>
            <div className="w-full h-1 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden mx-auto" style={{ maxWidth: "280px" }}>
              <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))", width: "60%", transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "24px 24px 28px" }}>
          {/* Selected Plan */}
          <div className="flex items-center gap-3" style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", background: "var(--color-primary-surface)", marginBottom: "24px" }}>
            <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {(plan.name as string)?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--color-text)] text-[0.95rem]">{plan.name as string} Plan</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{formatDuration(plan.duration as number)} &middot; Unlimited Data</p>
            </div>
            <p className="font-extrabold text-[var(--color-primary)] text-lg">{formatCurrency(plan.price as number)}</p>
          </div>

          {/* Phone Input */}
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide" style={{ marginBottom: "10px" }}>
            Phone Number
          </label>
          <div
            className="flex items-center overflow-hidden transition-all bg-white"
            style={{
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              marginBottom: "4px",
            }}
          >
            <div className="flex items-center gap-1.5 shrink-0" style={{ padding: "14px 14px", background: "var(--color-bg-subtle)", borderRight: "1px solid var(--color-border)" }}>
              <img src="/images/mnos/mno.png" alt="" className="w-5 h-5 rounded-sm object-contain" style={{ display: "none" }} />
              <span className="text-sm font-semibold text-[var(--color-text)]">+255</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="7XX XXX XXX"
              disabled={processing}
              maxLength={12}
              className="flex-1 min-w-0 text-sm focus:outline-none disabled:opacity-50"
              style={{ border: "none", background: "none", padding: "14px 16px" }}
            />
            {provider.slug !== "unknown" && provider.logo && (
              <div className="flex items-center justify-center shrink-0" style={{ padding: "0 14px" }}>
                <img src={provider.logo} alt={provider.name} className="w-12 h-12 rounded-lg object-contain" />
              </div>
            )}
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={processing}
            className="w-full font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              padding: "16px",
              marginTop: "24px",
              background: "var(--color-primary)",
              borderRadius: "var(--radius-md)",
              fontSize: "1rem",
            }}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(plan.price as number)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
