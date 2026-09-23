import { apiRequest } from "@/api/client";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  user_id: string | null;
  created_at: string;
};

export type ContactMessagesResponse = {
  messages: ContactMessage[];
  newCount: number;
};

export async function getContactMessages(opts?: {
  status?: "new" | "read" | "all";
  limit?: number;
}) {
  return apiRequest<ContactMessagesResponse>("admin", "contactMessages", {
    query: {
      status: opts?.status || "all",
      limit: opts?.limit ?? 30,
    },
  });
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessage["status"],
) {
  return apiRequest<{ success: boolean; message: ContactMessage }>(
    "admin",
    "updateContactMessage",
    { body: { id, status } },
  );
}
