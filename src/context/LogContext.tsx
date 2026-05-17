"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  loadLogFile as loadLogFileDb,
  LoadProgress,
  LogDatabase,
  QueryResult,
} from "@/lib/engine/db";
import type { LogFormat } from "@/lib/engine/formats";

export interface LoadFileOptions {
  formatOverride?: LogFormat["name"];
}

interface LogContextType {
  db: LogDatabase | null;
  loading: boolean;
  error: string | null;
  fileName: string | null;
  progress: LoadProgress | null;
  clearError: () => void;
  loadFile: (file: File, options?: LoadFileOptions) => Promise<boolean>;
  runQuery: (sql: string) => QueryResult;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const LARGE_CONFIRM_BYTES = 100 * 1024 * 1024;

export function LogProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<LogDatabase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);

  useEffect(() => {
    return () => {
      setDb((currentDb) => {
        currentDb?.close();
        return null;
      });
    };
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const loadFile = useCallback(async (file: File, options?: LoadFileOptions): Promise<boolean> => {
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large. Maximum is 500 MB.");
      return false;
    }

    if (typeof window !== "undefined" && db) {
      const shouldReplace = window.confirm("Replace the current file?");
      if (!shouldReplace) {
        return false;
      }
    }

    if (typeof window !== "undefined" && file.size > LARGE_CONFIRM_BYTES) {
      const shouldContinue = window.confirm(
        "This file is large and may take 30+ seconds to parse. Continue?"
      );
      if (!shouldContinue) {
        return false;
      }
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      const nextDb = await loadLogFileDb(file, {
        formatOverride: options?.formatOverride,
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
        },
      });

      setDb((currentDb) => {
        currentDb?.close();
        return nextDb;
      });
      setFileName(file.name);
      setProgress(null);

      return true;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load the selected file."
      );
      setProgress(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db]);

  const runQuery = useCallback(
    (sql: string): QueryResult => {
      if (!db) {
        return {
          columns: [],
          rows: [],
          error: "No log file is loaded.",
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
