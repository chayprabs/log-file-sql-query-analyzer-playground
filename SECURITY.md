# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

If you discover a security issue in Lens, please report it responsibly:

1. **Do not** open a public GitHub issue for exploitable vulnerabilities.
2. Email **chaitanya.prabuddha@gmail.com** with a description, reproduction steps, and impact assessment.
3. Allow up to **7 business days** for an initial response.

We will acknowledge valid reports, work on a fix when appropriate, and credit reporters who wish to be named.

## Scope

Lens is a **fully client-side** static web app. Log file contents are processed in the browser and are **not** transmitted to an application server by Lens itself.

In-scope concerns include:

- Cross-site scripting via query results or log-derived UI
- WASM or script loading from unexpected origins
- `localStorage` query-history handling
- Misleading privacy or security claims in shipped static assets

Out of scope:

- Vulnerabilities in third-party hosting platforms (GitHub Pages, Cloudflare Pages, etc.)
- Issues requiring physical access to the user’s device
- Denial-of-service from intentionally loading extremely large local files (client-side limits are documented in the README)

## Safe deployment

When self-hosting the `out/` directory:

- Serve `.wasm` files with `Content-Type: application/wasm`.
- Prefer the provided `public/_headers` (or equivalent) for CSP and related headers.
- Do not replace local WASM with remote CDN copies unless you accept the supply-chain risk.
