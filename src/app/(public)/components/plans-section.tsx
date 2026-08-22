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

  useEffect(() => {
    fetch("/api/plans/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPlans(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      style={{
        padding: "40px 0",
        width: "100%",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: "4px",
          }}
        >
          Internet Packages
        </h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}>
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
                borderRadius: "var(--radius)",
                padding: "20px",
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
                  color: "#ffffff",
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
