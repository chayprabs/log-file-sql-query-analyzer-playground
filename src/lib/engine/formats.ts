export interface ColumnDef {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL';
}

export interface LogFormat {
  name: string;
  displayName: string;
  regex: RegExp;
  parse: (line: string) => Record<string, string | number | null> | null;
  schema: ColumnDef[];
}

export interface ParsedRow {
  lineNo: number;
  raw: string;
  fields: Record<string, string | number | null>;
}

const NGINX_ACCESST_COLUMNS: ColumnDef[] = [
  { name: 'remote_addr', type: 'TEXT' },
  { name: 'remote_user', type: 'TEXT' },
  { name: 'time_local', type: 'TEXT' },
  { name: 'request', type: 'TEXT' },
  { name: 'status', type: 'INTEGER' },
  { name: 'body_bytes_sent', type: 'INTEGER' },
  { name: 'http_referer', type: 'TEXT' },
  { name: 'http_user_agent', type: 'TEXT' },
];

const APACHE_COMMON_COLUMNS: ColumnDef[] = [
  { name: 'host', type: 'TEXT' },
  { name: 'logname', type: 'TEXT' },
  { name: 'user', type: 'TEXT' },
  { name: 'time', type: 'TEXT' },
  { name: 'request', type: 'TEXT' },
  { name: 'status', type: 'INTEGER' },
  { name: 'bytes', type: 'INTEGER' },
];

const SYSLOG_COLUMNS: ColumnDef[] = [
  { name: 'timestamp', type: 'TEXT' },
  { name: 'hostname', type: 'TEXT' },
  { name: 'ident', type: 'TEXT' },
  { name: 'pid', type: 'TEXT' },
  { name: 'message', type: 'TEXT' },
];

const JOURNALD_COLUMNS: ColumnDef[] = [
  { name: '__REALTIME_TIMESTAMP', type: 'TEXT' },
  { name: '_SYSTEMD_UNIT', type: 'TEXT' },
  { name: 'SYSLOG_IDENTIFIER', type: 'TEXT' },
  { name: '_PID', type: 'INTEGER' },
  { name: 'PRIORITY', type: 'TEXT' },
  { name: 'MESSAGE', type: 'TEXT' },
];

const GENERIC_COLUMNS: ColumnDef[] = [
  { name: 'raw_line', type: 'TEXT' },
  { name: 'line_no', type: 'INTEGER' },
];

const NGINX_REGEX = /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+(\S+)"\s+(\d+)\s+(\d+|-)\s*(?:"([^"]*)"\s*"([^"]*)")?/;

const NGINX_COMBINED_REGEX = /^(?<remote_addr>[^\s]+)\s+-\s+-\s+\[(?<time_local>[^\]]+)\]\s+"(?<request>[^"]+)"\s+(?<status>\d+)\s+(?<body_bytes_sent>\d+|-)(?:\s+"(?<http_referer>[^"]*)"\s+"(?<http_user_agent>[^"]*)")?/;

function parseNginx(line: string): Record<string, string | number | null> | null {
  const match = line.match(NGINX_COMBINED_REGEX);
  if (!match?.groups) return null;
  
  const { remote_addr, time_local, request, status, body_bytes_sent, http_referer, http_user_agent } = match.groups;
  const parts = request?.split(' ') || [];
  
  return {
    remote_addr: remote_addr || null,
    remote_user: null,
    time_local: time_local || null,
    request: request || null,
    method: parts[0] || null,
    uri: parts[1] || null,
    protocol: parts[2] || null,
    status: status ? parseInt(status, 10) : null,
    body_bytes_sent: body_bytes_sent === '-' ? null : parseInt(body_bytes_sent || '0', 10),
    http_referer: http_referer || null,
    http_user_agent: http_user_agent || null,
  };
}

function parseApache(line: string): Record<string, string | number | null> | null {
  const match = line.match(/^(\S+)\s+(\S+|-)\s+(\S+|-)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d+)\s+(\d+|-)/);
  if (!match) return null;
  
  const parts = match[5].split(' ');
  return {
    host: match[1],
    logname: match[2] === '-' ? null : match[2],
    user: match[3] === '-' ? null : match[3],
    time: match[4],
    request: match[5],
    status: parseInt(match[6], 10),
    bytes: match[7] === '-' ? null : parseInt(match[7], 10),
  };
}

function parseSyslog(line: string): Record<string, string | number | null> | null {
  const syslogRegex = /^(\w+)\s+(\d+)\s+(\d+:\d+:\d+)\s+(\S+?)\s*(?:(\S+?)(?:\[(\d+)\])?:?)?:?\s*(.*)$/;
  const match = line.trim().match(syslogRegex);
  if (match && match[4] && match[4].length > 0) {
    const month = match[1];
    const day = match[2];
    const time = match[3];
    const year = new Date().getFullYear();
    let ident = match[5] || '';
    let pid: string | null = null;
    const pidMatch = ident.match(/^(\S+?)\[(\d+)\]$/);
    if (pidMatch) {
      ident = pidMatch[1];
      pid = pidMatch[2];
    }
    return { 
      timestamp: `${year}-${month}-${day} ${time}`,
      hostname: match[4], 
      ident: ident || null, 
      pid, 
      message: match[7] || '' 
    };
  }
  return null;
}

function parseJson(line: string): Record<string, string | number | null> | null {
  try {
    const obj = JSON.parse(line);
    const result: Record<string, string | number | null> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result[key] = null;
      } else if (typeof value === 'number') {
        result[key] = value;
      } else if (typeof value === 'boolean') {
        result[key] = value ? 1 : 0;
      } else {
        result[key] = String(value);
      }
    }
    
    return result;
  } catch {
    return null;
  }
}

function parseJournald(line: string): Record<string, string | number | null> | null {
  try {
    const obj = JSON.parse(line);
    const hasJournaldMarker = obj.__REALTIME_TIMESTAMP || obj._SYSTEMD_UNIT || 
      (obj.PRIORITY !== undefined && obj.PRIORITY !== null);
    if (!hasJournaldMarker && !obj.MESSAGE) {
      return null;
    }
    
    return {
      __REALTIME_TIMESTAMP: obj.__REALTIME_TIMESTAMP || null,
      _SYSTEMD_UNIT: obj._SYSTEMD_UNIT || null,
      SYSLOG_IDENTIFIER: obj.SYSLOG_IDENTIFIER || null,
      _PID: obj._PID ? parseInt(obj._PID, 10) : null,
      PRIORITY: obj.PRIORITY !== undefined ? String(obj.PRIORITY) : null,
      MESSAGE: obj.MESSAGE || null,
    };
  } catch {
    return null;
  }
}

function parseGeneric(line: string): Record<string, string | number | null> | null {
  return {
    raw_line: line,
    line_no: 0,
  };
}

export const FORMATS: LogFormat[] = [
  {
    name: 'nginx_access',
    displayName: 'Nginx Access Log',
    regex: /^(\S+)\s+-\s+-\s+\[/,
    parse: parseNginx,
    schema: NGINX_ACCESST_COLUMNS,
  },
  {
    name: 'apache_access',
    displayName: 'Apache Access Log',
    regex: /^(\S+)\s+(\S+)\s+(\S+)\s+\[/,
    parse: parseApache,
    schema: APACHE_COMMON_COLUMNS,
  },
  {
    name: 'syslog',
    displayName: 'Syslog (RFC 3164)',
    regex: /^(\S+)\s+(\d+)\s+(\d+:\d+:\d+)/,
    parse: parseSyslog,
    schema: SYSLOG_COLUMNS,
  },
  {
    name: 'journald',
    displayName: 'systemd Journal',
    regex: /^\{"__/,
    parse: parseJournald,
    schema: JOURNALD_COLUMNS,
  },
  {
    name: 'json',
    displayName: 'JSON Lines',
    regex: /^\{/,
    parse: parseJson,
    schema: [],
  },
  {
    name: 'generic',
    displayName: 'Generic Text',
    regex: /./,
    parse: parseGeneric,
    schema: GENERIC_COLUMNS,
  },
];

export function getFormat(name: string): LogFormat | undefined {
  return FORMATS.find(f => f.name === name);
}

export function inferJsonSchema(values: Record<string, string | number | null>[]): ColumnDef[] {
  const columns = new Set<string>();
  for (const row of values) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  
  return Array.from(columns).map(name => {
    const sample = values.find(r => r[name] !== null)?.[name];
    const type = typeof sample;
    return {
      name,
      type: type === 'number' ? 'INTEGER' as const : 'TEXT' as const,
    };
  });
}