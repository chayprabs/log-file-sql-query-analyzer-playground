import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LogProvider } from "@/context/LogContext";

export const metadata: Metadata = {
  title: "Lens — log file SQL query analyzer",
  description:
    "Upload a log file and run SQL queries in your browser. Fully client-side with sql.js; nothing is uploaded.",
};

function SiteFooter() {
  const linkStyle: CSSProperties = {
    color: "#234b3d",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(29, 42, 38, 0.1)",
        padding: "20px 24px 28px",
        background: "rgba(246, 241, 232, 0.9)",
        color: "#42544c",
        fontSize: "0.92rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 20px",
            alignItems: "center",
          }}
        >
          <Link href="/" style={linkStyle}>
            Home
          </Link>
          <Link href="/query" style={linkStyle}>
            Query
          </Link>
          <Link href="/privacy" style={linkStyle}>
            Privacy
          </Link>
          <Link href="/terms" style={linkStyle}>
            Terms
          </Link>
          <Link href="/credits" style={linkStyle}>
            Credits
          </Link>
        </nav>
        <p style={{ margin: 0 }}>
          SQL engine:{" "}
          <a
            href="https://github.com/sql-js/sql.js"
            style={linkStyle}
            target="_blank"
            rel="noreferrer"
          >
            sql.js
          </a>{" "}
          (MIT) · Framework:{" "}
          <a href="https://nextjs.org" style={linkStyle} target="_blank" rel="noreferrer">
            Next.js
          </a>{" "}
          (MIT) · Dates:{" "}
          <a href="https://date-fns.org" style={linkStyle} target="_blank" rel="noreferrer">
            date-fns
          </a>{" "}
          (MIT)
        </p>
        <p style={{ margin: 0, color: "#55665f" }}>
          © 2026 Chaitanya Prabuddha — MIT License
        </p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className="h-full"
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LogProvider>
          <div style={{ flex: 1 }}>{children}</div>
          <SiteFooter />
        </LogProvider>
      </body>
    </html>
  );
}
