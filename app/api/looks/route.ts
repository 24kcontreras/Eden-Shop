import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const looks = await prisma.look.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(looks);
}
