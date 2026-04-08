import { LogLevel } from '@/types';

const LEVEL_KEYWORDS: Record<LogLevel, string[]> = {
  fatal: ['fatal', 'crit', 'critical', 'emergency'],
  critical: ['critical', 'crit'],
  error: ['error', 'err', 'fail', 'failed', 'exception'],
  warning: ['warning', 'warn'],
  notice: ['notice'],
  info: ['info', 'information'],
  debug: ['debug', 'dbg'],
  trace: ['trace', 'verbose'],
  unknown: [],
};

export function getLogLevelFromText(text: string): LogLevel {
  const lower = text.toLowerCase();
  
  for (const [level, keywords] of Object.entries(LEVEL_KEYWORDS)) {
    if (level === 'unknown') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return level as LogLevel;
      }
    }
  }
  
  if (/\[(E|ERR|ERROR)\]/.test(text) || /\berror\b/i.test(text)) {
    return 'error';
  }
  if (/\[(W|WARN)\]/.test(text) || /\bwarn/i.test(text)) {
    return 'warning';
  }
  
  return 'info';
}

export function getLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    fatal: '#ff0000',
    critical: '#ff2222',
    error: '#ff4444',
    warning: '#ffaa00',
    notice: '#44aaff',
    info: '#44ff44',
    debug: '#8888ff',
    trace: '#888888',
    unknown: '#888888',
  };
  return colors[level];
}

export function getLevelPriority(level: LogLevel): number {
  const priorities: Record<LogLevel, number> = {
    fatal: 0,
    critical: 1,
    error: 2,
    warning: 3,
    notice: 4,
    info: 5,
    debug: 6,
    trace: 7,
    unknown: 8,
  };
  return priorities[level];
}