"use client";

import { useState } from "react";
import { TypingTest } from "@/components/typing/TypingTest";

export default function SoloPage() {
  const [typingStatus, setTypingStatus] = useState<"idle" | "typing" | "finished">("idle");

  return (
    <main
      className={`flex-1 flex flex-col items-center px-4 overflow-y-auto ${
        typingStatus === "typing" ? "focus-active" : ""
      }`}
    >
      <div className={`${typingStatus === "finished" ? "flex-1 justify-center py-8" : "pt-[18vh]"} w-full flex flex-col items-center animate-fade-in`}>
        <TypingTest onStatusChange={setTypingStatus} />
      </div>
    </main>
  );
}
