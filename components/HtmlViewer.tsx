import React, { useState, useRef, useEffect } from 'react';
import MonacoEditor from './MonacoEditor';
import Button from './Button';
import { 
  Play, Code, Braces, Copy, Trash2, Upload, Minimize2, Check, Columns, PanelLeft, MonitorPlay
} from 'lucide-react';
import { minifyHTML } from '../utils/formatUtils';

interface HtmlViewerProps {
  value: string;
  onChange: (val: string) => void;
  onError?: (message: string) => void;
}

const HtmlViewer: React.FC<HtmlViewerProps> = ({ value, onChange, onError }) => {
  const [isSplitView, setIsSplitView] = useState(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [activePane, setActivePane] = useState<'editor' | 'preview'>('editor');
  const [isDragOver, setIsDragOver] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor Mount
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Actions
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const handleMinify = () => {
    const minified = minifyHTML(value);
    onChange(minified);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(html|htm|txt)$/) && file.type !== 'text/html') {
      onError?.(`“${file.name}” is not a HTML file (.html, .htm).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  };

  const loadExample = () => {
    const example = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
        h1 { color: #0284c7; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: inline-block; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello World!</h1>
        <p>This is a live preview of your HTML code.</p>
        <button onclick="alert('It works!')">Click Me</button>
    </div>
</body>
</html>`;
    onChange(example);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Toolbar */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto max-w-full">
            <button
                onClick={() => { setActivePane('editor'); setIsSplitView(false); }}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  !isSplitView && activePane === 'editor'
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <Code size={16} className="mr-2" /> Code
            </button>
            <button
                onClick={() => { setActivePane('preview'); setIsSplitView(false); }}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap lg:hidden ${
                  !isSplitView && activePane === 'preview'
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <MonitorPlay size={16} className="mr-2" /> Preview
            </button>
            <button
                onClick={() => { setIsSplitView(!isSplitView); setActivePane('editor'); }}
                className={`hidden lg:flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    isSplitView
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <Columns size={16} className="mr-2" /> Split
            </button>
        </div>

        <div className="flex flex-wrap gap-1 items-center">
             <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-2" title="Upload HTML">
                 <Upload size={16} /> <span className="text-xs hidden sm:inline">Upload</span>
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".html,.htm,.txt" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />

             <button onClick={handleFormat} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Beautify / Format">
                <Braces size={16} />
             </button>
             <button onClick={handleMinify} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Minify">
                <Minimize2 size={16} />
             </button>
             <button onClick={handleCopy} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Copy All">
                {copySuccess ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}
             </button>
             <button onClick={handleClear} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Clear">
                <Trash2 size={16} />
             </button>
             
             {!value && (
                <button onClick={loadExample} className="ml-2 text-xs text-primary hover:underline">
                    Load Example
                </button>
             )}
        </div>
      </div>

      {/* Main Area */}
      <div 
         className={`flex-1 min-h-0 relative rounded-xl border-2 transition-colors duration-200 overflow-hidden flex shadow-inner ${
            isDragOver ? 'border-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-secondary'
         }`}
         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
         onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
         onDrop={handleDrop}
      >
        {/* Editor Pane */}
        {(activePane === 'editor' || isSplitView) && (
            <div className={`flex flex-col relative h-full overflow-hidden ${isSplitView ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}>
                <MonacoEditor
                  value={value}
                  onChange={(val) => onChange(val || '')}
                  language="html"
                  onMount={handleEditorMount}
                />
            </div>
        )}

        {/* Preview Pane */}
        {(activePane === 'preview' || isSplitView) && (
            <div className={`flex flex-col relative h-full bg-white dark:bg-dark-secondary ${isSplitView ? 'w-1/2' : 'w-full'}`}>
               <div className="flex-none px-3 py-1 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                     <MonitorPlay size={12}/> Browser Preview
                  </span>
               </div>
               {/* A rendered page keeps a white canvas, the way a browser shows it;
                   the empty state follows the app theme instead of a bare white slab. */}
               <div className={`flex-1 relative ${value ? 'bg-white' : 'bg-gray-50 dark:bg-dark-secondary'}`}>
                   {value ? (
                       <iframe
                          title="Preview"
                          srcDoc={value}
                          className="w-full h-full border-0 block"
                          sandbox="allow-scripts"
                       />
                   ) : (
                       <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                           Enter HTML to preview
                       </div>
                   )}
               </div>
            </div>
        )}

        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-blue-900/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
            <Upload className="w-12 h-12 text-primary mb-2 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Drop HTML File</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default HtmlViewer;