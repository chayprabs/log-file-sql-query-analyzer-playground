import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Credits — Lens",
  description: "Open source acknowledgements for Lens.",
};

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 leading-relaxed text-neutral-800 sm:px-6">
      <h1 className="mt-0 text-2xl font-semibold text-neutral-900">Credits</h1>
      <p>Lens is built with these open source projects:</p>
      <ul className="list-disc pl-5">
        <li>
          <a
            href="https://github.com/sql-js/sql.js"
            className="font-medium text-neutral-900 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            sql.js
          </a>{" "}
          (MIT) — SQLite in WebAssembly
        </li>
        <li>
          <a
            href="https://nextjs.org"
            className="font-medium text-neutral-900 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js
          </a>{" "}
          (MIT)
        </li>
        <li>
          <a
            href="https://react.dev"
            className="font-medium text-neutral-900 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            React
          </a>{" "}
          (MIT)
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
