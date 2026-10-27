export const queryKeys = {
  managedUsers: ["managed-users"] as const,
  pendingAdmins: ["pending-admins"] as const,
  monthlyMembers: ["monthly-members"] as const,
  platformSettings: ["platform-settings"] as const,
  ownPlatformFee: ["own-platform-fee"] as const,
  platformFeeConcessions: ["platform-fee-concessions"] as const,
  membershipFees: ["membership-fees"] as const,
  progress: (from: string, to: string) => ["progress", from, to] as const,
};
