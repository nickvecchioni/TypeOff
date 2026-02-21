import Link from "next/link";

export function ReportIssueButton() {
  return (
    <Link
      href="/report-issue"
      className="text-muted/65 hover:text-muted transition-colors"
    >
      Report an Issue
    </Link>
  );
}
