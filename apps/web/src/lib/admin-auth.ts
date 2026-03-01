import { auth } from "./auth";

const ADMIN_USERNAME = "nickvec";

export async function validateAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.username === ADMIN_USERNAME;
}
