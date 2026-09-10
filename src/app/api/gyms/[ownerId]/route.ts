import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ ownerId: string }> };

/** GET /api/gyms/[ownerId] — public gym detail */
export async function GET(_request: Request, { params }: Params) {
  const { ownerId } = await params;
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: profile, error } = await service
    .from("profiles")
    .select(
      "user_id, full_name, email, phone, address, gym_name, gym_type, gym_city, gym_facilities, gym_services, gym_peak_hours, gym_member_capacity, gym_years_operating, gym_operating_days, avatar_url, bio, admin_approved, is_super_admin",
    )
    .eq("user_id", ownerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!profile || profile.is_super_admin || !profile.admin_approved || !profile.gym_name) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  const { data: roleRows } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", ownerId);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  return NextResponse.json({
    gym: {
      ownerId: profile.user_id,
      gymName: profile.gym_name,
      gymType: profile.gym_type,
      gymCity: profile.gym_city,
      facilities: profile.gym_facilities || [],
      services: profile.gym_services || [],
      peakHours: profile.gym_peak_hours,
      capacity: profile.gym_member_capacity,
      yearsOperating: profile.gym_years_operating,
      operatingDays: profile.gym_operating_days,
      ownerName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
    },
  });
}
