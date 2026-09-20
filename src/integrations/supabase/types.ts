export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          gym_type: string | null
          city: string | null
          facilities: string[] | null
          services: string[] | null
          peak_hours: string | null
          member_capacity: string | null
          years_operating: string | null
          operating_days: number | null
          bio: string | null
          avatar_url: string | null
          owner_display_name: string | null
          is_published: boolean
          main_image_url: string | null
          optional_images_urls: string[] | null
          video_url: string | null
          video_file_url: string | null
          monthly_fee: string | null
          trainer_fee: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          gym_type?: string | null
          city?: string | null
          facilities?: string[] | null
          services?: string[] | null
          peak_hours?: string | null
          member_capacity?: string | null
          years_operating?: string | null
          operating_days?: number | null
          bio?: string | null
          avatar_url?: string | null
          owner_display_name?: string | null
          is_published?: boolean
          main_image_url?: string | null
          optional_images_urls?: string[] | null
          video_url?: string | null
          video_file_url?: string | null
          monthly_fee?: string | null
          trainer_fee?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          name?: string
          gym_type?: string | null
          city?: string | null
          facilities?: string[] | null
          services?: string[] | null
          peak_hours?: string | null
          member_capacity?: string | null
          years_operating?: string | null
          operating_days?: number | null
          bio?: string | null
          avatar_url?: string | null
          owner_display_name?: string | null
          is_published?: boolean
          main_image_url?: string | null
          optional_images_urls?: string[] | null
          video_url?: string | null
          video_file_url?: string | null
          monthly_fee?: string | null
          trainer_fee?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_checkins: {
        Row: {
          id: string
          gym_owner_id: string
          user_id: string
          checked_in_at: string
          checked_out_at: string | null
          slot: string
          gender: string | null
          role: string | null
          full_name: string | null
          source: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          gym_owner_id: string
          user_id: string
          checked_in_at?: string
          checked_out_at?: string | null
          slot: string
          gender?: string | null
          role?: string | null
          full_name?: string | null
          source?: string
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          gym_owner_id?: string
          user_id?: string
          checked_in_at?: string
          checked_out_at?: string | null
          slot?: string
          gender?: string | null
          role?: string | null
          full_name?: string | null
          source?: string
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          member_id: string | null
          recorded_by: string | null
          transaction_date: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
          recorded_by?: string | null
          transaction_date?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
          recorded_by?: string | null
          transaction_date?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_equipment: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          maintenance_date: string | null
          name: string
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          maintenance_date?: string | null
          name: string
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          maintenance_date?: string | null
          name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          membership_end: string | null
          membership_start: string | null
          membership_status: string | null
          membership_type: string | null
          monthly_fee: number | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          membership_end?: string | null
          membership_start?: string | null
          membership_status?: string | null
          membership_type?: string | null
          monthly_fee?: number | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          membership_end?: string | null
          membership_start?: string | null
          membership_status?: string | null
          membership_type?: string | null
          monthly_fee?: number | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          join_date: string | null
          membership_status: string | null
          membership_type: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          address: string | null
          date_of_birth: string | null
          gender: string | null
          weight_kg: number | null
          height_cm: number | null
          bmi: number | null
          activity_level: string | null
          fitness_goal: string | null
          experience_level: string | null
          target_areas: string[] | null
          workout_days_per_week: number | null
          workout_duration: string | null
          workout_type: string | null
          preferred_workout_time: string | null
          bio: string | null
          emergency_contact: string | null
          avatar_url: string | null
          admin_approved: boolean
          is_super_admin: boolean
          admin_rejected_at: string | null
          approval_requested_at: string | null
          is_verified: boolean | null
          gym_name: string | null
          gym_type: string | null
          gym_city: string | null
          gym_years_operating: string | null
          gym_facilities: string[] | null
          gym_operating_days: number | null
          gym_peak_hours: string | null
          gym_member_capacity: string | null
          gym_services: string[] | null
          gym_main_image_url: string | null
          gym_optional_images_urls: string[] | null
          gym_video_url: string | null
          gym_video_file_url: string | null
          gym_monthly_fee: string | null
          gym_trainer_fee: string | null
          gym_latitude: number | null
          gym_longitude: number | null
          preferred_trainer_id: string | null
          pending_trainer_id: string | null
          trainer_request_pending: boolean
          fee_concession: string | null
          platform_monthly_fee: string | null
          trial_offered: boolean | null
          trial_starts_at: string | null
          trial_ends_at: string | null
          specialization: string | null
          certifications: string[] | null
          certification_number: string | null
          years_experience: string | null
          education: string | null
          skills: string[] | null
          languages: string[] | null
          trainer_bio: string | null
          instagram_url: string | null
          facebook_url: string | null
          twitter_url: string | null
          youtube_url: string | null
          tiktok_url: string | null
          employment_type: string | null
          branch_department: string | null
          salary: string | null
          commission_percentage: number | null
          working_days: string | null
          working_hours: string | null
          max_client_capacity: string | null
          assigned_members: string[] | null
          availability: string | null
          pt_sessions: string | null
          leave_info: string | null
          system_permissions: string[] | null
          account_status: string | null
          gym_owner_id: string | null
          staff_type: string | null
          department: string | null
          supervisor: string | null
          shift: string | null
          overtime_rate: string | null
          responsibilities: string | null
          login_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          join_date?: string | null
          membership_status?: string | null
          membership_type?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          address?: string | null
          date_of_birth?: string | null
          gender?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          bmi?: number | null
          activity_level?: string | null
          fitness_goal?: string | null
          experience_level?: string | null
          target_areas?: string[] | null
          workout_days_per_week?: number | null
          workout_duration?: string | null
          workout_type?: string | null
          preferred_workout_time?: string | null
          bio?: string | null
          emergency_contact?: string | null
          avatar_url?: string | null
          admin_approved?: boolean
          is_super_admin?: boolean
          admin_rejected_at?: string | null
          approval_requested_at?: string | null
          is_verified?: boolean | null
          gym_name?: string | null
          gym_type?: string | null
          gym_city?: string | null
          gym_years_operating?: string | null
          gym_facilities?: string[] | null
          gym_operating_days?: number | null
          gym_peak_hours?: string | null
          gym_member_capacity?: string | null
          gym_services?: string[] | null
          gym_main_image_url?: string | null
          gym_optional_images_urls?: string[] | null
          gym_video_url?: string | null
          gym_video_file_url?: string | null
          gym_monthly_fee?: string | null
          gym_trainer_fee?: string | null
          gym_latitude?: number | null
          gym_longitude?: number | null
          preferred_trainer_id?: string | null
          pending_trainer_id?: string | null
          trainer_request_pending?: boolean
          fee_concession?: string | null
          platform_monthly_fee?: string | null
          trial_offered?: boolean | null
          trial_starts_at?: string | null
          trial_ends_at?: string | null
          specialization?: string | null
          certifications?: string[] | null
          certification_number?: string | null
          years_experience?: string | null
          education?: string | null
          skills?: string[] | null
          languages?: string[] | null
          trainer_bio?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          twitter_url?: string | null
          youtube_url?: string | null
          tiktok_url?: string | null
          employment_type?: string | null
          branch_department?: string | null
          salary?: string | null
          commission_percentage?: number | null
          working_days?: string | null
          working_hours?: string | null
          max_client_capacity?: string | null
          assigned_members?: string[] | null
          availability?: string | null
          pt_sessions?: string | null
          leave_info?: string | null
          system_permissions?: string[] | null
          account_status?: string | null
          gym_owner_id?: string | null
          staff_type?: string | null
          department?: string | null
          supervisor?: string | null
          shift?: string | null
          overtime_rate?: string | null
          responsibilities?: string | null
          login_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          join_date?: string | null
          membership_status?: string | null
          membership_type?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          address?: string | null
          date_of_birth?: string | null
          gender?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          bmi?: number | null
          activity_level?: string | null
          fitness_goal?: string | null
          experience_level?: string | null
          target_areas?: string[] | null
          workout_days_per_week?: number | null
          workout_duration?: string | null
          workout_type?: string | null
          preferred_workout_time?: string | null
          bio?: string | null
          emergency_contact?: string | null
          avatar_url?: string | null
          admin_approved?: boolean
          is_super_admin?: boolean
          admin_rejected_at?: string | null
          approval_requested_at?: string | null
          is_verified?: boolean | null
          gym_name?: string | null
          gym_type?: string | null
          gym_city?: string | null
          gym_years_operating?: string | null
          gym_facilities?: string[] | null
          gym_operating_days?: number | null
          gym_peak_hours?: string | null
          gym_member_capacity?: string | null
          gym_services?: string[] | null
          gym_main_image_url?: string | null
          gym_optional_images_urls?: string[] | null
          gym_video_url?: string | null
          gym_video_file_url?: string | null
          gym_monthly_fee?: string | null
          gym_trainer_fee?: string | null
          gym_latitude?: number | null
          gym_longitude?: number | null
          preferred_trainer_id?: string | null
          pending_trainer_id?: string | null
          trainer_request_pending?: boolean
          fee_concession?: string | null
          platform_monthly_fee?: string | null
          trial_offered?: boolean | null
          trial_starts_at?: string | null
          trial_ends_at?: string | null
          specialization?: string | null
          certifications?: string[] | null
          certification_number?: string | null
          years_experience?: string | null
          education?: string | null
          skills?: string[] | null
          languages?: string[] | null
          trainer_bio?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          twitter_url?: string | null
          youtube_url?: string | null
          tiktok_url?: string | null
          employment_type?: string | null
          branch_department?: string | null
          salary?: string | null
          commission_percentage?: number | null
          working_days?: string | null
          working_hours?: string | null
          max_client_capacity?: string | null
          assigned_members?: string[] | null
          availability?: string | null
          pt_sessions?: string | null
          leave_info?: string | null
          system_permissions?: string[] | null
          account_status?: string | null
          gym_owner_id?: string | null
          staff_type?: string | null
          department?: string | null
          supervisor?: string | null
          shift?: string | null
          overtime_rate?: string | null
          responsibilities?: string | null
          login_enabled?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          metadata: Json
          unread: boolean
          dismissed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          metadata?: Json
          unread?: boolean
          dismissed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          metadata?: Json
          unread?: boolean
          dismissed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          id: string
          recipient_user_id: string
          type: string
          title: string
          message: string
          from_user_id: string | null
          unread: boolean
          dismissed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipient_user_id: string
          type: string
          title: string
          message: string
          from_user_id?: string | null
          unread?: boolean
          dismissed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipient_user_id?: string
          type?: string
          title?: string
          message?: string
          from_user_id?: string | null
          unread?: boolean
          dismissed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_days: {
        Row: {
          id: string
          user_id: string
          day_date: string
          focus: string
          notes: string | null
          duration_minutes: number | null
          calories: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_date: string
          focus?: string
          notes?: string | null
          duration_minutes?: number | null
          calories?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_date?: string
          focus?: string
          notes?: string | null
          duration_minutes?: number | null
          calories?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          id: string
          workout_day_id: string
          user_id: string
          exercise_name: string
          sets: number
          reps: number
          weight: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_day_id: string
          user_id: string
          exercise_name: string
          sets?: number
          reps?: number
          weight?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workout_day_id?: string
          user_id?: string
          exercise_name?: string
          sets?: number
          reps?: number
          weight?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          id: string
          user_id: string
          exercise_name: string
          value: string
          unit: string
          improvement: string | null
          achieved_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_name: string
          value: string
          unit?: string
          improvement?: string | null
          achieved_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_name?: string
          value?: string
          unit?: string
          improvement?: string | null
          achieved_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "trainer" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "trainer", "staff"],
    },
  },
} as const
