"use client";

import { useState, useRef, useEffect } from "react";

const MAX_BIO = 160;

export function BioEditor({ initialBio }: { initialBio: string | null }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setBio(data.bio ?? "");
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={inputRef}
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setBio(initialBio ?? "");
              setEditing(false);
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
          rows={2}
          placeholder="Write something about yourself..."
          className="w-full text-xs bg-surface/60 text-text rounded-lg px-3 py-2 ring-1 ring-white/[0.08] outline-none resize-none placeholder:text-muted/40 focus:ring-accent/30 transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted/40 tabular-nums">
            {bio.length}/{MAX_BIO}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBio(initialBio ?? "");
                setEditing(false);
              }}
              className="text-[11px] text-muted/60 hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-[11px] font-bold text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      {bio ? (
        <p className="text-xs text-muted/70 leading-relaxed flex-1">{bio}</p>
      ) : (
        <p className="text-xs text-muted/30 italic flex-1">No bio yet</p>
      )}
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 text-muted/25 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
        title="Edit bio"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}

export function BioDisplay({ bio }: { bio: string | null }) {
  if (!bio) return null;
  return <p className="text-xs text-muted/70 leading-relaxed">{bio}</p>;
}
