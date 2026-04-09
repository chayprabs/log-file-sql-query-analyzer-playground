import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import { detectFormat } from "./detector";
import {
  CellValue,
  ColumnDef,
  getSchemaForFormat,
  inferJsonSchema,
  isJournaldRecordLine,
  LogFormat,
  parseGeneric,
  ParsedLogRecord,
} from "./formats";

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
}

export interface LogDatabase {
  db: SqlJsDatabase;
  format: LogFormat;
  schema: ColumnDef[];
  rowCount: number;
  skippedCount: number;
  tableName: typeof LOGS_TABLE_NAME;
  query: (sql: string) => QueryResult;
  close: () => void;
}

interface RawRecord {
  text: string;
  lineNo: number;
}

const DEFAULT_LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;
const BATCH_SIZE = 5000;

export const LOGS_TABLE_NAME = "logs";

export const BASE_SCHEMA: ColumnDef[] = [
  { name: "line_no", type: "INTEGER" },
  { name: "raw_line", type: "TEXT" },
];

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
let currentDatabase: SqlJsDatabase | null = null;

function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getWasmPath(file: string): string {
  if (typeof window === "undefined") {
    return file;
  }

  return new URL(`/${file}`, window.location.origin).toString();
}

async function getSqlModule(): Promise<SqlJsStatic> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (file) => getWasmPath(file),
    });
  }

  return sqlModulePromise;
}

function normalizeContent(content: string): string {
  return content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isProbablyBinary(content: string): boolean {
  return /[\x00-\x08\x0E-\x1F]/.test(content.slice(0, 1024));
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

function flushBatch(
  db: SqlJsDatabase,
  schema: ColumnDef[],
  batch: (string | number | null)[][]
): void {
  if (!batch.length) {
    return;
  }

  const columns = schema.map((column) => escapeIdentifier(column.name)).join(", ");
  const rowPlaceholders = `(${schema.map(() => "?").join(", ")})`;
  const placeholders = batch.map(() => rowPlaceholders).join(", ");
  const params = batch.flat();

  db.run("BEGIN TRANSACTION");
  try {
    db.run(
      `INSERT INTO ${escapeIdentifier(LOGS_TABLE_NAME)} (${columns}) VALUES ${placeholders}`,
      params
    );
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
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
        return null;
      }

      return cell;
    })
  );
}

function buildLargeFileWarning(fileName: string, size: number): string {
  const sizeInMb = (size / (1024 * 1024)).toFixed(1);
  return `${fileName} is ${sizeInMb} MB. Large log files may take noticeable time to parse. Continue?`;
}

function reportProgress(
  callback: LoadLogFileOptions["onProgress"],
  progress: LoadProgress
): void {
  if (callback) {
    callback(progress);
  }
}

export async function loadLogFile(
  file: File,
  options: LoadLogFileOptions = {}
): Promise<LogDatabase> {
  const largeFileWarningBytes =
    options.largeFileWarningBytes ?? DEFAULT_LARGE_FILE_WARNING_BYTES;

  if (file.size > largeFileWarningBytes && options.confirmLargeFile) {
    const shouldContinue = await options.confirmLargeFile(
      buildLargeFileWarning(file.name, file.size)
    );

    if (!shouldContinue) {
      throw new Error("File loading cancelled by user");
    }
  }

  const rawContent = normalizeContent(await file.text());
  if (isProbablyBinary(rawContent)) {
    throw new Error("File appears to be binary, not a text log");
  }

  const rawLines = splitLineRecords(rawContent);
  const meaningfulLines = rawLines
    .map((record) => record.text)
    .filter((line) => line.trim().length > 0);

  if (meaningfulLines.length === 0) {
    throw new Error("File is empty");
  }

  const detection = detectFormat(meaningfulLines);
  const format = detection.format;
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

  let batch: (string | number | null)[][] = [];
  let rowCount = 0;
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

    batch.push(recordToRow(schema, parsed));

    if (batch.length >= BATCH_SIZE) {
      flushBatch(db, schema, batch);
      rowCount += batch.length;
      batch = [];
    }

    if ((index + 1) % 200 === 0 || index === records.length - 1) {
      reportProgress(options.onProgress, {
        current: index + 1,
        total: records.length,
      });
    }
  }

  if (batch.length) {
    flushBatch(db, schema, batch);
    rowCount += batch.length;
  }

  createIndexes(db, schema);

  let closed = false;

  return {
    db,
    format,
    schema,
    rowCount,
    skippedCount,
    tableName: LOGS_TABLE_NAME,
    query: (sql: string): QueryResult => {
      if (closed) {
        return {
          columns: [],
          rows: [],
          error: "Database is closed",
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
          error: error instanceof Error ? error.message : "Query failed",
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
