import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Read tracking (readAt column) not yet in schema — return empty counts for now
export async function GET() {
  return NextResponse.json({ counts: {} });
}
