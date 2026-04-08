export type LogLevel = 'trace' | 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'fatal' | 'unknown';

export interface ParsedLogLine {
  lineNumber: number;
  rawText: string;
  timestamp: Date | null;
  timestampMsecs: number | null;
  level: LogLevel;
  format: string;
  body: string;
  fields: Record<string, string | number | null>;
}

export interface LogFormat {
  name: string;
  pattern: RegExp;
  timestampFields: string[];
  timestampFormats: string[];
  levelField?: string;
  levelPairs?: [number | string, LogLevel][];
  fields: FormatField[];
  json?: boolean;
  sampleLines?: string[];
}

export interface FormatField {
  name: string;
  type: 'text' | 'integer' | 'float' | 'timestamp' | 'boolean' | 'json';
  identifier?: boolean;
  collate?: string;
  hidden?: boolean;
}

export interface QueryResult {
  columns: string[];
  values: (string | number | null | Uint8Array)[][];
  executionTime: number;
}

export interface FormatDetector {
  name: string;
  pattern: RegExp;
  priority: number;
}

export type TimeRange = [Date, Date] | null;