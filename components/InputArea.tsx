import React, { useCallback, useState, useRef, useEffect } from 'react';
import { 
  Upload, FileJson, Check, AlertCircle, 
  Code, Network, Wand2, Braces, Minimize2, ArrowRightLeft, 
  FileCode2, Trash2, ShieldAlert, Copy, Columns, Search, X
} from 'lucide-react';
import Button from './Button';
import JsonTreeView from './JsonTreeView';
import MonacoEditor from './MonacoEditor';
import { JsonStats } from '../types';
import { getJsonStats, fixJson, unescapeString, getErrorLocation } from '../utils/jsonUtils';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search State
  const [showTreeSearch, setShowTreeSearch] = useState(false);
  const [treeSearchTerm, setTreeSearchTerm] = useState('');
  const treeSearchInputRef = useRef<HTMLInputElement>(null);

  const [copySuccess, setCopySuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorLoc, setErrorLoc] = useState<ErrorLoc | null>(null);
  const [stats, setStats] = useState<JsonStats | null>(null);
  const [parsedJson, setParsedJson] = useState<any>(null);
  
  // Monaco Ref
  const editorRef = useRef<any>(null);
  
  // Detect dark mode from html class
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Shortcut Handler (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // If Monaco is focused, let Monaco handle it (it has its own widget)
        if (editorRef.current && editorRef.current.hasTextFocus()) {
          return; 
        }

        // If in Tree View or Split View, toggle our custom search
        if (mode === 'tree' || isSplitView) {
          e.preventDefault();
          setShowTreeSearch(true);
          setTimeout(() => treeSearchInputRef.current?.focus(), 50);
        }
      }
      // Esc to close search
      if (e.key === 'Escape' && showTreeSearch) {
        setShowTreeSearch(false);
        setTreeSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isSplitView, showTreeSearch]);

  // Live Validation & Stats
  useEffect(() => {
    if (!value.trim()) {
      setLocalError(null);
      setErrorLoc(null);
      setStats(null);
      setParsedJson(null);
      return;
    }
    
    // Debounce validation
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(value);
        setLocalError(null);
        setErrorLoc(null);
        setParsedJson(parsed);
        setStats(getJsonStats(parsed));
      } catch (e: any) {
        setLocalError(e.message);
        setStats(null);
        setParsedJson(null);
        
        // Extract position from error message "at position X"
        const match = e.message.match(/position (\d+)/);
        if (match && match[1]) {
          const pos = parseInt(match[1], 10);
          setErrorLoc(getErrorLocation(value, pos));
        } else {
            setErrorLoc(null);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const activeError = parentError || localError;

  // Auto-scroll to error location
  useEffect(() => {
    if (activeError && errorLoc && editorRef.current) {
      if (mode === 'code' || isSplitView) {
        editorRef.current.revealPositionInCenter({ 
          lineNumber: errorLoc.line, 
          column: errorLoc.column 
        });
        editorRef.current.setPosition({ 
          lineNumber: errorLoc.line, 
          column: errorLoc.column 
        });
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
      alert("Please upload a valid JSON file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
      setMode('code'); // Switch to code view to see result
      // Auto enable split view on upload for better UX
      if (window.innerWidth > 1024) setIsSplitView(true);
    };
    reader.readAsText(file);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Tools Logic
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
  };

  const handleUnescape = () => {
    const unescaped = unescapeString(value);
    onChange(unescaped);
  };

  const handleEscape = () => {
    onChange(JSON.stringify(value));
  };

  const clearInput = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadExample = () => {
    const example = {
      "project": "JSON Converter",
      "version": 1.0,
      "features": ["Validation", "Formatting", "Export"],
      "users": [
        { "id": 1, "name": "Dev", "active": true },
        { "id": 2, "name": "Test", "active": false }
      ],
      "settings": {
        "theme": "dark",
        "notifications": null
      }
    };
    onChange(JSON.stringify(example, null, 2));
    setMode('code');
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Toolbar */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => { setMode('code'); setIsSplitView(false); }}
            className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'code' && !isSplitView
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Code size={16} className="mr-2" /> Code
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'upload' 
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Upload size={16} className="mr-2" /> Upload
          </button>
          
          <button
            onClick={() => { setMode('tree'); setIsSplitView(false); }}
             className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all lg:hidden ${
              mode === 'tree' 
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Network size={16} className="mr-2" /> Tree
          </button>

          {/* Desktop Split View Toggle */}
          <button
            onClick={() => { setIsSplitView(!isSplitView); setMode('code'); }}
            className={`hidden lg:flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              isSplitView
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Split View (Editor + Tree)"
          >
            <Columns size={16} className="mr-2" /> Split
          </button>
        </div>

        {(mode === 'code' || isSplitView) && (
          <div className="flex flex-wrap gap-1">
             <button onClick={formatJson} disabled={!!activeError && !parsedJson} title="Format (Prettify)" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-colors">
                <Braces size={16} />
             </button>
             <button onClick={minifyJson} disabled={!!activeError} title="Minify" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-colors">
                <Minimize2 size={16} />
             </button>
             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
             <button onClick={handleFixJson} title="Auto Fix Quotes/Commas" className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors">
                <Wand2 size={16} />
             </button>
             <button onClick={handleUnescape} title="Unescape JSON String" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <FileCode2 size={16} />
             </button>
             <button onClick={handleEscape} title="Escape JSON String" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <ArrowRightLeft size={16} />
             </button>
             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
             <button onClick={copyToClipboard} title="Copy All" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                {copySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
             </button>
             <button onClick={clearInput} title="Clear All" className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                <Trash2 size={16} />
             </button>
          </div>
        )}
      </div>

      {/* Editor / Viewer Container */}
      <div 
        className={`flex-1 min-h-0 relative rounded-xl border-2 transition-all duration-200 overflow-hidden flex shadow-inner ${
          isDragOver 
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
            <div className={`flex flex-col relative h-full transition-all duration-300 ${isSplitView ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}>
              <div className="flex-1 min-h-0 relative">
                <MonacoEditor 
                  value={value} 
                  onChange={(val) => onChange(val || '')} 
                  theme={isDarkMode ? 'dark' : 'light'}
                  onMount={handleEditorMount}
                />
              </div>
              
              {/* Status Bar */}
              <div className={`flex-none px-4 py-2 text-xs flex justify-between items-center border-t transition-colors duration-200 ${
                activeError 
                  ? 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200' 
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                <div className="flex items-center gap-3">
                  {activeError ? <ShieldAlert size={14} className="shrink-0" /> : <Check size={14} className="text-green-500 shrink-0" />}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <span className={`font-mono font-medium truncate max-w-xs sm:max-w-md ${activeError ? 'text-red-700 dark:text-red-200' : 'text-green-600 dark:text-green-400'}`}>
                      {activeError ? 'Invalid JSON' : (value.trim() ? 'Valid JSON' : 'Empty')}
                    </span>
                    {activeError && errorLoc && (
                       <span className="font-mono bg-red-200 dark:bg-red-800 px-1.5 py-0.5 rounded text-red-800 dark:text-red-100">
                         Ln {errorLoc.line}, Col {errorLoc.column}
                       </span>
                    )}
                  </div>
                </div>
                
                {stats && !activeError && (
                  <div className="hidden sm:flex gap-4 font-mono">
                    <span title="File Size">💾 {stats.size}</span>
                    <span title="Total Keys">🔑 {stats.keys}</span>
                    <span title="Nesting Depth">📚 {stats.depth}</span>
                  </div>
                )}
              </div>
            </div>
        )}

        {/* --- RIGHT PANE (Tree View) --- */}
        {(mode === 'tree' || isSplitView) && (
          <div className={`flex flex-col h-full bg-gray-50 dark:bg-black/20 ${isSplitView ? 'w-1/2' : 'w-full'}`}>
             
             {/* Tree View Toolbar & Search */}
             <div className="flex-none h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-2 bg-gray-100 dark:bg-gray-800/50 justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2">JSON Tree</span>
                <div className="flex items-center gap-2">
                   {/* Search Box Trigger or Input */}
                   {showTreeSearch ? (
                     <div className="flex items-center bg-white dark:bg-gray-900 rounded-md border border-primary/50 overflow-hidden h-7 animate-in fade-in slide-in-from-right-4 duration-200">
                       <Search size={14} className="text-gray-400 ml-2" />
                       <input 
                         ref={treeSearchInputRef}
                         type="text" 
                         className="w-32 sm:w-48 text-xs px-2 py-1 outline-none bg-transparent"
                         placeholder="Find Key/Value..."
                         value={treeSearchTerm}
                         onChange={(e) => setTreeSearchTerm(e.target.value)}
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

             <div className="flex-1 overflow-auto p-0 relative">
              {parsedJson ? (
                <JsonTreeView data={parsedJson} searchTerm={treeSearchTerm} />
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
          onClick={onProcess} 
          disabled={!value.trim() || !!activeError} 
          isLoading={isProcessing}
          className="w-full sm:w-auto shadow-lg shadow-blue-500/20"
          size="lg"
        >
          Convert to Excel / CSV
        </Button>
      </div>
    </div>
  );
};

export default InputArea;