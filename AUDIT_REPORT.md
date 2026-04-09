# AUDIT_REPORT

## Phase 0

### Files Read

| File | Summary |
| --- | --- |
| `.gitignore` | Standard Next.js/Node ignore rules for dependencies, build output, env files, and TypeScript artifacts. |
| `AGENTS.md` | Repo instruction file warning that this is a newer Next.js version and requiring local Next docs review before code changes. |
| `CLAUDE.md` | Minimal pointer that delegates to `AGENTS.md`. |
| `eslint.config.mjs` | ESLint flat config using Next core-web-vitals and TypeScript presets with explicit ignores. |
| `next-env.d.ts` | Next-generated ambient types file referencing Next and generated route types. |
| `next.config.ts` | Very small Next config enabling static export, unoptimized images, and top-level `turbopack` config. |
| `package-lock.json` | npm lockfile pinning the full dependency graph for Next 16, React 19, sql.js, Vitest, and tooling. |
| `package.json` | Project manifest with Next 16, React 19, sql.js, Zustand, and basic dev/build/test scripts. |
| `postcss.config.mjs` | PostCSS config that only enables Tailwind v4's PostCSS plugin. |
| `README.md` | Mostly untouched Create Next App boilerplate with one stray project-title line at the end. |
| `tsconfig.json` | Strict TypeScript config using bundler module resolution and `@/*` path aliases. |
| `public/file.svg` | Static SVG icon asset from the starter template. |
| `public/globe.svg` | Static SVG icon asset from the starter template. |
| `public/next.svg` | Static SVG logo asset from the starter template. |
| `public/sample.log` | Small sample access log file containing nginx-style lines for manual testing. |
| `public/vercel.svg` | Static Vercel logo asset from the starter template. |
| `public/window.svg` | Static SVG icon asset from the starter template. |
| `src/app/favicon.ico` | Binary favicon asset for the app route tree. |
| `src/app/globals.css` | Global Tailwind import plus very small theme/body styling. |
| `src/app/layout.tsx` | Root layout applying metadata, global styles, and the `LogProvider` context. |
| `src/app/page.tsx` | Client upload page with drag-and-drop, file picker fallback, and context-driven navigation to `/query`. |
| `src/app/query/page.tsx` | Client query page with SQL editor, suggestion buttons, table rendering, pagination, and CSV export. |
| `src/components/FileUploader.tsx` | Older Zustand-based upload component not used by the current `src/app/page.tsx` flow. |
| `src/components/FormatSelector.tsx` | Older format picker wired to the Zustand store and legacy parser format definitions. |
| `src/components/LevelFilter.tsx` | Older log-level filter UI using the Zustand store and utility color mapping. |
| `src/components/LogViewer.tsx` | Older virtual-log-viewer-style component for browsing parsed lines from the Zustand store. |
| `src/components/QueryPanel.tsx` | Older query input/results component using the legacy database wrapper and Zustand store. |
| `src/context/LogContext.tsx` | Current React context that holds the `LogDatabase` instance, loading state, errors, file name, and query runner. |
| `src/lib/database/index.ts` | Legacy SQL layer that creates tables from parsed log lines and executes queries for the Zustand stack. |
| `src/lib/engine/db.ts` | Current sql.js loader/query wrapper that detects format, creates a table, inserts parsed rows, and exposes a `LogDatabase`. |
| `src/lib/engine/detector.ts` | Current format detector that scores sample lines against known formats. |
| `src/lib/engine/formats.ts` | Current engine format definitions, schemas, and parsers for nginx, apache, syslog, journald, JSON, and generic text. |
| `src/lib/engine/suggestions.ts` | Current canned SQL suggestions for each detected log format. |
| `src/lib/engine/__tests__/db.test.ts` | Very shallow database tests that mostly check exports and use a minimal sql.js mock. |
| `src/lib/engine/__tests__/detector.test.ts` | Detector tests covering a few happy paths and loose confidence expectations. |
| `src/lib/engine/__tests__/formats.test.ts` | Parser tests for engine formats, including imports of parser helpers that are not actually exported. |
| `src/lib/engine/__tests__/suggestions.test.ts` | Suggestion tests that only check the presence of labels/SQL strings, not real schema validity. |
| `src/lib/parser/formats.ts` | Legacy parser format catalog for a richer lnav-like model, separate from the current engine. |
| `src/lib/parser/index.ts` | Legacy parser/detector implementation that produces `ParsedLogLine[]` for the Zustand stack. |
| `src/lib/utils/log-levels.ts` | Utility helpers to infer log severity from text and map levels to colors/priorities. |
| `src/lib/utils/timestamps.ts` | Utility helpers for parsing a few timestamp styles and formatting dates as ISO strings. |
| `src/stores/log-store.ts` | Zustand store for the legacy viewer workflow, including parsing, SQL execution, filters, selection, and query history. |
| `src/types/index.ts` | Shared legacy type definitions for parsed lines, formats, query results, and time filters. |
| `src/types/sql.js.d.ts` | Local ambient type declarations for `sql.js`, including an `any[]`-based `run` signature. |

### Initial Overall Assessment

What looks solid:

- The current app route tree is small and understandable, which makes a full end-to-end audit practical.
- The active upload/query flow keeps the sql.js database in React context by reference instead of trying to serialize it through navigation.
- There is already a dedicated `src/lib/engine` split for formats, detection, database loading, and suggestions, which is the right shape for this kind of app.
- The query page already includes useful UX primitives like suggestions, pagination scaffolding, and CSV export.

What looks immediately suspicious:

- There are two overlapping architectures in the repo: the current `src/lib/engine` + `LogContext` path and an older `src/lib/parser` + `src/lib/database` + Zustand/component stack. The older stack is still present, partially broken, and likely to create type/build/test noise.
- `sql.js` is initialized from `https://sql.js.org/dist/...` in both database layers instead of loading a local WASM asset. `public/sql-wasm.wasm` is missing entirely, which conflicts with the browser-native/static-export requirement and the later network-tab expectations.
- `next.config.ts` is too minimal for the stated requirements and currently does not address WASM handling, client fallbacks, or production/build nuances around sql.js.
- Table naming is inconsistent across the app: the query page, suggestion files, and DB loader derive table names differently, and several suggestion queries reference tables/columns that do not exist in the schemas actually created.
- `src/lib/engine/db.ts` looks structurally wrong in several places before even running it: duplicate `line_no` handling, insert placeholder construction that appears invalid for multi-row inserts, no transaction wrapping, weak skipped-row accounting, and timestamp/id logic that does not match the schema.
- `src/lib/engine/formats.ts` is shallow and internally inconsistent: parser outputs do not fully match schemas, nginx/apache parsing is incomplete, syslog handling is not RFC-accurate, journald assumes JSON instead of key=value blocks, and JSON handling does not flatten nested values.
- The tests are currently weak. Some are trivial export checks, some assert only string presence, and `formats.test.ts` imports parser helpers that are not exported by the module under test.
- There is no project Vitest config even though the repo uses Vitest and React Testing Library, so test runtime/setup is likely incomplete.
- The README is largely boilerplate and does not describe the actual product, architecture, or runtime constraints.

Immediate red flags to verify in later phases:

- No `public/sql-wasm.wasm`.
- External network dependency for WASM loading.
- Orphaned legacy code path still living in the repo.
- Likely broken suggestion SQL and default table-name logic.
- Likely broken or non-scalable row insertion for large files.
- High chance of TypeScript and test failures once the full toolchain is run.

### Files Added During Audit

| File | Summary |
| --- | --- |
| `public/sql-wasm.wasm` | Local sql.js WASM asset for the non-browser build variant. |
| `public/sql-wasm-browser.wasm` | Local sql.js browser WASM asset required by the shipped bundle and static export. |
| `scripts/serve-static.cjs` | Small static-file server with HTML route fallback and explicit `application/wasm` handling for exported builds. |
| `vitest.config.js` | Vitest config that pins the Node environment and stable worker mode for this repo. |

## Summary

- Total bugs found: 20
- Bugs fixed: 20
- Tests added: 27
- Tests passing: 34 / 34
- Build status: PASSING
- TypeScript errors: 0

## Verification

- `npx tsc --noEmit` passes with 0 errors.
- `npx vitest run` passes with 34 / 34 tests green.
- `next build` succeeds and produces static `out/` output for `/` and `/query`.
- Phase 4.1 smoke test completed successfully against `next dev` on `http://127.0.0.1:3090`.
- Production runtime verification completed successfully against the built `out/` export.
- External API calls observed during runtime verification: 0.
- WASM request observed during production verification: `/sql-wasm-browser.wasm` once, served as `Content-Type: application/wasm`.

## Bugs Fixed

- [CRITICAL] sql.js loading depended on missing/non-local browser assets; the app now ships local WASM files from `public/` instead of relying on runtime fetch failures.
- [CRITICAL] Static export was broken because the bundle requested `/sql-wasm-browser.wasm` while only `sql-wasm.wasm` existed; the missing browser WASM asset is now included.
- [CRITICAL] Nginx and Apache access-log parsing was incomplete; the parsers now handle common and combined formats, IPv6, `"-"` requests, spaced targets, and Apache vhost prefixes.
- [CRITICAL] RFC 3164 syslog parsing mishandled optional priority, day spacing, yearless timestamps, tags, and message extraction.
- [CRITICAL] Journald key/value export blocks and multiline continuation lines were not parsed correctly.
- [CRITICAL] JSON log ingestion did not safely flatten nested objects, stringify arrays, preserve nulls, or tolerate mixed invalid lines.
- [CRITICAL] The generic fallback parser was not guaranteed to succeed safely for arbitrary input.
- [BUG] Format detection was too shallow; it now scores multiple non-comment sample lines, actually parses JSON, handles empty files, and uses a confidence threshold before falling back.
- [CRITICAL] Table creation, parser output, and query-time schema expectations disagreed on table and column names; the active engine now consistently uses a `logs` table with aligned schemas.
- [CRITICAL] Row insertion was not safely optimized for large files; inserts now run in 5,000-row batches inside transactions.
- [BUG] BOM stripping, CRLF normalization, and binary-file rejection were missing from the load pipeline.
- [BUG] Row-level parse failures could abort loads instead of incrementing skipped-row counts and continuing.
- [BUG] `query()` behavior was normalized to return `{ columns, rows, error }` and to report SQL failures without throwing.
- [BUG] Built-in SQL suggestions referenced inconsistent schemas and lacked required coverage; they now match the real `logs` schema for each detected format.
- [BUG] The upload page had weak progress/error handling and awkward re-load behavior when replacing an existing database.
- [BUG] The query page was missing robust keyboard execution, automatic suggestion execution, pagination, null rendering, long-cell truncation, and clear empty-result behavior.
- [BUG] SQL errors were surfaced raw; the UI now rewrites missing-table and missing-column failures into actionable messages.
- [BUG] CSV export needed header inclusion and proper quoting for commas, quotes, and line breaks.
- [BUG] Context/database replacement did not fully centralize progress state or guarantee safe closure of the previous database before replacement.
- [BUG] Legacy repo files still carried lint/type weaknesses, including unsafe sql.js typings and unused-value noise that would have obscured the real audit results.

## Improvements Made

- Added recent-query history in `localStorage` and surfaced it directly under the SQL editor.
- Added a collapsible schema panel that shows the `logs` table name, column names, and column types.
- Added explicit loaded-row and detected-format summaries in the UI so users can confirm the parse succeeded.
- Added large-file warnings, including the requested 100MB message: `This file is large and may take 30+ seconds to parse. Continue?`
- Added a reusable `scripts/serve-static.cjs` helper so exported builds can be served locally with correct route fallback and WASM MIME handling.
- Replaced the shallow engine tests with substantive parser, detector, database, and suggestion coverage.

## Known Remaining Issues

- The legacy Zustand/parser/database stack in `src/components/`, `src/lib/parser/`, `src/lib/database/`, and `src/stores/log-store.ts` is still present but unused by the current app-router flow. It no longer blocks build/test/runtime, but it remains technical debt and could be removed in a dedicated cleanup pass.
- `README.md` is still mostly starter-template documentation and does not yet document the actual log-analysis architecture, verification flow, or static-export serving workflow.
