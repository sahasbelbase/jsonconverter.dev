/**
 * Guesses the syntax of a pasted blob so the editor can highlight it without
 * the user having to pick from a dropdown first.
 *
 * Deliberately conservative: it returns `null` when nothing matches clearly,
 * and callers treat that as "leave the current choice alone". Guessing wrong
 * is worse than not guessing, because a wrong language shows bogus error
 * squiggles over valid content.
 */

export type DetectedLanguage =
  | 'json'
  | 'xml'
  | 'html'
  | 'yaml'
  | 'markdown'
  | 'css'
  | 'sql'
  | 'javascript'
  | 'typescript'
  | 'csv';

export const detectLanguage = (text: string): DetectedLanguage | null => {
  const sample = text.slice(0, 50_000);
  const trimmed = sample.trim();
  if (trimmed.length < 2) return null;

  // JSON: only claim it if it actually parses, so a JS object literal or a
  // half-typed document does not get flagged.
  if (/^[[{]/.test(trimmed)) {
    try {
      JSON.parse(text);
      return 'json';
    } catch {
      /* fall through — it may still be JS, or JSON that is still being typed */
    }
  }

  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return 'html';
  if (/^<\?xml[\s?]/i.test(trimmed)) return 'xml';

  if (/^</.test(trimmed)) {
    const htmlTag = /<(div|span|p|a|body|head|script|style|img|ul|li|table|h[1-6]|section|header|footer|nav|form|input|button|meta|link)[\s/>]/i;
    return htmlTag.test(sample) ? 'html' : 'xml';
  }

  if (/^(---|\s*#)/m.test(trimmed) && /^[\w"'-]+\s*:(\s|$)/m.test(trimmed)) return 'yaml';

  // Markdown: a heading, a fenced block, a list or a link, at the start of a line.
  if (/^#{1,6}\s+\S/m.test(trimmed) || /^```/m.test(trimmed) || /^\s*[-*+]\s+\S/m.test(trimmed)) {
    return 'markdown';
  }

  if (/^\s*(select|insert\s+into|update|delete\s+from|create\s+(table|index|view)|alter\s+table|with)\b/i.test(trimmed)) {
    return 'sql';
  }

  if (/^(import|export)\s|^\s*(const|let|var|function|class|async\s+function)\s/m.test(trimmed)) {
    return /:\s*(string|number|boolean|any|unknown|void)\b|\binterface\s+\w|\btype\s+\w+\s*=/.test(sample)
      ? 'typescript'
      : 'javascript';
  }

  // A selector followed by a block holding at least one `property: value`.
  if (/[.#]?[\w-]+\s*\{[^{}]*[\w-]+\s*:[^{};]+[;}]/.test(trimmed)) return 'css';

  // YAML without a document marker: several `key: value` lines and no braces.
  const yamlLines = trimmed.split('\n').filter((line) => /^\s*[\w"'-]+\s*:(\s|$)/.test(line));
  if (yamlLines.length >= 2 && yamlLines.length / trimmed.split('\n').length > 0.5) return 'yaml';

  // CSV: a consistent delimiter count across the first few lines.
  const lines = trimmed.split('\n').slice(0, 5).filter(Boolean);
  if (lines.length >= 2) {
    const counts = lines.map((line) => line.split(',').length);
    if (counts[0] > 1 && counts.every((count) => count === counts[0])) return 'csv';
  }

  return null;
};

/** The subset the diff viewer's syntax dropdown offers. */
const DIFF_LANGUAGES = new Set([
  'json', 'xml', 'html', 'yaml', 'markdown', 'css', 'sql', 'javascript', 'typescript',
]);

export const detectDiffLanguage = (text: string): string | null => {
  const detected = detectLanguage(text);
  if (!detected) return null;
  // The dropdown has no CSV entry; plain text is the honest fallback there.
  return DIFF_LANGUAGES.has(detected) ? detected : null;
};
