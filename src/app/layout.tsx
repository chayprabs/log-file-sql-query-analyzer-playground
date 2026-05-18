import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { LogProvider } from "@/context/LogContext";
import { UnsavedSqlProvider } from "@/context/UnsavedSqlContext";
import { SiteFooter } from "./SiteFooter";

export const metadata: Metadata = {
  title: "Lens — log file SQL query analyzer",
  description:
    "Upload a log file and run SQL queries in your browser. Fully client-side with sql.js; nothing is uploaded.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className="h-full"
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LogProvider>
          <UnsavedSqlProvider>
            <div style={{ flex: 1 }}>{children}</div>
            <SiteFooter />
          </UnsavedSqlProvider>
        </LogProvider>
      </body>
    </html>
  );
}
