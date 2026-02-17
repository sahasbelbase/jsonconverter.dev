import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from './MonacoEditor';
import Button from './Button';
import { Copy, Download, ArrowRight, Upload, AlertCircle } from 'lucide-react';
import { toYAML, toXML, toTOML, toProperties } from '../utils/formatUtils';
import { getErrorLocation } from '../utils/jsonUtils';

interface FormatConverterProps {
  initialValue: string;
  onValueChange: (val: string) => void;
}

type OutputFormat = 'YAML' | 'XML' | 'TOML' | 'Text';

const FormatConverter: React.FC<FormatConverterProps> = ({ initialValue, onValueChange }) => {
  const [input, setInput] = useState(initialValue);
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState<OutputFormat>('YAML');
  const [error, setError] = useState<string | null>(null);
  const [errorLoc, setErrorLoc] = useState<{line: number, column: number} | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sync with parent state for persistence
    onValueChange(input);
    
    if (!input.trim()) {
      setOutput('');
      setError(null);
      setErrorLoc(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      setError(null);
      setErrorLoc(null);

      // Format-Specific Validation
      if (format === 'TOML') {
         if (Array.isArray(parsed)) {
            throw new Error("Invalid TOML: Root must be an Object (Key-Value pairs), not an Array.");
         }
         if (parsed === null || typeof parsed !== 'object') {
            throw new Error("Invalid TOML: Root must be an Object, not a primitive value.");
         }
      }
      
      // XML Validation: Keys must not be empty if possible, but our converter handles sanitization.
      // However, check for completely empty keys or invalid structures if necessary.
      // For this app, strict JSON parsing is the main validation.

      switch (format) {
        case 'YAML':
          setOutput(toYAML(parsed));
          break;
        case 'XML':
          setOutput(toXML(parsed));
          break;
        case 'TOML':
          setOutput(toTOML(parsed));
          break;
        case 'Text':
          setOutput(toProperties(parsed));
          break;
      }
    } catch (e: any) {
      setError(e.message);
      // Try to parse position from error message
      const match = e.message.match(/position (\d+)/);
      if (match && match[1]) {
         const pos = parseInt(match[1], 10);
         setErrorLoc(getErrorLocation(input, pos));
      } else {
         setErrorLoc(null);
      }
      // If conversion fails but parse succeeded (e.g. TOML validation), clear output
      if (!e.message.includes("JSON")) {
          setOutput('');
      }
    }
  }, [input, format, onValueChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      alert('Please upload a valid JSON file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setInput(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  const handleDownload = () => {
    let type = 'text/plain';
    let ext = 'txt';
    
    if (format === 'YAML') { type = 'text/yaml'; ext = 'yaml'; }
    else if (format === 'XML') { type = 'text/xml'; ext = 'xml'; }
    else if (format === 'TOML') { type = 'text/plain'; ext = 'toml'; }

    const blob = new Blob([output], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
             {(['YAML', 'XML', 'TOML', 'Text'] as OutputFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${format === fmt ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                  {fmt}
                </button>
             ))}
          </div>
          <span className="text-sm text-gray-400 hidden sm:inline">Output</span>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="ghost" onClick={() => fileInputRef.current?.click()} size="sm" icon={<Upload size={14}/>}>
             <span className="hidden sm:inline">Upload</span>
           </Button>
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".json,application/json"
             onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
           />
           <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
           <Button variant="secondary" onClick={handleCopy} size="sm" icon={<Copy size={14}/>} disabled={!output || !!error}>
             Copy
           </Button>
           <Button variant="primary" onClick={handleDownload} size="sm" icon={<Download size={14}/>} disabled={!output || !!error}>
             Download
           </Button>
        </div>
      </div>

      {/* Editors Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 gap-4">
        
        {/* Input Pane */}
        <div 
          className={`flex-1 flex flex-col min-h-0 relative rounded-xl border-2 overflow-hidden transition-all ${isDragOver ? 'border-primary bg-blue-50 dark:bg-blue-900/10' : error ? 'border-red-300 dark:border-red-900/50' : 'border-gray-200 dark:border-gray-700'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex-none px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">JSON Input</span>
            
            {/* Error Display */}
            {error && (
               <div className="flex items-center gap-2 text-xs text-red-500 overflow-hidden" title={error}>
                 <AlertCircle size={12} className="shrink-0" />
                 <span className="font-bold whitespace-nowrap">Invalid Input</span>
                 {errorLoc && (
                    <span className="bg-red-100 dark:bg-red-900/50 px-1 rounded whitespace-nowrap">
                      Ln {errorLoc.line}, Col {errorLoc.column}
                    </span>
                 )}
               </div>
            )}
            
            {!input && !error && <span className="text-xs text-gray-400">Paste or Drop File</span>}
          </div>
          <div className="flex-1 relative overflow-hidden">
            <MonacoEditor 
              value={input}
              onChange={(val) => setInput(val || '')}
              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            />
            {isDragOver && (
              <div className="absolute inset-0 z-20 bg-blue-50/90 dark:bg-blue-900/80 flex items-center justify-center">
                 <div className="animate-bounce p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                    <Upload className="w-8 h-8 text-primary" />
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Arrow (Desktop) */}
        <div className="hidden md:flex flex-col justify-center items-center text-gray-300 dark:text-gray-600">
          <ArrowRight size={24} />
        </div>

        {/* Output Pane */}
        <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
           <div className="flex-none px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{format} Output</span>
           </div>
           <div className="flex-1 relative overflow-hidden">
             <MonacoEditor 
                value={output}
                onChange={() => {}} // Read only effectively
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                language={format === 'XML' ? 'xml' : format === 'YAML' ? 'yaml' : 'plaintext'}
             />
           </div>
        </div>

      </div>
    </div>
  );
};

export default FormatConverter;