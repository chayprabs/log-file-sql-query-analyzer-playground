import { describe, it, expect } from 'vitest';
import { FORMATS, getFormat, parseNginx, parseApache, parseSyslog, parseJson, parseJournald, parseGeneric } from '../formats';

describe('Nginx Access Parser', () => {
  const nginxLine = '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 432 "-" "Mozilla/5.0"';
  
  it('parses valid nginx combined log line', () => {
    const result = FORMATS.find(f => f.name === 'nginx_access')!.parse(nginxLine);
    expect(result).not.toBeNull();
    expect(result?.remote_addr).toBe('192.168.1.1');
    expect(result?.status).toBe(200);
    expect(result?.method).toBe('GET');
    expect(result?.uri).toBe('/api/users');
  });
  
  it('maps status code 404 to warning level logic', () => {
    const line404 = '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET /missing HTTP/1.1" 404 123 "-" "Mozilla/5.0"';
    const result = FORMATS.find(f => f.name === 'nginx_access')!.parse(line404);
    expect(result?.status).toBe(404);
  });
  
  it('returns null for malformed line', () => {
    const malformed = 'this is not a nginx log line';
    const result = FORMATS.find(f => f.name === 'nginx_access')!.parse(malformed);
    expect(result).toBeNull();
  });
  
  it('handles missing optional fields', () => {
    const minimal = '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET / HTTP/1.1" 200 0';
    const result = FORMATS.find(f => f.name === 'nginx_access')!.parse(minimal);
    expect(result).not.toBeNull();
    expect(result?.remote_addr).toBe('192.168.1.1');
    expect(result?.body_bytes_sent).toBe(0);
  });
});

describe('Apache Access Parser', () => {
  const apacheLine = '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326';
  
  it('parses valid apache common log line', () => {
    const result = FORMATS.find(f => f.name === 'apache_access')!.parse(apacheLine);
    expect(result).not.toBeNull();
    expect(result?.host).toBe('127.0.0.1');
    expect(result?.user).toBe('frank');
    expect(result?.status).toBe(200);
  });
  
  it('handles dash user as null', () => {
    const line = '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET / HTTP/1.0" 200 100';
    const result = FORMATS.find(f => f.name === 'apache_access')!.parse(line);
    expect(result?.user).toBeNull();
  });
  
  it('returns null for malformed line', () => {
    const malformed = 'not an apache log';
    const result = FORMATS.find(f => f.name === 'apache_access')!.parse(malformed);
    expect(result).toBeNull();
  });
});

describe('Syslog Parser', () => {
  const syslogLine = 'Jan 15 10:30:00 server1 sshd[1234]: Accepted publickey for user';
  
  it('parses standard syslog line', () => {
    const result = FORMATS.find(f => f.name === 'syslog')!.parse(syslogLine);
    expect(result).not.toBeNull();
    expect(result?.hostname).toBeDefined();
  });
  
  it('extracts message after colon', () => {
    const line = 'Jan 15 10:30:00 server1 sshd: Connection closed';
    const result = FORMATS.find(f => f.name === 'syslog')!.parse(line);
    expect(result).not.toBeNull();
    expect(result?.message).toContain('Connection closed');
  });
});

describe('JSON Parser', () => {
  const jsonLine = '{"level":30,"message":"Server started","timestamp":"2024-01-15T10:30:00Z","value":123}';
  
  it('parses valid JSON line', () => {
    const result = FORMATS.find(f => f.name === 'json')!.parse(jsonLine);
    expect(result).not.toBeNull();
    expect(result?.level).toBe(30);
    expect(result?.message).toBe('Server started');
    expect(result?.value).toBe(123);
  });
  
  it('handles null values', () => {
    const line = '{"key":null,"value":"test"}';
    const result = FORMATS.find(f => f.name === 'json')!.parse(line);
    expect(result?.key).toBeNull();
    expect(result?.value).toBe('test');
  });
  
  it('returns null for invalid JSON', () => {
    const invalid = 'not valid json {';
    const result = FORMATS.find(f => f.name === 'json')!.parse(invalid);
    expect(result).toBeNull();
  });
});

describe('Journald Parser', () => {
  const journaldLine = '{"__REALTIME_TIMESTAMP":"1705312200000000","_SYSTEMD_UNIT":"sshd.service","SYSLOG_IDENTIFIER":"sshd","_PID":1234,"PRIORITY":"6","MESSAGE":"Accepted publickey"}';
  
  it('parses valid journald JSON line', () => {
    const result = FORMATS.find(f => f.name === 'journald')!.parse(journaldLine);
    expect(result).not.toBeNull();
    expect(result?.__REALTIME_TIMESTAMP).toBe('1705312200000000');
    expect(result?._SYSTEMD_UNIT).toBe('sshd.service');
    expect(result?._PID).toBe(1234);
  });
  
  it('returns null for non-journald JSON', () => {
    const line = '{"level":"info","message":"test"}';
    const result = FORMATS.find(f => f.name === 'journald')!.parse(line);
    expect(result).toBeNull();
  });
  
  it('handles missing fields gracefully', () => {
    const minimal = '{"MESSAGE":"test"}';
    const result = FORMATS.find(f => f.name === 'journald')!.parse(minimal);
    expect(result).not.toBeNull();
    expect(result?.MESSAGE).toBe('test');
  });
});

describe('Generic Parser', () => {
  it('wraps any line in generic format', () => {
    const line = 'any random text log line';
    const result = FORMATS.find(f => f.name === 'generic')!.parse(line);
    expect(result).not.toBeNull();
    expect(result?.raw_line).toBe(line);
  });
  
  it('preserves line number field', () => {
    const line = 'test line';
    const result = FORMATS.find(f => f.name === 'generic')!.parse(line);
    expect(result?.line_no).toBe(0);
  });
});

describe('Format Schema', () => {
  it('nginx has correct schema columns', () => {
    const nginx = getFormat('nginx_access');
    expect(nginx?.schema).toHaveLength(8);
    expect(nginx?.schema.find(c => c.name === 'status')?.type).toBe('INTEGER');
  });
  
  it('syslog has correct schema columns', () => {
    const syslog = getFormat('syslog');
    expect(syslog?.schema).toHaveLength(5);
    expect(syslog?.schema.find(c => c.name === 'hostname')?.type).toBe('TEXT');
  });
});