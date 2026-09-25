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
  Loader2,
  Flame,
  Sparkles,
  Activity,
  Check,
  MapPin,
  ShieldCheck,
  Upload,
  X,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { CapsuleRow } from "@/components/forms/CapsuleSelect";
import { heightToCm } from "@/lib/validation/height";
import { useRegisterPassword } from "@/hooks/useRegisterPassword";
import { RegisterShell } from "@/components/register/RegisterShell";
import { RegisterAccountStep } from "@/components/register/RegisterAccountStep";
import { AuthBusyOverlay } from "@/components/auth/AuthBusyOverlay";
import { checkPhoneExists, checkGymDuplicate } from "@/api/auth";
import { listGyms, getGym } from "@/api/gyms";
import { phonesMatch } from "@/lib/phone";
import type { AccountType, PublicGym } from "@/components/register/types";
import { formatCityLocation, placeFromAddressLabel } from "@/lib/geo/place";

const CITY_OPTIONS = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Other / Custom",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") || "";
  const queryGymOwnerId = searchParams.get("gym") || "";
  const { register, checkAccountExists } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(queryEmail);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressCity, setAddressCity] = useState<string | null>(null);
  const [addressRegion, setAddressRegion] = useState<string | null>(null);
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLon, setAddressLon] = useState<number | null>(null);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [errors, setErrors] = useState<{
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
  }>({});

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailCheckedOk, setEmailCheckedOk] = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gyms, setGyms] = useState<PublicGym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const [selectedGymOwnerId, setSelectedGymOwnerId] = useState(queryGymOwnerId);
  const [preferredTrainerId, setPreferredTrainerId] = useState("");
  const [preferredTrainerLabel, setPreferredTrainerLabel] = useState("");
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
        const listData = await listGyms();
        let list: PublicGym[] = Array.isArray(listData?.gyms)
          ? (listData.gyms as PublicGym[])
          : [];

        // Ensure the gym from ?gym= is present even if list timing/filter differs
        if (queryGymOwnerId) {
          const inList = list.some((g) => g.ownerId === queryGymOwnerId);
          if (!inList) {
            try {
              const detailData = await getGym(queryGymOwnerId);
              const gym = detailData?.gym as PublicGym | undefined;
              if (gym?.ownerId) {
                list = [
                  {
                    ownerId: gym.ownerId,
                    gymName: gym.gymName,
                    gymType: gym.gymType,
                    gymCity: gym.gymCity,
                    monthlyFee: gym.monthlyFee ?? null,
                    trainerFee: gym.trainerFee ?? null,
                  },
                  ...list,
                ];
              }
            } catch {
              /* gym detail optional */
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

  const syncPhoneEmergencyError = (nextPhone: string, nextEmergency: string) => {
    if (phonesMatch(nextPhone, nextEmergency)) {
      setErrors((prev) => ({
        ...prev,
        emergencyContact: "Emergency contact cannot be the same as your phone number.",
      }));
      return true;
    }
    setErrors((prev) => ({ ...prev, emergencyContact: undefined }));
    return false;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneTaken(false);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
    syncPhoneEmergencyError(value, emergencyContact);

    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    const clean = value.trim();
    if (!clean || clean.replace(/\D/g, "").length < 7) {
      setCheckingPhone(false);
      return;
    }

    setCheckingPhone(true);
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const exists = await checkPhoneExists(clean);
        if (exists === true) {
          setPhoneTaken(true);
          setErrors((prev) => ({
            ...prev,
            phone: "This phone number is already used by another account.",
          }));
        } else if (exists === false) {
          setPhoneTaken(false);
        }
      } catch {
        // ignore — API still blocks on submit
      } finally {
        setCheckingPhone(false);
      }
    }, 450);
  };

  const handleEmergencyContactChange = (value: string) => {
    setEmergencyContact(value);
    syncPhoneEmergencyError(phone, value);
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
  const [gymCityPreset, setGymCityPreset] = useState("");
  const [gymYearsOperating, setGymYearsOperating] = useState("");
  const [gymMonthlyFee, setGymMonthlyFee] = useState("");
  const [gymTrainerFee, setGymTrainerFee] = useState("");
  const [gymMainImage, setGymMainImage] = useState<File | null>(null);
  const [gymMainImagePreview, setGymMainImagePreview] = useState<string>("");
  const [gymLogo, setGymLogo] = useState<File | null>(null);
  const [gymLogoPreview, setGymLogoPreview] = useState<string>("");
  const [gymOptionalImages, setGymOptionalImages] = useState<File[]>([]);
  const [gymOptionalImagesPreviews, setGymOptionalImagesPreviews] = useState<string[]>([]);
  const [gymVideoUrl, setGymVideoUrl] = useState("");
  const [gymVideoFile, setGymVideoFile] = useState<File | null>(null);
  const [gymVideoFileName, setGymVideoFileName] = useState("");
  const [gymDuplicateError, setGymDuplicateError] = useState<string | null>(null);
  const gymCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    gymMainImage?: string;
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

  useEffect(() => {
    if (accountType !== "admin" || currentStep !== 2) return;
    if (!gymName.trim() || gymName.trim().length < 2) {
      setGymDuplicateError(null);
      return;
    }
    if (gymCheckTimer.current) clearTimeout(gymCheckTimer.current);
    gymCheckTimer.current = setTimeout(() => {
      void checkGymDuplicate({
        gym_name: gymName.trim(),
        gym_city: gymCity.trim() || undefined,
        phone: phone.trim() || undefined,
      })
        .then((dup) => {
          setGymDuplicateError(dup.duplicate ? dup.message || "Gym already registered" : null);
        })
        .catch(() => {
          /* ignore */
        });
    }, 450);
    return () => {
      if (gymCheckTimer.current) clearTimeout(gymCheckTimer.current);
    };
  }, [gymName, gymCity, phone, accountType, currentStep]);

  // ── Image upload handlers ──────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo must be under 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      setGymLogo(file);
      setGymLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoRemove = () => {
    setGymLogo(null);
    setGymLogoPreview("");
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      setGymMainImage(file);
      const preview = URL.createObjectURL(file);
      setGymMainImagePreview(preview);
      if (step2Errors.gymMainImage) {
        setStep2Errors({ ...step2Errors, gymMainImage: undefined });
      }
    }
  };

  const handleMainImageRemove = () => {
    setGymMainImage(null);
    setGymMainImagePreview("");
  };

  const handleOptionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + gymOptionalImages.length > 5) {
      toast.error("Maximum 5 optional images allowed");
      return;
    }
    
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setGymOptionalImages(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setGymOptionalImagesPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleOptionalImageRemove = (index: number) => {
    setGymOptionalImages(prev => prev.filter((_, i) => i !== index));
    setGymOptionalImagesPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke the removed preview URL
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video must be under 50MB");
        return;
      }
      if (!file.type.startsWith("video/")) {
        toast.error("Only video files are allowed");
        return;
      }
      setGymVideoFile(file);
      setGymVideoFileName(file.name);
    }
  };

  const handleVideoFileRemove = () => {
    setGymVideoFile(null);
    setGymVideoFileName("");
  };

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

  const {
    hasMinLength,
    hasUpperLower,
    hasNumber,
    doPasswordsMatch,
    passwordMismatch,
    passwordStrength,
  } = useRegisterPassword(password, confirmPassword);

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

    if (phone.trim() && phone.replace(/\D/g, "").length < 7) {
      e.phone = "Enter a valid phone number";
    } else if (phoneTaken) {
      e.phone = "This phone number is already used by another account.";
    }

    if (phonesMatch(phone, emergencyContact)) {
      e.emergencyContact = "Emergency contact cannot be the same as your phone number.";
    }

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
    if (phoneTaken) {
      toast.error("This phone number is already used by another account.");
      return;
    }
    if (phonesMatch(phone, emergencyContact)) {
      toast.error("Emergency contact cannot be the same as your phone number.");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please agree to the Terms & Conditions");
      return;
    }

    setIsStepTransitioning(true);

    if (isAdminAccount) {
      const detected =
        formatCityLocation(addressCity, addressRegion) ||
        formatCityLocation(
          placeFromAddressLabel(address).city,
          placeFromAddressLabel(address).region,
        );
      if (detected && !gymCity.trim()) {
        setGymCity(detected);
        const cityOnly = (addressCity || placeFromAddressLabel(address).city || "").trim();
        const matched = CITY_OPTIONS.find(
          (c) => c !== "Other / Custom" && cityOnly.toLowerCase() === c.toLowerCase(),
        );
        setGymCityPreset(matched || (detected ? "Other / Custom" : ""));
      }
    }

    setTimeout(() => {
      setCurrentStep(2);
      setIsStepTransitioning(false);
    }, 300);
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
      if (!gymMainImage) errs.gymMainImage = "Gym main image is required";
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

    if (isAdminAccount) {
      if (gymDuplicateError) {
        toast.error(gymDuplicateError);
        return;
      }
      try {
        const dup = await checkGymDuplicate({
          gym_name: gymName.trim(),
          gym_city: gymCity.trim(),
          phone: phone.trim() || undefined,
        });
        if (dup.duplicate) {
          setGymDuplicateError(dup.message || "This gym already exists");
          toast.error(dup.message || "This gym already exists");
          return;
        }
        setGymDuplicateError(null);
      } catch {
        // Non-blocking if check fails — server still enforces on submit
      }
    }

    setIsStepTransitioning(true);
    setTimeout(() => {
      setCurrentStep(3);
      setIsStepTransitioning(false);
    }, 300);
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
              gym_monthly_fee: gymMonthlyFee.trim() || undefined,
              gym_trainer_fee: gymTrainerFee.trim() || undefined,
              gym_facilities: gymFacilities.length > 0 ? gymFacilities : undefined,
              gym_operating_days: gymOperatingDays ? parseInt(gymOperatingDays) : undefined,
              gym_peak_hours: gymPeakHours || undefined,
              gym_member_capacity: gymMemberCapacity || undefined,
              gym_services: gymServices.length > 0 ? gymServices : undefined,
              gym_video_url: gymVideoUrl.trim() || undefined,
              gym_latitude:
                addressLat != null && Number.isFinite(addressLat)
                  ? addressLat
                  : undefined,
              gym_longitude:
                addressLon != null && Number.isFinite(addressLon)
                  ? addressLon
                  : undefined,
            }
          : (() => {
              const heightCm = heightToCm(height, heightUnit);
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
                preferred_trainer_id: preferredTrainerId || undefined,
              };
            })();

      await register(
        email,
        password,
        fullName,
        fitnessData,
        isAdminAccount
          ? {
              mainImage: gymMainImage,
              logo: gymLogo,
              optionalImages: gymOptionalImages,
              videoFile: gymVideoFile,
            }
          : undefined,
      );

      // Same welcome beat as login — then success / verification step
      setWelcomeName(firstName.trim() || fullName || "Athlete");
      toast.success(
        isAdminAccount
          ? "Admin account created! Verify email, then wait for super admin approval — your 1-month free trial starts when they approve."
          : "Account created! Verify your email, then wait for gym admin approval.",
      );
      if (isAdminAccount) {
        toast.message(
          "Super admins were notified. After approval you’ll get 30 days free on the platform.",
        );
      } else {
        toast.message("Your selected gym was notified to approve your membership.");
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      await new Promise((r) => window.setTimeout(r, 2000));

      setCurrentStep(4);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create account");
    } finally {
      setWelcomeName(null);
      setIsLoading(false);
    }
  };


  const handleBack = () => {
    if (currentStep > 1 && !isStepTransitioning) {
      setIsStepTransitioning(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsStepTransitioning(false);
      }, 300);
    }
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
    <RegisterShell>
          <AuthBusyOverlay
            busy={isLoading}
            mode={isAdminAccount ? "register-admin" : "register"}
            welcomeName={welcomeName}
          />
          {/* Mobile logo */}
          {currentStep <= 3 && (
            <Link
              href="/"
              className="mb-3 block h-7 w-[7.25rem] overflow-hidden lg:hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/preloader_logo.png"
                alt="Forge Gym"
                className="block h-9 w-full object-cover object-top"
              />
            </Link>
          )}

          {/* Heading */}
          {currentStep <= 3 && (
            <header className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-red-500">
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
                onStepClick={(n) => {
                  if (n < currentStep) setCurrentStep(n);
                }}
              />
            </div>
          )}

          {currentStep === 1 && (
            <RegisterAccountStep
              isLoading={isLoading}
              accountType={accountType}
              setAccountType={setAccountType}
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              email={email}
              onEmailChange={handleEmailChange}
              phone={phone}
              setPhone={setPhone}
              onPhoneChange={handlePhoneChange}
              checkingPhone={checkingPhone}
              phoneTaken={phoneTaken}
              address={address}
              setAddress={setAddress}
              onAddressPlace={({ city, region, lat, lon }) => {
                setAddressCity(city || null);
                setAddressRegion(region || null);
                setAddressLat(
                  typeof lat === "number" && Number.isFinite(lat) ? lat : null,
                );
                setAddressLon(
                  typeof lon === "number" && Number.isFinite(lon) ? lon : null,
                );
              }}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              onEmergencyContactChange={handleEmergencyContactChange}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              agreeTerms={agreeTerms}
              setAgreeTerms={setAgreeTerms}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              errors={errors}
              setErrors={setErrors}
              checkingEmail={checkingEmail}
              emailCheckedOk={emailCheckedOk}
              gyms={gyms}
              loadingGyms={loadingGyms}
              selectedGymOwnerId={selectedGymOwnerId}
              setSelectedGymOwnerId={setSelectedGymOwnerId}
              preferredTrainerId={preferredTrainerId}
              setPreferredTrainerId={setPreferredTrainerId}
              preferredTrainerLabel={preferredTrainerLabel}
              setPreferredTrainerLabel={setPreferredTrainerLabel}
              gymLockedFromUrl={gymLockedFromUrl}
              queryGymOwnerId={queryGymOwnerId}
              hasMinLength={hasMinLength}
              hasUpperLower={hasUpperLower}
              hasNumber={hasNumber}
              doPasswordsMatch={doPasswordsMatch}
              passwordMismatch={passwordMismatch}
              passwordStrength={passwordStrength}
              onSubmit={handleStep1Submit}
            />
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
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <select
                        id="gymCityPreset"
                        value={
                          gymCityPreset ||
                          (CITY_OPTIONS.includes(gymCity) ? gymCity : gymCity ? "Other / Custom" : "")
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setGymCityPreset(v);
                          if (v && v !== "Other / Custom") {
                            const withRegion =
                              addressRegion && !v.toLowerCase().includes(addressRegion.toLowerCase())
                                ? `${v}, ${addressRegion}`
                                : v;
                            setGymCity(withRegion);
                          }
                          if (step2Errors.gymCity)
                            setStep2Errors({ ...step2Errors, gymCity: undefined });
                          setGymDuplicateError(null);
                        }}
                        className={`${inputCls(!!step2Errors.gymCity)} pl-10 appearance-none`}
                      >
                        <option value="">Select city / location</option>
                        {CITY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(gymCityPreset === "Other / Custom" ||
                      (!!gymCity && !CITY_OPTIONS.includes(gymCity.split(",")[0].trim()))) && (
                      <Input
                        id="gymCity"
                        type="text"
                        placeholder="City, Province"
                        value={gymCity}
                        onChange={(e) => {
                          setGymCity(e.target.value);
                          setGymCityPreset("Other / Custom");
                          if (step2Errors.gymCity)
                            setStep2Errors({ ...step2Errors, gymCity: undefined });
                          setGymDuplicateError(null);
                        }}
                        className={inputCls(!!step2Errors.gymCity)}
                      />
                    )}
                    {(addressCity || address) && (
                      <p className="text-[11px] text-zinc-500">
                        From step 1 address:{" "}
                        <button
                          type="button"
                          className="text-zinc-300 underline-offset-2 hover:underline"
                          onClick={() => {
                            const detected =
                              formatCityLocation(addressCity, addressRegion) ||
                              formatCityLocation(
                                placeFromAddressLabel(address).city,
                                placeFromAddressLabel(address).region,
                              );
                            if (!detected) return;
                            setGymCity(detected);
                            const cityOnly = (
                              addressCity ||
                              placeFromAddressLabel(address).city ||
                              ""
                            ).trim();
                            const matched = CITY_OPTIONS.find(
                              (c) =>
                                c !== "Other / Custom" &&
                                cityOnly.toLowerCase() === c.toLowerCase(),
                            );
                            setGymCityPreset(matched || "Other / Custom");
                          }}
                        >
                          {formatCityLocation(addressCity, addressRegion) ||
                            address.slice(0, 60)}
                        </button>
                      </p>
                    )}
                    {step2Errors.gymCity && (
                      <p className="text-xs text-red-400">{step2Errors.gymCity}</p>
                    )}
                    {gymDuplicateError && (
                      <p className="text-xs text-amber-400">{gymDuplicateError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="gymMonthlyFee" className="text-zinc-300 font-medium text-sm">
                        Monthly Gym Fee
                      </Label>
                      <Input
                        id="gymMonthlyFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 5000"
                        value={gymMonthlyFee}
                        onChange={(e) => setGymMonthlyFee(e.target.value)}
                        className={inputCls(false)}
                      />
                      <p className="text-[11px] text-zinc-500">Shown on your gym detail page</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gymTrainerFee" className="text-zinc-300 font-medium text-sm">
                        Trainer Fee
                      </Label>
                      <Input
                        id="gymTrainerFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 3000"
                        value={gymTrainerFee}
                        onChange={(e) => setGymTrainerFee(e.target.value)}
                        className={inputCls(false)}
                      />
                      <p className="text-[11px] text-zinc-500">Personal training / month</p>
                    </div>
                  </div>

                  {/* Gym Logo + Main Image */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
                    <div className="space-y-1.5">
                      <Label htmlFor="gymLogo" className="text-zinc-300 font-medium text-sm">
                        Gym Logo <span className="text-zinc-500 font-normal">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <input
                          id="gymLogo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="gymLogo"
                          className={`flex items-center justify-center aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                            gymLogoPreview
                              ? "border-red-500/50 bg-red-500/5"
                              : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                          }`}
                        >
                          {gymLogoPreview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={gymLogoPreview}
                                alt="Gym logo preview"
                                className="w-full h-full object-cover rounded-xl"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleLogoRemove();
                                }}
                                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-zinc-400 px-2 text-center">
                              <ImageIcon className="h-6 w-6" />
                              <span className="text-xs">Upload logo</span>
                              <span className="text-[10px] text-zinc-500">Max 5MB</span>
                            </div>
                          )}
                        </label>
                      </div>
                      <p className="text-[11px] text-zinc-500">Shown on gym cards & listings</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="gymMainImage" className="text-zinc-300 font-medium text-sm">
                        Gym Main Image <span className="text-zinc-500 font-normal">(Required)</span>
                      </Label>
                      <div className="relative">
                        <input
                          id="gymMainImage"
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="gymMainImage"
                          className={`flex items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                            gymMainImagePreview
                              ? "border-red-500/50 bg-red-500/5"
                              : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                          }`}
                        >
                          {gymMainImagePreview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={gymMainImagePreview}
                                alt="Gym main image preview"
                                className="w-full h-full object-cover rounded-xl"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleMainImageRemove();
                                }}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-zinc-400">
                              <ImageIcon className="h-8 w-8" />
                              <span className="text-sm">Click to upload main image</span>
                              <span className="text-xs text-zinc-500">Max 5MB • JPG, PNG, WebP</span>
                            </div>
                          )}
                        </label>
                      </div>
                      {step2Errors.gymMainImage && (
                        <p className="text-xs text-red-400">{step2Errors.gymMainImage}</p>
                      )}
                    </div>
                  </div>

                  {/* Gym Optional Images Upload */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gymOptionalImages" className="text-zinc-300 font-medium text-sm">
                      Additional Images <span className="text-zinc-500 font-normal">(Optional - Max 5)</span>
                    </Label>
                    <div className="relative">
                      <input
                        id="gymOptionalImages"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleOptionalImagesChange}
                        className="hidden"
                        disabled={gymOptionalImages.length >= 5}
                      />
                      <label
                        htmlFor="gymOptionalImages"
                        className={`flex items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                          gymOptionalImages.length >= 5
                            ? "border-zinc-800 bg-zinc-900/30 cursor-not-allowed"
                            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                          <Upload className="h-6 w-6" />
                          <span className="text-sm">
                            {gymOptionalImages.length >= 5
                              ? "Maximum 5 images reached"
                              : `Click to add images (${gymOptionalImages.length}/5)`}
                          </span>
                        </div>
                      </label>
                    </div>
                    {gymOptionalImagesPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {gymOptionalImagesPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={preview}
                              alt={`Optional image ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleOptionalImageRemove(index)}
                              className="absolute top-1 right-1 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gym Video Section */}
                  <div className="space-y-3">
                    <Label className="text-zinc-300 font-medium text-sm">
                      Gym Video <span className="text-zinc-500 font-normal">(Optional)</span>
                    </Label>
                    
                    {/* Video URL Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="gymVideoUrl" className="text-zinc-400 text-xs">
                        Video URL (YouTube, Vimeo, etc.)
                      </Label>
                      <div className="relative">
                        <Video className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <Input
                          id="gymVideoUrl"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={gymVideoUrl}
                          onChange={(e) => setGymVideoUrl(e.target.value)}
                          className={`${inputCls(false)} pl-10`}
                        />
                      </div>
                    </div>

                    {/* Video File Upload */}
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">or upload a video file:</span>
                    </div>
                    <div className="relative">
                      <input
                        id="gymVideoFile"
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="gymVideoFile"
                        className={`flex items-center justify-center gap-2 h-16 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                          gymVideoFileName
                            ? "border-red-500/50 bg-red-500/5"
                            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                        }`}
                      >
                        {gymVideoFileName ? (
                          <div className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-red-400" />
                            <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                              {gymVideoFileName}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleVideoFileRemove();
                              }}
                              className="ml-2 text-zinc-400 hover:text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Upload className="h-5 w-5" />
                            <span className="text-sm">Click to upload video</span>
                            <span className="text-xs text-zinc-500">Max 50MB • MP4, WebM</span>
                          </div>
                        )}
                      </label>
                    </div>
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  disabled={isStepTransitioning}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isStepTransitioning}
                  className="flex-1 h-12 rounded-xl bg-[#EF1111] text-sm font-bold text-white hover:bg-[#C90808]"
                  style={{ boxShadow: "0 10px 40px rgba(239,17,17,0.35)" }}
                >
                  {isStepTransitioning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
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
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                      <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                    <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  <Label className="text-zinc-400 font-bold text-[11px] uppercase tracking-wide">
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
                  disabled={isStepTransitioning}
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
                      {
                        label: "Monthly Fee",
                        value: gymMonthlyFee.trim() || "—",
                      },
                    ]
                  : [
                      {
                        label: "Gym",
                        value:
                          gyms.find((g) => g.ownerId === selectedGymOwnerId)?.gymName || "—",
                      },
                      {
                        label: "Trainer",
                        value: preferredTrainerLabel || "None",
                      },
                      { label: "Primary Goal", value: fitnessGoal },
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
                        { label: "Trainer Fee", value: gymTrainerFee.trim() || "—" },
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
                    Super Admin Approval + Free Trial
                  </p>
                  <p className="text-xs text-zinc-300">
                    After verifying your email, wait for super admin approval. When they approve,
                    your <span className="font-semibold text-white">1-month free trial</span> starts
                    automatically — countdown shows on your dashboard and theirs.
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
    </RegisterShell>
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
