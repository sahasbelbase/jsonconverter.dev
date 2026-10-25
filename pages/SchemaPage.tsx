import React, { useMemo, useState } from 'react';
import { CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import MonacoEditor from '../components/MonacoEditor';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';
import { inferSchema, validate } from '../utils/schemaUtils';

const tool = TOOL_BY_PATH.get('/json-schema')!;

type Mode = 'infer' | 'validate';

const SAMPLE = `{
  "id": "6f1b8d9e-2c3a-4f5b-9a7c-1d2e3f4a5b6c",
  "email": "ada@example.com",
  "createdAt": "2026-03-01T09:30:00Z",
  "score": 42,
  "active": true,
  "tags": ["admin", "beta"]
}`;

const SchemaPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('infer');
  const [document, setDocument] = useLocalStorageState('schemaDocument', SAMPLE);
  const [schemaText, setSchemaText] = useLocalStorageState('schemaText', '');
  const [detectFormats, setDetectFormats] = useState(true);
  const toast = useToast();

  const inferred = useMemo(() => {
    if (mode !== 'infer' || !document.trim()) return { text: '', error: null as string | null };
    try {
      return {
        text: JSON.stringify(inferSchema(JSON.parse(document), { detectFormats }), null, 2),
        error: null,
      };
    } catch (e) {
      return { text: '', error: `Document is not valid JSON — ${(e as Error).message}` };
    }
  }, [mode, document, detectFormats]);

  const validation = useMemo(() => {
    if (mode !== 'validate' || !document.trim() || !schemaText.trim()) return null;
    try {
      const data = JSON.parse(document);
      const schema = JSON.parse(schemaText);
      return { errors: validate(data, schema), parseError: null as string | null };
    } catch (e) {
      return { errors: [], parseError: (e as Error).message };
    }
  }, [mode, document, schemaText]);

  const useInferredSchema = () => {
    if (!inferred.text) return;
    setSchemaText(inferred.text);
    setMode('validate');
    toast.success('Schema copied into the validator.');
  };

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Start from a sample, not a blank page</h2>
          <p>
            Paste a representative document and the generator walks it to produce a draft 2020-12
            schema: every key present becomes <code>required</code>, arrays get a single unified{' '}
            <code>items</code> schema, and strings that look like a date, email, URI, UUID or IPv4
            address pick up a <code>format</code>.
          </p>
          <p>
            Treat the result as a first draft. A generator can only see the one document you gave
            it, so it cannot know which fields are genuinely optional, what the real bounds are, or
            which strings belong to an enum. Loosening <code>required</code> is usually the first
            edit you will make.
          </p>
          <h3>What the validator checks</h3>
          <p>
            <code>type</code>, <code>required</code>, <code>enum</code>, <code>properties</code>,{' '}
            <code>additionalProperties</code>, <code>items</code>, the string keywords (
            <code>minLength</code>, <code>maxLength</code>, <code>pattern</code>), the numeric ones
            (<code>minimum</code>, <code>maximum</code>, the exclusive variants,{' '}
            <code>multipleOf</code>) and the array ones (<code>minItems</code>,{' '}
            <code>maxItems</code>, <code>uniqueItems</code>).
          </p>
          <p>
            It does <strong>not</strong> resolve <code>$ref</code>, evaluate{' '}
            <code>if/then/else</code>, or assert <code>format</code>. For those, run your schema
            through a full validator such as Ajv in CI.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 gap-3 p-2 min-h-[420px]">
        <div className="flex-none flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {([
              ['infer', 'Generate schema'],
              ['validate', 'Validate against schema'],
            ] as [Mode, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === id
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'infer' && (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={detectFormats}
                  onChange={(e) => setDetectFormats(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Detect formats
              </label>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="secondary"
                onClick={useInferredSchema}
                disabled={!inferred.text}
                icon={<Sparkles size={14} />}
              >
                Use it to validate
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 grid lg:grid-cols-2 gap-3 min-h-[320px]">
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                JSON document
              </span>
            </div>
            <div className="flex-1 min-h-[260px]">
              <MonacoEditor
                value={document}
                onChange={(value) => setDocument(value ?? '')}
                language="json"
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {mode === 'infer' ? 'Generated schema' : 'Your schema'}
              </span>
              {mode === 'infer' && <CopyButton value={inferred.text} label="Copy" />}
            </div>
            <div className="flex-1 min-h-[260px] relative">
              {mode === 'infer' ? (
                inferred.error ? (
                  <p className="p-4 text-sm text-red-600 dark:text-red-400">{inferred.error}</p>
                ) : (
                  <MonacoEditor value={inferred.text} onChange={() => {}} language="json" readOnly />
                )
              ) : (
                <MonacoEditor
                  value={schemaText}
                  onChange={(value) => setSchemaText(value ?? '')}
                  language="json"
                />
              )}
            </div>
          </div>
        </div>

        {mode === 'validate' && validation && (
          <div className="flex-none rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-56 flex flex-col">
            <div className="flex-none h-9 px-3 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              {validation.parseError ? (
                <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <XCircle size={15} /> {validation.parseError}
                </span>
              ) : validation.errors.length === 0 ? (
                <span className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 size={15} /> The document is valid against this schema.
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                  <XCircle size={15} /> {validation.errors.length} problem
                  {validation.errors.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <ul className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
              {validation.errors.map((error, i) => (
                <li key={i} className="px-3 py-1.5 flex items-start gap-3 text-sm">
                  <code className="font-mono text-xs text-primary shrink-0">{error.path}</code>
                  <span className="text-gray-600 dark:text-gray-300">{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ToolShell>
  );
};

export default SchemaPage;
