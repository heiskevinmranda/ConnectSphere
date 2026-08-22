"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { formatDuration, formatCurrency, detectMNOProvider } from "@/lib/utils";

interface PaymentModalProps {
  plan: Record<string, unknown>;
  onClose: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
  /** Fired when the plan has no voucher stock at initiation time. */
  onStockOut: () => void;
}

interface InitiateEnvelope {
  success: boolean;
  message?: string;
  data?: {
    success?: boolean;
    reused?: boolean;
    message?: string;
    data?: { paymentReference?: string; simulationMode?: boolean };
  };
}

const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 3000;

export function PaymentModal({ plan, onClose, onSuccess, onStockOut }: PaymentModalProps) {
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"input" | "initiating" | "waiting" | "processing" | "failed">("input");
  const [failureReference, setFailureReference] = useState<string | null>(null);

  // Guards so timers never fire into an unmounted/closed modal.
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const closeModal = () => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provider = detectMNOProvider("+255" + phone.replace(/\D/g, "").replace(/^0/, ""));

  const reset = () => {
    setProcessing(false);
    setStep("input");
    setFailureReference(null);
  };

  const markFailed = (reference: string | null, message?: string) => {
    setProcessing(false);
    setStep("failed");
    setFailureReference(reference);
    toast.error(message || "The payment did not go through.");
  };

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
        body: JSON.stringify({ phoneNumber: fullPhone, plan: plan.slug }),
      });
      const data: InitiateEnvelope = await res.json();

      // Business rejections arrive as HTTP 409/404/429/503 with success:false.
      if (!res.ok || !data.success || !data.data?.success || !data.data.data?.paymentReference) {
        cancelledRef.current = true;
        if (res.status === 503) {
          onStockOut();
          return;
        }
        if (res.status === 409 && data.message) {
          toast.warning("Subscription already active", { description: data.message });
        } else if (res.status === 429 && data.message) {
          toast.warning(data.message);
        } else {
          toast.error(data.message || "Payment could not be started");
        }
        reset();
        return;
      }

      if (data.data.reused) {
        toast.info(data.data.message || "Resuming your payment in progress.");
      } else {
        toast.success("Payment initiated! Check your phone for the prompt.");
      }

      const reference = data.data.data.paymentReference;

      const poll = async (attempt: number) => {
        if (cancelledRef.current) return;
        setStep("processing");
        try {
          const sr = await fetch(`/api/payments/status/${reference}`);
          const sd = await sr.json();
          if (cancelledRef.current) return;

          const status = sd?.data?.payment?.status;
          if (sd.success && status === "completed") {
            toast.success("Payment completed!");
            setProcessing(false);
            onSuccess(sd.data);
            return;
          }
          if (status === "failed") {
            markFailed(reference, "The payment failed or was declined. No amount was charged.");
            return;
          }
          if (attempt < MAX_POLL_ATTEMPTS) {
            timerRef.current = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
          } else {
            toast.info(
              "If you approved the prompt, your access will activate automatically. Otherwise no charge was made.",
              { duration: 7000 }
            );
            markFailed(
              reference,
              "We could not confirm the payment in time. Please contact support if you were charged."
            );
          }
        } catch {
          if (attempt < MAX_POLL_ATTEMPTS && !cancelledRef.current) {
            timerRef.current = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
          } else if (!cancelledRef.current) {
            markFailed(reference, "Lost connection while checking payment status.");
          }
        }
      };

      timerRef.current = setTimeout(() => poll(1), POLL_INTERVAL_MS);
    } catch {
      toast.error("Payment failed. Please check your connection and try again.");
      reset();
    }
  };

  const stepMessage = () => {
    switch (step) {
      case "initiating": return "Initiating payment...";
      case "waiting": return "Check your phone for payment prompt";
      case "processing": return "Processing payment...";
      case "failed": return "Payment not completed";
      default: return "Enter your phone number to continue";
    }
  };

  const failedView = step === "failed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: "var(--radius-xl)",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)]" style={{ padding: "20px 20px 16px" }}>
          <h2 id="payment-modal-title" className="text-lg font-bold text-[var(--color-text)]">Complete Payment</h2>
          <button
            onClick={closeModal}
            aria-label="Close payment dialog"
            className="w-8 h-8 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] flex items-center justify-center hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Processing Progress */}
        {processing && (
          <div className="text-center" style={{ padding: "24px 20px" }} role="status" aria-live="polite">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-surface)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4" style={{ animation: "spin 2s linear infinite" }}>
              <Loader2 className="h-8 w-8" />
            </div>
            <p className="font-bold text-[var(--color-text)] mb-2">{stepMessage()}</p>
            <div className="w-full h-1 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden mx-auto" style={{ maxWidth: "280px" }}>
              <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))", width: "60%", transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}

        {/* Failure notice */}
        {failedView && (
          <div className="text-center" style={{ padding: "24px 20px 0" }} role="alert">
            <div className="w-14 h-14 rounded-full bg-[var(--color-error-surface)] text-[var(--color-error)] flex items-center justify-center mx-auto mb-3">
              <X className="h-7 w-7" />
            </div>
            <p className="font-bold text-[var(--color-text)] mb-1">{stepMessage()}</p>
            <p className="text-xs text-[var(--color-text-secondary)]" style={{ lineHeight: 1.5 }}>
              {failureReference && (
                <>Reference: <span style={{ fontFamily: "'SF Mono', 'Consolas', monospace" }}>{failureReference}</span> &middot; </>
              )}
              You can try again below.
            </p>
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
          <label htmlFor="payment-phone" className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide" style={{ marginBottom: "10px" }}>
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
              <span className="text-sm font-semibold text-[var(--color-text)]">+255</span>
            </div>
            <input
              id="payment-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="7XX XXX XXX"
              disabled={processing}
              maxLength={12}
              aria-describedby="payment-phone-hint"
              className="flex-1 min-w-0 text-sm focus:outline-none disabled:opacity-50"
              style={{ border: "none", background: "none", padding: "14px 16px" }}
            />
            {provider.slug !== "unknown" && provider.logo && (
              <div className="flex items-center justify-center shrink-0" style={{ padding: "0 14px" }}>
                <Image src={provider.logo} alt={provider.name} width={48} height={48} className="w-12 h-12 rounded-lg object-contain" />
              </div>
            )}
          </div>
          <p id="payment-phone-hint" className="text-xs text-[var(--color-text-muted)]" style={{ marginBottom: "8px" }}>
            You will receive a payment prompt on this number.
          </p>

          {/* Pay Button */}
          <button
            onClick={failedView ? reset : handlePay}
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
            ) : failedView ? (
              "Try Again"
            ) : (
              `Pay ${formatCurrency(plan.price as number)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
