# PRD traceability matrix (Lens)

Abbreviations: **I** = implemented, **T** = automated test, **M** = manual only, **P** = partial.

| PRD area | Requirement | Location | Status |
| -------- | ----------- | -------- | ------ |
| Execution | Fully client-side; no log upload | `LogContext`, `db.ts` | I, T |
| WASM | Local `sql-wasm-browser.wasm` | `db.ts`, `public/` | I, T |
| Static export | `output: 'export'` | `next.config.ts` | I, T |
| File limit | Hard 500 MB | `limits.ts`, `LogContext` | I |
| File confirm | > 100 MB confirm | `LogContext` | I |
| Upload UX | Single-page home workspace | `page.tsx`, `LensUploadSection`, `LensQueryWorkspace` | I, T |
| Try sample | Built-in sample log | `LensUploadSection`, `public/sample.log` | I, T |
| Cancel parse | Abort in-flight load | `load-cancel.ts`, `LogContext`, upload UI | I |
| Progress | Phases + progress bar | `db.ts`, `LoadProgressBar` | I |
| Replace file | Confirm | `LogContext` | I, T |
| Decode | BOM, CRLF, binary sniff | `db.ts` | I, T |
| Parse | Batched insert 5000 | `db.ts` | I, T |
| JSON schema | Keys from entire file | `db.ts`, `formats.ts` builders | I, T |
| Detector | Content-aware samples | `detector-content.ts` | I, T |
| Query | Editor, suggestions, history, CSV | `LensQueryWorkspace` | I, T |
| Auto-run | Default query on load | `LensQueryWorkspace` | I, T |
| Query errors | Friendly table/column | `db.ts` | I, T |
| Legal | `/privacy`, `/terms` | `app/privacy`, `app/terms` | I, T |
| Help | `/help` FAQ | `app/help` | I, T |
| Nav guard | Unsaved SQL | `UnsavedSqlContext`, header/footer | I |
| Deploy | GitHub Pages workflow | `.github/workflows/deploy.yml` | I |

Last updated: product completion pass (May 2026).
