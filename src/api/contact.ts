import { apiRequest } from "@/api/client";
import type { SiteContactInfo } from "@/lib/site-contact";

export type ContactInfoResponse = {
  contact: SiteContactInfo;
};

export type SubmitContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export type SubmitContactResponse = {
  success: boolean;
  id?: string;
  message: string;
};

export async function getContactInfo() {
  return apiRequest<ContactInfoResponse>("contact", "get");
}

export async function submitContactMessage(payload: SubmitContactPayload) {
  return apiRequest<SubmitContactResponse>("contact", "submit", {
    body: payload,
  });
}
