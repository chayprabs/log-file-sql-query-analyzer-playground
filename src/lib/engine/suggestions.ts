import type { LogDatabase } from "./db";
import type { ColumnDef, LogFormat } from "./formats";

export interface QuerySuggestion {
  label: string;
  sql: string;
  description: string;
}

type SuggestionInput =
  | LogDatabase
  | {
      format: LogFormat;
      schema?: ColumnDef[];
      tableName?: string;
    }
  | LogFormat
  | string;

const DEFAULT_TABLE_NAME = "logs";

function hasColumn(schema: ColumnDef[], columnName: string): boolean {
  return schema.some((column) => column.name === columnName);
}

function pickColumn(schema: ColumnDef[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (hasColumn(schema, candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveInput(input: SuggestionInput): {
  formatName: LogFormat["name"] | string;
  schema: ColumnDef[];
  tableName: string;
} {
  if (typeof input === "string") {
    return {
      formatName: input,
      schema: [],
      tableName: DEFAULT_TABLE_NAME,
    };
  }

  if ("query" in input) {
    return {
      formatName: input.format.name,
      schema: input.schema,
      tableName: input.tableName,
    };
  }

  if ("format" in input) {
    return {
      formatName: input.format.name,
      schema: input.schema ?? input.format.schema,
      tableName: input.tableName ?? DEFAULT_TABLE_NAME,
    };
  }

  return {
    formatName: input.name,
    schema: input.schema,
    tableName: DEFAULT_TABLE_NAME,
  };
}

function buildAccessSuggestions(
  schema: ColumnDef[],
  tableName: string
): QuerySuggestion[] {
  const targetColumn = hasColumn(schema, "request_target")
    ? "request_target"
    : "request";
  const timestampColumn = hasColumn(schema, "timestamp") ? "timestamp" : "time_local";
  const suggestions: QuerySuggestion[] = [
    {
      label: "Status code breakdown",
      sql: `SELECT status, COUNT(*) AS count FROM ${tableName} GROUP BY status ORDER BY count DESC`,
      description: "Count responses by HTTP status code.",
    },
    {
      label: "Top 20 IPs",
      sql: `SELECT remote_addr, COUNT(*) AS hits FROM ${tableName} GROUP BY remote_addr ORDER BY hits DESC LIMIT 20`,
      description: "Find the busiest client addresses.",
    },
    {
      label: "Top 20 requested URLs",
      sql: `SELECT COALESCE(${targetColumn}, request) AS url, COUNT(*) AS hits FROM ${tableName} GROUP BY COALESCE(${targetColumn}, request) ORDER BY hits DESC LIMIT 20`,
      description: "Show the most frequently requested targets.",
    },
    {
      label: "4xx errors only",
      sql: `SELECT line_no, remote_addr, request, status FROM ${tableName} WHERE status >= 400 AND status < 500 ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect client-side HTTP failures.",
    },
    {
      label: "5xx errors only",
      sql: `SELECT line_no, remote_addr, request, status FROM ${tableName} WHERE status >= 500 ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect server-side HTTP failures.",
    },
    {
      label: "Requests per hour",
      sql: `SELECT strftime('%H', ${timestampColumn}) AS hour, COUNT(*) AS requests FROM ${tableName} WHERE ${timestampColumn} IS NOT NULL GROUP BY hour ORDER BY hour`,
      description: "Bucket requests by hour of day.",
    },
    {
      label: "Largest responses",
      sql: `SELECT line_no, remote_addr, request, body_bytes_sent FROM ${tableName} WHERE body_bytes_sent IS NOT NULL ORDER BY body_bytes_sent DESC LIMIT 20`,
      description: "Find the biggest responses by bytes sent.",
    },
    {
      label: "Most common user agents",
      sql: `SELECT http_user_agent, COUNT(*) AS hits FROM ${tableName} WHERE http_user_agent IS NOT NULL GROUP BY http_user_agent ORDER BY hits DESC LIMIT 10`,
      description: "Surface the most common user agents.",
    },
  ];

  if (hasColumn(schema, "vhost")) {
    suggestions.push({
      label: "Top virtual hosts",
      sql: `SELECT vhost, COUNT(*) AS hits FROM ${tableName} WHERE vhost IS NOT NULL GROUP BY vhost ORDER BY hits DESC LIMIT 20`,
      description: "Break down Apache traffic by virtual host.",
    });
  }

  return suggestions;
}

function buildSyslogSuggestions(
  schema: ColumnDef[],
  tableName: string
): QuerySuggestion[] {
  const timestampColumn = pickColumn(schema, ["timestamp", "timestamp_raw"]) ?? "timestamp";

  return [
    {
      label: "Messages by hostname",
      sql: `SELECT hostname, COUNT(*) AS count FROM ${tableName} GROUP BY hostname ORDER BY count DESC`,
      description: "Group syslog entries by host.",
    },
    {
      label: "Error messages only",
      sql: `SELECT ${timestampColumn}, hostname, tag, message FROM ${tableName} WHERE lower(message) LIKE '%error%' ORDER BY line_no DESC LIMIT 100`,
      description: "Filter messages that mention errors.",
    },
    {
      label: "Messages by hour",
      sql: `SELECT strftime('%H', timestamp) AS hour, COUNT(*) AS count FROM ${tableName} WHERE timestamp IS NOT NULL GROUP BY hour ORDER BY hour`,
      description: "Bucket syslog entries by hour.",
    },
    {
      label: "Top tags",
      sql: `SELECT tag, COUNT(*) AS count FROM ${tableName} WHERE tag IS NOT NULL GROUP BY tag ORDER BY count DESC LIMIT 20`,
      description: "Find the busiest emitting programs.",
    },
    {
      label: "Priority breakdown",
      sql: `SELECT priority, COUNT(*) AS count FROM ${tableName} GROUP BY priority ORDER BY priority`,
      description: "Break down entries by syslog priority.",
    },
    {
      label: "Recent messages",
      sql: `SELECT line_no, ${timestampColumn}, hostname, tag, message FROM ${tableName} ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect the latest parsed syslog records.",
    },
  ];
}

function buildJournaldSuggestions(
  tableName: string
): QuerySuggestion[] {
  return [
    {
      label: "Messages by unit",
      sql: `SELECT _SYSTEMD_UNIT, COUNT(*) AS count FROM ${tableName} WHERE _SYSTEMD_UNIT IS NOT NULL GROUP BY _SYSTEMD_UNIT ORDER BY count DESC`,
      description: "Show which systemd units are most active.",
    },
    {
      label: "Messages by priority",
      sql: `SELECT PRIORITY, COUNT(*) AS count FROM ${tableName} GROUP BY PRIORITY ORDER BY PRIORITY`,
      description: "Break down journald entries by priority.",
    },
    {
      label: "Messages by identifier",
      sql: `SELECT SYSLOG_IDENTIFIER, COUNT(*) AS count FROM ${tableName} WHERE SYSLOG_IDENTIFIER IS NOT NULL GROUP BY SYSLOG_IDENTIFIER ORDER BY count DESC LIMIT 20`,
      description: "Find the busiest journald identifiers.",
    },
    {
      label: "Errors only",
      sql: `SELECT line_no, timestamp, _SYSTEMD_UNIT, MESSAGE FROM ${tableName} WHERE PRIORITY IS NOT NULL AND PRIORITY <= 3 ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect high-severity journald entries.",
    },
    {
      label: "Messages by hour",
      sql: `SELECT strftime('%H', timestamp) AS hour, COUNT(*) AS count FROM ${tableName} WHERE timestamp IS NOT NULL GROUP BY hour ORDER BY hour`,
      description: "Bucket journald entries by hour.",
    },
    {
      label: "Recent messages",
      sql: `SELECT line_no, timestamp, _HOSTNAME, SYSLOG_IDENTIFIER, MESSAGE FROM ${tableName} ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect the latest journald records.",
    },
  ];
}

function buildJsonSuggestions(
  schema: ColumnDef[],
  tableName: string
): QuerySuggestion[] {
  const levelColumn = pickColumn(schema, ["level", "severity", "log_level"]);
  const messageColumn = pickColumn(schema, ["message", "msg"]);

  const suggestions: QuerySuggestion[] = [
    {
      label: "Row count",
      sql: `SELECT COUNT(*) AS total FROM ${tableName}`,
      description: "Count all parsed JSON rows.",
    },
    {
      label: "First 100 rows",
      sql: `SELECT * FROM ${tableName} ORDER BY line_no ASC LIMIT 100`,
      description: "Inspect the earliest parsed JSON rows.",
    },
    {
      label: "Last 100 rows",
      sql: `SELECT * FROM ${tableName} ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect the latest parsed JSON rows.",
    },
    {
      label: "All distinct keys",
      sql: `SELECT name, type FROM pragma_table_info('${tableName}') ORDER BY cid`,
      description: "List the inferred schema for this JSON file.",
    },
    {
      label: "Recent raw JSON lines",
      sql: `SELECT line_no, raw_line FROM ${tableName} ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect the original JSON lines as loaded.",
    },
  ];

  if (levelColumn) {
    suggestions.push({
      label: "Group by log level",
      sql: `SELECT ${levelColumn}, COUNT(*) AS count FROM ${tableName} GROUP BY ${levelColumn} ORDER BY count DESC`,
      description: "Aggregate JSON rows by level or severity.",
    });
  }

  if (messageColumn) {
    suggestions.push({
      label: "Messages containing error",
      sql: `SELECT line_no, ${messageColumn} FROM ${tableName} WHERE lower(${messageColumn}) LIKE '%error%' ORDER BY line_no DESC LIMIT 100`,
      description: "Search JSON message fields for errors.",
    });
  }

  return suggestions;
}

function buildGenericSuggestions(tableName: string): QuerySuggestion[] {
  return [
    {
      label: "Line count",
      sql: `SELECT COUNT(*) AS total FROM ${tableName}`,
      description: "Count all loaded lines.",
    },
    {
      label: "Search for error",
      sql: `SELECT line_no, raw_line FROM ${tableName} WHERE raw_line LIKE '%error%' ORDER BY line_no ASC LIMIT 100`,
      description: "Find lines containing the word error.",
    },
    {
      label: "First 100 lines",
      sql: `SELECT line_no, raw_line FROM ${tableName} ORDER BY line_no ASC LIMIT 100`,
      description: "Inspect the start of the file.",
    },
    {
      label: "Last 100 lines",
      sql: `SELECT line_no, raw_line FROM ${tableName} ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect the end of the file.",
    },
    {
      label: "Longest lines",
      sql: `SELECT line_no, length(raw_line) AS line_length, raw_line FROM ${tableName} ORDER BY line_length DESC LIMIT 20`,
      description: "Surface unusually long lines that may need inspection.",
    },
  ];
}

export function getSuggestions(input: SuggestionInput): QuerySuggestion[] {
  const { formatName, schema, tableName } = resolveInput(input);

  switch (formatName) {
    case "nginx_access":
    case "apache_access":
      return buildAccessSuggestions(schema, tableName);
    case "syslog":
      return buildSyslogSuggestions(schema, tableName);
    case "journald":
      return buildJournaldSuggestions(tableName);
    case "json":
      return buildJsonSuggestions(schema, tableName);
    case "generic":
    default:
      return buildGenericSuggestions(tableName);
  }
}

export function getQuickSuggestions(input: SuggestionInput): QuerySuggestion[] {
  return getSuggestions(input).slice(0, 3);
}
