/** Gym-owner platform free trial helpers (1 month from superadmin approval). */

export type TrialStatus = "pending_approval" | "active" | "expired" | "none";

export type TrialInfo = {
  offered: boolean;
  status: TrialStatus;
  startsAt: string | null;
  endsAt: string | null;
  daysLeft: number | null;
  label: string;
};

export function addOneMonth(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export function computeTrialInfo(input: {
  isSuperAdmin?: boolean | null;
  isGymOwnerAdmin?: boolean;
  adminApproved?: boolean | null;
  trialOffered?: boolean | null;
  trialStartsAt?: string | null;
  trialEndsAt?: string | null;
  now?: Date;
}): TrialInfo {
  const now = input.now || new Date();

  if (input.isSuperAdmin || !input.isGymOwnerAdmin) {
    return {
      offered: false,
      status: "none",
      startsAt: null,
      endsAt: null,
      daysLeft: null,
      label: "No trial",
    };
  }

  const offered = input.trialOffered === true;
  const startsAt = input.trialStartsAt || null;
  const endsAt = input.trialEndsAt || null;

  if (!input.adminApproved) {
    return {
      offered: offered || true,
      status: "pending_approval",
      startsAt: null,
      endsAt: null,
      daysLeft: null,
      label: "1-month free trial starts after super admin approval",
    };
  }

  if (!startsAt || !endsAt) {
    return {
      offered,
      status: offered ? "pending_approval" : "none",
      startsAt,
      endsAt,
      daysLeft: null,
      label: offered
        ? "Trial pending activation"
        : "No active trial",
    };
  }

  const end = new Date(endsAt);
  const msLeft = end.getTime() - now.getTime();
  // Match live countdown day digit (whole days remaining)
  const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000));

  if (msLeft <= 0) {
    return {
      offered: true,
      status: "expired",
      startsAt,
      endsAt,
      daysLeft: 0,
      label: "Free trial ended",
    };
  }

  return {
    offered: true,
    status: "active",
    startsAt,
    endsAt,
    daysLeft,
    label:
      daysLeft === 1
        ? "1 day left on free trial"
        : `${daysLeft} days left on free trial`,
  };
}

/** Fields to set when superadmin approves a gym owner (starts 1-month trial). */
export function trialActivationPatch(now = new Date()) {
  const starts = now;
  const ends = addOneMonth(starts);
  return {
    trial_offered: true,
    trial_starts_at: starts.toISOString(),
    trial_ends_at: ends.toISOString(),
  };
}
