import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Calculator, ExternalLink, Info, Trash2 } from 'lucide-react';
import CopyButton from './CopyButton';
import {
  DEFAULT_MODEL_ID,
  MODELS,
  PRICING_AS_OF,
  PRICING_SOURCES,
  isEstimated,
  type Encoding,
} from '../lib/models';

interface TokenizerProps {
  value: string;
  onChange: (value: string) => void;
}

type Encoder = { encode: (text: string) => number[]; decode: (tokens: number[]) => string };

const TOKEN_COLORS = [
  'bg-blue-200 dark:bg-blue-500/40',
  'bg-green-200 dark:bg-green-500/40',
  'bg-amber-200 dark:bg-amber-500/40',
  'bg-purple-200 dark:bg-purple-500/40',
  'bg-pink-200 dark:bg-pink-500/40',
];

const MAX_VISUALIZED_TOKENS = 3000;

const currency = (value: number): string => {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
};

const Tokenizer: React.FC<TokenizerProps> = ({ value, onChange }) => {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [outputTokens, setOutputTokens] = useState(500);
  const [calls, setCalls] = useState(1);
  const [showTokens, setShowTokens] = useState(true);

  const [encoders, setEncoders] = useState<Partial<Record<Encoding, Encoder>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const loading = useRef(new Set<Encoding>());

  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];

  /**
   * Each BPE rank table is several megabytes, so they are fetched on demand and
   * only for the encoding the selected model actually uses. The old build
   * imported `encodingForModel` eagerly, which pulled every table into the main
   * bundle whether or not you ever opened this tool.
   */
  useEffect(() => {
    const encoding = model.encoding;
    if (encoders[encoding] || loading.current.has(encoding)) return;
    loading.current.add(encoding);

    (async () => {
      try {
        const { Tiktoken } = await import('js-tiktoken/lite');
        const ranks =
          encoding === 'o200k_base'
            ? (await import('js-tiktoken/ranks/o200k_base')).default
            : (await import('js-tiktoken/ranks/cl100k_base')).default;
        setEncoders((prev) => ({ ...prev, [encoding]: new Tiktoken(ranks) as Encoder }));
        setLoadError(null);
      } catch (e) {
        setLoadError(`Could not load the tokenizer: ${(e as Error).message}`);
      } finally {
        loading.current.delete(encoding);
      }
    })();
  }, [model.encoding, encoders]);

  const encoder = encoders[model.encoding];

  const { tokens, tokenCount } = useMemo(() => {
    if (!encoder || !value) return { tokens: [] as number[], tokenCount: 0 };
    const encoded = encoder.encode(value);
    return { tokens: encoded, tokenCount: Math.round(encoded.length * model.factor) };
  }, [encoder, value, model.factor]);

  const pieces = useMemo(() => {
    if (!encoder || !showTokens) return [];
    return tokens.slice(0, MAX_VISUALIZED_TOKENS).map((token) => encoder.decode([token]));
  }, [encoder, tokens, showTokens]);

  const inputCost = (tokenCount / 1_000_000) * model.input * calls;
  const outputCost = (outputTokens / 1_000_000) * model.output * calls;

  const stats = [
    { label: 'Tokens', value: tokenCount.toLocaleString() },
    { label: 'Characters', value: value.length.toLocaleString() },
    { label: 'Words', value: (value.trim() ? value.trim().split(/\s+/).length : 0).toLocaleString() },
    {
      label: 'Chars / token',
      value: tokenCount ? (value.length / tokenCount).toFixed(2) : '—',
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex-none flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Model</span>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary max-w-[15rem]"
          >
            {(['OpenAI', 'Anthropic'] as const).map((provider) => (
              <optgroup key={provider} label={provider}>
                {MODELS.filter((m) => m.provider === provider).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          ${model.input}/M in · ${model.output}/M out
        </span>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none ml-auto">
          <input
            type="checkbox"
            checked={showTokens}
            onChange={(e) => setShowTokens(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Show token boundaries
        </label>
        <button
          onClick={() => onChange('')}
          title="Clear"
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isEstimated(model) && (
        <p className="flex-none flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Anthropic does not publish a browser tokenizer, so this count is an estimate: the text
            is encoded with OpenAI’s cl100k and scaled by {model.factor}× to account for Claude’s
            newer tokenizer. Use the Anthropic count-tokens API endpoint when you need an exact
            figure.
          </span>
        </p>
      )}

      {loadError && (
        <p className="flex-none flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} /> {loadError}
        </p>
      )}

      <div className="flex-1 grid lg:grid-cols-[1fr_20rem] gap-3 min-h-[320px]">
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex-1 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[180px]">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Text</span>
              <CopyButton value={value} />
            </div>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
              placeholder="Paste a prompt, a document, or anything you are about to send to a model…"
              className="flex-1 w-full p-3 text-sm bg-white dark:bg-dark resize-none outline-none"
            />
          </div>

          {showTokens && pieces.length > 0 && (
            <div className="flex-none rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-56 flex flex-col">
              <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  How it splits
                </span>
                <span className="text-[11px] text-gray-400">
                  {tokens.length > MAX_VISUALIZED_TOKENS
                    ? `first ${MAX_VISUALIZED_TOKENS.toLocaleString()} tokens`
                    : 'colours alternate only to mark boundaries'}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-3 font-mono text-sm leading-7 break-all">
                {pieces.map((piece, i) => (
                  <span key={i} className={`${TOKEN_COLORS[i % TOKEN_COLORS.length]} rounded-sm`}>
                    {piece === '\n' ? '↵\n' : piece}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-3"
              >
                <span className="block text-[11px] uppercase tracking-wider text-gray-400">
                  {stat.label}
                </span>
                <span className="block text-xl font-bold tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Calculator size={13} /> Cost estimate
            </p>

            <label className="block text-sm">
              <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Expected output tokens
              </span>
              <input
                type="number"
                min={0}
                value={outputTokens}
                onChange={(e) => setOutputTokens(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Number of calls
              </span>
              <input
                type="number"
                min={1}
                value={calls}
                onChange={(e) => setCalls(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark text-sm"
              />
            </label>

            <dl className="text-sm space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Input</dt>
                <dd className="font-mono tabular-nums">{currency(inputCost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Output</dt>
                <dd className="font-mono tabular-nums">{currency(outputCost)}</dd>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-800 font-bold">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums text-primary">
                  {currency(inputCost + outputCost)}
                </dd>
              </div>
            </dl>

            {model.note && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{model.note}.</p>
            )}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-600 leading-relaxed">
            Prices as published on {PRICING_AS_OF}, per million tokens, standard rates.{' '}
            {PRICING_SOURCES.map((source, i) => (
              <React.Fragment key={source.url}>
                {i > 0 && ' · '}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary inline-flex items-center gap-0.5"
                >
                  {source.label}
                  <ExternalLink size={9} />
                </a>
              </React.Fragment>
            ))}
          </p>
        </aside>
      </div>
    </div>
  );
};

export default Tokenizer;
