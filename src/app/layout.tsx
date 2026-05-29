import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { LogProvider } from "@/context/LogContext";
import { UnsavedSqlProvider } from "@/context/UnsavedSqlContext";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SeoStrip } from "@/components/SeoStrip";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://chayprabs.github.io/log-file-sql-query-analyzer-playground"
  ),
  title: "Lens — SQL over log files in your browser",
  description:
    "Upload a log file and run SQL queries in your browser. Fully client-side with sql.js; nothing is uploaded.",
  openGraph: {
    title: "Lens — SQL over log files in your browser",
    description:
      "Privacy-first log analyzer: run SQL on nginx, syslog, journald, and JSON lines locally in your browser.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-[#fafafa] text-neutral-900 antialiased">
        <LogProvider>
          <UnsavedSqlProvider>
            <SiteHeader />
            <SeoStrip />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <SiteFooter />
          </UnsavedSqlProvider>
        </LogProvider>
      </body>
    </html>
  );
}
