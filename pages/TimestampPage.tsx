import React, { useEffect, useMemo, useState } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/timestamp-converter')!;

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Parses whatever the user pasted: epoch seconds, milliseconds, microseconds,
 * ISO 8601, or anything Date can handle. Ambiguity between seconds and
 * milliseconds is resolved by magnitude, which is what every other tool does.
 */
const parseInput = (raw: string): { date: Date | null; interpretedAs: string } => {
  const value = raw.trim();
  if (!value) return { date: null, interpretedAs: '' };

  if (/^-?\d+$/.test(value)) {
    const digits = value.replace('-', '').length;
    const n = Number(value);
    if (digits >= 16) return { date: new Date(n / 1000), interpretedAs: 'epoch microseconds' };
    if (digits >= 12) return { date: new Date(n), interpretedAs: 'epoch milliseconds' };
    return { date: new Date(n * 1000), interpretedAs: 'epoch seconds' };
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return { date: parsed, interpretedAs: 'date string' };
  return { date: null, interpretedAs: '' };
};

const relative = (date: Date): string => {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2628000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') return formatter.format(Math.round(diff / ms), unit);
  }
  return 'now';
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 group">
    <span className="w-44 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
    <code className="flex-1 font-mono text-sm break-all">{value}</code>
    <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <CopyButton value={value} />
    </span>
  </div>
);

const TimestampPage: React.FC = () => {
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { date, interpretedAs } = useMemo(() => parseInput(input), [input]);
  const valid = date !== null && !Number.isNaN(date.getTime());

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Seconds or milliseconds?</h2>
          <p>
            Unix time counts from 1 January 1970 UTC. Most backends count in{' '}
            <strong>seconds</strong> (10 digits today); JavaScript’s <code>Date.now()</code> counts
            in <strong>milliseconds</strong> (13 digits); Postgres and some tracing systems use
            microseconds (16 digits). This tool picks the unit by digit count, and tells you which
            one it assumed.
          </p>
          <h3>Why offsets matter</h3>
          <p>
            An ISO string without an offset — <code>2026-03-01T12:00:00</code> — is read as local
            time, while the same string with a <code>Z</code> is UTC. That one character is behind
            a large share of “the timestamp is off by a few hours” bugs. Both forms are shown below
            so you can see the difference.
          </p>
          <h3>The 2038 problem</h3>
          <p>
            A signed 32-bit seconds counter overflows on 19 January 2038. Anything still storing
            time in an <code>int32</code> needs to move to 64-bit before then.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3 p-2">
        <div className="flex-none flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock size={14} />
          <span>Now:</span>
          <code className="font-mono text-gray-700 dark:text-gray-200">{Math.floor(now / 1000)}</code>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <code className="font-mono text-gray-700 dark:text-gray-200">{new Date(now).toISOString()}</code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}
            icon={<RotateCcw size={13} />}
          >
            Use now
          </Button>
        </div>

        <div className="flex-none">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="1771545600, 2026-03-01T12:00:00Z, or “next friday”…"
            className={`w-full px-4 py-3 font-mono text-base rounded-xl border bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary ${
              input.trim() && !valid
                ? 'border-red-400 dark:border-red-700'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 h-4">
            {input.trim() && !valid
              ? 'Not a timestamp or a date this browser can parse.'
              : interpretedAs && `Read as ${interpretedAs}.`}
          </p>
        </div>

        {valid && date && (
          <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <Row label="Epoch (seconds)" value={String(Math.floor(date.getTime() / 1000))} />
            <Row label="Epoch (milliseconds)" value={String(date.getTime())} />
            <Row label="ISO 8601 (UTC)" value={date.toISOString()} />
            <Row label="UTC" value={date.toUTCString()} />
            <Row label={`Local (${LOCAL_ZONE})`} value={date.toString()} />
            <Row
              label="Local, readable"
              value={date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })}
            />
            <Row label="Relative" value={relative(date)} />
            <Row label="Day of year" value={String(
              Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000)
            )} />
            <Row
              label="ISO week"
              value={(() => {
                const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
                return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
              })()}
            />
          </div>
        )}
      </div>
    </ToolShell>
  );
};

export default TimestampPage;
