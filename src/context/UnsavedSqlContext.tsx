"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";

type DirtyCheck = () => boolean;

interface UnsavedSqlContextValue {
  registerDirtyCheck: (check: DirtyCheck) => () => void;
  hasUnsavedSql: () => boolean;
}

const UnsavedSqlContext = createContext<UnsavedSqlContextValue | undefined>(
  undefined
);

export function UnsavedSqlProvider({ children }: { children: ReactNode }) {
  const checksRef = useRef(new Set<DirtyCheck>());

  const registerDirtyCheck = useCallback((check: DirtyCheck): (() => void) => {
    checksRef.current.add(check);
    return () => {
      checksRef.current.delete(check);
    };
  }, []);

  const hasUnsavedSql = useCallback((): boolean => {
    for (const check of checksRef.current) {
      if (check()) {
        return true;
      }
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({ registerDirtyCheck, hasUnsavedSql }),
    [registerDirtyCheck, hasUnsavedSql]
  );

  return (
    <UnsavedSqlContext.Provider value={value}>
      {children}
    </UnsavedSqlContext.Provider>
  );
}

export function useUnsavedSql(): UnsavedSqlContextValue {
  const ctx = useContext(UnsavedSqlContext);
  if (!ctx) {
    throw new Error("useUnsavedSql must be used within UnsavedSqlProvider");
  }
  return ctx;
}
