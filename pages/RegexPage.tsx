import React, { useDeferredValue, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Trash2 } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/regex-tester')!;

const FLAGS: { flag: string; label: string; hint: string }[] = [
  { flag: 'g', label: 'global', hint: 'Find every match, not just the first.' },
  { flag: 'i', label: 'ignore case', hint: 'Match regardless of case.' },
  { flag: 'm', label: 'multiline', hint: '^ and $ match at each line break.' },
  { flag: 's', label: 'dotall', hint: '. also matches a newline.' },
  { flag: 'u', label: 'unicode', hint: 'Treat the pattern as Unicode code points.' },
  { flag: 'y', label: 'sticky', hint: 'Match only from lastIndex.' },
];

interface MatchInfo {
  index: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string> | undefined;
}

const MAX_MATCHES = 1000;

const RegexPage: React.FC = () => {
  const [pattern, setPattern] = useLocalStorageState('regexPattern', '\\b(\\w+)@(\\w+)\\.com\\b');
  const [flags, setFlags] = useLocalStorageState('regexFlags', 'g');
  const [text, setText] = useLocalStorageState(
    'regexText',
    'Contact ada@example.com or grace@navy.com for details.'
  );
  const [replacement, setReplacement] = useLocalStorageState('regexReplacement', '');

  const deferredText = useDeferredValue(text);

  const { matches, error, regex } = useMemo(() => {
    if (!pattern) return { matches: [] as MatchInfo[], error: null as string | null, regex: null };
    let re: RegExp;
    try {
      // Always compile with `g` internally so we can enumerate; respect the
      // user's choice when reporting, and stop after the first if `g` is off.
      re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    } catch (e) {
      return { matches: [], error: (e as Error).message, regex: null };
    }

    const found: MatchInfo[] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(deferredText)) !== null) {
      found.push({
        index: m.index,
        text: m[0],
        groups: m.slice(1),
        named: m.groups,
      });
      // A pattern that can match the empty string would loop forever otherwise.
      if (m[0] === '') re.lastIndex++;
      if (!flags.includes('g')) break;
      if (++guard >= MAX_MATCHES) break;
    }

    return { matches: found, error: null, regex: re };
  }, [pattern, flags, deferredText]);

  const highlighted = useMemo(() => {
    if (!matches.length) return [{ text: deferredText, match: false }];
    const parts: { text: string; match: boolean }[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) parts.push({ text: deferredText.slice(cursor, m.index), match: false });
      parts.push({ text: m.text, match: true });
      cursor = m.index + m.text.length;
    }
    if (cursor < deferredText.length) parts.push({ text: deferredText.slice(cursor), match: false });
    return parts;
  }, [matches, deferredText]);

  const replaced = useMemo(() => {
    if (!regex || error || !replacement) return '';
    try {
      return deferredText.replace(new RegExp(pattern, flags), replacement);
    } catch {
      return '';
    }
  }, [regex, error, replacement, deferredText, pattern, flags]);

  const toggleFlag = (flag: string) =>
    setFlags(flags.includes(flag) ? flags.replace(flag, '') : flags + flag);

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Test a JavaScript regular expression</h2>
          <p>
            This runs the pattern through the browser’s own regex engine, so what you see here is
            exactly what <code>String.prototype.match</code> will do in your code — including the
            JavaScript-specific details that trip people up when they copy a pattern from a PCRE or
            Python answer.
          </p>
          <h3>Things worth remembering</h3>
          <ul>
            <li>
              A <code>g</code> regex keeps state in <code>lastIndex</code>. Reusing one object
              across calls to <code>test()</code> gives alternating true/false results.
            </li>
            <li>
              <code>.</code> never matches a newline unless you add the <code>s</code> flag.
            </li>
            <li>
              Named groups — <code>(?&lt;user&gt;\w+)</code> — are far easier to read than counting
              brackets, and they show up in the match table below.
            </li>
            <li>
              Nested quantifiers like <code>(a+)+</code> can backtrack catastrophically. If a
              pattern will ever see untrusted input, keep it linear.
            </li>
          </ul>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3 p-2">
        <div className="flex-none">
          <div className="flex items-stretch rounded-xl border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-dark focus-within:ring-2 focus-within:ring-primary">
            <span className="flex items-center px-3 font-mono text-lg text-gray-400 bg-gray-50 dark:bg-gray-800/60">
              /
            </span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              spellCheck={false}
              placeholder="your pattern"
              className="flex-1 px-2 py-3 font-mono text-sm bg-transparent outline-none"
            />
            <span className="flex items-center px-2 font-mono text-lg text-gray-400 bg-gray-50 dark:bg-gray-800/60">
              /{flags}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {FLAGS.map(({ flag, label, hint }) => (
              <button
                key={flag}
                onClick={() => toggleFlag(flag)}
                title={hint}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  flags.includes(flag)
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="font-mono font-bold">{flag}</span>
                <span className="ml-1.5 hidden sm:inline">{label}</span>
              </button>
            ))}
            <span className="flex-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {error ? '' : `${matches.length}${matches.length >= MAX_MATCHES ? '+' : ''} match${matches.length === 1 ? '' : 'es'}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPattern('');
                setText('');
                setReplacement('');
              }}
              disabled={!pattern && !text && !replacement}
              icon={<Trash2 size={14} />}
            >
              Clear
            </Button>
          </div>

          {error && (
            <p className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="font-mono">{error}</span>
            </p>
          )}
        </div>

        <div className="flex-1 grid lg:grid-cols-2 gap-3 min-h-[260px]">
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Test string</span>
            </div>
            <div className="relative flex-1">
              {/* The highlight layer sits behind a transparent textarea so the
                  caret and selection stay native. */}
              <pre
                aria-hidden
                className="absolute inset-0 p-3 m-0 font-mono text-sm whitespace-pre-wrap break-words pointer-events-none overflow-auto"
              >
                {highlighted.map((part, i) =>
                  part.match ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded-sm">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  )
                )}
                {'\n'}
              </pre>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-3 font-mono text-sm bg-transparent text-transparent caret-gray-900 dark:caret-gray-100 resize-none outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Matches</span>
            </div>
            <div className="flex-1 overflow-auto">
              {matches.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 flex items-center gap-2">
                  <BookOpen size={15} /> No matches yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 text-[11px] uppercase text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium">#</th>
                      <th className="text-left px-3 py-1.5 font-medium">Index</th>
                      <th className="text-left px-3 py-1.5 font-medium">Match</th>
                      <th className="text-left px-3 py-1.5 font-medium">Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800 align-top">
                        <td className="px-3 py-1.5 text-gray-400 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-1.5 text-gray-400 tabular-nums">{m.index}</td>
                        <td className="px-3 py-1.5 font-mono break-all">{m.text}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                          {m.named && Object.keys(m.named).length
                            ? Object.entries(m.named)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')
                            : m.groups.length
                              ? m.groups.map((g, gi) => `$${gi + 1}: ${g ?? '—'}`).join(', ')
                              : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="flex-none rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Replace with
          </label>
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            spellCheck={false}
            placeholder="$1 at $2 — use $1, $2 or $<name> for groups"
            className="w-full px-3 py-2 font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
          />
          {replaced && (
            <div className="mt-2 flex items-start gap-2">
              <pre className="flex-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 font-mono text-sm whitespace-pre-wrap break-words max-h-32 overflow-auto">
                {replaced}
              </pre>
              <CopyButton value={replaced} />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
};

export default RegexPage;
