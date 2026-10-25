import React, { useMemo, useRef, useState } from 'react';
import { ArrowDownUp, FileUp, Trash2, Wand2 } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';
import {
  base64ToBytes,
  bytesToBase64,
  decodeBase64,
  encodeBase64,
  formatBytes,
  isProbablyBase64,
} from '../utils/encodingUtils';

const tool = TOOL_BY_PATH.get('/base64')!;

type Direction = 'encode' | 'decode';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const Base64Page: React.FC = () => {
  const [input, setInput] = useLocalStorageState('base64Input');
  const [direction, setDirection] = useState<Direction>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; type: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: null as string | null };
    try {
      return {
        output: direction === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input),
        error: null,
      };
    } catch (e) {
      const message =
        direction === 'decode'
          ? `Could not decode: ${(e as Error).message.replace(/^.*?: /, '')}`
          : (e as Error).message;
      return { output: '', error: message };
    }
  }, [input, direction, urlSafe]);

  const dataUrl = useMemo(() => {
    if (direction !== 'encode' || !output || !fileMeta) return '';
    return `data:${fileMeta.type || 'application/octet-stream'};base64,${output}`;
  }, [direction, output, fileMeta]);

  const swap = () => {
    if (output) setInput(output);
    setDirection((d) => (d === 'encode' ? 'decode' : 'encode'));
    setFileMeta(null);
  };

  // A file's Base64 is held separately: the input box holds text, and encoding a
  // file has to go through its raw bytes so binary formats survive intact.
  const [encodedFile, setEncodedFile] = useState('');
  const effectiveOutput = fileMeta && encodedFile ? encodedFile : output;

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`That file is ${formatBytes(file.size)}. The limit here is ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    setDirection('encode');
    setInput('');
    setFileMeta({ name: file.name, type: file.type, size: file.size });
    setEncodedFile(bytesToBase64(bytes, urlSafe));
    toast.success(`Encoded ${file.name} (${formatBytes(file.size)}).`);
  };

  const downloadDecoded = () => {
    try {
      const bytes = base64ToBytes(input);
      const blob = new Blob([bytes.slice().buffer as ArrayBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'decoded.bin';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded the decoded bytes.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const looksLikeBase64 = direction === 'encode' && input.length > 16 && isProbablyBase64(input);

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Base64, done properly for Unicode</h2>
          <p>
            A plain <code>btoa()</code> call throws on anything outside Latin-1, which is why so
            many Base64 boxes mangle accents and emoji. This tool encodes your text to UTF-8 bytes
            first, so <code>café 🎉</code> survives a full round trip.
          </p>
          <h3>URL-safe output</h3>
          <p>
            Standard Base64 uses <code>+</code> and <code>/</code>, both of which have meaning
            inside a URL. URL-safe output swaps them for <code>-</code> and <code>_</code> and drops
            the <code>=</code> padding — this is the encoding used by JWTs. Decoding accepts either
            alphabet, padded or not.
          </p>
          <h3>Files and data URLs</h3>
          <p>
            Upload a file to get its Base64 plus a ready-to-paste <code>data:</code> URL for
            inlining a small image or font in CSS. Files are read with <code>FileReader</code> in
            your browser and never uploaded.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3 p-2">
        <div className="flex-none flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['encode', 'decode'] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDirection(d);
                  setFileMeta(null);
                  setEncodedFile('');
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  direction === d
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={swap} icon={<ArrowDownUp size={14} />}>
            Swap
          </Button>

          {direction === 'encode' && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => setUrlSafe(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              URL-safe
            </label>
          )}

          <div className="flex-1" />

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
          >
            Encode a file
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInput('');
              setFileMeta(null);
              setEncodedFile('');
            }}
            icon={<Trash2 size={14} />}
          >
            Clear
          </Button>
        </div>

        {looksLikeBase64 && (
          <div className="flex-none flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
            <Wand2 size={14} />
            That input already looks like Base64.
            <button onClick={() => setDirection('decode')} className="underline font-medium">
              Decode it instead
            </button>
          </div>
        )}

        <div className="flex-1 grid lg:grid-cols-2 gap-3 min-h-[280px]">
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {direction === 'encode' ? 'Plain text' : 'Base64'}
              </span>
              <span className="text-[11px] text-gray-400">{input.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setFileMeta(null);
                setEncodedFile('');
              }}
              spellCheck={false}
              placeholder={direction === 'encode' ? 'Type or paste text…' : 'Paste Base64…'}
              className="flex-1 w-full p-3 font-mono text-sm bg-white dark:bg-dark resize-none outline-none"
            />
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {direction === 'encode' ? 'Base64' : 'Plain text'}
              </span>
              <div className="flex items-center gap-1">
                {direction === 'decode' && input.trim() && (
                  <button
                    onClick={downloadDecoded}
                    className="text-[11px] px-2 py-1 rounded text-gray-500 hover:text-primary"
                  >
                    Download bytes
                  </button>
                )}
                <CopyButton value={effectiveOutput} label="Copy" />
              </div>
            </div>
            <textarea
              readOnly
              value={error ?? effectiveOutput}
              spellCheck={false}
              placeholder="Output appears here"
              className={`flex-1 w-full p-3 font-mono text-sm resize-none outline-none bg-gray-50 dark:bg-gray-900/40 ${
                error ? 'text-red-600 dark:text-red-400' : ''
              }`}
            />
          </div>
        </div>

        {fileMeta && (
          <div className="flex-none text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-200">
              {fileMeta.name} · {formatBytes(fileMeta.size)} · {fileMeta.type || 'unknown type'}
            </p>
            {dataUrl && (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-blue-700 dark:text-blue-300">{dataUrl}</code>
                <CopyButton value={dataUrl} label="Copy data URL" />
              </div>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
};

export default Base64Page;
