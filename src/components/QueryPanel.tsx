'use client';

import { useState } from 'react';
import { useLogStore } from '@/stores/log-store';

export function QueryPanel() {
  const [query, setQuery] = useState('');
  const executeQuery = useLogStore((s) => s.executeQuery);
  const queryResult = useLogStore((s) => s.queryResult);
  const isLoading = useLogStore((s) => s.isLoading);
  const queryHistory = useLogStore((s) => s.queryHistory);
  const currentFormat = useLogStore((s) => s.currentFormat);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    let sql = query.trim();
    if (!sql.toUpperCase().startsWith('SELECT')) {
      sql = 'SELECT * FROM ' + sql;
    }
    
    await executeQuery(sql);
  };
  
  const tableName = currentFormat ? currentFormat.name.replace(/_log$/, '') + 's' : 'logs';
  
  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700">
      <div className="p-2 bg-zinc-50 dark:bg-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`SELECT * FROM ${tableName} WHERE log_level = 'error' LIMIT 100`}
            className="flex-1 px-3 py-2 font-mono text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Run
          </button>
        </form>
        
        {queryHistory.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {queryHistory.slice(0, 5).map((q, i) => (
              <button
                key={i}
                onClick={() => setQuery(q)}
                className="text-xs px-2 py-1 bg-zinc-200 dark:bg-zinc-700 rounded truncate max-w-[150px]"
                title={q}
              >
                {q.substring(0, 30)}...
              </button>
            ))}
          </div>
        )}
      </div>
      
      {queryResult && (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
              <tr>
                {queryResult.columns.map((col) => (
                  <th key={col} className="px-2 py-1 text-left font-medium border-b">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult.values.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1 border-b font-mono text-xs truncate max-w-[200px]">
                      {cell === null ? <span className="text-zinc-400">NULL</span> : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {queryResult.values.length > 100 && (
            <div className="p-2 text-center text-zinc-500 text-sm">
              Showing 100 of {queryResult.values.length} rows ({queryResult.executionTime.toFixed(1)}ms)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
