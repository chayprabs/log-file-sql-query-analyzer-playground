import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Lens",
  description: "How Lens handles your data in the browser.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 leading-relaxed text-neutral-800 sm:px-6">
      <h1 className="mt-0 text-2xl font-semibold text-neutral-900">
        Privacy Policy
      </h1>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Data we collect
      </h2>
      <p>
        Lens collects nothing. Log files you open are parsed and queried entirely
        within your browser using sql.js, a WebAssembly build of SQLite. No file
        content is transmitted to any server. No file content is stored anywhere
        persistent. When you close the browser tab, all data is gone.
      </p>
      <p>
        We store your last 10 SQL queries in your browser&apos;s localStorage for
        convenience. These are query strings only — no log file content. This
        data stays on your device and is never transmitted.
      </p>
      <p>
        If you host this static site on a CDN (for example Cloudflare Pages),
        that provider processes standard HTTP metadata as part of delivering the
        page. This does not include your log file content.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Cookies</h2>
      <p>
        Lens does not set any cookies. Your CDN provider may set short-lived
        security cookies as part of standard network delivery.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Analytics</h2>
      <p>
        None. Lens does not include analytics, tracking pixels, or telemetry.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Disclaimer
      </h2>
      <p>
        Lens is provided &quot;as is&quot; without warranties of any kind. The
        operator is not liable for decisions you make based on query results or
        for loss of data in browser memory. See our{" "}
        <Link href="/terms" className="font-medium text-neutral-900 underline">
          Terms &amp; Conditions
        </Link>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Contact</h2>
      <p>
        Questions about this policy can be directed to the maintainer via the{" "}
        <a
          href="https://github.com/chayprabs/log-file-sql-query-analyzer-playground/issues"
          className="font-medium text-neutral-900 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repository
        </a>{" "}
        or{" "}
        <a
          href="https://www.chaitanyaprabuddha.com"
          className="font-medium text-neutral-900 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          chaitanyaprabuddha.com
        </a>
        .
      </p>

      <p className="mt-10 text-sm text-neutral-500">Last updated: May 29, 2026</p>
    </main>
  );
}
