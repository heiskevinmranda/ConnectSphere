"use client"

import { Toaster as SonnerToaster, toast } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      style={{ fontFamily: "var(--font-figtree)" }}
      toastOptions={{
        style: {
          background: "var(--color-bg-elevated)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          fontSize: "13px",
          padding: "12px 16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        },
      }}
    />
  )
}

export { toast }
