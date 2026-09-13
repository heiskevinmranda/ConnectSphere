"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#status", label: "Status" },
  { href: "#plans", label: "Plans" },
  { href: "#support", label: "Support" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 transition-colors"
      style={{
        background: scrolled ? "rgba(0,0,0,0.72)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid var(--color-border)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "18px 24px",
        }}
      >
        <a
          href="#top"
          className="font-bold"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: "#ffffff",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
          aria-label="ConnectSphere home"
        >
          CONNECTSPHERE
        </a>

        <nav aria-label="Site" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="eyebrow site-nav-link"
              style={{
                color: "#ffffff",
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: "9999px",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <style>{`
        .site-nav-link { display: none; }
        @media (min-width: 768px) {
          .site-nav-link { display: inline-block; }
        }
      `}</style>
    </header>
  );
}