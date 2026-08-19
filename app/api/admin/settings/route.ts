import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const whatsappNumber =
    typeof body.whatsappNumber === "string" ? body.whatsappNumber.replace(/\D/g, "") : undefined;
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { tickerText: body.tickerText ?? undefined, whatsappNumber: whatsappNumber || undefined },
    update: { tickerText: body.tickerText, whatsappNumber: whatsappNumber || undefined },
  });
  return NextResponse.json(settings);
}
