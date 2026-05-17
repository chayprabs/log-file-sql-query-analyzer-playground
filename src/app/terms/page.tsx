import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service — Lens",
  description: "Terms for using the Lens log analysis tool.",
};

export default function TermsPage() {
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
      <h1 style={{ marginTop: 0 }}>Terms of service</h1>

      <h2>Use at your own risk</h2>
      <p>
        Lens is provided free of charge and as-is, without warranty of any kind,
        under the MIT License.
      </p>

      <h2>No warranty on query correctness</h2>
      <p>
        SQL queries are executed by sql.js (SQLite). The operator makes no
        warranty that query results are accurate, complete, or suitable for any
        purpose. Always verify results independently before acting on them.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may not use Lens to process log files in a manner that violates
        applicable laws. You are responsible for the content of the log files
        you open with this tool.
      </p>

      <h2>No sensitive data guarantee</h2>
      <p>
        While log files are processed locally and never transmitted, browser memory
        is accessible to other browser extensions running in the same profile. Use
        a dedicated browser profile when analysing highly sensitive log content.
      </p>

      <h2>Open source</h2>
      <p>
        Lens&apos;s source code is available under the MIT License. The sql.js
        SQLite engine (MIT License) and date-fns (MIT License) are key dependencies.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated at any time. Continued use constitutes
        acceptance.
      </p>

      <p style={{ color: "#55665f", fontSize: "0.95rem" }}>
        Last updated: May 17, 2026
      </p>
    </main>
  );
}
