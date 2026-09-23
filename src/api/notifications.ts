import { apiRequest } from "@/api/client";

export async function listNotifications(
  query: Record<string, string | number | boolean | null | undefined> = {
    limit: 50,
  },
) {
  return apiRequest<Record<string, unknown>>("notifications", "list", { query });
}

export async function markAllNotificationsRead() {
  return apiRequest<{ success?: boolean }>("notifications", "markAll", {
    body: { action: "mark_all_read" },
  });
}

export async function updateNotification(
  id: string,
  action: "mark_read" | "dismiss",
) {
  return apiRequest<{ success?: boolean }>("notifications", "updateOne", {
    pathParams: { id },
    body: { action },
  });
}

export async function deleteNotification(id: string) {
  return apiRequest<{ success?: boolean }>("notifications", "deleteOne", {
    pathParams: { id },
  });
}
