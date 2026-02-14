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
  let fixed = input;

  // 1. Remove comments (single line // and multi-line /* */)
  fixed = fixed.replace(/\/\/.*$/gm, ""); 
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Fix trailing commas before closing braces/brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // 3. Replace single quotes with double quotes for KEYS
  // Looks for 'key': or 'key' :
  // The regex ensures it doesn't run inside strings by anchoring to { or , or start
  fixed = fixed.replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":');

  // 4. Quote UNQUOTED keys
  // Looks for { key: or , key: 
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

  // 5. Replace single quotes with double quotes for VALUES
  // This is tricky. We match ": '...'" but handle escaped quotes inside
  // Pattern: : ' (anything not ' or escaped ') ' followed by , } or ]
  fixed = fixed.replace(/:\s*'((?:[^'\\]|\\.)*)'\s*(?=[,}\]])/g, ': "$1"');

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