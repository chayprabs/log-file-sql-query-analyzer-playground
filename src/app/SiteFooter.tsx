"use client";

import type { CSSProperties, MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnsavedSql } from "@/context/UnsavedSqlContext";

const LEAVE_CONFIRM =
  "You have SQL in the editor that differs from the last run query. Leave this page?";

export function SiteFooter() {
  const pathname = usePathname();
  const { hasUnsavedSql } = useUnsavedSql();

  const linkStyle: CSSProperties = {
    color: "#234b3d",
    textDecoration: "none",
    fontWeight: 600,
  };

  const guardInternalNav = (event: MouseEvent<HTMLAnchorElement>, href: string): void => {
    if (pathname !== "/query" || !hasUnsavedSql()) {
      return;
    }
    if (href === "/query" || href.startsWith("/query#")) {
      return;
    }
    if (!window.confirm(LEAVE_CONFIRM)) {
      event.preventDefault();
    }
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
          aria-label="Site"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 20px",
            alignItems: "center",
          }}
        >
          <Link href="/" style={linkStyle} onClick={(e) => guardInternalNav(e, "/")}>
            Home
          </Link>
          <Link href="/query" style={linkStyle} onClick={(e) => guardInternalNav(e, "/query")}>
            Query
          </Link>
          <Link href="/privacy" style={linkStyle} onClick={(e) => guardInternalNav(e, "/privacy")}>
            Privacy
          </Link>
          <Link href="/terms" style={linkStyle} onClick={(e) => guardInternalNav(e, "/terms")}>
            Terms
          </Link>
          <Link
            href="/terms#terms-of-use"
            style={linkStyle}
            onClick={(e) => guardInternalNav(e, "/terms#terms-of-use")}
          >
            Terms of use
          </Link>
          <Link href="/credits" style={linkStyle} onClick={(e) => guardInternalNav(e, "/credits")}>
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
        <p style={{ margin: 0, color: "#55665f" }}>© 2026 Chaitanya Prabuddha — MIT License</p>
      </div>
    </footer>
  );
}
