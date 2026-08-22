"use client";

import { Zap, Smartphone, Headphones, Lock } from "lucide-react";

interface HeroSectionProps {
  onAdminClick: () => void;
}

export function HeroSection({ onAdminClick }: HeroSectionProps) {
  return (
    <div className="hero-container relative overflow-hidden" style={{ background: "#0a1f15", minHeight: "480px" }}>
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "url(/images/bg-hero.jpg)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(10,31,21,0.85) 0%, rgba(26,71,49,0.7) 50%, rgba(10,31,21,0.9) 100%)" }}
      />

      {/* Admin button */}
      <div className="absolute top-4 right-4" style={{ zIndex: 20 }}>
        <button
          onClick={onAdminClick}
          className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
        >
          <Lock className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="hero-content relative z-10 flex flex-col items-center justify-center text-center" style={{ minHeight: "480px", padding: "60px 20px 48px" }}>
        <div style={{ maxWidth: "680px" }}>
          <p className="font-bold uppercase mb-4" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em" }}>
            ConnectSphere
          </p>

          <h1 className="font-extrabold text-white mb-4 leading-tight" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-0.03em" }}>
            Reliable Connectivity<br />Across Tanzania
          </h1>

          <p className="mb-7 mx-auto" style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.7, maxWidth: "520px" }}>
            High-speed internet with flexible plans. Choose a package, pay via
            mobile money, and get connected instantly.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-1.5" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              <Zap className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />
              <span>Instant Activation</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              <Smartphone className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />
              <span>Mobile Money Payment</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              <Headphones className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
