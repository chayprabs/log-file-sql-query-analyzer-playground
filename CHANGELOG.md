# Changelog

## Unreleased

### Added
- Single-page workflow: upload and SQL workspace on the home page
- **Try sample log** button using `public/sample.log`
- Cancel in-flight file parsing with progress phases (reading, parsing, inserting)
- Help & FAQ page at `/help`
- Custom 404 page
- Full-file JSON column inference (no longer limited to first 100 lines)
- Apache vhost column for vhost-prefixed access logs
- Improved journald format detection from export blocks

### Changed
- Removed Authos branding and `/credits` route
- New minimal white UI with top bar and SEO strip
- Footer links: Privacy, Terms, Help

### Fixed
- Concurrent upload race while parsing
- Stronger mutating-SQL detection
- Unsaved SQL guards on navigation links
