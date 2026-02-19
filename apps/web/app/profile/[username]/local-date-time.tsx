"use client";

export function LocalDateTime({ date }: { date: string }) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <span className="whitespace-nowrap">
      {datePart}{" "}
      <span className="opacity-50">{timePart}</span>
    </span>
  );
}
