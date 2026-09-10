export type UserRole = 'admin' | 'customer' | 'moderator' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  /** Platform super admin — can approve gym-owner admins */
  isSuperAdmin?: boolean;
}

export type RegisterAccountType = "admin" | "customer";

export interface FitnessProfileData {
  phone?: string;
  address?: string;
  emergency_contact?: string;
  date_of_birth?: string;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  activity_level?: string;
  fitness_goal?: string;
  experience_level?: string;
  target_areas?: string[];
  workout_days_per_week?: number;
  workout_duration?: string;
  workout_type?: string;
  preferred_workout_time?: string;
  /** Stored in auth metadata as requested_role for the signup trigger */
  requested_role?: "admin" | "user";
  /** Gym owner fields (admin registration steps 2–3) */
  gym_name?: string;
  gym_type?: string;
  gym_city?: string;
  gym_years_operating?: string;
  gym_facilities?: string[];
  gym_operating_days?: number;
  gym_peak_hours?: string;
  gym_member_capacity?: string;
  gym_services?: string[];
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    fitnessData?: FitnessProfileData
  ) => Promise<string | null>;
  updateFitnessProfile: (userId: string, data: FitnessProfileData) => Promise<void>;
  checkAccountExists: (email: string) => Promise<boolean | null>;
  checkEmailVerified: (email: string) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

