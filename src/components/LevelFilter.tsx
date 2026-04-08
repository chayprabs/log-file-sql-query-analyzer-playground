'use client';

import { useLogStore, selectFilteredLines } from '@/stores/log-store';
import { LogLevel } from '@/types';
import { getLevelColor } from '@/lib/utils/log-levels';

export function LevelFilter() {
  const visibleLevels = useLogStore((s) => s.visibleLevels);
  const setFilter = useLogStore((s) => s.setFilter);
  
  const levels: LogLevel[] = ['fatal', 'critical', 'error', 'warning', 'notice', 'info', 'debug', 'trace', 'unknown'];
  const levelLabels: Record<LogLevel, string> = {
    fatal: 'FATAL',
    critical: 'CRIT',
    error: 'ERROR',
    warning: 'WARN',
    notice: 'NOTICE',
    info: 'INFO',
    debug: 'DEBUG',
    trace: 'TRACE',
    unknown: 'OTHER',
  };
  
  return (
    <div className="flex gap-2 flex-wrap">
      {levels.map((level) => (
        <button
          key={level}
          onClick={() => setFilter(level, !visibleLevels.has(level))}
          className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
            visibleLevels.has(level)
              ? 'text-white'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
          }`}
          style={{
            backgroundColor: visibleLevels.has(level) ? getLevelColor(level) : undefined,
          }}
        >
          {levelLabels[level]}
        </button>
      ))}
    </div>
  );
}