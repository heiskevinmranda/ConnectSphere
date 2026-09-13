import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let database: "ok" | "error" = "error";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch (error) {
    // Log the detail server-side; never expose internals in the payload.
    console.error("[health] database check failed:", error);
  }

  const body = {
    status: database === "ok" ? "OK" : "DEGRADED",
    checks: {
      api: "ok" as const,
      database,
    },
    version: process.env.npm_package_version ?? "0.1.0",
    uptimeSeconds: Math.round(process.uptime()),
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(
    body,
    { status: database === "ok" ? 200 : 503 },
  );
}
