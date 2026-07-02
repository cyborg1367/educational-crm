import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "crm_access_token";
const PUBLIC_PATHS = new Set(["/login"]);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Avoid interfering with backend API proxy calls and static assets.
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  if (pathname.includes(".") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!token && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
