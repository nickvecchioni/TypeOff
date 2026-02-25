import crypto from "crypto";

export function validateAdminSecret(secret: unknown): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof secret !== "string") return false;
  if (secret.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
}
