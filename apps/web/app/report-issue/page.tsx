"use client";

import { useState, useRef, useEffect } from "react";
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

export default function ReportIssuePage() {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            Issue Submitted
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
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
      <div className="animate-fade-in flex flex-col items-center w-full max-w-md">
        <h1 className="text-3xl font-bold text-accent mb-2">Report an Issue</h1>
        <p className="text-muted mb-4 text-center">
          Found something wrong?<br />Let us know and we&apos;ll look into it.
        </p>

        {session?.user?.username && (
          <p className="text-xs text-muted/60 mb-4">
            Submitting as{" "}
            <span className="text-text">{session.user.username}</span>
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 w-full"
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

          <div ref={categoryRef} className="relative">
            <label className="text-xs text-muted mb-1 block">Category</label>
            <button
              type="button"
              onClick={() => setCategoryOpen((o) => !o)}
              className="w-full bg-surface rounded-lg px-4 py-3 text-text outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer"
            >
              <span>{category}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-muted transition-transform duration-150 ${categoryOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {categoryOpen && (
              <div className="absolute z-20 mt-1 w-full bg-surface border border-white/5 rounded-lg overflow-hidden shadow-lg">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setCategoryOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                      cat === category
                        ? "text-accent bg-accent/10"
                        : "text-text hover:bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
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
              rows={3}
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
              rows={2}
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
