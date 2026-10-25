import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, XCircle } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';
import { formatBytes } from '../utils/encodingUtils';
import {
  HASH_ALGORITHMS,
  INSECURE,
  type HashAlgorithm,
  hashBytes,
  hashText,
  hashesMatch,
} from '../utils/hashUtils';

const tool = TOOL_BY_PATH.get('/hash-generator')!;

const HashPage: React.FC = () => {
  const [text, setText] = useLocalStorageState('hashInput');
  const [expected, setExpected] = useState('');
  const [digests, setDigests] = useState<Partial<Record<HashAlgorithm, string>>>({});
  const [source, setSource] = useState<{ name: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Text hashes recompute as you type; a file hash sticks until replaced.
  useEffect(() => {
    if (source) return;
    let cancelled = false;
    if (!text) {
      setDigests({});
      return;
    }
    (async () => {
      const entries = await Promise.all(
        HASH_ALGORITHMS.map(async (algo) => [algo, await hashText(text, algo)] as const)
      );
      if (!cancelled) setDigests(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [text, source]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const entries = await Promise.all(
        HASH_ALGORITHMS.map(async (algo) => [algo, await hashBytes(bytes, algo)] as const)
      );
      setDigests(Object.fromEntries(entries));
      setSource({ name: file.name, size: file.size });
      toast.success(`Hashed ${file.name} (${formatBytes(file.size)}).`);
    } catch (e) {
      toast.error(`Could not read that file: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const clearFile = () => {
    setSource(null);
    setDigests({});
    if (fileRef.current) fileRef.current.value = '';
  };

  const matchedAlgo = expected.trim()
    ? HASH_ALGORITHMS.find((algo) => hashesMatch(digests[algo] ?? '', expected))
    : undefined;

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Generate a checksum without uploading anything</h2>
          <p>
            SHA-1, SHA-256, SHA-384 and SHA-512 come from the browser’s built-in{' '}
            <code>crypto.subtle.digest</code>. MD5 is not part of Web Crypto — deliberately, since
            it is broken for anything security-related — so it is computed here in JavaScript for
            the cases where a vendor still publishes MD5 checksums.
          </p>
          <h3>Which one should you use?</h3>
          <ul>
            <li>
              <strong>SHA-256</strong> is the sensible default for signatures, integrity checks and
              content addressing.
            </li>
            <li>
              <strong>SHA-512</strong> is faster than SHA-256 on 64-bit hardware and gives a longer
              digest.
            </li>
            <li>
              <strong>MD5 and SHA-1</strong> have practical collision attacks. Treat them as
              checksums against accidental corruption, never as proof that a file was not tampered
              with.
            </li>
          </ul>
          <p>
            None of these are password hashes. For passwords use a deliberately slow algorithm such
            as Argon2id, scrypt or bcrypt, on a server.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3 p-2">
        <div className="flex-none flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
            icon={<FileUp size={14} />}
            isLoading={busy}
          >
            Hash a file
          </Button>
          {source && (
            <span className="flex items-center gap-2 text-xs text-gray-500">
              {source.name} · {formatBytes(source.size)}
              <button onClick={clearFile} className="underline hover:text-primary">
                back to text
              </button>
            </span>
          )}
        </div>

        {!source && (
          <div className="flex-none flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Input</span>
              <span className="text-[11px] text-gray-400">{text.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              rows={6}
              placeholder="Type or paste the text to hash…"
              className="w-full p-3 font-mono text-sm bg-white dark:bg-dark resize-y outline-none"
            />
          </div>
        )}

        <div className="flex-none">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Compare against an expected hash (optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              spellCheck={false}
              placeholder="Paste the published checksum…"
              className="flex-1 px-3 py-2 font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
            />
            {expected.trim() &&
              (matchedAlgo ? (
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                  <CheckCircle2 size={16} /> Matches {matchedAlgo}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                  <XCircle size={16} /> No match
                </span>
              ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {HASH_ALGORITHMS.map((algo) => {
            const digest = digests[algo] ?? '';
            const isMatch = matchedAlgo === algo;
            return (
              <div
                key={algo}
                className={`rounded-xl border p-3 transition-colors ${
                  isMatch
                    ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{algo}</span>
                    {INSECURE.includes(algo) && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                        title="Collisions can be produced on demand. Fine as a checksum, not as proof of integrity."
                      >
                        <AlertTriangle size={10} /> not collision-resistant
                      </span>
                    )}
                  </div>
                  <CopyButton value={digest} />
                </div>
                <code className="block font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                  {digest || <span className="text-gray-400">—</span>}
                </code>
              </div>
            );
          })}
        </div>
      </div>
    </ToolShell>
  );
};

export default HashPage;
