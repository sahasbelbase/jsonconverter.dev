import { describe, expect, it } from 'vitest';
import { clampPage, filterRows, formatCell, rowMatches } from '../utils/tableUtils';

describe('formatCell', () => {
  it('shows false and null instead of rendering nothing', () => {
    // React prints nothing for either, so a false cell used to look empty.
    expect(formatCell(false)).toBe('false');
    expect(formatCell(true)).toBe('true');
    expect(formatCell(null)).toBe('null');
  });

  it('leaves a genuinely absent value blank', () => {
    expect(formatCell('')).toBe('');
  });

  it('passes numbers and strings through', () => {
    expect(formatCell(0)).toBe('0');
    expect(formatCell(42)).toBe('42');
    expect(formatCell('text')).toBe('text');
  });
});

describe('rowMatches', () => {
  const row = { name: 'Ada', age: 36, active: false, note: null, blank: '' };

  it('matches with no term at all', () => {
    expect(rowMatches(row, '')).toBe(true);
  });

  it('ignores case', () => {
    expect(rowMatches(row, 'ADA')).toBe(true);
  });

  it('searches numbers and booleans as text', () => {
    expect(rowMatches(row, '36')).toBe(true);
    expect(rowMatches(row, 'false')).toBe(true);
  });

  it('finds a null cell by the word null', () => {
    expect(rowMatches(row, 'null')).toBe(true);
  });

  it('does not match an absent value against the word null', () => {
    expect(rowMatches({ blank: '' }, 'null')).toBe(false);
  });

  it('returns false when nothing matches', () => {
    expect(rowMatches(row, 'zebra')).toBe(false);
  });
});

describe('filterRows', () => {
  const rows = [{ city: 'Pokhara' }, { city: 'Kathmandu' }, { city: 'Patan' }];

  it('returns the original array when there is no term', () => {
    expect(filterRows(rows, '')).toBe(rows);
  });

  it('keeps only matching rows', () => {
    expect(filterRows(rows, 'pa')).toEqual([{ city: 'Patan' }]);
    expect(filterRows(rows, 'a')).toHaveLength(3);
    expect(filterRows(rows, 'KAT')).toEqual([{ city: 'Kathmandu' }]);
  });
});

describe('clampPage', () => {
  it('keeps a valid page', () => {
    expect(clampPage(3, 10)).toBe(3);
  });

  it('pulls an out-of-range page back in', () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(99, 10)).toBe(10);
  });

  it('returns page 1 when there are no pages at all', () => {
    expect(clampPage(5, 0)).toBe(1);
  });
});
