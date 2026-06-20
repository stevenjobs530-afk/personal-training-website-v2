import { type NextRequest, NextResponse } from "next/server";
import {
  dashboardPath,
  getLoginRedirectUrl,
  isProtectedPath,
  loginPath,
} from "@/lib/auth/routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSupabaseEnv()) {
    if (isProtectedPath(pathname)) {
      return NextResponse.redirect(getLoginRedirectUrl(request.nextUrl));
    }

    return NextResponse.next();
  }

  const { claims, response } = await updateSession(request);

  if (isProtectedPath(pathname) && !claims) {
    return NextResponse.redirect(getLoginRedirectUrl(request.nextUrl));
  }

  if (pathname === loginPath && claims) {
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
