# PRD traceability matrix (Lens)

Abbreviations: **I** = implemented in code, **T** = covered by automated test (Vitest / Playwright in CI), **M** = manual / documented only, **P** = partial.

| PRD area | Requirement | Location | Status |
| -------- | ----------- | -------- | ------ |
| Execution | Fully client-side; no log upload | `LogContext`, `db.ts`, privacy copy | I, T (E2E network) |
| WASM | Local `sql-wasm-browser.wasm`; no sql.js CDN | `db.ts` `locateFile`, `public/` | I, T |
| Static export | `output: 'export'`, no SSR APIs | `next.config.ts` | I, T (build) |
| File limit | Hard 500 MB | `limits.ts`, `LogContext`, `db.ts` | I, T |
| File confirm | > 100 MB confirm | `LogContext` | I, M (manual) |
| Upload success summary | Badge before redirect to /query | `page.tsx` | I |
| Upload progress | Spinner + Parsing label | `page.tsx`, `globals.css` | I |
| File warning | 50–100 MB badge | `src/app/page.tsx` | I |
| Replace file | Confirm | `LogContext` | I, T (E2E) |
| Decode | BOM strip, CRLF, ArrayBuffer | `db.ts` `decodeBufferToString`, normalize | I, T |
| Binary | Null byte in first 8 KB of raw file bytes | `db.ts` `binaryPrefixHasNullByte` | I, T |
| Parse | Batched insert 5000, transactions | `db.ts` `insertRowsInBatches` | I, T |
| Empty / zero rows | User messages | `db.ts`, `LogContext` | I, T |
| Detector | Sample lines, confidence | `detector.ts` | I, T |
| Query | SELECT-friendly warning; PRAGMA allowed | `query/page.tsx` | I |
| Query errors | Friendly missing table/column | `db.ts` `rewriteQueryError` | I, T |
| Results | Pagination 100, NULL display, CSV | `query/page.tsx` | I, T |
| History | 10 entries, localStorage SQL only | `query/page.tsx` | I |
| Suggestions | Per-format chips | `suggestions.ts` | I, T |
| XSS | Text-only cells | `query/page.tsx` | I |
| Headers | CSP, X-Frame-Options, etc. | `public/_headers`, `serve-static.cjs` | I, M |
| Legal | /privacy, /terms, /help, /credits, footer | `app/*`, `layout.tsx` | I, T |
| Privacy blurb | Upload page notice | `page.tsx` | I, T |
| Error UI | error boundary | `app/error.tsx`, `app/global-error.tsx` | I |
| Nav guard | Unsaved SQL on back / links / tab close | `query/page.tsx`, `SiteFooter.tsx` | I |
| SQL init | Retry / clear stuck promise | `db.ts` `getSqlModule` | I, T |
| A11y | Upload dropzone role, SQL editor label | `page.tsx`, `query/page.tsx` | I |

Last reviewed: implementation pass against PRD PDF in repo root (gitignored filename).
