"use client";

import { useState } from "react";
import { TypingTest } from "@/components/typing/TypingTest";
import { SoloStats } from "@/components/typing/SoloStats";

export default function SoloPage() {
  const [typingStatus, setTypingStatus] = useState<"idle" | "typing" | "finished">("idle");

  return (
    <main
      className={`flex-1 flex flex-col items-center px-4 overflow-y-auto ${
        typingStatus === "typing" ? "focus-active" : ""
      }`}
    >
      <div className="pt-[18vh] w-full flex flex-col items-center">
        <TypingTest onStatusChange={setTypingStatus} />
      </div>
      <div className="focus-fade mt-16 w-full max-w-3xl pb-16">
        <SoloStats />
      </div>
    </main>
  );
}
