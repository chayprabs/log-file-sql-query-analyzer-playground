import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredCell = string | number | null;

const mockedSqlJs = vi.hoisted(() => {
  class FakeDatabase {
    public columns: string[] = [];
    public rows: StoredCell[][] = [];
    public closed = false;

    run(sql: string, params: StoredCell[] = []): void {
      const trimmed = sql.trim();

      if (/^DROP TABLE/i.test(trimmed)) {
        this.columns = [];
        this.rows = [];
        return;
      }

      if (/^CREATE TABLE/i.test(trimmed)) {
        const definitionMatch = trimmed.match(/\(([\s\S]+)\)$/);
        if (!definitionMatch) {
          throw new Error(`Unsupported CREATE TABLE statement: ${sql}`);
        }

        this.columns = definitionMatch[1]
          .split(",")
          .map((definition) => definition.trim())
          .map((definition) => {
            const quoted = definition.match(/^"([^"]+)"/);
            if (quoted) {
              return quoted[1];
            }

            return definition.split(/\s+/)[0].replace(/"/g, "");
          });
        return;
      }

      if (/^(BEGIN|COMMIT|ROLLBACK|CREATE INDEX)/i.test(trimmed)) {
        return;
      }

      if (/^INSERT INTO/i.test(trimmed)) {
        if (this.columns.length === 0) {
          throw new Error("Cannot insert before creating the table");
        }

        for (let index = 0; index < params.length; index += this.columns.length) {
          this.rows.push(params.slice(index, index + this.columns.length));
        }
        return;
      }

      throw new Error(`Unsupported SQL: ${sql}`);
    }

    exec(sql: string): Array<{ columns: string[]; values: StoredCell[][] }> {
      const trimmed = sql.trim();

      if (/no(?:n)?existent_table/i.test(trimmed)) {
        throw new Error("no such table: nonexistent_table");
      }

      if (/^SELECT COUNT\(\*\) AS total FROM logs/i.test(trimmed)) {
        return [{ columns: ["total"], values: [[this.rows.length]] }];
      }

      const selectMatch = trimmed.match(/^SELECT\s+(.+?)\s+FROM\s+logs/i);
      if (selectMatch) {
        const selectedColumns =
          selectMatch[1].trim() === "*"
            ? this.columns
            : selectMatch[1]
                .split(",")
                .map((column) => column.trim())
                .map((column) =>
                  column.replace(/\s+AS\s+.+$/i, "").replace(/"/g, "")
                );

        return [
          {
            columns: selectedColumns,
            values: this.rows.map((row) =>
              selectedColumns.map((column) => {
                const index = this.columns.indexOf(column);
                return index === -1 ? null : row[index];
              })
            ),
          },
        ];
      }

      return [];
    }

    close(): void {
      this.closed = true;
    }
  }

  return { FakeDatabase };
});

vi.mock("sql.js", () => ({
  default: vi.fn().mockResolvedValue({
    Database: mockedSqlJs.FakeDatabase,
  }),
}));

import { closeDatabase, loadLogFile } from "../db";

describe("loadLogFile", () => {
  beforeEach(() => {
    closeDatabase();
  });

  it("normalizes CRLF line endings and strips a BOM", async () => {
    const file = new File(
      [
        '\uFEFF127.0.0.1 - - [10/Oct/2024:13:55:36 -0700] "GET /first HTTP/1.1" 200 123 "-" "curl/8.0"\r\n127.0.0.2 - - [10/Oct/2024:13:55:37 -0700] "GET /second HTTP/1.1" 200 456 "-" "curl/8.0"\r\n',
      ],
      "access.log",
      { type: "text/plain" }
    );

    const database = await loadLogFile(file);
    const result = database.query("SELECT * FROM logs");

    expect(database.rowCount).toBe(2);
    expect(database.skippedCount).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.rows[0]).toContain("127.0.0.1");
    expect(result.rows[1]).toContain("127.0.0.2");
  });

  it("tracks skipped rows instead of crashing on malformed records", async () => {
    const file = new File(
      ['{"level":"info","message":"one"}\nnot-json\n{"level":"error","message":"two"}'],
      "mixed.json",
      { type: "application/json" }
    );

    const database = await loadLogFile(file);
    const countResult = database.query("SELECT COUNT(*) AS total FROM logs");

    expect(database.rowCount).toBe(2);
    expect(database.skippedCount).toBe(1);
    expect(countResult.rows).toEqual([[2]]);
  });

  it("returns columns and rows for successful queries", async () => {
    const file = new File(
      ['{"level":"info","message":"one"}\n{"level":"warn","message":"two"}'],
      "query.json",
      { type: "application/json" }
    );

    const database = await loadLogFile(file);
    const result = database.query("SELECT * FROM logs");

    expect(result.error).toBeUndefined();
    expect(result.columns).toContain("line_no");
    expect(result.columns).toContain("raw");
    expect(result.columns).toContain("level");
    expect(result.rows).toHaveLength(2);
  });

  it("returns SQL errors in the error field instead of throwing", async () => {
    const file = new File(['{"level":"info","message":"one"}'], "query.json", {
      type: "application/json",
    });

    const database = await loadLogFile(file);

    expect(() => database.query("SELECT * FROM nonexistent_table")).not.toThrow();
    expect(database.query("SELECT * FROM nonexistent_table")).toEqual({
      columns: [],
      rows: [],
      error:
        "The query referenced a table that wasn't found. Use the table name shown in the schema panel.",
    });
  });

  it("supports large-file confirmation hooks", async () => {
    const file = new File(['{"level":"info","message":"one"}'], "query.json", {
      type: "application/json",
    });

    await expect(
      loadLogFile(file, {
        largeFileWarningBytes: 1,
        confirmLargeFile: () => false,
      })
    ).rejects.toThrow("File loading cancelled by user");
  });
});
