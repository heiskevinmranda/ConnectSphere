import { Headphones } from "lucide-react";

export function SupportSection() {
  return (
    <section
      id="support"
      style={{
        padding: "64px 0",
        width: "100%",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "24px",
          background: "var(--color-bg-elevated)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius)",
              background: "var(--color-primary-surface)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text)",
                marginBottom: "4px",
              }}
            >
              Need Assistance?
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
              }}
            >
              Contact our support team at{" "}
              <a href="tel:+255784425661" style={{ color: "#ffffff", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "3px" }}>
                +255 784 425 661
              </a>{" "}
              or email{" "}
              <a href="mailto:support@connectsphere.co.tz" style={{ color: "#ffffff", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "3px" }}>
                support@connectsphere.co.tz
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
