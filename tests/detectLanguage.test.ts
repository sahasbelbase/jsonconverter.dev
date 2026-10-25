import { describe, expect, it } from 'vitest';
import { detectDiffLanguage, detectLanguage } from '../utils/detectLanguage';

describe('detectLanguage', () => {
  it('recognises JSON only when it parses', () => {
    expect(detectLanguage('{"a": 1, "b": [2, 3]}')).toBe('json');
    expect(detectLanguage('[1, 2, 3]')).toBe('json');
    // A JS object literal looks like JSON but is not.
    expect(detectLanguage('{ a: 1 }')).not.toBe('json');
  });

  it('separates HTML from XML', () => {
    expect(detectLanguage('<!DOCTYPE html><html><body>hi</body></html>')).toBe('html');
    expect(detectLanguage('<div class="x"><p>text</p></div>')).toBe('html');
    expect(detectLanguage('<?xml version="1.0"?><root><a/></root>')).toBe('xml');
    expect(detectLanguage('<catalog><book id="1"><price>8.95</price></book></catalog>')).toBe('xml');
  });

  it('recognises YAML with and without a document marker', () => {
    expect(detectLanguage('---\nname: checkout\nreplicas: 3')).toBe('yaml');
    expect(detectLanguage('name: checkout\nreplicas: 3\nenabled: true')).toBe('yaml');
  });

  it('recognises Markdown', () => {
    expect(detectLanguage('# Title\n\nSome prose.')).toBe('markdown');
    expect(detectLanguage('- one\n- two\n- three')).toBe('markdown');
    expect(detectLanguage('```js\nconst a = 1;\n```')).toBe('markdown');
  });

  it('recognises SQL', () => {
    expect(detectLanguage('SELECT id, name FROM users WHERE active = 1')).toBe('sql');
    expect(detectLanguage('create table t (id int)')).toBe('sql');
  });

  it('separates TypeScript from JavaScript', () => {
    expect(detectLanguage('const x = 1;\nfunction go() { return x; }')).toBe('javascript');
    expect(detectLanguage('interface A { b: string }\nconst x: number = 1;')).toBe('typescript');
  });

  it('recognises CSS', () => {
    expect(detectLanguage('.btn { color: red; background: blue; }')).toBe('css');
  });

  it('recognises CSV by a consistent delimiter count', () => {
    expect(detectLanguage('a,b,c\n1,2,3\n4,5,6')).toBe('csv');
    // Ragged rows are not CSV.
    expect(detectLanguage('a,b,c\n1,2\n4,5,6,7')).toBeNull();
  });

  it('returns null rather than guessing at prose or near-empty input', () => {
    expect(detectLanguage('')).toBeNull();
    expect(detectLanguage('   ')).toBeNull();
    expect(detectLanguage('x')).toBeNull();
    expect(detectLanguage('Just an ordinary sentence of prose.')).toBeNull();
  });
});

describe('detectDiffLanguage', () => {
  it('maps to an option the dropdown actually offers', () => {
    expect(detectDiffLanguage('{"a":1}')).toBe('json');
    // CSV has no entry in the diff dropdown.
    expect(detectDiffLanguage('a,b\n1,2')).toBeNull();
  });
});
