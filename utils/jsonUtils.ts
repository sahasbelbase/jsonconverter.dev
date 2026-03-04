import { FlatJSON, ParsedData, JsonStats } from '../types';
import { jsonrepair } from 'jsonrepair';

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

  // 2. Python/JS constants to JSON
  fixed = fixed.replace(/\bNone\b/g, "null");
  fixed = fixed.replace(/\bTrue\b/g, "true");
  fixed = fixed.replace(/\bFalse\b/g, "false");
  fixed = fixed.replace(/\bundefined\b/g, "null");

  // 3. MongoDB Types (ObjectId, ISODate) -> Strings
  // ObjectId("...") -> "..."
  fixed = fixed.replace(/ObjectId\s*\(\s*["']([^"']+)["']\s*\)/g, '"$1"');
  // ISODate("...") -> "..."
  fixed = fixed.replace(/ISODate\s*\(\s*["']([^"']+)["']\s*\)/g, '"$1"');

  try {
    // 4. Use jsonrepair to fix missing brackets, trailing commas, unquoted keys, etc.
    fixed = jsonrepair(fixed);
  } catch (err) {
    // If jsonrepair fails, fallback to basic regex fixes
    fixed = fixed.replace(/(^|[{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
    fixed = fixed.replace(/(^|[{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
    fixed = fixed.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(?=\s*[,}\]])/g, ': "$1"');
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    fixed = fixed.replace(/}\s*{/g, '}, {');
    fixed = fixed.replace(/]\s*\[/g, '], [');
    fixed = fixed.replace(/("[\s\S]*?"|true|false|null|-?\d+(?:\.\d+)?)\s+(?=")/g, '$1, ');
  }

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

  // 1. Trailing Commas
  if (msg.includes("Unexpected token }") || msg.match(/Unexpected token .*} in JSON at position/)) {
    return "Trailing comma? Check for an extra comma before the closing brace '}'.";
  }
  if (msg.includes("Unexpected token ]") || msg.match(/Unexpected token .*] in JSON at position/)) {
    return "Trailing comma? Check for an extra comma before the closing bracket ']'.";
  }

  // 2. Quotes Issues
  if (msg.includes("Unexpected token '") || msg.includes("Unexpected string") || msg.includes("Expected property name or '}'")) {
    // Check if single quotes are used
    if (json.includes("'")) {
       return "JSON requires double quotes (\") for keys and strings. Single quotes (') are not allowed.";
    }
    return "Property names (keys) must be enclosed in double quotes.";
  }

  // 3. Missing Structure
  if (msg.includes("Unexpected end of JSON input")) {
    return "The JSON input seems incomplete. Check for missing closing braces '}' or brackets ']'.";
  }

  // 4. Context-Aware Analysis based on Position
  const match = msg.match(/at position (\d+)/);
  if (match && match[1]) {
      const pos = parseInt(match[1], 10);
      // Get a small window around the error
      const start = Math.max(0, pos - 10);
      const end = Math.min(json.length, pos + 10);
      const context = json.substring(start, end);
      const char = json.charAt(pos);
      const prevChar = json.charAt(pos - 1);

      // 4a. Missing Comma
      if (char === '"' && /[0-9"truefalsenull\]\}]/.test(prevChar)) {
          return "Missing a comma ',' before this quote?";
      }
      
      // 4b. Missing Colon
      if (char === '"' && prevChar !== ':' && prevChar !== '[' && prevChar !== ',') {
         // If it looks like a key, maybe missing colon?
         // Hard to be sure without more context, but "Missing comma or colon" is safe
         return "Missing a comma ',' or colon ':' before this quote?";
      }

      // 4c. Colon used incorrectly
      if (char === ':') {
          return "Colon ':' used incorrectly. Ensure keys are wrapped in double quotes.";
      }

      // 4d. Unquoted Keys (common in JS objects)
      if (/[a-zA-Z]/.test(char) && prevChar === '{') {
          return "Unquoted key? Keys must be wrapped in double quotes (e.g., \"key\": ...).";
      }
      
      // 4e. Comments
      if (char === '/' && (json.charAt(pos+1) === '/' || json.charAt(pos+1) === '*')) {
          return "Comments (// or /* */) are not allowed in standard JSON.";
      }
  }

  return "Check for syntax errors like missing commas, unquoted keys, or trailing commas.";
};
