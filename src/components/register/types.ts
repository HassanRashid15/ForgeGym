export type AccountType = "customer" | "admin" | "platform_member";
/** Unset until the user picks a role on step 1. */
export type AccountTypeOrEmpty = AccountType | "";

export type PublicGym = {
  ownerId: string;
  gymName: string;
  gymType?: string | null;
  gymCity?: string | null;
  monthlyFee?: string | null;
  trainerFee?: string | null;
};

export type RegisterStep1Errors = {
  accountType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  password?: string;
  confirmPassword?: string;
  gymOwnerId?: string;
};
