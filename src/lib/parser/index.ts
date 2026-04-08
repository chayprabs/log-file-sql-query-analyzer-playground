import { ParsedLogLine, LogFormat, LogLevel } from '@/types';
import { ALL_FORMATS, findFormat, JSON_LINES_FORMAT } from './formats';
import { parseTimestamp } from '../utils/timestamps';
import { getLogLevelFromText } from '../utils/log-levels';

const IP_REGEX = /^(?<c_ip>[\w.:\-]+)\s+[\w.\-]+\s+(?<cs_username>\S+)\s+\[(?<timestamp>[^\]]+)\]\s+"(?<cs_method>\w+)\s+(?<cs_uri_stem>[^?\s]+)(?:\?(?<cs_uri_query>[^"\s]+))?\s+(?<cs_version>[^"]+)"\s+(?<sc_status>\d+)\s+(?<sc_bytes>\d+|-)(?:\s+"(?<cs_referer>[^"]*)"\s+"(?<cs_user_agent>[^"]*)")?/;

const SYSLOG_REGEX = /^(?:(?<timestamp>\S{3,8}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}|[\d\-T:.+Z]+))\s+(?:(?<log_hostname>[^\s]+)\s+)?(?:(?<log_procname>[^\[:]+)(?:\[(?<log_pid>\d+)\])?:?\s*)?(?<log_body>.*)$/;

const RFC5424_REGEX = /^<(?<log_pri>\d+)>(?<version>\d+)\s+(?<timestamp>[\d\-T:.+Z]+)\s+(?<log_hostname>[^\s]+)\s+(?<log_syslog_tag>[^\s]+)\s+(?<log_msgid>[^\s]+)\s+(?<log_struct>[^\s]+)\s+(?<log_body>.*)$/;

const GLOG_REGEX = /^(?<level>[IWECF])(?<timestamp>\d{8}\s+\d{2}:\d{2}:\d{2}\.\d{6})\s+(?<thread>\d+)\s+(?<src_file>[^:]+):(?<src_line>\d+)\]\s+(?<body>.*)$/;

function parseSyslog(line: string, format: LogFormat): ParsedLogLine | null {
  const rfcMatch = line.match(RFC5424_REGEX);
  if (rfcMatch?.groups) {
    const { timestamp, log_hostname, log_procname, log_syslog_tag, log_msgid, log_body } = rfcMatch.groups;
    const timeResult = parseTimestamp(timestamp);
    return {
      lineNumber: 0,
      rawText: line,
      timestamp: timeResult?.date ?? null,
      timestampMsecs: timeResult?.msecs ?? null,
      level: getLogLevelFromText(log_body || ''),
      format: format.name,
      body: log_body || '',
      fields: {
        log_hostname: log_hostname || null,
        log_procname: log_syslog_tag?.split(' ')[0] || null,
        log_pid: log_syslog_tag?.match(/\d+/)?.[0] || null,
        log_syslog_tag: log_syslog_tag || null,
        log_msgid: log_msgid || null,
      },
    };
  }

  const match = line.match(SYSLOG_REGEX);
  if (match?.groups) {
    const { timestamp, log_hostname, log_procname, log_body } = match.groups;
    const timeResult = parseTimestamp(timestamp?.trim());
    return {
      lineNumber: 0,
      rawText: line,
      timestamp: timeResult?.date ?? null,
      timestampMsecs: timeResult?.msecs ?? null,
      level: getLogLevelFromText(log_body || ''),
      format: format.name,
      body: log_body || '',
      fields: {
        log_hostname: log_hostname || null,
        log_procname: log_procname || null,
        log_pid: null,
        log_syslog_tag: null,
        log_msgid: null,
      },
    };
  }
  return null;
}

function parseAccessLog(line: string, format: LogFormat): ParsedLogLine | null {
  const match = line.match(IP_REGEX);
  if (match?.groups) {
    const { timestamp, c_ip, cs_username, cs_method, cs_uri_stem, cs_uri_query, cs_version, sc_status, sc_bytes, cs_referer, cs_user_agent } = match.groups;
    const timeResult = parseTimestamp(timestamp);
    const status = parseInt(sc_status, 10);
    let level: LogLevel = 'info';
    if (status >= 500) level = 'error';
    else if (status >= 400) level = 'warning';
    
    return {
      lineNumber: 0,
      rawText: line,
      timestamp: timeResult?.date ?? null,
      timestampMsecs: timeResult?.msecs ?? null,
      level,
      format: format.name,
      body: line,
      fields: {
        c_ip: c_ip || null,
        cs_username: cs_username !== '-' ? cs_username : null,
        cs_method: cs_method !== '-' ? cs_method : null,
        cs_uri_stem: cs_uri_stem || null,
        cs_uri_query: cs_uri_query || null,
        cs_version: cs_version || null,
        sc_status: isNaN(status) ? null : status,
        sc_bytes: sc_bytes === '-' ? null : parseInt(sc_bytes, 10),
        cs_referer: cs_referer !== '-' ? cs_referer : null,
        cs_user_agent: cs_user_agent || null,
      },
    };
  }
  return null;
}

function parseJsonLog(line: string, format: LogFormat, lineNumber: number): ParsedLogLine | null {
  try {
    const json = JSON.parse(line);
    const tsField = format.timestampFields.find(f => json[f]);
    const tsValue = tsField ? json[tsField] : null;
    let timestamp = null;
    let timestampMsecs: number | null = null;
    
    if (tsValue) {
      if (typeof tsValue === 'number') {
        timestampMsecs = tsValue;
        timestamp = new Date(tsValue / 1000);
      } else if (typeof tsValue === 'string') {
        const timeResult = parseTimestamp(tsValue);
        timestamp = timeResult?.date ?? null;
        timestampMsecs = timeResult?.msecs ?? null;
      }
    }
    
    let level: LogLevel = 'unknown';
    const lvlField = format.levelField;
    if (format.levelPairs && lvlField && json[lvlField]) {
      const lvlValue = json[lvlField];
      const pair = format.levelPairs.find(([v]) => {
        if (typeof v === 'number') return v === (lvlValue as number);
        return v === lvlValue;
      });
      if (pair) level = pair[1];
    } else {
      level = getLogLevelFromText(json.message || json.msg || '');
    }
    
    const fields: Record<string, string | number | null> = {};
    for (const field of format.fields) {
      fields[field.name] = json[field.name] ?? null;
    }
    
    fields.log_body = json.message || json.msg || '';
    
    return {
      lineNumber,
      rawText: line,
      timestamp,
      timestampMsecs,
      level,
      format: format.name,
      body: json.message || json.msg || '',
      fields,
    };
  } catch {
    return null;
  }
}

const parserFunctions: Record<string, (line: string, format: LogFormat, lineNumber: number) => ParsedLogLine | null> = {
  syslog_log: parseSyslog,
  access_log: parseAccessLog,
  journald_json_log: parseJsonLog,
  glog_log: (line, format, lineNum) => parseJsonLog(line, format, lineNum),
  bunyan_log: (line, format, lineNum) => parseJsonLog(line, format, lineNum),
  json_log: (line, format, lineNum) => parseJsonLog(line, format, lineNum),
};

export function detectFormat(line: string): LogFormat | null {
  let jsonAttempted = false;
  
  for (const format of ALL_FORMATS) {
    if (format.json) {
      if (!jsonAttempted && line.trim().startsWith('{')) {
        jsonAttempted = true;
        try {
          JSON.parse(line);
          return format;
        } catch {
          continue;
        }
      }
      continue;
    }
    
    if (format.pattern.test(line)) {
      return format;
    }
  }
  
  return null;
}

export function detectFormatFromSample(lines: string[]): LogFormat | null {
  for (const line of lines.slice(0, 20)) {
    if (line.trim().length === 0) continue;
    const format = detectFormat(line);
    if (format) return format;
  }
  return null;
}

export function parseLogLine(line: string, format: LogFormat, lineNumber: number): ParsedLogLine | null {
  const parser = parserFunctions[format.name];
  if (parser) {
    return parser(line, format, lineNumber);
  }
  
  if (format.json) {
    return parseJsonLog(line, format, lineNumber);
  }
  
  return {
    lineNumber,
    rawText: line,
    timestamp: null,
    timestampMsecs: null,
    level: 'unknown',
    format: format.name,
    body: line,
    fields: {},
  };
}

export function parseLogFile(content: string, forcedFormat?: string): ParsedLogLine[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const results: ParsedLogLine[] = [];
  
  let format: LogFormat | null = null;
  
  if (forcedFormat) {
    format = findFormat(forcedFormat) ?? null;
  }
  
  if (!format) {
    format = detectFormatFromSample(lines);
  }
  
  if (!format && lines.length > 0) {
    const firstLine = lines[0];
    const trimmed = firstLine.trim();
    if (trimmed.startsWith('{')) {
      format = findFormat('json_log') ?? null;
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;
    
    const parsed = parseLogLine(line, format ?? JSON_LINES_FORMAT, i + 1);
    if (parsed) {
      parsed.lineNumber = i + 1;
      results.push(parsed);
    } else {
      results.push({
        lineNumber: i + 1,
        rawText: line,
        timestamp: null,
        timestampMsecs: null,
        level: 'unknown',
        format: format?.name ?? 'text',
        body: line,
        fields: {},
      });
    }
  }
  
  if (results.length > 0 && results[0].timestamp) {
    results.sort((a, b) => (a.timestampMsecs ?? 0) - (b.timestampMsecs ?? 0));
    results.forEach((r, i) => (r.lineNumber = i + 1));
  }
  
  return results;
}