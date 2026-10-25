import { describe, expect, it } from 'vitest';
import { nextRuns, parseCron } from '../utils/cronUtils';

// A Sunday, so weekday arithmetic is easy to reason about.
const base = new Date(2026, 2, 1, 10, 17, 0);
const at = (expression: string, count = 3) =>
  nextRuns(expression, count, base).map((d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  );

describe('parseCron', () => {
  it('rejects the wrong number of fields', () => {
    expect(() => parseCron('* * * *')).toThrow(/Expected 5 fields/);
    expect(() => parseCron('* * * * * *')).toThrow(/Expected 5 fields/);
  });

  it('rejects out-of-range values', () => {
    expect(() => parseCron('99 * * * *')).toThrow(/outside 0–59/);
    expect(() => parseCron('* 24 * * *')).toThrow(/outside 0–23/);
    expect(() => parseCron('* * 32 * *')).toThrow(/outside 1–31/);
  });

  it('rejects an invalid step', () => {
    expect(() => parseCron('*/0 * * * *')).toThrow(/Invalid step/);
  });

  it('treats 0 and 7 as the same Sunday', () => {
    expect(parseCron('0 0 * * 7').daysOfWeek).toEqual(new Set([0]));
    expect(parseCron('0 0 * * 0').daysOfWeek).toEqual(new Set([0]));
  });

  it('accepts month and day names', () => {
    expect(parseCron('0 0 1 JAN *').months).toEqual(new Set([1]));
    expect(parseCron('0 0 * * MON-FRI').daysOfWeek).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('expands a step from a bare start value to the end of the range', () => {
    expect(parseCron('0/15 * * * *').minutes).toEqual(new Set([0, 15, 30, 45]));
  });
});

describe('nextRuns', () => {
  it('steps every minute', () => {
    expect(at('* * * * *')).toEqual(['2026-03-01 10:18', '2026-03-01 10:19', '2026-03-01 10:20']);
  });

  it('honours a step', () => {
    expect(at('*/15 * * * *')).toEqual(['2026-03-01 10:30', '2026-03-01 10:45', '2026-03-01 11:00']);
  });

  it('skips the current hour once it has passed', () => {
    expect(at('0 * * * *')).toEqual(['2026-03-01 11:00', '2026-03-01 12:00', '2026-03-01 13:00']);
  });

  it('runs on weekdays only', () => {
    // 1 March 2026 is a Sunday, so the first weekday run is Monday the 2nd.
    expect(at('0 9 * * 1-5', 6)).toEqual([
      '2026-03-02 09:00',
      '2026-03-03 09:00',
      '2026-03-04 09:00',
      '2026-03-05 09:00',
      '2026-03-06 09:00',
      '2026-03-09 09:00',
    ]);
  });

  it('applies the day-of-month OR day-of-week rule', () => {
    // Vixie cron fires when EITHER field matches, so this hits every Friday
    // AND the 13th of each month — not only Friday the 13th.
    const runs = at('0 0 13 * 5', 6);
    expect(runs).toEqual([
      '2026-03-06 00:00',
      '2026-03-13 00:00',
      '2026-03-20 00:00',
      '2026-03-27 00:00',
      '2026-04-03 00:00',
      '2026-04-10 00:00',
    ]);
    // 13 April 2026 is a Monday, and it still appears further down the list.
    expect(at('0 0 13 * 5', 7)[6]).toBe('2026-04-13 00:00');
  });

  it('finds a leap day', () => {
    expect(at('0 0 29 2 *', 1)).toEqual(['2028-02-29 00:00']);
  });

  it('expands the @daily alias', () => {
    expect(at('@daily')).toEqual(['2026-03-02 00:00', '2026-03-03 00:00', '2026-03-04 00:00']);
  });

  it('handles a list crossed with a stepped range', () => {
    expect(at('15,45 9-17/4 * * *', 4)).toEqual([
      '2026-03-01 13:15',
      '2026-03-01 13:45',
      '2026-03-01 17:15',
      '2026-03-01 17:45',
    ]);
  });

  it('returns nothing rather than hanging on a schedule that never fires', () => {
    // 30 February.
    expect(nextRuns('0 0 30 2 *', 3, base)).toEqual([]);
  });
});
