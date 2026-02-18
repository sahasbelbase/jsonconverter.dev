
export interface UrlBreakdown {
  valid: boolean;
  protocol?: string;
  host?: string;
  path?: string;
  params?: Record<string, string>;
  hash?: string;
}

/**
 * Safely decodes a URI component. Returns original string if error.
 */
export const safeDecode = (input: string): string => {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch (e) {
    return input;
  }
};

/**
 * Safely encodes a string.
 */
export const safeEncode = (input: string, componentMode: boolean = true): string => {
  try {
    if (componentMode) {
      return encodeURIComponent(input);
    }
    return encodeURI(input);
  } catch (e) {
    return input;
  }
};

/**
 * Analyzes a string to see if it's a valid URL and extracts components.
 */
export const analyzeUrl = (input: string): UrlBreakdown => {
  try {
    // Try to handle partial URLs by prefixing https:// if missing scheme but looks like domain
    let urlStr = input.trim();
    if (!urlStr.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/) && urlStr.includes('.')) {
        // Very basic heuristic for visual breakdown purposes
        try {
            const temp = new URL(`https://${urlStr}`);
            // If it parsed successfully with added scheme, use it
            urlStr = `https://${urlStr}`;
        } catch {}
    }

    const url = new URL(urlStr);
    const params: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      valid: true,
      protocol: url.protocol,
      host: url.hostname,
      path: url.pathname,
      hash: url.hash,
      params: Object.keys(params).length > 0 ? params : undefined
    };
  } catch (e) {
    return { valid: false };
  }
};