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
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { tickerText: body.tickerText ?? undefined },
    update: { tickerText: body.tickerText },
  });
  return NextResponse.json(settings);
}
