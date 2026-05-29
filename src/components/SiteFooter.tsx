"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useUnsavedSql } from "@/context/UnsavedSqlContext";

const LEAVE_CONFIRM =
  "You have SQL in the editor that differs from the last run query. Leave this page?";

export function SiteFooter() {
  const { hasUnsavedSql } = useUnsavedSql();

  const guardNav = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!hasUnsavedSql()) {
      return;
    }
    if (!window.confirm(LEAVE_CONFIRM)) {
      event.preventDefault();
    }
  };

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-neutral-600 sm:px-6">
        <Link
          href="/privacy"
          onClick={guardNav}
          className="font-medium text-neutral-700 no-underline hover:text-neutral-900"
        >
          Privacy Policy
        </Link>
        <span className="text-neutral-300" aria-hidden>
          ·
        </span>
        <Link
          href="/terms"
          onClick={guardNav}
          className="font-medium text-neutral-700 no-underline hover:text-neutral-900"
        >
          Terms &amp; Conditions
        </Link>
      </div>
    </footer>
  );
}
