interface TimestampParseResult {
  date: Date;
  msecs: number;
}

export function parseTimestamp(value: string | null | undefined): TimestampParseResult | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Try epoch in microseconds
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    const msecs = num > 1e12 ? num : num * 1000;
    const date = new Date(msecs);
    if (!isNaN(date.getTime())) {
      return { date, msecs };
    }
  }
  
  // Try epoch in seconds
  if (/^\d{10}$/.test(trimmed)) {
    const msecs = parseInt(trimmed, 10) * 1000;
    const date = new Date(msecs);
    if (!isNaN(date.getTime())) {
      return { date, msecs };
    }
  }
  
  // Try ISO8601
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { date, msecs: date.getTime() };
    }
  }
  
  // Try syslog format "Apr 28 04:02:03"
  const syslogMatch = trimmed.match(/^(\S+)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (syslogMatch) {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = months[syslogMatch[1]];
    if (month !== undefined) {
      const now = new Date();
      const date = new Date(now.getFullYear(), month, parseInt(syslogMatch[2]), parseInt(syslogMatch[3]), parseInt(syslogMatch[4]), parseInt(syslogMatch[5]));
      if (!isNaN(date.getTime())) {
        return { date, msecs: date.getTime() };
      }
    }
  }
  
  // Try standard Date constructor
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return { date, msecs: date.getTime() };
  }
  
  return null;
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}