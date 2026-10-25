import { describe, expect, it } from 'vitest';
import { inferSchema, validate } from '../utils/schemaUtils';

describe('inferSchema', () => {
  it('describes a flat object', () => {
    expect(inferSchema({ name: 'Ada', age: 36, active: true })).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        active: { type: 'boolean' },
      },
      required: ['name', 'age', 'active'],
    });
  });

  it('detects common string formats', () => {
    const schema = inferSchema({
      id: '6f1b8d9e-2c3a-4f5b-9a7c-1d2e3f4a5b6c',
      email: 'ada@example.com',
      at: '2026-03-01T09:30:00Z',
      day: '2026-03-01',
      site: 'https://example.com/x',
      ip: '10.0.0.1',
    }) as { properties: Record<string, { format?: string }> };

    expect(schema.properties.id.format).toBe('uuid');
    expect(schema.properties.email.format).toBe('email');
    expect(schema.properties.at.format).toBe('date-time');
    expect(schema.properties.day.format).toBe('date');
    expect(schema.properties.site.format).toBe('uri');
    expect(schema.properties.ip.format).toBe('ipv4');
  });

  it('can be told not to detect formats', () => {
    const schema = inferSchema({ email: 'a@b.co' }, { detectFormats: false }) as {
      properties: Record<string, { format?: string }>;
    };
    expect(schema.properties.email.format).toBeUndefined();
  });

  it('widens integer and number into number', () => {
    const schema = inferSchema([1, 2.5]) as { items: { type: string } };
    expect(schema.items.type).toBe('number');
  });

  it('keeps only the keys present in every array item as required', () => {
    const schema = inferSchema([{ a: 1, b: 2 }, { a: 3 }]) as {
      items: { required?: string[]; properties: Record<string, unknown> };
    };
    expect(schema.items.required).toEqual(['a']);
    expect(Object.keys(schema.items.properties).sort()).toEqual(['a', 'b']);
  });

  it('falls back to a type union for genuinely mixed items', () => {
    const schema = inferSchema(['a', 1]) as { items: { type: string[] } };
    expect(schema.items.type).toEqual(['integer', 'string']);
  });

  it('omits items for an empty array', () => {
    expect(inferSchema([])).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'array',
    });
  });
});

describe('validate', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 10 },
      age: { type: 'integer', minimum: 0, maximum: 150 },
      role: { enum: ['admin', 'user'] },
      tags: { type: 'array', uniqueItems: true, minItems: 1, items: { type: 'string' } },
    },
    required: ['name', 'age'],
    additionalProperties: false,
  };

  it('accepts a valid document', () => {
    expect(validate({ name: 'Ada', age: 36, role: 'admin', tags: ['x'] }, schema)).toEqual([]);
  });

  it('reports a missing required key with its path', () => {
    expect(validate({ name: 'Ada' }, schema)).toEqual([
      { path: '$.age', message: 'required but missing' },
    ]);
  });

  it('reports a wrong type', () => {
    const errors = validate({ name: 'Ada', age: 'old' }, schema);
    expect(errors).toContainEqual({ path: '$.age', message: 'expected integer, got string' });
  });

  it('separates integer from number', () => {
    const errors = validate({ name: 'Ada', age: 1.5 }, schema);
    expect(errors).toContainEqual({ path: '$.age', message: 'expected integer, got number' });
  });

  it('enforces string length and numeric bounds', () => {
    const errors = validate({ name: 'A', age: 200 }, schema);
    expect(errors).toContainEqual({ path: '$.name', message: 'shorter than minLength 2' });
    expect(errors).toContainEqual({ path: '$.age', message: 'above maximum 150' });
  });

  it('enforces enum, uniqueItems and minItems', () => {
    const errors = validate({ name: 'Ada', age: 1, role: 'ghost', tags: ['x', 'x'] }, schema);
    expect(errors.map((e) => e.message)).toEqual(
      expect.arrayContaining([
        'must be one of ["admin","user"]',
        'items must be unique',
      ])
    );
    expect(validate({ name: 'Ada', age: 1, tags: [] }, schema)).toContainEqual({
      path: '$.tags',
      message: 'needs at least 1 items',
    });
  });

  it('rejects an unexpected key when additionalProperties is false', () => {
    expect(validate({ name: 'Ada', age: 1, extra: true }, schema)).toContainEqual({
      path: '$.extra',
      message: 'not allowed (additionalProperties is false)',
    });
  });

  it('descends into array items with an indexed path', () => {
    expect(validate({ name: 'Ada', age: 1, tags: ['ok', 2] }, schema)).toContainEqual({
      path: '$.tags[1]',
      message: 'expected string, got integer',
    });
  });

  it('treats null as its own type, not as an object', () => {
    expect(validate(null, { type: 'object' })).toEqual([
      { path: '$', message: 'expected object, got null' },
    ]);
  });

  it('treats an array as an array, not an object', () => {
    expect(validate([], { type: 'object' })).toEqual([
      { path: '$', message: 'expected object, got array' },
    ]);
  });

  it('reports a broken pattern in the schema instead of throwing', () => {
    expect(validate('x', { type: 'string', pattern: '[' })).toEqual([
      { path: '$', message: 'schema has an invalid pattern: [' },
    ]);
  });

  it('checks multipleOf without tripping on floating point', () => {
    expect(validate(0.3, { multipleOf: 0.1 })).toEqual([]);
    expect(validate(0.35, { multipleOf: 0.1 })).toContainEqual({
      path: '$',
      message: 'not a multiple of 0.1',
    });
  });

  it('accepts a type union', () => {
    expect(validate(null, { type: ['string', 'null'] })).toEqual([]);
  });
});
