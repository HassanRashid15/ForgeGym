export type UserRole = 'admin' | 'customer' | 'moderator' | 'user' | 'trainer' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  /** Platform super admin — can approve gym-owner admins */
  isSuperAdmin?: boolean;
  /** Gym brand name from profiles.gym_name / gyms catalog */
  gymName?: string | null;
  gymOwnerId?: string | null;
  gymCity?: string | null;
  gymType?: string | null;
  gymMainImageUrl?: string | null;
  membershipStatus?: string | null;
  membershipType?: string | null;
  /** Gym-owner free trial (set after superadmin approval) */
  trial?: {
    offered: boolean;
    status: "pending_approval" | "active" | "expired" | "none";
    startsAt: string | null;
    endsAt: string | null;
    daysLeft: number | null;
    label: string;
  } | null;
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
  /** Customer joins this gym (owner's user_id) */
  gym_owner_id?: string;
  /** Optional preferred trainer at the selected gym */
  preferred_trainer_id?: string;
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
  gym_main_image_url?: string;
  gym_optional_images_urls?: string[];
  gym_video_url?: string;
  gym_video_file_url?: string;
  /** Monthly membership fee (admin gym registration) */
  gym_monthly_fee?: string;
  /** Personal trainer fee (admin gym registration) */
  gym_trainer_fee?: string;
}

export type RegisterMediaFiles = {
  logo?: File | null;
  mainImage?: File | null;
  optionalImages?: File[];
  videoFile?: File | null;
};

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    fitnessData?: FitnessProfileData,
    media?: RegisterMediaFiles,
  ) => Promise<string | null>;
  updateFitnessProfile: (userId: string, data: FitnessProfileData) => Promise<void>;
  checkAccountExists: (email: string) => Promise<boolean | null>;
  checkEmailVerified: (email: string) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<void>;
  logout: () => void | Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

