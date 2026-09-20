"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Stepper } from "@/components/ui/stepper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Camera, Loader2, Shield, Dumbbell, HardHat, Crown, Plus, X, User } from "lucide-react";
import { toast } from "sonner";
import { createManagedUser, updateManagedUser, type CreateStaffPayload, type ManagedUser } from "@/api/admin-users";
import { checkAccountExists, checkPhoneExists } from "@/api/auth";
import { getNameInitials } from "@/lib/utils";
import { phonesMatch } from "@/lib/phone";
import { SOCIAL_LINK_FIELDS, type SocialLinkDbKey } from "@/lib/social-links";

export type StaffCreateRole = "admin" | "trainer" | "staff" | "user" | "super_admin";

const TRAINER_STEPS = [
  { id: "basic", title: "Basic", description: "Name & contact" },
  { id: "pro", title: "Professional", description: "Skills & certs" },
  { id: "job", title: "Employment", description: "Pay, days & hours" },
  { id: "gym", title: "Gym", description: "Clients & capacity" },
  { id: "account", title: "Account", description: "Login access" },
  { id: "review", title: "Review", description: "Confirm details" },
];

const ADMIN_STEPS = [
  { id: "basic", title: "Basic", description: "Name & contact" },
  { id: "account", title: "Account", description: "Login access" },
  { id: "review", title: "Review", description: "Confirm details" },
];

const SUPER_ADMIN_STEPS = [
  { id: "basic", title: "Basic", description: "Name & contact" },
  { id: "account", title: "Account", description: "Platform access" },
  { id: "review", title: "Review", description: "Confirm details" },
];

const STAFF_STEPS = [
  { id: "basic", title: "Basic", description: "Name & contact" },
  { id: "job", title: "Job", description: "Role & type" },
  { id: "work", title: "Work", description: "Shift & duties" },
  { id: "account", title: "Account", description: "Login access" },
  { id: "review", title: "Review", description: "Confirm details" },
];

const MEMBER_STEPS = [
  { id: "basic", title: "Basic", description: "Name & contact" },
  { id: "plan", title: "Membership", description: "Plan & status" },
  { id: "review", title: "Review", description: "Confirm details" },
];

const STAFF_TYPES = [
  "Sweeper",
  "Receptionist",
  "Security",
  "Cleaner",
  "Maintenance",
  "Other",
];

const AVAILABILITY_PRESETS = [
  { id: "Morning", start: "06:00", end: "11:00", hours: 5 },
  { id: "Afternoon", start: "12:00", end: "16:00", hours: 4 },
  { id: "Evening", start: "17:00", end: "21:00", hours: 4 },
] as const;

type AvailabilityPresetId = (typeof AVAILABILITY_PRESETS)[number]["id"];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

type ScheduleValue = {
  availability: string;
  working_days: string;
  working_hours: string;
};

function parseWorkingDays(value: string): WeekDay[] {
  const raw = value.trim();
  if (!raw) return [];
  if (/^mon\s*[–-]\s*fri$/i.test(raw)) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  }
  if (/^mon\s*[–-]\s*sat$/i.test(raw)) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
  return WEEK_DAYS.filter((d) =>
    raw.split(/[,|/·]+/).some((p) => p.trim().toLowerCase() === d.toLowerCase()),
  );
}

function buildWorkingDays(days: WeekDay[]): string {
  if (
    days.length === 5 &&
    WEEK_DAYS.slice(0, 5).every((d) => days.includes(d)) &&
    !days.includes("Sat") &&
    !days.includes("Sun")
  ) {
    return "Mon–Fri";
  }
  if (
    days.length === 6 &&
    WEEK_DAYS.slice(0, 6).every((d) => days.includes(d)) &&
    !days.includes("Sun")
  ) {
    return "Mon–Sat";
  }
  return days.join(", ");
}

function parseAvailability(value: string): {
  presets: AvailabilityPresetId[];
  customStart: string;
  customEnd: string;
  useCustom: boolean;
} {
  const raw = value.trim();
  if (!raw) {
    return { presets: [], customStart: "09:00", customEnd: "17:00", useCustom: false };
  }

  const useCustom = /(^|,\s*)Custom\b/i.test(raw);
  const presets = useCustom
    ? []
    : (AVAILABILITY_PRESETS.map((p) => p.id).filter((id) =>
        new RegExp(`(?:^|,)\\s*${id}\\b`, "i").test(raw),
      ) as AvailabilityPresetId[]);

  const customMatch = raw.match(
    /Custom\s+(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/i,
  );

  return {
    presets,
    customStart: customMatch?.[1] || "09:00",
    customEnd: customMatch?.[2] || "17:00",
    useCustom,
  };
}

function buildAvailability(
  presets: AvailabilityPresetId[],
  useCustom: boolean,
  customStart: string,
  customEnd: string,
): string {
  if (useCustom) {
    if (customStart && customEnd) return `Custom ${customStart}–${customEnd}`;
    return "Custom";
  }
  return presets.join(", ");
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (![sh, sm, eh, em].every((n) => Number.isFinite(n))) return 0;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? Math.round((mins / 60) * 10) / 10 : 0;
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function computeWorkingHours(availability: string, workingDays: string): string {
  const { presets, customStart, customEnd, useCustom } =
    parseAvailability(availability);
  const days = parseWorkingDays(workingDays);
  const dayLabel = buildWorkingDays(days) || "No days";

  if (useCustom) {
    if (!customStart || !customEnd) return "";
    const hrs = hoursBetween(customStart, customEnd);
    const range = `${formatTimeLabel(customStart)} – ${formatTimeLabel(customEnd)}`;
    if (days.length === 0) return range;
    return `${dayLabel} · ${range} · ${hrs}h/day`;
  }

  if (presets.length === 0) return "";

  const selected = AVAILABILITY_PRESETS.filter((p) => presets.includes(p.id));
  const names = selected.map((p) => p.id).join(" + ");
  const ranges = selected
    .map((p) => `${formatTimeLabel(p.start)}–${formatTimeLabel(p.end)}`)
    .join(", ");
  const hrs = selected.reduce((sum, p) => sum + p.hours, 0);

  if (days.length === 0) return `${names} · ${ranges}`;
  return `${dayLabel} · ${names} · ${ranges} · ${hrs}h/day`;
}

const chipClass =
  "focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-[0.98]";

/** Controlled schedule picker — one atomic update so chips never stick. */
function SchedulePicker({
  availability,
  workingDays,
  workingHours,
  onChange,
  inputClass,
}: {
  availability: string;
  workingDays: string;
  workingHours: string;
  onChange: (next: ScheduleValue) => void;
  inputClass: string;
}) {
  const parsed = parseAvailability(availability);
  const selectedDays = parseWorkingDays(workingDays);

  const commit = (nextAvailability: string, nextDays: string) => {
    onChange({
      availability: nextAvailability,
      working_days: nextDays,
      working_hours: computeWorkingHours(nextAvailability, nextDays),
    });
  };

  const togglePreset = (id: AvailabilityPresetId) => {
    // Presets clear custom mode
    const without = parsed.useCustom ? [] : parsed.presets;
    const nextPresets = without.includes(id)
      ? without.filter((p) => p !== id)
      : [...without, id];
    commit(buildAvailability(nextPresets, false, "", ""), workingDays);
  };

  const toggleCustom = () => {
    if (parsed.useCustom) {
      commit("", workingDays);
      return;
    }
    // Custom clears presets
    commit(
      buildAvailability([], true, parsed.customStart || "09:00", parsed.customEnd || "17:00"),
      workingDays,
    );
  };

  const setCustomTimes = (start: string, end: string) => {
    commit(buildAvailability([], true, start, end), workingDays);
  };

  const toggleDay = (day: WeekDay) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort(
          (a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b),
        );
    commit(availability, buildWorkingDays(next));
  };

  return (
    <div className="space-y-4">
      <Field id="working_days" label="Working days">
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
              className={chipClass}
              variant={selectedDays.includes(day) ? "default" : "outline"}
              aria-pressed={selectedDays.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {day}
            </Button>
          ))}
        </div>
      </Field>

      <Field id="availability" label="Availability">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_PRESETS.map((preset) => {
              const active = !parsed.useCustom && parsed.presets.includes(preset.id);
              return (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  className={chipClass}
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => togglePreset(preset.id)}
                >
                  {preset.id}
                  <span className="ml-1 text-[10px] opacity-70">
                    {formatTimeLabel(preset.start)}–{formatTimeLabel(preset.end)}
                  </span>
                </Button>
              );
            })}
            <Button
              type="button"
              size="sm"
              className={chipClass}
              variant={parsed.useCustom ? "default" : "outline"}
              aria-pressed={parsed.useCustom}
              onClick={toggleCustom}
            >
              Custom times
            </Button>
          </div>

          {parsed.useCustom && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="avail_start" label="From">
                <Input
                  id="avail_start"
                  type="time"
                  className={inputClass}
                  value={parsed.customStart || "09:00"}
                  onChange={(e) =>
                    setCustomTimes(e.target.value, parsed.customEnd || "17:00")
                  }
                />
              </Field>
              <Field id="avail_end" label="To">
                <Input
                  id="avail_end"
                  type="time"
                  className={inputClass}
                  value={parsed.customEnd || "17:00"}
                  onChange={(e) =>
                    setCustomTimes(parsed.customStart || "09:00", e.target.value)
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </Field>

      <Field id="working_hours" label="Working hours (auto)">
        <Input
          id="working_hours"
          className={inputClass}
          value={workingHours}
          readOnly
          placeholder="Select days + availability"
        />
        <p className="text-xs text-muted-foreground">
          Auto from working days and availability (custom replaces Morning/Afternoon/Evening).
        </p>
      </Field>
    </div>
  );
}

const PERMISSION_OPTIONS = [
  { id: "manage_members", label: "Manage members" },
  { id: "manage_classes", label: "Manage classes" },
  { id: "view_reports", label: "View reports" },
  { id: "manage_schedule", label: "Manage schedule" },
  { id: "front_desk", label: "Front desk" },
];

type WizardFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  emergency_contact: string;
  account_status: string;
  avatar_preview: string;
  avatar_base64: string;
  specialization: string;
  certifications: string;
  certification_number: string;
  years_experience: string;
  education: string;
  skills: string;
  languages: string;
  trainer_bio: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  youtube_url: string;
  tiktok_url: string;
  joining_date: string;
  employment_type: string;
  branch_department: string;
  department: string;
  salary: string;
  commission_percentage: string;
  working_days: string;
  working_hours: string;
  max_client_capacity: string;
  assigned_members: string;
  availability: string;
  pt_sessions: string;
  leave_info: string;
  staff_type: string;
  supervisor: string;
  shift: string;
  overtime_rate: string;
  responsibilities: string;
  login_enabled: boolean;
  password: string;
  confirm_password: string;
  role: StaffCreateRole;
  system_permissions: string[];
  membership_type: string;
};

const emptyForm = (): WizardFormState => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  address: "",
  emergency_contact: "",
  account_status: "active",
  avatar_preview: "",
  avatar_base64: "",
  specialization: "",
  certifications: "",
  certification_number: "",
  years_experience: "",
  education: "",
  skills: "",
  languages: "",
  trainer_bio: "",
  instagram_url: "",
  facebook_url: "",
  twitter_url: "",
  youtube_url: "",
  tiktok_url: "",
  joining_date: new Date().toISOString().split("T")[0],
  employment_type: "full-time",
  branch_department: "",
  department: "",
  salary: "",
  commission_percentage: "",
  working_days: "Mon–Fri",
  working_hours: "",
  max_client_capacity: "",
  assigned_members: "",
  availability: "",
  pt_sessions: "",
  leave_info: "",
  staff_type: "Sweeper",
  supervisor: "",
  shift: "Morning",
  overtime_rate: "",
  responsibilities: "",
  login_enabled: false,
  password: "",
  confirm_password: "",
  role: "staff",
  system_permissions: [],
  membership_type: "basic",
});

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function listToCsv(value?: string[] | string | null) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function formFromUser(user: ManagedUser, fallbackRole: StaffCreateRole): WizardFormState {
  const parts = String(user.full_name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first_name = parts[0] || "";
  const last_name = parts.slice(1).join(" ");
  const role: StaffCreateRole =
    user.is_super_admin
      ? "super_admin"
      : user.role === "admin" ||
          user.role === "trainer" ||
          user.role === "staff" ||
          user.role === "user"
        ? user.role
        : user.role === "moderator"
          ? "user"
          : fallbackRole;

  return {
    ...emptyForm(),
    first_name,
    last_name,
    email: user.email || "",
    phone: user.phone || "",
    gender: user.gender || "",
    date_of_birth: user.date_of_birth || "",
    address: user.address || "",
    emergency_contact: user.emergency_contact || "",
    account_status: user.account_status || user.membership_status || "active",
    membership_type: user.membership_type || "basic",
    avatar_preview: user.avatar_url || "",
    avatar_base64: "",
    specialization: user.specialization || "",
    certifications: listToCsv(user.certifications),
    certification_number: user.certification_number || "",
    years_experience: user.years_experience || "",
    education: user.education || "",
    skills: listToCsv(user.skills),
    languages: listToCsv(user.languages),
    trainer_bio: user.trainer_bio || "",
    instagram_url: user.instagram_url || "",
    facebook_url: user.facebook_url || "",
    twitter_url: user.twitter_url || "",
    youtube_url: user.youtube_url || "",
    tiktok_url: user.tiktok_url || "",
    joining_date: user.join_date || "",
    employment_type: user.employment_type || "",
    branch_department: user.branch_department || "",
    department: user.department || "",
    salary: user.salary || "",
    commission_percentage:
      user.commission_percentage !== null && user.commission_percentage !== undefined
        ? String(user.commission_percentage)
        : "",
    working_days: user.working_days || "",
    working_hours: user.working_hours || "",
    max_client_capacity: user.max_client_capacity || "",
    assigned_members: listToCsv(user.assigned_members),
    availability: user.availability || "",
    pt_sessions: user.pt_sessions || "",
    leave_info: user.leave_info || "",
    staff_type: user.staff_type || "",
    supervisor: user.supervisor || "",
    shift: user.shift || "",
    overtime_rate: user.overtime_rate || "",
    responsibilities: user.responsibilities || "",
    login_enabled: user.login_enabled !== false,
    password: "",
    confirm_password: "",
    role,
    system_permissions: user.system_permissions || [],
  };
}

type AddUserWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Limit which roles can be selected (default: all three). */
  allowedRoles?: StaffCreateRole[];
  /** Initial role when the sheet opens. */
  defaultRole?: StaffCreateRole;
  /** When set, opens as edit wizard with full stepped form. */
  editUser?: ManagedUser | null;
};

export function AddUserWizard({
  open,
  onOpenChange,
  onCreated,
  allowedRoles = ["admin", "trainer", "staff"],
  defaultRole,
  editUser = null,
}: AddUserWizardProps) {
  const isEdit = !!editUser;
  const initialRole =
    (editUser?.is_super_admin ? "super_admin" : null) ||
    (editUser &&
      (editUser.role === "admin" ||
        editUser.role === "trainer" ||
        editUser.role === "staff" ||
        editUser.role === "user") &&
      editUser.role) ||
    (editUser?.role === "moderator" ? "user" : null) ||
    (defaultRole && allowedRoles.includes(defaultRole) ? defaultRole : null) ||
    allowedRoles[0] ||
    "staff";

  const [form, setForm] = useState<WizardFormState>(() =>
    editUser
      ? formFromUser(editUser, initialRole)
      : {
          ...emptyForm(),
          role: initialRole,
          login_enabled: initialRole !== "staff",
        },
  );
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [openSocials, setOpenSocials] = useState<SocialLinkDbKey[]>(() =>
    SOCIAL_LINK_FIELDS.filter((f) => !!editUser?.[f.key]).map((f) => f.key),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roleLocked = allowedRoles.length === 1 || isEdit;

  const steps =
    form.role === "super_admin"
      ? SUPER_ADMIN_STEPS
      : form.role === "admin"
        ? ADMIN_STEPS
        : form.role === "trainer"
          ? TRAINER_STEPS
          : form.role === "user"
            ? MEMBER_STEPS
            : STAFF_STEPS;
  const totalSteps = steps.length;
  const inputClass = "bg-background";

  const set = <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEmailChange = (value: string) => {
    set("email", value);
    setEmailTaken(false);
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    if (isEdit) return;

    const clean = value.trim().toLowerCase();
    if (!clean || !/\S+@\S+\.\S+/.test(clean)) {
      setCheckingEmail(false);
      return;
    }

    setCheckingEmail(true);
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const exists = await checkAccountExists(clean);
        setEmailTaken(exists === true);
      } catch {
        // Network errors ignored — API still blocks on submit
      } finally {
        setCheckingEmail(false);
      }
    }, 450);
  };

  const syncPhoneEmergency = (nextPhone: string, nextEmergency: string) => {
    if (phonesMatch(nextPhone, nextEmergency)) {
      setPhoneError("Emergency contact cannot be the same as phone number.");
      return true;
    }
    setPhoneError(null);
    return false;
  };

  const handlePhoneChange = (value: string) => {
    set("phone", value);
    setPhoneTaken(false);
    syncPhoneEmergency(value, form.emergency_contact);
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);

    const clean = value.trim();
    if (!clean || clean.replace(/\D/g, "").length < 7) {
      setCheckingPhone(false);
      return;
    }

    setCheckingPhone(true);
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const exists = await checkPhoneExists(
          clean,
          isEdit ? editUser?.user_id : undefined,
        );
        if (exists === true) {
          setPhoneTaken(true);
          setPhoneError("This phone number is already used by another account.");
        } else if (exists === false && !phonesMatch(clean, form.emergency_contact)) {
          setPhoneTaken(false);
          setPhoneError(null);
        }
      } catch {
        // ignore
      } finally {
        setCheckingPhone(false);
      }
    }, 450);
  };

  const handleEmergencyChange = (value: string) => {
    set("emergency_contact", value);
    if (!phoneTaken) {
      syncPhoneEmergency(form.phone, value);
    } else if (!phonesMatch(form.phone, value)) {
      // keep duplicate-phone error if still taken
      setPhoneError("This phone number is already used by another account.");
    }
  };

  useEffect(() => {
    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
      if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    };
  }, []);

  const reset = () => {
    if (editUser) {
      setForm(formFromUser(editUser, initialRole));
      setOpenSocials(SOCIAL_LINK_FIELDS.filter((f) => !!editUser[f.key]).map((f) => f.key));
    } else {
      setForm({
        ...emptyForm(),
        role: initialRole,
        login_enabled: initialRole !== "staff",
      });
      setOpenSocials([]);
    }
    setStep(1);
    setSaving(false);
    setEmailTaken(false);
    setCheckingEmail(false);
    setPhoneTaken(false);
    setCheckingPhone(false);
    setPhoneError(null);
  };

  // Sync form when opening create/edit sheet
  useEffect(() => {
    if (!open) return;
    if (editUser) {
      setForm(formFromUser(editUser, initialRole));
      setOpenSocials(SOCIAL_LINK_FIELDS.filter((f) => !!editUser[f.key]).map((f) => f.key));
    } else {
      setForm({
        ...emptyForm(),
        role: initialRole,
        login_enabled: initialRole !== "staff",
      });
      setOpenSocials([]);
    }
    setStep(1);
    setSaving(false);
    setEmailTaken(false);
    setCheckingEmail(false);
    setPhoneTaken(false);
    setCheckingPhone(false);
    setPhoneError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when sheet opens / edit target changes
  }, [open, editUser?.user_id]);

  const ignoreCloseUntilRef = useRef(0);

  const handleOpenChange = (next: boolean) => {
    // Ignore spurious close while another sheet/dialog is tearing down
    if (!next && Date.now() < ignoreCloseUntilRef.current) return;
    if (!next) reset();
    onOpenChange(next);
  };

  useEffect(() => {
    if (open) ignoreCloseUntilRef.current = Date.now() + 400;
  }, [open, editUser?.user_id]);

  const handleRoleChange = (role: StaffCreateRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      login_enabled: role !== "staff",
      system_permissions:
        role === "admin"
          ? PERMISSION_OPTIONS.map((p) => p.id)
          : role === "trainer"
            ? ["manage_classes", "manage_schedule"]
            : [],
      staff_type: role === "staff" ? prev.staff_type || "Sweeper" : "",
    }));
    setStep(1);
  };

  const handleAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setForm((prev) => ({ ...prev, avatar_preview: result, avatar_base64: result }));
    };
    reader.readAsDataURL(file);
  };

  const needsPassword = !isEdit && (form.role !== "staff" || form.login_enabled);

  const fullName = [form.first_name, form.last_name].map((s) => s.trim()).filter(Boolean).join(" ");

  const validateStep = (): boolean => {
    const isAccountStep =
      (form.role === "trainer" && step === 5) ||
      (form.role === "admin" && step === 2) ||
      (form.role === "super_admin" && step === 2) ||
      (form.role === "staff" && step === 4);
    // members have no password/account step

    if (step === 1) {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        toast.error("First name and last name are required");
        return false;
      }
      if (!isEdit && !form.email.trim()) {
        toast.error("Email is required");
        return false;
      }
      if (!isEdit && form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
        toast.error("Enter a valid email address");
        return false;
      }
      if (!isEdit && emailTaken) {
        toast.error("An account with this email already exists");
        return false;
      }
      if (!isEdit && checkingEmail) {
        toast.error("Checking email… please wait");
        return false;
      }
      if (phonesMatch(form.phone, form.emergency_contact)) {
        toast.error("Emergency contact cannot be the same as phone number");
        return false;
      }
      if (phoneTaken) {
        toast.error("This phone number is already used by another account");
        return false;
      }
      if (checkingPhone) {
        toast.error("Checking phone… please wait");
        return false;
      }
    }
    if (form.role === "staff" && step === 2 && !form.staff_type.trim()) {
      toast.error("Staff type / position is required");
      return false;
    }
    if (isAccountStep && needsPassword) {
      if (!form.password || form.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }
      if (form.password !== form.confirm_password) {
        toast.error("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const buildPayload = (): CreateStaffPayload => ({
    full_name: fullName,
    email: form.email.trim().toLowerCase(),
    password: needsPassword ? form.password : undefined,
    phone: form.phone.trim() || null,
    gender: form.gender.trim() || null,
    date_of_birth: form.date_of_birth || null,
    address: form.address.trim() || null,
    emergency_contact: form.emergency_contact.trim() || null,
    account_status: form.account_status,
    membership_status: form.account_status,
    membership_type: form.membership_type.trim() || "basic",
    role: form.role,
    avatar_base64: form.avatar_base64 || undefined,
    specialization: form.specialization.trim() || null,
    certifications: form.certifications,
    certification_number: form.certification_number.trim() || null,
    years_experience: form.years_experience.trim() || null,
    education: form.education.trim() || null,
    skills: form.skills,
    languages: form.languages,
    trainer_bio: form.trainer_bio.trim() || null,
    instagram_url: form.instagram_url.trim() || null,
    facebook_url: form.facebook_url.trim() || null,
    twitter_url: form.twitter_url.trim() || null,
    youtube_url: form.youtube_url.trim() || null,
    tiktok_url: form.tiktok_url.trim() || null,
    joining_date: form.joining_date || null,
    employment_type: form.employment_type.trim() || null,
    branch_department: form.branch_department.trim() || null,
    department: form.department.trim() || form.branch_department.trim() || null,
    salary: form.salary.trim() || null,
    commission_percentage: form.commission_percentage.trim() || null,
    working_days: form.working_days.trim() || null,
    working_hours: form.working_hours.trim() || null,
    max_client_capacity: form.max_client_capacity.trim() || null,
    assigned_members: form.assigned_members,
    availability: form.availability.trim() || null,
    pt_sessions: form.pt_sessions.trim() || null,
    leave_info: form.leave_info.trim() || null,
    staff_type: form.staff_type.trim() || null,
    supervisor: form.supervisor.trim() || null,
    shift: form.shift.trim() || null,
    overtime_rate: form.overtime_rate.trim() || null,
    responsibilities: form.responsibilities.trim() || null,
    login_enabled: form.role === "staff" ? form.login_enabled : true,
    system_permissions: form.system_permissions,
  });

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      if (isEdit && editUser) {
        const payload = buildPayload();
        await updateManagedUser({
          userId: editUser.user_id,
          full_name: payload.full_name,
          phone: payload.phone,
          address: payload.address,
          account_status: payload.account_status,
          membership_status: payload.account_status,
          membership_type: payload.membership_type,
          role: payload.role,
          specialization: payload.specialization,
          staff_type: payload.staff_type,
          login_enabled: payload.login_enabled,
          gender: payload.gender,
          date_of_birth: payload.date_of_birth,
          emergency_contact: payload.emergency_contact,
          trainer_bio: payload.trainer_bio,
          instagram_url: payload.instagram_url,
          facebook_url: payload.facebook_url,
          twitter_url: payload.twitter_url,
          youtube_url: payload.youtube_url,
          tiktok_url: payload.tiktok_url,
          certifications: payload.certifications,
          certification_number: payload.certification_number,
          years_experience: payload.years_experience,
          education: payload.education,
          skills: payload.skills,
          languages: payload.languages,
          employment_type: payload.employment_type,
          branch_department: payload.branch_department,
          department: payload.department,
          salary: payload.salary,
          commission_percentage: payload.commission_percentage,
          working_days: payload.working_days,
          working_hours: payload.working_hours,
          max_client_capacity: payload.max_client_capacity,
          assigned_members: payload.assigned_members,
          availability: payload.availability,
          pt_sessions: payload.pt_sessions,
          leave_info: payload.leave_info,
          supervisor: payload.supervisor,
          shift: payload.shift,
          overtime_rate: payload.overtime_rate,
          responsibilities: payload.responsibilities,
          system_permissions: payload.system_permissions,
          joining_date: payload.joining_date,
          avatar_base64: payload.avatar_base64,
        });
        toast.success("Saved successfully");
      } else {
        const result = await createManagedUser(buildPayload());
        toast.success(result.message || "Created successfully");
      }
      handleOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : isEdit ? "Failed to save" : "Failed to create";
      const lower = message.toLowerCase();
      if (
        !isEdit &&
        (lower.includes("already exists") || lower.includes("email_exists"))
      ) {
        setEmailTaken(true);
        setStep(1);
      }
      if (
        lower.includes("phone number is already") ||
        lower.includes("phone_duplicate")
      ) {
        setPhoneTaken(true);
        setPhoneError("This phone number is already used by another account.");
        setStep(1);
      }
      if (
        lower.includes("emergency contact") ||
        lower.includes("phone_emergency")
      ) {
        setPhoneError("Emergency contact cannot be the same as phone number.");
        setStep(1);
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const completedSteps = useMemo(() => {
    if (isEdit) {
      return Array.from({ length: totalSteps }, (_, i) => i + 1);
    }
    return Array.from({ length: Math.max(0, step - 1) }, (_, i) => i + 1);
  }, [isEdit, step, totalSteps]);

  const activeStepMeta = steps[step - 1];

  const jumpToStep = (n: number) => {
    if (n < 1 || n > totalSteps) return;
    if (isEdit || n <= step) setStep(n);
  };

  const renderBasic = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20 border">
            <AvatarImage src={form.avatar_preview || undefined} />
            <AvatarFallback>{getNameInitials(fullName || "U")}</AvatarFallback>
          </Avatar>
          <Button
            type="button"
            size="icon"
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatar(e.target.files?.[0])}
          />
        </div>
        <p className="text-sm text-muted-foreground">Optional profile photo</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="first_name" label="First name *">
          <Input
            id="first_name"
            className={inputClass}
            value={form.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            placeholder="First name"
          />
        </Field>
        <Field id="last_name" label="Last name *">
          <Input
            id="last_name"
            className={inputClass}
            value={form.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            placeholder="Last name"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="Email *">
          <Input
            id="email"
            type="email"
            autoComplete="off"
            className={`${inputClass} ${
              emailTaken ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
            value={form.email}
            disabled={isEdit}
            aria-invalid={emailTaken}
            onChange={(e) => handleEmailChange(e.target.value)}
          />
          {!isEdit && checkingEmail && (
            <p className="text-xs text-muted-foreground">Checking email…</p>
          )}
          {!isEdit && emailTaken && (
            <p className="text-xs text-destructive">
              An account with this email already exists.
            </p>
          )}
        </Field>
        <Field id="phone" label="Phone">
          <Input
            id="phone"
            type="tel"
            autoComplete="off"
            className={`${inputClass} ${
              phoneTaken || phoneError
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }`}
            value={form.phone}
            aria-invalid={!!phoneTaken || !!phoneError}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
          {checkingPhone && (
            <p className="text-xs text-muted-foreground">Checking phone…</p>
          )}
          {(phoneTaken || phoneError) && (
            <p className="text-xs text-destructive">
              {phoneError || "This phone number is already used by another account."}
            </p>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="gender" label="Gender">
          <select
            id="gender"
            className={`flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${inputClass}`}
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </Field>
        <Field id="date_of_birth" label="Date of birth">
          <Input
            id="date_of_birth"
            type="date"
            className={inputClass}
            value={form.date_of_birth}
            onChange={(e) => set("date_of_birth", e.target.value)}
          />
        </Field>
      </div>
      <Field id="address" label="Address">
        <Input
          id="address"
          className={inputClass}
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="emergency_contact" label="Emergency contact">
          <Input
            id="emergency_contact"
            type="tel"
            autoComplete="off"
            className={`${inputClass} ${
              phonesMatch(form.phone, form.emergency_contact)
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }`}
            value={form.emergency_contact}
            aria-invalid={phonesMatch(form.phone, form.emergency_contact)}
            onChange={(e) => handleEmergencyChange(e.target.value)}
          />
          {phonesMatch(form.phone, form.emergency_contact) && (
            <p className="text-xs text-destructive">
              Emergency contact cannot be the same as phone number.
            </p>
          )}
        </Field>
        <Field id="account_status" label="Status">
          <select
            id="account_status"
            className={`flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${inputClass}`}
            value={form.account_status}
            onChange={(e) => set("account_status", e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="on_leave">On leave</option>
          </select>
        </Field>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-4">
      <Field id="account_email" label="Username / email">
        <Input id="account_email" className={inputClass} value={form.email} disabled />
      </Field>

      {form.role === "staff" && (
        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <div>
            <p className="text-sm font-medium">Enable login</p>
            <p className="text-xs text-muted-foreground">
              Off = record only (no admin panel access)
            </p>
          </div>
          <Switch
            checked={form.login_enabled}
            onCheckedChange={(checked) => set("login_enabled", checked)}
          />
        </div>
      )}

      {needsPassword && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="password" label="Password *">
            <Input
              id="password"
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </Field>
          <Field id="confirm_password" label="Confirm password *">
            <Input
              id="confirm_password"
              type="password"
              className={inputClass}
              value={form.confirm_password}
              onChange={(e) => set("confirm_password", e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">Role</p>
        <Badge className="bg-primary text-primary-foreground uppercase">{form.role}</Badge>
        {form.role === "admin" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Gym owner / co-admin. Verification email will be sent to{" "}
            {form.email || "their address"}.
          </p>
        )}
        {form.role === "super_admin" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Platform super admin with full Forge Gym access.
          </p>
        )}
        {form.role === "staff" && form.staff_type && (
          <p className="mt-2 text-xs text-muted-foreground">Position: {form.staff_type}</p>
        )}
      </div>

      {(form.role === "admin" ||
        form.role === "super_admin" ||
        form.role === "trainer" ||
        form.login_enabled) && (
        <div className="space-y-3">
          <p className="text-sm font-medium">System permissions</p>
          {PERMISSION_OPTIONS.filter((p) =>
            form.role === "staff" ? p.id === "front_desk" || p.id === "view_reports" : true,
          ).map((perm) => (
            <div
              key={perm.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <Label htmlFor={perm.id}>{perm.label}</Label>
              <Switch
                id={perm.id}
                checked={form.system_permissions.includes(perm.id)}
                onCheckedChange={(checked) => {
                  set(
                    "system_permissions",
                    checked
                      ? [...form.system_permissions, perm.id]
                      : form.system_permissions.filter((x) => x !== perm.id),
                  );
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={form.avatar_preview || undefined} />
          <AvatarFallback>{getNameInitials(fullName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{fullName}</p>
          <p className="text-sm text-muted-foreground">{form.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge className="uppercase">{form.role}</Badge>
            {form.role === "staff" && form.staff_type && (
              <Badge variant="outline">{form.staff_type}</Badge>
            )}
          </div>
        </div>
      </div>
      <Separator />
      <ReviewRow label="Phone" value={form.phone} />
      <ReviewRow label="Gender" value={form.gender} />
      <ReviewRow label="Address" value={form.address} />
      <ReviewRow label="Emergency contact" value={form.emergency_contact} />
      <ReviewRow label="Status" value={form.account_status} />
      {form.role === "user" && (
        <>
          <ReviewRow label="Plan" value={form.membership_type} />
          <ReviewRow label="Joined" value={form.joining_date} />
        </>
      )}
      {form.role === "trainer" && (
        <>
          <ReviewRow label="Specialization" value={form.specialization} />
          <ReviewRow label="Employment" value={form.employment_type} />
          <ReviewRow label="Working days" value={form.working_days} />
          <ReviewRow label="Availability" value={form.availability} />
          <ReviewRow label="Working hours" value={form.working_hours} />
          {SOCIAL_LINK_FIELDS.filter((f) => form[f.key].trim()).map((f) => (
            <ReviewRow key={f.key} label={f.label} value={form[f.key]} />
          ))}
        </>
      )}
      {form.role === "staff" && (
        <>
          <ReviewRow label="Staff type" value={form.staff_type} />
          <ReviewRow label="Department" value={form.department} />
          <ReviewRow label="Branch" value={form.branch_department} />
          <ReviewRow label="Supervisor" value={form.supervisor} />
          <ReviewRow label="Shift" value={form.shift} />
          <ReviewRow label="Salary" value={form.salary} />
          <ReviewRow
            label="Login"
            value={form.login_enabled ? "Enabled" : "Disabled"}
          />
        </>
      )}
      {form.role === "admin" && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          This admin will be created as an approved gym owner account.
        </p>
      )}
      {form.role === "super_admin" && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          This person will get <strong>full platform</strong> super admin access.
        </p>
      )}
    </div>
  );

  const renderMembership = () => (
    <div className="space-y-4">
      <Field id="membership_type" label="Membership plan">
        <select
          id="membership_type"
          className={`flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${inputClass}`}
          value={form.membership_type}
          onChange={(e) => set("membership_type", e.target.value)}
        >
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
          <option value="vip">VIP</option>
          <option value="staff">Staff</option>
        </select>
      </Field>
      <Field id="member_status" label="Membership status">
        <select
          id="member_status"
          className={`flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${inputClass}`}
          value={form.account_status}
          onChange={(e) => set("account_status", e.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
        </select>
      </Field>
      <Field id="joining_date" label="Join date">
        <Input
          id="joining_date"
          type="date"
          className={inputClass}
          value={form.joining_date}
          onChange={(e) => set("joining_date", e.target.value)}
        />
      </Field>
    </div>
  );

  const renderMemberBody = () => {
    if (step === 1) return renderBasic();
    if (step === 2) return renderMembership();
    return renderReview();
  };

  const renderTrainerBody = () => {
    switch (step) {
      case 1:
        return renderBasic();
      case 2:
        return (
          <div className="space-y-4">
            <Field id="specialization" label="Specialization">
              <Input
                id="specialization"
                className={inputClass}
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
              />
            </Field>
            <Field id="certifications" label="Certifications (comma-separated)">
              <Input
                id="certifications"
                className={inputClass}
                value={form.certifications}
                onChange={(e) => set("certifications", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="certification_number" label="Certification number">
                <Input
                  id="certification_number"
                  className={inputClass}
                  value={form.certification_number}
                  onChange={(e) => set("certification_number", e.target.value)}
                />
              </Field>
              <Field id="years_experience" label="Years of experience">
                <Input
                  id="years_experience"
                  className={inputClass}
                  value={form.years_experience}
                  onChange={(e) => set("years_experience", e.target.value)}
                />
              </Field>
            </div>
            <Field id="education" label="Education">
              <Input
                id="education"
                className={inputClass}
                value={form.education}
                onChange={(e) => set("education", e.target.value)}
              />
            </Field>
            <Field id="skills" label="Skills (comma-separated)">
              <Input
                id="skills"
                className={inputClass}
                value={form.skills}
                onChange={(e) => set("skills", e.target.value)}
              />
            </Field>
            <Field id="languages" label="Languages (comma-separated)">
              <Input
                id="languages"
                className={inputClass}
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
              />
            </Field>
            <Field id="trainer_bio" label="Trainer bio">
              <Textarea
                id="trainer_bio"
                rows={3}
                className={inputClass}
                value={form.trainer_bio}
                onChange={(e) => set("trainer_bio", e.target.value)}
              />
            </Field>
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div>
                <p className="text-sm font-medium">Social links</p>
                <p className="text-xs text-muted-foreground">
                  Optional — only links you add will show on the public trainer page.
                </p>
              </div>
              {openSocials.length > 0 && (
                <div className="space-y-3">
                  {SOCIAL_LINK_FIELDS.filter((f) => openSocials.includes(f.key)).map((platform) => (
                    <div key={platform.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={platform.key}>{platform.label}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            set(platform.key, "");
                            setOpenSocials((prev) => prev.filter((k) => k !== platform.key));
                          }}
                          aria-label={`Remove ${platform.label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        id={platform.key}
                        className={inputClass}
                        placeholder={platform.placeholder}
                        value={form[platform.key]}
                        onChange={(e) => set(platform.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {SOCIAL_LINK_FIELDS.some((f) => !openSocials.includes(f.key)) && (
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_LINK_FIELDS.filter((f) => !openSocials.includes(f.key)).map(
                    (platform) => (
                      <Button
                        key={platform.key}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOpenSocials((prev) =>
                            prev.includes(platform.key) ? prev : [...prev, platform.key],
                          )
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {platform.label}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="joining_date" label="Joining date">
                <Input
                  id="joining_date"
                  type="date"
                  className={inputClass}
                  value={form.joining_date}
                  onChange={(e) => set("joining_date", e.target.value)}
                />
              </Field>
              <Field id="employment_type" label="Employment type">
                <Input
                  id="employment_type"
                  className={inputClass}
                  value={form.employment_type}
                  onChange={(e) => set("employment_type", e.target.value)}
                />
              </Field>
            </div>
            <Field id="branch_department" label="Branch / department">
              <Input
                id="branch_department"
                className={inputClass}
                value={form.branch_department}
                onChange={(e) => set("branch_department", e.target.value)}
              />
            </Field>
            <Field id="salary" label="Salary">
              <Input
                id="salary"
                className={inputClass}
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
              />
            </Field>

            <SchedulePicker
              availability={form.availability}
              workingDays={form.working_days}
              workingHours={form.working_hours}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  availability: next.availability,
                  working_days: next.working_days,
                  working_hours: next.working_hours,
                }))
              }
              inputClass={inputClass}
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <Field id="max_client_capacity" label="Maximum client capacity">
              <Input
                id="max_client_capacity"
                className={inputClass}
                value={form.max_client_capacity}
                onChange={(e) => set("max_client_capacity", e.target.value)}
              />
            </Field>
            <Field id="pt_sessions" label="Personal training sessions">
              <Input
                id="pt_sessions"
                className={inputClass}
                value={form.pt_sessions}
                onChange={(e) => set("pt_sessions", e.target.value)}
              />
            </Field>
            <Field id="leave_info" label="Leave information">
              <Textarea
                id="leave_info"
                rows={2}
                className={inputClass}
                value={form.leave_info}
                onChange={(e) => set("leave_info", e.target.value)}
              />
            </Field>
          </div>
        );
      case 5:
        return renderAccount();
      case 6:
        return renderReview();
      default:
        return null;
    }
  };

  const renderStaffBody = () => {
    switch (step) {
      case 1:
        return renderBasic();
      case 2:
        return (
          <div className="space-y-4">
            <Field id="staff_type" label="Staff type / position *">
              <div className="flex flex-wrap gap-2">
                {STAFF_TYPES.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={
                      t === "Other"
                        ? !STAFF_TYPES.slice(0, -1).includes(form.staff_type)
                          ? "default"
                          : "outline"
                        : form.staff_type === t
                          ? "default"
                          : "outline"
                    }
                    onClick={() => set("staff_type", t === "Other" ? "" : t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              {!STAFF_TYPES.slice(0, -1).includes(form.staff_type) && (
                <Input
                  className={`mt-2 ${inputClass}`}
                  placeholder="Custom position"
                  value={form.staff_type}
                  onChange={(e) => set("staff_type", e.target.value)}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="department" label="Department">
                <Input
                  id="department"
                  className={inputClass}
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </Field>
              <Field id="branch" label="Branch">
                <Input
                  id="branch"
                  className={inputClass}
                  value={form.branch_department}
                  onChange={(e) => set("branch_department", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="joining_date_s" label="Joining date">
                <Input
                  id="joining_date_s"
                  type="date"
                  className={inputClass}
                  value={form.joining_date}
                  onChange={(e) => set("joining_date", e.target.value)}
                />
              </Field>
              <Field id="employment_type_s" label="Employment type">
                <Input
                  id="employment_type_s"
                  className={inputClass}
                  placeholder="full-time / part-time"
                  value={form.employment_type}
                  onChange={(e) => set("employment_type", e.target.value)}
                />
              </Field>
            </div>
            <Field id="supervisor" label="Supervisor">
              <Input
                id="supervisor"
                className={inputClass}
                value={form.supervisor}
                onChange={(e) => set("supervisor", e.target.value)}
              />
            </Field>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="working_days_s" label="Working days">
                <Input
                  id="working_days_s"
                  className={inputClass}
                  value={form.working_days}
                  onChange={(e) => set("working_days", e.target.value)}
                />
              </Field>
              <Field id="shift" label="Shift">
                <Input
                  id="shift"
                  className={inputClass}
                  placeholder="Morning / Evening / Night"
                  value={form.shift}
                  onChange={(e) => set("shift", e.target.value)}
                />
              </Field>
            </div>
            <Field id="working_hours_s" label="Working hours">
              <Input
                id="working_hours_s"
                className={inputClass}
                value={form.working_hours}
                onChange={(e) => set("working_hours", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="salary_s" label="Salary">
                <Input
                  id="salary_s"
                  className={inputClass}
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </Field>
              <Field id="overtime_rate" label="Overtime rate">
                <Input
                  id="overtime_rate"
                  className={inputClass}
                  value={form.overtime_rate}
                  onChange={(e) => set("overtime_rate", e.target.value)}
                />
              </Field>
            </div>
            <Field id="responsibilities" label="Responsibilities">
              <Textarea
                id="responsibilities"
                rows={3}
                className={inputClass}
                value={form.responsibilities}
                onChange={(e) => set("responsibilities", e.target.value)}
              />
            </Field>
          </div>
        );
      case 4:
        return renderAccount();
      case 5:
        return renderReview();
      default:
        return null;
    }
  };

  const renderAdminBody = () => {
    if (step === 1) return renderBasic();
    if (step === 2) return renderAccount();
    return renderReview();
  };

  const platformOnly =
    allowedRoles.every((r) => r === "super_admin" || r === "admin") &&
    allowedRoles.includes("super_admin");

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {isEdit
              ? form.role === "trainer"
                ? "Edit trainer"
                : form.role === "super_admin"
                  ? "Edit super admin"
                  : form.role === "admin"
                    ? "Edit admin"
                    : form.role === "staff"
                      ? "Edit staff"
                      : form.role === "user"
                        ? "Edit member"
                        : "Edit user"
              : platformOnly
                ? "Add platform user"
                : roleLocked && initialRole === "trainer"
                  ? "Add trainer"
                  : roleLocked && initialRole === "admin"
                    ? "Add admin"
                    : roleLocked && initialRole === "staff"
                      ? "Add staff"
                      : "Add gym staff"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update details using the same stepped form. Click any step to jump and edit."
              : platformOnly
                ? "Create a platform super admin or gym owner admin."
                : roleLocked && initialRole === "trainer"
                  ? "Add a trainer for your gym only."
                  : "Add a co-admin or staff member for your gym only."}
          </SheetDescription>
        </SheetHeader>

        {!roleLocked && (
          <div
            className={`mt-4 grid gap-2 ${
              allowedRoles.length <= 2 ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {allowedRoles.includes("super_admin") && (
              <Button
                type="button"
                variant={form.role === "super_admin" ? "default" : "outline"}
                className="gap-1 px-2"
                onClick={() => handleRoleChange("super_admin")}
              >
                <Crown className="h-4 w-4" />
                Super admin
              </Button>
            )}
            {allowedRoles.includes("admin") && (
              <Button
                type="button"
                variant={form.role === "admin" ? "default" : "outline"}
                className="gap-1 px-2"
                onClick={() => handleRoleChange("admin")}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            )}
            {allowedRoles.includes("trainer") && (
              <Button
                type="button"
                variant={form.role === "trainer" ? "default" : "outline"}
                className="gap-1 px-2"
                onClick={() => handleRoleChange("trainer")}
              >
                <Dumbbell className="h-4 w-4" />
                Trainer
              </Button>
            )}
            {allowedRoles.includes("staff") && (
              <Button
                type="button"
                variant={form.role === "staff" ? "default" : "outline"}
                className="gap-1 px-2"
                onClick={() => handleRoleChange("staff")}
              >
                <HardHat className="h-4 w-4" />
                Staff
              </Button>
            )}
            {allowedRoles.includes("user") && (
              <Button
                type="button"
                variant={form.role === "user" ? "default" : "outline"}
                className="gap-1 px-2"
                onClick={() => handleRoleChange("user")}
              >
                <User className="h-4 w-4" />
                Member
              </Button>
            )}
          </div>
        )}

        <div className="mt-5 w-full shrink-0 space-y-3">
          {activeStepMeta && (
            <header>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Step {step} of {totalSteps}
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {activeStepMeta.title}
              </h3>
              {activeStepMeta.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeStepMeta.description}
                </p>
              )}
            </header>
          )}
          <Stepper
            steps={steps}
            currentStep={step}
            completedSteps={completedSteps}
            onStepClick={jumpToStep}
          />
        </div>

        <div className="mt-4 flex-1">
          {form.role === "admin" || form.role === "super_admin"
            ? renderAdminBody()
            : form.role === "trainer"
              ? renderTrainerBody()
              : form.role === "user"
                ? renderMemberBody()
                : renderStaffBody()}
        </div>

        <SheetFooter className="mt-6 gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? () => handleOpenChange(false) : goBack}
            disabled={saving}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < totalSteps ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Saving…" : "Creating…"}
                </>
              ) : isEdit ? (
                `Save ${form.role === "super_admin" ? "super admin" : form.role}`
              ) : (
                `Create ${form.role === "super_admin" ? "super admin" : form.role}`
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
