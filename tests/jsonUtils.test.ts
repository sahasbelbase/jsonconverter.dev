import { describe, expect, it } from 'vitest';
import { fixJson, getJsonStats, parseAndFlattenJSON, unescapeString } from '../utils/jsonUtils';

describe('parseAndFlattenJSON', () => {
  it('flattens nested objects into dotted columns', () => {
    const result = parseAndFlattenJSON('[{"user":{"address":{"city":"Pokhara"}}}]');
    expect(result.headers).toEqual(['user.address.city']);
    expect(result.rows[0]['user.address.city']).toBe('Pokhara');
  });

  it('indexes array members', () => {
    const result = parseAndFlattenJSON('[{"tags":["a","b"]}]');
    expect(result.headers).toEqual(['tags[0]', 'tags[1]']);
  });

  it('wraps a single object into one row', () => {
    const result = parseAndFlattenJSON('{"a":1}');
    expect(result.originalSize).toBe(1);
    expect(result.rows).toHaveLength(1);
  });

  it('gives every row the same columns, filling gaps with an empty string', () => {
    const result = parseAndFlattenJSON('[{"a":1},{"b":2}]');
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows[0]).toEqual({ a: 1, b: '' });
    expect(result.rows[1]).toEqual({ a: '', b: 2 });
  });

  it('keeps null distinct from missing', () => {
    const result = parseAndFlattenJSON('[{"a":null}]');
    expect(result.rows[0].a).toBeNull();
  });

  it('marks empty containers rather than dropping the column', () => {
    const result = parseAndFlattenJSON('[{"a":[],"b":{}}]');
    expect(result.rows[0]).toEqual({ a: '[]', b: '{}' });
  });

  it('sorts columns naturally, so [2] comes before [10]', () => {
    const result = parseAndFlattenJSON('[{"t":["a","b","c","d","e","f","g","h","i","j","k"]}]');
    expect(result.headers.indexOf('t[2]')).toBeLessThan(result.headers.indexOf('t[10]'));
  });

  it('returns an empty result for an empty array', () => {
    expect(parseAndFlattenJSON('[]')).toEqual({ headers: [], rows: [], originalSize: 0 });
  });

  it('rejects empty input and scalars', () => {
    expect(() => parseAndFlattenJSON('   ')).toThrow(/empty/i);
    expect(() => parseAndFlattenJSON('42')).toThrow(/object or an array/);
    expect(() => parseAndFlattenJSON('"text"')).toThrow(/object or an array/);
  });

  it('propagates a syntax error', () => {
    expect(() => parseAndFlattenJSON('{bad}')).toThrow();
  });
});

describe('getJsonStats', () => {
  it('counts keys, containers and depth', () => {
    const stats = getJsonStats({ a: 1, b: { c: 2 }, d: [1, 2] });
    expect(stats.keys).toBe(4);
    expect(stats.objects).toBe(2);
    expect(stats.arrays).toBe(1);
    expect(stats.depth).toBe(2);
  });

  it('reports size in bytes below 1 KB', () => {
    expect(getJsonStats({ a: 1 }).size).toBe('7 Bytes');
  });

  it('measures UTF-8 bytes, not characters', () => {
    // '🎉' is four bytes, and JSON.stringify adds two quotes.
    expect(getJsonStats('🎉').size).toBe('6 Bytes');
  });
});

describe('fixJson', () => {
  it('repairs trailing commas', () => {
    expect(JSON.parse(fixJson('{"a":1,}'))).toEqual({ a: 1 });
  });

  it('quotes bare keys', () => {
    expect(JSON.parse(fixJson('{a: 1}'))).toEqual({ a: 1 });
  });

  it('converts single quotes', () => {
    expect(JSON.parse(fixJson("{'a': 'b'}"))).toEqual({ a: 'b' });
  });

  it('converts smart quotes pasted from a document', () => {
    expect(JSON.parse(fixJson('{“a”: “b”}'))).toEqual({ a: 'b' });
  });

  it('converts Python literals', () => {
    expect(JSON.parse(fixJson('{"a": None, "b": True, "c": False}'))).toEqual({
      a: null,
      b: true,
      c: false,
    });
  });

  it('unwraps MongoDB constructors', () => {
    expect(JSON.parse(fixJson('{"_id": ObjectId("abc123"), "at": ISODate("2026-01-01")}'))).toEqual({
      _id: 'abc123',
      at: '2026-01-01',
    });
  });

  it('returns an empty string for empty input', () => {
    expect(fixJson('')).toBe('');
  });
});

describe('unescapeString', () => {
  it('unwraps a JSON-encoded string', () => {
    expect(unescapeString('"line\\nbreak"')).toBe('line\nbreak');
  });

  it('pretty-prints a document that is not a string', () => {
    expect(unescapeString('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it('falls back to a best effort on invalid input', () => {
    expect(unescapeString('he said \\"hi\\"')).toBe('he said "hi"');
  });
});
