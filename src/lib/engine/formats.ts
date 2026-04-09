export type CellValue = string | number | null;

export interface ColumnDef {
  name: string;
  type: "TEXT" | "INTEGER" | "REAL";
}

export interface ParsedLogRecord extends Record<string, CellValue> {
  line_no: number;
  raw_line: string;
}

export interface LogFormat {
  name:
    | "nginx_access"
    | "apache_access"
    | "syslog"
    | "journald"
    | "json"
    | "generic";
  displayName: string;
  schema: ColumnDef[];
  test: (line: string) => boolean;
  parse: (record: string, lineNo?: number) => ParsedLogRecord | null;
}

const ACCESS_COLUMNS: ColumnDef[] = [
  { name: "remote_addr", type: "TEXT" },
  { name: "remote_user", type: "TEXT" },
  { name: "time_local", type: "TEXT" },
  { name: "timestamp", type: "TEXT" },
  { name: "request", type: "TEXT" },
  { name: "request_method", type: "TEXT" },
  { name: "request_target", type: "TEXT" },
  { name: "request_protocol", type: "TEXT" },
  { name: "status", type: "INTEGER" },
  { name: "body_bytes_sent", type: "INTEGER" },
  { name: "http_referer", type: "TEXT" },
  { name: "http_user_agent", type: "TEXT" },
];

const APACHE_COLUMNS: ColumnDef[] = [
  { name: "vhost", type: "TEXT" },
  ...ACCESS_COLUMNS,
];

const SYSLOG_COLUMNS: ColumnDef[] = [
  { name: "priority", type: "INTEGER" },
  { name: "timestamp_raw", type: "TEXT" },
  { name: "timestamp", type: "TEXT" },
  { name: "hostname", type: "TEXT" },
  { name: "tag", type: "TEXT" },
  { name: "pid", type: "INTEGER" },
  { name: "message", type: "TEXT" },
];

const JOURNALD_COLUMNS: ColumnDef[] = [
  { name: "__REALTIME_TIMESTAMP", type: "TEXT" },
  { name: "timestamp", type: "TEXT" },
  { name: "_HOSTNAME", type: "TEXT" },
  { name: "_SYSTEMD_UNIT", type: "TEXT" },
  { name: "SYSLOG_IDENTIFIER", type: "TEXT" },
  { name: "_PID", type: "INTEGER" },
  { name: "PRIORITY", type: "INTEGER" },
  { name: "MESSAGE", type: "TEXT" },
];

const RESERVED_COLUMN_NAMES = new Set(["line_no", "raw_line"]);

const ACCESS_LINE_REGEX =
  /^(?<remote_addr>\S+)\s+(?<remote_logname>\S+)\s+(?<remote_user>\S+)\s+\[(?<time_local>[^\]]+)\]\s+"(?<request>[^"]*|-)"\s+(?<status>\d{3})\s+(?<body_bytes_sent>\d+|-)(?:\s+"(?<http_referer>[^"]*)"\s+"(?<http_user_agent>[^"]*)")?\s*$/;

const APACHE_VHOST_REGEX =
  /^(?<vhost>\S+)\s+(?<remote_addr>\S+)\s+(?<remote_logname>\S+)\s+(?<remote_user>\S+)\s+\[(?<time_local>[^\]]+)\]\s+"(?<request>[^"]*|-)"\s+(?<status>\d{3})\s+(?<body_bytes_sent>\d+|-)(?:\s+"(?<http_referer>[^"]*)"\s+"(?<http_user_agent>[^"]*)")?\s*$/;

const SYSLOG_REGEX =
  /^(?:<(?<priority>\d{1,3})>)?(?<month>[A-Z][a-z]{2})\s+(?<day>\d{1,2})\s+(?<time>\d{2}:\d{2}:\d{2})\s+(?<hostname>\S+)\s+(?<rest>.+)$/;

const SYSLOG_TAG_REGEX =
  /^(?<tag>[^\s:\[]+)(?:\[(?<pid>\d+)\])?:\s?(?<message>.*)$/;

const JOURNALD_KEY_VALUE_LINE_REGEX =
  /^(?:__REALTIME_TIMESTAMP|_HOSTNAME|_SYSTEMD_UNIT|SYSLOG_IDENTIFIER|_PID|PRIORITY|MESSAGE)=/;

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseInteger(value: string | undefined): number | null {
  if (!value || value === "-") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === "string") {
    return parseInteger(value);
  }

  return null;
}

function parseAccessTimestamp(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const match = raw.match(
    /^(?<day>\d{1,2})\/(?<month>[A-Z][a-z]{2})\/(?<year>\d{4}):(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\s+(?<sign>[+-])(?<offsetHour>\d{2})(?<offsetMinute>\d{2})$/
  );

  if (!match?.groups) {
    return null;
  }

  const month = MONTHS[match.groups.month];
  if (month === undefined) {
    return null;
  }

  const utcMillis = Date.UTC(
    Number.parseInt(match.groups.year, 10),
    month,
    Number.parseInt(match.groups.day, 10),
    Number.parseInt(match.groups.hour, 10),
    Number.parseInt(match.groups.minute, 10),
    Number.parseInt(match.groups.second, 10)
  );

  const offsetMinutes =
    (Number.parseInt(match.groups.offsetHour, 10) * 60 +
      Number.parseInt(match.groups.offsetMinute, 10)) *
    (match.groups.sign === "+" ? 1 : -1);

  return new Date(utcMillis - offsetMinutes * 60_000).toISOString();
}

function parseSyslogTimestamp(raw: string): string | null {
  const match = raw.match(
    /^(?<month>[A-Z][a-z]{2})\s+(?<day>\d{1,2})\s+(?<time>\d{2}:\d{2}:\d{2})$/
  );

  if (!match?.groups) {
    return null;
  }

  const month = MONTHS[match.groups.month];
  if (month === undefined) {
    return null;
  }

  const [hour, minute, second] = match.groups.time
    .split(":")
    .map((part) => Number.parseInt(part, 10));

  const now = new Date();
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      month,
      Number.parseInt(match.groups.day, 10),
      hour,
      minute,
      second
    )
  );

  if (date.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
    date.setUTCFullYear(date.getUTCFullYear() - 1);
  }

  return date.toISOString();
}

function parseEpochMicros(raw: string | null): string | null {
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }

  const asNumber = Number.parseInt(raw, 10);
  if (Number.isNaN(asNumber)) {
    return null;
  }

  const millis = raw.length > 13 ? Math.trunc(asNumber / 1000) : asNumber;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function splitRequest(request: string | undefined): {
  request_method: string | null;
  request_target: string | null;
  request_protocol: string | null;
} {
  if (!request || request === "-") {
    return {
      request_method: null,
      request_target: null,
      request_protocol: null,
    };
  }

  const firstSpace = request.indexOf(" ");
  if (firstSpace === -1) {
    return {
      request_method: null,
      request_target: request,
      request_protocol: null,
    };
  }

  const lastSpace = request.lastIndexOf(" ");
  if (lastSpace <= firstSpace) {
    return {
      request_method: request.slice(0, firstSpace) || null,
      request_target: request.slice(firstSpace + 1) || null,
      request_protocol: null,
    };
  }

  return {
    request_method: request.slice(0, firstSpace) || null,
    request_target: request.slice(firstSpace + 1, lastSpace) || null,
    request_protocol: request.slice(lastSpace + 1) || null,
  };
}

function buildAccessRecord(
  groups: Record<string, string>,
  line: string,
  lineNo: number,
  vhost: string | null
): ParsedLogRecord {
  const request = groups.request ?? null;

  return {
    line_no: lineNo,
    raw_line: line,
    ...(vhost !== null ? { vhost } : {}),
    remote_addr: groups.remote_addr ?? null,
    remote_user:
      groups.remote_user && groups.remote_user !== "-"
        ? groups.remote_user
        : null,
    time_local: groups.time_local ?? null,
    timestamp: parseAccessTimestamp(groups.time_local),
    request,
    ...splitRequest(request ?? undefined),
    status: parseInteger(groups.status),
    body_bytes_sent: parseInteger(groups.body_bytes_sent),
    http_referer:
      groups.http_referer && groups.http_referer !== "-"
        ? groups.http_referer
        : null,
    http_user_agent:
      groups.http_user_agent && groups.http_user_agent !== "-"
        ? groups.http_user_agent
        : null,
  };
}

function sanitizeJsonKey(path: string): string {
  const collapsed = path
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const safeName = collapsed || "value";
  const prefixed = /^\d/.test(safeName) ? `field_${safeName}` : safeName;

  return RESERVED_COLUMN_NAMES.has(prefixed) ? `json_${prefixed}` : prefixed;
}

function flattenJsonValue(
  value: unknown,
  path: string[],
  output: Record<string, CellValue>
): void {
  const key = sanitizeJsonKey(path.join("_"));

  if (value === null || value === undefined) {
    output[key] = null;
    return;
  }

  if (Array.isArray(value)) {
    output[key] = JSON.stringify(value);
    return;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      output[key] = "{}";
      return;
    }

    for (const [childKey, childValue] of entries) {
      flattenJsonValue(childValue, [...path, childKey], output);
    }
    return;
  }

  if (typeof value === "boolean") {
    output[key] = value ? 1 : 0;
    return;
  }

  if (typeof value === "number") {
    output[key] = value;
    return;
  }

  output[key] = String(value);
}

function flattenJsonObject(value: unknown): Record<string, CellValue> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const flattened: Record<string, CellValue> = {};
  for (const [key, childValue] of Object.entries(value)) {
    flattenJsonValue(childValue, [key], flattened);
  }

  return flattened;
}

function isJsonObjectLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed !== null && !Array.isArray(parsed) && typeof parsed === "object";
  } catch {
    return false;
  }
}

function isJournaldJsonObject(value: unknown): boolean {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.__REALTIME_TIMESTAMP !== undefined ||
    record._SYSTEMD_UNIT !== undefined ||
    record.SYSLOG_IDENTIFIER !== undefined ||
    record._HOSTNAME !== undefined ||
    record._PID !== undefined ||
    record.PRIORITY !== undefined
  );
}

export function parseNginx(
  line: string,
  lineNo = 0
): ParsedLogRecord | null {
  const match = line.match(ACCESS_LINE_REGEX);
  if (!match?.groups) {
    return null;
  }

  return buildAccessRecord(match.groups, line, lineNo, null);
}

export function parseApache(
  line: string,
  lineNo = 0
): ParsedLogRecord | null {
  const vhostMatch = line.match(APACHE_VHOST_REGEX);
  if (vhostMatch?.groups) {
    return buildAccessRecord(
      vhostMatch.groups,
      line,
      lineNo,
      vhostMatch.groups.vhost ?? null
    );
  }

  const standardMatch = line.match(ACCESS_LINE_REGEX);
  if (!standardMatch?.groups) {
    return null;
  }

  return {
    ...buildAccessRecord(standardMatch.groups, line, lineNo, null),
    vhost: null,
  };
}

export function parseSyslog(
  line: string,
  lineNo = 0
): ParsedLogRecord | null {
  const match = line.match(SYSLOG_REGEX);
  if (!match?.groups) {
    return null;
  }

  const timestampRaw = `${match.groups.month} ${match.groups.day} ${match.groups.time}`;
  const rest = match.groups.rest ?? "";
  const tagMatch = rest.match(SYSLOG_TAG_REGEX);

  const tag = tagMatch?.groups?.tag ?? null;
  const pid = parseInteger(tagMatch?.groups?.pid);
  const message = tagMatch ? tagMatch.groups?.message ?? "" : rest;

  return {
    line_no: lineNo,
    raw_line: line,
    priority: parseInteger(match.groups.priority),
    timestamp_raw: timestampRaw,
    timestamp: parseSyslogTimestamp(timestampRaw),
    hostname: match.groups.hostname ?? null,
    tag,
    pid,
    message: message || null,
  };
}

export function parseJson(
  line: string,
  lineNo = 0
): ParsedLogRecord | null {
  try {
    const parsed = JSON.parse(line);
    const flattened = flattenJsonObject(parsed);
    if (!flattened) {
      return null;
    }

    return {
      line_no: lineNo,
      raw_line: line,
      ...flattened,
    };
  } catch {
    return null;
  }
}

function parseJournaldRecord(
  record: Record<string, unknown>,
  rawLine: string,
  lineNo: number
): ParsedLogRecord {
  const realtime = toText(record.__REALTIME_TIMESTAMP);

  return {
    line_no: lineNo,
    raw_line: rawLine,
    __REALTIME_TIMESTAMP: realtime,
    timestamp: parseEpochMicros(realtime),
    _HOSTNAME: toText(record._HOSTNAME),
    _SYSTEMD_UNIT: toText(record._SYSTEMD_UNIT),
    SYSLOG_IDENTIFIER: toText(record.SYSLOG_IDENTIFIER),
    _PID: toInteger(record._PID),
    PRIORITY: toInteger(record.PRIORITY),
    MESSAGE: toText(record.MESSAGE),
  };
}

export function parseJournald(
  record: string,
  lineNo = 0
): ParsedLogRecord | null {
  const trimmed = record.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        !isJournaldJsonObject(parsed) &&
        !(parsed && typeof parsed === "object" && "MESSAGE" in parsed)
      ) {
        return null;
      }

      return parseJournaldRecord(
        parsed as Record<string, unknown>,
        record,
        lineNo
      );
    } catch {
      return null;
    }
  }

  const fields: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of record.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    if (/^\s/.test(line) && currentKey) {
      fields[currentKey] = `${fields[currentKey]}\n${line.trimStart()}`;
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      return null;
    }

    currentKey = line.slice(0, separatorIndex);
    fields[currentKey] = line.slice(separatorIndex + 1);
  }

  if (Object.keys(fields).length === 0) {
    return null;
  }

  return parseJournaldRecord(fields, record, lineNo);
}

export function parseGeneric(
  line: string,
  lineNo = 0
): ParsedLogRecord {
  return {
    line_no: lineNo,
    raw_line: line,
  };
}

export const FORMATS: LogFormat[] = [
  {
    name: "nginx_access",
    displayName: "Nginx Access Log",
    schema: ACCESS_COLUMNS,
    test: (line) => ACCESS_LINE_REGEX.test(line),
    parse: parseNginx,
  },
  {
    name: "apache_access",
    displayName: "Apache Access Log",
    schema: APACHE_COLUMNS,
    test: (line) => APACHE_VHOST_REGEX.test(line) || ACCESS_LINE_REGEX.test(line),
    parse: parseApache,
  },
  {
    name: "syslog",
    displayName: "Syslog (RFC 3164)",
    schema: SYSLOG_COLUMNS,
    test: (line) => SYSLOG_REGEX.test(line),
    parse: parseSyslog,
  },
  {
    name: "journald",
    displayName: "systemd Journal",
    schema: JOURNALD_COLUMNS,
    test: (line) => {
      if (JOURNALD_KEY_VALUE_LINE_REGEX.test(line)) {
        return true;
      }

      if (!isJsonObjectLine(line)) {
        return false;
      }

      try {
        return isJournaldJsonObject(JSON.parse(line));
      } catch {
        return false;
      }
    },
    parse: parseJournald,
  },
  {
    name: "json",
    displayName: "JSON Lines",
    schema: [],
    test: isJsonObjectLine,
    parse: parseJson,
  },
  {
    name: "generic",
    displayName: "Generic Text",
    schema: [],
    test: (line) => line.length > 0,
    parse: parseGeneric,
  },
];

export function getFormat(name: string): LogFormat | undefined {
  return FORMATS.find((format) => format.name === name);
}

export function inferJsonSchema(records: ParsedLogRecord[]): ColumnDef[] {
  const observedTypes = new Map<string, Set<ColumnDef["type"]>>();

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (RESERVED_COLUMN_NAMES.has(key)) {
        continue;
      }

      const existing = observedTypes.get(key) ?? new Set<ColumnDef["type"]>();
      if (value === null) {
        observedTypes.set(key, existing);
        continue;
      }

      if (typeof value === "number") {
        existing.add(Number.isInteger(value) ? "INTEGER" : "REAL");
      } else {
        existing.add("TEXT");
      }

      observedTypes.set(key, existing);
    }
  }

  return Array.from(observedTypes.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, types]) => {
      if (types.has("TEXT") || types.size === 0) {
        return { name, type: "TEXT" as const };
      }

      if (types.has("REAL")) {
        return { name, type: "REAL" as const };
      }

      return { name, type: "INTEGER" as const };
    });
}

export function getSchemaForFormat(
  format: LogFormat,
  inferredJsonSchema?: ColumnDef[]
): ColumnDef[] {
  if (format.name === "json") {
    return inferredJsonSchema ?? [];
  }

  return format.schema;
}

export function isJournaldRecordLine(line: string): boolean {
  return JOURNALD_KEY_VALUE_LINE_REGEX.test(line);
}
