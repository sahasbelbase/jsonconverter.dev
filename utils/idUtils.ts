/**
 * UUID and ULID generation, using crypto.getRandomValues for every random bit.
 */

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const formatUuid = (bytes: Uint8Array) => {
  const h = hex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export const uuidV4 = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return formatUuid(bytes);
};

/**
 * UUID v7: a 48-bit millisecond timestamp followed by random bits, so ids sort
 * in creation order. That makes them far kinder to a database index than v4.
 */
export const uuidV7 = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const now = BigInt(Date.now());

  for (let i = 0; i < 6; i++) {
    bytes[i] = Number((now >> BigInt(8 * (5 - i))) & 0xffn);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return formatUuid(bytes);
};

export const uuidNil = (): string => '00000000-0000-0000-0000-000000000000';

// Crockford base32, as the ULID spec defines it.
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const ulid = (): string => {
  let timestamp = Date.now();
  let time = '';
  for (let i = 0; i < 10; i++) {
    time = ULID_ALPHABET[timestamp % 32] + time;
    timestamp = Math.floor(timestamp / 32);
  }

  const random = crypto.getRandomValues(new Uint8Array(16));
  let randomness = '';
  for (let i = 0; i < 16; i++) randomness += ULID_ALPHABET[random[i] % 32];

  return time + randomness;
};

export interface UuidInfo {
  valid: boolean;
  version: number | null;
  variant: string;
  timestamp: Date | null;
  note: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const inspectUuid = (value: string): UuidInfo => {
  const trimmed = value.trim().replace(/^urn:uuid:/i, '').replace(/[{}]/g, '');
  if (!UUID_RE.test(trimmed)) {
    return { valid: false, version: null, variant: '—', timestamp: null, note: 'Not a UUID.' };
  }

  const plain = trimmed.replace(/-/g, '').toLowerCase();
  if (plain === '0'.repeat(32)) {
    return { valid: true, version: null, variant: 'nil', timestamp: null, note: 'The nil UUID.' };
  }

  const version = parseInt(plain[12], 16);
  const variantNibble = parseInt(plain[16], 16);
  const variant =
    variantNibble >= 0x8 && variantNibble <= 0xb
      ? 'RFC 4122'
      : variantNibble >= 0xc && variantNibble <= 0xd
        ? 'Microsoft (reserved)'
        : variantNibble <= 0x7
          ? 'NCS (reserved)'
          : 'reserved';

  let timestamp: Date | null = null;
  let note = '';

  switch (version) {
    case 1: {
      // 60-bit count of 100ns intervals since 1582-10-15.
      const timeHex = plain.slice(13, 16) + plain.slice(8, 12) + plain.slice(0, 8);
      const intervals = BigInt('0x' + timeHex);
      const GREGORIAN_OFFSET_MS = 12219292800000n;
      timestamp = new Date(Number(intervals / 10000n - GREGORIAN_OFFSET_MS));
      note = 'Time-based (v1). Encodes the generating machine’s MAC address.';
      break;
    }
    case 4:
      note = 'Random (v4). 122 random bits, no embedded time.';
      break;
    case 7:
      timestamp = new Date(Number(BigInt('0x' + plain.slice(0, 12))));
      note = 'Time-ordered (v7). Sorts by creation time, which indexes well.';
      break;
    case 3:
      note = 'Name-based, MD5 (v3).';
      break;
    case 5:
      note = 'Name-based, SHA-1 (v5).';
      break;
    default:
      note = `Version ${version}.`;
  }

  return { valid: true, version, variant, timestamp, note };
};
