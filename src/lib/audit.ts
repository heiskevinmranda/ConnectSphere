import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  actor: string;
  actorType?: "admin" | "system" | "customer";
  action: string;
  target?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  status?: "success" | "failure";
  adminId?: number | null;
}

/**
 * Records an audit trail entry. Audit logging must never break the
 * primary operation, so failures are swallowed after reporting.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: entry.actor,
        actorType: entry.actorType ?? "admin",
        action: entry.action,
        target: entry.target ?? null,
        details:
          entry.details && Object.keys(entry.details).length > 0
            ? JSON.stringify(entry.details)
            : null,
        ip: entry.ip ?? null,
        status: entry.status ?? "success",
        adminId: entry.adminId ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", entry.action, error);
  }
}

/** Reads the authenticated admin context injected by middleware. */
export function getAdminContext(headers: Headers): {
  email: string;
  role: string;
} | null {
  const email = headers.get("x-admin-email");
  const role = headers.get("x-admin-role");
  if (!email || !role) return null;
  return { email, role };
}

/** Reads the authenticated admin's numeric id injected by middleware. */
export function getAdminId(headers: Headers): number | null {
  const id = headers.get("x-admin-id");
  if (!id) return null;
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
}
