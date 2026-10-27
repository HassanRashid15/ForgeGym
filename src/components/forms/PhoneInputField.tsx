"use client";

import PhoneInput, {
  type Country,
  type Value,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

/**
 * Wrap SVG flags so they always get size classes.
 * Library's default Flag ignores className when using the `flags` map.
 */
function Flag({
  country,
  countryName,
  className,
}: {
  country: Country;
  countryName?: string;
  className?: string;
}) {
  const FlagSvg = flags[country];
  const cls = cn("PhoneInputCountryIconImg", className);
  if (FlagSvg) {
    return (
      <span className={cls} aria-hidden={!countryName}>
        <FlagSvg title={countryName} />
      </span>
    );
  }
  return (
    <img
      alt={countryName || country}
      className={cls}
      src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country}.svg`}
    />
  );
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  /** Default dial country (flag + code). PK = +92 */
  defaultCountry?: Country;
  className?: string;
  /** Register (dark zinc) vs profile / default form */
  tone?: "register" | "default";
};

/**
 * International phone field with country flag + dial code.
 * Uses SVG flags (not emoji) so they render on Windows.
 * Value is E.164 (e.g. +923001234567) or "" when empty.
 */
export function PhoneInputField({
  id,
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "300 1234567",
  defaultCountry = "PK",
  className,
  tone = "default",
}: Props) {
  return (
    <PhoneInput
      id={id}
      international
      withCountryCallingCode
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      flagComponent={Flag}
      value={(value || undefined) as Value | undefined}
      onChange={(next) => onChange(next || "")}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "PhoneInputField",
        tone === "register" && "PhoneInputField--register",
        tone === "default" && "PhoneInputField--default",
        invalid && "PhoneInputField--invalid",
        className,
      )}
      numberInputProps={{
        "aria-invalid": invalid || undefined,
      }}
    />
  );
}
