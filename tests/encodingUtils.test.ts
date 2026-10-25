import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  decodeBase64,
  encodeBase64,
  formatBytes,
  isProbablyBase64,
} from '../utils/encodingUtils';

describe('encodeBase64 / decodeBase64', () => {
  it('round-trips plain ASCII', () => {
    expect(decodeBase64(encodeBase64('hello world'))).toBe('hello world');
  });

  it('round-trips text btoa alone cannot handle', () => {
    // btoa('café') throws: it only accepts code points 0-255.
    for (const input of ['café', '🎉 emoji', 'ünïcödé', '日本語', 'a\u0000b']) {
      expect(decodeBase64(encodeBase64(input))).toBe(input);
    }
  });

  it('matches the reference encoding', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=');
    expect(encodeBase64('café')).toBe('Y2Fmw6k=');
  });

  it('produces URL-safe output without padding', () => {
    const urlSafe = encodeBase64('subjects?_d=1ÿþ', true);
    expect(urlSafe).not.toMatch(/[+/=]/);
    expect(decodeBase64(urlSafe)).toBe('subjects?_d=1ÿþ');
  });

  it('decodes both alphabets, padded or not', () => {
    const standard = encodeBase64('hello world!?');
    const urlSafe = encodeBase64('hello world!?', true);
    expect(decodeBase64(standard)).toBe('hello world!?');
    expect(decodeBase64(urlSafe)).toBe('hello world!?');
    expect(decodeBase64(standard.replace(/=+$/, ''))).toBe('hello world!?');
  });

  it('ignores whitespace inside the input', () => {
    expect(decodeBase64('aGVs\nbG8 =')).toBe('hello');
  });

  it('rejects a length that cannot be Base64', () => {
    expect(() => base64ToBytes('abcde')).toThrow(/length is impossible/);
  });

  it('rejects bytes that are not valid UTF-8 rather than returning U+FFFD', () => {
    const invalid = bytesToBase64(new Uint8Array([0xff, 0xfe, 0xfd]));
    expect(() => decodeBase64(invalid)).toThrow();
  });
});

describe('bytesToBase64', () => {
  it('handles a payload larger than the argument limit of fromCharCode', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => i % 256);
    const encoded = bytesToBase64(bytes);
    expect(base64ToBytes(encoded)).toEqual(bytes);
  });

  it('round-trips an empty array', () => {
    expect(base64ToBytes(bytesToBase64(new Uint8Array()))).toEqual(new Uint8Array());
  });
});

describe('isProbablyBase64', () => {
  it('spots encoded input', () => {
    expect(isProbablyBase64('aGVsbG8gd29ybGQ=')).toBe(true);
  });

  it('does not flag ordinary prose or an empty string', () => {
    expect(isProbablyBase64('hello world!')).toBe(false);
    expect(isProbablyBase64('   ')).toBe(false);
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.00 KB'],
    [1536, '1.50 KB'],
    [1048576, '1.00 MB'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});
