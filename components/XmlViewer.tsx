import React, { useState, useRef } from 'react';
import MonacoEditor from './MonacoEditor';
import { 
  Braces, Copy, Trash2, Upload, Minimize2, Check, FileCode
} from 'lucide-react';
import { formatXML, minifyXML } from '../utils/formatUtils';

interface XmlViewerProps {
  value: string;
  onChange: (val: string) => void;
}

const XmlViewer: React.FC<XmlViewerProps> = ({ value, onChange }) => {
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
    const formatted = formatXML(value);
    onChange(formatted);
  };

  const handleMinify = () => {
    const minified = minifyXML(value);
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
    if (!file.name.match(/\.(xml|txt)$/) && file.type !== 'text/xml' && file.type !== 'application/xml') {
      alert("Please upload a valid XML file.");
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
    const example = `<?xml version="1.0" encoding="UTF-8"?>
<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<body>Don't forget me this weekend!</body>
</note>`;
    onChange(example);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 px-2">
            <FileCode size={20} className="text-primary" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">XML Editor</span>
        </div>

        <div className="flex flex-wrap gap-1 items-center">
             <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-2" title="Upload XML">
                 <Upload size={16} /> <span className="text-xs hidden sm:inline">Upload</span>
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".xml,.txt" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />

             <button onClick={handleFormat} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Format XML">
                <Braces size={16} />
             </button>
             <button onClick={handleMinify} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Minify XML">
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
        <div className="flex flex-col relative h-full w-full overflow-hidden">
            <MonacoEditor 
              value={value}
              onChange={(val) => onChange(val || '')}
              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
              onMount={handleEditorMount}
              language="xml"
            />
        </div>

        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-blue-900/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
            <Upload className="w-12 h-12 text-primary mb-2 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Drop XML File</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default XmlViewer;
