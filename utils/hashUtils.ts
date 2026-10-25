/**
 * Hashing via the Web Crypto API, plus a small MD5 implementation.
 *
 * MD5 is not available in Web Crypto (deliberately — it is broken for anything
 * security-related), but it is still what most file checksums and legacy APIs
 * publish, so it is here with a warning attached in the UI.
 */

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

/** Algorithms that are no longer collision-resistant. */
export const INSECURE: HashAlgorithm[] = ['MD5', 'SHA-1'];

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

// --- MD5 (RFC 1321) ---------------------------------------------------------

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));

export const md5 = (bytes: Uint8Array): string => {
  const originalBitLength = BigInt(bytes.length) * 8n;

  // Pad to 56 mod 64, then append the length as a 64-bit little-endian integer.
  const paddedLength = (((bytes.length + 8) >>> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Number(originalBitLength & 0xffffffffn), true);
  view.setUint32(paddedLength - 4, Number((originalBitLength >> 32n) & 0xffffffffn), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    const M = new Array<number>(16);
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(chunk + i * 4, true);

    let [A, B, C, D] = [a0, b0, c0, d0];

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new DataView(new ArrayBuffer(16));
  out.setUint32(0, a0, true);
  out.setUint32(4, b0, true);
  out.setUint32(8, c0, true);
  out.setUint32(12, d0, true);
  return toHex(out.buffer);
};

// ----------------------------------------------------------------------------

export const hashBytes = async (bytes: Uint8Array, algorithm: HashAlgorithm): Promise<string> => {
  if (algorithm === 'MD5') return md5(bytes);
  // Pass a fresh ArrayBuffer so a subarray view never hashes the wrong range.
  const digest = await crypto.subtle.digest(algorithm, bytes.slice().buffer);
  return toHex(digest);
};

export const hashText = (text: string, algorithm: HashAlgorithm): Promise<string> =>
  hashBytes(new TextEncoder().encode(text), algorithm);

/** Constant-time-ish comparison, case-insensitive, for the "expected hash" field. */
export const hashesMatch = (a: string, b: string): boolean => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
};
