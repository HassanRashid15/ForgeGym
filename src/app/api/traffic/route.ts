import { NextResponse } from "next/server";
import { recordPublicTraffic } from "@/lib/public-traffic";

/**
 * POST /api/traffic — record a public-site page approach (anonymous).
 */
export async function POST(request: Request) {
  let body: { path?: string; referrer?: string | null } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await recordPublicTraffic(request, body);
  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, skipped: Boolean(result.skipped) });
}
