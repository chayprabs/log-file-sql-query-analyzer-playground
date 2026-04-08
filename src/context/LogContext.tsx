'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { LogDatabase, loadLogFile as loadLogFileDb, QueryResult } from '@/lib/engine/db';

interface LogContextType {
  db: LogDatabase | null;
  loading: boolean;
  error: string | null;
  fileName: string | null;
  loadFile: (file: File) => Promise<void>;
  runQuery: (sql: string) => QueryResult | null;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<LogDatabase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const loadFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const logDb = await loadLogFileDb(file);
      setDb(logDb);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const runQuery = (sql: string): QueryResult | null => {
    if (!db) return null;
    try {
      return db.query(sql);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query failed');
      return null;
    }
  };

  return (
    <LogContext.Provider value={{ db, loading, error, fileName, loadFile, runQuery }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLog must be used within LogProvider');
  }
  return context;
}