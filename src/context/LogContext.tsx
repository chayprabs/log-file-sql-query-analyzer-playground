"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  loadLogFile as loadLogFileDb,
  LoadCancelledError,
  LoadProgress,
  LogDatabase,
  QueryResult,
} from "@/lib/engine/db";
import {
  LARGE_CONFIRM_BYTES,
  MAX_FILE_BYTES,
} from "@/lib/engine/limits";
import type { LogFormat } from "@/lib/engine/formats";

export interface LoadFileOptions {
  formatOverride?: LogFormat["name"];
}

export interface LoadFileSuccess {
  ok: true;
  fileName: string;
  formatDisplayName: string;
  rowCount: number;
  skippedCount: number;
  detectionConfidence: number;
  usedFormatOverride: boolean;
}

export type LoadFileResult = LoadFileSuccess | { ok: false };

interface LogContextType {
  db: LogDatabase | null;
  loading: boolean;
  error: string | null;
  fileName: string | null;
  progress: LoadProgress | null;
  clearError: () => void;
  cancelLoad: () => void;
  loadFile: (file: File, options?: LoadFileOptions) => Promise<LoadFileResult>;
  runQuery: (sql: string) => QueryResult;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<LogDatabase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const loadInFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      setDb((currentDb) => {
        currentDb?.close();
        return null;
      });
    };
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const cancelLoad = useCallback((): void => {
    abortControllerRef.current?.abort();
  }, []);

  const loadFile = useCallback(
    async (file: File, options?: LoadFileOptions): Promise<LoadFileResult> => {
      if (loadInFlightRef.current) {
        setError("A file is already being parsed. Please wait or cancel the current load.");
        return { ok: false };
      }

      if (file.size > MAX_FILE_BYTES) {
        setError("File is too large. Maximum is 500 MB.");
        return { ok: false };
      }

      if (typeof window !== "undefined" && db) {
        const shouldReplace = window.confirm("Replace the current file?");
        if (!shouldReplace) {
          return { ok: false };
        }
      }

      if (typeof window !== "undefined" && file.size > LARGE_CONFIRM_BYTES) {
        const shouldContinue = window.confirm(
          "This file is large and may take 30+ seconds to parse. Continue?"
        );
        if (!shouldContinue) {
          return { ok: false };
        }
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      loadInFlightRef.current = true;
      setLoading(true);
      setError(null);
      setProgress({ phase: "reading", current: 0, total: 1 });

      try {
        const nextDb = await loadLogFileDb(file, {
          formatOverride: options?.formatOverride,
          signal: abortController.signal,
          onProgress: (nextProgress) => {
            setProgress(nextProgress);
          },
        });

        if (abortController.signal.aborted) {
          nextDb.close();
          return { ok: false };
        }

        setDb((currentDb) => {
          currentDb?.close();
          return nextDb;
        });
        setFileName(file.name);
        setProgress(null);

        return {
          ok: true,
          fileName: file.name,
          formatDisplayName: nextDb.format.displayName,
          rowCount: nextDb.rowCount,
          skippedCount: nextDb.skippedCount,
          detectionConfidence: nextDb.detectionConfidence,
          usedFormatOverride: Boolean(options?.formatOverride),
        };
      } catch (loadError) {
        if (loadError instanceof LoadCancelledError) {
          setError(null);
          return { ok: false };
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the selected file."
        );
        setProgress(null);
        return { ok: false };
      } finally {
        loadInFlightRef.current = false;
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setLoading(false);
      }
    },
    [db]
  );

  const runQuery = useCallback(
    (sql: string): QueryResult => {
      if (!db) {
        return {
          columns: [],
          rows: [],
          error:
            "No log file is loaded. Upload a log file on the home page and try again.",
        };
      }

      return db.query(sql);
    },
    [db]
  );

  return (
    <LogContext.Provider
      value={{
        db,
        loading,
        error,
        fileName,
        progress,
        clearError,
        cancelLoad,
        loadFile,
        runQuery,
      }}
    >
      {children}
    </LogContext.Provider>
  );
}

export function useLog(): LogContextType {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLog must be used within LogProvider");
  }

  return context;
}
