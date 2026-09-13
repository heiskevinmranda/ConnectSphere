"use client";

import { useEffect, useState } from "react";
import { Wifi, Signal, Gauge, Rocket, Star, Loader2 } from "lucide-react";
import { formatDuration, formatCurrency } from "@/lib/utils";

const ICON_MAP: Record<string, React.ReactNode> = {
  wifi: <Wifi className="h-6 w-6" />,
  signal: <Signal className="h-6 w-6" />,
  gauge: <Gauge className="h-6 w-6" />,
  rocket: <Rocket className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
};

interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  duration: number;
  description: string | null;
  icon: string;
}

interface PlansSectionProps {
  onSelectPlan: (plan: Plan) => void;
}

export function PlansSection({ onSelectPlan }: PlansSectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plans/public")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d.success) {
            setPlans(d.data);
            setError(null);
          } else {
            setError(d.message || "Could not load packages.");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load packages. Check your connection.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <section
      id="plans"
      style={{
        padding: "64px 0",
        width: "100%",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2
          className="display-lg"
          style={{
            color: "var(--color-text)",
            marginBottom: "8px",
          }}
        >
          Internet Packages
        </h2>
        <p className="eyebrow" style={{ color: "var(--color-text-muted)" }}>
          Select the package that fits your needs
        </p>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "48px 0",
          }}
        >
          <Loader2
            className="h-8 w-8 text-[var(--color-primary)]"
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
      ) : error ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "56px 20px",
            textAlign: "center",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>
            Could not load packages
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", maxWidth: "420px", lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            onClick={handleRetry}
            style={{
              marginTop: "4px",
              padding: "10px 22px",
              background: "var(--color-primary)",
              color: "#000000",
              border: "none",
              borderRadius: "var(--radius)",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            padding: "56px 20px",
            textAlign: "center",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>
            No packages available right now
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", maxWidth: "420px", lineHeight: 1.5 }}>
            Please check back soon or contact support for assistance.
          </p>
        </div>
      ) : (
        <div
          className="plans-grid-responsive"
          style={{
            width: "100%",
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "28px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--color-primary-surface)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                {ICON_MAP[plan.icon] || <Wifi className="h-6 w-6" />}
              </div>
              <h3
                style={{
                  fontWeight: 600,
                  fontSize: "15px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-text)",
                  marginBottom: "6px",
                }}
              >
                {plan.name} Plan
              </h3>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  fontSize: "12px",
                  borderRadius: "9999px",
                  background: "var(--color-bg-subtle)",
                  color: "var(--color-text-secondary)",
                  marginBottom: "8px",
                }}
              >
                {formatDuration(plan.duration)}
              </span>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  marginBottom: "12px",
                  flex: 1,
                  lineHeight: 1.4,
                }}
              >
                {plan.description}
              </p>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  marginBottom: "16px",
                }}
              >
                {formatCurrency(plan.price)}
              </p>
              <button
                onClick={() => onSelectPlan(plan)}
                style={{
                  width: "100%",
                  background: "var(--color-primary)",
                  color: "#000000",
                  border: "none",
                  borderRadius: "var(--radius)",
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
