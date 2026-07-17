import { NextRequest, NextResponse } from "next/server";
import { PORTAL_COOKIE, REFRESH_COOKIE } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const accountType = request.cookies.get(PORTAL_COOKIE)?.value ?? null;
  const hasSession = Boolean(accountType && request.cookies.get(REFRESH_COOKIE)?.value);
  return NextResponse.json(
    { account_type: hasSession ? accountType : null, authenticated: hasSession },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
