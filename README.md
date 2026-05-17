<!-- Lens (lnav-web) — README for discovery: GitHub search, topics, and external SEO. -->

# Lens — SQL over log files in your browser

**Lens** is a **privacy-first, client-only** log analyzer: open a log file in the browser, get **automatic format detection**, and run **SQL** on a single SQLite table named **`logs`** using [**sql.js**](https://github.com/sql-js/sql.js) (SQLite compiled to **WebAssembly**). No Splunk, no ELK stack, no account, **no server** — the file stays on your device.

| | |
| --- | --- |
| **Public name** | Lens |
| **npm package** | `lnav-web` |
| **Repository** | `log-file-sql-query-analyzer-playground` |
| **Suite** | Authos ([authos.app](https://authos.app)) |
| **License** | [MIT](./LICENSE) |

---

## The problem Lens solves

Engineers investigating incidents need to **filter and aggregate** logs fast — status codes, top IPs, slow requests — without standing up Elasticsearch or uploading sensitive lines to a third party. **grep** and **awk** are not enough when you need SQL-style `GROUP BY` and aggregates.

**Lens** gives you **SQLite in the tab**: parse locally, query locally, discard when you close the page.

---

## Who it is for

| Audience | Typical use |
| --- | --- |
| **DevOps / SRE** | Ad-hoc nginx or Apache access-log queries during incidents |
| **Backend developers** | NDJSON / application log lines without a logging platform |
| **Security engineers** | Access-log triage without uploading to a vendor |
| **Systems administrators** | Syslog or journald exports without installing heavy desktop tools |

---

## What you can do (feature overview)

- **Upload** via drag-and-drop or file picker; **BOM strip**, **CRLF normalize**, **binary sniff** (null bytes in the first 8 KB of decoded text reject non-text).
- **File size policy:** hard cap **500 MB**; confirm above **100 MB**; **50–100 MB** “large file” warning (client-side only).
- **Automatic format detection** from a sample of non-trivial lines; optional **manual format override**.
- **In-memory SQLite** via sql.js: **`CREATE TABLE logs`** and **batched inserts** (5,000-row transaction chunks) for large files.
- **Query UI:** schema panel, **format-specific SQL suggestions** (click to run), **Ctrl/Cmd+Enter** to execute, **paginated results** (100 rows per page), **CSV export** (`query-results.csv`), **recent query history** (last 10 queries, **SQL text only** in `localStorage`).
- **Safety:** result cells rendered as **plain text** (no HTML injection from log payloads).
- **Legal pages (static routes):** `/privacy`, `/terms`, `/credits` — plus footer links and MIT **LICENSE** at repo root.

---

## Supported log formats (summary)

| Format | Parsed into `logs` (high level) |
| --- | --- |
| **Nginx / Apache access** | Combined / common style; IPv6; split **method**, **path**, **protocol**; status, bytes, referer, user-agent, **raw** line |
| **Syslog (RFC 3164)** | **priority**, derived **facility** / **severity**, **timestamp** (ISO), host, tag, PID, message, **raw** |
| **journald export** | Key=value blocks and continuations; **timestamp**, **priority**, **unit**, host, identifier, PID, message, **raw** |
| **JSON lines (NDJSON)** | Safe flattening to columns; promoted **timestamp**, **level**, **message** plus dynamic keys from a sample; **raw** line |
| **Generic text** | Fallback: best-effort **timestamp** / **level**, **message**, **raw** |

Implementation lives in **`src/lib/engine/`** (`detector.ts`, `formats.ts`, `db.ts`, `suggestions.ts`).

---

## Quick start (developers)

**Requirements:** **Node.js 20+**.

```bash
git clone https://github.com/chayprabs/log-file-sql-query-analyzer-playground.git
cd log-file-sql-query-analyzer-playground
npm install
```

`npm install` runs **`postinstall`**, which copies **both** WASM builds into `public/`:

- `public/sql-wasm.wasm`
- `public/sql-wasm-browser.wasm`

If they are ever missing (e.g. offline mirror), copy manually:

```bash
cp node_modules/sql.js/dist/sql-wasm.wasm public/
cp node_modules/sql.js/dist/sql-wasm-browser.wasm public/
```

**Run locally:**

```bash
npm run dev
# → http://localhost:3000
```

**Static export (production layout):**

```bash
npm run build
# Produces directory: out/

npm run serve:out
# Serves out/ with Content-Type: application/wasm for .wasm (do not rely on generic static servers that mis-serve WASM).
```

---

## npm scripts (this repository)

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Optimized build / static export to **`out/`** |
| `npm run serve:out` | Local static server for **`out/`** with correct WASM MIME types |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (`src/lib/engine/__tests__/`) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright end-to-end tests (builds then serves `out/`) |

`postinstall` copies sql.js WASM files into `public/` (see above).

---

## Architecture (execution model)

Everything runs **after initial page load** in the browser:

1. **`src/app/page.tsx`** — file intake, size UX, detection / override, load pipeline.
2. **`src/context/LogContext.tsx`** — holds the **`LogDatabase`** instance, progress, errors, **`runQuery`**.
3. **`src/app/query/page.tsx`** — SQL workspace, schema, suggestions, results, export, history.
4. **`src/lib/engine/db.ts`** — sql.js bootstrap with **`locateFile`** pointing at **same-origin** `/sql-wasm-browser.wasm` (never a remote CDN).

**Legacy code** may still exist under `src/components/`, `src/lib/parser/`, `src/lib/database/`, and `src/stores/` — it is **not** the active path; new work should go through **`src/lib/engine/`** and the App Router pages above.

---

## Limits (enforced client-side)

| Topic | Limit |
| --- | --- |
| Maximum file size | **500 MB** |
| Confirm slow parse | **> 100 MB** |
| Large-file warning (badge) | **50 MB – 100 MB** |
| Binary detection window | First **8 KB** after decode |
| Row insert batch | **5,000** rows per transaction chunk |
| Format detector sample | Up to **20** non-trivial lines |
| Query history | **10** SQL strings (`localStorage` only) |
| Results table pagination | **100** rows per page |

---

## Frequently asked questions (FAQ)

### Does my log file leave the browser?

**No.** Lens uses the File API, parses in JavaScript, and loads data into **sql.js** in memory. **No log file content** is sent to an application server, written to disk by the app, or stored in `localStorage` / IndexedDB.

### What is stored locally?

Only **up to ten SQL query strings** you ran (for recent history). That is **not** log content.

### Why must WASM be served from my own origin?

**sql.js** must load `sql-wasm-browser.wasm` with the correct **`Content-Type: application/wasm`**. Shipping WASM under `public/` and using **`locateFile`** on **`/${file}`** keeps **static export**, **offline-friendly** hosting, and the **no remote WASM CDN** guarantee.

### Which SQL can I run?

The database is **ephemeral** and **yours**. The product UX expects **`SELECT` / `WITH` / `VALUES` / `EXPLAIN`**-style workflows; mutating statements may show a **warning** but can still be executed when you confirm (useful for `PRAGMA` / `EXPLAIN`).

### What error messages will I see for bad files or SQL?

Examples aligned with the product spec:

- **Too large:** `File is too large. Maximum is 500 MB.`
- **Binary:** `This does not appear to be a text file. Only text-based log files are supported.`
- **Nothing parsed:** `No log lines could be parsed from this file.`
- **Replace loaded file:** `Replace the current file?`
- **Large parse confirm:** `This file is large and may take 30+ seconds to parse. Continue?`
- **Empty SQL:** `Enter a SQL query.`
- **Missing table (friendly):** `The query referenced a table that wasn't found. Use the table name shown in the schema panel.`
- **Missing column (friendly):** `Column "…" doesn't exist. Check the schema panel for available columns.`
- **Non-SELECT warning:** `Warning: This query modifies the database. Results may be unexpected.`

### Is Lens a hosted SaaS?

**No.** Deploy the **`out/`** folder to any static host (Cloudflare Pages, GitHub Pages, Netlify, Vercel). You are responsible for **CDN privacy** (standard HTTP metadata only — not your log bytes).

### How does Lens compare to lnav, GoAccess, Splunk, or ELK?

Lens targets **one-off SQL on a single file in the browser** without infrastructure. It is **not** a multi-tenant log platform, **not** streaming ingestion, and **not** a replacement for full observability stacks — see **non-goals** below.

---

## Non-goals (version 1)

- Multiple simultaneous files / multi-file SQL
- Real-time streaming ingestion (WebSocket / SSE)
- Persistent on-disk / IndexedDB log database inside the app
- Compressed `.gz` / `.bz2` ingestion in-browser
- User-defined log grammars / custom format DSL

---

## Suggested GitHub repository topics (for repository Settings → Topics)

Topics improve **GitHub’s own search** and signal intent to visitors. Consider (copy/paste into Topics):

`sql`, `sqlite`, `sql-js`, `webassembly`, `wasm`, `log-analysis`, `log-parser`, `nginx`, `apache`, `syslog`, `journald`, `json-lines`, `ndjson`, `sqlite-browser`, `client-side`, `privacy`, `static-site`, `static-export`, `nextjs`, `react`, `typescript`, `tailwindcss`, `cloudflare-pages`, `github-pages`, `netlify`, `vercel`, `devtools`, `sre`, `devops`, `observability`, `offline-first`, `open-source`, `mit-license`, `incident-response`, `security-tools`

---

## Tech stack (from the product spec)

| Layer | Technology |
| --- | --- |
| UI / routing | **Next.js 16** (static **`output: 'export'`**), **React 19**, **TypeScript 5** |
| Styling | **Tailwind CSS 4** |
| Query engine | **sql.js 1.14.x** (SQLite WASM) |
| Dates | **date-fns 4** |
| Client state (legacy path only) | **Zustand 5** |
| Unit tests | **Vitest 4** |

---

## Deployment matrix (static)

| Host | Build | Publish directory |
| --- | --- | --- |
| **Cloudflare Pages** | `npm run build` | `out` |
| **GitHub Pages** | `npm run build` | `out` (or `docs/` with your own pipeline) |
| **Netlify / Vercel** | `npm run build` | `out` |

Use **Node 20** in CI. Verify **both** WASM files exist in `public/` before build (copy from `node_modules/sql.js/dist/` if needed).

---

## Repository layout (reference)

```
src/app/            # App Router pages (upload, query, …)
src/context/        # LogProvider — LogDatabase lifecycle
src/lib/engine/     # Active: detector, parsers, db loader, suggestions, tests
src/lib/utils/      # Timestamp / log-level helpers
public/             # WASM, sample logs, static hosting headers (e.g. _headers)
scripts/            # serve-static.cjs — WASM-aware static server
```

---

## Maintainer & license

**Owner:** Chaitanya Prabuddha — **[@chayprabs](https://github.com/chayprabs)**  
**License:** MIT — see [LICENSE](./LICENSE).

---

## Keywords for search (intentional SEO block)

browser sql log analyzer, sqlite wasm log viewer, nginx access log sql, apache log sql query, syslog sql browser, journald sql tool, ndjson sql client, offline log analysis, static export nextjs, privacy first log tool, sql.js locateFile public wasm, cloudflare pages sqlite, open source log forensics, client side only logging
