import { NextResponse } from "next/server";

// Type Pass checkout not yet implemented
export async function POST() {
  return NextResponse.json({ error: "No active season" }, { status: 400 });
}
