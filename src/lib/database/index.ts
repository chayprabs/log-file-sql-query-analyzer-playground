import initSqlJs, { Database } from 'sql.js';
import { ParsedLogLine, QueryResult, LogFormat } from '@/types';

let db: Database | null = null;
let sqlPromise: Promise<void> | null = null;

export async function initDatabase(): Promise<void> {
  if (sqlPromise) return sqlPromise;
  
  sqlPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });
    db = new SQL.Database();
  })();
  
  return sqlPromise;
}

export function getDatabase(): Database | null {
  return db;
}

function getColumnType(type: string): string {
  if (type === 'integer' || type === 'float') return 'REAL';
  return 'TEXT';
}

export async function createLogTable(format: LogFormat, lines: ParsedLogLine[]): Promise<void> {
  await initDatabase();
  if (!db) return;
  
  const tableName = format.name.replace(/_log$/, '') + 's';
  
  db.run(`DROP TABLE IF EXISTS ${tableName}`);
  
  const columns = [
    'log_line INTEGER',
    'log_time TEXT',
    'log_level TEXT',
    'log_actual_time TEXT',
    'log_idle_msecs INTEGER',
    'log_mark INTEGER DEFAULT 0',
    'log_path TEXT',
    'log_text TEXT',
    'log_body TEXT',
    'log_format TEXT',
    'log_time_msecs INTEGER',
  ];
  
  for (const field of format.fields) {
    columns.push(`${field.name} ${getColumnType(field.type)}`);
  }
  
  const createSQL = `CREATE TABLE ${tableName} (${columns.join(', ')})`;
  db.run(createSQL);
  
  let prevTime = 0;
  const values: (string | number | null)[] = [];
  
  for (const line of lines) {
    values.push(
      line.lineNumber,
      line.timestamp?.toISOString() ?? null,
      line.level,
      line.timestamp?.toISOString() ?? null,
      prevTime ? (line.timestampMsecs ?? 0) - prevTime : 0,
      0,
      '',
      line.rawText,
      line.body,
      line.format,
      line.timestampMsecs,
    );
    
    for (const field of format.fields) {
      const value = line.fields[field.name];
      if (typeof value === 'number') {
        values.push(value);
      } else if (typeof value === 'string') {
        values.push(value);
      } else {
        values.push(null);
      }
    }
    
    prevTime = line.timestampMsecs ?? 0;
  }
  
  if (values.length > 0) {
    const placeholders = values.map(() => '?').join(', ');
    const insertSQL = `INSERT INTO ${tableName} VALUES (${placeholders})`;
    try {
      db.run(insertSQL, values);
    } catch (e) {
      console.error('Insert error:', e);
    }
  }
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_${tableName}_time ON ${tableName}(log_time_msecs)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_${tableName}_level ON ${tableName}(log_level)`);
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  await initDatabase();
  if (!db) throw new Error('Database not initialized');
  
  const start = performance.now();
  const result = db.exec(sql);
  const executionTime = performance.now() - start;
  
  if (result.length === 0) {
    return { columns: [], values: [], executionTime };
  }
  
  const values = result[0].values.map(row =>
    row.map(cell => (cell instanceof Uint8Array ? null : cell))
  );
  
  return {
    columns: result[0].columns,
    values: values as (string | number | null)[][],
    executionTime,
  };
}

export function getAllTables(): string[] {
  if (!db) return [];
  
  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  if (result.length === 0) return [];
  
  return result[0].values.map((row) => row[0] as string);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}