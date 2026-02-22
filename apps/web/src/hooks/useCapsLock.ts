import { useState, useEffect } from "react";

export function useCapsLock() {
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      setCapsLock(e.getModifierState("CapsLock"));
    }
    window.addEventListener("keydown", handle);
    window.addEventListener("keyup", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("keyup", handle);
    };
  }, []);

  return capsLock;
}
