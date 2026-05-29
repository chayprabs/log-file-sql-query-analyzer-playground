/** Client-side file and engine limits (single source of truth; PRD section 13). */

export const MAX_FILE_BYTES = 500 * 1024 * 1024;
export const LARGE_CONFIRM_BYTES = 100 * 1024 * 1024;
export const SOFT_WARNING_BYTES = 50 * 1024 * 1024;

export const ROW_BATCH_SIZE = 5000;
export const BINARY_SNIFF_BYTES = 8192;

export const QUERY_RESULT_PAGE_SIZE = 100;
export const QUERY_HISTORY_MAX = 10;

/** Max JSON lines scanned for dynamic column inference (keys merged across entire file). */
export const JSON_SCHEMA_SCAN_YIELD_EVERY = 500;
