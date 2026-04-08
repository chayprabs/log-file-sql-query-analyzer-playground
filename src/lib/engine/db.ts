import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { LogFormat, ColumnDef, inferJsonSchema } from './formats';
import { detectFormat } from './detector';

export interface QueryResult {
  columns: string[];
  values: (string | number | null)[][];
  rowCount: number;
  executionTimeMs: number;
}

export interface LogDatabase {
  db: SqlJsDatabase;
  format: LogFormat;
  rowCount: number;
  query: (sql: string) => QueryResult;
  close: () => void;
}

let dbInstance: SqlJsDatabase | null = null;
let initPromise: Promise<void> | null = null;

async function initSql(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });
    dbInstance = new SQL.Database();
  })();
  
  return initPromise;
}

function getSqlType(column: ColumnDef): string {
  return column.type === 'INTEGER' || column.type === 'REAL' 
    ? 'INTEGER' 
    : 'TEXT';
}

function parseFileLines(content: string): string[] {
  // Normalize line endings: CRLF -> LF, then split
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip BOM if present
  const cleaned = normalized.replace(/^\uFEFF/, '');
  return cleaned.split('\n').filter(line => line.trim().length > 0);
}

export async function loadLogFile(file: File): Promise<LogDatabase> {
  await initSql();
  
  if (!dbInstance) {
    throw new Error('Failed to initialize SQL.js');
  }
  
  const content = await file.text();
  
  // Detect binary content by checking for control characters in first 1KB
  const sample = content.slice(0, 1024);
  if (/[\x00-\x08\x0E-\x1F]/.test(sample)) {
    throw new Error('File appears to be binary, not a text log file');
  }
  
  const lines = parseFileLines(content);
  
  if (lines.length === 0) {
    throw new Error('File is empty');
  }
  
  const { format: detectedFormat } = detectFormat(lines);
  
  let format = detectedFormat;
  let schema = format.schema;
  
  if (format.name === 'json') {
    const parsed = lines.slice(0, 100).map(line => {
      const result = format.parse(line);
      return result;
    }).filter(Boolean) as Record<string, string | number | null>[];
    
    if (parsed.length > 0) {
      const inferredSchema = inferJsonSchema(parsed);
      schema = [
        { name: 'line_no', type: 'INTEGER' as const },
        { name: 'raw_line', type: 'TEXT' as const },
        ...inferredSchema,
      ];
    }
  }
  
  const tableName = format.name.replace(/_access/, 's');
  dbInstance.run(`DROP TABLE IF EXISTS ${tableName}`);
  
  const columns = schema.map(col => `${col.name} ${getSqlType(col)}`);
  columns.unshift('id INTEGER PRIMARY KEY');
  columns.unshift('line_no INTEGER');
  
  const createSql = `CREATE TABLE ${tableName} (${columns.join(', ')})`;
  dbInstance.run(createSql);
  
  const hasTimestamp = schema.some(c => 
    c.name.toLowerCase().includes('time') || 
    c.name.toLowerCase().includes('timestamp')
  );
  
  let prevTimestamp: number | null = null;
  let batchSize = 5000;
  let batch: (string | number | null)[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let parsed = format.parse(line);
    
    if (!parsed) {
      parsed = { raw_line: line, line_no: i + 1 };
    }
    
    const values: (string | number | null)[] = [];
    values.push(i + 1);
    values.push(i + 1);
    
    for (const col of schema) {
      const value = parsed[col.name];
      values.push(value ?? null);
    }
    
    if (hasTimestamp && parsed.timestamp) {
      const ts = new Date(parsed.timestamp as string).getTime();
      if (prevTimestamp !== null) {
        const idle = ts - prevTimestamp;
        values.push(idle);
      } else {
        values.push(0);
      }
      prevTimestamp = ts;
    }
    
    batch.push(...values);
    
    if (batch.length >= batchSize * values.length || i === lines.length - 1) {
      const placeholders = batch.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${tableName} VALUES (${placeholders})`;
      
      try {
        dbInstance.run(insertSql, batch);
      } catch (e) {
        console.error('Insert error:', e);
      }
      
      batch = [];
    }
  }
  
  if (hasTimestamp) {
    try {
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_${tableName}_time ON ${tableName}(line_no)`);
    } catch {}
  }
  
  const rowCount = lines.length;
  
  const queryFn = (sql: string): QueryResult => {
    if (!dbInstance) throw new Error('Database not initialized');
    
    const start = performance.now();
    const result = dbInstance.exec(sql);
    const executionTimeMs = performance.now() - start;
    
    if (result.length === 0) {
      return { columns: [], values: [], rowCount: 0, executionTimeMs };
    }
    
    return {
      columns: result[0].columns,
      values: result[0].values.map(row => 
        row.map(cell => {
          if (cell instanceof Uint8Array) return null;
          return cell;
        })
      ),
      rowCount: result[0].values.length,
      executionTimeMs,
    };
  };
  
  return {
    db: dbInstance,
    format,
    rowCount,
    query: queryFn,
    close: () => {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    },
  };
}

export function getDatabase(): SqlJsDatabase | null {
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    initPromise = null;
  }
}