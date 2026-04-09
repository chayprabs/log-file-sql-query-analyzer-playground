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

interface LogContextType {
  db: LogDatabase | null;
  loading: boolean;
  error: string | null;
  fileName: string | null;
  progress: LoadProgress | null;
  clearError: () => void;
  loadFile: (file: File) => Promise<boolean>;
  runQuery: (sql: string) => QueryResult;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

const SOFT_WARNING_THRESHOLD = 50 * 1024 * 1024;
const LARGE_WARNING_THRESHOLD = 100 * 1024 * 1024;

function getLargeFileMessage(fileSize: number): string {
  if (fileSize > LARGE_WARNING_THRESHOLD) {
    return "This file is large and may take 30+ seconds to parse. Continue?";
  }

  if (fileSize > SOFT_WARNING_THRESHOLD) {
    return "This file is large and may take noticeable time to parse. Continue?";
  }

  return "";
}

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

  const loadFile = useCallback(async (file: File): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      const warningMessage = getLargeFileMessage(file.size);
      if (warningMessage && typeof window !== "undefined") {
        const shouldContinue = window.confirm(warningMessage);
        if (!shouldContinue) {
          setProgress(null);
          setLoading(false);
          return false;
        }
      }

      const nextDb = await loadLogFileDb(file, {
        confirmLargeFile: (warning) =>
          typeof window === "undefined" ? true : window.confirm(warning),
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
  }, []);

  const runQuery = useCallback((sql: string): QueryResult => {
    if (!db) {
      return {
        columns: [],
        rows: [],
        error: "No log file is loaded.",
      };
    }

    return db.query(sql);
  }, [db]);

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
