export const queryKeys = {
  managedUsers: ["managed-users"] as const,
  pendingAdmins: ["pending-admins"] as const,
  monthlyMembers: ["monthly-members"] as const,
  progress: (from: string, to: string) => ["progress", from, to] as const,
};
