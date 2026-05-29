"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useUnsavedSql } from "@/context/UnsavedSqlContext";
import { GitHubIcon, GlobeIcon, XIcon } from "./icons";

const GITHUB_REPO =
  "https://github.com/chayprabs/log-file-sql-query-analyzer-playground";
const TWITTER_URL = "https://x.com/chayprabs";
const WEBSITE_URL = "https://www.chaitanyaprabuddha.com";

const LEAVE_CONFIRM =
  "You have SQL in the editor that differs from the last run query. Leave this page?";

const iconLinkClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900";

export function SiteHeader() {
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
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={guardNav}
          className="text-lg font-semibold tracking-tight text-neutral-900 no-underline"
        >
          Lens
        </Link>

        <nav
          className="flex items-center gap-1 sm:gap-2"
          aria-label="External links"
        >
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className={iconLinkClass}
            aria-label="View source on GitHub"
            title="GitHub"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={iconLinkClass}
            aria-label="Chaitanya on X"
            title="X (Twitter)"
          >
            <XIcon className="h-4 w-4" />
          </a>
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={iconLinkClass}
            aria-label="Chaitanya Prabuddha website"
            title="Website"
          >
            <GlobeIcon className="h-5 w-5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
