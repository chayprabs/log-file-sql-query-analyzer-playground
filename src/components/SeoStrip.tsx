export function SeoStrip() {
  return (
    <section
      className="border-b border-neutral-200 bg-neutral-50"
      aria-label="About Lens"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <h1 className="m-0 text-sm font-semibold leading-relaxed text-neutral-800">
          Lens runs SQL on log files entirely in your browser — nginx, Apache,
          syslog, journald, and JSON lines become a SQLite table named{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs font-normal text-neutral-800">
            logs
          </code>
          .
        </h1>
        <p className="m-0 mt-1 text-sm leading-relaxed text-neutral-600">
          No account, no upload, no server: your file stays on your device with
          sql.js WebAssembly.
        </p>
      </div>
    </section>
  );
}
