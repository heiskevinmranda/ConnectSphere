"use client";

export function HeroSection() {
  return (
    <div
      id="top"
      className="hero-container relative overflow-hidden"
      style={{ background: "#000000", minHeight: "92vh" }}
    >
      {/* Full-bleed photograph, graded darker so type lands cleanly (no scrim overlay) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/images/bg-hero.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.55) saturate(1.05)",
        }}
      />

      <div className="hero-content relative z-10 flex flex-col items-center justify-center text-center" style={{ minHeight: "92vh", padding: "96px 20px 48px" }}>
        <div style={{ maxWidth: "1000px" }}>
          <p className="eyebrow" style={{ color: "#f0f0fa", marginBottom: "24px", opacity: 0.9 }}>
            ConnectSphere &middot; Tanzania &middot; Now Online
          </p>

          <h1 className="display-xxl" style={{ color: "#ffffff", marginBottom: "28px" }}>
            Reliable Connectivity
            <br />
            Across Tanzania
          </h1>

          <p
            className="mx-auto"
            style={{
              fontSize: "16px",
              lineHeight: 1.7,
              letterSpacing: "0.02em",
              color: "#f0f0fa",
              maxWidth: "560px",
              marginBottom: "40px",
            }}
          >
            High-speed internet with flexible plans. Choose a package, pay via
            mobile money, and get connected instantly.
          </p>

          <a href="#plans" className="btn-ghost" style={{ minWidth: "200px" }}>
            Get Connected
          </a>

          <div
            className="eyebrow"
            style={{
              color: "#f0f0fa",
              opacity: 0.8,
              marginTop: "56px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "24px",
            }}
          >
            <span>Instant Activation</span>
            <span style={{ color: "#3a3a3f" }}>|</span>
            <span>Mobile Money Payment</span>
            <span style={{ color: "#3a3a3f" }}>|</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}