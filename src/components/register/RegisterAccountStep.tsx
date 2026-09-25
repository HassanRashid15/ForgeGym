"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import {
  ArrowRight,
  LockKeyhole,
  Loader2,
  Mail,
  UserRound,
  Eye,
  EyeOff,
  Check,
  Phone,
  CheckCircle2,
  AlertCircle,
  Shield,
  Building2,
  Dumbbell,
} from "lucide-react";
import type { AccountType, PublicGym, RegisterStep1Errors } from "./types";
import { getGymTrainers } from "@/api/gyms";
import { feeBreakdownLabel, formatCombinedFee } from "@/lib/fees";

const inputCls = (hasError: boolean) =>
  `h-11 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
    hasError
      ? "border-red-500 bg-red-500/10 focus-visible:border-red-500"
      : "border-zinc-700 bg-zinc-900 focus-visible:border-red-400"
  }`;

type GymTrainerOption = {
  userId: string;
  fullName: string | null;
  specialization: string | null;
};

export type RegisterAccountStepProps = {
  isLoading: boolean;
  accountType: AccountType;
  setAccountType: (v: AccountType) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onPhoneChange?: (v: string) => void;
  checkingPhone?: boolean;
  phoneTaken?: boolean;
  address: string;
  setAddress: (v: string) => void;
  onAddressPlace?: (place: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    lat?: number | null;
    lon?: number | null;
  }) => void;
  emergencyContact: string;
  setEmergencyContact: (v: string) => void;
  onEmergencyContactChange?: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  errors: RegisterStep1Errors;
  setErrors: (
    updater:
      | RegisterStep1Errors
      | ((prev: RegisterStep1Errors) => RegisterStep1Errors),
  ) => void;
  checkingEmail: boolean;
  emailCheckedOk: boolean;
  gyms: PublicGym[];
  loadingGyms: boolean;
  selectedGymOwnerId: string;
  setSelectedGymOwnerId: (v: string) => void;
  preferredTrainerId: string;
  setPreferredTrainerId: (v: string) => void;
  preferredTrainerLabel: string;
  setPreferredTrainerLabel: (v: string) => void;
  gymLockedFromUrl: boolean;
  queryGymOwnerId: string;
  hasMinLength: boolean;
  hasUpperLower: boolean;
  hasNumber: boolean;
  doPasswordsMatch: boolean;
  passwordMismatch: boolean;
  passwordStrength: string;
  onSubmit: (e: React.FormEvent) => void;
};

export function RegisterAccountStep({
  isLoading,
  accountType,
  setAccountType,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  onEmailChange,
  phone,
  setPhone,
  onPhoneChange,
  checkingPhone = false,
  phoneTaken = false,
  address,
  setAddress,
  onAddressPlace,
  emergencyContact,
  setEmergencyContact,
  onEmergencyContactChange,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  agreeTerms,
  setAgreeTerms,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  errors,
  setErrors,
  checkingEmail,
  emailCheckedOk,
  gyms,
  loadingGyms,
  selectedGymOwnerId,
  setSelectedGymOwnerId,
  preferredTrainerId,
  setPreferredTrainerId,
  preferredTrainerLabel: _preferredTrainerLabel,
  setPreferredTrainerLabel,
  gymLockedFromUrl,
  queryGymOwnerId,
  hasMinLength,
  hasUpperLower,
  hasNumber,
  doPasswordsMatch,
  passwordMismatch,
  passwordStrength,
  onSubmit,
}: RegisterAccountStepProps) {
  const [trainers, setTrainers] = useState<GymTrainerOption[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  useEffect(() => {
    if (accountType !== "customer" || !selectedGymOwnerId) {
      setTrainers([]);
      setLoadingTrainers(false);
      return;
    }

    let cancelled = false;
    setLoadingTrainers(true);

    getGymTrainers(selectedGymOwnerId)
      .then((data) => {
        if (cancelled) return;
        setTrainers((data.trainers || []) as GymTrainerOption[]);
      })
      .catch(() => {
        if (!cancelled) setTrainers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTrainers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountType, selectedGymOwnerId]);

  useEffect(() => {
    if (!preferredTrainerId) {
      setPreferredTrainerLabel("");
      return;
    }
    if (!trainers.some((t) => t.userId === preferredTrainerId)) {
      setPreferredTrainerId("");
      setPreferredTrainerLabel("");
    }
  }, [trainers, preferredTrainerId, setPreferredTrainerId, setPreferredTrainerLabel]);

  return (
    <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-4">
      <div className="space-y-2">
        <Label className="text-zinc-300 font-medium text-sm">Register as</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              setPreferredTrainerId("");
              setPreferredTrainerLabel("");
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
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
        <div className="min-w-0 space-y-1.5">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
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
              onChange={(e) => onEmailChange(e.target.value)}
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
        <div className="min-w-0 space-y-1.5">
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
              onChange={(e) =>
                onPhoneChange ? onPhoneChange(e.target.value) : setPhone(e.target.value)
              }
              disabled={isLoading}
              aria-invalid={!!errors.phone || phoneTaken}
              className={`${inputCls(!!errors.phone || phoneTaken)} pl-10`}
            />
          </div>
          {checkingPhone && (
            <p className="text-xs text-zinc-500">Checking phone…</p>
          )}
          {(errors.phone || phoneTaken) && (
            <p className="text-xs text-red-400">
              {errors.phone || "This phone number is already used by another account."}
            </p>
          )}
        </div>
      </div>

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
          onChange={({ address: next, city, region, country, lat, lon }) => {
            setAddress(next);
            onAddressPlace?.({ city, region, country, lat, lon });
          }}
        />
      </div>

      {accountType === "customer" && (
        <div className="space-y-3">
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
                  setPreferredTrainerId("");
                  setPreferredTrainerLabel("");
                  if (errors.gymOwnerId) setErrors({ ...errors, gymOwnerId: undefined });
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
                    {gymLockedFromUrl && g.ownerId === queryGymOwnerId ? " ★" : ""}
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

          {selectedGymOwnerId && (
            <div className="space-y-1.5">
              <Label htmlFor="preferredTrainer" className="text-zinc-300 font-medium text-sm">
                Preferred Trainer{" "}
                <span className="text-zinc-500 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <Dumbbell
                  className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    preferredTrainerId ? "text-red-400" : "text-zinc-400"
                  }`}
                />
                <select
                  id="preferredTrainer"
                  value={preferredTrainerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPreferredTrainerId(id);
                    const t = trainers.find((x) => x.userId === id);
                    setPreferredTrainerLabel(
                      t
                        ? `${t.fullName || "Trainer"}${t.specialization ? ` — ${t.specialization}` : ""}`
                        : "",
                    );
                  }}
                  disabled={isLoading || loadingTrainers}
                  className={`${inputCls(false)} pl-10 pr-10 appearance-none`}
                >
                  <option value="">
                    {loadingTrainers
                      ? "Loading trainers…"
                      : trainers.length === 0
                        ? "No trainers at this gym yet"
                        : "No preferred trainer"}
                  </option>
                  {trainers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.fullName || "Trainer"}
                      {t.specialization ? ` — ${t.specialization}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Optional — pick a trainer if you want one. Monthly fee auto-adjusts
                (gym fee + trainer fee).
              </p>
              {(() => {
                const gym = gyms.find((g) => g.ownerId === selectedGymOwnerId);
                const monthly = gym?.monthlyFee?.trim() || null;
                const trainer = gym?.trainerFee?.trim() || null;
                if (!monthly && !trainer) return null;
                const withTrainer = Boolean(preferredTrainerId);
                const total = formatCombinedFee(monthly, trainer, withTrainer);
                return (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-xs text-zinc-300 space-y-1">
                    <p className="flex justify-between gap-2">
                      <span>Gym monthly</span>
                      <span className="font-medium text-white">{monthly || "—"}</span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span>Trainer fee</span>
                      <span className="font-medium text-white">
                        {withTrainer ? trainer || "—" : "Not added"}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2 border-t border-zinc-700 pt-1.5 text-sm text-white">
                      <span>Estimated total</span>
                      <span className="font-semibold text-red-400">
                        {total || "—"}
                      </span>
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {feeBreakdownLabel(monthly, trainer, withTrainer)}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
            onChange={(e) =>
              onEmergencyContactChange
                ? onEmergencyContactChange(e.target.value)
                : setEmergencyContact(e.target.value)
            }
            disabled={isLoading}
            aria-invalid={!!errors.emergencyContact}
            className={`${inputCls(!!errors.emergencyContact)} pl-10`}
          />
        </div>
        {errors.emergencyContact && (
          <p className="text-xs text-red-400">{errors.emergencyContact}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
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
        <div className="min-w-0 space-y-1.5">
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
  );
}
