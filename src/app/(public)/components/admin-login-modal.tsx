"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, X } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { useModalA11y } from "@/lib/use-modal-a11y";

interface Props {
  onClose: () => void;
}

export function AdminLoginModal({ onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dialogRef = useModalA11y(onClose);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        localStorage.setItem("adminToken", data.data.token);
        toast.success("Login successful!");
        router.push("/admin/dashboard");
        return;
      }
      toast.error(data.message || "Invalid email or password");
    } catch {
      toast.error("Could not reach the server. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="admin-login-title"
        className="glass-panel w-full max-w-sm mx-4 overflow-hidden"
        style={{ borderRadius: "var(--radius-xl)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative text-center" style={{ borderBottom: "1px solid var(--color-border)", padding: "32px 24px 24px" }}>
          <button onClick={onClose} aria-label="Close admin login" className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors" style={{ border: "1px solid var(--color-border)" }}>
            <X className="h-4 w-4" />
          </button>
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 id="admin-login-title" className="text-xl font-bold text-white mb-1" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Admin Portal</h2>
          <p className="eyebrow" style={{ color: "var(--color-text-muted)" }}>Sign in to access the admin dashboard</p>
        </div>

        {/* Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          style={{ padding: "24px" }}
        >
          <div className="mb-4">
            <label htmlFor="admin-email" className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@connectsphere.co.tz"
              autoComplete="username"
              required
              className="w-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="admin-password" className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
              className="w-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            style={{ padding: "14px", background: "var(--color-primary)", borderRadius: "var(--radius-md)", fontSize: "0.95rem" }}
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
