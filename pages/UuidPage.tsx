import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { TOOL_BY_PATH } from '../lib/tools';
import { inspectUuid, ulid, uuidNil, uuidV4, uuidV7 } from '../utils/idUtils';

const tool = TOOL_BY_PATH.get('/uuid-generator')!;

type Kind = 'v4' | 'v7' | 'ulid' | 'nil';

const GENERATORS: Record<Kind, () => string> = {
  v4: uuidV4,
  v7: uuidV7,
  ulid,
  nil: uuidNil,
};

const LABELS: Record<Kind, string> = {
  v4: 'UUID v4',
  v7: 'UUID v7',
  ulid: 'ULID',
  nil: 'Nil UUID',
};

const UuidPage: React.FC = () => {
  const [kind, setKind] = useState<Kind>('v4');
  const [count, setCount] = useState(10);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [seed, setSeed] = useState(0);
  const [inspectValue, setInspectValue] = useState('');

  const ids = useMemo(() => {
    void seed; // regenerate when the button is pressed
    const generate = GENERATORS[kind];
    return Array.from({ length: Math.min(Math.max(count, 1), 500) }, () => {
      let id = generate();
      if (!hyphens && kind !== 'ulid') id = id.replace(/-/g, '');
      // ULIDs are canonically uppercase; UUIDs canonically lowercase.
      return uppercase ? id.toUpperCase() : kind === 'ulid' ? id : id.toLowerCase();
    });
  }, [kind, count, uppercase, hyphens, seed]);

  const info = useMemo(() => (inspectValue.trim() ? inspectUuid(inspectValue) : null), [inspectValue]);

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>v4 or v7?</h2>
          <p>
            <strong>v4</strong> is 122 random bits. It is unguessable and carries no information,
            which is exactly what you want for a public identifier — but consecutive v4s land in
            random places in a B-tree index, so inserting millions of them fragments the index.
          </p>
          <p>
            <strong>v7</strong> puts a 48-bit millisecond timestamp at the front, so ids generated
            close together sort close together. Rows insert at the end of the index instead of
            scattering. The trade-off is that a v7 leaks roughly when it was created.
          </p>
          <p>
            <strong>ULID</strong> is the same idea in Crockford base32: 26 characters,
            case-insensitive, no hyphens, and it survives being double-clicked as one word.
          </p>
          <p>
            All randomness here comes from <code>crypto.getRandomValues()</code>, the browser’s
            cryptographically secure generator — never <code>Math.random()</code>.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3 p-2">
        <div className="flex-none flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(Object.keys(LABELS) as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  kind === k
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {LABELS[k]}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            Count
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="w-20 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Uppercase
          </label>

          {kind !== 'ulid' && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none">
              <input
                type="checkbox"
                checked={hyphens}
                onChange={(e) => setHyphens(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Hyphens
            </label>
          )}

          <div className="flex-1" />
          <CopyButton value={ids.join('\n')} label="Copy all" />
          <Button size="sm" onClick={() => setSeed((s) => s + 1)} icon={<RefreshCw size={14} />}>
            Regenerate
          </Button>
        </div>

        <div className="flex-1 min-h-[200px] rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {ids.map((id, i) => (
              <li key={`${id}-${i}`} className="flex items-center gap-3 px-3 py-1.5 group">
                <span className="w-10 shrink-0 text-[11px] text-gray-400 tabular-nums">{i + 1}</span>
                <code className="flex-1 font-mono text-sm break-all">{id}</code>
                <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <CopyButton value={id} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-none rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Inspect a UUID
          </label>
          <input
            value={inspectValue}
            onChange={(e) => setInspectValue(e.target.value)}
            spellCheck={false}
            placeholder="Paste a UUID to see its version and embedded time…"
            className="w-full px-3 py-2 font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
          />
          {info && (
            <div className="mt-2 grid sm:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="block text-[11px] text-gray-400 uppercase">Valid</span>
                <span className={info.valid ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                  {info.valid ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-gray-400 uppercase">Version</span>
                <span>{info.version ?? '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] text-gray-400 uppercase">Variant</span>
                <span>{info.variant}</span>
              </div>
              <div>
                <span className="block text-[11px] text-gray-400 uppercase">Created</span>
                <span>{info.timestamp ? info.timestamp.toISOString() : '—'}</span>
              </div>
              <p className="sm:col-span-4 text-xs text-gray-500 dark:text-gray-400">{info.note}</p>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
};

export default UuidPage;
