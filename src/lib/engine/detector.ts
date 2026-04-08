import { LogFormat, FORMATS } from './formats';

export interface DetectionResult {
  format: LogFormat;
  score: number;
  matchedLines: number;
}

const SAMPLE_SIZE = 20;

function timestampInGroup(line: string): number {
  const ts = line.match(/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}/)
    || line.match(/\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/)
    || line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/)
    || line.match(/^\{"__/);
  return ts ? 1 : 0;
}

function jsonObjectCheck(line: string): number {
  const trimmed = line.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return 2;
    } catch {
      return 0;
    }
  }
  return 0;
}

function httpRequestCheck(line: string): number {
  const match = line.match(/"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\/\S*/);
  return match ? 3 : 0;
}

function statusCodeCheck(line: string): number {
  const match = line.match(/\s([45]\d{2})\s/);
  if (match || /\s200\s/.test(line) || /\s304\s/.test(line)) {
    return 2;
  }
  return 0;
}

function rfc5424Check(line: string): number {
  return line.match(/^<\d+>\d+\s+\S+\s+\S+/) ? 4 : 0;
}

function syslogCheck(line: string): number {
  const match = line.match(/^(\S+)\s+(\d+)\s+(\d+:\d+:\d+)\s+(\S+)/);
  if (match && !line.includes('"')) {
    return 2;
  }
  return 0;
}

function scoreLine(line: string, format: LogFormat): number {
  if (format.name === 'nginx_access') {
    return httpRequestCheck(line) + timestampInGroup(line) + statusCodeCheck(line);
  }
  if (format.name === 'apache_access') {
    return httpRequestCheck(line) + timestampInGroup(line) + statusCodeCheck(line);
  }
  if (format.name === 'syslog') {
    return rfc5424Check(line) + syslogCheck(line);
  }
  if (format.name === 'journald') {
    return jsonObjectCheck(line);
  }
  if (format.name === 'json') {
    return jsonObjectCheck(line);
  }
  if (format.name === 'generic') {
    return line.length > 0 ? 1 : 0;
  }
  return 0;
}

export function detectFormat(lines: string[]): DetectionResult {
  const sample = lines.slice(0, SAMPLE_SIZE).filter(l => l.trim().length > 0);
  
  if (sample.length === 0) {
    const generic = FORMATS.find(f => f.name === 'generic');
    return { format: generic!, score: 0, matchedLines: 0 };
  }
  
  const results: DetectionResult[] = [];
  
  for (const format of FORMATS) {
    let totalScore = 0;
    let matched = 0;
    
    for (const line of sample) {
      const score = scoreLine(line, format);
      if (score > 0) {
        matched++;
        totalScore += score;
      }
    }
    
    if (matched > 0) {
      const avgScore = totalScore / sample.length;
      const matchRatio = matched / sample.length;
      const finalScore = avgScore * matchRatio * 10;
      results.push({ format, score: finalScore, matchedLines: matched });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  if (results.length === 0 || results[0].score === 0) {
    const generic = FORMATS.find(f => f.name === 'generic');
    return { format: generic!, score: 0, matchedLines: 0 };
  }
  
  return results[0];
}

export function detectWithConfidence(lines: string[]): { format: LogFormat; confidence: number } {
  const sample = lines.slice(0, SAMPLE_SIZE).filter(l => l.trim().length > 0);
  const result = detectFormat(sample);
  
  const confidence = sample.length > 0 
    ? (result.matchedLines / sample.length) * 100 
    : 0;
  
  return { format: result.format, confidence: Math.round(confidence) };
}