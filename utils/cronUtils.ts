/**
 * A standard 5-field cron matcher, used to preview upcoming run times.
 *
 * It follows Vixie cron semantics, including the rule that surprises people
 * most: when BOTH day-of-month and day-of-week are restricted, a run happens if
 * EITHER matches, not both.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const ALIASES: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

interface FieldSpec {
  min: number;
  max: number;
  names?: string[];
}

const SPECS: FieldSpec[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12, names: MONTHS },
  { min: 0, max: 7, names: DAYS },
];

const parseField = (raw: string, spec: FieldSpec): Set<number> => {
  const values = new Set<number>();

  for (const part of raw.split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step "${stepPart}".`);

    let from: number;
    let to: number;

    if (rangePart === '*') {
      from = spec.min;
      to = spec.max;
    } else {
      const bounds = rangePart.split('-');
      if (bounds.length > 2) throw new Error(`Invalid range "${rangePart}".`);
      const resolve = (token: string): number => {
        const lower = token.trim().toLowerCase();
        const named = spec.names?.indexOf(lower);
        if (named !== undefined && named >= 0) return named + (spec.names === MONTHS ? 1 : 0);
        const n = Number(lower);
        if (!Number.isInteger(n)) throw new Error(`"${token}" is not a valid value.`);
        return n;
      };
      from = resolve(bounds[0]);
      to = bounds.length === 2 ? resolve(bounds[1]) : from;
      if (bounds.length === 1 && stepPart !== undefined) to = spec.max;
    }

    if (from < spec.min || to > spec.max || from > to) {
      throw new Error(`"${part}" is outside ${spec.min}–${spec.max}.`);
    }

    for (let v = from; v <= to; v += step) values.add(v);
  }

  return values;
};

export interface CronSchedule {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  domRestricted: boolean;
  dowRestricted: boolean;
}

export const parseCron = (expression: string): CronSchedule => {
  const normalized = ALIASES[expression.trim().toLowerCase()] ?? expression.trim();
  const fields = normalized.split(/\s+/);

  if (fields.length !== 5) {
    throw new Error(`Expected 5 fields, got ${fields.length}.`);
  }

  const [minutes, hours, daysOfMonth, months, daysOfWeekRaw] = fields.map((field, i) =>
    parseField(field, SPECS[i])
  );

  // Cron accepts both 0 and 7 for Sunday.
  const daysOfWeek = new Set(Array.from(daysOfWeekRaw, (d) => (d === 7 ? 0 : d)));

  return {
    minutes,
    hours,
    daysOfMonth,
    months,
    daysOfWeek,
    domRestricted: fields[2] !== '*',
    dowRestricted: fields[4] !== '*',
  };
};

const matchesDay = (schedule: CronSchedule, date: Date): boolean => {
  const dom = schedule.daysOfMonth.has(date.getDate());
  const dow = schedule.daysOfWeek.has(date.getDay());

  // Vixie cron: restricting both means "either one matches".
  if (schedule.domRestricted && schedule.dowRestricted) return dom || dow;
  if (schedule.domRestricted) return dom;
  if (schedule.dowRestricted) return dow;
  return true;
};

/**
 * Upcoming run times in the local time zone.
 *
 * Steps a minute at a time with a bounded search, which is plenty fast for a
 * preview and avoids the edge cases a clever date-arithmetic version would hit
 * around DST transitions.
 */
export const nextRuns = (expression: string, count = 8, from: Date = new Date()): Date[] => {
  const schedule = parseCron(expression);
  const results: Date[] = [];

  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  // Four years of minutes is enough to find any schedule that ever fires,
  // including 29 February.
  const LIMIT = 60 * 24 * 366 * 4;

  for (let i = 0; i < LIMIT && results.length < count; i++) {
    if (
      schedule.months.has(cursor.getMonth() + 1) &&
      matchesDay(schedule, cursor) &&
      schedule.hours.has(cursor.getHours()) &&
      schedule.minutes.has(cursor.getMinutes())
    ) {
      results.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return results;
};
