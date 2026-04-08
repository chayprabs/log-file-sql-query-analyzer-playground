import { describe, it, expect } from 'vitest';
import { getSuggestions, getQuickSuggestions } from '../suggestions';
import { FORMATS } from '../formats';

describe('SQL Suggestions', () => {
  it('returns nginx suggestions for nginx format', () => {
    const suggestions = getSuggestions('nginx_access');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].sql).toContain('nginx');
  });
  
  it('returns apache suggestions for apache format', () => {
    const suggestions = getSuggestions('apache_access');
    expect(suggestions.length).toBeGreaterThan(0);
  });
  
  it('returns syslog suggestions for syslog format', () => {
    const suggestions = getSuggestions('syslog');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].sql).toContain('syslog');
  });
  
  it('returns journald suggestions for journald format', () => {
    const suggestions = getSuggestions('journald');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toBeDefined();
  });
  
  it('returns generic suggestions for unknown format', () => {
    const suggestions = getSuggestions('unknown_format');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].sql).toContain('generic');
  });
  
  it('returns appropriate suggestions when passed format object', () => {
    const nginxFormat = FORMATS.find(f => f.name === 'nginx_access')!;
    const suggestions = getSuggestions(nginxFormat);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('Quick Suggestions', () => {
  it('returns limited suggestions for quick access', () => {
    const suggestions = getQuickSuggestions('nginx_access');
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
  
  it('includes status code suggestions', () => {
    const suggestions = getSuggestions('nginx_access');
    const hasStatusQuery = suggestions.some(s => s.label.toLowerCase().includes('status'));
    expect(hasStatusQuery).toBe(true);
  });
});

describe('Suggestion Content', () => {
  it('all suggestions have labels', () => {
    const suggestions = getSuggestions('nginx_access');
    for (const s of suggestions) {
      expect(s.label).toBeDefined();
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
  
  it('all suggestions have SQL queries', () => {
    const suggestions = getSuggestions('nginx_access');
    for (const s of suggestions) {
      expect(s.sql).toBeDefined();
      expect(s.sql.toUpperCase().startsWith('SELECT')).toBe(true);
    }
  });
  
  it('all suggestions have descriptions', () => {
    const suggestions = getSuggestions('nginx_access');
    for (const s of suggestions) {
      expect(s.description).toBeDefined();
    }
  });
});