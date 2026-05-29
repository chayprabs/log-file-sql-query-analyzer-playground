import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — Lens",
  description: "Terms for using the Lens log analysis tool.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 leading-relaxed text-neutral-800 sm:px-6">
      <h1 className="mt-0 text-2xl font-semibold text-neutral-900">
        Terms &amp; Conditions
      </h1>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Acceptance
      </h2>
      <p>
        By using Lens, you agree to these terms. If you do not agree, do not use
        the application.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Use at your own risk
      </h2>
      <p>
        Lens is provided free of charge and as-is, without warranty of any kind,
        express or implied, including merchantability or fitness for a particular
        purpose, under the MIT License.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        No warranty on query correctness
      </h2>
      <p>
        SQL queries are executed by sql.js (SQLite). The operator makes no
        warranty that query results are accurate, complete, or suitable for any
        purpose. Always verify results independently before acting on them,
        especially for security, compliance, or production decisions.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Limitation of liability
      </h2>
      <p>
        To the fullest extent permitted by law, the operator and contributors
        shall not be liable for any indirect, incidental, special, consequential,
        or punitive damages, or any loss of profits, data, or goodwill, arising
        from your use of Lens, even if advised of the possibility of such
        damages.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Acceptable use
      </h2>
      <p>
        You may not use Lens to process log files in a manner that violates
        applicable laws. You are solely responsible for the content of the log
        files you open and for ensuring you have the right to analyze them.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        No sensitive data guarantee
      </h2>
      <p>
        While log files are processed locally and are not uploaded by Lens,
        browser memory may be accessible to other extensions in the same profile.
        Use a dedicated browser profile when analyzing highly sensitive content.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">
        Open source
      </h2>
      <p>
        Lens source code is available under the MIT License. Key dependencies
        include sql.js (MIT) and date-fns (MIT). See the{" "}
        <Link href="/privacy" className="font-medium text-neutral-900 underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold text-neutral-900">Changes</h2>
      <p>
        These terms may be updated at any time. Continued use after changes
        constitutes acceptance of the revised terms.
      </p>

      <p className="mt-10 text-sm text-neutral-500">Last updated: May 29, 2026</p>
    </main>
  );
}
