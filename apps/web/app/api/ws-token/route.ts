import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await new SignJWT({
    sub: session.user.id,
    name: session.user.name ?? "Anonymous",
    elo: session.user.eloRating ?? 1000,
    username: session.user.username ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
