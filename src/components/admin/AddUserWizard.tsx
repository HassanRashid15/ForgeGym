"use client";

import { useMemo, useRef, useState } from "react";
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
import { Camera, Loader2, Shield, Dumbbell, HardHat } from "lucide-react";
import { toast } from "sonner";
import { createManagedUser, type CreateStaffPayload } from "@/api/admin-users";
import { getNameInitials } from "@/lib/utils";

export type StaffCreateRole = "admin" | "trainer" | "staff";

const TRAINER_STEPS = [
  { id: "basic", title: "Basic" },
  { id: "pro", title: "Professional" },
  { id: "job", title: "Employment" },
  { id: "gym", title: "Gym" },
  { id: "account", title: "Account" },
  { id: "review", title: "Review" },
];

const ADMIN_STEPS = [
  { id: "basic", title: "Basic" },
  { id: "account", title: "Account" },
  { id: "review", title: "Review" },
];

const STAFF_STEPS = [
  { id: "basic", title: "Basic" },
  { id: "job", title: "Job" },
  { id: "work", title: "Work" },
  { id: "account", title: "Account" },
  { id: "review", title: "Review" },
];

const STAFF_TYPES = [
  "Sweeper",
  "Receptionist",
  "Security",
  "Cleaner",
  "Maintenance",
  "Other",
];

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
  joining_date: new Date().toISOString().split("T")[0],
  employment_type: "full-time",
  branch_department: "",
  department: "",
  salary: "",
  commission_percentage: "",
  working_days: "Mon–Fri",
  working_hours: "9am – 5pm",
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

type AddUserWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddUserWizard({ open, onOpenChange, onCreated }: AddUserWizardProps) {
  const [form, setForm] = useState<WizardFormState>(emptyForm);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps =
    form.role === "admin"
      ? ADMIN_STEPS
      : form.role === "trainer"
        ? TRAINER_STEPS
        : STAFF_STEPS;
  const totalSteps = steps.length;
  const inputClass = "bg-background";

  const set = <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setForm(emptyForm());
    setStep(1);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

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

  const needsPassword = form.role !== "staff" || form.login_enabled;

  const fullName = [form.first_name, form.last_name].map((s) => s.trim()).filter(Boolean).join(" ");

  const validateStep = (): boolean => {
    const isAccountStep =
      (form.role === "trainer" && step === 5) ||
      (form.role === "admin" && step === 2) ||
      (form.role === "staff" && step === 4);

    if (step === 1) {
      if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
        toast.error("First name, last name, and email are required");
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
      const result = await createManagedUser(buildPayload());
      toast.success(result.message || "Created successfully");
      handleOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const completedSteps = useMemo(
    () => Array.from({ length: Math.max(0, step - 1) }, (_, i) => i + 1),
    [step],
  );

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
            className={inputClass}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field id="phone" label="Phone">
          <Input
            id="phone"
            className={inputClass}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
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
            className={inputClass}
            value={form.emergency_contact}
            onChange={(e) => set("emergency_contact", e.target.value)}
          />
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
            Co-admin for <strong>your gym only</strong>. Verification email will be sent to{" "}
            {form.email || "their address"}.
          </p>
        )}
        {form.role === "staff" && form.staff_type && (
          <p className="mt-2 text-xs text-muted-foreground">Position: {form.staff_type}</p>
        )}
      </div>

      {(form.role === "admin" || form.role === "trainer" || form.login_enabled) && (
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
      <ReviewRow label="Status" value={form.account_status} />
      {form.role === "trainer" && (
        <>
          <ReviewRow label="Specialization" value={form.specialization} />
          <ReviewRow label="Employment" value={form.employment_type} />
          <ReviewRow label="Working days" value={form.working_days} />
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
          This co-admin will belong to <strong>your gym</strong> and receive a verification
          email.
        </p>
      )}
    </div>
  );

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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="salary" label="Salary">
                <Input
                  id="salary"
                  className={inputClass}
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </Field>
              <Field id="commission_percentage" label="Commission %">
                <Input
                  id="commission_percentage"
                  type="number"
                  className={inputClass}
                  value={form.commission_percentage}
                  onChange={(e) => set("commission_percentage", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="working_days" label="Working days">
                <Input
                  id="working_days"
                  className={inputClass}
                  value={form.working_days}
                  onChange={(e) => set("working_days", e.target.value)}
                />
              </Field>
              <Field id="working_hours" label="Working hours">
                <Input
                  id="working_hours"
                  className={inputClass}
                  value={form.working_hours}
                  onChange={(e) => set("working_hours", e.target.value)}
                />
              </Field>
            </div>
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
            <Field id="assigned_members" label="Assigned members (comma-separated)">
              <Textarea
                id="assigned_members"
                rows={2}
                className={inputClass}
                value={form.assigned_members}
                onChange={(e) => set("assigned_members", e.target.value)}
              />
            </Field>
            <Field id="availability" label="Availability">
              <Input
                id="availability"
                className={inputClass}
                value={form.availability}
                onChange={(e) => set("availability", e.target.value)}
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add gym staff</SheetTitle>
          <SheetDescription>
            Add a co-admin, trainer, or staff member for <strong>your gym only</strong>.
            Roles: Admin → Trainer → Staff → Member.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={form.role === "admin" ? "default" : "outline"}
            className="gap-1 px-2"
            onClick={() => handleRoleChange("admin")}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Button>
          <Button
            type="button"
            variant={form.role === "trainer" ? "default" : "outline"}
            className="gap-1 px-2"
            onClick={() => handleRoleChange("trainer")}
          >
            <Dumbbell className="h-4 w-4" />
            Trainer
          </Button>
          <Button
            type="button"
            variant={form.role === "staff" ? "default" : "outline"}
            className="gap-1 px-2"
            onClick={() => handleRoleChange("staff")}
          >
            <HardHat className="h-4 w-4" />
            Staff
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <Stepper steps={steps} currentStep={step} completedSteps={completedSteps} />
        </div>

        <div className="mt-4 flex-1">
          {form.role === "admin"
            ? renderAdminBody()
            : form.role === "trainer"
              ? renderTrainerBody()
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
                  Creating…
                </>
              ) : (
                `Create ${form.role}`
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
