import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for login page, API routes, and static files
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check JWT cookie
  const token = request.cookies.get("fdk_token");
  if (!token?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token.value);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Settings page only for ADMIN
  if (pathname.startsWith("/panel/ustawienia") && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
