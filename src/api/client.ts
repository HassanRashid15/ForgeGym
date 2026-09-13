import { supabase } from "@/integrations/supabase/client";
import endpoints from "@/api/endpoints.json";

export type ApiEndpoint = {
  method: string;
  path: string;
  description?: string;
};

export type EndpointsConfig = typeof endpoints;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function getAccessToken(): Promise<string | null> {
  // 1. Read directly from Supabase localStorage key (avoids auth lock hangs)
  try {
    if (typeof window !== "undefined") {
      const storageKey = Object.keys(window.localStorage).find(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
      );
      if (storageKey) {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const token =
            parsed?.access_token ||
            parsed?.currentSession?.access_token ||
            parsed?.session?.access_token;
          if (typeof token === "string" && token.length > 20) {
            return token;
          }
        }
      }
    }
  } catch {
    // fall through
  }

  // 2. Official session API (short-circuit — never hang forever)
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (result && "data" in result && result.data.session?.access_token) {
      return result.data.session.access_token;
    }
  } catch {
    // fall through
  }

  return null;
}

/** Resolve an endpoint definition from endpoints.json */
export function getEndpoint(
  group: keyof EndpointsConfig,
  action: string,
): ApiEndpoint {
  const groupConfig = endpoints[group] as Record<string, ApiEndpoint> | undefined;
  const endpoint = groupConfig?.[action];

  if (!endpoint?.path || !endpoint?.method) {
    throw new ApiError(`Unknown API endpoint: ${String(group)}.${action}`, 500);
  }

  return endpoint;
}

/**
 * Call a Next.js API route defined in endpoints.json.
 * Frontend pages should only use this layer — not Supabase tables directly.
 */
export async function apiRequest<T>(
  group: keyof EndpointsConfig,
  action: string,
  options: {
    body?: unknown;
    query?: Record<string, string | number | boolean | null | undefined>;
    headers?: HeadersInit;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const endpoint = getEndpoint(group, action);
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  // Protected profile endpoints must have a token
  const requiresAuth =
    group === "profiles" ||
    group === "admin" ||
    (group === "progress" &&
      action !== "exerciseCatalog" &&
      action !== "exerciseDemo") ||
    (group === "auth" && (action === "logout" || action === "me"));

  if (requiresAuth && !token) {
    throw new ApiError("Unauthorized — please log in again", 401);
  }

  if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let url = endpoint.path;
  if (options.query) {
    const params = new URLSearchParams();
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url = `${url}?${qs}`;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 20000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        payload?.error || payload?.message || "Request failed",
        response.status,
        payload,
      );
    }

    return payload as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export { endpoints };
