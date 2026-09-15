"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyProfile, getMyProfile, updateMyProfile, uploadMyAvatar } from "@/api/profiles";
import type { ProfileRecord } from "@/api/profiles";
import { getNameInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import { ProfileSettingsTab } from "@/components/profile/ProfileSettingsTab";
import { GymMediaSection } from "@/components/profile/GymMediaSection";
import { CustomerTrainerFeeCard } from "@/components/customer/CustomerTrainerFeeCard";
import { formatCombinedFee } from "@/lib/fees";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Save, 
  Camera,
  Shield,
  Target,
  Dumbbell,
  Flame,
  Loader2,
  Sparkles,
  Building2,
  Image as ImageIcon,
  Wallet,
} from "lucide-react";

interface DatabaseProfile extends ProfileRecord {}

function displayValue(value: string | number | null | undefined, fallback = "Not specified") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function ProfilePage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [authChecked, setAuthChecked] = useState(true); // Always true since layout handles auth

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    dateOfBirth: "",
    gender: "",
    weightKg: "",
    heightFt: "",
    activityLevel: "",
    fitnessGoal: "",
    experienceLevel: "",
    targetAreas: [] as string[],
    workoutDays: "",
    workoutDuration: "",
    workoutType: "",
    preferredTime: "",
    emergencyContact: "",
    membershipStatus: "active",
    membershipType: "basic",
    joinDate: "",
    avatarUrl: "",
    gymName: "",
    gymType: "",
    gymCity: "",
    gymYearsOperating: "",
    gymFacilities: [] as string[],
    gymOperatingDays: "",
    gymPeakHours: "",
    gymMemberCapacity: "",
    gymServices: [] as string[],
    gymMainImageUrl: "",
    gymOptionalImagesUrls: [] as string[],
    gymVideoUrl: "",
    gymVideoFileUrl: "",
    gymMonthlyFee: "",
    gymTrainerFee: "",
    adminApproved: false,
    isSuperAdmin: false,
    approvalRequestedAt: "",
    adminRejectedAt: "",
    isVerified: false,
    gymOwnerId: "",
    preferredTrainerId: "",
    preferredTrainerName: "",
    associatedGymMonthlyFee: "",
    associatedGymTrainerFee: "",
  });

  const [initialData, setInitialData] = useState<typeof profileData | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const allowed = isAdmin
      ? ["profile", "gym", "account", "settings"]
      : ["profile", "fitness", "membership", "settings"];
    if (allowed.includes(tab)) setActiveTab(tab);
  }, [searchParams, isAdmin]);

  // Load profile once per user id — do not re-fetch when name/email sync updates
  // (that was resetting the page into a full-screen spinner while editing)
  useEffect(() => {
    let isSubscribed = true;

    const safetyTimer = setTimeout(() => {
      if (isSubscribed) setIsLoading(false);
    }, 8000);

    async function loadUserProfile() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let dbProfile: DatabaseProfile | null = null;

        try {
          const { profile } = await getMyProfile();
          dbProfile = profile;
        } catch (fetchErr) {
          console.warn("Could not fetch profile via API:", fetchErr);
        }

        if (!dbProfile) {
          const fallbackName = user.name || user.email?.split("@")[0] || "Member";
          try {
            const { profile } = await ensureMyProfile({ full_name: fallbackName });
            dbProfile = profile;
          } catch (createErr) {
            console.warn("Could not auto-create default profile row:", createErr);
          }
        }

        if (!isSubscribed) return;

        const meta = (user as any)?.user_metadata || {};

        const mapped = {
          fullName: dbProfile?.full_name || user.name || meta.full_name || "",
          email: dbProfile?.email || user.email || "",
          phone: dbProfile?.phone || meta.phone || "",
          address: dbProfile?.address || "",
          bio: dbProfile?.bio || meta.bio || (isAdmin ? "" : "Fitness enthusiast building strength and consistency."),
          dateOfBirth: dbProfile?.date_of_birth || meta.date_of_birth || "",
          gender: dbProfile?.gender || meta.gender || "",
          weightKg: dbProfile?.weight_kg ? String(dbProfile.weight_kg) : (meta.weight_kg ? String(meta.weight_kg) : ""),
          // DB stores cm — show feet in the UI (1 ft = 30.48 cm)
          heightFt: (() => {
            const cm = dbProfile?.height_cm ?? (meta.height_cm ? parseFloat(meta.height_cm) : NaN);
            if (!cm || isNaN(Number(cm))) return "";
            return (Number(cm) / 30.48).toFixed(2).replace(/\.?0+$/, "");
          })(),
          activityLevel: dbProfile?.activity_level || meta.activity_level || (isAdmin ? "" : "Moderately Active"),
          fitnessGoal: dbProfile?.fitness_goal || meta.fitness_goal || (isAdmin ? "" : "General Fitness"),
          experienceLevel: dbProfile?.experience_level || meta.experience_level || (isAdmin ? "" : "Intermediate"),
          targetAreas: Array.isArray(dbProfile?.target_areas) && dbProfile.target_areas.length > 0
            ? dbProfile.target_areas
            : (Array.isArray(meta.target_areas) ? meta.target_areas : (isAdmin ? [] : ["Full Body"])),
          workoutDays: dbProfile?.workout_days_per_week ? String(dbProfile.workout_days_per_week) : (meta.workout_days_per_week ? String(meta.workout_days_per_week) : (isAdmin ? "" : "4")),
          workoutDuration: dbProfile?.workout_duration || meta.workout_duration || (isAdmin ? "" : "45 min"),
          workoutType: dbProfile?.workout_type || meta.workout_type || (isAdmin ? "" : "Weights"),
          preferredTime: dbProfile?.preferred_workout_time || meta.preferred_workout_time || (isAdmin ? "" : "Morning"),
          emergencyContact: dbProfile?.emergency_contact || meta.emergency_contact || "",
          membershipStatus: dbProfile?.membership_status || "active",
          membershipType: dbProfile?.membership_type || "basic",
          joinDate: dbProfile?.join_date || new Date().toISOString(),
          avatarUrl: dbProfile?.avatar_url || "",
          gymOwnerId: dbProfile?.gym_owner_id || meta.gym_owner_id || "",
          gymName: dbProfile?.gym_name || meta.gym_name || "",
          gymType: dbProfile?.gym_type || meta.gym_type || "",
          gymCity: dbProfile?.gym_city || meta.gym_city || "",
          gymYearsOperating: dbProfile?.gym_years_operating || meta.gym_years_operating || "",
          gymFacilities: Array.isArray(dbProfile?.gym_facilities)
            ? dbProfile.gym_facilities
            : (Array.isArray(meta.gym_facilities) ? meta.gym_facilities : []),
          gymOperatingDays: dbProfile?.gym_operating_days != null
            ? String(dbProfile.gym_operating_days)
            : (meta.gym_operating_days != null ? String(meta.gym_operating_days) : ""),
          gymPeakHours: dbProfile?.gym_peak_hours || meta.gym_peak_hours || "",
          gymMemberCapacity: dbProfile?.gym_member_capacity || meta.gym_member_capacity || "",
          gymServices: Array.isArray(dbProfile?.gym_services)
            ? dbProfile.gym_services
            : (Array.isArray(meta.gym_services) ? meta.gym_services : []),
          gymMainImageUrl: dbProfile?.gym_main_image_url || meta.gym_main_image_url || "",
          gymOptionalImagesUrls: Array.isArray(dbProfile?.gym_optional_images_urls)
            ? dbProfile.gym_optional_images_urls
            : (Array.isArray(meta.gym_optional_images_urls) ? meta.gym_optional_images_urls : []),
          gymVideoUrl: dbProfile?.gym_video_url || meta.gym_video_url || "",
          gymVideoFileUrl: dbProfile?.gym_video_file_url || meta.gym_video_file_url || "",
          gymMonthlyFee: dbProfile?.gym_monthly_fee || "",
          gymTrainerFee: dbProfile?.gym_trainer_fee || "",
          adminApproved: dbProfile?.admin_approved === true,
          isSuperAdmin: dbProfile?.is_super_admin === true || isSuperAdmin === true,
          approvalRequestedAt: dbProfile?.approval_requested_at || "",
          adminRejectedAt: dbProfile?.admin_rejected_at || "",
          isVerified: dbProfile?.is_verified === true,
          preferredTrainerId: dbProfile?.preferred_trainer_id || "",
          preferredTrainerName: "",
          associatedGymMonthlyFee: "",
          associatedGymTrainerFee: "",
        };

        setProfileData(mapped);
        setInitialData(mapped);
        setAvatarPreview(dbProfile?.avatar_url || null);
        setPendingAvatarFile(null);

        const trainerId = dbProfile?.preferred_trainer_id;
        const ownerId = dbProfile?.gym_owner_id || meta.gym_owner_id;
        if (ownerId && isSubscribed) {
          try {
            const gymRes = await fetch(`/api/gyms/${encodeURIComponent(ownerId)}`);
            if (gymRes.ok) {
              const gymData = await gymRes.json().catch(() => ({}));
              const fee =
                gymData?.gym?.monthlyFee != null
                  ? String(gymData.gym.monthlyFee)
                  : "";
              const trainerFee =
                gymData?.gym?.trainerFee != null
                  ? String(gymData.gym.trainerFee)
                  : "";
              const gymLabel = gymData?.gym?.gymName
                ? String(gymData.gym.gymName)
                : "";
              const cityLabel = gymData?.gym?.gymCity
                ? String(gymData.gym.gymCity)
                : "";
              if (isSubscribed) {
                setProfileData((prev) => ({
                  ...prev,
                  associatedGymMonthlyFee: fee,
                  associatedGymTrainerFee: trainerFee,
                  gymName: prev.gymName || gymLabel,
                  gymCity: prev.gymCity || cityLabel,
                }));
                setInitialData((prev) =>
                  prev
                    ? {
                        ...prev,
                        associatedGymMonthlyFee: fee,
                        associatedGymTrainerFee: trainerFee,
                        gymName: prev.gymName || gymLabel,
                        gymCity: prev.gymCity || cityLabel,
                      }
                    : prev,
                );
              }
            }
          } catch {
            /* ignore gym fee lookup */
          }
        }
        if (trainerId && ownerId && isSubscribed) {
          try {
            const res = await fetch(`/api/gyms/${encodeURIComponent(ownerId)}/trainers`);
            const data = await res.json().catch(() => ({}));
            const trainers = Array.isArray(data?.trainers) ? data.trainers : [];
            const match = trainers.find((t: { userId?: string }) => t.userId === trainerId);
            if (match && isSubscribed) {
              const name = match.fullName
                ? `${match.fullName}${match.specialization ? ` — ${match.specialization}` : ""}`
                : "Preferred trainer";
              setProfileData((prev) => ({ ...prev, preferredTrainerName: name }));
              setInitialData((prev) =>
                prev ? { ...prev, preferredTrainerName: name } : prev,
              );
            }
          } catch {
            /* ignore trainer label lookup */
          }
        }

        if (!isAdmin && dbProfile && !dbProfile.fitness_goal && meta.fitness_goal) {
          void updateMyProfile({
            phone: meta.phone || null,
            address: meta.address || null,
            emergency_contact: meta.emergency_contact || null,
            date_of_birth: meta.date_of_birth || null,
            gender: meta.gender || null,
            weight_kg: meta.weight_kg ? parseFloat(meta.weight_kg) : null,
            height_cm: meta.height_cm ? parseFloat(meta.height_cm) : null,
            activity_level: meta.activity_level || null,
            fitness_goal: meta.fitness_goal || null,
            experience_level: meta.experience_level || null,
            target_areas: meta.target_areas || [],
            workout_days_per_week: meta.workout_days_per_week ? parseInt(meta.workout_days_per_week) : null,
            workout_duration: meta.workout_duration || null,
            workout_type: meta.workout_type || null,
            preferred_workout_time: meta.preferred_workout_time || null,
          });
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadUserProfile();

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimer);
    };
  }, [user?.id, authChecked, isAdmin, isSuperAdmin]);

  // Save changes to Supabase profiles table
  const handleSave = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to save changes");
      return;
    }

    setIsSaving(true);
    try {
      let nextAvatarUrl = profileData.avatarUrl || null;

      // Upload new avatar to Supabase Storage bucket first (if picked)
      if (pendingAvatarFile) {
        const uploaded = await uploadMyAvatar(pendingAvatarFile);
        nextAvatarUrl = uploaded.avatar_url;
      }

      const dbPayload: any = {
        full_name: profileData.fullName.trim(),
        phone: profileData.phone.trim() || null,
        address: profileData.address.trim() || null,
        emergency_contact: profileData.emergencyContact.trim() || null,
        bio: profileData.bio.trim() || null,
        avatar_url: nextAvatarUrl,
        ...(isAdmin
          ? {
              gym_name: profileData.gymName.trim() || null,
              gym_type: profileData.gymType.trim() || null,
              gym_city: profileData.gymCity.trim() || null,
              gym_years_operating: profileData.gymYearsOperating.trim() || null,
              gym_facilities: profileData.gymFacilities,
              gym_operating_days: profileData.gymOperatingDays
                ? parseInt(profileData.gymOperatingDays, 10)
                : null,
              gym_peak_hours: profileData.gymPeakHours.trim() || null,
              gym_member_capacity: profileData.gymMemberCapacity.trim() || null,
              gym_services: profileData.gymServices,
              gym_main_image_url: profileData.gymMainImageUrl || null,
              gym_optional_images_urls: profileData.gymOptionalImagesUrls || null,
              gym_video_url: profileData.gymVideoUrl || null,
              gym_video_file_url: profileData.gymVideoFileUrl || null,
              gym_monthly_fee: profileData.gymMonthlyFee.trim() || null,
              gym_trainer_fee: profileData.gymTrainerFee.trim() || null,
            }
          : {
              date_of_birth: profileData.dateOfBirth || null,
              gender: profileData.gender || null,
              weight_kg: profileData.weightKg ? parseFloat(profileData.weightKg) : null,
              height_cm: profileData.heightFt
                ? Math.round(parseFloat(profileData.heightFt) * 30.48 * 100) / 100
                : null,
              activity_level: profileData.activityLevel || null,
              fitness_goal: profileData.fitnessGoal || null,
              experience_level: profileData.experienceLevel || null,
              target_areas: profileData.targetAreas,
              workout_days_per_week: profileData.workoutDays
                ? parseInt(profileData.workoutDays)
                : null,
              workout_duration: profileData.workoutDuration || null,
              workout_type: profileData.workoutType || null,
              preferred_workout_time: profileData.preferredTime || null,
            }),
      };

      await updateMyProfile(dbPayload);

      // Non-blocking metadata sync (never hang the Save button)
      void supabase.auth
        .updateUser({
          data: {
            full_name: profileData.fullName.trim(),
            avatar_url: nextAvatarUrl,
            phone: dbPayload.phone,
            fitness_goal: dbPayload.fitness_goal,
          },
        })
        .catch(() => undefined);

      const nextData = {
        ...profileData,
        avatarUrl: nextAvatarUrl || "",
      };
      setProfileData(nextData);
      setInitialData(nextData);
      setAvatarPreview(nextAvatarUrl);
      setPendingAvatarFile(null);
      setIsEditing(false);
      toast.success("Profile saved successfully!");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      setProfileData({ ...initialData });
      setAvatarPreview(initialData.avatarUrl || null);
    }
    setPendingAvatarFile(null);
    setIsEditing(false);
  };

  const handleAvatarPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatarFile(file);
    setAvatarPreview(previewUrl);
    if (!isEditing) setIsEditing(true);
    toast.info("Preview ready — click Save Changes to upload");
  };

  // Helper calculations
  const calculateBmi = () => {
    const w = parseFloat(profileData.weightKg);
    const heightFt = parseFloat(profileData.heightFt);
    if (!w || !heightFt || isNaN(w) || isNaN(heightFt) || heightFt <= 0) return null;
    const heightM = heightFt * 0.3048;
    return (w / (heightM * heightM)).toFixed(1);
  };

  const getMembershipDays = () => {
    if (!profileData.joinDate) return 0;
    const diffTime = Math.abs(new Date().getTime() - new Date(profileData.joinDate).getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const bmiValue = calculateBmi();
  const membershipDays = getMembershipDays();

  // Show spinner while profile data is still fetching
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-background min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading profile from database…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-red-600/15 via-red-900/10 to-background border border-border/40 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/20 shadow-xl">
                <AvatarImage
                  src={avatarPreview || profileData.avatarUrl || undefined}
                  alt={profileData.fullName || user?.name}
                />
                <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary tracking-wide">
                  {getNameInitials(profileData.fullName || user?.name)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarPick}
              />
              <Button
                type="button"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-md"
                disabled={isSaving}
                onClick={() => avatarInputRef.current?.click()}
                title="Upload profile photo"
              >
                <Camera className="h-4 w-4 text-white" />
              </Button>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {profileData.fullName || user?.name || (isAdmin ? "Gym Owner" : "Fitness Member")}
              </h1>
              <p className="text-muted-foreground">{profileData.email || user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center md:justify-start">
                {isAdmin ? (
                  <>
                    <Badge className="bg-red-600 text-white">Gym Owner</Badge>
                    <Badge
                      className={
                        profileData.adminApproved
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500/90 text-white"
                      }
                    >
                      {profileData.adminApproved ? "Approved" : "Pending Approval"}
                    </Badge>
                    {profileData.isSuperAdmin && (
                      <Badge variant="outline" className="border-red-500/40 text-red-400">
                        Super Admin
                      </Badge>
                    )}
                    {profileData.gymName && (
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                        <Building2 className="h-3 w-3 mr-1 text-primary" />
                        {profileData.gymName}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <Badge className={profileData.membershipStatus === "active" ? "bg-emerald-500 text-white" : "bg-zinc-700"}>
                      {profileData.membershipStatus === "active" ? "Active Member" : profileData.membershipStatus}
                    </Badge>
                    <Badge variant="outline" className="border-red-500/40 text-red-400 capitalize">
                      {profileData.membershipType} Plan
                    </Badge>
                    {profileData.fitnessGoal && (
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                        <Target className="h-3 w-3 mr-1 text-primary" />
                        {profileData.fitnessGoal}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={isEditing ? "outline" : "default"}
                onClick={() => (isEditing ? handleCancel() : setIsEditing(true))}
                disabled={isSaving}
              >
                {isEditing ? "Cancel" : <><Edit className="h-4 w-4 mr-2" /> Edit Profile</>}
              </Button>
              {isEditing && (
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full bg-zinc-900 border border-zinc-800 ${isAdmin ? "grid-cols-4" : "grid-cols-4"}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {isAdmin ? (
              <>
                <TabsTrigger value="gym">Gym Details</TabsTrigger>
                <TabsTrigger value="account">Account Status</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="fitness">Fitness & Routine</TabsTrigger>
                <TabsTrigger value="membership">
                  {profileData.gymName ? `Gym: ${profileData.gymName}` : "Membership"}
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ════════════ Tab 1: Profile ════════════ */}
          <TabsContent value="profile" className="space-y-6">
            <div className={`grid gap-6 ${isAdmin ? "md:grid-cols-1 max-w-2xl" : "md:grid-cols-2"}`}>
              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your registered details from database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      disabled={!isEditing}
                      className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled={true}
                        className="pl-10 bg-zinc-950/50 opacity-80 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder={isEditing ? "+1 234 567 8900" : "Not specified"}
                        className={isEditing ? "bg-zinc-900 border-zinc-700 pl-10" : "bg-zinc-950/50 pl-10"}
                      />
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={profileData.dateOfBirth}
                            onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                            disabled={!isEditing}
                            className={isEditing ? "bg-zinc-900 border-zinc-700 pl-10" : "bg-zinc-950/50 pl-10"}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Input
                          id="gender"
                          value={profileData.gender}
                          onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                          disabled={!isEditing}
                          placeholder={isEditing ? "Male / Female / Other" : "Not specified"}
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    {isEditing ? (
                      <AddressAutocomplete
                        id="address"
                        value={profileData.address}
                        placeholder="Search, detect location, or type your address"
                        inputClassName="bg-zinc-900 border-zinc-700"
                        onChange={({ address }) =>
                          setProfileData({ ...profileData, address })
                        }
                      />
                    ) : (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          value={profileData.address || "Not specified"}
                          disabled
                          className="bg-zinc-950/50 pl-10"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                      <Input
                        id="emergencyContact"
                        value={profileData.emergencyContact}
                        onChange={(e) => setProfileData({ ...profileData, emergencyContact: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Name & Contact number"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="bio">About</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        disabled={!isEditing}
                        rows={3}
                        placeholder="About you or your gym…"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bio & Body Metrics Card — members only */}
              {!isAdmin && (
              <div className="space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Flame className="h-5 w-5 text-primary" />
                      Physical Baseline
                    </CardTitle>
                    <CardDescription>Body metrics & composition</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="weightKg">Weight (kg)</Label>
                        <Input
                          id="weightKg"
                          type="number"
                          step="0.1"
                          value={profileData.weightKg}
                          onChange={(e) => setProfileData({ ...profileData, weightKg: e.target.value })}
                          disabled={!isEditing}
                          placeholder={isEditing ? "e.g. 75" : "—"}
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heightFt">Height (ft)</Label>
                        <Input
                          id="heightFt"
                          type="number"
                          step="0.01"
                          value={profileData.heightFt}
                          onChange={(e) => setProfileData({ ...profileData, heightFt: e.target.value })}
                          disabled={!isEditing}
                          placeholder={isEditing ? "e.g. 5.9" : "—"}
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                    </div>

                    {bmiValue && (
                      <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Calculated BMI</p>
                          <p className="text-xl font-bold text-primary">{bmiValue}</p>
                        </div>
                        <Badge variant="outline" className="text-xs text-zinc-300">
                          {parseFloat(bmiValue) < 18.5 ? "Underweight" : parseFloat(bmiValue) < 25 ? "Healthy Baseline" : "Overweight Tier"}
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="bio">About & Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        disabled={!isEditing}
                        rows={3}
                        placeholder="Tell us about your fitness targets..."
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              )}
            </div>
          </TabsContent>

          {/* ════════════ Admin: Gym Details ════════════ */}
          {isAdmin && (
            <TabsContent value="gym" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
                        {profileData.gymMainImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileData.gymMainImageUrl}
                            alt={profileData.gymName || "Gym"}
                            className="absolute inset-0 size-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>
                      <span>Gym Profile</span>
                    </CardTitle>
                    <CardDescription>Saved from admin registration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gymName">Gym Name</Label>
                      <Input
                        id="gymName"
                        value={profileData.gymName}
                        onChange={(e) => setProfileData({ ...profileData, gymName: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Not specified"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="gymType">Gym Type</Label>
                        <Input
                          id="gymType"
                          value={profileData.gymType}
                          onChange={(e) => setProfileData({ ...profileData, gymType: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Not specified"
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gymCity">City</Label>
                        <Input
                          id="gymCity"
                          value={profileData.gymCity}
                          onChange={(e) => setProfileData({ ...profileData, gymCity: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Not specified"
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gymYearsOperating">Years Operating</Label>
                      <Input
                        id="gymYearsOperating"
                        value={profileData.gymYearsOperating}
                        onChange={(e) => setProfileData({ ...profileData, gymYearsOperating: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Not specified"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="gymMonthlyFee">Monthly Gym Fee</Label>
                        <Input
                          id="gymMonthlyFee"
                          value={profileData.gymMonthlyFee}
                          onChange={(e) =>
                            setProfileData({ ...profileData, gymMonthlyFee: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder="e.g. 5000"
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gymTrainerFee">Trainer Fee</Label>
                        <Input
                          id="gymTrainerFee"
                          value={profileData.gymTrainerFee}
                          onChange={(e) =>
                            setProfileData({ ...profileData, gymTrainerFee: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder="e.g. 3000"
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      These fees are yours to set. Members with a trainer are billed monthly + trainer.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="gymOperatingDays">Operating Days / Week</Label>
                        <Input
                          id="gymOperatingDays"
                          type="number"
                          min="1"
                          max="7"
                          value={profileData.gymOperatingDays}
                          onChange={(e) => setProfileData({ ...profileData, gymOperatingDays: e.target.value })}
                          disabled={!isEditing}
                          placeholder="—"
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gymMemberCapacity">Member Capacity</Label>
                        <Input
                          id="gymMemberCapacity"
                          value={profileData.gymMemberCapacity}
                          onChange={(e) => setProfileData({ ...profileData, gymMemberCapacity: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Not specified"
                          className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gymPeakHours">Peak Hours</Label>
                      <Input
                        id="gymPeakHours"
                        value={profileData.gymPeakHours}
                        onChange={(e) => setProfileData({ ...profileData, gymPeakHours: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Not specified"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Dumbbell className="h-5 w-5 text-primary" />
                      Facilities & Services
                    </CardTitle>
                    <CardDescription>From your onboarding submission</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label>Facilities</Label>
                      {isEditing ? (
                        <Textarea
                          value={profileData.gymFacilities.join(", ")}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              gymFacilities: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          rows={3}
                          placeholder="Comma-separated facilities"
                          className="bg-zinc-900 border-zinc-700"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {profileData.gymFacilities.length > 0 ? (
                            profileData.gymFacilities.map((item) => (
                              <Badge
                                key={item}
                                variant="secondary"
                                className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1"
                              >
                                {item}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No facilities listed</p>
                          )}
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Services</Label>
                      {isEditing ? (
                        <Textarea
                          value={profileData.gymServices.join(", ")}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              gymServices: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          rows={3}
                          placeholder="Comma-separated services"
                          className="bg-zinc-900 border-zinc-700"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {profileData.gymServices.length > 0 ? (
                            profileData.gymServices.map((item) => (
                              <Badge
                                key={item}
                                variant="secondary"
                                className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1"
                              >
                                {item}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No services listed</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Gym photos & video
                  </CardTitle>
                  <CardDescription>Main image, gallery, and video stored in gym-media</CardDescription>
                </CardHeader>
                <CardContent>
                  <GymMediaSection
                    mainImageUrl={profileData.gymMainImageUrl}
                    optionalImagesUrls={profileData.gymOptionalImagesUrls}
                    videoUrl={profileData.gymVideoUrl}
                    videoFileUrl={profileData.gymVideoFileUrl}
                    persistToDb
                    onUpdate={(media) =>
                      setProfileData((prev) => ({
                        ...prev,
                        gymMainImageUrl: media.mainImageUrl,
                        gymOptionalImagesUrls: media.optionalImagesUrls,
                        gymVideoUrl: media.videoUrl,
                        gymVideoFileUrl: media.videoFileUrl,
                      }))
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ════════════ Admin: Account Status ════════════ */}
          {isAdmin && (
            <TabsContent value="account" className="space-y-6">
              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Shield className="h-5 w-5 text-primary" />
                    Admin Account Status
                  </CardTitle>
                  <CardDescription>Approval and role data from the database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-xl bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900 border border-red-500/20 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Role</span>
                      <h3 className="text-2xl font-bold capitalize mt-1 text-foreground">
                        {profileData.isSuperAdmin ? "Super Admin" : "Gym Owner (Admin)"}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {displayValue(profileData.gymName, "No gym name on file")}
                        {profileData.gymCity ? ` · ${profileData.gymCity}` : ""}
                      </p>
                    </div>
                    <Badge
                      className={`px-4 py-1.5 self-start sm:self-center ${
                        profileData.adminApproved ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                      }`}
                    >
                      {profileData.adminApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Admin Approved</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {profileData.adminApproved ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Super Admin</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {profileData.isSuperAdmin ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Verified</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {profileData.isVerified ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Approval Requested</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {formatDateLabel(profileData.approvalRequestedAt)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Rejected At</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {formatDateLabel(profileData.adminRejectedAt)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Joined</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {formatDateLabel(profileData.joinDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ════════════ Tab 2: Fitness & Routine ════════════ */}
          {!isAdmin && (
          <TabsContent value="fitness" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5 text-primary" />
                    Goals & Experience
                  </CardTitle>
                  <CardDescription>Configured during signup onboarding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fitnessGoal">Primary Fitness Goal</Label>
                    <Input
                      id="fitnessGoal"
                      value={profileData.fitnessGoal}
                      onChange={(e) => setProfileData({ ...profileData, fitnessGoal: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g. Build Muscle, Lose Weight"
                      className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activityLevel">Daily Activity Level</Label>
                    <Input
                      id="activityLevel"
                      value={profileData.activityLevel}
                      onChange={(e) => setProfileData({ ...profileData, activityLevel: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Sedentary / Light / Moderate / Very Active"
                      className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Input
                      id="experienceLevel"
                      value={profileData.experienceLevel}
                      onChange={(e) => setProfileData({ ...profileData, experienceLevel: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Beginner / Intermediate / Advanced"
                      className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label>Target Muscle Areas</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {profileData.targetAreas && profileData.targetAreas.length > 0 ? (
                        profileData.targetAreas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1">
                            {area}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No specific target areas set</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    Workout Schedule & Style
                  </CardTitle>
                  <CardDescription>Routine preferences and timing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workoutType">Workout Discipline</Label>
                    <Input
                      id="workoutType"
                      value={profileData.workoutType}
                      onChange={(e) => setProfileData({ ...profileData, workoutType: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Weights / Cardio / HIIT / Bodyweight"
                      className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="workoutDays">Days Per Week</Label>
                      <Input
                        id="workoutDays"
                        type="number"
                        min="1"
                        max="7"
                        value={profileData.workoutDays}
                        onChange={(e) => setProfileData({ ...profileData, workoutDays: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 4"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workoutDuration">Session Duration</Label>
                      <Input
                        id="workoutDuration"
                        value={profileData.workoutDuration}
                        onChange={(e) => setProfileData({ ...profileData, workoutDuration: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g. 45 min"
                        className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredTime">Preferred Workout Time</Label>
                    <Input
                      id="preferredTime"
                      value={profileData.preferredTime}
                      onChange={(e) => setProfileData({ ...profileData, preferredTime: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Morning / Afternoon / Evening"
                      className={isEditing ? "bg-zinc-900 border-zinc-700" : "bg-zinc-950/50"}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Active Program Routine
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Customized based on {profileData.workoutDays || "4"} weekly sessions of {profileData.workoutType || "hybrid"} training ({profileData.workoutDuration || "45 min"}).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          {/* ════════════ Tab 3: Membership ════════════ */}
          {!isAdmin && (
          <TabsContent value="membership" className="space-y-6">
            {profileData.gymName ? (
              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-primary" />
                    Gym Association
                  </CardTitle>
                  <CardDescription>
                    {profileData.gymName ? `You're associated with ${profileData.gymName}` : "You're not currently associated with any gym"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-xl bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900 border border-red-500/20 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Associated Gym</span>
                      <h3 className="text-2xl font-bold mt-1 text-foreground">
                        {profileData.gymName}
                      </h3>
                      {profileData.gymCity && (
                        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {profileData.gymCity}
                        </p>
                      )}
                      <p className="text-sm mt-2 flex items-center gap-1.5 text-foreground">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Monthly fee:</span>
                        <span className="font-semibold">
                          {(() => {
                            const total = formatCombinedFee(
                              profileData.associatedGymMonthlyFee,
                              profileData.associatedGymTrainerFee,
                              Boolean(profileData.preferredTrainerId),
                            );
                            return total ? `${total} / month` : "Not set";
                          })()}
                        </span>
                      </p>
                      {profileData.preferredTrainerId &&
                        profileData.associatedGymTrainerFee && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Includes trainer fee ({profileData.associatedGymTrainerFee})
                          </p>
                        )}
                    </div>
                    <Badge className="bg-emerald-500 text-white px-4 py-1.5 self-start sm:self-center capitalize">
                      {profileData.membershipStatus}
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Member Since</span>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Recently Joined"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Days with Gym</span>
                      <p className="text-lg font-bold mt-1 text-foreground">{membershipDays} days</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="text-xs text-muted-foreground font-medium">Membership Type</span>
                      <p className="text-lg font-bold mt-1 text-primary capitalize">{profileData.membershipType}</p>
                    </div>
                  </div>

                  <CustomerTrainerFeeCard
                    compact
                    onTrainerChange={(id) => {
                      setProfileData((prev) => ({
                        ...prev,
                        preferredTrainerId: id,
                        preferredTrainerName: id
                          ? prev.preferredTrainerName || "Selected trainer"
                          : "",
                      }));
                    }}
                  />

                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5" />
                      Preferred Trainer
                    </span>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {profileData.preferredTrainerName ||
                        (profileData.preferredTrainerId ? "Selected trainer" : "None selected")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Change above anytime — monthly fee adjusts with trainer.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-3">
                    {profileData.gymOwnerId && (
                      <Link href={`/gyms/${profileData.gymOwnerId}`}>
                        <Button className="bg-[#EF1111] hover:bg-[#C90808]">View Gym Details</Button>
                      </Link>
                    )}
                    <Link href="/">
                      <Button variant="outline">Browse Other Gyms</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-primary" />
                    No Gym Association
                  </CardTitle>
                  <CardDescription>You're not currently associated with any gym</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                    <p className="text-muted-foreground mb-4">
                      To join a gym, browse available gyms and request membership approval from the gym owner.
                    </p>
                    <Link href="/">
                      <Button className="bg-[#EF1111] hover:bg-[#C90808]">Browse Available Gyms</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          )}

          {/* ════════════ Tab 4: Settings ════════════ */}
          <TabsContent value="settings" className="space-y-6">
            <ProfileSettingsTab
              isAdmin={isAdmin}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              isSaving={isSaving}
              onSave={() => void handleSave()}
              profileData={{
                email: profileData.email,
                phone: profileData.phone,
                address: profileData.address,
                gymName: profileData.gymName,
                gymType: profileData.gymType,
                gymCity: profileData.gymCity,
                gymYearsOperating: profileData.gymYearsOperating,
                gymOperatingDays: profileData.gymOperatingDays,
                gymPeakHours: profileData.gymPeakHours,
                gymMemberCapacity: profileData.gymMemberCapacity,
                gymMonthlyFee: profileData.gymMonthlyFee,
                gymTrainerFee: profileData.gymTrainerFee,
                gymFacilities: profileData.gymFacilities,
                gymServices: profileData.gymServices,
                gymMainImageUrl: profileData.gymMainImageUrl,
                gymOptionalImagesUrls: profileData.gymOptionalImagesUrls,
                gymVideoUrl: profileData.gymVideoUrl,
                gymVideoFileUrl: profileData.gymVideoFileUrl,
              }}
              onProfileChange={(partial) =>
                setProfileData((prev) => ({ ...prev, ...partial }))
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}