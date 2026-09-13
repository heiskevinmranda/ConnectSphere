import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

/** API responses must never be stored by browsers or proxies. */
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function apiSuccess<T>(data: T, message?: string, status = 200) {
  const response: ApiResponse<T> = { success: true, data };
  if (message) response.message = message;
  return NextResponse.json(response, { status, headers: NO_STORE_HEADERS });
}

export function apiError(message: string, status = 500, errors?: string[]) {
  const response: ApiResponse = { success: false, message };
  if (errors) response.errors = errors;
  return NextResponse.json(response, { status, headers: NO_STORE_HEADERS });
}

export function apiNotFound(message = "Resource not found") {
  return apiError(message, 404);
}

export function apiUnauthorized(message = "Access denied. No token provided.") {
  return apiError(message, 401);
}

export function apiForbidden(message = "Access denied. Admin privileges required.") {
  return apiError(message, 403);
}

export function apiBadRequest(message: string, errors?: string[]) {
  return apiError(message, 400, errors);
}

export function apiConflict(message: string) {
  return apiError(message, 409);
}
