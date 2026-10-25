import { describe, expect, it } from 'vitest';
import {
  formatXML,
  fromCSV,
  fromXML,
  fromYAML,
  minifyXML,
  toCSV,
  toProperties,
  toTOML,
  toXML,
  toYAML,
} from '../utils/formatUtils';

describe('toYAML', () => {
  // The previous emitter only quoted strings containing punctuation, so these
  // three came back from a round trip as a float, an int and a boolean.
  it('keeps numeric-looking strings as strings', () => {
    expect(fromYAML(toYAML({ version: '1.0' }))).toEqual({ version: '1.0' });
    expect(fromYAML(toYAML({ zip: '007' }))).toEqual({ zip: '007' });
  });

  it('keeps boolean-looking strings as strings', () => {
    for (const word of ['yes', 'no', 'true', 'false', 'on', 'off', 'null', '~']) {
      expect(fromYAML(toYAML({ answer: word }))).toEqual({ answer: word });
    }
  });

  it('round-trips a nested document without losing types', () => {
    const input = {
      name: 'checkout',
      version: '1.0',
      replicas: 3,
      enabled: true,
      missing: null,
      ports: [8080, 8443],
      tags: [] as string[],
      meta: {} as Record<string, unknown>,
      users: [
        { name: 'Ada', roles: ['admin'] },
        { name: 'Grace', roles: [] as string[] },
      ],
      tricky: 'key: value # not a comment',
    };
    expect(fromYAML(toYAML(input))).toEqual(input);
  });

  it('escapes keys that would otherwise break the document', () => {
    const input = { 'key: with colon': 1, 'key #with hash': 2 };
    expect(fromYAML(toYAML(input))).toEqual(input);
  });
});

describe('toXML', () => {
  it('produces parseable XML for a null value', () => {
    // The old emitter wrote xsi:nil="true" without declaring the namespace.
    const xml = toXML({ value: null });
    expect(xml).not.toContain('xsi:nil');
    expect(() => fromXML(xml)).not.toThrow();
  });

  it('rewrites keys that are not valid XML names', () => {
    const xml = toXML({ '2bad name': 'x', 'ok_key': 'y' });
    expect(() => fromXML(xml)).not.toThrow();
    expect(xml).toContain('_2bad_name');
  });

  it('escapes characters that would otherwise close a tag', () => {
    const xml = toXML({ note: '<script>alert("x") & more</script>' });
    const parsed = fromXML(xml) as { root: { note: string } };
    expect(parsed.root.note).toBe('<script>alert("x") & more</script>');
  });

  it('wraps a top-level array in a single root element', () => {
    const xml = toXML([{ a: 1 }, { a: 2 }]);
    expect(() => fromXML(xml)).not.toThrow();
  });
});

describe('toTOML', () => {
  it('never emits a bare "key =" for null', () => {
    const toml = toTOML({ present: 1, missing: null });
    expect(toml).not.toMatch(/^\s*missing\s*=\s*$/m);
    expect(toml).toContain('present = 1');
  });

  it('says which keys it had to drop', () => {
    expect(toTOML({ missing: null })).toContain('TOML has no null');
  });

  it('writes an empty array without stray spaces', () => {
    expect(toTOML({ tags: [] })).toContain('tags = []');
  });

  it('puts bare keys before any sub-table', () => {
    const toml = toTOML({ nested: { deep: 1 }, scalar: 'x' });
    expect(toml.indexOf('scalar =')).toBeLessThan(toml.indexOf('[nested]'));
  });

  it('keeps table paths absolute inside an array of tables', () => {
    const toml = toTOML({ servers: [{ name: 'a', opts: { port: 1 } }] });
    expect(toml).toContain('[[servers]]');
    expect(toml).toContain('[servers.opts]');
  });

  it('refuses a non-object at the top level', () => {
    expect(() => toTOML([1, 2, 3])).toThrow(/object at the top level/);
  });
});

describe('toProperties', () => {
  it('flattens nesting into dotted keys with indexes', () => {
    const output = toProperties({ a: { b: [1, 2] } });
    expect(output).toContain('a.b[0]=1');
    expect(output).toContain('a.b[1]=2');
  });

  it('escapes newlines so one value stays on one line', () => {
    expect(toProperties({ note: 'first\nsecond' })).toBe('note=first\\nsecond');
  });
});

describe('CSV', () => {
  it('round-trips values containing commas and quotes', () => {
    const rows = [
      { a: 1, b: 'x,y' },
      { a: 2, b: 'he said "hi"' },
    ];
    expect(fromCSV(toCSV(rows))).toEqual(rows);
  });

  it('rejects an array of non-objects', () => {
    expect(() => toCSV([1, 2, 3])).toThrow(/array of objects/);
  });
});

describe('fromXML', () => {
  it('reports the position of a malformed document', () => {
    expect(() => fromXML('<r><a></r>')).toThrow(/Line 1, column/);
  });

  it('reads attributes with an @ prefix', () => {
    expect(fromXML('<r><a id="1">hi</a></r>')).toEqual({
      r: { a: { '#text': 'hi', '@id': 1 } },
    });
  });
});

describe('fromYAML', () => {
  it('rejects an empty document rather than returning undefined', () => {
    expect(() => fromYAML('')).toThrow(/empty/);
  });
});

describe('formatXML', () => {
  it('indents one element per line', () => {
    expect(formatXML('<root><a><b>text</b></a><c/></root>')).toBe(
      '<root>\n  <a>\n    <b>text</b>\n  </a>\n  <c/>\n</root>'
    );
  });

  it('is reversed by minifyXML', () => {
    const source = '<root><a><b>text</b></a></root>';
    expect(minifyXML(formatXML(source))).toBe(source);
  });
});
