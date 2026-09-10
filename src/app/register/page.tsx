"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "sonner";
import {
  ArrowRight,
  LockKeyhole,
  Loader2,
  Mail,
  UserRound,
  Flame,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  Check,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Shield,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";

type AccountType = "customer" | "admin";

type PublicGym = {
  ownerId: string;
  gymName: string;
  gymType?: string | null;
  gymCity?: string | null;
};

// ─── Capsule Button ───────────────────────────────────────────────────────────
function Capsule({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
        selected
          ? "bg-red-600 text-white border-red-500 shadow-[0_0_16px_rgba(239,17,17,0.4)] scale-[1.02]"
          : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

// ─── Capsule Row (horizontally scrollable) ───────────────────────────────────
function CapsuleRow({
  options,
  selected,
  onSelect,
  icons,
}: {
  options: string[];
  selected: string | string[];
  onSelect: (val: string) => void;
  icons?: Record<string, React.ReactNode>;
}) {
  const isSelected = (v: string) =>
    Array.isArray(selected) ? selected.includes(v) : selected === v;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {options.map((opt) => (
        <Capsule
          key={opt}
          label={opt}
          selected={isSelected(opt)}
          onClick={() => onSelect(opt)}
          icon={icons?.[opt]}
        />
      ))}
    </div>
  );
}

// ─── Height converter ─────────────────────────────────────────────────────────
function toCm(value: string, unit: "ft" | "inch"): number {
  if (unit === "inch") return parseFloat(value) * 2.54;
  // ft format: "5.10" => 5 ft 10 in
  if (value.includes(".")) {
    const [ft, inch] = value.split(".");
    return ((parseInt(ft) || 0) * 12 + (parseInt(inch) || 0)) * 2.54;
  }
  return parseFloat(value) * 30.48; // pure feet
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") || "";
  const queryGymOwnerId = searchParams.get("gym") || "";
  const { register, checkAccountExists } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(queryEmail);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    accountType?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    password?: string;
    confirmPassword?: string;
    gymOwnerId?: string;
  }>({});

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailCheckedOk, setEmailCheckedOk] = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gyms, setGyms] = useState<PublicGym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const [selectedGymOwnerId, setSelectedGymOwnerId] = useState(queryGymOwnerId);
  const gymLockedFromUrl = Boolean(queryGymOwnerId);

  useEffect(() => {
    if (queryEmail && !email) {
      setEmail(queryEmail);
    }
  }, [queryEmail]);

  useEffect(() => {
    if (!queryGymOwnerId) return;
    setAccountType("customer");
    setSelectedGymOwnerId(queryGymOwnerId);
  }, [queryGymOwnerId]);

  useEffect(() => {
    if (accountType !== "customer") return;
    let cancelled = false;
    setLoadingGyms(true);

    (async () => {
      try {
        const listRes = await fetch("/api/gyms");
        const listData = await listRes.json().catch(() => ({}));
        let list: PublicGym[] = Array.isArray(listData?.gyms) ? listData.gyms : [];

        // Ensure the gym from ?gym= is present even if list timing/filter differs
        if (queryGymOwnerId) {
          const inList = list.some((g) => g.ownerId === queryGymOwnerId);
          if (!inList) {
            const detailRes = await fetch(`/api/gyms/${encodeURIComponent(queryGymOwnerId)}`);
            const detailData = await detailRes.json().catch(() => ({}));
            if (detailRes.ok && detailData?.gym?.ownerId) {
              list = [
                {
                  ownerId: detailData.gym.ownerId,
                  gymName: detailData.gym.gymName,
                  gymType: detailData.gym.gymType,
                  gymCity: detailData.gym.gymCity,
                },
                ...list,
              ];
            }
          }
        }

        if (cancelled) return;
        setGyms(list);
        if (queryGymOwnerId) {
          const match = list.find((g) => g.ownerId === queryGymOwnerId);
          if (match) setSelectedGymOwnerId(match.ownerId);
        }
      } catch {
        if (!cancelled) setGyms([]);
      } finally {
        if (!cancelled) setLoadingGyms(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountType, queryGymOwnerId]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailTaken(false);
    setEmailCheckedOk(false);
    if (errors.email) setErrors({ ...errors, email: undefined });

    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    const clean = value.trim().toLowerCase();
    if (!clean || !/\S+@\S+\.\S+/.test(clean)) return;

    setCheckingEmail(true);
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const exists = await checkAccountExists(clean);
        if (exists === true) {
          setEmailTaken(true);
          setEmailCheckedOk(false);
          setErrors((prev) => ({
            ...prev,
            email: "An account with this email already exists. Please sign in.",
          }));
        } else if (exists === false) {
          setEmailTaken(false);
          setEmailCheckedOk(true);
        }
      } catch {
        // ignore network errors — API still blocks on submit
      } finally {
        setCheckingEmail(false);
      }
    }, 450);
  };

  // ── Step 2 (customer fitness / admin gym profile) ───────────────────────────
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"ft" | "inch">("ft");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [hasManuallySelectedGoal, setHasManuallySelectedGoal] = useState(false);
  const [gymName, setGymName] = useState("");
  const [gymType, setGymType] = useState("");
  const [gymCity, setGymCity] = useState("");
  const [gymYearsOperating, setGymYearsOperating] = useState("");
  const [step2Errors, setStep2Errors] = useState<{
    dateOfBirth?: string;
    gender?: string;
    weight?: string;
    height?: string;
    activityLevel?: string;
    fitnessGoal?: string;
    gymName?: string;
    gymType?: string;
    gymCity?: string;
    gymYearsOperating?: string;
  }>({});

  const activityLevels = [
    "Sedentary",
    "Lightly Active",
    "Moderately Active",
    "Very Active",
  ];
  const fitnessObjectives = [
    "Lose Weight",
    "Build Muscle",
    "Gain Weight",
    "Strength",
    "Endurance",
    "Flexibility",
    "General Fitness",
    "Maintain Weight",
    "Body Recomposition",
  ];
  const gymTypeOptions = [
    "Commercial",
    "Boutique",
    "CrossFit",
    "Studio",
    "Franchise",
    "Community",
  ];
  const gymYearsOptions = ["Under 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

  // ── Step 3 (customer workout / admin facilities) ────────────────────────────
  const [experienceLevel, setExperienceLevel] = useState("");
  const [workoutType, setWorkoutType] = useState("");
  const [targetAreas, setTargetAreas] = useState<string[]>([]);
  const [workoutDays, setWorkoutDays] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [gymFacilities, setGymFacilities] = useState<string[]>([]);
  const [gymOperatingDays, setGymOperatingDays] = useState("");
  const [gymPeakHours, setGymPeakHours] = useState("");
  const [gymMemberCapacity, setGymMemberCapacity] = useState("");
  const [gymServices, setGymServices] = useState<string[]>([]);
  const [step3Errors, setStep3Errors] = useState<{
    experienceLevel?: string;
    workoutType?: string;
    targetAreas?: string;
    workoutDays?: string;
    workoutDuration?: string;
    preferredTime?: string;
    gymFacilities?: string;
    gymOperatingDays?: string;
    gymPeakHours?: string;
    gymMemberCapacity?: string;
    gymServices?: string;
  }>({});

  const workoutTypes = ["Weights", "Cardio", "HIIT", "Bodyweight", "Mixed"];
  const targetAreaOptions = [
    "Chest",
    "Back",
    "Shoulders",
    "Arms",
    "Core",
    "Legs",
    "Glutes",
    "Full Body",
  ];
  const durationOptions = [
    "15 min",
    "30 min",
    "45 min",
    "60 min",
    "75 min",
    "90+ min",
  ];
  const timeOptions = ["🌅 Morning", "☀️ Afternoon", "🌙 Evening"];
  const gymFacilityOptions = [
    "Free Weights",
    "Machines",
    "Cardio",
    "Pool",
    "Sauna",
    "Group Classes",
    "Personal Training",
    "Locker Rooms",
    "Parking",
    "Cafe",
  ];
  const gymServiceOptions = [
    "Memberships",
    "Day Pass",
    "Group Classes",
    "Personal Training",
    "Nutrition",
    "Online Coaching",
  ];
  const capacityOptions = ["Under 50", "50–100", "100–250", "250–500", "500+"];
  const peakHourOptions = ["🌅 Morning", "☀️ Afternoon", "🌙 Evening", "All Day"];

  // ── Auto-detection ──────────────────────────────────────────────────────────
  const getAutoDetection = () => {
    const w = parseFloat(weight);
    if (!w || isNaN(w) || w <= 0) return null;

    let heightMeters = 0;
    let heightFormatted = "";
    if (heightUnit === "ft") {
      if (height.includes(".")) {
        const parts = height.split(".");
        const ft = parseInt(parts[0]) || 0;
        const inch = parseInt(parts[1]) || 0;
        heightFormatted = `${ft}'${inch}"`;
        heightMeters = ((ft * 12 + inch) * 2.54) / 100;
      } else {
        const ft = parseFloat(height) || 0;
        heightFormatted = `${ft} ft`;
        heightMeters = (ft * 12 * 2.54) / 100;
      }
    } else {
      const inches = parseFloat(height);
      heightFormatted = `${inches} in`;
      heightMeters = (inches * 2.54) / 100;
    }

    const weightKg = weightUnit === "lbs" ? w * 0.453592 : w;
    if (!heightMeters || isNaN(heightMeters) || heightMeters <= 0.5) return null;

    const bmi = Math.round((weightKg / (heightMeters * heightMeters)) * 10) / 10;
    const a = parseInt(age);

    let recommendedGoal = "General Fitness";
    let bmiCategory = "Healthy weight";
    let advice = "";
    let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

    if (bmi < 18.5) {
      recommendedGoal = "Build Muscle";
      bmiCategory = "Underweight";
      badgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/30";
      advice = `With a BMI of ${bmi} (${heightFormatted}, ${weightKg.toFixed(1)} kg), you're in the leaner tier. Focusing on muscle building and progressive strength with surplus nutrition will be most effective.`;
    } else if (bmi >= 18.5 && bmi < 24.9) {
      bmiCategory = "Healthy weight";
      badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      if (a && a < 30) {
        recommendedGoal = "Build Muscle";
        advice =
          gender === "Female"
            ? `Excellent baseline! BMI ${bmi} (${heightFormatted}, ${weightKg.toFixed(1)} kg) — your profile is primed for lean muscle toning and athletic definition.`
            : `Excellent baseline! BMI ${bmi} (${heightFormatted}, ${weightKg.toFixed(1)} kg) — your body is primed for progressive hypertrophy and strength gains.`;
      } else {
        recommendedGoal = "General Fitness";
        advice = `Ideal composition! BMI ${bmi} — maintain balanced conditioning, functional strength, and longevity.`;
      }
    } else if (bmi >= 25.0 && bmi < 29.9) {
      recommendedGoal = "Lose Weight";
      bmiCategory = "Overweight";
      badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/30";
      advice = `BMI ${bmi} at ${heightFormatted} — a fat-loss and recomposition focus will rapidly improve stamina, energy, and physique.`;
    } else {
      recommendedGoal = "Lose Weight";
      bmiCategory = "High BMI";
      badgeColor = "bg-red-500/20 text-red-400 border-red-500/30";
      advice = `BMI ${bmi} (${heightFormatted}) — prioritising weight loss through joint-friendly cardio and resistance training will deliver major health gains.`;
    }

    return { bmi, bmiCategory, recommendedGoal, advice, badgeColor, heightFormatted };
  };

  const autoDetection = getAutoDetection();

  useEffect(() => {
    if (!hasManuallySelectedGoal && autoDetection?.recommendedGoal) {
      setFitnessGoal(autoDetection.recommendedGoal);
    }
  }, [age, gender, weight, weightUnit, height, heightUnit, hasManuallySelectedGoal, autoDetection?.recommendedGoal]);

  // ── DOB → age ───────────────────────────────────────────────────────────────
  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setDateOfBirth(dob);
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      setAge(a.toString());
    } else {
      setAge("");
    }
    if (step2Errors.dateOfBirth) setStep2Errors({ ...step2Errors, dateOfBirth: undefined });
  };

  const toggleTargetArea = (area: string) => {
    setTargetAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
    if (step3Errors.targetAreas) setStep3Errors({ ...step3Errors, targetAreas: undefined });
  };

  const toggleGymFacility = (item: string) => {
    setGymFacilities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
    if (step3Errors.gymFacilities) setStep3Errors({ ...step3Errors, gymFacilities: undefined });
  };

  const toggleGymService = (item: string) => {
    setGymServices((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
    if (step3Errors.gymServices) setStep3Errors({ ...step3Errors, gymServices: undefined });
  };

  const isAdminAccount = accountType === "admin";

  const steps = isAdminAccount
    ? [
        { id: "1", title: "Sign Up", description: "Create your account" },
        { id: "2", title: "Gym Profile", description: "Your gym details" },
        { id: "3", title: "Facilities", description: "Operations & services" },
      ]
    : [
        { id: "1", title: "Sign Up", description: "Create your account" },
        { id: "2", title: "Personal Details", description: "Your fitness profile" },
        { id: "3", title: "Workout Plan", description: "Customize preferences" },
      ];

  // ── Password Validation Metrics ─────────────────────────────────────────────
  const hasMinLength = password.length >= 6;
  const hasUpperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(password);
  const hasNumber = /(?=.*\d)/.test(password);
  const isPasswordValid = hasMinLength && hasUpperLower && hasNumber;
  const isConfirmFilled = confirmPassword.length > 0;
  const doPasswordsMatch = isConfirmFilled && password === confirmPassword;
  const passwordMismatch = isConfirmFilled && password !== confirmPassword;

  let passwordStrength: "weak" | "medium" | "strong" = "weak";
  if (isPasswordValid && password.length >= 8 && /[^A-Za-z0-9]/.test(password)) {
    passwordStrength = "strong";
  } else if (hasMinLength && (hasUpperLower || hasNumber)) {
    passwordStrength = "medium";
  }

  // ── Step 1 validation & submit ───────────────────────────────────────────────
  const validateStep1 = () => {
    const e: typeof errors = {};
    if (!accountType) e.accountType = "Please select Admin or Customer";
    if (accountType === "customer" && !selectedGymOwnerId) {
      e.gymOwnerId = "Please select a gym to join";
    }
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email format";
    else if (emailTaken) e.email = "An account with this email already exists. Please sign in.";

    if (!password) {
      e.password = "Password is required";
    } else if (!hasMinLength) {
      e.password = "Password must be at least 6 characters";
    } else if (!hasUpperLower) {
      e.password = "Must contain uppercase and lowercase letters";
    } else if (!hasNumber) {
      e.password = "Must contain at least one number";
    }

    if (!confirmPassword) {
      e.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      toast.error("Please fix the errors before continuing");
      return;
    }
    if (emailTaken) {
      toast.error("This email is already registered. Please sign in.");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please agree to the Terms & Conditions");
      return;
    }
    setCurrentStep(2);
  };

  // ── Step 2 validation, save, & advance ──────────────────────────────────────
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof step2Errors = {};

    if (isAdminAccount) {
      if (!gymName.trim()) errs.gymName = "Gym name is required";
      if (!gymType) errs.gymType = "Please select a gym type";
      if (!gymCity.trim()) errs.gymCity = "City / location is required";
      if (!gymYearsOperating) errs.gymYearsOperating = "Please select years operating";
    } else {
      if (!dateOfBirth) errs.dateOfBirth = "Please select your date of birth";
      if (!gender) errs.gender = "Please select your gender";
      const wNum = parseFloat(weight);
      if (!weight || isNaN(wNum) || wNum < 20 || wNum > 500) errs.weight = "Enter a valid weight";
      const hNum = parseFloat(height);
      const minH = heightUnit === "ft" ? 3 : 100;
      const maxH = heightUnit === "ft" ? 8 : 300;
      if (!height || isNaN(hNum) || hNum < minH || hNum > maxH)
        errs.height = `Enter a valid height (${minH}–${maxH} ${heightUnit})`;
      if (!activityLevel) errs.activityLevel = "Please select your activity level";
      if (!fitnessGoal) errs.fitnessGoal = "Please select your fitness goal";
    }

    setStep2Errors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the errors before continuing");
      return;
    }
    setCurrentStep(3);
  };

  // ── Step 3 validation, create account & save everything ─────────────────────
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof step3Errors = {};

    if (isAdminAccount) {
      if (gymFacilities.length === 0) errs.gymFacilities = "Select at least one facility";
      if (!gymOperatingDays) errs.gymOperatingDays = "Select operating days per week";
      if (!gymPeakHours) errs.gymPeakHours = "Select peak hours";
      if (!gymMemberCapacity) errs.gymMemberCapacity = "Select member capacity";
      if (gymServices.length === 0) errs.gymServices = "Select at least one service";
    } else {
      if (!experienceLevel) errs.experienceLevel = "Please select your experience level";
      if (!workoutType) errs.workoutType = "Please select a workout type";
      if (targetAreas.length === 0) errs.targetAreas = "Please select at least one target area";
      if (!workoutDays) errs.workoutDays = "Please select workout days per week";
      if (!workoutDuration) errs.workoutDuration = "Please select workout duration";
      if (!preferredTime) errs.preferredTime = "Please select preferred workout time";
    }

    setStep3Errors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(
        isAdminAccount
          ? "Please complete all gym operation details"
          : "Please complete all workout preferences",
      );
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const fitnessData =
        isAdminAccount
          ? {
              phone: phone || undefined,
              address: address || undefined,
              emergency_contact: emergencyContact || undefined,
              requested_role: "admin" as const,
              gym_name: gymName.trim(),
              gym_type: gymType || undefined,
              gym_city: gymCity.trim(),
              gym_years_operating: gymYearsOperating || undefined,
              gym_facilities: gymFacilities.length > 0 ? gymFacilities : undefined,
              gym_operating_days: gymOperatingDays ? parseInt(gymOperatingDays) : undefined,
              gym_peak_hours: gymPeakHours || undefined,
              gym_member_capacity: gymMemberCapacity || undefined,
              gym_services: gymServices.length > 0 ? gymServices : undefined,
            }
          : (() => {
              const heightCm = toCm(height, heightUnit);
              const weightKg =
                weightUnit === "lbs" ? parseFloat(weight) * 0.453592 : parseFloat(weight);
              return {
                phone: phone || undefined,
                address: address || undefined,
                emergency_contact: emergencyContact || undefined,
                date_of_birth: dateOfBirth || undefined,
                gender: gender || undefined,
                weight_kg: isNaN(weightKg) ? undefined : Math.round(weightKg * 100) / 100,
                height_cm: isNaN(heightCm) ? undefined : Math.round(heightCm * 100) / 100,
                activity_level: activityLevel || undefined,
                fitness_goal: fitnessGoal || undefined,
                experience_level: experienceLevel || undefined,
                target_areas: targetAreas.length > 0 ? targetAreas : undefined,
                workout_days_per_week: workoutDays ? parseInt(workoutDays) : undefined,
                workout_duration: workoutDuration || undefined,
                workout_type: workoutType || undefined,
                preferred_workout_time: preferredTime || undefined,
                requested_role: "user" as const,
                gym_owner_id: selectedGymOwnerId || undefined,
              };
            })();

      await register(email, password, fullName, fitnessData);

      toast.success(
        isAdminAccount
          ? "Admin account created! Check your email to verify, then wait for super admin approval."
          : "Account created! Verify your email, then wait for gym admin approval.",
      );
      if (isAdminAccount) {
        toast.message("Super admins were notified to approve your account.");
      } else {
        toast.message("Your selected gym was notified to approve your membership.");
      }
      setCurrentStep(4);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };


  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // ── Shared select style ──────────────────────────────────────────────────────
  const selectCls = (hasError: boolean) =>
    `h-11 w-full rounded-xl text-white pl-3 pr-8 focus-visible:ring-red-500 transition-colors appearance-none cursor-pointer bg-zinc-900 border ${
      hasError
        ? "border-red-500 bg-red-500/10"
        : "border-zinc-700 focus:border-red-400"
    }`;

  const inputCls = (hasError: boolean) =>
    `h-11 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
      hasError
        ? "border-red-500 bg-red-500/10 focus-visible:border-red-500"
        : "border-zinc-700 bg-zinc-900 focus-visible:border-red-400"
    }`;

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-2">
      {/* Left — Image Panel */}
      <aside className="hidden lg:flex flex-col relative overflow-hidden">
        <img
          src="/gymauth.png"
          alt="Gym"
          className="w-full h-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
        <div className="absolute z-10 flex-col h-full p-10 xl:p-14">
          <div className="mb-8">
            <img src="/forge.png" alt="Forge Gym Logo" className="w-40 h-10 object-contain" />
          </div>
          <div className="max-w-full flex flex-col h-full justify-center">
            <div>
              <h2 className="text-5xl font-bold mb-4 !leading-[3.5rem]">
                <span className="text-red-500">START</span>{" "}
                <span className="text-white">YOUR</span>
                <br />
                <span className="text-white">JOURNEY</span>{" "}
                <span className="text-red-500">TODAY.</span>
              </h2>
              <p className="text-sm text-zinc-300 mb-6">
                Join thousands of members transforming their lives every day.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  "Free Membership Sign-up",
                  "Personal Training Plans",
                  "Progress Tracking Tools",
                  "Community Challenges",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-4 p-4 border border-red-500/70 rounded-xl bg-black/30 backdrop-blur-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />
                    <p className="text-[17px] font-medium text-white">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right — Form Panel */}
      <section className="flex flex-col items-center justify-center bg-black overflow-y-auto px-8 py-12 sm:px-12">
        <div className="w-full max-w-[600px] border border-red-500/30 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-8 shadow-2xl shadow-red-500/10">

          {/* Mobile logo */}
          {currentStep <= 3 && (
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-md shadow-red-500/30">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-white">Forge Gym</span>
            </Link>
          )}

          {/* Heading */}
          {currentStep <= 3 && (
            <header className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.38em] text-red-500">
                {currentStep === 1
                  ? ""
                  : currentStep === 2
                  ? isAdminAccount
                    ? "Set up your gym"
                    : "Personalize your experience"
                  : isAdminAccount
                  ? "Configure operations"
                  : "Customize your workout"}
              </p>
              <h2 className="text-[1.75rem] font-extrabold tracking-tight text-white leading-tight">
                {currentStep === 1
                  ? "Create Your Account"
                  : currentStep === 2
                  ? isAdminAccount
                    ? "Gym Profile"
                    : "Personal Details"
                  : isAdminAccount
                  ? "Facilities & Operations"
                  : "Workout Preferences"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {currentStep === 1
                  ? "Sign up to start your personalized fitness journey."
                  : currentStep === 2
                  ? isAdminAccount
                    ? "Tell us about your gym so we can set up your owner dashboard."
                    : "Tell us a little about yourself to personalize your experience."
                  : isAdminAccount
                  ? "Describe your facilities, hours, and the services you offer."
                  : "Customize your workouts based on your preferences."}
              </p>
            </header>
          )}

          {/* Stepper */}
          {currentStep <= 3 && (
            <div className="mb-6">
              <Stepper
                steps={steps}
                currentStep={currentStep}
                completedSteps={Array.from({ length: currentStep - 1 }, (_, i) => i + 1)}
              />
            </div>
          )}

          {/* ══════════════════════ STEP 1 ══════════════════════ */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} noValidate className="space-y-4">
              {/* Account type: Admin or Customer */}
              <div className="space-y-2">
                <Label className="text-zinc-300 font-medium text-sm">Register as</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType("customer");
                      if (errors.accountType) setErrors({ ...errors, accountType: undefined });
                    }}
                    disabled={isLoading}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all ${
                      accountType === "customer"
                        ? "border-red-500 bg-red-500/15 shadow-[0_0_16px_rgba(239,17,17,0.25)]"
                        : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                    }`}
                  >
                    <UserRound
                      className={`h-4 w-4 shrink-0 ${
                        accountType === "customer" ? "text-red-400" : "text-zinc-400"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          accountType === "customer" ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        Customer
                      </p>
                      <p className="text-[11px] text-zinc-500">Member account</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType("admin");
                      setSelectedGymOwnerId("");
                      if (errors.accountType) setErrors({ ...errors, accountType: undefined });
                      if (errors.gymOwnerId) setErrors({ ...errors, gymOwnerId: undefined });
                    }}
                    disabled={isLoading}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all ${
                      accountType === "admin"
                        ? "border-red-500 bg-red-500/15 shadow-[0_0_16px_rgba(239,17,17,0.25)]"
                        : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                    }`}
                  >
                    <Shield
                      className={`h-4 w-4 shrink-0 ${
                        accountType === "admin" ? "text-red-400" : "text-zinc-400"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          accountType === "admin" ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        Admin
                      </p>
                      <p className="text-[11px] text-zinc-500">Needs approval</p>
                    </div>
                  </button>
                </div>
                {errors.accountType && (
                  <p className="text-xs text-red-400">{errors.accountType}</p>
                )}
                {accountType === "admin" && (
                  <p className="text-[11px] text-amber-400/90 leading-relaxed">
                    Admin accounts use the same signup + email verification. A super admin must
                    approve you before you can sign in.
                  </p>
                )}
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-zinc-300 font-medium text-sm">
                    First Name
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                      }}
                      disabled={isLoading}
                      className={`${inputCls(!!errors.firstName)} pl-10`}
                    />
                  </div>
                  {errors.firstName && <p className="text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-zinc-300 font-medium text-sm">
                    Last Name
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                      }}
                      disabled={isLoading}
                      className={`${inputCls(!!errors.lastName)} pl-10`}
                    />
                  </div>
                  {errors.lastName && <p className="text-xs text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-zinc-300 font-medium text-sm">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      disabled={isLoading}
                      className={`${inputCls(!!errors.email)} pl-10`}
                    />
                  </div>
                  {checkingEmail && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking email…
                    </p>
                  )}
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                  {!errors.email && emailCheckedOk && !checkingEmail && (
                    <p className="text-xs text-emerald-400">Email available</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-zinc-300 font-medium text-sm">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      className={`${inputCls(false)} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-zinc-300 font-medium text-sm">
                  Address
                </Label>
                <AddressAutocomplete
                  id="address"
                  value={address}
                  disabled={isLoading}
                  placeholder="Search, detect location, or type your address"
                  inputClassName={inputCls(false)}
                  onChange={({ address: next }) => setAddress(next)}
                />
              </div>

              {/* Gym select (customers only) */}
              {accountType === "customer" && (
                <div className="space-y-1.5">
                  <Label htmlFor="joinGym" className="text-zinc-300 font-medium text-sm">
                    Join Gym
                  </Label>
                  <div className="relative">
                    <Building2
                      className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                        selectedGymOwnerId ? "text-red-400" : "text-zinc-400"
                      }`}
                    />
                    <select
                      id="joinGym"
                      value={selectedGymOwnerId}
                      onChange={(e) => {
                        setSelectedGymOwnerId(e.target.value);
                        if (errors.gymOwnerId)
                          setErrors({ ...errors, gymOwnerId: undefined });
                      }}
                      disabled={isLoading || loadingGyms}
                      className={`${inputCls(!!errors.gymOwnerId)} pl-10 pr-10 appearance-none`}
                    >
                      <option value="">
                        {loadingGyms ? "Loading gyms…" : "Select a gym to join"}
                      </option>
                      {gyms.map((g) => (
                        <option key={g.ownerId} value={g.ownerId}>
                          {g.gymName}
                          {g.gymCity ? ` — ${g.gymCity}` : ""}
                          {g.gymType ? ` (${g.gymType})` : ""}
                          {gymLockedFromUrl && g.ownerId === queryGymOwnerId
                            ? " ★"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.gymOwnerId && (
                    <p className="text-xs text-red-400">{errors.gymOwnerId}</p>
                  )}
                  {!loadingGyms && gyms.length === 0 && (
                    <p className="text-[11px] text-amber-400/90">
                      No approved gyms are available yet. Check back soon or register as Admin to
                      create one.
                    </p>
                  )}
                  {gymLockedFromUrl &&
                    selectedGymOwnerId === queryGymOwnerId &&
                    !loadingGyms && (
                      <p className="text-[11px] text-emerald-400/90">
                        Pre-selected from the gym page — you can change it above if you want.
                      </p>
                    )}
                  {selectedGymOwnerId && (
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      After email verification, the gym admin must approve you before you can sign
                      in.
                    </p>
                  )}
                </div>
              )}

              {/* Emergency Contact (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContact" className="text-zinc-300 font-medium text-sm">
                  Emergency Contact <span className="text-zinc-500 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="emergencyContact"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    disabled={isLoading}
                    className={`${inputCls(false)} pl-10`}
                  />
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-zinc-300 font-medium text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 chars"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      disabled={isLoading}
                      className={`${inputCls(!!errors.password)} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-zinc-300 font-medium text-sm">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword)
                          setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      disabled={isLoading}
                      className={`h-11 rounded-xl text-white placeholder:text-zinc-500 transition-colors pl-10 pr-10 ${
                        errors.confirmPassword || passwordMismatch
                          ? "border-red-500 bg-red-500/10 focus-visible:border-red-500 focus-visible:ring-red-500"
                          : doPasswordsMatch
                          ? "border-emerald-500/80 bg-emerald-500/10 focus-visible:border-emerald-400 focus-visible:ring-emerald-500"
                          : "border-zinc-700 bg-zinc-900 focus-visible:border-red-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {doPasswordsMatch && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Passwords match
                    </p>
                  )}
                  {(errors.confirmPassword || passwordMismatch) && (
                    <p className="text-xs text-red-400 flex items-center gap-1 font-medium mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.confirmPassword || "Passwords do not match"}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Requirements & Strength Real-Time Feedback */}
              {password.length > 0 && (
                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Password strength:</span>
                    <span
                      className={`font-semibold capitalize ${
                        passwordStrength === "strong"
                          ? "text-emerald-400"
                          : passwordStrength === "medium"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {passwordStrength}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 h-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength === "weak"
                          ? "bg-red-500"
                          : passwordStrength === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength === "medium"
                          ? "bg-amber-500"
                          : passwordStrength === "strong"
                          ? "bg-emerald-500"
                          : "bg-zinc-800"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength === "strong" ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                    <div
                      className={`flex items-center gap-1 transition-colors ${
                        hasMinLength ? "text-emerald-400 font-medium" : "text-zinc-500"
                      }`}
                    >
                      {hasMinLength ? (
                        <Check className="h-3 w-3 shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 inline-block shrink-0" />
                      )}
                      <span>Min. 6 chars</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 transition-colors ${
                        hasUpperLower ? "text-emerald-400 font-medium" : "text-zinc-500"
                      }`}
                    >
                      {hasUpperLower ? (
                        <Check className="h-3 w-3 shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 inline-block shrink-0" />
                      )}
                      <span>Upper & lower</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 transition-colors ${
                        hasNumber ? "text-emerald-400 font-medium" : "text-zinc-500"
                      }`}
                    >
                      {hasNumber ? (
                        <Check className="h-3 w-3 shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 inline-block shrink-0" />
                      )}
                      <span>At least 1 number</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400 select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 rounded accent-red-600"
                />
                I agree to the{" "}
                <button type="button" className="text-red-500 hover:text-red-400 font-medium">
                  Terms & Conditions
                </button>
              </label>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
                style={{ boxShadow: "0 10px 40px rgba(239,17,17,0.35)" }}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {/* ══════════════════════ STEP 2 ══════════════════════ */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} noValidate className="space-y-4">
              {isAdminAccount ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="gymName" className="text-zinc-300 font-medium text-sm">
                      Gym Name
                    </Label>
                    <Input
                      id="gymName"
                      type="text"
                      placeholder="Forge Performance Gym"
                      value={gymName}
                      onChange={(e) => {
                        setGymName(e.target.value);
                        if (step2Errors.gymName)
                          setStep2Errors({ ...step2Errors, gymName: undefined });
                      }}
                      className={inputCls(!!step2Errors.gymName)}
                    />
                    {step2Errors.gymName && (
                      <p className="text-xs text-red-400">{step2Errors.gymName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                      Gym Type
                    </Label>
                    <CapsuleRow
                      options={gymTypeOptions}
                      selected={gymType}
                      onSelect={(v) => {
                        setGymType(v);
                        if (step2Errors.gymType)
                          setStep2Errors({ ...step2Errors, gymType: undefined });
                      }}
                    />
                    {step2Errors.gymType && (
                      <p className="text-xs text-red-400">{step2Errors.gymType}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gymCity" className="text-zinc-300 font-medium text-sm">
                      City / Location
                    </Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        id="gymCity"
                        type="text"
                        placeholder="Karachi, Pakistan"
                        value={gymCity}
                        onChange={(e) => {
                          setGymCity(e.target.value);
                          if (step2Errors.gymCity)
                            setStep2Errors({ ...step2Errors, gymCity: undefined });
                        }}
                        className={`${inputCls(!!step2Errors.gymCity)} pl-10`}
                      />
                    </div>
                    {step2Errors.gymCity && (
                      <p className="text-xs text-red-400">{step2Errors.gymCity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                      Years Operating
                    </Label>
                    <CapsuleRow
                      options={gymYearsOptions}
                      selected={gymYearsOperating}
                      onSelect={(v) => {
                        setGymYearsOperating(v);
                        if (step2Errors.gymYearsOperating)
                          setStep2Errors({ ...step2Errors, gymYearsOperating: undefined });
                      }}
                    />
                    {step2Errors.gymYearsOperating && (
                      <p className="text-xs text-red-400">{step2Errors.gymYearsOperating}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
              {/* DOB & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth" className="text-zinc-300 font-medium text-sm">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={handleDateOfBirthChange}
                    max={new Date().toISOString().split("T")[0]}
                    className={inputCls(!!step2Errors.dateOfBirth)}
                  />
                  {step2Errors.dateOfBirth && (
                    <p className="text-xs text-red-400">{step2Errors.dateOfBirth}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-zinc-300 font-medium text-sm">
                    Gender
                  </Label>
                  <div className="relative">
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value);
                        if (step2Errors.gender)
                          setStep2Errors({ ...step2Errors, gender: undefined });
                      }}
                      className={selectCls(!!step2Errors.gender)}
                    >
                      <option value="" disabled>
                        Select Gender
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {step2Errors.gender && (
                    <p className="text-xs text-red-400">{step2Errors.gender}</p>
                  )}
                </div>
              </div>

              {/* Weight & Height */}
              <div className="grid grid-cols-2 gap-3">
                {/* Weight */}
                <div className="space-y-1.5">
                  <Label htmlFor="weight" className="text-zinc-300 font-medium text-sm">
                    Weight
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder={weightUnit === "kg" ? "70" : "154"}
                      value={weight}
                      onChange={(e) => {
                        setWeight(e.target.value);
                        if (step2Errors.weight)
                          setStep2Errors({ ...step2Errors, weight: undefined });
                      }}
                      className={`${inputCls(!!step2Errors.weight)} flex-1 min-w-0`}
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value as "kg" | "lbs")}
                      className="h-11 rounded-xl text-white bg-zinc-900 border border-zinc-700 px-2 text-xs shrink-0"
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                  {step2Errors.weight && (
                    <p className="text-xs text-red-400">{step2Errors.weight}</p>
                  )}
                </div>

                {/* Height */}
                <div className="space-y-1.5">
                  <Label htmlFor="height" className="text-zinc-300 font-medium text-sm">
                    Height
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder={heightUnit === "ft" ? "5.10" : "177"}
                      value={height}
                      onChange={(e) => {
                        setHeight(e.target.value);
                        if (step2Errors.height)
                          setStep2Errors({ ...step2Errors, height: undefined });
                      }}
                      className={`${inputCls(!!step2Errors.height)} flex-1 min-w-0`}
                    />
                    <select
                      value={heightUnit}
                      onChange={(e) => setHeightUnit(e.target.value as "ft" | "inch")}
                      className="h-11 rounded-xl text-white bg-zinc-900 border border-zinc-700 px-2 text-xs shrink-0"
                    >
                      <option value="ft">ft</option>
                      <option value="inch">in</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {heightUnit === "ft" ? "e.g. 5.10 = 5'10\"" : "in inches e.g. 177"}
                  </p>
                  {step2Errors.height && (
                    <p className="text-xs text-red-400">{step2Errors.height}</p>
                  )}
                </div>
              </div>

              {/* BMI Auto-Detection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300 font-medium text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-500" />
                    Body Analysis & What To Do
                  </Label>
                  {autoDetection && (
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${autoDetection.badgeColor}`}
                    >
                      BMI {autoDetection.bmi} · {autoDetection.bmiCategory}
                    </span>
                  )}
                </div>
                {autoDetection ? (
                  <div className="p-4 rounded-xl border border-red-500/40 bg-gradient-to-br from-red-500/10 via-zinc-900/90 to-black/80 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                          Auto-Detected Focus
                        </p>
                        <p className="text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
                          {autoDetection.recommendedGoal}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            Recommended
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFitnessGoal(autoDetection.recommendedGoal);
                          setHasManuallySelectedGoal(false);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          fitnessGoal === autoDetection.recommendedGoal
                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                            : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                        }`}
                      >
                        {fitnessGoal === autoDetection.recommendedGoal ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-red-400" /> Auto-Applied
                          </>
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{autoDetection.advice}</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400 flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Enter your weight and height above to auto-detect the best fitness focus.</span>
                  </div>
                )}
              </div>

              {/* Activity Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Activity Level
                  </Label>
                  {activityLevel && (
                    <span className="text-xs text-red-400 font-semibold">{activityLevel}</span>
                  )}
                </div>
                <CapsuleRow
                  options={activityLevels}
                  selected={activityLevel}
                  onSelect={(v) => {
                    setActivityLevel(v);
                    if (step2Errors.activityLevel)
                      setStep2Errors({ ...step2Errors, activityLevel: undefined });
                  }}
                />
                {step2Errors.activityLevel && (
                  <p className="text-xs text-red-400">{step2Errors.activityLevel}</p>
                )}
              </div>

              {/* Fitness Goal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Fitness Goal
                  </Label>
                  {fitnessGoal && (
                    <span className="text-xs text-red-400 font-semibold">{fitnessGoal}</span>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {fitnessObjectives.map((obj) => {
                    const isSelected = fitnessGoal === obj;
                    const isRec = autoDetection?.recommendedGoal === obj;
                    return (
                      <button
                        key={obj}
                        type="button"
                        onClick={() => {
                          setFitnessGoal(obj);
                          setHasManuallySelectedGoal(true);
                          if (step2Errors.fitnessGoal)
                            setStep2Errors({ ...step2Errors, fitnessGoal: undefined });
                        }}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? "bg-red-600 text-white border-red-500 shadow-[0_0_16px_rgba(239,17,17,0.4)] scale-[1.02]"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
                        }`}
                      >
                        {isRec && (
                          <Sparkles
                            className={`w-3 h-3 ${isSelected ? "text-yellow-300" : "text-amber-400"}`}
                          />
                        )}
                        {obj}
                      </button>
                    );
                  })}
                </div>
                {step2Errors.fitnessGoal && (
                  <p className="text-xs text-red-400">{step2Errors.fitnessGoal}</p>
                )}
              </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#EF1111] text-sm font-bold text-white hover:bg-[#C90808]"
                  style={{ boxShadow: "0 10px 40px rgba(239,17,17,0.35)" }}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* ══════════════════════ STEP 3 ══════════════════════ */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} noValidate className="space-y-4">
              {isAdminAccount ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                      Facilities{" "}
                      {gymFacilities.length > 0 && (
                        <span className="text-red-400 normal-case font-normal">
                          ({gymFacilities.length} selected)
                        </span>
                      )}
                    </Label>
                    <CapsuleRow
                      options={gymFacilityOptions}
                      selected={gymFacilities}
                      onSelect={toggleGymFacility}
                    />
                    {step3Errors.gymFacilities && (
                      <p className="text-xs text-red-400">{step3Errors.gymFacilities}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                        Operating Days / Week
                      </Label>
                      {gymOperatingDays && (
                        <span className="text-xs text-red-400 font-semibold">
                          {gymOperatingDays} days
                        </span>
                      )}
                    </div>
                    <CapsuleRow
                      options={["1", "2", "3", "4", "5", "6", "7"]}
                      selected={gymOperatingDays}
                      onSelect={(v) => {
                        setGymOperatingDays(v);
                        if (step3Errors.gymOperatingDays)
                          setStep3Errors({ ...step3Errors, gymOperatingDays: undefined });
                      }}
                    />
                    {step3Errors.gymOperatingDays && (
                      <p className="text-xs text-red-400">{step3Errors.gymOperatingDays}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                      Peak Hours
                    </Label>
                    <CapsuleRow
                      options={peakHourOptions}
                      selected={gymPeakHours}
                      onSelect={(v) => {
                        setGymPeakHours(v);
                        if (step3Errors.gymPeakHours)
                          setStep3Errors({ ...step3Errors, gymPeakHours: undefined });
                      }}
                    />
                    {step3Errors.gymPeakHours && (
                      <p className="text-xs text-red-400">{step3Errors.gymPeakHours}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                      Member Capacity
                    </Label>
                    <CapsuleRow
                      options={capacityOptions}
                      selected={gymMemberCapacity}
                      onSelect={(v) => {
                        setGymMemberCapacity(v);
                        if (step3Errors.gymMemberCapacity)
                          setStep3Errors({ ...step3Errors, gymMemberCapacity: undefined });
                      }}
                    />
                    {step3Errors.gymMemberCapacity && (
                      <p className="text-xs text-red-400">{step3Errors.gymMemberCapacity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                      Services Offered{" "}
                      {gymServices.length > 0 && (
                        <span className="text-red-400 normal-case font-normal">
                          ({gymServices.length} selected)
                        </span>
                      )}
                    </Label>
                    <CapsuleRow
                      options={gymServiceOptions}
                      selected={gymServices}
                      onSelect={toggleGymService}
                    />
                    {step3Errors.gymServices && (
                      <p className="text-xs text-red-400">{step3Errors.gymServices}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
              {/* Experience Level & Workout Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Experience Level
                  </Label>
                  <CapsuleRow
                    options={["Beginner", "Intermediate", "Advanced"]}
                    selected={experienceLevel}
                    onSelect={(v) => {
                      setExperienceLevel(v);
                      if (step3Errors.experienceLevel)
                        setStep3Errors({ ...step3Errors, experienceLevel: undefined });
                    }}
                  />
                  {step3Errors.experienceLevel && (
                    <p className="text-xs text-red-400">{step3Errors.experienceLevel}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Workout Type
                  </Label>
                  <CapsuleRow
                    options={workoutTypes}
                    selected={workoutType}
                    onSelect={(v) => {
                      setWorkoutType(v);
                      if (step3Errors.workoutType)
                        setStep3Errors({ ...step3Errors, workoutType: undefined });
                    }}
                  />
                  {step3Errors.workoutType && (
                    <p className="text-xs text-red-400">{step3Errors.workoutType}</p>
                  )}
                </div>
              </div>

              {/* Target Areas */}
              <div className="space-y-2">
                <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                  Target Areas{" "}
                  {targetAreas.length > 0 && (
                    <span className="text-red-400 normal-case font-normal">
                      ({targetAreas.length} selected)
                    </span>
                  )}
                </Label>
                <CapsuleRow
                  options={targetAreaOptions}
                  selected={targetAreas}
                  onSelect={toggleTargetArea}
                />
                {step3Errors.targetAreas && (
                  <p className="text-xs text-red-400">{step3Errors.targetAreas}</p>
                )}
              </div>

              {/* Workout Days */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Workout Days / Week
                  </Label>
                  {workoutDays && (
                    <span className="text-xs text-red-400 font-semibold">{workoutDays} days</span>
                  )}
                </div>
                <CapsuleRow
                  options={["1", "2", "3", "4", "5", "6", "7"]}
                  selected={workoutDays}
                  onSelect={(v) => {
                    setWorkoutDays(v);
                    if (step3Errors.workoutDays)
                      setStep3Errors({ ...step3Errors, workoutDays: undefined });
                  }}
                />
                {step3Errors.workoutDays && (
                  <p className="text-xs text-red-400">{step3Errors.workoutDays}</p>
                )}
              </div>

              {/* Workout Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Workout Duration
                  </Label>
                  {workoutDuration && (
                    <span className="text-xs text-red-400 font-semibold">{workoutDuration}</span>
                  )}
                </div>
                <CapsuleRow
                  options={durationOptions}
                  selected={workoutDuration}
                  onSelect={(v) => {
                    setWorkoutDuration(v);
                    if (step3Errors.workoutDuration)
                      setStep3Errors({ ...step3Errors, workoutDuration: undefined });
                  }}
                />
                {step3Errors.workoutDuration && (
                  <p className="text-xs text-red-400">{step3Errors.workoutDuration}</p>
                )}
              </div>

              {/* Preferred Workout Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-[.25em]">
                    Preferred Workout Time
                  </Label>
                  {preferredTime && (
                    <span className="text-xs text-red-400 font-semibold">{preferredTime}</span>
                  )}
                </div>
                <CapsuleRow
                  options={timeOptions}
                  selected={preferredTime}
                  onSelect={(v) => {
                    setPreferredTime(v);
                    if (step3Errors.preferredTime)
                      setStep3Errors({ ...step3Errors, preferredTime: undefined });
                  }}
                />
                {step3Errors.preferredTime && (
                  <p className="text-xs text-red-400">{step3Errors.preferredTime}</p>
                )}
              </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-xl bg-[#EF1111] text-sm font-bold text-white hover:bg-[#C90808]"
                  style={{ boxShadow: "0 10px 40px rgba(239,17,17,0.35)" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ══════════════════════ STEP 4 — Success ══════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 mb-4 shadow-lg shadow-red-500/30">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">
                  Welcome, {firstName}! 🎉
                </h2>
                <p className="text-sm text-zinc-400">
                  {accountType === "admin"
                    ? "Your admin account was created — next: verify email, then wait for approval"
                    : "Next: verify your email, then wait for gym admin approval to join"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(isAdminAccount
                  ? [
                      { label: "Gym Name", value: gymName },
                      { label: "Gym Type", value: gymType },
                      { label: "Location", value: gymCity },
                      { label: "Capacity", value: gymMemberCapacity },
                    ]
                  : [
                      {
                        label: "Gym",
                        value:
                          gyms.find((g) => g.ownerId === selectedGymOwnerId)?.gymName || "—",
                      },
                      { label: "Primary Goal", value: fitnessGoal },
                      { label: "Current Weight", value: `${weight} ${weightUnit}` },
                      { label: "Weekly Target", value: `${workoutDays} days/week` },
                    ]
                ).map(({ label, value }) => (
                  <div key={label} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 mb-1">{label}</p>
                    <p className="text-sm font-semibold text-white capitalize">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-red-400 font-semibold mb-3 uppercase tracking-wider">
                  {isAdminAccount ? "Your Gym Setup" : "Your Personalized Plan"}
                </p>
                <div className="space-y-2">
                  {(isAdminAccount
                    ? [
                        { label: "Operating Days", value: `${gymOperatingDays} days/week` },
                        { label: "Peak Hours", value: gymPeakHours },
                        { label: "Years Operating", value: gymYearsOperating },
                        {
                          label: "Facilities",
                          value: `${gymFacilities.slice(0, 2).join(", ")}${gymFacilities.length > 2 ? ` +${gymFacilities.length - 2}` : ""}`,
                        },
                      ]
                    : [
                        { label: "Workout Type", value: workoutType },
                        { label: "Duration", value: workoutDuration },
                        { label: "Preferred Time", value: preferredTime },
                        {
                          label: "Focus Areas",
                          value: `${targetAreas.slice(0, 2).join(", ")}${targetAreas.length > 2 ? ` +${targetAreas.length - 2}` : ""}`,
                        },
                      ]
                  ).map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">{label}</span>
                      <span className="text-sm font-medium text-white capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-center space-y-2">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Email Verification Required
                </p>
                <p className="text-xs text-zinc-300">
                  We sent a confirmation link to <strong className="text-white">{email}</strong>.
                  Use a <strong className="text-white">real inbox</strong> (Gmail, etc.) — addresses
                  like <code className="text-zinc-400">.test</code> often never receive mail.
                  Check spam, and set up <strong className="text-white">Custom SMTP</strong> in
                  Supabase → Authentication → Emails if nothing arrives.
                </p>
              </div>

              {accountType === "admin" && (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-center space-y-2">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Super Admin Approval
                  </p>
                  <p className="text-xs text-zinc-300">
                    After verifying your email, you will stay on the login screen until a super admin
                    approves your admin account.
                  </p>
                </div>
              )}

              <Button
                onClick={() => router.push(`/verification?email=${encodeURIComponent(email)}`)}
                className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808]"
                style={{ boxShadow: "0 10px 40px rgba(239,17,17,0.35)" }}
              >
                Go to Verification Page
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                onClick={() => router.push(`/verification?email=${encodeURIComponent(email)}`)}
                className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Check verification status in real time
              </button>
            </div>
          )}

          {/* Footer */}
          {currentStep <= 3 && (
            <p className="mt-6 text-center text-sm text-zinc-400">
              Already a member?{" "}
              <Link
                href="/login"
                className="font-semibold text-red-500 hover:text-red-400 underline-offset-2 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
