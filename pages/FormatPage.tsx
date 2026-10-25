import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Trash2 } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import MonacoEditor from '../components/MonacoEditor';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';
import {
  fromCSV,
  fromXML,
  fromYAML,
  toCSV,
  toProperties,
  toTOML,
  toXML,
  toYAML,
} from '../utils/formatUtils';

const tool = TOOL_BY_PATH.get('/format-converter')!;

type Direction = 'from-json' | 'to-json';
type Format = 'yaml' | 'xml' | 'toml' | 'csv' | 'properties';

const FORMATS: { id: Format; label: string; monaco: string; reversible: boolean }[] = [
  { id: 'yaml', label: 'YAML', monaco: 'yaml', reversible: true },
  { id: 'xml', label: 'XML', monaco: 'xml', reversible: true },
  { id: 'csv', label: 'CSV', monaco: 'plaintext', reversible: true },
  { id: 'toml', label: 'TOML', monaco: 'ini', reversible: false },
  { id: 'properties', label: '.properties', monaco: 'ini', reversible: false },
];

const SAMPLE = `{
  "service": "checkout",
  "version": "1.0",
  "replicas": 3,
  "enabled": true,
  "ports": [8080, 8443],
  "env": {
    "LOG_LEVEL": "debug",
    "REGION": "eu-west-1"
  }
}`;

const FormatPage: React.FC = () => {
  const [input, setInput] = useLocalStorageState('formatInput', SAMPLE);
  const [format, setFormat] = useState<Format>('yaml');
  const [direction, setDirection] = useState<Direction>('from-json');
  const toast = useToast();

  const active = FORMATS.find((f) => f.id === format)!;

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: null as string | null };
    try {
      if (direction === 'from-json') {
        const data = JSON.parse(input);
        switch (format) {
          case 'yaml':
            return { output: toYAML(data), error: null };
          case 'xml':
            return { output: toXML(data), error: null };
          case 'toml':
            return { output: toTOML(data), error: null };
          case 'csv':
            return { output: toCSV(data), error: null };
          case 'properties':
            return { output: toProperties(data), error: null };
        }
      }

      const parsed =
        format === 'yaml' ? fromYAML(input) : format === 'xml' ? fromXML(input) : fromCSV(input);
      return { output: JSON.stringify(parsed, null, 2), error: null };
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [input, format, direction]);

  const swap = () => {
    if (!active.reversible) {
      toast.info(`${active.label} is one-way here — there is no unambiguous way back to JSON.`);
      return;
    }
    if (output) setInput(output);
    setDirection((d) => (d === 'from-json' ? 'to-json' : 'from-json'));
  };

  const sourceLanguage = direction === 'from-json' ? 'json' : active.monaco;
  const targetLanguage = direction === 'from-json' ? active.monaco : 'json';

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Converting between JSON and configuration formats</h2>
          <p>
            YAML, XML and CSV convert in both directions. TOML and{' '}
            <code>.properties</code> are one-way out of JSON: both lose information on the way out
            (TOML has no null, and <code>.properties</code> flattens every structure into dotted
            keys), so a reverse conversion would have to guess.
          </p>
          <h3>Why YAML needs quoting</h3>
          <p>
            In YAML, <code>version: 1.0</code> is a float, <code>zip: 007</code> is the number 7,
            and <code>answer: yes</code> is a boolean in YAML 1.1. If those started life as JSON
            strings they have to be quoted on the way out or the round trip changes their type —
            this converter quotes them for you.
          </p>
          <h3>XML has no null</h3>
          <p>
            A JSON <code>null</code> becomes an empty element. The common alternative,{' '}
            <code>xsi:nil="true"</code>, is only valid when the <code>xsi</code> namespace is
            declared, which is why an empty element is used here instead.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 gap-3 p-2 min-h-[420px]">
        <div className="flex-none flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFormat(f.id);
                  if (!f.reversible) setDirection('from-json');
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  format === f.id
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span>{direction === 'from-json' ? 'JSON' : active.label}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={swap}
              title={active.reversible ? 'Swap direction' : `${active.label} is one-way`}
              className={!active.reversible ? 'opacity-40' : ''}
            >
              <ArrowLeftRight size={16} />
            </Button>
            <span>{direction === 'from-json' ? active.label : 'JSON'}</span>
          </div>

          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setInput('')} icon={<Trash2 size={14} />}>
            Clear
          </Button>
        </div>

        <div className="flex-1 grid lg:grid-cols-2 gap-3 min-h-[320px]">
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {sourceLanguage === 'json' ? 'JSON' : active.label} input
              </span>
            </div>
            <div className="flex-1 min-h-[260px]">
              <MonacoEditor
                value={input}
                onChange={(value) => setInput(value ?? '')}
                language={sourceLanguage}
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {targetLanguage === 'json' ? 'JSON' : active.label} output
              </span>
              <CopyButton value={output} label="Copy" />
            </div>
            <div className="flex-1 min-h-[260px] relative">
              {error ? (
                <div className="absolute inset-0 p-4 overflow-auto">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                    Could not convert
                  </p>
                  <pre className="text-xs font-mono text-red-500 whitespace-pre-wrap">{error}</pre>
                </div>
              ) : (
                <MonacoEditor value={output} onChange={() => {}} language={targetLanguage} readOnly />
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default FormatPage;
