'use client';

import { useLogStore } from '@/stores/log-store';
import { ALL_FORMATS } from '@/lib/parser/formats';

export function FormatSelector() {
  const currentFormat = useLogStore((s) => s.currentFormat);
  const setFormat = useLogStore((s) => s.setFormat);
  const logLines = useLogStore((s) => s.logLines);
  
  if (logLines.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Format:</span>
      <select
        value={currentFormat?.name ?? ''}
        onChange={(e) => setFormat(e.target.value)}
        className="px-2 py-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded"
      >
        {ALL_FORMATS.map((fmt) => (
          <option key={fmt.name} value={fmt.name}>
            {fmt.name}
          </option>
        ))}
      </select>
    </div>
  );
}