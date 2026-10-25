/**
 * JSON Schema inference and a small draft 2020-12 validator.
 *
 * The validator covers the keywords that actually appear in hand-written
 * schemas. It is not a certified implementation — `$ref`, `if/then/else` and
 * the format assertions are not evaluated — and the UI says so.
 */

type Json = unknown;

const typeOf = (value: Json): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value as number)) return 'integer';
  return typeof value;
};

const mergeTypes = (a: string, b: string): string | string[] => {
  if (a === b) return a;
  // integer is a subset of number
  if ((a === 'integer' && b === 'number') || (a === 'number' && b === 'integer')) return 'number';
  return [a, b].sort();
};

const unify = (left: Record<string, Json>, right: Record<string, Json>): Record<string, Json> => {
  if (JSON.stringify(left) === JSON.stringify(right)) return left;

  const leftType = left.type as string;
  const rightType = right.type as string;
  const merged = mergeTypes(leftType, rightType);

  if (Array.isArray(merged)) return { type: merged };

  if (merged === 'object') {
    const props: Record<string, Json> = { ...(left.properties as object) };
    const rightProps = (right.properties ?? {}) as Record<string, Record<string, Json>>;
    for (const [key, schema] of Object.entries(rightProps)) {
      props[key] = props[key] ? unify(props[key] as Record<string, Json>, schema) : schema;
    }
    const leftRequired = (left.required as string[]) ?? [];
    const rightRequired = (right.required as string[]) ?? [];
    const required = leftRequired.filter((key) => rightRequired.includes(key));
    return { type: 'object', properties: props, ...(required.length ? { required } : {}) };
  }

  if (merged === 'array') {
    const leftItems = left.items as Record<string, Json> | undefined;
    const rightItems = right.items as Record<string, Json> | undefined;
    if (!leftItems) return right;
    if (!rightItems) return left;
    return { type: 'array', items: unify(leftItems, rightItems) };
  }

  return { type: merged };
};

const FORMAT_HINTS: [RegExp, string][] = [
  [/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/, 'date-time'],
  [/^\d{4}-\d{2}-\d{2}$/, 'date'],
  [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'email'],
  [/^https?:\/\/\S+$/, 'uri'],
  [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'uuid'],
  [/^(\d{1,3}\.){3}\d{1,3}$/, 'ipv4'],
];

const detectFormat = (value: string): string | undefined =>
  FORMAT_HINTS.find(([pattern]) => pattern.test(value))?.[1];

export const inferSchema = (data: Json, { detectFormats = true } = {}): Record<string, Json> => {
  const build = (value: Json): Record<string, Json> => {
    const type = typeOf(value);

    if (type === 'object') {
      const entries = Object.entries(value as Record<string, Json>);
      return {
        type: 'object',
        properties: Object.fromEntries(entries.map(([key, val]) => [key, build(val)])),
        ...(entries.length ? { required: entries.map(([key]) => key) } : {}),
      };
    }

    if (type === 'array') {
      const items = value as Json[];
      if (!items.length) return { type: 'array' };
      const unified = items.map(build).reduce(unify);
      return { type: 'array', items: unified };
    }

    if (type === 'string' && detectFormats) {
      const format = detectFormat(value as string);
      return format ? { type: 'string', format } : { type: 'string' };
    }

    return { type };
  };

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...build(data),
  };
};

// --- Validation ---------------------------------------------------------------

export interface ValidationError {
  path: string;
  message: string;
}

const matchesType = (value: Json, expected: string): boolean => {
  switch (expected) {
    case 'null':
      return value === null;
    case 'array':
      return Array.isArray(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number';
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    default:
      return typeof value === expected;
  }
};

export const validate = (data: Json, schema: Record<string, Json>): ValidationError[] => {
  const errors: ValidationError[] = [];

  const walk = (value: Json, node: Record<string, Json>, path: string) => {
    if (typeof node !== 'object' || node === null) return;

    if (node.type !== undefined) {
      const expected = Array.isArray(node.type) ? (node.type as string[]) : [node.type as string];
      if (!expected.some((t) => matchesType(value, t))) {
        errors.push({
          path,
          message: `expected ${expected.join(' or ')}, got ${typeOf(value)}`,
        });
        return;
      }
    }

    if (Array.isArray(node.enum) && !node.enum.some((option) => JSON.stringify(option) === JSON.stringify(value))) {
      errors.push({ path, message: `must be one of ${JSON.stringify(node.enum)}` });
    }

    if (typeof value === 'string') {
      if (typeof node.minLength === 'number' && value.length < node.minLength) {
        errors.push({ path, message: `shorter than minLength ${node.minLength}` });
      }
      if (typeof node.maxLength === 'number' && value.length > node.maxLength) {
        errors.push({ path, message: `longer than maxLength ${node.maxLength}` });
      }
      if (typeof node.pattern === 'string') {
        try {
          if (!new RegExp(node.pattern).test(value)) {
            errors.push({ path, message: `does not match pattern ${node.pattern}` });
          }
        } catch {
          errors.push({ path, message: `schema has an invalid pattern: ${node.pattern}` });
        }
      }
    }

    if (typeof value === 'number') {
      if (typeof node.minimum === 'number' && value < node.minimum) {
        errors.push({ path, message: `below minimum ${node.minimum}` });
      }
      if (typeof node.maximum === 'number' && value > node.maximum) {
        errors.push({ path, message: `above maximum ${node.maximum}` });
      }
      if (typeof node.exclusiveMinimum === 'number' && value <= node.exclusiveMinimum) {
        errors.push({ path, message: `must be greater than ${node.exclusiveMinimum}` });
      }
      if (typeof node.exclusiveMaximum === 'number' && value >= node.exclusiveMaximum) {
        errors.push({ path, message: `must be less than ${node.exclusiveMaximum}` });
      }
      if (typeof node.multipleOf === 'number' && node.multipleOf > 0) {
        const quotient = value / node.multipleOf;
        if (Math.abs(quotient - Math.round(quotient)) > 1e-9) {
          errors.push({ path, message: `not a multiple of ${node.multipleOf}` });
        }
      }
    }

    if (Array.isArray(value)) {
      if (typeof node.minItems === 'number' && value.length < node.minItems) {
        errors.push({ path, message: `needs at least ${node.minItems} items` });
      }
      if (typeof node.maxItems === 'number' && value.length > node.maxItems) {
        errors.push({ path, message: `allows at most ${node.maxItems} items` });
      }
      if (node.uniqueItems === true) {
        const seen = new Set(value.map((item) => JSON.stringify(item)));
        if (seen.size !== value.length) errors.push({ path, message: 'items must be unique' });
      }
      if (node.items) {
        value.forEach((item, i) => walk(item, node.items as Record<string, Json>, `${path}[${i}]`));
      }
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, Json>;
      const properties = (node.properties ?? {}) as Record<string, Record<string, Json>>;

      for (const key of (node.required as string[]) ?? []) {
        if (!(key in obj)) errors.push({ path: `${path}.${key}`, message: 'required but missing' });
      }

      for (const [key, child] of Object.entries(obj)) {
        const childSchema = properties[key];
        if (childSchema) {
          walk(child, childSchema, `${path}.${key}`);
        } else if (node.additionalProperties === false) {
          errors.push({ path: `${path}.${key}`, message: 'not allowed (additionalProperties is false)' });
        }
      }
    }
  };

  walk(data, schema, '$');
  return errors;
};
