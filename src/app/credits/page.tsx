import type { CSSProperties } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits — Lens",
  description: "Open source acknowledgements for Lens.",
};

export default function CreditsPage() {
  const linkStyle: CSSProperties = {
    color: "#234b3d",
    fontWeight: 600,
  };

  return (
    <main
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "32px 24px 48px",
        lineHeight: 1.65,
        color: "#1d2a26",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Credits</h1>
      <p>Lens builds on the following open source projects:</p>
      <ul>
        <li>
          <strong>SQL engine:</strong>{" "}
          <a
            href="https://github.com/sql-js/sql.js"
            style={linkStyle}
            target="_blank"
            rel="noreferrer"
          >
            sql.js
          </a>{" "}
          (MIT)
        </li>
        <li>
          <strong>Framework:</strong>{" "}
          <a href="https://nextjs.org" style={linkStyle} target="_blank" rel="noreferrer">
            Next.js
          </a>{" "}
          (MIT)
        </li>
        <li>
          <strong>Date parsing:</strong>{" "}
          <a href="https://date-fns.org" style={linkStyle} target="_blank" rel="noreferrer">
            date-fns
          </a>{" "}
          (MIT)
        </li>
      </ul>
    </main>
  );
}
