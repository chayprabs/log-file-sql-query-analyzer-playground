import type { Metadata } from "next";
import "./globals.css";
import { LogProvider } from "@/context/LogContext";

export const metadata: Metadata = {
  title: "lnav-web - Log File Navigator",
  description: "Browser-based log analysis with SQL queries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <LogProvider>
          {children}
        </LogProvider>
      </body>
    </html>
  );
}