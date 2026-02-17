
/**
 * Simple JSON to YAML Converter
 */
export const toYAML = (data: any): string => {
  const getType = (obj: any) => {
    if (obj === null) return 'null';
    if (Array.isArray(obj)) return 'array';
    return typeof obj;
  };

  const escapeString = (str: string) => {
    // If string contains special characters, quote it
    if (/[:#\[\]\{\},&*!|>'"]/.test(str) || !str.trim()) {
      return `"${str.replace(/"/g, '\\"')}"`;
    }
    return str;
  };

  const convert = (obj: any, indentLevel: number): string => {
    const indent = '  '.repeat(indentLevel);
    const type = getType(obj);

    if (type === 'null') return 'null';
    if (type === 'undefined') return '';
    if (type !== 'object' && type !== 'array') {
      return escapeString(String(obj));
    }

    if (type === 'array') {
      if (obj.length === 0) return '[]';
      return obj.map((item: any) => {
        const itemType = getType(item);
        const itemStr = convert(item, indentLevel + 1);
        
        if (itemType === 'object' || itemType === 'array') {
           // For objects/arrays inside arrays, the dash is at current indent
           // but the content starts on the next line or aligned
           // Standard YAML: 
           // - key: val
           return `${indent}- ${itemStr.trimStart()}`;
        }
        return `${indent}- ${itemStr}`;
      }).join('\n');
    }

    // Object
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    return keys.map((key) => {
      const val = obj[key];
      const valType = getType(val);
      const valStr = convert(val, indentLevel + 1);

      if (valType === 'array' || valType === 'object') {
        // If it's an empty object/array
        if (valStr === '[]' || valStr === '{}') {
             return `${indent}${key}: ${valStr}`;
        }
        return `${indent}${key}:\n${valStr}`;
      }
      
      return `${indent}${key}: ${valStr}`;
    }).join('\n');
  };

  try {
    return convert(data, 0);
  } catch (e) {
    return `Error converting to YAML: ${(e as Error).message}`;
  }
};

/**
 * Simple JSON to XML Converter
 */
export const toXML = (data: any): string => {
  const convert = (obj: any, tagName: string = 'root'): string => {
    if (obj === null || obj === undefined) return `<${tagName} xsi:nil="true"/>`;
    
    if (Array.isArray(obj)) {
      return obj.map(item => convert(item, tagName === 'root' ? 'item' : tagName)).join('');
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return `<${tagName}></${tagName}>`;
      
      let inner = '';
      keys.forEach(key => {
        // XML tags cannot start with numbers or contain spaces
        let validKey = key.replace(/[^a-zA-Z0-9_.-]/g, '_');
        if (/^[0-9]/.test(validKey)) validKey = `_${validKey}`;
        
        // Handle array children specifically to avoid double nesting issues if needed
        // But our recursion handles Array.isArray above. 
        // If obj[key] is an array, we pass the key as the tag name for the items.
        
        if (Array.isArray(obj[key])) {
             inner += obj[key].map((item: any) => convert(item, validKey)).join('');
        } else {
             inner += convert(obj[key], validKey);
        }
      });
      
      if (tagName === 'root' && !inner.startsWith('<')) {
          // If the root object itself was an array processed above, avoid double root?
          // But here obj is object.
          return `<${tagName}>${inner}</${tagName}>`;
      }
      
      // Special case: if we are mapping an array item that is an object, 
      // the parent called us with the desired tag name.
      return `<${tagName}>${inner}</${tagName}>`;
    }
    
    // Primitives
    const safeValue = String(obj)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
      
    return `<${tagName}>${safeValue}</${tagName}>`;
  };

  try {
    const header = '<?xml version="1.0" encoding="UTF-8"?>';
    
    // If input is an array, `convert(data, 'root')` returns a list of items <item>...</item>.
    // Valid XML must have a single root element. We wrap it in <root> if data is an array.
    if (Array.isArray(data)) {
        return `${header}\n<root>${convert(data, 'root')}</root>`;
    }
    
    return `${header}\n${convert(data, 'root')}`;
  } catch (e) {
    return `Error converting to XML: ${(e as Error).message}`;
  }
};

/**
 * Simple JSON to TOML Converter (Best Effort)
 */
export const toTOML = (data: any): string => {
  const isPrimitive = (val: any) => val === null || (typeof val !== 'object' && !Array.isArray(val));
  
  const formatPrimitive = (val: any): string => {
    if (typeof val === 'string') return JSON.stringify(val);
    if (val === null) return ''; // TOML doesn't strictly have null, often omitted
    return String(val);
  };

  const convert = (obj: any, prefix = ''): string => {
    let output = '';
    
    // 1. Primitives first
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (isPrimitive(val)) {
        output += `${key} = ${formatPrimitive(val)}\n`;
      } else if (Array.isArray(val) && val.every(isPrimitive)) {
        // Inline array of primitives
        const arrStr = val.map(formatPrimitive).join(', ');
        output += `${key} = [ ${arrStr} ]\n`;
      }
    }

    // 2. Tables and Arrays of Tables
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (!isPrimitive(val) && !(Array.isArray(val) && val.every(isPrimitive))) {
         if (Array.isArray(val)) {
            // Array of Tables [[key]]
            val.forEach(item => {
               if (typeof item === 'object' && item !== null) {
                 output += `\n[[${fullKey}]]\n`;
                 output += convert(item); // Don't pass prefix, reset context for table
               }
            });
         } else if (typeof val === 'object' && val !== null) {
            // Table [key]
            // If the object is empty, we still print the header? Standard says yes if needed.
            // Check if it has any primitives to print, otherwise it's just intermediate
            output += `\n[${fullKey}]\n`;
            output += convert(val, fullKey); // Pass fullKey as prefix for dot notation if we didn't use [sections]
            // Actually, standard TOML uses [a.b], then keys inside.
            // My recursive approach here mixes [section] and dotted.keys.
            // Let's simplify: Recursive calls return body, current level adds header.
            // The recursor above `convert(val, fullKey)` is wrong for standard TOML structure if we use headers.
         }
      }
    }
    return output;
  };

  // TOML generation is complex. This is a simplified linear generator.
  // We flatten keys using dots or brackets.
  
  const tomlify = (obj: any, path: string = ''): string => {
     let lines: string[] = [];
     const keys = Object.keys(obj);
     
     // Primitives
     keys.filter(k => isPrimitive(obj[k])).forEach(k => {
        lines.push(`${k} = ${formatPrimitive(obj[k])}`);
     });
     
     // Arrays of primitives
     keys.filter(k => Array.isArray(obj[k]) && obj[k].every(isPrimitive)).forEach(k => {
        const arrStr = (obj[k] as any[]).map(formatPrimitive).join(', ');
        lines.push(`${k} = [ ${arrStr} ]`);
     });

     // Nested Objects (Tables)
     keys.filter(k => typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])).forEach(k => {
         const newPath = path ? `${path}.${k}` : k;
         lines.push(`\n[${newPath}]`);
         lines.push(tomlify(obj[k], newPath));
     });

     // Arrays of Objects
     keys.filter(k => Array.isArray(obj[k]) && !obj[k].every(isPrimitive)).forEach(k => {
         const newPath = path ? `${path}.${k}` : k;
         (obj[k] as any[]).forEach(item => {
             lines.push(`\n[[${newPath}]]`);
             // We reset recursion here because [[table]] sets a new root context
             // Effectively, inside [[table]], keys are relative to it.
             // So we pass '' as path? No, `tomlify` logic uses path for [header].
             // If we are inside [[user]], `name="john"` is correct.
             // So we call a helper that DOESNT prepend path to keys.
             lines.push(tomlify(item, '')); 
             // Wait, if item has nested objects, they become [?]. 
             // Standard TOML says nested tables inside array tables are [newPath.sub].
             // This simple recursion breaks for deep nesting in arrays. 
             // Limitation accepted for "Simple Converter".
         });
     });

     return lines.join('\n').trim();
  };

  try {
    if (typeof data !== 'object' || data === null) return String(data);
    return tomlify(data);
  } catch (e) {
    return `Error converting to TOML: ${(e as Error).message}`;
  }
};

/**
 * Properties / Dot-Notation Text Format
 */
export const toProperties = (data: any): string => {
  const flatten = (obj: any, prefix = ''): string[] => {
    let lines: string[] = [];
    
    if (obj === null) {
      lines.push(`${prefix} = null`);
      return lines;
    }

    if (typeof obj !== 'object') {
      lines.push(`${prefix} = ${obj}`);
      return lines;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        lines = lines.concat(flatten(item, `${prefix}[${idx}]`));
      });
      return lines;
    }

    Object.keys(obj).forEach(key => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      lines = lines.concat(flatten(obj[key], newKey));
    });

    return lines;
  };

  try {
    if (typeof data !== 'object') return String(data);
    return flatten(data).join('\n');
  } catch (e) {
    return `Error converting to Text: ${(e as Error).message}`;
  }
};

/**
 * Minify HTML
 */
export const minifyHTML = (html: string): string => {
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/>\s+</g, '><')          // Remove whitespace between tags
    .replace(/\s{2,}/g, ' ')          // Collapse multiple whitespace
    .trim();
};