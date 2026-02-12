import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await new SignJWT({
    sub: session.user.id,
    name: session.user.name ?? "Anonymous",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
