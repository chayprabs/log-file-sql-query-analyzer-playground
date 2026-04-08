import { describe, it, expect } from 'vitest';
import { detectFormat, detectWithConfidence } from '../detector';
import { FORMATS } from '../formats';

describe('Format Detector', () => {
  const nginxLines = [
    '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 432 "-" "Mozilla/5.0"',
    '10.0.0.1 - - [10/Oct/2020:13:55:37 -0700] "POST /login HTTP/1.1" 200 5120 "-" "curl/7.68"',
    '192.168.1.2 - - [10/Oct/2020:13:55:38 -0700] "GET /assets/main.js HTTP/1.1" 304 0 "-" "Chrome"',
  ];
  
  it('detects nginx access log format', () => {
    const result = detectFormat(nginxLines);
    expect(result.format.name).toBe('nginx_access');
    expect(result.score).toBeGreaterThan(0);
  });
  
  it('detects access log format', () => {
    const apacheLines = [
      '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET / HTTP/1.0" 200 1024',
      '192.168.1.1 - admin [10/Oct/2000:13:55:37 -0700] "POST /admin HTTP/1.0" 401 0',
    ];
    const result = detectFormat(apacheLines);
    expect(['nginx_access', 'apache_access']).toContain(result.format.name);
  });
  
  it('detects syslog format', () => {
    const syslogLines = [
      'Jan 15 10:30:00 server1 sshd[1234]: Accepted publickey',
      'Jan 15 10:30:01 server2 kernel: USB device connected',
      'Jan 15 10:30:02 server1 systemd[1]: Started some service',
    ];
    const result = detectFormat(syslogLines);
    expect(result.format.name).toBe('syslog');
  });
  
  it('detects journald format', () => {
    const journaldLines = [
      '{"__REALTIME_TIMESTAMP":"1705312200000000","_SYSTEMD_UNIT":"sshd.service","MESSAGE":"test"}',
      '{"__REALTIME_TIMESTAMP":"1705312200000001","_SYSTEMD_UNIT":"httpd.service","MESSAGE":"started"}',
    ];
    const result = detectFormat(journaldLines);
    expect(result.format.name).toBe('journald');
  });
  
  it('detects generic for plain text', () => {
    const plainLines = [
      'Some random log message',
      'Another info message',
      'Error occurred at line 42',
    ];
    const result = detectFormat(plainLines);
    expect(result.format.name).toBe('generic');
  });
  
  it('handles empty lines array', () => {
    const result = detectFormat([]);
    expect(result.format.name).toBe('generic');
  });
  
  it('handles empty strings', () => {
    const result = detectFormat(['', '   ', '']);
    expect(result.format).toBeDefined();
  });
});

describe('Detector Confidence', () => {
  it('returns high confidence for clean format', () => {
    const nginxLines = [
      '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET / HTTP/1.1" 200 100',
    ];
    const { confidence } = detectWithConfidence(nginxLines);
    expect(confidence).toBeGreaterThan(50);
  });
  
  it('returns lower confidence for mixed content', () => {
    const mixedLines = [
      'some random text',
      '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET / HTTP/1.1" 200 100',
      'Jan 15 10:30:00 server sshd: test message',
    ];
    const { confidence } = detectWithConfidence(mixedLines);
    expect(confidence).toBeLessThan(70);
  });
});

describe('Format Prioritization', () => {
  it('prefers specific format over generic', () => {
    const specificLines = [
      '192.168.1.1 - - [10/Oct/2020:13:55:36 -0700] "GET /api HTTP/1.1" 200 100',
    ];
    const result = detectFormat(specificLines);
    expect(result.format.name).not.toBe('generic');
  });
  
  it('detects JSON-based formats for JSON lines', () => {
    const jsonLines = [
      '{"level":"info","message":"test"}',
      '{"level":"warn","message":"test2"}',
    ];
    const result = detectFormat(jsonLines);
    const validFormats = ['json', 'journald'];
    expect(validFormats).toContain(result.format.name);
  });
});