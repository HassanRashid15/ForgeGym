export type AccountType = "customer" | "admin";

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
  address?: string;
  password?: string;
  confirmPassword?: string;
  gymOwnerId?: string;
};
