import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "Bug",
  "UI/Visual",
  "Performance",
  "Matchmaking",
  "Feature Request",
  "Other",
];

const CATEGORY_LABELS: Record<string, string> = {
  Bug: "bug",
  "UI/Visual": "ui",
  Performance: "performance",
  Matchmaking: "matchmaking",
  "Feature Request": "enhancement",
  Other: "other",
};

// In-memory rate limit: 1 report per 60s per user/IP
const rateLimitMap = new Map<string, number>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key);
  if (last && now - last < 60_000) return true;
  rateLimitMap.set(key, now);
  // Clean old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap) {
      if (now - v > 60_000) rateLimitMap.delete(k);
    }
  }
  return false;
}

export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  // Rate limit by user ID or IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = session?.user?.id ?? ip;

  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "Please wait a minute before submitting another report" },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = (body.title as string)?.trim();
  const category = body.category as string;
  const description = (body.description as string)?.trim();
  const steps = (body.steps as string)?.trim() || null;

  // Validate
  if (!title || title.length < 5 || title.length > 100) {
    return NextResponse.json(
      { error: "Title must be 5-100 characters" },
      { status: 400 }
    );
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }
  if (!description || description.length < 10 || description.length > 2000) {
    return NextResponse.json(
      { error: "Description must be 10-2000 characters" },
      { status: 400 }
    );
  }

  // Build issue body
  const reporterSection = session?.user?.username
    ? `**Reporter:** ${session.user.username} (ELO: ${session.user.eloRating ?? "N/A"}, Rank: ${session.user.rankTier ?? "N/A"})`
    : "**Reporter:** Anonymous";

  const stepsSection = steps
    ? `\n\n### Steps to Reproduce\n${steps}`
    : "";

  const issueBody = `### Description\n${description}${stepsSection}\n\n---\n${reporterSection}\n**Category:** ${category}`;

  // Post to GitHub
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    console.error("Missing GitHub env vars for bug report");
    return NextResponse.json(
      { error: "Bug reporting is not configured" },
      { status: 503 }
    );
  }

  const labels = ["user-report"];
  const categoryLabel = CATEGORY_LABELS[category];
  if (categoryLabel) labels.push(categoryLabel);

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `[Bug Report] ${title}`,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.error("GitHub API error:", ghRes.status, errText);
      return NextResponse.json(
        { error: "Failed to create issue" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("GitHub API request failed:", err);
    return NextResponse.json(
      { error: "Failed to create issue" },
      { status: 502 }
    );
  }
}
