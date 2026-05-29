# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Reporting a vulnerability

If you discover a security issue in Lens, please report it responsibly:

1. **Do not** open a public GitHub issue for undisclosed vulnerabilities.
2. Open a private security advisory on the repository, or contact the maintainer via [GitHub](https://github.com/chayprabs) or [chaitanyaprabuddha.com](https://www.chaitanyaprabuddha.com).

We aim to acknowledge reports within a few business days.

## Scope

In scope:

- Client-side code in this repository (`src/`, `public/`, build scripts)
- WASM loading and `locateFile` configuration
- XSS or injection via log content rendered in the UI

Out of scope:

- Log files you choose to analyze (you are responsible for their content)
- Third-party browser extensions with access to page memory
- CDN or hosting misconfiguration outside this repository

## Security model

Lens processes log files **only in the browser**. No log content is sent to an application server by this app. Query history stores **SQL text only** in `localStorage` (up to 10 entries).
