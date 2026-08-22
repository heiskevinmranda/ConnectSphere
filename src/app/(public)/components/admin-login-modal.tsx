"use client";

import { useState } from "react";
import { Shield, Loader2, X } from "lucide-react";
import { useToast } from "@/modules/notifications/hooks/use-toast";

interface Props {
  onClose: () => void;
}

export function AdminLoginModal({ onClose }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (data.success) {
        localStorage.setItem("adminToken", data.data.token);
        toast.success("Login successful!");
        window.location.href = "/admin/dashboard";
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch {
      toast.error("Login failed");
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
        className="bg-white w-full max-w-sm mx-4 overflow-hidden"
        style={{ borderRadius: "var(--radius-xl)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="relative text-center" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)", padding: "32px 24px 24px" }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X className="h-4 w-4" />
          </button>
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Admin Portal</h2>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>Sign in to access the admin dashboard</p>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@connectsphere.co.tz"
              className="w-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            style={{ padding: "14px", background: "var(--color-primary)", borderRadius: "var(--radius-md)", fontSize: "0.95rem" }}
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center" style={{ paddingBottom: "20px" }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full" style={{ padding: "6px 14px", background: "var(--color-success-surface)", color: "var(--color-success)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-success)" }} />
            Secure Connection
          </span>
        </div>
      </div>
    </div>
  );
}
