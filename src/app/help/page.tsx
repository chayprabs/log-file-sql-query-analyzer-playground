import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help & FAQ — Lens",
  description: "How to use Lens to run SQL on log files in your browser.",
};

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 leading-relaxed text-neutral-800 sm:px-6">
      <h1 className="mt-0 text-2xl font-semibold text-neutral-900">Help &amp; FAQ</h1>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Quick start</h2>
      <ol className="pl-5">
        <li>Drop a log file on the home page or click <strong>Try sample log</strong>.</li>
        <li>
          Lens detects the format (nginx, Apache, syslog, journald, JSON lines, or
          plain text) and builds a SQLite table named <code>logs</code>.
        </li>
        <li>
          Edit the SQL in the editor and click <strong>Run query</strong>, or use
          Ctrl+Enter / Cmd+Enter.
        </li>
        <li>Use suggestion chips for common queries. Export results as CSV when needed.</li>
      </ol>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Does my file leave the browser?
      </h2>
      <p>
        No. Lens parses and queries entirely on your device using sql.js (SQLite in
        WebAssembly). Nothing is uploaded to a server.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Supported formats</h2>
      <ul className="pl-5">
        <li>Nginx and Apache combined/common access logs</li>
        <li>Syslog (RFC 3164 style)</li>
        <li>journald key=value export blocks and JSON lines</li>
        <li>NDJSON / JSON lines (one JSON object per line)</li>
        <li>Plain text with best-effort timestamp and level detection</li>
      </ul>
      <p>
        Use the <strong>Format</strong> dropdown before upload if auto-detection is
        wrong.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Limits</h2>
      <ul className="pl-5">
        <li>Maximum file size: 500 MB</li>
        <li>Confirmation required above 100 MB</li>
        <li>Warning badge between 50 MB and 100 MB</li>
        <li>Query history: last 10 SQL strings in localStorage (not log content)</li>
        <li>Results table: 100 rows per page</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Example queries</h2>
      <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-4 text-sm">
{`SELECT status, COUNT(*) AS n FROM logs GROUP BY status;
SELECT * FROM logs WHERE status >= 500 LIMIT 50;
SELECT path, COUNT(*) AS hits FROM logs GROUP BY path ORDER BY hits DESC LIMIT 20;`}
      </pre>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Troubleshooting</h2>
      <ul className="pl-5">
        <li>
          <strong>Binary file error:</strong> Lens only supports text logs. Compressed
          (.gz) files must be decompressed first.
        </li>
        <li>
          <strong>No rows parsed:</strong> Try a format override or check that lines
          match a supported pattern.
        </li>
        <li>
          <strong>SQL errors:</strong> Use the schema panel for column names. Table name
          is always <code>logs</code>.
        </li>
        <li>
          <strong>Slow large files:</strong> Parsing runs in the browser; you can cancel
          during load. Very large files may take minutes.
        </li>
      </ul>

      <p className="mt-10">
        <Link href="/" className="font-medium text-neutral-900 underline">
          ← Back to Lens
        </Link>
      </p>
    </main>
  );
}
