interface FooterProps {
  onAdminClick: () => void;
}

export function Footer({ onAdminClick }: FooterProps) {
  return (
    <footer
      onClick={onAdminClick}
      role="presentation"
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "#000000",
        cursor: "default",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "32px 16px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "16px",
            letterSpacing: "0.08em",
            color: "var(--color-text)",
            marginBottom: "8px",
          }}
        >
          CONNECTSPHERE
        </p>
        <p className="eyebrow" style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
          {new Date().getFullYear()} ConnectSphere ISP. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
