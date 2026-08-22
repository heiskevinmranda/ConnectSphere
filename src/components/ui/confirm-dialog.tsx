"use client"

import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, Trash2 } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning" | "info"
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

const variantStyles = {
  danger: {
    iconBg: "var(--color-error-surface)",
    iconColor: "var(--color-error)",
    icon: Trash2,
    btnBg: "var(--color-error)",
    btnHover: "#a93226",
  },
  warning: {
    iconBg: "var(--color-warning-surface)",
    iconColor: "var(--color-warning)",
    icon: AlertTriangle,
    btnBg: "var(--color-warning)",
    btnHover: "#cf6d17",
  },
  info: {
    iconBg: "var(--color-primary-surface)",
    iconColor: "var(--color-primary)",
    icon: AlertTriangle,
    btnBg: "var(--color-primary)",
    btnHover: "#153a27",
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const v = variantStyles[variant]
  const Icon = v.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        style={{ padding: "0", overflow: "hidden" }}
      >
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: v.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: v.iconColor }} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  marginBottom: "6px",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.5,
                }}
              >
                {description}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter style={{ padding: "16px 24px 24px" }}>
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            style={{
              padding: "9px 20px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              background: "var(--color-bg-elevated)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "9px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              background: v.btnBg,
              color: "#fff",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = v.btnHover
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = v.btnBg
            }}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
