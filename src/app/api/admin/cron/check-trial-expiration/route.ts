import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/cron/check-trial-expiration
 * Scheduled job to check for expired trials and freeze accounts
 * This should be called by a cron job (e.g., daily or hourly)
 *
 * For gym owners: checks trial_ends_at from admin trial system
 * For members: checks membership trial expiration if applicable
 */
export async function POST(request: Request) {
  // Fail closed: refuse to run when no secret is configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("check-trial-expiration: CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured — missing CRON_SECRET" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfigured — missing service role key" },
      { status: 500 },
    );
  }

  const now = new Date();
  let frozenCount = 0;
  const errors: string[] = [];

  try {
    // Check for gym owners with expired trials
    const { data: expiredOwners, error: ownersError } = await service
      .from("profiles")
      .select("user_id, trial_ends_at, is_frozen")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", now.toISOString())
      .eq("is_frozen", false);

    if (ownersError) {
      errors.push(`Failed to fetch expired owners: ${ownersError.message}`);
    } else {
      for (const owner of expiredOwners || []) {
        const { error: updateError } = await service
          .from("profiles")
          .update({
            is_frozen: true,
            frozen_until: null, // Requires manual approval
            freeze_reason: "trial_expiration",
          })
          .eq("user_id", owner.user_id);

        if (updateError) {
          errors.push(`Failed to freeze owner ${owner.user_id}: ${updateError.message}`);
        } else {
          frozenCount++;
        }
      }
    }

    // Check for members with expired membership trials (if you have a trial system for members)
    // This assumes you have a membership_trial_ends_at column or similar
    // Adjust based on your actual membership trial implementation
    const { data: expiredMembers, error: membersError } = await service
      .from("profiles")
      .select("user_id, membership_trial_ends_at, is_frozen")
      .not("membership_trial_ends_at", "is", null)
      .lt("membership_trial_ends_at", now.toISOString())
      .eq("is_frozen", false);

    if (membersError) {
      // If column doesn't exist, ignore (not all setups have member trials)
      if (!membersError.message.includes("column")) {
        errors.push(`Failed to fetch expired members: ${membersError.message}`);
      }
    } else {
      for (const member of expiredMembers || []) {
        const { error: updateError } = await service
          .from("profiles")
          .update({
            is_frozen: true,
            frozen_until: null,
            freeze_reason: "trial_expiration",
          })
          .eq("user_id", member.user_id);

        if (updateError) {
          errors.push(`Failed to freeze member ${member.user_id}: ${updateError.message}`);
        } else {
          frozenCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      frozenCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}

// Also support GET for testing (with secret in query param - less secure but convenient for testing)
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("check-trial-expiration: CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured — missing CRON_SECRET" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse POST logic
  return POST(request);
}
