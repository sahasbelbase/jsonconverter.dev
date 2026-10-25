import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { hashBytes, hashText, hashesMatch, md5 } from '../utils/hashUtils';

const encode = (text: string) => new TextEncoder().encode(text);
const nodeHash = (algo: string, text: string) =>
  createHash(algo).update(Buffer.from(encode(text))).digest('hex');

describe('md5', () => {
  // RFC 1321 test suite.
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
  ])('matches the published digest for %j', (input, expected) => {
    expect(md5(encode(input))).toBe(expected);
  });

  // The padding rule changes behaviour around each 64-byte block boundary,
  // which is where a hand-written MD5 usually breaks.
  it.each([54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128])(
    'matches node:crypto at length %i',
    (length) => {
      const input = 'x'.repeat(length);
      expect(md5(encode(input))).toBe(nodeHash('md5', input));
    }
  );

  it('handles multi-byte characters', () => {
    const input = 'café 🎉 ünïcödé';
    expect(md5(encode(input))).toBe(nodeHash('md5', input));
  });
});

describe('hashText', () => {
  it.each(['sha1', 'sha256', 'sha384', 'sha512'])('%s matches node:crypto', async (algo) => {
    const input = 'The quick brown fox jumps over the lazy dog';
    const label = algo.replace('sha', 'SHA-') as 'SHA-1';
    expect(await hashText(input, label)).toBe(nodeHash(algo, input));
  });

  it('routes MD5 away from Web Crypto, which does not implement it', async () => {
    expect(await hashText('abc', 'MD5')).toBe('900150983cd24fb0d6963f7d28e17f72');
  });
});

describe('hashBytes', () => {
  it('hashes the requested range of a subarray, not the whole buffer', async () => {
    const full = encode('PREFIXabcSUFFIX');
    const slice = full.subarray(6, 9);
    expect(new TextDecoder().decode(slice)).toBe('abc');
    expect(await hashBytes(slice, 'SHA-256')).toBe(nodeHash('sha256', 'abc'));
  });
});

describe('hashesMatch', () => {
  it('ignores case and surrounding space', () => {
    expect(hashesMatch('  ABC123  ', 'abc123')).toBe(true);
  });

  it('rejects empty, differing and different-length values', () => {
    expect(hashesMatch('', 'abc')).toBe(false);
    expect(hashesMatch('abc', '')).toBe(false);
    expect(hashesMatch('abc', 'abd')).toBe(false);
    expect(hashesMatch('abc', 'abcd')).toBe(false);
  });
});
