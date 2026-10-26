import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Upload, FileJson, Check, AlertCircle,
  Code, Network, Wand2, Braces, Minimize2, ArrowRightLeft,
  FileCode2, Trash2, ShieldAlert, Copy, Columns, Search, X,
  ClipboardPaste, Quote, FileText, ChevronsUpDown, ChevronsDownUp
} from 'lucide-react';
import Button from './Button';
import JsonTreeView from './JsonTreeView';
import MonacoEditor from './MonacoEditor';
import { JsonStats } from '../types';
import { fixJson, unescapeString, getErrorLocation, analyzeJsonError } from '../utils/jsonUtils';
import { useJsonWorker } from '../lib/useJsonWorker';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  error?: string | null;
}

type TabMode = 'code' | 'upload' | 'tree';

interface ErrorLoc {
  line: number;
  column: number;
}

const InputArea: React.FC<InputAreaProps> = ({ value, onChange, onProcess, isProcessing, error: parentError }) => {
  const [mode, setMode] = useState<TabMode>('code');
  const [isSplitView, setIsSplitView] = useState(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [activePane, setActivePane] = useState<'editor' | 'tree'>('editor');

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search State
  const [showTreeSearch, setShowTreeSearch] = useState(false);
  const [treeSearchTerm, setTreeSearchTerm] = useState('');
  const treeSearchInputRef = useRef<HTMLInputElement>(null);

  // Tree View State
  const [expansion, setExpansion] = useState<{ mode: 'expand' | 'collapse'; version: number }>({
    mode: 'expand',
    version: 0,
  });
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);
  const [treeCopySuccess, setTreeCopySuccess] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setExpansion((prev) => ({
      mode: isTreeExpanded ? 'collapse' : 'expand',
      version: prev.version + 1,
    }));
    setIsTreeExpanded((v) => !v);
  }, [isTreeExpanded]);

  const [copySuccess, setCopySuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [errorLoc, setErrorLoc] = useState<ErrorLoc | null>(null);
  const [stats, setStats] = useState<JsonStats | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [parsedJson, setParsedJson] = useState<any>(null);

  // Monaco Ref
  const editorRef = useRef<any>(null);
  const decorationIdsRef = useRef<string[]>([]);

  // Active Error Helper
  const activeError = parentError || localError;

  // Detect dark mode from html class
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- Actions Wrapped in useCallback for Effect dependencies ---

  const handleProcessClick = useCallback(() => {
    onProcess();
  }, [onProcess]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }, [value]);

  const handleCopyTree = useCallback(async () => {
    if (!parsedJson) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(parsedJson, null, 2));
      setTreeCopySuccess(true);
      setTimeout(() => setTreeCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy tree', err);
    }
  }, [parsedJson]);

  const clearInput = useCallback(() => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onChange]);


  // --- Shortcuts Handler ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + Enter: Process
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        // Only process if we have value and no error
        if (value.trim() && !activeError) {
          handleProcessClick();
        }
        return;
      }

      // Ctrl + C: Smart Copy (Copy All if no selection)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        // Check standard DOM selection
        const domSelection = window.getSelection()?.toString();

        // Check Monaco selection if focused
        let monacoHasSelection = false;
        if (editorRef.current && editorRef.current.hasTextFocus()) {
          const selection = editorRef.current.getSelection();
          if (selection && !selection.isEmpty()) {
            monacoHasSelection = true;
          }
        }

        // Only trigger Copy All if NO text is selected anywhere
        if (!domSelection && !monacoHasSelection && value) {
          e.preventDefault();
          copyToClipboard();
          return;
        }
      }

      // Ctrl + X: Smart Clear (Clear All if no selection)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
        // Check standard DOM selection
        const domSelection = window.getSelection()?.toString();

        // Check Monaco selection if focused
        let monacoHasSelection = false;
        if (editorRef.current && editorRef.current.hasTextFocus()) {
          const selection = editorRef.current.getSelection();
          if (selection && !selection.isEmpty()) {
            monacoHasSelection = true;
          }
        }

        // Only trigger Clear All if NO text is selected anywhere (avoids accidental clears when trying to Cut)
        if (!domSelection && !monacoHasSelection && value) {
          e.preventDefault();
          clearInput();
          return;
        }
      }

      // Ctrl + F: Search
      if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        // If editor has focus, let Monaco handle Ctrl+F internally
        if (editorRef.current && editorRef.current.hasTextFocus()) {
          return;
        }

        if (isSplitView) {
          if (activePane === 'editor') {
            e.preventDefault();
            editorRef.current?.focus();
            editorRef.current?.trigger('source', 'actions.find');
          } else {
            e.preventDefault();
            setShowTreeSearch(true);
            setTimeout(() => treeSearchInputRef.current?.focus(), 50);
          }
          return;
        }

        if (mode === 'tree') {
          e.preventDefault();
          setShowTreeSearch(true);
          setTimeout(() => treeSearchInputRef.current?.focus(), 50);
        } else if (mode === 'code') {
          // If editor visible but not focused, focus and trigger find
          if (editorRef.current) {
            e.preventDefault();
            editorRef.current.focus();
            editorRef.current.trigger('source', 'actions.find');
          }
        }
      }

      if (e.key === 'Escape' && showTreeSearch) {
        setShowTreeSearch(false);
        setTreeSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isSplitView, showTreeSearch, value, handleProcessClick, activePane, activeError, copyToClipboard, clearInput]);

  // Live validation & stats, off the main thread.
  //
  // JSON.parse plus a full stats walk on every keystroke used to block
  // rendering — a 100 KB paste froze the tab for about two seconds. The worker
  // does both, and a reply is ignored if the text has moved on since.
  const runJson = useJsonWorker();
  const validationSeq = useRef(0);

  useEffect(() => {
    setLocalError(null);
    setErrorSuggestion(null);
    setErrorLoc(null);

    if (!value.trim()) {
      setStats(null);
      setParsedJson(null);
      setIsValidating(false);
      return;
    }

    // A longer debounce for a big document: there is no point validating on
    // every keystroke of a file the user is still pasting into.
    const delay = value.length > 200_000 ? 600 : 300;
    const seq = ++validationSeq.current;
    setIsValidating(true);

    const timer = setTimeout(async () => {
      const response = await runJson('validate', value);
      if (seq !== validationSeq.current) return; // superseded
      setIsValidating(false);

      if (response.ok && response.kind === 'validate') {
        setParsedJson(response.parsed);
        setStats(response.stats);
        return;
      }

      if (response.ok) return;

      setParsedJson(null);
      setStats(null);
      setLocalError(response.message);
      setErrorSuggestion(analyzeJsonError(new Error(response.message), value));
      setErrorLoc(response.position !== null ? getErrorLocation(value, response.position) : null);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, runJson]);

  // Auto-scroll and Highlight error location
  useEffect(() => {
    if (editorRef.current) {
      if (activeError && errorLoc) {
        if (mode === 'code' || isSplitView) {
          editorRef.current.revealPositionInCenter({
            lineNumber: errorLoc.line,
            column: errorLoc.column
          });
        }

        const newDecorations = [
          {
            range: {
              startLineNumber: errorLoc.line,
              startColumn: errorLoc.column,
              endLineNumber: errorLoc.line,
              endColumn: errorLoc.column + 1
            },
            options: {
              isWholeLine: false,
              className: 'monaco-error-highlighter cursor-help',
              hoverMessage: { value: `**Error**: ${activeError}` },
              glyphMarginClassName: 'bg-red-500 rounded-full w-3 h-3 ml-1 mt-1', // Error dot in gutter
              minimap: { color: '#ef4444', position: 1 } // Highlight in minimap
            }
          },
          {
            range: {
              startLineNumber: errorLoc.line,
              startColumn: 1,
              endLineNumber: errorLoc.line,
              endColumn: 1
            },
            options: {
              isWholeLine: true,
              className: 'monaco-error-line'
            }
          }
        ];
        decorationIdsRef.current = editorRef.current.deltaDecorations(decorationIdsRef.current, newDecorations);

      } else {
        if (decorationIdsRef.current.length > 0) {
          decorationIdsRef.current = editorRef.current.deltaDecorations(decorationIdsRef.current, []);
        }
      }
    }
  }, [errorLoc, activeError, mode, isSplitView]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  }, []);

  const handleFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setLocalError(`"${file.name}" is not a .json file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
      setMode('code');
      if (window.innerWidth > 1024) setIsSplitView(true);
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch (err) {
      console.error('Failed to paste', err);
    }
  };

  const formatJson = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
      return;
    }
    if (!parsedJson) return;
    onChange(JSON.stringify(parsedJson, null, 2));
  };

  const minifyJson = () => {
    if (!parsedJson) return;
    onChange(JSON.stringify(parsedJson));
  };

  const handleFixJson = () => {
    const fixed = fixJson(value);
    onChange(fixed);
    if (mode === 'tree' && !isSplitView) setMode('code');
  };

  const handleUnescape = () => {
    const unescaped = unescapeString(value);
    onChange(unescaped);
  };

  const handleEscape = () => {
    onChange(JSON.stringify(value));
  };

  const loadExample = () => {
    const example = {
      "project": "JSON Converter",
      "version": 1.0,
      "users": [
        { "id": 1, "name": "Dev", "active": true },
        { "id": 2, "name": "Test", "active": false }
      ]
    };
    onChange(JSON.stringify(example, null, 2));
    setMode('code');
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Top Toolbar — sticky so the mode tabs and actions stay in reach while
          the card scrolls on a short screen. */}
      <div className="flex-none sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto max-w-full">
          <button
            onClick={() => { setMode('code'); setIsSplitView(false); }}
            className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${mode === 'code' && !isSplitView
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            <Code size={16} className="mr-2" /> Code
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${mode === 'upload'
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            <Upload size={16} className="mr-2" /> Upload
          </button>

          <button
            onClick={() => { setMode('tree'); setIsSplitView(false); }}
            className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all lg:hidden whitespace-nowrap ${mode === 'tree'
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
          >
            <Network size={16} className="mr-2" /> Tree
          </button>

          <button
            onClick={() => { setIsSplitView(!isSplitView); setMode('code'); }}
            className={`hidden lg:flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${isSplitView
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            title="Split View (Editor + Tree)"
          >
            <Columns size={16} className="mr-2" /> Split
          </button>
        </div>

        {(mode === 'code' || isSplitView) && (
          <div className="flex flex-wrap gap-1 items-center">
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />

            <button onClick={handlePaste} title="Paste from Clipboard" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors sm:hidden">
              <ClipboardPaste size={16} />
            </button>

            <button onClick={formatJson} disabled={!!activeError && !parsedJson} title="Format (Prettify)" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-colors">
              <Braces size={14} />
              <span className="hidden lg:inline">Format</span>
            </button>
            <button onClick={minifyJson} disabled={!!activeError} title="Minify (Remove spaces)" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-colors">
              <Minimize2 size={14} />
              <span className="hidden lg:inline">Minify</span>
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />

            <button onClick={handleFixJson} title="Auto fix missing brackets, quotes, and commas" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors ring-1 ring-blue-100 dark:ring-blue-900">
              <Wand2 size={14} />
              <span className="hidden lg:inline">Auto-Fix</span>
            </button>
            <button onClick={handleUnescape} title="Unescape JSON string (remove backslashes)" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <FileText size={14} />
              <span className="hidden lg:inline">Unescape</span>
            </button>
            <button onClick={handleEscape} title="Escape JSON into a string (add backslashes)" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <Quote size={14} />
              <span className="hidden lg:inline">Escape</span>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
            <button onClick={copyToClipboard} title="Copy All (Ctrl+C if no selection)" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              {copySuccess ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span className="hidden lg:inline">{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>
            <button onClick={clearInput} title="Clear All (Ctrl+X if no selection)" className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
              <Trash2 size={14} />
              <span className="hidden lg:inline">Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor / Viewer Container */}
      <div
        className={`flex-1 min-h-0 relative rounded-xl border-2 transition-colors duration-200 overflow-hidden flex shadow-inner ${isDragOver
          ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
          : activeError
            ? 'border-red-300 dark:border-red-800 bg-white dark:bg-dark-secondary'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-secondary'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-blue-900/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-full mb-4 shadow-lg animate-bounce">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
              Drop JSON File Here
            </h3>
          </div>
        )}

        {/* --- LEFT PANE (Editor) --- */}
        {(mode === 'code' || isSplitView) && (
          <div
            className={`flex flex-col relative h-full group ${isSplitView ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}
            onClick={() => setActivePane('editor')}
          >
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <MonacoEditor
                value={value}
                onChange={(val) => onChange(val || '')}
                theme={isDarkMode ? 'dark' : 'light'}
                onMount={handleEditorMount}
                options={{
                  glyphMargin: true, // Enable gutter for error icons
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3
                }}
              />

              {/* Empty State Overlay */}
              {!value && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-gray-300 dark:text-gray-600 flex flex-col items-center">
                    <FileJson className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-lg font-medium">Paste JSON here</span>
                    <span className="text-xs mt-1">or Drag & Drop file</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className={`flex-none px-4 py-2 text-xs flex justify-between items-center border-t transition-colors duration-200 ${activeError
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
              <div className="flex items-center gap-3 overflow-hidden w-full">
                {activeError ? (
                  <ShieldAlert size={16} className="shrink-0 text-red-600 dark:text-red-400" />
                ) : isValidating ? (
                  <span className="shrink-0 w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                ) : (
                  <Check size={14} className="text-green-500 shrink-0" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 truncate w-full">
                  <span
                    className={`font-mono font-bold ${
                      activeError
                        ? 'text-red-700 dark:text-red-300'
                        : isValidating
                          ? 'text-gray-500'
                          : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {activeError
                      ? 'Invalid JSON'
                      : isValidating
                        ? 'Checking…'
                        : value.trim()
                          ? 'Valid JSON'
                          : 'Empty'}
                  </span>

                  {activeError && (
                    <div className="flex flex-wrap gap-2 items-center text-red-600 dark:text-red-300 w-full overflow-hidden">
                      {errorLoc && (
                        <span className="font-mono bg-red-100 dark:bg-red-800/50 px-1.5 py-0.5 rounded text-red-800 dark:text-red-100 shrink-0 border border-red-200 dark:border-red-700">
                          Ln {errorLoc.line}, Col {errorLoc.column}
                        </span>
                      )}
                      <span className="truncate flex-1" title={activeError}>
                        {activeError}
                      </span>
                      {errorSuggestion && (
                        <span className="hidden md:inline-block text-red-700 dark:text-red-200 font-medium bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded border-l-2 border-red-500">
                          💡 {errorSuggestion}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {stats && !activeError && (
                <div className="hidden sm:flex gap-4 font-mono">
                  <span title="File Size">💾 {stats.size}</span>
                  <span title="Total Keys">🔑 {stats.keys}</span>
                  <span title="Nesting Depth">📚 {stats.depth}</span>
                  <span title="Objects">📦 {stats.objects}</span>
                  <span title="Arrays">📋 {stats.arrays}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- RIGHT PANE (Tree View) --- */}
        {(mode === 'tree' || isSplitView) && (
          <div
            className={`flex flex-col h-full bg-gray-50 dark:bg-black/20 ${isSplitView ? 'w-1/2' : 'w-full'}`}
            onClick={() => setActivePane('tree')}
          >
            <div className="flex-none h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-2 bg-gray-100 dark:bg-gray-800/50 justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2">JSON Tree</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleExpand}
                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={isTreeExpanded ? "Collapse All" : "Expand All"}
                >
                  {isTreeExpanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                <button
                  onClick={handleCopyTree}
                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy JSON"
                >
                  {treeCopySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                {showTreeSearch ? (
                  <div className="flex items-center bg-white dark:bg-gray-900 rounded-md border border-primary/50 overflow-hidden h-7 animate-in fade-in slide-in-from-right-4 duration-200">
                    <Search size={14} className="text-gray-400 ml-2" />
                    <input
                      ref={treeSearchInputRef}
                      type="text"
                      className="w-32 sm:w-48 text-xs px-2 py-1 outline-none bg-transparent dark:text-white"
                      placeholder="Find Key/Value..."
                      value={treeSearchTerm}
                      onChange={(e) => setTreeSearchTerm(e.target.value)}
                      onKeyDown={(e) => { e.stopPropagation(); }}
                    />
                    <button onClick={() => { setTreeSearchTerm(''); setShowTreeSearch(false); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowTreeSearch(true); setTimeout(() => treeSearchInputRef.current?.focus(), 50); }}
                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Search Tree (Ctrl+F)"
                  >
                    <Search size={16} />
                  </button>
                )}
              </div>
            </div>

            <div id="tree-pane-scroll" className="flex-1 min-h-0 overflow-auto p-0 relative scrollbar-visible">
              {parsedJson ? (
                <JsonTreeView
                  data={parsedJson}
                  searchTerm={treeSearchTerm}
                  expansion={expansion}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <AlertCircle size={48} className="mb-2 opacity-50" />
                  <p>Invalid or empty JSON</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'upload' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-dark-secondary z-10">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Drag & Drop JSON File
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              Upload a .json file to automatically load it into the editor and view the contents.
            </p>
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                icon={<FileJson size={18} />}
                size="lg"
              >
                Browse Files
              </Button>
              <Button variant="secondary" onClick={loadExample} size="lg">
                Load Example
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-none flex justify-end pt-2">
        <Button
          onClick={handleProcessClick}
          disabled={!value.trim() || !!activeError}
          isLoading={isProcessing}
          className="w-full sm:w-auto shadow-lg shadow-blue-500/20"
          size="lg"
          title="Shortcut: Ctrl + Enter"
        >
          Convert to Excel / CSV
        </Button>
      </div>
    </div>
  );
};

export default InputArea;