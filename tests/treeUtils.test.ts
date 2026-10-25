import { describe, expect, it } from 'vitest';
import {
  AUTO_EXPAND_DEPTH,
  LARGE_DOCUMENT_NODES,
  collectMatches,
  countNodes,
  escapeRegExp,
  isLargeDocument,
  startsExpanded,
} from '../utils/treeUtils';

describe('countNodes', () => {
  it('counts every value, including containers', () => {
    // the object, a, b, and b's two items
    expect(countNodes({ a: 1, b: [2, 3] })).toBe(5);
  });

  it('counts a primitive as one node', () => {
    expect(countNodes(42)).toBe(1);
    expect(countNodes(null)).toBe(1);
  });

  it('stops once the budget is exhausted instead of walking everything', () => {
    const huge = Array.from({ length: 100_000 }, (_, i) => ({ i }));
    const started = performance.now();
    const counted = countNodes(huge, 500);
    expect(counted).toBeLessThanOrEqual(600);
    // Would take far longer if it walked all 200,001 nodes.
    expect(performance.now() - started).toBeLessThan(50);
  });
});

describe('isLargeDocument', () => {
  it('treats a small document as small', () => {
    expect(isLargeDocument({ a: 1, b: { c: 2 } })).toBe(false);
  });

  it('treats a document past the threshold as large', () => {
    const rows = Array.from({ length: LARGE_DOCUMENT_NODES }, (_, i) => ({ i, name: `n${i}` }));
    expect(isLargeDocument(rows)).toBe(true);
  });
});

describe('startsExpanded', () => {
  it('opens only the root of a large document', () => {
    expect(startsExpanded(0, true)).toBe(true);
    expect(startsExpanded(1, true)).toBe(false);
  });

  it('opens the first few levels of a small one', () => {
    expect(startsExpanded(AUTO_EXPAND_DEPTH, false)).toBe(true);
    expect(startsExpanded(AUTO_EXPAND_DEPTH + 1, false)).toBe(false);
  });
});

describe('collectMatches', () => {
  const data = {
    store: {
      book: [
        { title: 'Moby Dick', price: 8.99 },
        { title: 'Sword of Honour', price: 12.99 },
      ],
    },
  };

  it('finds nothing without a term', () => {
    expect(collectMatches(data, '')).toEqual({ hits: [], onPath: new Set() });
  });

  it('finds a value match and records the path to it', () => {
    const { hits, onPath } = collectMatches(data, 'moby');
    expect(hits).toEqual(['root.store.book.0.title#value']);
    expect(onPath.has('root')).toBe(true);
    expect(onPath.has('root.store')).toBe(true);
    expect(onPath.has('root.store.book')).toBe(true);
    expect(onPath.has('root.store.book.0')).toBe(true);
    // The branch that did not match is not on the path.
    expect(onPath.has('root.store.book.1')).toBe(false);
  });

  it('finds a key match', () => {
    const { hits } = collectMatches(data, 'price');
    expect(hits).toEqual(['root.store.book.0.price#key', 'root.store.book.1.price#key']);
  });

  it('does not treat an array index as a key', () => {
    const { hits } = collectMatches({ list: ['a', 'b'] }, '0');
    expect(hits).toEqual([]);
  });

  it('ignores case', () => {
    expect(collectMatches(data, 'MOBY').hits).toHaveLength(1);
  });

  it('matches numbers and booleans by their text', () => {
    expect(collectMatches({ n: 8.99, ok: true }, '8.9').hits).toEqual(['root.n#value']);
    expect(collectMatches({ n: 8.99, ok: true }, 'true').hits).toEqual(['root.ok#value']);
  });

  it('stays linear on a wide document', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `row ${i}` }));
    const started = performance.now();
    const { hits } = collectMatches(rows, 'row 1');
    expect(hits.length).toBeGreaterThan(0);
    // The old per-node JSON.stringify approach was quadratic and would not
    // finish anywhere near this budget.
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('escapeRegExp', () => {
  it('neutralises characters that would otherwise be a pattern', () => {
    expect(() => new RegExp(escapeRegExp('a(b'))).not.toThrow();
    expect(new RegExp(escapeRegExp('a.b')).test('axb')).toBe(false);
    expect(new RegExp(escapeRegExp('a.b')).test('a.b')).toBe(true);
  });
});
