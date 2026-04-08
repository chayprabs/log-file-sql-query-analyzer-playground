import { create } from 'zustand';
import { ParsedLogLine, LogFormat, QueryResult, LogLevel, TimeRange } from '@/types';
import { parseLogFile, detectFormatFromSample } from '@/lib/parser';
import { createLogTable, executeQuery as dbExecuteQuery } from '@/lib/database';
import { ALL_FORMATS } from '@/lib/parser/formats';

interface LogStore {
  logLines: ParsedLogLine[];
  currentFormat: LogFormat | null;
  selectedLine: number | null;
  queryResult: QueryResult | null;
  isLoading: boolean;
  error: string | null;
  visibleLevels: Set<LogLevel>;
  timeRange: TimeRange;
  searchQuery: string;
  queryHistory: string[];
  
  loadFile: (content: string, filename?: string) => Promise<void>;
  setFormat: (name: string) => void;
  executeQuery: (sql: string) => Promise<void>;
  setFilter: (level: LogLevel, visible: boolean) => void;
  setTimeRange: (range: TimeRange) => void;
  setSearch: (query: string) => void;
  selectLine: (line: number | null) => void;
  clearError: () => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  logLines: [],
  currentFormat: null,
  selectedLine: null,
  queryResult: null,
  isLoading: false,
  error: null,
  visibleLevels: new Set(['fatal', 'critical', 'error', 'warning', 'notice', 'info', 'debug', 'trace', 'unknown']),
  timeRange: null,
  searchQuery: '',
  queryHistory: [],
  
  loadFile: async (content: string, filename?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const lines = parseLogFile(content);
      
      if (lines.length === 0) {
        set({ isLoading: false, error: 'No log lines found in file' });
        return;
      }
      
      const rawLines = lines.map(l => l.rawText);
      const format = detectFormatFromSample(rawLines) || ALL_FORMATS[ALL_FORMATS.length - 1];
      
      await createLogTable(format, lines);
      
      set({
        logLines: lines,
        currentFormat: format,
        isLoading: false,
        queryResult: null,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to parse log file',
      });
    }
  },
  
  setFormat: (name: string) => {
    const format = ALL_FORMATS.find(f => f.name === name);
    if (format) {
      const lines = get().logLines;
      if (lines.length > 0) {
        createLogTable(format, lines);
      }
      set({ currentFormat: format });
    }
  },
  
  executeQuery: async (sql: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await dbExecuteQuery(sql);
      
      const history = get().queryHistory;
      if (!history.includes(sql)) {
        history.unshift(sql);
        if (history.length > 20) history.pop();
      }
      
      set({
        queryResult: result,
        isLoading: false,
        queryHistory: history,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Query failed',
      });
    }
  },
  
  setFilter: (level: LogLevel, visible: boolean) => {
    const levels = new Set(get().visibleLevels);
    if (visible) {
      levels.add(level);
    } else {
      levels.delete(level);
    }
    set({ visibleLevels: levels });
  },
  
  setTimeRange: (range: TimeRange) => {
    set({ timeRange: range });
  },
  
  setSearch: (query: string) => {
    set({ searchQuery: query });
  },
  
  selectLine: (line: number | null) => {
    set({ selectedLine: line });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));

export const selectFilteredLines = (state: LogStore): ParsedLogLine[] => {
  let lines = state.logLines;
  
  if (state.visibleLevels.size > 0 && state.visibleLevels.size < 7) {
    lines = lines.filter(line => state.visibleLevels.has(line.level));
  }
  
  if (state.timeRange) {
    const [start, end] = state.timeRange;
    lines = lines.filter(line => {
      if (!line.timestamp) return true;
      return line.timestamp >= start && line.timestamp <= end;
    });
  }
  
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    lines = lines.filter(line =>
      line.rawText.toLowerCase().includes(query)
    );
  }
  
  return lines;
};