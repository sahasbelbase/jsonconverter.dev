import React, { useState, useEffect, useCallback } from 'react';
import MonacoEditor from './MonacoEditor';
import Button from './Button';
import { 
  ArrowRight, ArrowDown, Copy, Check, Trash2, 
  Settings, Link2, Search, Table, AlertCircle, Layers
} from 'lucide-react';
import { safeDecode, safeEncode, analyzeUrl, UrlBreakdown } from '../utils/urlUtils';

interface UrlConverterProps {
  initialValue: string;
  onValueChange: (val: string) => void;
}

const UrlConverter: React.FC<UrlConverterProps> = ({ initialValue, onValueChange }) => {
  const [input, setInput] = useState(initialValue);
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('decode');
  const [batchMode, setBatchMode] = useState(false);
  const [strictComponent, setStrictComponent] = useState(true); // encodeURIComponent vs encodeURI
  
  const [urlData, setUrlData] = useState<UrlBreakdown | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const process = useCallback(() => {
    let result = '';
    
    // Clear analysis
    setUrlData(null);

    const lines = batchMode ? input.split('\n') : [input];
    
    const processedLines = lines.map(line => {
      if (mode === 'encode') {
        return safeEncode(line, strictComponent);
      } else {
        return safeDecode(line);
      }
    });

    result = processedLines.join('\n');
    setOutput(result);

    // Analyze URL for inspector (Only in single line mode)
    if (!batchMode && lines.length === 1 && lines[0].trim()) {
       // We analyze the DECODED version usually, or the input if we are in decode mode
       const targetForAnalysis = mode === 'decode' ? result : input;
       const analysis = analyzeUrl(targetForAnalysis);
       if (analysis.valid) {
         setUrlData(analysis);
       }
    }

    onValueChange(input);
  }, [input, mode, batchMode, strictComponent, onValueChange]);

  useEffect(() => {
    process();
  }, [process]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSwap = () => {
    setInput(output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Toolbar */}
      <div className="flex-none bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Mode Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
             <button
               onClick={() => setMode('decode')}
               className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-1.5 rounded-md text-sm font-medium transition-all ${
                 mode === 'decode' 
                   ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
               }`}
             >
               Decode
             </button>
             <button
               onClick={() => setMode('encode')}
               className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-1.5 rounded-md text-sm font-medium transition-all ${
                 mode === 'encode' 
                   ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
               }`}
             >
               Encode
             </button>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
               onClick={() => setBatchMode(!batchMode)}
               className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-2 transition-colors ${
                 batchMode 
                   ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200' 
                   : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
               }`}
               title="Process each line independently"
            >
               <Layers size={14} /> Batch Mode
            </button>

            {mode === 'encode' && (
              <button
                 onClick={() => setStrictComponent(!strictComponent)}
                 className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-2 transition-colors ${
                   strictComponent
                     ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200' 
                     : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                 }`}
                 title="Toggle encodeURIComponent (Strict) vs encodeURI"
              >
                 <Settings size={14} /> {strictComponent ? 'Component Encode' : 'Full URL Encode'}
              </button>
            )}
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0">
         
         {/* LEFT: Editors */}
         <div className="flex-1 flex flex-col gap-2 min-h-0">
             
             {/* Input */}
             <div className="flex-1 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-dark-secondary shadow-sm">
                <div className="flex-none px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Input</span>
                    <button onClick={() => setInput('')} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                       <Trash2 size={12}/> Clear
                    </button>
                </div>
                <div className="flex-1 relative">
                    <MonacoEditor 
                        value={input}
                        onChange={(val) => setInput(val || '')}
                        theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                        language="plaintext"
                        options={{ wordWrap: 'on', lineNumbers: batchMode ? 'on' : 'off' }}
                    />
                </div>
             </div>

             {/* Action Bar (Desktop Arrow) */}
             <div className="flex-none flex justify-center py-1">
                 <button 
                   onClick={handleSwap}
                   className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-primary hover:scale-110 transition-all"
                   title="Swap Input/Output"
                 >
                    {batchMode ? <ArrowDown size={18} /> : <ArrowRight size={18} className="rotate-90 xl:rotate-0" />}
                 </button>
             </div>

             {/* Output */}
             <div className="flex-1 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-dark-secondary shadow-sm">
                <div className="flex-none px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Output</span>
                    <button onClick={handleCopy} className="text-xs text-primary hover:text-blue-600 flex items-center gap-1 font-medium">
                       {copySuccess ? <Check size={12}/> : <Copy size={12}/>} {copySuccess ? 'Copied' : 'Copy Result'}
                    </button>
                </div>
                <div className="flex-1 relative">
                    <MonacoEditor 
                        value={output}
                        onChange={() => {}} // ReadOnly
                        theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                        language="plaintext"
                        options={{ wordWrap: 'on', readOnly: true, lineNumbers: batchMode ? 'on' : 'off' }}
                    />
                </div>
             </div>
         </div>

         {/* RIGHT: URL Inspector (Only shows if valid URL detected) */}
         {urlData && urlData.valid && (
            <div className="xl:w-1/3 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
               <div className="bg-white dark:bg-dark-secondary rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm overflow-hidden flex flex-col h-full">
                  <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                     <Search size={16} className="text-blue-600 dark:text-blue-400" />
                     <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wider">URL Inspector</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                     
                     {/* Components */}
                     <div className="space-y-3">
                        <div className="group">
                           <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Protocol</label>
                           <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 break-all select-all">
                              {urlData.protocol}
                           </div>
                        </div>
                        <div className="group">
                           <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Host</label>
                           <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 break-all select-all text-blue-600 dark:text-blue-400 font-bold">
                              {urlData.host}
                           </div>
                        </div>
                        <div className="group">
                           <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Path</label>
                           <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 break-all select-all">
                              {urlData.path}
                           </div>
                        </div>
                        {urlData.hash && (
                          <div className="group">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Hash / Fragment</label>
                            <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 break-all select-all text-purple-600 dark:text-purple-400">
                                {urlData.hash}
                            </div>
                          </div>
                        )}
                     </div>

                     {/* Query Params Table */}
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                           <Table size={14} className="text-gray-400" />
                           <label className="text-xs font-semibold text-gray-500 uppercase">Query Parameters</label>
                           {urlData.params && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 rounded-full text-gray-600 dark:text-gray-300">{Object.keys(urlData.params).length}</span>}
                        </div>
                        
                        {urlData.params ? (
                           <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <table className="w-full text-left text-sm">
                                 <thead className="bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 font-semibold uppercase">
                                    <tr>
                                       <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 w-1/3">Key</th>
                                       <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Value</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-dark-secondary">
                                    {Object.entries(urlData.params).map(([key, value]) => (
                                       <tr key={key} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                          <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400 break-all align-top">{key}</td>
                                          <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap">{value}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        ) : (
                           <div className="text-xs text-gray-400 italic p-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-center">
                              No query parameters found.
                           </div>
                        )}
                     </div>

                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default UrlConverter;