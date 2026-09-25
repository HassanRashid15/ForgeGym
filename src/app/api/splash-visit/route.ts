import { NextResponse } from "next/server";
import {
  claimFirstSplashVisit,
  getClientIpFromHeaders,
} from "@/lib/splash-visitors";

/**
 * POST — record this visitor IP for the home preloader (once).
 * Returns { isFirstVisit: boolean }.
 */
export async function POST(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const ua = request.headers.get("user-agent");
  const { isFirstVisit } = await claimFirstSplashVisit(ip, ua);
  return NextResponse.json({ ok: true, isFirstVisit, ip: ip === "unknown" ? null : ip });
}
