import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Placement system has been removed. ELO adjusts naturally from races." },
    { status: 410 }
  );
}
