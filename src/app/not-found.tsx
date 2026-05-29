import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Page not found</h1>
      <p className="mt-2 text-neutral-600">
        This page does not exist. Return to Lens to analyze a log file.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-neutral-800"
      >
        Go to Lens
      </Link>
    </main>
  );
}
