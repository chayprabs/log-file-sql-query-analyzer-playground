"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLog } from "@/context/LogContext";
import { useUnsavedSql } from "@/context/UnsavedSqlContext";
import { QueryResult } from "@/lib/engine/db";
import { QUERY_HISTORY_MAX, QUERY_RESULT_PAGE_SIZE } from "@/lib/engine/limits";
import { getSuggestions } from "@/lib/engine/suggestions";

const DEFAULT_QUERY = "SELECT * FROM logs LIMIT 100";
const HISTORY_KEY = "lnav-web.query-history";
const PAGE_SIZE = QUERY_RESULT_PAGE_SIZE;

function readQueryHistory(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(HISTORY_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, QUERY_HISTORY_MAX);
  } catch {
    return [];
  }
}

function stripLeadingComments(sql: string): string {
  return sql
    .trim()
    .replace(/^(\s*--[^\n]*\n)+/g, "")
    .trim();
}

function isPotentiallyMutatingSql(sql: string): boolean {
  const trimmed = stripLeadingComments(sql);
  if (!trimmed) {
    return false;
  }

  const statements = trimmed
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const mutatingPattern =
    /\b(delete|insert|update|drop|alter|create|replace|attach|detach|truncate)\b/i;

  return statements.some((statement) => {
    if (mutatingPattern.test(statement)) {
      return true;
    }

    return !/^(select|values|explain|pragma)\b/i.test(statement);
  });
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

interface LensQueryWorkspaceProps {
  onLoadAnother?: () => void;
}

export function LensQueryWorkspace({ onLoadAnother }: LensQueryWorkspaceProps = {}) {
  const { db, fileName, loadFile, runQuery } = useLog();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [sql, setSql] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [queryHistory, setQueryHistory] = useState<string[]>(readQueryHistory);
  const [showSchema, setShowSchema] = useState(true);
  const lastExecutedSql = useRef(DEFAULT_QUERY);

  const suggestions = useMemo(() => (db ? getSuggestions(db) : []), [db]);

  const saveQueryToHistory = useCallback((statement: string): void => {
    const trimmed = statement.trim();
    if (!trimmed || typeof window === "undefined") {
      return;
    }

    setQueryHistory((currentHistory) => {
      const nextHistory = [
        trimmed,
        ...currentHistory.filter((entry) => entry !== trimmed),
      ].slice(0, QUERY_HISTORY_MAX);

      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
  }, []);

  const executeQuery = useCallback(
    (statement: string): void => {
      const trimmed = statement.trim();
      setResultInfo(null);

      if (!trimmed) {
        setQueryError("Enter a SQL query.");
        setResult(null);
        return;
      }

      if (
        typeof window !== "undefined" &&
        isPotentiallyMutatingSql(trimmed) &&
        !window.confirm(
          "Warning: This query modifies the database. Results may be unexpected."
        )
      ) {
        return;
      }

      startTransition(() => {
        const nextResult = runQuery(trimmed);
        setPage(0);

        if (nextResult.error) {
          setResult(null);
          setQueryError(nextResult.error);
          return;
        }

        saveQueryToHistory(trimmed);
        setQueryError(null);
        setResult(nextResult);
        lastExecutedSql.current = trimmed;

        if (nextResult.columns.length === 0) {
          setResultInfo("Query completed with no result columns.");
        } else if (nextResult.rows.length === 0) {
          setResultInfo("No rows returned.");
        }
      });
    },
    [runQuery, saveQueryToHistory]
  );
  useEffect(() => {
    if (!db) return;
    executeQuery(DEFAULT_QUERY);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when workspace opens for this file
  }, [db?.format.name, db?.rowCount, fileName]);


  const { registerDirtyCheck } = useUnsavedSql();

  useEffect(() => {
    return registerDirtyCheck(
      () => sql.trim() !== lastExecutedSql.current.trim()
    );
  }, [registerDirtyCheck, sql]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (sql.trim() === lastExecutedSql.current.trim()) {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [sql]);

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

  const clearHistory = (): void => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HISTORY_KEY);
    }

    setQueryHistory([]);
  };

  const handleExport = (): void => {
    if (!result || result.columns.length === 0 || result.rows.length === 0) {
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

  const skippedLabel =
    db.skippedCount > 0 ? ` · ${db.skippedCount.toLocaleString()} rows skipped` : "";

  const confidenceLabel =
    db.detectionConfidence > 0 ? ` · ${db.detectionConfidence}% confidence` : "";

  return (
    <section
      id="workspace"
      className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6"
      aria-label="SQL query workspace"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0 text-sm text-neutral-700">
          <span className="font-semibold text-neutral-900">
            {db.format.displayName}
          </span>
          {" · "}
          {db.rowCount.toLocaleString()} rows
          {" · "}
          <span className="truncate">{fileName ?? "Unnamed file"}</span>
          {skippedLabel}
          {confidenceLabel}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            aria-hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }
              const result = await loadFile(file);
              if (result.ok) {
                onLoadAnother?.();
              }
            }}
          />
          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Load another file
          </button>
          <button
            type="button"
            onClick={() => setShowSchema((current) => !current)}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {showSchema ? "Hide schema" : "Show schema"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <aside className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          {showSchema && (
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="m-0 mb-2 text-sm font-semibold text-neutral-900">
                Schema
              </p>
              <p className="m-0 mb-2 text-xs text-neutral-600">
                Table: <code>logs</code>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {db.schema.map((column) => (
                  <span
                    key={column.name}
                    className="rounded-full border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-neutral-800"
                  >
                    {column.name}{" "}
                    <span className="text-neutral-500">{column.type}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="m-0 text-sm font-semibold text-neutral-900">
              Suggestions
            </p>
            <p className="mt-1 mb-2 text-xs text-neutral-600">
              Click to run a starter query.
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion.sql)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-sm hover:border-neutral-300 hover:bg-white"
                >
                  <span className="font-medium text-neutral-900">
                    {suggestion.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-600">
                    {suggestion.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 p-4">
            <label
              htmlFor="sql-editor"
              className="mb-2 block text-sm font-semibold text-neutral-900"
            >
              SQL
            </label>
            <textarea
              id="sql-editor"
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              spellCheck={false}
              aria-label="SQL query editor. Press Control Enter or Command Enter to run."
              className="min-h-[120px] w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm leading-relaxed text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-neutral-500">
                Ctrl+Enter or Cmd+Enter to run
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => executeQuery(sql)}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Run query
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={
                    !result ||
                    !!queryError ||
                    !result.columns.length ||
                    !result.rows.length
                  }
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {queryHistory.length > 0 && (
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-700">
                    Recent queries
                  </span>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs text-neutral-600 underline hover:text-neutral-900"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {queryHistory.map((entry) => (
                    <button
                      type="button"
                      key={entry}
                      onClick={() => {
                        setSql(entry);
                        executeQuery(entry);
                      }}
                      className="max-w-full truncate rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-xs text-neutral-800 hover:bg-white"
                      title={entry}
                    >
                      {entry.length > 60 ? `${entry.slice(0, 60)}…` : entry}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {queryError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              {queryError}
            </div>
          )}

          {result && (
            <div className="px-4 pt-3 text-xs text-neutral-500">
              Showing {showingStart.toLocaleString()}–{showingEnd.toLocaleString()}{" "}
              of {totalRows.toLocaleString()} rows
            </div>
          )}

          <div className="overflow-x-auto p-4 pt-2">
            {!result && !queryError && !resultInfo && (
              <p className="m-0 text-sm text-neutral-500">
                Run a query to see results below.
              </p>
            )}

            {resultInfo && !queryError && (
              <p className="mb-3 text-sm text-neutral-600">{resultInfo}</p>
            )}

            {result && result.columns.length > 0 && result.rows.length > 0 && (
              <>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {result.columns.map((column) => (
                        <th
                          key={column}
                          scope="col" className="sticky top-0 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-medium text-neutral-800"
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
                          const isNull = cell === null;
                          const displayValue = isNull ? "NULL" : String(cell);

                          return (
                            <td
                              key={`${rowIndex}-${cellIndex}`}
                              title={isNull ? "" : displayValue}
                              className={`max-w-xs truncate border-b border-neutral-100 px-3 py-2 align-top ${
                                isNull
                                  ? "italic text-neutral-400"
                                  : "text-neutral-800"
                              }`}
                            >
                              {displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(0, current - 1))}
                      disabled={page === 0}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-neutral-600">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) => Math.min(totalPages - 1, current + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
