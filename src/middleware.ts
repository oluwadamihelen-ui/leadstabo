import { NextResponse, type NextRequest } from "next/server";

// Edge gate: cheap cookie presence check. Real session validation and workspace
// authorisation happen server-side in requireWorkspace()/assertWorkspace().
const APP_PREFIXES = ["/dashboard", "/leadgen", "/leads", "/outreach", "/academy", "/settings", "/analytics", "/notifications", "/onboarding"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("lb_session");
  if (APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && hasSession && !req.nextUrl.searchParams.has("invite")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|icon.svg|favicon.ico).*)"] };
