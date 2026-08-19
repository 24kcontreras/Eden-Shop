import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login", "/api/admin/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
