import { apiRequest } from "@/api/client";

/** dev.testNotifications → POST /api/test-notifications */
export async function sendTestNotifications(body?: Record<string, unknown>) {
  return apiRequest<{ success?: boolean }>("dev", "testNotifications", {
    body: body || {},
  });
}
