import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Lens",
  description: "How Lens handles your data in the browser.",
};

export default function PrivacyPage() {
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
      <h1 style={{ marginTop: 0 }}>Privacy</h1>

      <h2>Data we collect</h2>
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
        Your CDN provider (Cloudflare) processes standard HTTP metadata as part of
        delivering the page. This does not include your log file content.
      </p>

      <h2>Cookies</h2>
      <p>
        Lens does not set any cookies. Your CDN provider may set short-lived
        security cookies as part of standard network delivery.
      </p>

      <h2>Analytics</h2>
      <p>
        None. Lens does not include analytics, tracking pixels, or telemetry.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about this privacy notice, contact{" "}
        <a href="mailto:your.contact@example.com">your.contact@example.com</a>.
      </p>

      <p style={{ color: "#55665f", fontSize: "0.95rem" }}>
        Last updated: May 17, 2026
      </p>
    </main>
  );
}
