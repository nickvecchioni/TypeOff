"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { NotificationBell } from "./NotificationBell";
import { NotificationDrawer } from "./NotificationDrawer";

export function NavNotifications() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <div className="relative flex items-center">
      <NotificationBell onClick={() => setOpen((prev) => !prev)} />
      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
