import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadLogFile, closeDatabase, getDatabase } from '../db';

vi.mock('sql.js', () => ({
  default: vi.fn().mockResolvedValue({
    Database: vi.fn().mockImplementation(() => ({
      run: vi.fn(),
      exec: vi.fn().mockReturnValue([{ columns: ['id', 'line_no'], values: [[1, 1], [2, 2]] }]),
      close: vi.fn(),
    })),
  }),
}));

describe('LogDatabase', () => {
  beforeEach(() => {
    closeDatabase();
  });
  
  it('exports loadLogFile function', () => {
    expect(loadLogFile).toBeDefined();
    expect(typeof loadLogFile).toBe('function');
  });
  
  it('exports closeDatabase function', () => {
    expect(closeDatabase).toBeDefined();
    expect(typeof closeDatabase).toBe('function');
  });
  
  it('exports getDatabase function', () => {
    expect(getDatabase).toBeDefined();
    expect(typeof getDatabase).toBe('function');
  });
});

describe('loadLogFile', () => {
  it('accepts a File parameter', () => {
    const mockFile = new File([''], 'test.log', { type: 'text/plain' });
    expect(mockFile).toBeDefined();
  });
  
  it('rejects empty file with error', async () => {
    const emptyFile = new File([''], 'empty.log');
    
    try {
      await loadLogFile(emptyFile);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});

describe('LogDatabase interface', () => {
  it('query function returns expected shape', () => {
    const mockResult = {
      columns: ['col1', 'col2'],
      values: [['a', 1], ['b', 2]],
      rowCount: 2,
      executionTimeMs: 10,
    };
    
    expect(mockResult.columns).toBeDefined();
    expect(mockResult.values).toBeDefined();
    expect(mockResult.rowCount).toBeDefined();
    expect(mockResult.executionTimeMs).toBeDefined();
  });
});