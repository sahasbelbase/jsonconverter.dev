/**
 * Base64 helpers that are correct for non-ASCII text.
 *
 * `btoa` only accepts code points 0-255, so `btoa("café")` throws. Encoding the
 * string to UTF-8 bytes first is what makes emoji and accents survive a
 * round-trip.
 */

const toBinaryString = (bytes: Uint8Array): string => {
  // Chunked so a large file does not blow the argument limit of String.fromCharCode.
  const CHUNK = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return out;
};

export const bytesToBase64 = (bytes: Uint8Array, urlSafe = false): string => {
  const base64 = btoa(toBinaryString(bytes));
  return urlSafe ? base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : base64;
};

export const base64ToBytes = (input: string): Uint8Array => {
  // Accept both standard and URL-safe alphabets, with or without padding.
  let normalized = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  if (remainder === 1) throw new Error('Not valid Base64: the length is impossible.');
  if (remainder) normalized += '='.repeat(4 - remainder);

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const encodeBase64 = (text: string, urlSafe = false): string =>
  bytesToBase64(new TextEncoder().encode(text), urlSafe);

export const decodeBase64 = (base64: string): string => {
  const bytes = base64ToBytes(base64);
  // `fatal` makes an invalid byte sequence throw instead of silently producing
  // replacement characters, so the user is told the input was not UTF-8 text.
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

export const isProbablyBase64 = (value: string): boolean => {
  const trimmed = value.trim().replace(/\s+/g, '');
  return trimmed.length > 0 && trimmed.length % 4 !== 1 && /^[A-Za-z0-9+/\-_]+={0,2}$/.test(trimmed);
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
