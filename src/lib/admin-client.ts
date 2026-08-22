"use client";

/**
 * Client-side fetch wrapper for admin API calls.
 * - Attaches the bearer token
 * - Normalizes error envelopes
 * - Clears the session and bounces to login on 401
 */

export class ApiClientError extends Error {
  readonly status: number;
  readonly errors?: string[];
  readonly data?: unknown;

  constructor(message: string, status: number, errors?: string[], data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
}

export function clearAdminSession() {
  localStorage.removeItem("adminToken");
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip automatic redirect on 401 (e.g. during token validation). */
  silentAuth?: boolean;
}

export async function adminFetch<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, silentAuth, ...rest } = options;
  const token = getAdminToken();

  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !silentAuth) {
    clearAdminSession();
    // Hard redirect: this module lives outside React's router context and
    // must evict all cached admin state on session expiry.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
    throw new ApiClientError("Session expired", 401);
  }

  let payload: { success?: boolean; message?: string; data?: T; errors?: string[] };
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      "Unexpected server response",
      response.status
    );
  }

  // CSV export responses are not JSON-enveloped.
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload
  ) {
    if (!payload.success) {
      throw new ApiClientError(
        payload.message || "Request failed",
        response.status,
        payload.errors,
        payload.data
      );
    }
    return payload.data as T;
  }

  return payload as T;
}

/** Downloads a protected file via fetch so auth headers can be attached. */
export async function downloadFile(url: string, fallbackName: string) {
  const token = getAdminToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = "Download failed";
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch {
      /* not JSON */
    }
    throw new ApiClientError(message, response.status);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = match?.[1] ?? fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
