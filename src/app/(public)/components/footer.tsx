export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg-subtle)",
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
            fontWeight: 700,
            fontSize: "16px",
            color: "var(--color-text)",
            marginBottom: "4px",
          }}
        >
          ConnectSphere
        </p>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          {new Date().getFullYear()} ConnectSphere ISP. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
