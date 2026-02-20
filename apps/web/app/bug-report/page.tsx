"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const CATEGORIES = [
  "Bug",
  "UI/Visual",
  "Performance",
  "Matchmaking",
  "Feature Request",
  "Other",
] as const;

export default function BugReportPage() {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const titleValid = title.trim().length >= 5 && title.trim().length <= 100;
  const descValid =
    description.trim().length >= 10 && description.trim().length <= 2000;
  const canSubmit = titleValid && descValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          description: description.trim(),
          steps: steps.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit report");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="animate-fade-in flex flex-col items-center w-full max-w-md text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-accent mb-2">
            Report Submitted
          </h1>
          <p className="text-muted mb-8">
            Thanks for helping improve TypeOff! We&apos;ll look into it.
          </p>
          <Link
            href="/"
            className="rounded-lg bg-accent/20 text-accent px-6 py-3 hover:bg-accent/30 transition-colors font-bold"
          >
            Back to Racing
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12">
      <div className="animate-fade-in flex flex-col items-center w-full max-w-md">
        <h1 className="text-3xl font-bold text-accent mb-2">Report a Bug</h1>
        <p className="text-muted mb-8 text-center">
          Found something broken? Let us know and we&apos;ll fix it.
        </p>

        {session?.user?.username && (
          <p className="text-xs text-muted/60 mb-4">
            Submitting as{" "}
            <span className="text-text">{session.user.username}</span>
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 w-full"
        >
          <div>
            <label className="text-xs text-muted mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="Brief summary of the issue"
              maxLength={100}
              autoFocus
              className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/50"
            />
            <p className="text-xs text-muted mt-1">
              {title.trim().length}/100 characters (min 5)
            </p>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 appearance-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder="What happened? What did you expect?"
              maxLength={2000}
              rows={5}
              className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/50 resize-none"
            />
            <p className="text-xs text-muted mt-1">
              {description.trim().length}/2000 characters (min 10)
            </p>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">
              Steps to Reproduce{" "}
              <span className="text-muted/40">(optional)</span>
            </label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
              rows={3}
              className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/50 resize-none"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-accent/20 text-accent px-6 py-3 hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </main>
  );
}
