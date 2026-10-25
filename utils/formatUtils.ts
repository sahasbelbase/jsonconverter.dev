import yaml from 'js-yaml';
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import Papa from 'papaparse';

/**
 * Conversions between JSON and the formats people actually paste around.
 *
 * The hand-rolled emitters this file used to contain had three bugs that
 * silently corrupted data: YAML quoted strings only when they contained
 * punctuation (so "1.0" came back as a float and "yes" as a boolean), XML
 * emitted `xsi:nil` without declaring the namespace, and TOML wrote a bare
 * `key = ` for null. Proven libraries do the escaping now.
 */

export type TargetFormat = 'yaml' | 'xml' | 'toml' | 'csv' | 'properties';
export type SourceFormat = 'yaml' | 'xml' | 'csv';

// --- JSON out -----------------------------------------------------------------

export const toYAML = (data: unknown): string =>
  yaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    // Quote anything that would otherwise be re-read as a number or boolean.
    quotingType: '"',
  });

export const toXML = (data: unknown, rootName = 'root'): string => {
  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    ignoreAttributes: false,
    suppressEmptyNode: true,
    // Keys that are not valid XML names would produce unparseable output.
    processEntities: true,
  });

  const sanitizeKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sanitizeKeys);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => {
          let safe = key.replace(/[^A-Za-z0-9_.\-]/g, '_');
          if (!/^[A-Za-z_]/.test(safe)) safe = `_${safe}`;
          return [safe, sanitizeKeys(val)];
        })
      );
    }
    // null has no natural XML form; an empty element is the least surprising.
    return value === null ? '' : value;
  };

  const body = builder.build({ [rootName]: sanitizeKeys(data) });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`.trimEnd();
};

const tomlValue = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'nan';
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(String(value));
};

const isPrimitive = (value: unknown): boolean =>
  value === null || (typeof value !== 'object' && !Array.isArray(value));

export const toTOML = (data: unknown): string => {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('TOML needs an object at the top level.');
  }

  const skipped: string[] = [];

  const emit = (obj: Record<string, unknown>, path: string): string[] => {
    const lines: string[] = [];
    const entries = Object.entries(obj);

    // TOML requires every bare key/value pair to come before any sub-table.
    for (const [key, value] of entries) {
      const fullKey = path ? `${path}.${key}` : key;
      if (value === null || value === undefined) {
        // TOML has no null. Dropping the key is the only valid choice, so say so.
        skipped.push(fullKey);
        continue;
      }
      if (isPrimitive(value)) {
        lines.push(`${key} = ${tomlValue(value)}`);
      } else if (Array.isArray(value) && value.every((item) => isPrimitive(item) && item !== null)) {
        lines.push(value.length ? `${key} = [ ${value.map(tomlValue).join(', ')} ]` : `${key} = []`);
      }
    }

    for (const [key, value] of entries) {
      const fullKey = path ? `${path}.${key}` : key;
      if (value === null || value === undefined || isPrimitive(value)) continue;

      if (Array.isArray(value)) {
        if (value.every((item) => isPrimitive(item) && item !== null)) continue;
        for (const item of value) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            lines.push('', `[[${fullKey}]]`);
            // Nested paths stay absolute, which is what TOML requires.
            lines.push(...emit(item as Record<string, unknown>, fullKey));
          } else {
            skipped.push(`${fullKey}[]`);
          }
        }
      } else {
        lines.push('', `[${fullKey}]`);
        lines.push(...emit(value as Record<string, unknown>, fullKey));
      }
    }

    return lines;
  };

  const body = emit(data as Record<string, unknown>, '').join('\n').trim();
  if (!skipped.length) return body;

  const unique = Array.from(new Set(skipped));
  const note = `# TOML has no null. These keys were omitted: ${unique.join(', ')}\n`;
  return note + body;
};

export const toProperties = (data: unknown): string => {
  const lines: string[] = [];

  const escape = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

  const walk = (value: unknown, prefix: string) => {
    if (value === null) {
      lines.push(`${prefix}=`);
      return;
    }
    if (typeof value !== 'object') {
      lines.push(`${prefix}=${escape(String(value))}`);
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) lines.push(`${prefix}=`);
      value.forEach((item, i) => walk(item, `${prefix}[${i}]`));
      return;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      lines.push(`${prefix}=`);
      return;
    }
    entries.forEach(([key, val]) => walk(val, prefix ? `${prefix}.${key}` : key));
  };

  walk(data, '');
  return lines.join('\n');
};

export const toCSV = (data: unknown): string => {
  const rows = Array.isArray(data) ? data : [data];
  if (!rows.length) return '';
  if (!rows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('CSV needs an array of objects (or a single object).');
  }
  return Papa.unparse(rows as object[], { newline: '\n' });
};

// --- JSON in ------------------------------------------------------------------

export const fromYAML = (text: string): unknown => {
  const parsed = yaml.load(text, { json: true });
  if (parsed === undefined) throw new Error('That YAML is empty.');
  return parsed;
};

export const fromXML = (text: string): unknown => {
  const validation = XMLValidator.validate(text, { allowBooleanAttributes: true });
  if (validation !== true) {
    const { line, col, msg } = validation.err;
    throw new Error(`Line ${line}, column ${col}: ${msg}`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseAttributeValue: true,
    trimValues: true,
    textNodeName: '#text',
  });
  return parser.parse(text);
};

export const fromCSV = (text: string): unknown => {
  const result = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length) {
    const first = result.errors[0];
    throw new Error(`Row ${(first.row ?? 0) + 1}: ${first.message}`);
  }
  return result.data;
};

// --- HTML / XML text helpers ---------------------------------------------------

export const minifyHTML = (html: string): string =>
  html
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();

/**
 * Indents XML one element per line.
 *
 * Splitting on `><` is safe here because the content between a `>` and a `<`
 * is either whitespace (which we are reformatting anyway) or a text node, which
 * is kept on the line of its own element.
 */
export const formatXML = (xml: string, indent = '  '): string => {
  const normalized = xml.replace(/\r\n/g, '\n').replace(/>\s*</g, '>\n<').trim();
  const lines = normalized.split('\n');
  let depth = 0;
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isClosing = /^<\//.test(trimmed);
    const isSelfClosing = /\/>$/.test(trimmed);
    const isDeclaration = /^<[?!]/.test(trimmed);
    const hasInlineClose = /^<[^/][^>]*>.*<\/[^>]+>$/.test(trimmed);

    if (isClosing) depth = Math.max(0, depth - 1);
    out.push(indent.repeat(depth) + trimmed);
    if (!isClosing && !isSelfClosing && !isDeclaration && !hasInlineClose) depth++;
  }

  return out.join('\n');
};

export const minifyXML = (xml: string): string =>
  xml.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
