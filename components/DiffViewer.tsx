import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import {
  ArrowLeftRight,
  Braces,
  ChevronDown,
  ChevronUp,
  Columns2,
  Rows2,
  Trash2,
} from 'lucide-react';
import '../lib/monaco';

interface DiffViewerProps {
  original: string;
  modified: string;
  originalTitle: string;
  modifiedTitle: string;
  onOriginalChange: (value: string) => void;
  onModifiedChange: (value: string) => void;
  onOriginalTitleChange: (value: string) => void;
  onModifiedTitleChange: (value: string) => void;
  onNotify?: (message: string) => void;
}

const LANGUAGES = [
  { id: 'plaintext', label: 'Text' },
  { id: 'json', label: 'JSON' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'xml', label: 'XML' },
  { id: 'yaml', label: 'YAML' },
  { id: 'sql', label: 'SQL' },
  { id: 'markdown', label: 'Markdown' },
];

/**
 * Side-by-side diff built on Monaco's own diff editor.
 *
 * The focus here is moving between changes: a live count, prev/next that wrap
 * around, and F7 / Shift+F7 bound the way editors normally bind them. Monaco
 * computes the diff in a worker, so a large file does not block typing.
 */
const DiffViewer: React.FC<DiffViewerProps> = ({
  original,
  modified,
  originalTitle,
  modifiedTitle,
  onOriginalChange,
  onModifiedChange,
  onOriginalTitleChange,
  onModifiedTitleChange,
  onNotify,
}) => {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<any>(null);

  const [language, setLanguage] = useState('plaintext');
  const [inline, setInline] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const [cursor, setCursor] = useState(0);

  // `automaticLayout` is off (it polls on a timer and fights the flex layout),
  // so the size is pushed in explicitly. Passing the observed box matters:
  // a bare layout() makes Monaco measure its own wrapper, which is still
  // zero-height on the frame it mounts in, and nothing re-measures it after.
  useEffect(() => {
    const node = containerRef.current;
    if (!instance || !node) return;

    const applySize = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width > 0 && height > 0) instance.layout({ width, height });
    };

    const observer = new ResizeObserver(() => window.requestAnimationFrame(applySize));
    observer.observe(node);
    applySize();
    return () => observer.disconnect();
  }, [instance]);

  // Keep the change count in step with what the diff worker produces.
  useEffect(() => {
    if (!instance) return;
    const update = () => {
      const changes = instance.getLineChanges?.() ?? [];
      setChangeCount(changes.length);
      setCursor((current) => (changes.length ? Math.min(current, changes.length - 1) : 0));
    };
    update();
    const subscription = instance.onDidUpdateDiff?.(update);
    return () => subscription?.dispose?.();
  }, [instance]);

  const goTo = useCallback(
    (direction: 'next' | 'previous') => {
      const editor = editorRef.current;
      const changes = editor?.getLineChanges?.() ?? [];
      if (!editor || !changes.length) return;

      setCursor((current) => {
        const next =
          direction === 'next'
            ? (current + 1) % changes.length
            : (current - 1 + changes.length) % changes.length;

        const change = changes[next];
        const line =
          change.modifiedStartLineNumber > 0
            ? change.modifiedStartLineNumber
            : change.originalStartLineNumber;

        const target = editor.getModifiedEditor();
        target.revealLineInCenter(line);
        target.setPosition({ lineNumber: Math.max(1, line), column: 1 });
        target.focus();
        return next;
      });
    },
    []
  );

  // F7 / Shift+F7 are the conventional "next/previous difference" keys.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F7') return;
      e.preventDefault();
      goTo(e.shiftKey ? 'previous' : 'next');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo]);

  const swapSides = () => {
    onOriginalChange(modified);
    onModifiedChange(original);
    onOriginalTitleChange(modifiedTitle);
    onModifiedTitleChange(originalTitle);
  };

  const formatBoth = () => {
    try {
      onOriginalChange(JSON.stringify(JSON.parse(original), null, 2));
      onModifiedChange(JSON.stringify(JSON.parse(modified), null, 2));
      setLanguage('json');
      onNotify?.('Both sides formatted as JSON — now the diff shows real changes, not formatting.');
    } catch {
      onNotify?.('Both sides need to be valid JSON to format them.');
    }
  };

  const identical = original === modified && original.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex-none flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark overflow-hidden">
          <button
            onClick={() => goTo('previous')}
            disabled={!changeCount}
            title="Previous difference (Shift+F7)"
            className="px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          <span className="px-2 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-300 whitespace-nowrap min-w-[5.5rem] text-center">
            {changeCount ? `${cursor + 1} of ${changeCount}` : 'no changes'}
          </span>
          <button
            onClick={() => goTo('next')}
            disabled={!changeCount}
            title="Next difference (F7)"
            className="px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Syntax"
          className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setInline((v) => !v)}
          title={inline ? 'Switch to side-by-side' : 'Switch to inline'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors"
        >
          {inline ? <Rows2 size={15} /> : <Columns2 size={15} />}
          <span className="hidden sm:inline">{inline ? 'Inline' : 'Split'}</span>
        </button>

        <label
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none cursor-pointer"
          title="Treat lines that differ only in spacing as equal"
        >
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="hidden sm:inline">Ignore whitespace</span>
          <span className="sm:hidden">WS</span>
        </label>

        <div className="flex-1" />

        <button
          onClick={formatBoth}
          title="Pretty-print both sides as JSON so formatting differences disappear"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Braces size={15} />
          <span className="hidden md:inline">Format both</span>
        </button>
        <button
          onClick={swapSides}
          title="Swap the two sides"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeftRight size={15} />
          <span className="hidden md:inline">Swap</span>
        </button>
        <button
          onClick={() => {
            onOriginalChange('');
            onModifiedChange('');
          }}
          title="Clear both sides"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {identical && (
        <p className="flex-none text-sm text-center py-1.5 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900">
          The two sides are identical.
        </p>
      )}

      <div className="flex-none grid grid-cols-2 gap-2">
        <input
          value={originalTitle}
          onChange={(e) => onOriginalTitleChange(e.target.value)}
          aria-label="Left side label"
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          value={modifiedTitle}
          onChange={(e) => onModifiedTitleChange(e.target.value)}
          aria-label="Right side label"
          className={`px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary ${
            inline ? 'opacity-40' : ''
          }`}
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-[320px] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <DiffEditor
          height="100%"
          language={language}
          original={original}
          modified={modified}
          onMount={(editor) => {
            editorRef.current = editor;
            setInstance(editor);

            // The diff editor exposes two plain editors; wire both back to state
            // so either side can be edited in place.
            editor.getOriginalEditor().onDidChangeModelContent(() => {
              onOriginalChange(editor.getOriginalEditor().getValue());
            });
            editor.getModifiedEditor().onDidChangeModelContent(() => {
              onModifiedChange(editor.getModifiedEditor().getValue());
            });
          }}
          options={{
            renderSideBySide: !inline,
            ignoreTrimWhitespace: ignoreWhitespace,
            originalEditable: true,
            readOnly: false,
            automaticLayout: false,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            renderOverviewRuler: true,
            diffWordWrap: 'on',
            padding: { top: 12, bottom: 12 },
          }}
          loading={
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Loading diff…
            </div>
          }
        />
      </div>

      <p className="flex-none text-xs text-gray-400 dark:text-gray-600 text-center">
        Both sides are editable. <kbd className="px-1 rounded bg-gray-100 dark:bg-gray-800">F7</kbd>{' '}
        next difference, <kbd className="px-1 rounded bg-gray-100 dark:bg-gray-800">Shift+F7</kbd>{' '}
        previous.
      </p>
    </div>
  );
};

export default DiffViewer;
