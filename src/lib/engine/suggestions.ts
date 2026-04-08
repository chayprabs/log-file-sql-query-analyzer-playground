import { LogFormat } from './formats';

export interface QuerySuggestion {
  label: string;
  sql: string;
  description: string;
}

const ACCESS_LOG_SUGGESTIONS: QuerySuggestion[] = [
  {
    label: 'Status code breakdown',
    sql: 'SELECT status, COUNT(*) as count FROM access_logs GROUP BY status ORDER BY count DESC',
    description: 'Count of responses by HTTP status code',
  },
  {
    label: 'Top IPs by requests',
    sql: 'SELECT remote_addr, COUNT(*) as hits FROM access_logs GROUP BY remote_addr ORDER BY hits DESC LIMIT 20',
    description: 'Most active client IP addresses',
  },
  {
    label: 'Top requested URLs',
    sql: 'SELECT method, uri, COUNT(*) as hits FROM access_logs GROUP BY method, uri ORDER BY hits DESC LIMIT 20',
    description: 'Most frequently requested resources',
  },
  {
    label: 'Error rate over time',
    sql: 'SELECT time_local, COUNT(*) as errors FROM access_logs WHERE status >= 400 GROUP BY time_local ORDER BY time_local',
    description: 'Error responses over time',
  },
  {
    label: 'Response size stats',
    sql: 'SELECT MIN(body_bytes_sent) as min, MAX(body_bytes_sent) as max, AVG(body_bytes_sent) as avg FROM access_logs WHERE body_bytes_sent IS NOT NULL',
    description: 'Minimum, maximum and average response sizes',
  },
  {
    label: 'User agents',
    sql: 'SELECT http_user_agent, COUNT(*) as hits FROM access_logs GROUP BY http_user_agent ORDER BY hits DESC LIMIT 10',
    description: 'Most common user agent strings',
  },
];

const NGINX_SUGGESTIONS: QuerySuggestion[] = [
  {
    label: 'Status code breakdown',
    sql: 'SELECT status, COUNT(*) as count FROM nginxs GROUP BY status ORDER BY count DESC',
    description: 'Count of responses by HTTP status code',
  },
  {
    label: 'Request methods',
    sql: 'SELECT method, COUNT(*) as count FROM nginxs GROUP BY method ORDER BY count DESC',
    description: 'Breakdown of HTTP methods',
  },
  {
    label: 'Top 404 URLs',
    sql: 'SELECT uri, COUNT(*) as hits FROM nginxs WHERE status = 404 GROUP BY uri ORDER BY hits DESC LIMIT 10',
    description: 'Most common missing resources',
  },
  {
    label: 'Top 500 errors',
    sql: 'SELECT uri, status, COUNT(*) as hits FROM nginxs WHERE status >= 500 GROUP BY uri, status ORDER BY hits DESC LIMIT 10',
    description: 'Most common server errors',
  },
  {
    label: 'Slow responses',
    sql: 'SELECT request, time_local FROM nginxs WHERE status = 200 ORDER BY time_local DESC LIMIT 100',
    description: 'Most recent successful requests',
  },
  {
    label: 'Top referrers',
    sql: 'SELECT http_referer, COUNT(*) as hits FROM nginxs WHERE http_referer IS NOT NULL AND http_referer != "-" GROUP BY http_referer ORDER BY hits DESC LIMIT 10',
    description: 'Top referring URLs',
  },
];

const SYSLOG_SUGGESTIONS: QuerySuggestion[] = [
  {
    label: 'Messages by hostname',
    sql: 'SELECT hostname, COUNT(*) as count FROM syslogs GROUP BY hostname ORDER BY count DESC',
    description: 'Messages grouped by source hostname',
  },
  {
    label: 'Messages by process',
    sql: 'SELECT ident, COUNT(*) as count FROM syslogs GROUP BY ident ORDER BY count DESC LIMIT 20',
    description: 'Most active processes',
  },
  {
    label: 'Recent errors',
    sql: 'SELECT timestamp, hostname, ident, message FROM syslogs WHERE message LIKE "%error%" OR message LIKE "%fail%" ORDER BY timestamp DESC LIMIT 50',
    description: 'Most recent error messages',
  },
  {
    label: 'PID distribution',
    sql: 'SELECT pid, COUNT(*) as count FROM syslogs WHERE pid IS NOT NULL GROUP BY pid ORDER BY count DESC LIMIT 20',
    description: 'Most active process IDs',
  },
  {
    label: 'Message patterns',
    sql: 'SELECT substr(message, 1, 50) as pattern, COUNT(*) as count FROM syslogs GROUP BY pattern ORDER BY count DESC LIMIT 20',
    description: 'Most common message prefixes',
  },
];

const JOURNALD_SUGGESTIONS: QuerySuggestion[] = [
  {
    label: 'By systemd unit',
    sql: 'SELECT _SYSTEMD_UNIT, COUNT(*) as count FROM journalds GROUP BY _SYSTEMD_UNIT ORDER BY count DESC',
    description: 'Messages by systemd service',
  },
  {
    label: 'By priority',
    sql: 'SELECT PRIORITY, COUNT(*) as count FROM journalds GROUP BY PRIORITY ORDER BY count DESC',
    description: 'Messages by log priority level',
  },
  {
    label: 'By process',
    sql: 'SELECT SYSLOG_IDENTIFIER, COUNT(*) as count FROM journalds GROUP BY SYSLOG_IDENTIFIER ORDER BY count DESC LIMIT 20',
    description: 'Messages by syslog identifier',
  },
  {
    label: 'Errors only',
    sql: 'SELECT __REALTIME_TIMESTAMP, _SYSTEMD_UNIT, MESSAGE FROM journalds WHERE PRIORITY < "4" ORDER BY __REALTIME_TIMESTAMP DESC',
    description: 'Error and critical messages',
  },
  {
    label: 'Recent by unit',
    sql: 'SELECT __REALTIME_TIMESTAMP, MESSAGE FROM journalds WHERE _SYSTEMD_UNIT = "default.target" ORDER BY __REALTIME_TIMESTAMP DESC LIMIT 50',
    description: 'Recent messages from default target',
  },
];

const JSON_SUGGESTIONS: QuerySuggestion[] = [
  {
    label: 'All rows count',
    sql: 'SELECT COUNT(*) as total FROM jsons',
    description: 'Total number of log entries',
  },
  {
    label: 'Show all columns',
    sql: 'SELECT * FROM jsons LIMIT 100',
    description: 'Sample of all data',
  },
];

const GENERIC_SUGGESTIONS: QuerySuggestion[] = [
  {
    label: 'Line count',
    sql: 'SELECT COUNT(*) as total FROM generics',
    description: 'Total number of lines',
  },
  {
    label: 'Show sample',
    sql: 'SELECT * FROM generics LIMIT 100',
    description: 'Sample of raw lines',
  },
];

export function getSuggestions(format: LogFormat | string): QuerySuggestion[] {
  const formatName = typeof format === 'string' ? format : format.name;
  
  switch (formatName) {
    case 'nginx_access':
      return NGINX_SUGGESTIONS;
    case 'apache_access':
      return ACCESS_LOG_SUGGESTIONS;
    case 'syslog':
      return SYSLOG_SUGGESTIONS;
    case 'journald':
      return JOURNALD_SUGGESTIONS;
    case 'json':
      return JSON_SUGGESTIONS;
    case 'generic':
      return GENERIC_SUGGESTIONS;
    default:
      return GENERIC_SUGGESTIONS;
  }
}

export function getQuickSuggestions(format: LogFormat | string): QuerySuggestion[] {
  const all = getSuggestions(format);
  return all.slice(0, 3);
}