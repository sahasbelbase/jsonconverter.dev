import { describe, expect, it } from 'vitest';
import {
  formatDifference,
  formatOffset,
  getOffsetMinutes,
  getZoneAbbreviation,
  getZoneFields,
  isDaylightSaving,
  isValidZone,
  parseDateTimeLocalValue,
  toDateTimeLocalValue,
  canonicalZone,
  foldForSearch,
  resolveZonedTime,
  zonedFieldsToInstant,
} from '../utils/timezoneUtils';
import { CITIES, cityForZone } from '../lib/cities';

const utc = (iso: string) => new Date(iso);

describe('getOffsetMinutes', () => {
  it('handles the 45-minute offsets that break naive implementations', () => {
    // Nepal is UTC+5:45 all year.
    expect(getOffsetMinutes(utc('2026-01-15T00:00:00Z'), 'Asia/Kathmandu')).toBe(345);
    expect(getOffsetMinutes(utc('2026-07-15T00:00:00Z'), 'Asia/Kathmandu')).toBe(345);
    // Australia/Eucla is +8:45.
    expect(getOffsetMinutes(utc('2026-01-15T00:00:00Z'), 'Australia/Eucla')).toBe(525);
  });

  it('handles half-hour offsets', () => {
    expect(getOffsetMinutes(utc('2026-01-15T00:00:00Z'), 'Asia/Kolkata')).toBe(330);
    expect(getOffsetMinutes(utc('2026-01-15T00:00:00Z'), 'Asia/Tehran')).toBe(210);
  });

  it('is zero for UTC', () => {
    expect(getOffsetMinutes(utc('2026-06-15T12:00:00Z'), 'UTC')).toBe(0);
  });

  it('follows daylight saving', () => {
    // New York: EST (-5) in January, EDT (-4) in July.
    expect(getOffsetMinutes(utc('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-300);
    expect(getOffsetMinutes(utc('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(-240);
    // Southern hemisphere runs the other way round.
    expect(getOffsetMinutes(utc('2026-01-15T12:00:00Z'), 'Australia/Sydney')).toBe(660);
    expect(getOffsetMinutes(utc('2026-07-15T12:00:00Z'), 'Australia/Sydney')).toBe(600);
  });

  it('stays put for a zone that does not observe DST', () => {
    expect(getOffsetMinutes(utc('2026-01-15T12:00:00Z'), 'America/Phoenix')).toBe(-420);
    expect(getOffsetMinutes(utc('2026-07-15T12:00:00Z'), 'America/Phoenix')).toBe(-420);
  });
});

describe('getZoneFields', () => {
  it('reads the wall clock in the zone', () => {
    // 00:00 UTC is 05:45 the same day in Kathmandu.
    expect(getZoneFields(utc('2026-03-01T00:00:00Z'), 'Asia/Kathmandu')).toEqual({
      year: 2026,
      month: 3,
      day: 1,
      hour: 5,
      minute: 45,
      second: 0,
    });
  });

  it('reports midnight as hour 0, not 24', () => {
    // 18:15 UTC is exactly midnight in Kathmandu.
    const fields = getZoneFields(utc('2026-03-01T18:15:00Z'), 'Asia/Kathmandu');
    expect(fields.hour).toBe(0);
    expect(fields.day).toBe(2);
  });

  it('rolls the date backwards across the line', () => {
    // 02:00 UTC is still the previous evening in Los Angeles.
    const fields = getZoneFields(utc('2026-03-02T02:00:00Z'), 'America/Los_Angeles');
    expect(fields.day).toBe(1);
    expect(fields.hour).toBe(18);
  });
});

describe('zonedFieldsToInstant', () => {
  const at = (y: number, mo: number, d: number, h: number, mi: number) => ({
    year: y,
    month: mo,
    day: d,
    hour: h,
    minute: mi,
    second: 0,
  });

  it('converts a Kathmandu wall clock to the right instant', () => {
    // 15:00 in Kathmandu is 09:15 UTC.
    expect(zonedFieldsToInstant(at(2026, 3, 1, 15, 0), 'Asia/Kathmandu').toISOString()).toBe(
      '2026-03-01T09:15:00.000Z'
    );
  });

  it('round-trips through any zone', () => {
    for (const zone of ['Asia/Kathmandu', 'America/New_York', 'Australia/Sydney', 'UTC', 'Asia/Kolkata']) {
      const instant = utc('2026-06-15T10:30:00Z');
      const fields = getZoneFields(instant, zone);
      expect(zonedFieldsToInstant(fields, zone).toISOString()).toBe(instant.toISOString());
    }
  });

  it('is correct on both sides of a spring-forward transition', () => {
    // US DST begins 2026-03-08. 01:30 is EST (-5), 03:30 is EDT (-4).
    expect(zonedFieldsToInstant(at(2026, 3, 8, 1, 30), 'America/New_York').toISOString()).toBe(
      '2026-03-08T06:30:00.000Z'
    );
    expect(zonedFieldsToInstant(at(2026, 3, 8, 3, 30), 'America/New_York').toISOString()).toBe(
      '2026-03-08T07:30:00.000Z'
    );
  });

  it('still yields a usable instant for a time the clocks skipped', () => {
    // 02:30 never happens in New York on a spring-forward morning.
    const result = zonedFieldsToInstant(at(2026, 3, 8, 2, 30), 'America/New_York');
    expect(Number.isNaN(result.getTime())).toBe(false);
  });

  it('converts Kathmandu to UTC and back, the example from the request', () => {
    const ktm = at(2026, 10, 25, 17, 30);
    const instant = zonedFieldsToInstant(ktm, 'Asia/Kathmandu');
    expect(getZoneFields(instant, 'UTC')).toMatchObject({ hour: 11, minute: 45 });
  });
});

describe('resolveZonedTime', () => {
  const at = (y: number, mo: number, d: number, h: number, mi: number) => ({
    year: y,
    month: mo,
    day: d,
    hour: h,
    minute: mi,
    second: 0,
  });

  it('reports an ordinary time as exact', () => {
    const result = resolveZonedTime(at(2026, 6, 15, 10, 0), 'America/New_York');
    expect(result.status).toBe('exact');
    expect(result.alternative).toBeNull();
    expect(result.instant.toISOString()).toBe('2026-06-15T14:00:00.000Z');
  });

  it('reports every time as exact in a zone without DST', () => {
    for (const hour of [0, 1, 2, 3, 12, 23]) {
      expect(resolveZonedTime(at(2026, 3, 8, hour, 30), 'Asia/Kathmandu').status).toBe('exact');
    }
  });

  it('flags the hour the clocks skipped', () => {
    // 02:00-02:59 does not exist in New York on 8 March 2026.
    const result = resolveZonedTime(at(2026, 3, 8, 2, 30), 'America/New_York');
    expect(result.status).toBe('skipped');
    expect(Number.isNaN(result.instant.getTime())).toBe(false);
  });

  it('does not flag the hours either side of the gap', () => {
    expect(resolveZonedTime(at(2026, 3, 8, 1, 30), 'America/New_York').status).toBe('exact');
    expect(resolveZonedTime(at(2026, 3, 8, 3, 30), 'America/New_York').status).toBe('exact');
  });

  it('flags the hour that happened twice and offers both instants', () => {
    // 01:30 occurs twice in New York on 1 November 2026.
    const result = resolveZonedTime(at(2026, 11, 1, 1, 30), 'America/New_York');
    expect(result.status).toBe('ambiguous');
    expect(result.alternative).not.toBeNull();

    const both = [result.instant.toISOString(), result.alternative!.toISOString()].sort();
    expect(both).toEqual(['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  });

  it('puts the earlier of two ambiguous instants first', () => {
    const result = resolveZonedTime(at(2026, 11, 1, 1, 30), 'America/New_York');
    expect(result.instant.getTime()).toBeLessThan(result.alternative!.getTime());
  });
});

describe('formatOffset', () => {
  it.each([
    [0, '+00:00'],
    [345, '+05:45'],
    [330, '+05:30'],
    [-300, '-05:00'],
    [-210, '-03:30'],
    [825, '+13:45'],
  ])('formats %i as %s', (minutes, expected) => {
    expect(formatOffset(minutes)).toBe(expected);
  });
});

describe('formatDifference', () => {
  it('says so when there is no difference', () => {
    expect(formatDifference(0)).toBe('same time');
  });

  it('writes whole and partial hours', () => {
    expect(formatDifference(345)).toBe('+5h 45m');
    expect(formatDifference(-300)).toBe('-5h');
    expect(formatDifference(-210)).toBe('-3h 30m');
  });
});

describe('isDaylightSaving', () => {
  it('detects northern summer time', () => {
    expect(isDaylightSaving(utc('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(true);
    expect(isDaylightSaving(utc('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(false);
  });

  it('detects southern summer time', () => {
    expect(isDaylightSaving(utc('2026-01-15T12:00:00Z'), 'Australia/Sydney')).toBe(true);
    expect(isDaylightSaving(utc('2026-07-15T12:00:00Z'), 'Australia/Sydney')).toBe(false);
  });

  it('is always false where there is no DST', () => {
    expect(isDaylightSaving(utc('2026-07-15T12:00:00Z'), 'Asia/Kathmandu')).toBe(false);
    expect(isDaylightSaving(utc('2026-01-15T12:00:00Z'), 'Asia/Kathmandu')).toBe(false);
    expect(isDaylightSaving(utc('2026-07-15T12:00:00Z'), 'UTC')).toBe(false);
  });
});

describe('getZoneAbbreviation', () => {
  it('returns the short name in use at that moment', () => {
    expect(getZoneAbbreviation(utc('2026-01-15T12:00:00Z'), 'America/New_York')).toBe('EST');
    expect(getZoneAbbreviation(utc('2026-07-15T12:00:00Z'), 'America/New_York')).toBe('EDT');
  });
});

describe('datetime-local round trip', () => {
  it('formats and parses back to the same fields', () => {
    const instant = utc('2026-10-25T09:05:00Z');
    const value = toDateTimeLocalValue(instant, 'Asia/Kathmandu');
    expect(value).toBe('2026-10-25T14:50');
    expect(parseDateTimeLocalValue(value)).toEqual({
      year: 2026,
      month: 10,
      day: 25,
      hour: 14,
      minute: 50,
      second: 0,
    });
  });

  it('rejects malformed input', () => {
    expect(parseDateTimeLocalValue('')).toBeNull();
    expect(parseDateTimeLocalValue('2026-10-25')).toBeNull();
    expect(parseDateTimeLocalValue('nonsense')).toBeNull();
  });
});

describe('the city table', () => {
  it('only lists zones this runtime recognises', () => {
    const invalid = CITIES.filter((city) => !isValidZone(city.zone));
    expect(invalid).toEqual([]);
  });

  it('has no duplicate codes', () => {
    const codes = CITIES.map((city) => city.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('includes the cities named in the request', () => {
    const codes = CITIES.map((city) => city.code);
    expect(codes).toContain('KTM');
    expect(codes).toContain('UTC');
  });

  it('covers every continent', () => {
    const zones = CITIES.map((city) => city.zone);
    for (const region of ['Asia/', 'Europe/', 'Africa/', 'America/', 'Australia/', 'Pacific/', 'Atlantic/', 'Indian/']) {
      expect(zones.some((zone) => zone.startsWith(region))).toBe(true);
    }
  });

  it('covers the offsets whole-hour implementations get wrong', () => {
    const instant = new Date('2026-01-15T12:00:00Z');
    const offsets = new Set(CITIES.map((city) => getOffsetMinutes(instant, city.zone)));
    // 45-minute zones, half-hour zones, and the extremes either side of UTC.
    expect(offsets).toContain(345); // Kathmandu +5:45
    expect(offsets).toContain(525); // Eucla +8:45
    expect(offsets).toContain(825); // Chatham +13:45
    expect(offsets).toContain(840); // Kiritimati +14:00
    expect(offsets).toContain(330); // Kolkata +5:30
    expect(offsets).toContain(-210); // St John's -3:30
  });

  it('gives every city a name and a country', () => {
    for (const city of CITIES) {
      expect(city.name.trim()).not.toBe('');
      expect(city.country.trim()).not.toBe('');
    }
  });

  it('uses three-letter codes, where a city has one', () => {
    for (const city of CITIES) {
      if (city.code) expect(city.code).toMatch(/^[A-Z]{3}$/);
    }
  });
});


describe('canonicalZone', () => {
  it('maps the legacy spellings browsers still report', () => {
    // A machine set to Nepal resolves to Asia/Katmandu, with one h.
    expect(canonicalZone('Asia/Katmandu')).toBe('Asia/Kathmandu');
    expect(canonicalZone('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(canonicalZone('Europe/Kiev')).toBe('Europe/Kyiv');
    expect(canonicalZone('US/Pacific')).toBe('America/Los_Angeles');
    expect(canonicalZone('Etc/UTC')).toBe('UTC');
  });

  it('leaves a canonical or unknown zone alone', () => {
    expect(canonicalZone('Asia/Kathmandu')).toBe('Asia/Kathmandu');
    expect(canonicalZone('Mars/Olympus_Mons')).toBe('Mars/Olympus_Mons');
  });

  it('does not change the offset it resolves to', () => {
    const instant = new Date('2026-07-15T12:00:00Z');
    for (const alias of ['Asia/Katmandu', 'Asia/Calcutta', 'US/Pacific', 'Europe/Kiev']) {
      expect(getOffsetMinutes(instant, alias)).toBe(
        getOffsetMinutes(instant, canonicalZone(alias))
      );
    }
  });
});

describe('cityForZone', () => {
  it('finds the city for a canonical zone', () => {
    expect(cityForZone('Asia/Kathmandu')?.code).toBe('KTM');
  });

  it('finds the city through a legacy alias', () => {
    // This is what broke: the browser's own zone name missed the table.
    expect(cityForZone('Asia/Katmandu')?.code).toBe('KTM');
    expect(cityForZone('US/Pacific')?.code).toBe('LAX');
  });

  it('shows the first listed city when several share a zone', () => {
    // Delhi, Mumbai, Bengaluru and Kolkata are all Asia/Kolkata; the table's
    // first entry wins, and the alias resolves to the same place.
    expect(cityForZone('Asia/Kolkata')?.code).toBe('DEL');
    expect(cityForZone('Asia/Calcutta')?.code).toBe('DEL');
  });

  it('returns nothing for a zone with no city', () => {
    expect(cityForZone('Antarctica/Troll')).toBeUndefined();
  });
});


describe('foldForSearch', () => {
  it('strips the accents nobody types', () => {
    expect(foldForSearch('Málaga')).toBe('malaga');
    expect(foldForSearch('São Paulo')).toBe('sao paulo');
    expect(foldForSearch('Córdoba')).toBe('cordoba');
    expect(foldForSearch('Reykjavík')).toBe('reykjavik');
    expect(foldForSearch('Chișinău')).toBe('chisinau');
  });

  it('leaves unaccented text alone apart from case', () => {
    expect(foldForSearch('New York')).toBe('new york');
  });

  it('makes every accented city reachable by plain ASCII', () => {
    const accented = CITIES.filter((city) => /[^\x00-\x7F]/.test(city.name));
    expect(accented.length).toBeGreaterThan(5);
    for (const city of accented) {
      expect(foldForSearch(city.name)).toMatch(/^[\x00-\x7F]*$/);
    }
  });
});
