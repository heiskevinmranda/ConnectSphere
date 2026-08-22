"use client";

import { AlertTriangle } from "lucide-react";

interface NoVoucherModalProps {
  onClose: () => void;
}

export function NoVoucherModal({ onClose }: NoVoucherModalProps) {
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
        <div className="text-center" style={{ padding: "24px 24px 16px" }}>
          <div className="w-14 h-14 rounded-full bg-[var(--color-warning-surface)] text-[var(--color-warning)] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">Vouchers Temporarily Unavailable</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-5" style={{ lineHeight: "1.5" }}>
            We are currently out of voucher codes for this plan. Please try again in a few minutes or contact support for assistance.
          </p>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <button
            onClick={onClose}
            className="w-full font-semibold flex items-center justify-center transition-all"
            style={{ padding: "14px", background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-md)", fontSize: "0.95rem" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
