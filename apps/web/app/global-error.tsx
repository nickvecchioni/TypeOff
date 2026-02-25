"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0c12",
          color: "#e2e8f0",
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "1.5rem" }}>
            {error.digest ? `Error ID: ${error.digest}` : "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#4d9eff",
              background: "rgba(77, 158, 255, 0.08)",
              border: "1px solid rgba(77, 158, 255, 0.2)",
              borderRadius: "0.5rem",
              padding: "0.625rem 1.5rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
