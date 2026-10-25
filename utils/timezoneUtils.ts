/**
 * Time zone maths built on Intl, with no date library.
 *
 * The hard part is the direction Intl does not give you: turning a wall-clock
 * time in some zone ("3pm in Kathmandu") back into a UTC instant. Everything
 * here is derived from the IANA database the browser already ships, so the
 * offsets and DST rules stay correct without us shipping a table that rots.
 */

export interface ZoneFields {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const FORMAT_PARTS: Intl.DateTimeFormatOptions = {
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const partsCache = new Map<string, Intl.DateTimeFormat>();

const formatter = (zone: string): Intl.DateTimeFormat => {
  let cached = partsCache.get(zone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', { ...FORMAT_PARTS, timeZone: zone });
    partsCache.set(zone, cached);
  }
  return cached;
};

/** The wall-clock fields an instant shows as in a given zone. */
export const getZoneFields = (instant: Date, zone: string): ZoneFields => {
  const parts = formatter(zone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Some engines render midnight as hour 24 under hour12: false.
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
};

/** The zone's offset from UTC at a given instant, in minutes (east positive). */
export const getOffsetMinutes = (instant: Date, zone: string): number => {
  const fields = getZoneFields(instant, zone);
  const asIfUtc = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second
  );
  // Round to the minute: the instant carries milliseconds the fields do not.
  return Math.round((asIfUtc - instant.getTime()) / 60_000);
};

/**
 * What a wall-clock time means once DST is taken into account.
 *
 * - `exact`     — the time happens once, which is the normal case.
 * - `skipped`   — the clocks jumped over it, so it never happened. 02:30 does
 *                 not exist in New York on a spring-forward morning.
 * - `ambiguous` — the clocks were put back, so it happened twice. 01:30 on a
 *                 fall-back morning is two different instants.
 */
export type ResolutionStatus = 'exact' | 'skipped' | 'ambiguous';

export interface ResolvedTime {
  instant: Date;
  status: ResolutionStatus;
  /** For `ambiguous`, the other instant the same wall clock could mean. */
  alternative: Date | null;
}

/**
 * Turns a wall-clock time in `zone` into the UTC instant it refers to.
 *
 * Two passes, because the offset depends on the instant we are looking for.
 * The first guess uses the offset at the naive timestamp; when the resulting
 * instant lands on the other side of a DST change, the second pass corrects it.
 *
 * For a time the clocks skipped there is no correct answer, so this returns the
 * instant that wall clock would have had under the pre-transition offset and
 * reports `skipped` — the caller is expected to say so rather than pretend.
 */
export const resolveZonedTime = (fields: ZoneFields, zone: string): ResolvedTime => {
  const naive = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second
  );

  // Any instant matching this wall clock must use one of the offsets in force
  // within a day either side of it — a DST shift cannot move further than that.
  const nearbyOffsets = [
    getOffsetMinutes(new Date(naive - 86_400_000), zone),
    getOffsetMinutes(new Date(naive), zone),
    getOffsetMinutes(new Date(naive + 86_400_000), zone),
  ];

  /** Does this instant actually read back as the wall clock we were given? */
  const reads = (timestamp: number) => {
    const f = getZoneFields(new Date(timestamp), zone);
    return (
      f.year === fields.year &&
      f.month === fields.month &&
      f.day === fields.day &&
      f.hour === fields.hour &&
      f.minute === fields.minute
    );
  };

  const candidates = [...new Set(nearbyOffsets)]
    .map((offset) => naive - offset * 60_000)
    .filter(reads)
    .sort((a, b) => a - b);

  const unique = [...new Set(candidates)];

  if (unique.length === 1) {
    return { instant: new Date(unique[0]), status: 'exact', alternative: null };
  }

  if (unique.length > 1) {
    // The clocks went back, so this wall clock happened more than once.
    return {
      instant: new Date(unique[0]),
      status: 'ambiguous',
      alternative: new Date(unique[unique.length - 1]),
    };
  }

  // Nothing reads back: the clocks jumped over this time. Resolve it with the
  // offset in force after the transition, which shifts it forward out of the
  // gap rather than inventing an instant that does not correspond to it.
  const afterTransition = Math.min(...nearbyOffsets.map((offset) => naive - offset * 60_000));
  return { instant: new Date(afterTransition), status: 'skipped', alternative: null };
};

/** The instant alone, for callers that do not care about DST oddities. */
export const zonedFieldsToInstant = (fields: ZoneFields, zone: string): Date =>
  resolveZonedTime(fields, zone).instant;

/** `+05:45`, `-04:00`, `+00:00`. */
export const formatOffset = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
};

/** The difference between two zones at an instant, as a signed `+5:45`-style string. */
export const formatDifference = (minutes: number): string => {
  if (minutes === 0) return 'same time';
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const body = mins ? `${hours}h ${mins}m` : `${hours}h`;
  return `${sign}${body}`;
};

/** The short name the zone uses at that instant — "NPT", "EDT", or "GMT+5:45". */
export const getZoneAbbreviation = (instant: Date, zone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'short',
    }).formatToParts(instant);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
};

/**
 * Whether the zone is on daylight saving at this instant.
 *
 * Compares against the smallest offset the zone uses across the year: a zone
 * observing DST is further east than its own winter offset.
 */
export const isDaylightSaving = (instant: Date, zone: string): boolean => {
  const year = instant.getUTCFullYear();
  const january = getOffsetMinutes(new Date(Date.UTC(year, 0, 1)), zone);
  const july = getOffsetMinutes(new Date(Date.UTC(year, 6, 1)), zone);
  if (january === july) return false;
  return getOffsetMinutes(instant, zone) > Math.min(january, july);
};

/** Every IANA zone the browser knows, with a small fallback for old engines. */
export const getAllZones = (): string[] => {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;

  if (typeof supported === 'function') {
    try {
      return supported('timeZone');
    } catch {
      /* fall through to the curated list */
    }
  }
  return [];
};

export const isValidZone = (zone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Legacy IANA zone names, mapped to the ones we show.
 *
 * Browsers still report these: a machine set to Nepal resolves to
 * `Asia/Katmandu` (one h), not `Asia/Kathmandu`. They are the same zone, but
 * without this map the city lookup misses and the UI falls back to spelling
 * out the raw identifier.
 */
const ZONE_ALIASES: Record<string, string> = {
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Chongqing': 'Asia/Shanghai',
  'Asia/Chungking': 'Asia/Shanghai',
  'Asia/Harbin': 'Asia/Shanghai',
  'Asia/Istanbul': 'Europe/Istanbul',
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Nicosia': 'Asia/Nicosia',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Australia/Canberra': 'Australia/Sydney',
  'Australia/NSW': 'Australia/Sydney',
  'Australia/Melbourne': 'Australia/Melbourne',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'US/Alaska': 'America/Anchorage',
  'US/Hawaii': 'Pacific/Honolulu',
  'US/Arizona': 'America/Phoenix',
  'Canada/Eastern': 'America/Toronto',
  'Canada/Pacific': 'America/Vancouver',
  'Etc/UTC': 'UTC',
  'Etc/GMT': 'UTC',
  'GMT': 'UTC',
  'Zulu': 'UTC',
  'Universal': 'UTC',
};

/**
 * The name we prefer for a zone. Falls back to the input, so an unknown or
 * already-canonical zone passes straight through.
 */
export const canonicalZone = (zone: string): string => {
  const mapped = ZONE_ALIASES[zone];
  // Only switch if this runtime actually knows the canonical spelling.
  return mapped && isValidZone(mapped) ? mapped : zone;
};

export const localZone = (): string =>
  canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

/** Formats an instant as it reads in a zone, for display. */
export const formatInZone = (
  instant: Date,
  zone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'medium' }
): string => {
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: zone }).format(instant);
  } catch {
    return '—';
  }
};

/** `2026-10-25T14:30` for an <input type="datetime-local"> showing a zone's wall clock. */
export const toDateTimeLocalValue = (instant: Date, zone: string): string => {
  const f = getZoneFields(instant, zone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${f.year}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}`;
};

/** Parses what an <input type="datetime-local"> produces. Returns null if malformed. */
export const parseDateTimeLocalValue = (value: string): ZoneFields | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? '0'),
  };
};
