declare module 'sql.js' {
  export type SqlValue = string | number | null | Uint8Array;

  export interface Database {
    run(sql: string, params?: SqlValue[]): void;
    exec(sql: string): QueryExecResult[];
    close(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Uint8Array | null) => Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
