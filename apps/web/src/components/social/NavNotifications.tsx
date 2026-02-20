"use client";

import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { NotificationDrawer } from "./NotificationDrawer";

export function NavNotifications() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <NotificationBell onClick={() => setOpen(true)} />
      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
