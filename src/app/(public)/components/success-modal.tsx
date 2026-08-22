"use client";

import { CheckCircle2, X } from "lucide-react";

interface SuccessModalProps {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function SuccessModal({ data, onClose }: SuccessModalProps) {
  const sub = (data.subscription || data) as Record<string, unknown>;
  const voucherCode = sub.voucherCode as string;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md"
        style={{ borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center" style={{ padding: "32px 24px 16px" }}>
          <div className="w-16 h-16 rounded-full bg-[var(--color-success-surface)] text-[var(--color-success)] flex items-center justify-center mx-auto mb-4" style={{ animation: "popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Payment Successful!</h2>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <p className="text-sm text-[var(--color-text-secondary)] text-center mb-5">
            {(data.message as string) || "Your internet package has been activated successfully!"}
          </p>

          {voucherCode && (
            <div className="rounded-[var(--radius-md)] text-center mb-5" style={{ padding: "20px", background: "var(--color-bg-subtle)", border: "1.5px dashed var(--color-primary)" }}>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Your Voucher Code</p>
              <span className="inline-block text-xl font-bold text-[var(--color-primary)] tracking-widest" style={{ padding: "8px 16px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", fontFamily: "monospace" }}>
                {voucherCode}
              </span>
            </div>
          )}

          <div className="rounded-[var(--radius-md)] mb-5" style={{ background: "var(--color-bg-subtle)", padding: "16px" }}>
            <div className="flex justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
              <span className="text-[var(--color-text-secondary)]">Plan</span>
              <span className="font-semibold text-[var(--color-text)]">{sub.plan as string}</span>
            </div>
            <div className="flex justify-between py-2 text-sm" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
              <span className="text-[var(--color-text-secondary)]">Amount Paid</span>
              <span className="font-semibold text-[var(--color-text)]">TSh {(sub.amount as number)?.toLocaleString()}</span>
            </div>
            {typeof sub.endDate === "string" && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-[var(--color-text-secondary)]">Valid Until</span>
                <span className="font-semibold text-[var(--color-text)]">{new Date(sub.endDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full font-semibold text-white flex items-center justify-center gap-2 transition-all"
            style={{ padding: "14px", background: "var(--color-primary)", borderRadius: "var(--radius-md)", fontSize: "0.95rem" }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
