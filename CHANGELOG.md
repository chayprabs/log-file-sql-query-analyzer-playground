# Changelog

All notable changes to **Lens** (`lnav-web`) are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-30

### Added

- Client-only log upload with drag-and-drop, file picker, and sample log.
- Automatic format detection for nginx/Apache access logs, syslog, journald export, JSON lines, and generic text.
- In-browser SQLite via sql.js with local WASM assets under `public/`.
- SQL workspace with schema panel, format-specific suggestions, paginated results, CSV export, and recent query history (SQL text only in `localStorage`).
- Static legal and help routes: `/privacy`, `/terms`, `/help`, `/credits`.
- Security headers for static hosting (`public/_headers`) and a WASM-aware local server (`npm run serve:out` / `npm start`).
- CI workflow: TypeScript, ESLint, license check, npm audit, Vitest, static export build, and Playwright E2E.
- GitHub Pages deploy workflow (`.github/workflows/deploy.yml`).

### Security

- Result cells render as plain text to avoid HTML injection from log payloads.
- Content Security Policy and related headers on static output.

[0.1.0]: https://github.com/chayprabs/log-file-sql-query-analyzer-playground/releases/tag/v0.1.0
