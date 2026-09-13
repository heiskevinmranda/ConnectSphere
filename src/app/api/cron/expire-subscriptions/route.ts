import { NextRequest } from "next/server";
import { expireSubscriptions } from "@/modules/subscriptions/services/expiry.service";
import { recordAudit } from "@/lib/audit";
import { constantTimeEqual } from "@/lib/secrets";
import { apiSuccess, apiError } from "@/lib/api-response";

async function handle(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Fail closed: without a configured secret the endpoint must stay shut.
    return apiError("Cron endpoint is not configured", 503);
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token || !constantTimeEqual(token, cronSecret)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const result = await expireSubscriptions();
    await recordAudit({
      actor: "system",
      actorType: "system",
      action: "subscriptions.expiry_run",
      details: result,
    });
    return apiSuccess(result);
  } catch (error) {
    console.error("[cron] expiry run failed:", error);
    return apiError("Failed to expire subscriptions", 500);
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
