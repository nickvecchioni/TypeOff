import { NextResponse } from "next/server";

// Type Pass feature not yet implemented — returns empty state until schema/logic is ready
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ season: null, userState: null, cosmetics: [] });
}
