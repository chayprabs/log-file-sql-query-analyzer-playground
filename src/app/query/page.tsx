"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useLog } from "@/context/LogContext";
import { QueryResult } from "@/lib/engine/db";
import { getSuggestions } from "@/lib/engine/suggestions";

const DEFAULT_QUERY = "SELECT * FROM logs LIMIT 100";
const HISTORY_KEY = "lnav-web.query-history";
const PAGE_SIZE = 100;

function readQueryHistory(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(HISTORY_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function formatQueryError(rawError: string, availableColumns: string[]): string {
  const missingTable = rawError.match(/no such table: ([^\s]+)/i);
  if (missingTable) {
    return `Table "${missingTable[1]}" not found. Use table name: logs.`;
  }

  const missingColumn = rawError.match(/no such column: ([^\s]+)/i);
  if (missingColumn) {
    return `Column "${missingColumn[1]}" not found. Available columns: ${availableColumns.join(
      ", "
    )}`;
  }

  return rawError;
}

function buildCsv(result: QueryResult): string {
  const escapeCell = (value: string | number | null): string => {
    if (value === null) {
      return "";
    }

    const stringValue = String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const headerRow = result.columns.map(escapeCell).join(",");
  const dataRows = result.rows.map((row) => row.map(escapeCell).join(","));
  return [headerRow, ...dataRows].join("\n");
}

interface LoadedQueryWorkspaceProps {
  fileName: string | null;
  runQuery: (sql: string) => QueryResult;
}

function LoadedQueryWorkspace({
  fileName,
  runQuery,
}: LoadedQueryWorkspaceProps) {
  const router = useRouter();
  const { db } = useLog();
  const [sql, setSql] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [queryHistory, setQueryHistory] = useState<string[]>(readQueryHistory);
  const [showSchema, setShowSchema] = useState(true);

  const suggestions = useMemo(() => (db ? getSuggestions(db) : []), [db]);
  const availableColumns = db?.schema.map((column) => column.name) ?? [];

  const saveQueryToHistory = (statement: string): void => {
    const trimmed = statement.trim();
    if (!trimmed || typeof window === "undefined") {
      return;
    }

    setQueryHistory((currentHistory) => {
      const nextHistory = [
        trimmed,
        ...currentHistory.filter((entry) => entry !== trimmed),
      ].slice(0, 10);

      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const executeQuery = (statement: string): void => {
    const trimmed = statement.trim();
    if (!trimmed) {
      return;
    }

    saveQueryToHistory(trimmed);

    startTransition(() => {
      const nextResult = runQuery(trimmed);
      setPage(0);

      if (nextResult.error) {
        setResult(null);
        setQueryError(formatQueryError(nextResult.error, availableColumns));
        return;
      }

      setQueryError(null);
      setResult(nextResult);
    });
  };

  const onWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      executeQuery(sql);
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onWindowKeyDown(event);
    };

    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);

  const handleSuggestionClick = (nextSql: string): void => {
    setSql(nextSql);
    executeQuery(nextSql);
  };

  const handleExport = (): void => {
    if (!result) {
      return;
    }

    const csv = buildCsv(result);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "query-results.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!db) {
    return null;
  }

  const totalRows = result?.rows.length ?? 0;
  const totalPages = totalRows === 0 ? 0 : Math.ceil(totalRows / PAGE_SIZE);
  const pagedRows =
    result?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const showingStart = totalRows === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingEnd = totalRows === 0 ? 0 : page * PAGE_SIZE + pagedRows.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fcfaf7 0%, #f6f2e8 55%, #eef4ef 100%)",
        color: "#1d2a26",
        padding: "20px",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          maxWidth: "1440px",
          display: "grid",
          gap: "18px",
        }}
      >
        <section
          style={{
            border: "1px solid rgba(29, 42, 38, 0.12)",
            borderRadius: "20px",
            padding: "18px 22px",
            background: "rgba(255, 255, 255, 0.82)",
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: "6px" }}>
            <strong>
              {db.rowCount.toLocaleString()} rows loaded from logs ({db.format.name}
              )
            </strong>
            <span style={{ color: "#55665f" }}>
              {fileName ?? "Unnamed file"} | {db.format.displayName}
              {db.skippedCount > 0
                ? ` | ${db.skippedCount.toLocaleString()} rows skipped`
                : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/")}
              style={{
                border: "1px solid rgba(35, 75, 61, 0.2)",
                borderRadius: "999px",
                padding: "10px 16px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Load another file
            </button>
            <button
              onClick={() => setShowSchema((current) => !current)}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "10px 16px",
                background: "#234b3d",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {showSchema ? "Hide schema" : "Show schema"}
            </button>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "minmax(0, 1fr)",
          }}
        >
          <aside
            style={{
              border: "1px solid rgba(29, 42, 38, 0.12)",
              borderRadius: "20px",
              padding: "18px",
              background: "rgba(255, 255, 255, 0.74)",
              display: "grid",
              gap: "12px",
              alignContent: "start",
            }}
          >
            <div>
              <strong>Suggestions</strong>
              <p style={{ marginBottom: 0, color: "#55665f" }}>
                Click a query to load it into the editor and run it immediately.
              </p>
            </div>

            {suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                onClick={() => handleSuggestionClick(suggestion.sql)}
                style={{
                  textAlign: "left",
                  border: "1px solid rgba(35, 75, 61, 0.12)",
                  borderRadius: "16px",
                  padding: "12px 14px",
                  background: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  gap: "4px",
                }}
              >
                <strong>{suggestion.label}</strong>
                <span style={{ color: "#55665f", fontSize: "0.92rem" }}>
                  {suggestion.description}
                </span>
              </button>
            ))}
          </aside>

          <section
            style={{
              border: "1px solid rgba(29, 42, 38, 0.12)",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.82)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderBottom: "1px solid rgba(29, 42, 38, 0.08)",
                display: "grid",
                gap: "12px",
              }}
            >
              <div style={{ display: "grid", gap: "8px" }}>
                <label htmlFor="sql-editor" style={{ fontWeight: 600 }}>
                  SQL editor
                </label>
                <textarea
                  id="sql-editor"
                  value={sql}
                  onChange={(event) => setSql(event.target.value)}
                  spellCheck={false}
                  style={{
                    minHeight: "140px",
                    resize: "vertical",
                    borderRadius: "16px",
                    border: "1px solid rgba(29, 42, 38, 0.16)",
                    padding: "14px 16px",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, SFMono-Regular, Consolas, monospace",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#55665f" }}>
                  Press Ctrl+Enter to run the current query.
                </span>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => executeQuery(sql)}
                    style={{
                      border: "none",
                      borderRadius: "999px",
                      background: "#1d2a26",
                      color: "#fff",
                      padding: "10px 18px",
                      cursor: "pointer",
                    }}
                  >
                    Run query
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={!result || !!queryError}
                    style={{
                      border: "1px solid rgba(29, 42, 38, 0.16)",
                      borderRadius: "999px",
                      background: "#fff",
                      padding: "10px 18px",
                      cursor:
                        !result || !!queryError ? "not-allowed" : "pointer",
                      opacity: !result || !!queryError ? 0.5 : 1,
                    }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {queryHistory.length > 0 && (
                <div style={{ display: "grid", gap: "8px" }}>
                  <strong>Recent queries</strong>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {queryHistory.map((entry) => (
                      <button
                        key={entry}
                        onClick={() => setSql(entry)}
                        style={{
                          border: "1px solid rgba(29, 42, 38, 0.14)",
                          borderRadius: "999px",
                          background: "#f6f8f5",
                          padding: "8px 12px",
                          cursor: "pointer",
                          maxWidth: "100%",
                        }}
                        title={entry}
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showSchema && (
                <div
                  style={{
                    borderRadius: "18px",
                    padding: "14px 16px",
                    background: "#f5f7f4",
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <strong>Schema</strong>
                  <div style={{ color: "#55665f" }}>Table: logs</div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {db.schema.map((column) => (
                      <span
                        key={column.name}
                        style={{
                          borderRadius: "999px",
                          background: "#fff",
                          border: "1px solid rgba(29, 42, 38, 0.12)",
                          padding: "8px 10px",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, SFMono-Regular, Consolas, monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {column.name} <span style={{ color: "#6d7c75" }}>{column.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {queryError && (
              <div
                style={{
                  borderBottom: "1px solid rgba(166, 50, 34, 0.1)",
                  background: "rgba(255, 245, 243, 0.95)",
                  color: "#8a2d20",
                  padding: "14px 18px",
                }}
              >
                {queryError}
              </div>
            )}

            <div
              style={{
                padding: "16px 18px 0",
                color: "#55665f",
              }}
            >
              Showing {showingStart.toLocaleString()}-{showingEnd.toLocaleString()} of{" "}
              {totalRows.toLocaleString()} rows
            </div>

            <div style={{ padding: "16px 18px 20px", overflowX: "auto" }}>
              {!result && !queryError && (
                <div style={{ color: "#55665f" }}>
                  Run a query to inspect the loaded log table.
                </div>
              )}

              {result && result.columns.length === 0 && !queryError && (
                <div style={{ color: "#55665f" }}>No rows returned.</div>
              )}

              {result && result.columns.length > 0 && (
                <>
                  {result.rows.length === 0 ? (
                    <div style={{ color: "#55665f" }}>No rows returned.</div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.92rem",
                      }}
                    >
                      <thead>
                        <tr>
                          {result.columns.map((column) => (
                            <th
                              key={column}
                              style={{
                                textAlign: "left",
                                padding: "12px",
                                background: "#f3f5f1",
                                borderBottom: "1px solid rgba(29, 42, 38, 0.1)",
                                position: "sticky",
                                top: 0,
                              }}
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((row, rowIndex) => (
                          <tr key={`${page}-${rowIndex}`}>
                            {row.map((cell, cellIndex) => {
                              const displayValue =
                                cell === null ? "" : String(cell);

                              return (
                                <td
                                  key={`${rowIndex}-${cellIndex}`}
                                  title={displayValue}
                                  style={{
                                    padding: "12px",
                                    borderBottom:
                                      "1px solid rgba(29, 42, 38, 0.08)",
                                    maxWidth: "320px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    verticalAlign: "top",
                                  }}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "12px",
                        marginTop: "18px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={page === 0}
                        style={{
                          border: "1px solid rgba(29, 42, 38, 0.14)",
                          borderRadius: "999px",
                          padding: "10px 16px",
                          background: "#fff",
                          cursor: page === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        Previous
                      </button>
                      <div style={{ display: "grid", placeItems: "center" }}>
                        Page {page + 1} of {totalPages}
                      </div>
                      <button
                        onClick={() =>
                          setPage((current) => Math.min(totalPages - 1, current + 1))
                        }
                        disabled={page >= totalPages - 1}
                        style={{
                          border: "1px solid rgba(29, 42, 38, 0.14)",
                          borderRadius: "999px",
                          padding: "10px 16px",
                          background: "#fff",
                          cursor:
                            page >= totalPages - 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function QueryPage() {
  const router = useRouter();
  const { db, fileName, loading, runQuery } = useLog();

  useEffect(() => {
    if (loading || db) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/");
    }, 600);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [db, loading, router]);

  if (loading) {
    return <main style={{ padding: "24px" }}>Loading log database...</main>;
  }

  if (!db) {
    return (
      <main style={{ padding: "24px" }}>
        No log file is loaded. Redirecting back to the upload page...
      </main>
    );
  }

  return (
    <LoadedQueryWorkspace
      key={`${fileName ?? "log"}-${db.format.name}-${db.rowCount}`}
      fileName={fileName}
      runQuery={runQuery}
    />
  );
}
