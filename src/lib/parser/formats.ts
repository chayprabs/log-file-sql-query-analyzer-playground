import { LogFormat, FormatField, LogLevel } from '@/types';

export const SYSLOG_FORMAT: LogFormat = {
  name: 'syslog_log',
  pattern: /^(\S{3,8}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})|^<\d+>/,
  timestampFields: ['timestamp'],
  timestampFormats: [
    'MMM dd HH:mm:ss',
    'MMM  d HH:mm:ss',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-ddTHH:mm:ss',
  ],
  levelField: 'log_level',
  fields: [
    { name: 'log_hostname', type: 'text', identifier: true },
    { name: 'log_procname', type: 'text', identifier: true },
    { name: 'log_pid', type: 'text', identifier: true },
    { name: 'log_syslog_tag', type: 'text' },
    { name: 'log_msgid', type: 'text' },
    { name: 'log_body', type: 'text' },
  ],
  sampleLines: [
    'Apr 28 04:02:03 hostname syslogd: startup message',
    'Jan 15 10:30:00 server sshd[1234]: Accepted publickey for user',
    '<46>1 2024-01-15T10:30:00.123Z hostname rsyslogd - - [origin software="rsyslogd"]',
  ],
};

export const ACCESS_LOG_FORMAT: LogFormat = {
  name: 'access_log',
  pattern: /^[\w.:\-]+\s+[\w.\-]+\s+(\S+|\-)\s+\[[^\]]+\]\s+"(\S+|\-)/,
  timestampFields: ['timestamp'],
  timestampFormats: [
    'dd/MMM/yyyy:HH:mm:ss',
    'dd/MMM/yyyy:HH:mm:ss Z',
  ],
  levelField: 'log_level',
  fields: [
    { name: 'c_ip', type: 'text', identifier: true, collate: 'ipaddress' },
    { name: 'cs_username', type: 'text' },
    { name: 'cs_method', type: 'text', identifier: true },
    { name: 'cs_uri_stem', type: 'text', identifier: true },
    { name: 'cs_uri_query', type: 'text' },
    { name: 'cs_version', type: 'text' },
    { name: 'sc_status', type: 'integer' },
    { name: 'sc_bytes', type: 'integer' },
    { name: 'cs_referer', type: 'text' },
    { name: 'cs_user_agent', type: 'text' },
  ],
  sampleLines: [
    '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
    '192.168.1.1 - admin [01/Jan/2024:12:00:00 +0000] "POST /api/login HTTP/1.1" 401 145',
  ],
};

export const JOURNALD_FORMAT: LogFormat = {
  name: 'journald_json_log',
  pattern: /^{"__/,
  json: true,
  timestampFields: ['__REALTIME_TIMESTAMP'],
  timestampFormats: ['epoch'],
  levelField: 'PRIORITY',
  levelPairs: [
    [0, 'fatal'],
    [1, 'fatal'],
    [2, 'critical'],
    [3, 'error'],
    [4, 'warning'],
    [5, 'notice'],
    [6, 'info'],
    [7, 'debug'],
  ],
  fields: [
    { name: '__MONOTONIC_TIMESTAMP', type: 'integer', hidden: true },
    { name: '_SYSTEMD_UNIT', type: 'text', identifier: true },
    { name: 'SYSLOG_IDENTIFIER', type: 'text', identifier: true },
    { name: '_PID', type: 'integer', identifier: true },
    { name: 'MESSAGE', type: 'text' },
    { name: '_EXE', type: 'text' },
    { name: '_COMM', type: 'text' },
  ],
  sampleLines: [
    '{"__REALTIME_TIMESTAMP":"1705312200000000","_SYSTEMD_UNIT":"sshd.service","SYSLOG_IDENTIFIER":"sshd","_PID":1234,"PRIORITY":"6","MESSAGE":"Accepted publickey"}',
  ],
};

export const GLOG_FORMAT: LogFormat = {
  name: 'glog_log',
  pattern: /^[IWECF]\d{4}\s+\d{2}:\d{2}:\d{2}\.\d{6}/,
  timestampFields: ['timestamp'],
  timestampFormats: ['yyyyMMdd HH:mm:ss.SSSSSS', 'MMdd HH:mm:ss.SSSSSS'],
  levelField: 'level',
  levelPairs: [
    ['I', 'info'],
    ['W', 'warning'],
    ['E', 'error'],
    ['C', 'critical'],
    ['F', 'fatal'],
  ],
  fields: [
    { name: 'thread', type: 'integer', identifier: true },
    { name: 'src_file', type: 'text', identifier: true },
    { name: 'src_line', type: 'integer' },
    { name: 'body', type: 'text' },
  ],
  sampleLines: [
    'I20240115 10:30:00.123456 1234 test.cc:42] Info message',
    'W20240115 10:30:00.234567 1234 test.cc:55] Warning message',
  ],
};

export const BUNYAN_FORMAT: LogFormat = {
  name: 'bunyan_log',
  pattern: /^\{"level":/,
  json: true,
  timestampFields: ['time'],
  timestampFormats: ['iso8601'],
  levelField: 'level',
  levelPairs: [
    [10, 'trace'],
    [20, 'debug'],
    [30, 'info'],
    [40, 'warning'],
    [50, 'error'],
    [60, 'fatal'],
  ],
  fields: [
    { name: 'pid', type: 'integer', identifier: true },
    { name: 'hostname', type: 'text', identifier: true, hidden: true },
    { name: 'name', type: 'text', identifier: true },
    { name: 'msg', type: 'text' },
    { name: 'src_file', type: 'text', identifier: true },
    { name: 'src_line', type: 'integer' },
    { name: 'src_func', type: 'text', identifier: true },
  ],
  sampleLines: [
    '{"level":30,"name":"myapp","hostname":"server1","pid":1234,"time":"2024-01-15T10:30:00.000Z","msg":"Started"}',
  ],
};

export const JSON_LINES_FORMAT: LogFormat = {
  name: 'json_log',
  pattern: /^\{/,
  json: true,
  timestampFields: ['timestamp', 'time', '@timestamp'],
  timestampFormats: ['iso8601', 'epoch', 'epoch_millis'],
  levelField: 'level',
  fields: [],
  sampleLines: [
    '{"timestamp":"2024-01-15T10:30:00Z","level":"info","message":"Sample log"}',
  ],
};

export const ALL_FORMATS: LogFormat[] = [
  JOURNALD_FORMAT,
  ACCESS_LOG_FORMAT,
  SYSLOG_FORMAT,
  GLOG_FORMAT,
  BUNYAN_FORMAT,
  JSON_LINES_FORMAT,
];

export function findFormat(name: string): LogFormat | undefined {
  return ALL_FORMATS.find((f) => f.name === name);
}