/**
 * Helpers for the JSON tree view.
 *
 * These exist as pure functions because the behaviour they encode is what keeps
 * a large document from locking the tab: the tree used to render every node,
 * fully expanded, which turned a 235 KB document into 216,000 DOM elements.
 */

/** How many children one node renders before offering a "show more" button. */
export const CHILDREN_PAGE = 100;

/** Above this many nodes a document is treated as large and starts collapsed. */
export const LARGE_DOCUMENT_NODES = 2_000;

/** Nodes at or below this depth stay open in a small document. */
export const AUTO_EXPAND_DEPTH = 2;

/**
 * Counts nodes, stopping once the answer can no longer change the outcome.
 * The exact total past the threshold is never used, and walking a huge
 * document twice would defeat the point.
 */
export const countNodes = (value: unknown, budget = LARGE_DOCUMENT_NODES * 2): number => {
  let seen = 0;
  const walk = (node: unknown) => {
    if (seen > budget) return;
    seen++;
    if (node && typeof node === 'object') {
      for (const child of Object.values(node as Record<string, unknown>)) walk(child);
    }
  };
  walk(value);
  return seen;
};

export const isLargeDocument = (value: unknown): boolean => countNodes(value) > LARGE_DOCUMENT_NODES;

/** Whether a node starts expanded, given how big the document is and how deep it sits. */
export const startsExpanded = (depth: number, isLarge: boolean): boolean =>
  isLarge ? depth === 0 : depth <= AUTO_EXPAND_DEPTH;

export interface TreeMatches {
  /** Exact hits, as `path#key` or `path#value`, in document order. */
  hits: string[];
  /** Every path on the way to a hit, so a node can test membership in O(1). */
  onPath: Set<string>;
}

/**
 * Walks the document once per search term.
 *
 * The previous implementation asked each node whether its own subtree matched,
 * by JSON.stringify-ing that subtree — quadratic work on every keystroke.
 */
export const collectMatches = (data: unknown, term: string): TreeMatches => {
  const hits: string[] = [];
  const onPath = new Set<string>();
  if (!term) return { hits, onPath };

  const needle = term.toLowerCase();

  const walk = (node: unknown, path: string): boolean => {
    let found = false;

    if (node === null || typeof node !== 'object') {
      if (String(node).toLowerCase().includes(needle)) {
        hits.push(`${path}#value`);
        found = true;
      }
      return found;
    }

    const isArray = Array.isArray(node);
    for (const key of Object.keys(node as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;
      if (!isArray && key.toLowerCase().includes(needle)) {
        hits.push(`${childPath}#key`);
        found = true;
      }
      if (walk((node as Record<string, unknown>)[key], childPath)) found = true;
    }

    if (found) onPath.add(path);
    return found;
  };

  walk(data, 'root');
  return { hits, onPath };
};

/** Escapes a search term so it can go straight into a highlighting RegExp. */
export const escapeRegExp = (term: string): string => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
