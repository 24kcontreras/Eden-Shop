import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password ?? "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD no está configurado en el servidor" },
      { status: 500 }
    );
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
