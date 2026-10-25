import { describe, expect, it } from 'vitest';
import { inspectUuid, ulid, uuidNil, uuidV4, uuidV7 } from '../utils/idUtils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('uuidV4', () => {
  it('has the right shape, version and variant', () => {
    const id = uuidV4();
    expect(id).toMatch(UUID_RE);
    expect(id[14]).toBe('4');
    expect('89ab').toContain(id[19].toLowerCase());
  });

  it('does not repeat across many draws', () => {
    const ids = new Set(Array.from({ length: 2000 }, uuidV4));
    expect(ids.size).toBe(2000);
  });
});

describe('uuidV7', () => {
  it('has the right version and variant', () => {
    const id = uuidV7();
    expect(id).toMatch(UUID_RE);
    expect(id[14]).toBe('7');
    expect('89ab').toContain(id[19].toLowerCase());
  });

  it('encodes a timestamp close to now', () => {
    const before = Date.now();
    const info = inspectUuid(uuidV7());
    expect(info.timestamp).not.toBeNull();
    expect(Math.abs(info.timestamp!.getTime() - before)).toBeLessThan(2000);
  });

  it('sorts in creation order', async () => {
    const first = uuidV7();
    await new Promise((r) => setTimeout(r, 5));
    const second = uuidV7();
    expect(first < second).toBe(true);
  });
});

describe('ulid', () => {
  it('is 26 characters of Crockford base32', () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('sorts in creation order', async () => {
    const first = ulid();
    await new Promise((r) => setTimeout(r, 5));
    expect(first < ulid()).toBe(true);
  });
});

describe('inspectUuid', () => {
  it('recognises the nil UUID', () => {
    const info = inspectUuid(uuidNil());
    expect(info.valid).toBe(true);
    expect(info.variant).toBe('nil');
  });

  it('reads a v1 timestamp', () => {
    // A well-known v1 UUID generated on 2011-11-01.
    const info = inspectUuid('f81d4fae-7dec-11d0-a765-00a0c91e6bf6');
    expect(info.version).toBe(1);
    expect(info.variant).toBe('RFC 4122');
    expect(info.timestamp?.getUTCFullYear()).toBe(1997);
  });

  it('accepts braces and a urn prefix', () => {
    expect(inspectUuid('{f81d4fae-7dec-11d0-a765-00a0c91e6bf6}').valid).toBe(true);
    expect(inspectUuid('urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6').valid).toBe(true);
  });

  it('rejects anything that is not a UUID', () => {
    for (const bad of ['', 'hello', '123', 'f81d4fae7dec11d0a76500a0c91e6bf6']) {
      expect(inspectUuid(bad).valid).toBe(false);
    }
  });

  it('reports no timestamp for v4', () => {
    expect(inspectUuid(uuidV4()).timestamp).toBeNull();
  });
});
