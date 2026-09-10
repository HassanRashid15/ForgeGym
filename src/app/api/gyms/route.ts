import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/** GET /api/gyms — public list of approved gyms */
export async function GET() {
  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: roles } = await service
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  const adminIds = [...new Set((roles || []).map((r) => r.user_id).filter(Boolean))];
  if (adminIds.length === 0) {
    return NextResponse.json({ gyms: [] });
  }

  const { data: profiles, error } = await service
    .from("profiles")
    .select(
      "user_id, full_name, gym_name, gym_type, gym_city, gym_facilities, gym_services, gym_peak_hours, gym_member_capacity, gym_years_operating, avatar_url, admin_approved, is_super_admin",
    )
    .in("user_id", adminIds)
    .eq("admin_approved", true)
    .eq("is_super_admin", false)
    .not("gym_name", "is", null)
    .order("gym_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const gyms = (profiles || [])
    .filter((p) => (p.gym_name || "").trim().length > 0)
    .map((p) => ({
      ownerId: p.user_id,
      gymName: p.gym_name,
      gymType: p.gym_type,
      gymCity: p.gym_city,
      facilities: p.gym_facilities || [],
      services: p.gym_services || [],
      peakHours: p.gym_peak_hours,
      capacity: p.gym_member_capacity,
      yearsOperating: p.gym_years_operating,
      ownerName: p.full_name,
      avatarUrl: p.avatar_url,
    }));

  return NextResponse.json({ gyms });
}
