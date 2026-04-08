'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLog } from '@/context/LogContext';
import { getSuggestions } from '@/lib/engine/suggestions';
import { QueryResult } from '@/lib/engine/db';

const PAGE_SIZE = 100;

function QueryPage() {
  const router = useRouter();
  const { db, loading, error: dbError, fileName, runQuery, loadFile } = useLog();
  const [sql, setSql] = useState('SELECT * FROM logs LIMIT 100');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!db && !loading) {
      router.push('/');
    }
  }, [db, loading, router]);

  useEffect(() => {
    if (db) {
      const defaultTable = db.format.name.replace(/_access/, 's');
      setSql(`SELECT * FROM ${defaultTable} LIMIT 100`);
    }
  }, [db]);

  const handleRun = useCallback(() => {
    setQueryError(null);
    setPage(0);
    const res = runQuery(sql);
    if (res && res.columns.length > 0) {
      setResult(res);
    } else {
      setQueryError('No results or invalid SQL');
      setResult(null);
    }
  }, [sql, runQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  const handleSuggestionClick = (suggestionSql: string) => {
    setSql(suggestionSql);
    setQueryError(null);
    const res = runQuery(suggestionSql);
    if (res && res.columns.length > 0) {
      setResult(res);
    } else {
      setQueryError('No results or invalid SQL');
      setResult(null);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const headers = result.columns.join(',');
    const rows = result.values.map(row => 
      row.map(cell => {
        if (cell === null) return '';
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!db) return null;

  const suggestions = getSuggestions(db.format.name);
  const tableName = db.format.name.replace(/_access/, 's');
  const totalPages = result ? Math.ceil(result.values.length / PAGE_SIZE) : 0;
  const pagedValues = result ? result.values.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Left panel - suggestions */}
      <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '10px', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Suggested Queries</h3>
        <div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s.sql)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px',
                marginBottom: '4px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: '#f5f5f5',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{s.label}</div>
              <div style={{ fontSize: '10px', color: '#666' }}>{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Center - query editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <strong>Format:</strong> {db.format.displayName}
          </div>
          <div>
            <strong>Rows:</strong> {db.rowCount.toLocaleString()}
          </div>
          <div>
            <strong>File:</strong> {fileName}
          </div>
        </div>

        {/* Query input */}
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px' }}>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            style={{
              flex: 1,
              height: '80px',
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '8px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button
              onClick={handleRun}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Run (Ctrl+Enter)
            </button>
            <button
              onClick={handleExport}
              disabled={!result}
              style={{ padding: '8px 16px', cursor: result ? 'pointer' : 'not-allowed', opacity: result ? 1 : 0.5 }}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Error display */}
        {(queryError || dbError) && (
          <div style={{ padding: '10px', color: 'red', borderBottom: '1px solid #ccc' }}>
            {queryError || dbError}
          </div>
        )}

        {/* Results table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {result && result.columns.length > 0 ? (
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  {result.columns.map((col, i) => (
                    <th key={i} style={{ border: '1px solid #ddd', padding: '6px', background: '#f5f5f5', textAlign: 'left' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedValues.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} style={{ border: '1px solid #ddd', padding: '6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cell === null ? <span style={{ color: '#999' }}>NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '20px', color: '#666' }}>
              Run a query to see results
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '10px', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: '4px 12px' }}
            >
              Prev
            </button>
            <span style={{ padding: '4px 12px' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: '4px 12px' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Query() {
  const { db, loading } = useLog();
  
  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }
  
  if (!db) {
    return <div style={{ padding: '20px' }}>Redirecting...</div>;
  }
  
  return <QueryPage />;
}