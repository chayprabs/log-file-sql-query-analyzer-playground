"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "60vh",
        padding: "32px 24px",
        maxWidth: "560px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.6,
        color: "#1d2a26",
      }}
    >
      <h1 style={{ marginTop: 0, fontSize: "1.5rem" }}>Something went wrong</h1>
      <p style={{ color: "#42544c" }}>
        The UI hit an unexpected error. Your log data is still only in this browser
        session; try again or return home to upload the file once more.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "999px",
            padding: "12px 20px",
            background: "#234b3d",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            border: "1px solid rgba(35, 75, 61, 0.35)",
            borderRadius: "999px",
            padding: "12px 20px",
            color: "#234b3d",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
