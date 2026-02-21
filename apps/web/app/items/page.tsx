export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { userStats, userSubscription } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { ItemsBrowser } from "@/components/items/ItemsBrowser";

export default async function ItemsPage() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const db = getDb();

  const [stats] = await db
    .select({ totalXp: userStats.totalXp })
    .from(userStats)
    .where(eq(userStats.userId, session.user.id))
    .limit(1);

  const [subRow] = await db
    .select({ status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id))
    .limit(1);

  const isPro = subRow?.status === "active";

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <ItemsBrowser totalXp={stats?.totalXp ?? 0} isPro={isPro} />
    </main>
  );
}
