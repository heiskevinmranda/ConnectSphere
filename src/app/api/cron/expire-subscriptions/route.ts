import { NextRequest } from "next/server";
import { expireSubscriptions } from "@/modules/subscriptions/services/expiry.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  try {
    const result = await expireSubscriptions();
    return apiSuccess(result);
  } catch {
    return apiError("Failed to expire subscriptions", 500);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
