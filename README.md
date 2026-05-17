# Lens (`lnav-web`)

Lens is a **fully client-side** log file analyzer: upload nginx, Apache, syslog, journald, JSON lines, or plain text logs and run **SQL** against them using [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly). Nothing is uploaded to a server; parsing and queries run entirely in the browser tab.

- **Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind CSS 4, sql.js, Zustand (legacy only), date-fns, Vitest, Playwright  
- **Deployment:** Static `out/` directory — Cloudflare Pages, GitHub Pages, Vercel, Netlify, or any static host  
- **Product name:** Lens · **Package name:** `lnav-web`

## Requirements

- Node.js 20+
- After `npm install`, the `postinstall` script copies sql.js WASM binaries into `public/` (`sql-wasm.wasm` and `sql-wasm-browser.wasm`). Both files must be present for runtime.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server (`http://localhost:3000`) |
| `npm run build` | Production static export to `out/` |
| `npm run serve:out` | Serve `out/` with correct **application/wasm** MIME types and HTML fallback (use this instead of `npx serve` for WASM) |
| `npm test` | Vitest unit tests (`src/lib/engine/__tests__/`) |
| `npm run test:e2e` | Playwright tests (builds then serves `out/`) |
| `npm run lint` | ESLint |

## Architecture (active path)

Do **not** extend the legacy Zustand stack under `src/components/`, `src/lib/parser/`, `src/lib/database/`, or `src/stores/`. The active pipeline is:

- `src/app/page.tsx` — upload  
- `src/app/query/page.tsx` — SQL workspace  
- `src/context/LogContext.tsx` — in-memory `LogDatabase` state  
- `src/lib/engine/` — detection, parsers, SQLite load, suggestions, tests  

## License

MIT — see [LICENSE](./LICENSE).
