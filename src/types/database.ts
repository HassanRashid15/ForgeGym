/**
 * Supabase Database Types
 * TypeScript types for Supabase tables to replace `any` casts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type PublicTablesRaw = {
      profiles: {
        Row: {
          /** Allow columns present in DB but not yet listed here. */
          [key: string]: Json | undefined;
          user_id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          address: string | null;
          emergency_contact: string | null;
          bio: string | null;
          avatar_url: string | null;
          dashboard_hero_url: string | null;
          date_of_birth: string | null;
          gender: string | null;
          weight_kg: number | null;
          height_cm: number | null;
          bmi: number | null;
          activity_level: string | null;
          fitness_goal: string | null;
          experience_level: string | null;
          target_areas: string[] | null;
          workout_days_per_week: number | null;
          workout_duration: string | null;
          workout_type: string | null;
          preferred_workout_time: string | null;
          /** Tenant link to gym owner auth user id. Gym attrs live on public.gyms. */
          gym_owner_id: string | null;
          feature_classes_enabled: boolean | null;
          feature_schedule_enabled: boolean | null;
          feature_membership_enabled: boolean | null;
          trial_offered: boolean | null;
          trial_starts_at: string | null;
          trial_ends_at: string | null;
          membership_trial_starts_at: string | null;
          membership_trial_ends_at: string | null;
          admin_approved: boolean | null;
          admin_rejected_at: string | null;
          approval_requested_at: string | null;
          is_verified: boolean | null;
          is_super_admin: boolean | null;
          is_visitor: boolean | null;
          is_frozen: boolean | null;
          frozen_until: string | null;
          freeze_reason: string | null;
          membership_status: string | null;
          membership_type: string | null;
          account_status: string | null;
          platform_fee_status: string | null;
          platform_fee_concession_amount: string | null;
          platform_fee_concession_note: string | null;
          platform_fee_responded_at: string | null;
          specialization: string | null;
          trainer_bio: string | null;
          years_experience: number | null;
          certifications: string[] | null;
          skills: string[] | null;
          instagram_url: string | null;
          working_hours: string | null;
          working_days: string | null;
          platform_monthly_fee: string | null;
          gym_monthly_fee: string | null;
          join_date: string | null;
          languages: string[] | null;
          login_enabled: boolean | null;
          preferred_trainer_id: string | null;
          salary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          [key: string]: Json | undefined;
          user_id: string;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          address?: string | null;
          emergency_contact?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          dashboard_hero_url?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          bmi?: number | null;
          activity_level?: string | null;
          fitness_goal?: string | null;
          experience_level?: string | null;
          target_areas?: string[] | null;
          workout_days_per_week?: number | null;
          workout_duration?: string | null;
          workout_type?: string | null;
          preferred_workout_time?: string | null;
          gym_owner_id?: string | null;
          feature_classes_enabled?: boolean | null;
          feature_schedule_enabled?: boolean | null;
          feature_membership_enabled?: boolean | null;
          trial_offered?: boolean | null;
          trial_starts_at?: string | null;
          trial_ends_at?: string | null;
          membership_trial_starts_at?: string | null;
          membership_trial_ends_at?: string | null;
          admin_approved?: boolean | null;
          admin_rejected_at?: string | null;
          approval_requested_at?: string | null;
          is_verified?: boolean | null;
          is_super_admin?: boolean | null;
          is_visitor?: boolean | null;
          is_frozen?: boolean | null;
          frozen_until?: string | null;
          freeze_reason?: string | null;
          membership_status?: string | null;
          membership_type?: string | null;
          account_status?: string | null;
          platform_fee_status?: string | null;
          platform_fee_concession_amount?: string | null;
          platform_fee_concession_note?: string | null;
          platform_fee_responded_at?: string | null;
          specialization?: string | null;
          trainer_bio?: string | null;
          years_experience?: number | null;
          certifications?: string[] | null;
          skills?: string[] | null;
          instagram_url?: string | null;
          working_hours?: string | null;
          working_days?: string | null;
          platform_monthly_fee?: string | null;
          gym_monthly_fee?: string | null;
          join_date?: string | null;
          languages?: string[] | null;
          login_enabled?: boolean | null;
          preferred_trainer_id?: string | null;
          salary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          [key: string]: Json | undefined;
          user_id?: string;
          full_name?: string | null;
          email?: string;
          phone?: string | null;
          address?: string | null;
          emergency_contact?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          dashboard_hero_url?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          bmi?: number | null;
          activity_level?: string | null;
          fitness_goal?: string | null;
          experience_level?: string | null;
          target_areas?: string[] | null;
          workout_days_per_week?: number | null;
          workout_duration?: string | null;
          workout_type?: string | null;
          preferred_workout_time?: string | null;
          gym_owner_id?: string | null;
          feature_classes_enabled?: boolean | null;
          feature_schedule_enabled?: boolean | null;
          feature_membership_enabled?: boolean | null;
          trial_offered?: boolean | null;
          trial_starts_at?: string | null;
          trial_ends_at?: string | null;
          membership_trial_starts_at?: string | null;
          membership_trial_ends_at?: string | null;
          admin_approved?: boolean | null;
          admin_rejected_at?: string | null;
          approval_requested_at?: string | null;
          is_verified?: boolean | null;
          is_super_admin?: boolean | null;
          is_visitor?: boolean | null;
          is_frozen?: boolean | null;
          frozen_until?: string | null;
          freeze_reason?: string | null;
          membership_status?: string | null;
          membership_type?: string | null;
          account_status?: string | null;
          platform_fee_status?: string | null;
          platform_fee_concession_amount?: string | null;
          platform_fee_concession_note?: string | null;
          platform_fee_responded_at?: string | null;
          specialization?: string | null;
          trainer_bio?: string | null;
          years_experience?: number | null;
          certifications?: string[] | null;
          skills?: string[] | null;
          instagram_url?: string | null;
          working_hours?: string | null;
          working_days?: string | null;
          platform_monthly_fee?: string | null;
          gym_monthly_fee?: string | null;
          join_date?: string | null;
          languages?: string[] | null;
          login_enabled?: boolean | null;
          preferred_trainer_id?: string | null;
          salary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** Canonical gym catalog — source of truth for gym attributes. */
      gyms: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          gym_type: string | null;
          city: string | null;
          facilities: string[] | null;
          services: string[] | null;
          peak_hours: string | null;
          member_capacity: string | null;
          years_operating: string | null;
          operating_days: number | null;
          operating_days_specific: string[] | null;
          opening_time: string | null;
          closing_time: string | null;
          bio: string | null;
          avatar_url: string | null;
          owner_display_name: string | null;
          is_published: boolean;
          main_image_url: string | null;
          optional_images_urls: string[] | null;
          video_url: string | null;
          video_file_url: string | null;
          monthly_fee: number | null;
          trainer_fee: number | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          gym_type?: string | null;
          city?: string | null;
          facilities?: string[] | null;
          services?: string[] | null;
          peak_hours?: string | null;
          member_capacity?: string | null;
          years_operating?: string | null;
          operating_days?: number | null;
          operating_days_specific?: string[] | null;
          opening_time?: string | null;
          closing_time?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          owner_display_name?: string | null;
          is_published?: boolean;
          main_image_url?: string | null;
          optional_images_urls?: string[] | null;
          video_url?: string | null;
          video_file_url?: string | null;
          monthly_fee?: number | null;
          trainer_fee?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          gym_type?: string | null;
          city?: string | null;
          facilities?: string[] | null;
          services?: string[] | null;
          peak_hours?: string | null;
          member_capacity?: string | null;
          years_operating?: string | null;
          operating_days?: number | null;
          operating_days_specific?: string[] | null;
          opening_time?: string | null;
          closing_time?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          owner_display_name?: string | null;
          is_published?: boolean;
          main_image_url?: string | null;
          optional_images_urls?: string[] | null;
          video_url?: string | null;
          video_file_url?: string | null;
          monthly_fee?: number | null;
          trainer_fee?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_notifications: {
        Row: {
          id: string;
          user_id: string;
          recipient_user_id: string | null;
          type: string;
          from_user_id: string | null;
          message: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          recipient_user_id?: string | null;
          type: string;
          from_user_id?: string | null;
          message?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient_user_id?: string | null;
          type?: string;
          from_user_id?: string | null;
          message?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          gym_owner_id: string;
          check_in_at: string;
          check_out_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gym_owner_id: string;
          check_in_at?: string;
          check_out_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gym_owner_id?: string;
          check_in_at?: string;
          check_out_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_days: {
        Row: {
          [key: string]: Json | undefined;
          id: string;
          user_id: string;
          date: string;
          day_date: string | null;
          duration_minutes: number | null;
          calories: number | null;
          focus: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          [key: string]: Json | undefined;
          id?: string;
          user_id: string;
          date?: string;
          day_date?: string | null;
          duration_minutes?: number | null;
          calories?: number | null;
          focus?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          [key: string]: Json | undefined;
          id?: string;
          user_id?: string;
          date?: string;
          day_date?: string | null;
          duration_minutes?: number | null;
          calories?: number | null;
          focus?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          workout_day_id: string;
          name: string;
          sets: number | null;
          reps: string | null;
          weight: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workout_day_id: string;
          name: string;
          sets?: number | null;
          reps?: string | null;
          weight?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workout_day_id?: string;
          name?: string;
          sets?: number | null;
          reps?: string | null;
          weight?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          exercise_name: string;
          weight: string;
          reps: number;
          date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_name: string;
          weight: string;
          reps: number;
          date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_name?: string;
          weight?: string;
          reps?: number;
          date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      gym_classes: {
        Row: {
          id: string;
          gym_owner_id: string;
          name: string;
          description: string | null;
          trainer_id: string | null;
          max_capacity: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_owner_id: string;
          name: string;
          description?: string | null;
          trainer_id?: string | null;
          max_capacity?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_owner_id?: string;
          name?: string;
          description?: string | null;
          trainer_id?: string | null;
          max_capacity?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      class_sessions: {
        Row: {
          id: string;
          class_id: string;
          scheduled_at: string;
          duration_minutes: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          scheduled_at?: string;
          duration_minutes: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          gym_owner_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          is_featured: boolean;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_owner_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          is_featured?: boolean;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_owner_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          is_featured?: boolean;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          subscribed_at: string;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string;
          is_read: boolean;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          message: string;
          is_read?: boolean;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          message?: string;
          is_read?: boolean;
          is_archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_promotions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          is_published: boolean;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          is_published?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          is_published?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: string;
          key: string | null;
          value: string | null;
          facility_fee: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key?: string | null;
          value?: string | null;
          facility_fee?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string | null;
          value?: string | null;
          facility_fee?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_traffic: {
        Row: {
          id: string;
          page: string;
          referrer: string | null;
          user_agent: string | null;
          ip_address: string | null;
          visited_at: string;
        };
        Insert: {
          id?: string;
          page: string;
          referrer?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          visited_at?: string;
        };
        Update: {
          id?: string;
          page?: string;
          referrer?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          visited_at?: string;
        };
        Relationships: [];
      };

  // --- App tables not previously listed ---
  attendance_checkins: {
    Row: {
      id: string;
      gym_owner_id: string;
      user_id: string;
      checked_in_at: string;
      checked_out_at: string | null;
      slot: string | null;
      gender: string | null;
      role: string | null;
      full_name: string | null;
      source: string | null;
      notes: string | null;
    };
    Insert: {
      id?: string;
      gym_owner_id: string;
      user_id: string;
      checked_in_at?: string;
      checked_out_at?: string | null;
      slot?: string | null;
      gender?: string | null;
      role?: string | null;
      full_name?: string | null;
      source?: string | null;
      notes?: string | null;
    };
    Update: {
      id?: string;
      gym_owner_id?: string;
      user_id?: string;
      checked_in_at?: string;
      checked_out_at?: string | null;
      slot?: string | null;
      gender?: string | null;
      role?: string | null;
      full_name?: string | null;
      source?: string | null;
      notes?: string | null;
    };
    Relationships: [];
  };
  notifications: {
    Row: {
      id: string;
      user_id: string;
      type: string;
      title: string;
      message: string;
      metadata: Json | null;
      unread: boolean;
      dismissed: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      type: string;
      title: string;
      message: string;
      metadata?: Json | null;
      unread?: boolean;
      dismissed?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      type?: string;
      title?: string;
      message?: string;
      metadata?: Json | null;
      unread?: boolean;
      dismissed?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
      newsletter_subscriptions: {
    Row: {
      id: string;
      email: string;
      is_active: boolean;
      created_at: string;
      unsubscribed_at: string | null;
      unsubscribe_reason: string | null;
    };
    Insert: {
      id?: string;
      email: string;
      is_active?: boolean;
      created_at?: string;
      unsubscribed_at?: string | null;
      unsubscribe_reason?: string | null;
    };
    Update: {
      id?: string;
      email?: string;
      is_active?: boolean;
      created_at?: string;
      unsubscribed_at?: string | null;
      unsubscribe_reason?: string | null;
    };
    Relationships: [];
  };
  workout_exercises: {
    Row: {
      [key: string]: Json | undefined;
      id: string;
      workout_day_id: string;
      name: string;
      exercise_name?: string | null;
      sets: number | null;
      reps: string | null;
      weight: string | null;
      notes: string | null;
      calories?: number | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      [key: string]: Json | undefined;
      id?: string;
      workout_day_id: string;
      name: string;
      exercise_name?: string | null;
      sets?: number | null;
      reps?: string | null;
      weight?: string | null;
      notes?: string | null;
      calories?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      [key: string]: Json | undefined;
      id?: string;
      workout_day_id?: string;
      name?: string;
      exercise_name?: string | null;
      sets?: number | null;
      reps?: string | null;
      weight?: string | null;
      notes?: string | null;
      calories?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  ai_models: {
    Row: {
      [key: string]: Json | undefined;
      id: string;
      user_id: string | null;
      provider: string | null;
      model: string | null;
      enabled: boolean | null;
      is_disabled: boolean | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      [key: string]: Json | undefined;
      id?: string;
      user_id?: string | null;
      provider?: string | null;
      model?: string | null;
      enabled?: boolean | null;
      is_disabled?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      [key: string]: Json | undefined;
      id?: string;
      user_id?: string | null;
      provider?: string | null;
      model?: string | null;
      enabled?: boolean | null;
      is_disabled?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: PublicTablesRaw;
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_user_exists: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      sync_my_signup_profile: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      cleanup_expired_subscriptions: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      get_newsletter_subscriptions: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      unsubscribe_from_newsletter: {
        Args: { p_email: string };
        Returns: unknown;
      };
      subscribe_to_newsletter: {
        Args: { p_email: string };
        Returns: unknown;
      };
      set_newsletter_preference: {
        Args: {
          p_email: string;
          p_subscribe: boolean;
          p_reason?: string;
        };
        Returns: unknown;
      };
      check_newsletter_subscription: {
        Args: { p_email: string };
        Returns: unknown;
      };
      check_user_verified: {
        Args: { user_email: string };
        Returns: boolean | unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
