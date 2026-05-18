import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import { detectFormat, DetectionResult } from "./detector";
import {
  CellValue,
  ColumnDef,
  getFormat,
  getSchemaForFormat,
  inferJsonSchema,
  isJournaldRecordLine,
  LogFormat,
  parseGeneric,
  ParsedLogRecord,
} from "./formats";
import {
  BINARY_SNIFF_BYTES,
  MAX_FILE_BYTES,
  ROW_BATCH_SIZE,
} from "./limits";
export interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
  error?: string;
}

export interface LoadProgress {
  current: number;
  total: number;
}

export interface LoadLogFileOptions {
  confirmLargeFile?: (warning: string) => boolean | Promise<boolean>;
  largeFileWarningBytes?: number;
  onProgress?: (progress: LoadProgress) => void;
  /** When set, skip auto-detection and parse with this format. */
  formatOverride?: LogFormat["name"];
}

export const LOGS_TABLE_NAME = "logs";

export const BASE_SCHEMA: ColumnDef[] = [
  { name: "line_no", type: "INTEGER" },
  { name: "raw", type: "TEXT" },
];

export interface LogDatabase {
  db: SqlJsDatabase;
  format: LogFormat;
  schema: ColumnDef[];
  rowCount: number;
  skippedCount: number;
  tableName: typeof LOGS_TABLE_NAME;
  /** 0–100 percentage from the format detector (0 when overridden or unknown). */
  detectionConfidence: number;
  query: (sql: string) => QueryResult;
  close: () => void;
}

interface RawRecord {
  text: string;
  lineNo: number;
}

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
let currentDatabase: SqlJsDatabase | null = null;

const BATCH_SIZE = ROW_BATCH_SIZE;

function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getWasmPath(file: string): string {
  if (typeof window === "undefined") {
    return `/${file}`;
  }

  return new URL(`/${file}`, window.location.origin).toString();
}

/** Testing: clear stuck or rejected init promise between Vitest cases. */
export function resetSqlEngineStateForTests(): void {
  sqlModulePromise = null;
}

function formatSqlInitError(cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(
    `Could not start the local SQL engine (WebAssembly). Ensure sql-wasm-browser.wasm is available and served with Content-Type: application/wasm (use the project static server for local previews). Details: ${detail}`
  );
}

async function getSqlModule(): Promise<SqlJsStatic> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (file) => getWasmPath(file),
    }).catch((error: unknown) => {
      sqlModulePromise = null;
      throw formatSqlInitError(error);
    });
  }

  return sqlModulePromise;
}

function rewriteQueryError(message: string): string {
  const missingTable = message.match(/no such table:\s*(.+)/i);
  if (missingTable) {
    return "The query referenced a table that wasn't found. Use the table name shown in the schema panel.";
  }

  const missingColumn = message.match(/no such column:\s*(.+)/i);
  if (missingColumn) {
    const name = missingColumn[1].trim();
    return `Column "${name}" doesn't exist. Check the schema panel for available columns.`;
  }

  return message;
}

function binaryPrefixHasNullByte(bytes: Uint8Array, maxBytes: number): boolean {
  const n = Math.min(bytes.length, maxBytes);
  for (let i = 0; i < n; i += 1) {
    if (bytes[i] === 0) {
      return true;
    }
  }
  return false;
}

function decodeBufferToString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const view = new DataView(buffer);
    let result = "";
    for (let index = 2; index < bytes.length - 1; index += 2) {
      result += String.fromCharCode(view.getUint16(index, false));
    }

    return result;
  }

  return new TextDecoder("utf-8").decode(bytes);
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function splitLineRecords(content: string): RawRecord[] {
  return content.split("\n").flatMap((line, index, allLines) => {
    const isTrailingEmptyLine = index === allLines.length - 1 && line === "";
    if (isTrailingEmptyLine) {
      return [];
    }

    return [{ text: line, lineNo: index + 1 }];
  });
}

function splitJournaldRecords(content: string): RawRecord[] {
  const lineRecords = splitLineRecords(content);
  const hasJsonLines = lineRecords.some((record) =>
    record.text.trim().startsWith("{")
  );

  if (hasJsonLines) {
    return lineRecords.filter((record) => record.text.trim().length > 0);
  }

  const lines = content.split("\n");
  const records: RawRecord[] = [];
  let currentLines: string[] = [];
  let startLineNo = 1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!currentLines.length && !line.trim()) {
      continue;
    }

    if (!currentLines.length) {
      startLineNo = index + 1;
    }

    if (!line.trim()) {
      if (currentLines.length) {
        records.push({ text: currentLines.join("\n"), lineNo: startLineNo });
        currentLines = [];
      }

      continue;
    }

    if (
      currentLines.length === 0 ||
      isJournaldRecordLine(line) ||
      /^\s/.test(line)
    ) {
      currentLines.push(line);
      continue;
    }

    records.push({ text: currentLines.join("\n"), lineNo: startLineNo });
    currentLines = [line];
    startLineNo = index + 1;
  }

  if (currentLines.length) {
    records.push({ text: currentLines.join("\n"), lineNo: startLineNo });
  }

  return records;
}

function getRecordsForFormat(format: LogFormat, content: string): RawRecord[] {
  if (format.name === "journald") {
    return splitJournaldRecords(content);
  }

  return splitLineRecords(content);
}

function dedupeSchema(columns: ColumnDef[]): ColumnDef[] {
  const seen = new Set<string>();
  const deduped: ColumnDef[] = [];

  for (const column of columns) {
    if (seen.has(column.name)) {
      continue;
    }

    seen.add(column.name);
    deduped.push(column);
  }

  return deduped;
}

function getFullSchema(
  format: LogFormat,
  inferredJsonSchema?: ColumnDef[]
): ColumnDef[] {
  return dedupeSchema([...BASE_SCHEMA, ...getSchemaForFormat(format, inferredJsonSchema)]);
}

function createLogsTable(db: SqlJsDatabase, schema: ColumnDef[]): void {
  const definitions = schema.map(
    (column) => `${escapeIdentifier(column.name)} ${column.type}`
  );

  db.run(`DROP TABLE IF EXISTS ${escapeIdentifier(LOGS_TABLE_NAME)}`);
  db.run(`CREATE TABLE ${escapeIdentifier(LOGS_TABLE_NAME)} (${definitions.join(", ")})`);
}

function coerceValue(value: CellValue | undefined): string | number | null {
  return value ?? null;
}

function recordToRow(schema: ColumnDef[], record: ParsedLogRecord): (string | number | null)[] {
  return schema.map((column) => coerceValue(record[column.name]));
}

async function insertRowsInBatches(
  db: SqlJsDatabase,
  schema: ColumnDef[],
  rows: (string | number | null)[][]
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const maxVariables = 900;
  const columnsPerRow = schema.length;
  const safeRowsPerStatement = Math.max(1, Math.floor(maxVariables / columnsPerRow));

  const columnSql = schema.map((column) => escapeIdentifier(column.name)).join(", ");
  const rowPlaceholders = `(${schema.map(() => "?").join(", ")})`;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const slice = rows.slice(offset, offset + BATCH_SIZE);

    db.run("BEGIN");
    try {
      for (let inner = 0; inner < slice.length; inner += safeRowsPerStatement) {
        const chunk = slice.slice(inner, inner + safeRowsPerStatement);
        const placeholders = chunk.map(() => rowPlaceholders).join(", ");
        const params = chunk.flat();

        db.run(
          `INSERT INTO ${escapeIdentifier(LOGS_TABLE_NAME)} (${columnSql}) VALUES ${placeholders}`,
          params
        );
      }
      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }

    if (typeof window !== "undefined" && offset + BATCH_SIZE < rows.length) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
}

function createIndexes(db: SqlJsDatabase, schema: ColumnDef[]): void {
  const columnNames = new Set(schema.map((column) => column.name));

  if (columnNames.has("line_no")) {
    db.run(
      `CREATE INDEX IF NOT EXISTS ${escapeIdentifier("idx_logs_line_no")} ON ${escapeIdentifier(
        LOGS_TABLE_NAME
      )} (${escapeIdentifier("line_no")})`
    );
  }

  if (columnNames.has("timestamp")) {
    db.run(
      `CREATE INDEX IF NOT EXISTS ${escapeIdentifier("idx_logs_timestamp")} ON ${escapeIdentifier(
        LOGS_TABLE_NAME
      )} (${escapeIdentifier("timestamp")})`
    );
  }

  if (columnNames.has("status")) {
    db.run(
      `CREATE INDEX IF NOT EXISTS ${escapeIdentifier("idx_logs_status")} ON ${escapeIdentifier(
        LOGS_TABLE_NAME
      )} (${escapeIdentifier("status")})`
    );
  }
}

function normalizeQueryRows(
  rows: (string | number | null | Uint8Array)[][]
): (string | number | null)[][] {
  return rows.map((row) =>
    row.map((cell) => {
      if (cell instanceof Uint8Array) {
        if (cell.length === 0) {
          return "";
        }

        try {
          return new TextDecoder("utf-8", { fatal: false }).decode(cell);
        } catch {
          return `[binary: ${cell.byteLength} bytes]`;
        }
      }

      return cell;
    })
  );
}

function reportProgress(
  callback: LoadLogFileOptions["onProgress"],
  progress: LoadProgress
): void {
  if (callback) {
    callback(progress);
  }
}

function resolveDetection(
  meaningfulLines: string[],
  options: LoadLogFileOptions
): { format: LogFormat; detection: DetectionResult | null } {
  if (options.formatOverride) {
    const forced = getFormat(options.formatOverride);
    if (forced) {
      return { format: forced, detection: null };
    }
  }

  const detection = detectFormat(meaningfulLines);
  return { format: detection.format, detection };
}

export async function loadLogFile(
  file: File,
  options: LoadLogFileOptions = {}
): Promise<LogDatabase> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large. Maximum is 500 MB.");
  }

  if (
    options.confirmLargeFile &&
    options.largeFileWarningBytes !== undefined &&
    file.size > options.largeFileWarningBytes
  ) {
    const shouldContinue = await options.confirmLargeFile(
      "This file is large and may take noticeable time to parse. Continue?"
    );

    if (!shouldContinue) {
      throw new Error("File loading cancelled by user");
    }
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (binaryPrefixHasNullByte(bytes, BINARY_SNIFF_BYTES)) {
    throw new Error(
      "This does not appear to be a text file. Only text-based log files are supported."
    );
  }

  const rawContent = normalizeContent(decodeBufferToString(buffer));

  const rawLines = splitLineRecords(rawContent);
  const meaningfulLines = rawLines
    .map((record) => record.text)
    .filter((line) => line.trim().length > 0);

  if (meaningfulLines.length === 0) {
    throw new Error("No log lines could be parsed from this file.");
  }

  const { format, detection } = resolveDetection(meaningfulLines, options);
  const records = getRecordsForFormat(format, rawContent);

  const parsedJsonRecords =
    format.name === "json"
      ? records
          .map((record) => format.parse(record.text, record.lineNo))
          .filter((record): record is ParsedLogRecord => record !== null)
          .slice(0, 100)
      : [];

  const schema = getFullSchema(
    format,
    format.name === "json" ? inferJsonSchema(parsedJsonRecords) : undefined
  );

  const SQL = await getSqlModule();
  const db = new SQL.Database();
  currentDatabase = db;
  createLogsTable(db, schema);

  const rowsToInsert: (string | number | null)[][] = [];
  let skippedCount = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const parsed =
      format.parse(record.text, record.lineNo) ??
      (format.name === "generic" ? parseGeneric(record.text, record.lineNo) : null);

    if (!parsed) {
      skippedCount += 1;
      reportProgress(options.onProgress, {
        current: index + 1,
        total: records.length,
      });
      continue;
    }

    rowsToInsert.push(recordToRow(schema, parsed));

    if ((index + 1) % 200 === 0 || index === records.length - 1) {
      reportProgress(options.onProgress, {
        current: index + 1,
        total: records.length,
      });
    }
  }

  await insertRowsInBatches(db, schema, rowsToInsert);
  const rowCount = rowsToInsert.length;

  if (rowCount === 0) {
    db.close();
    throw new Error("No log lines could be parsed from this file.");
  }

  createIndexes(db, schema);

  let closed = false;
  const detectionConfidence =
    detection && !options.formatOverride ? Math.round(detection.confidence * 100) : 0;

  return {
    db,
    format,
    schema,
    rowCount,
    skippedCount,
    tableName: LOGS_TABLE_NAME,
    detectionConfidence,
    query: (sql: string): QueryResult => {
      if (closed) {
        return {
          columns: [],
          rows: [],
          error:
            "The log database is no longer available. Upload your file again from the home page.",
        };
      }

      try {
        const result = db.exec(sql);
        if (result.length === 0) {
          return {
            columns: [],
            rows: [],
          };
        }

        return {
          columns: result[0].columns,
          rows: normalizeQueryRows(result[0].values),
        };
      } catch (error) {
        return {
          columns: [],
          rows: [],
          error: rewriteQueryError(
            error instanceof Error ? error.message : "Query failed"
          ),
        };
      }
    },
    close: (): void => {
      if (closed) {
        return;
      }

      db.close();
      closed = true;

      if (currentDatabase === db) {
        currentDatabase = null;
      }
    },
  };
}

export function getDatabase(): SqlJsDatabase | null {
  return currentDatabase;
}

export function closeDatabase(): void {
  if (currentDatabase) {
    currentDatabase.close();
    currentDatabase = null;
  }
}
