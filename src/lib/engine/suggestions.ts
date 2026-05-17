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

function buildAccessSuggestions(tableName: string): QuerySuggestion[] {
  return [
    {
      label: "Status breakdown",
      sql: `SELECT status, COUNT(*) AS count FROM ${tableName} GROUP BY status ORDER BY count DESC`,
      description: "Count responses by HTTP status code.",
    },
    {
      label: "Top client IPs",
      sql: `SELECT remote_addr, COUNT(*) AS hits FROM ${tableName} GROUP BY remote_addr ORDER BY hits DESC LIMIT 10`,
      description: "Find the busiest client addresses.",
    },
    {
      label: "Server errors",
      sql: `SELECT * FROM ${tableName} WHERE status >= 500`,
      description: "Inspect HTTP 5xx responses.",
    },
    {
      label: "Methods",
      sql: `SELECT method, COUNT(*) FROM ${tableName} GROUP BY method`,
      description: "Aggregate requests by HTTP method.",
    },
    {
      label: "Largest responses",
      sql: `SELECT line_no, remote_addr, path, body_bytes_sent FROM ${tableName} WHERE body_bytes_sent IS NOT NULL ORDER BY body_bytes_sent DESC LIMIT 20`,
      description: "Find the largest responses by bytes sent.",
    },
  ];
}

function buildSyslogSuggestions(tableName: string): QuerySuggestion[] {
  return [
    {
      label: "By hostname",
      sql: `SELECT hostname, COUNT(*) FROM ${tableName} GROUP BY hostname ORDER BY 2 DESC`,
      description: "Group syslog entries by host.",
    },
    {
      label: "High severity",
      sql: `SELECT * FROM ${tableName} WHERE severity <= 3`,
      description: "Show emergency through error severities.",
    },
    {
      label: "By tag",
      sql: `SELECT tag, COUNT(*) FROM ${tableName} GROUP BY tag ORDER BY 2 DESC`,
      description: "Find the busiest emitting programs.",
    },
    {
      label: "Recent entries",
      sql: `SELECT * FROM ${tableName} ORDER BY line_no DESC LIMIT 50`,
      description: "Inspect the latest records.",
    },
    {
      label: "Priority counts",
      sql: `SELECT priority, COUNT(*) FROM ${tableName} GROUP BY priority ORDER BY priority`,
      description: "Break down entries by syslog priority.",
    },
  ];
}

function buildJournaldSuggestions(tableName: string): QuerySuggestion[] {
  return [
    {
      label: "By unit",
      sql: `SELECT unit, COUNT(*) FROM ${tableName} GROUP BY unit ORDER BY 2 DESC`,
      description: "Show which systemd units are most active.",
    },
    {
      label: "High priority",
      sql: `SELECT * FROM ${tableName} WHERE priority <= 3 ORDER BY timestamp DESC LIMIT 50`,
      description: "Inspect high-severity journald entries.",
    },
    {
      label: "By identifier",
      sql: `SELECT identifier, COUNT(*) FROM ${tableName} GROUP BY identifier ORDER BY 2 DESC LIMIT 20`,
      description: "Find the busiest journald identifiers.",
    },
    {
      label: "Recent messages",
      sql: `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 50`,
      description: "Inspect the latest journald records.",
    },
    {
      label: "By hostname",
      sql: `SELECT hostname, COUNT(*) FROM ${tableName} GROUP BY hostname ORDER BY 2 DESC`,
      description: "Group journald entries by host.",
    },
  ];
}

function buildJsonSuggestions(schema: ColumnDef[], tableName: string): QuerySuggestion[] {
  const effectiveSchema: ColumnDef[] =
    schema.length > 0
      ? schema
      : [
          { name: "line_no", type: "INTEGER" },
          { name: "raw", type: "TEXT" },
          { name: "timestamp", type: "TEXT" },
          { name: "level", type: "TEXT" },
          { name: "message", type: "TEXT" },
        ];

  const hasLevel = hasColumn(effectiveSchema, "level");
  const hasTimestamp = hasColumn(effectiveSchema, "timestamp");

  const suggestions: QuerySuggestion[] = [
    {
      label: "First 100 rows",
      sql: `SELECT * FROM ${tableName} LIMIT 100`,
      description: "Inspect the first parsed JSON rows.",
    },
    {
      label: "Errors",
      sql: `SELECT * FROM ${tableName} WHERE level = 'error' ORDER BY timestamp DESC LIMIT 100`,
      description: "Filter rows at the error level.",
    },
  ];

  if (hasLevel) {
    suggestions.unshift({
      label: "By level",
      sql: `SELECT level, COUNT(*) FROM ${tableName} GROUP BY level ORDER BY 2 DESC`,
      description: "Aggregate JSON rows by level.",
    });
  }

  if (hasTimestamp && hasLevel) {
    suggestions.push({
      label: "Recent by timestamp",
      sql: `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 100`,
      description: "Inspect the latest JSON rows.",
    });
  }

  suggestions.push({
    label: "Row count",
    sql: `SELECT COUNT(*) AS total FROM ${tableName}`,
    description: "Count all parsed JSON rows.",
  });

  suggestions.push({
    label: "Schema columns",
    sql: `SELECT name, type FROM pragma_table_info('${tableName}') ORDER BY cid`,
    description: "List the inferred schema for this JSON file.",
  });

  return suggestions;
}

function buildGenericSuggestions(tableName: string): QuerySuggestion[] {
  return [
    {
      label: "First rows",
      sql: `SELECT * FROM ${tableName} LIMIT 100`,
      description: "Inspect the first parsed lines.",
    },
    {
      label: "Search message",
      sql: `SELECT * FROM ${tableName} WHERE message LIKE '%error%'`,
      description: "Find lines whose message contains error.",
    },
    {
      label: "Line count",
      sql: `SELECT COUNT(*) AS total FROM ${tableName}`,
      description: "Count all loaded lines.",
    },
    {
      label: "Recent lines",
      sql: `SELECT * FROM ${tableName} ORDER BY line_no DESC LIMIT 100`,
      description: "Inspect the latest lines.",
    },
    {
      label: "Distinct levels",
      sql: `SELECT DISTINCT level FROM ${tableName} WHERE level IS NOT NULL`,
      description: "List inferred severity levels.",
    },
  ];
}

export function getSuggestions(input: SuggestionInput): QuerySuggestion[] {
  const { formatName, schema, tableName } = resolveInput(input);

  switch (formatName) {
    case "nginx_access":
    case "apache_access":
      return buildAccessSuggestions(tableName);
    case "syslog":
      return buildSyslogSuggestions(tableName);
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
