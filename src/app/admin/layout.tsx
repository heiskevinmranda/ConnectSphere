"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Package, Ticket, Wifi, Router,
  BarChart3, Settings, Menu, X, LogOut, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/toaster";
import {
  adminFetch,
  clearAdminSession,
  getAdminToken,
} from "@/lib/admin-client";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/plans", label: "Plans", icon: Package },
  { href: "/admin/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/admin/network", label: "Network", icon: Wifi },
  { href: "/admin/routers", label: "Routers", icon: Router },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/system", label: "System", icon: Settings },
];

interface AdminAccount {
  id: number;
  email: string;
  role: string;
}

type AuthState =
  | { status: "checking" }
  | { status: "authorized"; account: AdminAccount }
  | { status: "unauthorized" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>(() =>
    typeof window !== "undefined" && getAdminToken()
      ? { status: "checking" }
      : { status: "unauthorized" }
  );

  useEffect(() => {
    if (auth.status !== "checking") return;
    let cancelled = false;
    adminFetch<AdminAccount>("/api/admin/me", { silentAuth: true })
      .then((account) => {
        if (!cancelled) setAuth({ status: "authorized", account });
      })
      .catch((error) => {
        if (cancelled || (error instanceof Error && error.message === "Session expired")) {
          return;
        }
        clearAdminSession();
        setAuth({ status: "unauthorized" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    toast.success("Signed out");
    router.replace("/");
  };

  if (auth.status === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }} role="status" aria-label="Checking session">
        <div style={{ width: "32px", height: "32px", border: "3px solid var(--color-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (auth.status === "unauthorized") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: "16px" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <Shield className="h-10 w-10" style={{ margin: "0 auto 16px", color: "var(--color-text-muted)" }} />
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", marginBottom: "8px" }}>Sign in required</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            Your session is invalid or has expired. Please sign in again to access the admin portal.
          </p>
          <Button onClick={() => router.replace("/")} style={{ background: "var(--color-primary)", color: "#fff" }}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const currentPage = NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label || "Admin";

  const navContent = (
    <>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield className="h-5 w-5" style={{ color: "#ffffff" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-primary)", lineHeight: 1.2 }}>ConnectSphere</div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Admin Portal</div>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)", display: "none" }}
            className="mobile-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div style={{ marginTop: "12px", padding: "8px 10px", borderRadius: "8px", background: "var(--color-bg-subtle)" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", overflowWrap: "anywhere" }}>{auth.account.email}</div>
          <div style={{ fontSize: "11px", color: auth.account.role === "super_admin" ? "var(--color-warning)" : "var(--color-text-muted)", textTransform: "capitalize", fontWeight: 500 }}>
            {auth.account.role.replace("_", " ")}
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }} aria-label="Admin sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "#ffffff" : "var(--color-text-secondary)",
                background: active ? "var(--color-primary)" : "transparent",
                textDecoration: "none",
                marginBottom: "2px",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "var(--color-primary)" : "transparent"; }}
            >
              <Icon className="h-4 w-4" style={{ flexShrink: 0 }} />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--color-border)" }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-error)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-error-surface)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--color-bg)" }}>
      <Toaster />
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Admin sidebar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "256px",
          background: "var(--color-bg-elevated)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 200ms ease",
        }}
        className="admin-sidebar"
      >
        {navContent}
      </aside>

      <div className="admin-sidebar-desktop" style={{
        width: "256px",
        flexShrink: 0,
        background: "var(--color-bg-elevated)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
      }}>
        {navContent}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--color-bg-elevated)",
          borderBottom: "1px solid var(--color-border)",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <Button
            variant="ghost"
            size="icon"
            className="admin-hamburger"
            aria-label="Open navigation menu"
            onClick={() => setSidebarOpen(true)}
            style={{ display: "none" }}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{currentPage}</h2>
        </header>
        <main style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          {children}
        </main>
      </div>

      <style>{`
        .admin-sidebar { display: none; }
        .admin-hamburger { display: none !important; }
        @media (max-width: 767px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-sidebar { display: flex !important; }
          .admin-hamburger { display: flex !important; }
          .mobile-close-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
