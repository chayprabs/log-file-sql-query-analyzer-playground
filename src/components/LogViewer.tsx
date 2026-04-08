'use client';

import { useMemo } from 'react';
import { useLogStore, selectFilteredLines } from '@/stores/log-store';
import { ParsedLogLine } from '@/types';
import { getLevelColor } from '@/lib/utils/log-levels';
import { format } from 'date-fns';

function LogLineView({ line, isSelected, onClick }: { line: ParsedLogLine; isSelected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`font-mono text-sm py-1 px-2 cursor-pointer flex ${
        isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      <span className="text-zinc-400 w-12 text-right pr-3 select-none">{line.lineNumber}</span>
      <span className="text-zinc-500 w-24 pr-2 select-none">
        {line.timestamp ? format(line.timestamp, 'HH:mm:ss.SSS') : '--:--:---'}
      </span>
      <span
        className="w-16 font-bold text-xs text-center rounded"
        style={{ color: getLevelColor(line.level) }}
      >
        {line.level.toUpperCase()}
      </span>
      <span className="flex-1 truncate">{line.body || line.rawText}</span>
    </div>
  );
}

export function LogViewer() {
  const logLines = useLogStore((s) => s.logLines);
  const selectedLine = useLogStore((s) => s.selectedLine);
  const selectLine = useLogStore((s) => s.selectLine);
  const currentFormat = useLogStore((s) => s.currentFormat);
  
  const filteredLines = useMemo(() => {
    if (logLines.length === 0) return [];
    const store = useLogStore.getState();
    return selectFilteredLines(store);
  }, [logLines]);
  
  if (logLines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        No log file loaded
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500">
        <span>{filteredLines.length.toLocaleString()} lines</span>
        <span>|</span>
        <span>{currentFormat?.name ?? 'unknown'}</span>
      </div>
      
      <div className="flex-1 overflow-auto">
        {filteredLines.map((line) => (
          <LogLineView
            key={line.lineNumber}
            line={line}
            isSelected={selectedLine === line.lineNumber}
            onClick={() => selectLine(line.lineNumber)}
          />
        ))}
      </div>
    </div>
  );
}