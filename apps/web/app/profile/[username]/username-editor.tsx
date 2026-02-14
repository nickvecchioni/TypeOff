"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UsernameEditor({
  currentUsername,
}: {
  currentUsername: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (value === currentUsername) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update username");
        setSaving(false);
        return;
      }

      setEditing(false);
      router.replace(`/profile/${value}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xl font-bold text-text hover:text-accent transition-colors"
        title="Edit username"
      >
        {currentUsername}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={20}
          className="bg-surface rounded px-3 py-1 text-text text-xl font-bold outline-none focus:ring-2 focus:ring-accent/50 w-48"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setValue(currentUsername);
              setEditing(false);
            }
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          onClick={() => {
            setValue(currentUsername);
            setEditing(false);
            setError(null);
          }}
          className="text-sm text-muted hover:text-error transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
