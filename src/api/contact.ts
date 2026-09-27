import { apiRequest } from "@/api/client";
import type { SiteContactInfo } from "@/lib/site-contact";

export type ContactRecipientOption = {
  id: string;
  type: "superadmin" | "gym_admin";
  label: string;
  gymName?: string;
  ownerName?: string;
};

export type ContactInfoResponse = {
  contact: SiteContactInfo;
  recipients?: ContactRecipientOption[];
};

export type SubmitContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /** "superadmin" or a gym owner user id */
  recipientId: string;
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
