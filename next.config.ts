import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ["bcryptjs"],
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // Scripts are served same-origin only. Dev leans on inline
          // bundles for HMR, so inline + eval are permitted outside production
          // (React's dev instrumentation needs eval to rebuild callstacks).
          isProd ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          // Tailwind v4 and inline component styles require inline styles.
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          isProd ? "connect-src 'self'" : "connect-src 'self' ws: http:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;