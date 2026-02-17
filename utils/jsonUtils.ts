import { FlatJSON, ParsedData, JsonStats } from '../types';

/**
 * Flattens a deeply nested JSON object or array of objects into a flat table structure.
 */
const flattenItem = (item: any, delimiter = '.'): FlatJSON => {
  const flattenedRow: FlatJSON = {};

  const recurse = (current: any, path: string = '') => {
    if (current === null) {
      flattenedRow[path] = null;
      return;
    }
    if (typeof current !== 'object') {
      flattenedRow[path] = current as string | number | boolean;
      return;
    }
    if (Array.isArray(current)) {
      if (current.length === 0) {
        flattenedRow[path] = "[]";
      } else {
        current.forEach((val, index) => {
          const newPath = path ? `${path}[${index}]` : `[${index}]`;
          recurse(val, newPath);
        });
      }
      return;
    }
    const keys = Object.keys(current);
    if (keys.length === 0) {
        flattenedRow[path] = "{}";
        return;
    }
    keys.forEach((key) => {
      const newPath = path ? `${path}${delimiter}${key}` : key;
      recurse(current[key], newPath);
    });
  };

  recurse(item);
  return flattenedRow;
};

export const parseAndFlattenJSON = (jsonInput: string | object): ParsedData => {
  let data: any;

  if (typeof jsonInput === 'string') {
    if (!jsonInput.trim()) throw new Error("Input is empty");
    data = JSON.parse(jsonInput);
  } else {
    data = jsonInput;
  }

  let dataArray: any[] = [];
  if (Array.isArray(data)) {
    dataArray = data;
  } else if (typeof data === 'object' && data !== null) {
    dataArray = [data];
  } else {
    throw new Error('Valid JSON must be an object or an array of objects.');
  }

  if (dataArray.length === 0) {
      return { headers: [], rows: [], originalSize: 0 };
  }

  const flatRows: FlatJSON[] = dataArray.map((row) => flattenItem(row));

  const headersSet = new Set<string>();
  flatRows.forEach((row) => {
    Object.keys(row).forEach((key) => headersSet.add(key));
  });
  
  const headers = Array.from(headersSet).sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const normalizedRows = flatRows.map(row => {
      const newRow: FlatJSON = {};
      headers.forEach(header => {
          newRow[header] = row[header] !== undefined ? row[header] : "";
      });
      return newRow;
  });

  return {
    headers,
    rows: normalizedRows,
    originalSize: dataArray.length
  };
};

// --- New Developer Tools Logic ---

export const getJsonStats = (data: any): JsonStats => {
  let keys = 0;
  let arrays = 0;
  let objects = 0;
  let maxDepth = 0;

  const traverse = (obj: any, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    if (Array.isArray(obj)) {
      arrays++;
      obj.forEach(item => traverse(item, depth + 1));
    } else if (typeof obj === 'object' && obj !== null) {
      objects++;
      const objKeys = Object.keys(obj);
      keys += objKeys.length;
      objKeys.forEach(key => traverse(obj[key], depth + 1));
    }
  };

  traverse(data, 0);

  const sizeBytes = new TextEncoder().encode(JSON.stringify(data)).length;
  const sizeString = sizeBytes > 1024 
    ? `${(sizeBytes / 1024).toFixed(2)} KB` 
    : `${sizeBytes} Bytes`;

  return {
    size: sizeString,
    keys,
    depth: maxDepth,
    arrays,
    objects
  };
};

export const fixJson = (input: string): string => {
  if (!input) return "";
  let fixed = input.trim();

  // 1. Fix "Smart Quotes" (curly quotes) from Word/Blogs to standard quotes
  fixed = fixed.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

  // 2. Remove comments (Block /* */ and Line //)
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, ""); 
  fixed = fixed.replace(/\/\/.*$/gm, ""); 

  // 3. Python/JS constants to JSON
  fixed = fixed.replace(/\bNone\b/g, "null");
  fixed = fixed.replace(/\bTrue\b/g, "true");
  fixed = fixed.replace(/\bFalse\b/g, "false");
  fixed = fixed.replace(/\bundefined\b/g, "null");

  // 4. MongoDB Types (ObjectId, ISODate) -> Strings
  // ObjectId("...") -> "..."
  fixed = fixed.replace(/ObjectId\s*\(\s*["']([^"']+)["']\s*\)/g, '"$1"');
  // ISODate("...") -> "..."
  fixed = fixed.replace(/ISODate\s*\(\s*["']([^"']+)["']\s*\)/g, '"$1"');

  // 5. Fix Quotes
  
  // Replace single quotes for Keys: 'key': -> "key":
  // Matches start of line or after { or , followed by 'key':
  fixed = fixed.replace(/(^|[{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
  
  // Replace unquoted keys: key: -> "key":
  // We match valid variable names followed by a colon
  fixed = fixed.replace(/(^|[{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

  // Replace single quotes for Values: : 'value' -> : "value"
  // Safe(r) regex: matches : '...' where ... does not contain unescaped '
  // and is followed by comma, closing brace, or closing bracket
  fixed = fixed.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(?=\s*[,}\]])/g, ': "$1"');

  // 6. Structural Fixes
  
  // Trailing commas: , } -> } and , ] -> ]
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // Missing commas between objects: } { -> }, {
  fixed = fixed.replace(/}\s*{/g, '}, {');
  
  // Missing commas between arrays: ] [ -> ], [
  fixed = fixed.replace(/]\s*\[/g, '], [');

  // Missing commas between properties (risky but useful for "dirty" logs)
  // e.g. "a": 1 "b": 2 -> "a": 1, "b": 2
  // We look for a value (number, bool, null, or string) followed by whitespace then a quote (start of next key)
  fixed = fixed.replace(/("[\s\S]*?"|true|false|null|-?\d+(?:\.\d+)?)\s+(?=")/g, '$1, ');

  return fixed;
};

export const unescapeString = (input: string): string => {
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === 'string') {
        return parsed;
    }
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return input.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
};

/**
 * Calculates line and column number from a string index.
 */
export const getErrorLocation = (json: string, position: number | undefined): { line: number; column: number } | null => {
  if (position === undefined || position < 0) return null;
  
  const textUpToError = json.substring(0, position);
  const lines = textUpToError.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  
  return { line, column };
};

/**
 * Analyzes a JSON parse error and provides a human-readable suggestion.
 */
export const analyzeJsonError = (error: Error, json: string): string | null => {
  if (!error || !error.message) return null;
  const msg = error.message;

  if (msg.includes("Unexpected token }") || msg.match(/Unexpected token .*} in JSON at position/)) {
    return "Trailing comma? Check for an extra comma before the closing brace/bracket.";
  }
  if (msg.includes("Unexpected token '") || msg.includes("Unexpected string")) {
    return "JSON standard requires double quotes (\") for keys and string values. Single quotes (') are not allowed.";
  }
  if (msg.includes("Expected property name or '}'")) {
    return "Property names (keys) must be enclosed in double quotes.";
  }
  if (msg.includes("Unexpected end of JSON input")) {
    return "The JSON input seems incomplete. Check for missing closing braces '}' or brackets ']'.";
  }
  
  // Try to be smart about position
  const match = msg.match(/at position (\d+)/);
  if (match && match[1]) {
      const pos = parseInt(match[1]);
      const char = json.charAt(pos);
      const prevChar = json.charAt(pos-1);
      
      if (char === '"' && prevChar !== ':' && prevChar !== '[' && prevChar !== ',') {
          return "Missing a comma or colon before this quote?";
      }
      if (char === ':') return "Colon used incorrectly. Ensure keys are quoted.";
  }

  return null;
};
