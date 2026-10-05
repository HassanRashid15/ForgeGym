import { apiRequest } from "@/api/client";

export type GymClass = {
  id: string;
  name?: string;
  [key: string]: unknown;
};

/** classes.list → GET /api/classes */
export async function listClasses(gymOwnerId?: string) {
  return apiRequest<{ classes: GymClass[] }>("classes", "list", {
    query: gymOwnerId ? { gymOwnerId } : undefined,
  });
}

/** classes.create → POST /api/classes */
export async function createClass(body: Record<string, unknown>) {
  return apiRequest<{ class?: GymClass; success?: boolean }>("classes", "create", {
    body,
  });
}

/** classes.createSession → POST /api/classes/sessions */
export async function createClassSession(body: Record<string, unknown>) {
  return apiRequest<{ session?: Record<string, unknown>; success?: boolean }>(
    "classes",
    "createSession",
    { body },
  );
}

/** classes.updateSession → PUT /api/classes/sessions (book) */
export async function bookClassSession(sessionId: string) {
  return apiRequest<{ success?: boolean }>("classes", "updateSession", {
    body: { sessionId },
  });
}
