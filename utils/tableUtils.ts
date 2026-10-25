import type { FlatJSON } from '../types';

/**
 * How a flattened cell is shown in the preview table.
 *
 * Rendering the raw value straight into JSX hid two of them: React prints
 * nothing at all for `false` and for `null`, so a boolean false column looked
 * exactly like an empty one.
 */
export const formatCell = (value: FlatJSON[string]): string => {
  if (value === null) return 'null';
  if (value === '') return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

/** True when the row has any cell containing `term`, compared case-insensitively. */
export const rowMatches = (row: FlatJSON, term: string): boolean => {
  if (!term) return true;
  const needle = term.toLowerCase();
  for (const value of Object.values(row)) {
    if (value === null) {
      if ('null'.includes(needle)) return true;
      continue;
    }
    if (String(value).toLowerCase().includes(needle)) return true;
  }
  return false;
};

export const filterRows = (rows: FlatJSON[], term: string): FlatJSON[] =>
  term ? rows.filter((row) => rowMatches(row, term)) : rows;

/** Clamps a page number into the range the current row count allows. */
export const clampPage = (page: number, totalPages: number): number => {
  if (totalPages < 1) return 1;
  return Math.min(Math.max(page, 1), totalPages);
};
