"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          padding: "32px 24px",
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.6,
          color: "#1d2a26",
          background: "#fcfaf7",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Lens encountered an error</h1>
        <p style={{ color: "#42544c", maxWidth: "560px" }}>
          The application failed to render. Your log data, if any was loaded in this
          tab, exists only in memory and is not sent anywhere.
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
      </body>
    </html>
  );
}
