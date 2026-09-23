import { apiRequest } from "@/api/client";

export type Promotion = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  is_published: boolean;
  show_on_home: boolean;
  starts_at: string | null;
  ends_at: string | null;
  email_sent_at: string | null;
  email_recipient_count: number | null;
  created_at: string;
};

export type PromotionEmailLog = {
  recipient_email: string;
  status: string;
  sent_at: string;
  error_message: string | null;
};

export async function listPublicPromotions() {
  return apiRequest<{ promotions: Promotion[] }>("promotions", "list");
}

export async function listAdminPromotions() {
  return apiRequest<{ promotions: Promotion[] }>("admin", "promotions");
}

export type PromotionEmailResult = {
  sent: number;
  skipped: number;
  mode: string;
};

export async function createAdminPromotion(body: Record<string, unknown>) {
  return apiRequest<{
    promotion?: Promotion;
    email?: PromotionEmailResult | null;
    error?: string;
  }>("admin", "createPromotion", { body });
}

export async function updateAdminPromotion(body: Record<string, unknown>) {
  return apiRequest<{
    promotion?: Promotion;
    email?: PromotionEmailResult | null;
    error?: string;
  }>("admin", "updatePromotion", { body });
}

export async function deleteAdminPromotion(id: string) {
  return apiRequest<{ success?: boolean }>("admin", "deletePromotion", {
    query: { id },
  });
}

export async function getPromotionEmailLogs(emailLogId: string) {
  return apiRequest<{ logs?: PromotionEmailLog[] }>("admin", "promotions", {
    query: { emailLogId },
  });
}

export async function uploadPromotionImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ imageUrl?: string; url?: string }>("admin", "uploadPromotion", {
    body: form,
    timeoutMs: 60_000,
  });
}
