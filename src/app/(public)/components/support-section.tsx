import { Headphones } from "lucide-react";

export function SupportSection() {
  return (
    <section
      style={{
        padding: "32px 0",
        maxWidth: "1200px",
        margin: "0 auto",
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
              <strong style={{ color: "var(--color-primary)" }}>
                +255 784 425 661
              </strong>{" "}
              or email{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                support@connectsphere.co.tz
              </strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
