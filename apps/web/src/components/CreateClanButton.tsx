"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function CreateClanButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!session?.user?.id) return null;
  if (session.user.clanId) return null;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag: tag.toUpperCase(), description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create clan");
        return;
      }
      router.push(`/profile/${session.user.username}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-accent hover:text-accent/80 transition-colors"
      >
        Create Clan
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-surface/60 ring-1 ring-white/[0.06] p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted/60 uppercase tracking-wider block mb-1">Name (3-30)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="w-full bg-surface rounded px-2 py-1.5 text-sm text-text ring-1 ring-white/[0.06] focus:ring-accent/40 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted/60 uppercase tracking-wider block mb-1">Tag (2-5)</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            maxLength={5}
            className="w-full bg-surface rounded px-2 py-1.5 text-sm text-text ring-1 ring-white/[0.06] focus:ring-accent/40 outline-none uppercase"
            placeholder="TAG"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted/60 uppercase tracking-wider block mb-1">Description (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={100}
          className="w-full bg-surface rounded px-2 py-1.5 text-sm text-text ring-1 ring-white/[0.06] focus:ring-accent/40 outline-none"
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || name.length < 3 || tag.length < 2}
          className="text-sm bg-accent/[0.06] ring-1 ring-accent/20 text-accent rounded px-3 py-1.5 hover:bg-accent hover:text-bg transition-all disabled:opacity-40"
        >
          {loading ? "Creating..." : "Create"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-muted hover:text-text transition-colors px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
