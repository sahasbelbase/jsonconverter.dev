import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from './MonacoEditor';
import Button from './Button';
import { Copy, Trash2, Calculator, Check, Info, Layers, Type, AlertCircle } from 'lucide-react';
import { encodingForModel } from 'js-tiktoken';

interface TokenStats {
  tokens: number;
  characters: number;
  words: number;
}

interface TokenSegment {
  text: string;
  id: number;
  colorClass: string;
}

const MODELS = [
  { name: 'GPT-4o', inputPrice: 2.50, outputPrice: 10.00 },
  { name: 'GPT-4o-mini', inputPrice: 0.15, outputPrice: 0.60 },
  { name: 'o1', inputPrice: 15.00, outputPrice: 60.00 },
  { name: 'o3-mini', inputPrice: 1.10, outputPrice: 4.40 },
  { name: 'GPT-3.5 Turbo', inputPrice: 0.50, outputPrice: 1.50 },
  { name: 'Claude 3.5 Sonnet', inputPrice: 3.00, outputPrice: 15.00 },
];

const TOKEN_COLORS = [
  'bg-blue-200 dark:bg-blue-500/30 text-blue-900 dark:text-blue-100',
  'bg-green-200 dark:bg-green-500/30 text-green-900 dark:text-green-100',
  'bg-orange-200 dark:bg-orange-500/30 text-orange-900 dark:text-orange-100',
  'bg-purple-200 dark:bg-purple-500/30 text-purple-900 dark:text-purple-100',
  'bg-pink-200 dark:bg-pink-500/30 text-pink-900 dark:text-pink-100',
];

const Tokenizer: React.FC = () => {
  const [text, setText] = useState(() => localStorage.getItem('tokenizerInput') || '');
  const [stats, setStats] = useState<TokenStats>({ tokens: 0, characters: 0, words: 0 });
  const [segments, setSegments] = useState<TokenSegment[]>([]);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'visual'>('split');
  
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const encoderRef = useRef<any>(null);

  // Load encoder once on mount
  useEffect(() => {
    const initEncoder = async () => {
      try {
        // We use 'gpt-4' (cl100k_base) as it is widely supported and used by modern models
        encoderRef.current = encodingForModel('gpt-4'); 
        setIsLoading(false);
        // Initial calculation
        calculateStats(text);
      } catch (e: any) {
        console.error("Failed to load tokenizer", e);
        setError("Failed to load tokenizer model. Please refresh the page.");
        setIsLoading(false);
      }
    };
    initEncoder();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to local storage
  useEffect(() => {
    if (text.length < 5000000) localStorage.setItem('tokenizerInput', text);
  }, [text]);

  const calculateStats = (input: string) => {
    if (!input) {
      setStats({ tokens: 0, characters: 0, words: 0 });
      setSegments([]);
      return;
    }

    let tokenCount = 0;
    const newSegments: TokenSegment[] = [];

    if (encoderRef.current) {
      try {
        const tokens = encoderRef.current.encode(input);
        tokenCount = tokens.length;

        // Visual Generation (Limit to first 2000 tokens for performance in UI)
        const limit = 2000;
        const tokensToVisualize = tokens.slice(0, limit);
        
        for (let i = 0; i < tokensToVisualize.length; i++) {
          const id = tokensToVisualize[i];
          const decoded = encoderRef.current.decode([id]);
          newSegments.push({
            id,
            text: decoded,
            colorClass: TOKEN_COLORS[i % TOKEN_COLORS.length]
          });
        }
        
        if (tokens.length > limit) {
           newSegments.push({ id: 0, text: `... (${tokens.length - limit} more tokens hidden for performance)`, colorClass: 'bg-gray-200 dark:bg-gray-700' });
        }

      } catch (e) {
        console.error(e);
      }
    }

    setStats({
      tokens: tokenCount,
      characters: input.length,
      words: input.trim() ? input.trim().split(/\s+/).length : 0
    });
    setSegments(newSegments);
  };

  const handleChange = (val: string) => {
    setText(val);
    // Debounce large inputs slightly
    if (val.length > 5000) {
        const t = setTimeout(() => calculateStats(val), 300);
        return () => clearTimeout(t);
    } else {
        calculateStats(val);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleClear = () => {
    setText('');
    setStats({ tokens: 0, characters: 0, words: 0 });
    setSegments([]);
  };

  const loadSample = () => {
    const sample = `The OpenAI API can be applied to virtually any task that involves understanding or generating natural language, code, or images.`;
    handleChange(sample);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-2">
           <Calculator className="text-primary" size={20} />
           <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 hidden sm:inline">Token Counter</h2>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="ghost" onClick={loadSample} size="sm">
             Load Sample
           </Button>
           <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
           <Button variant="secondary" onClick={handleCopy} size="sm" icon={copySuccess ? <Check size={14}/> : <Copy size={14}/>}>
             Copy
           </Button>
           <Button variant="danger" onClick={handleClear} size="sm" icon={<Trash2 size={14}/>}>
             Clear
           </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Editor & Visualizer Pane */}
        <div className="flex-1 flex flex-col min-h-0 gap-4">
           
           {/* Top Stats Banner */}
           <div className="flex-none p-4 bg-white dark:bg-dark-secondary rounded-xl border border-blue-100 dark:border-blue-900/30 flex justify-around items-center text-center shadow-sm">
              <div>
                <div className="text-3xl font-bold text-primary">{stats.tokens.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Tokens</div>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
              <div>
                <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{stats.characters.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Characters</div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
              <div className="hidden sm:block">
                <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{stats.words.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Words</div>
              </div>
           </div>

           {/* Input Editor */}
           <div className="flex-1 min-h-[200px] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-dark-secondary shadow-sm relative">
             <div className="flex-none px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Type size={14}/> Input Text
                </span>
             </div>
             <div className="flex-1 relative overflow-hidden">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading Model...</div>
                ) : (
                  <MonacoEditor 
                    value={text}
                    onChange={(val) => handleChange(val || '')}
                    theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    language="plaintext"
                  />
                )}
             </div>
           </div>

           {/* Token Map (Below Input) */}
           <div className="flex-1 min-h-[200px] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-dark-secondary shadow-sm">
             <div className="flex-none px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 shrink-0">
                   <Layers size={14}/> Token Map
                </span>
                
                {/* Visual Legend */}
                <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto">
                    <div className="flex items-center text-[10px] font-mono select-none">
                        {TOKEN_COLORS.map((colorClass, i) => (
                            <span key={i} className={`${colorClass} px-1.5 py-0.5 border-l border-white/20 dark:border-black/10`} title={`Color ${i+1}`}>
                                {i + 1}
                            </span>
                        ))}
                        <span className="ml-1 text-gray-400">...</span>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Colors cycle to show boundaries
                    </span>
                </div>
             </div>
             
             <div className="flex-1 overflow-auto p-4 bg-white dark:bg-dark-secondary font-mono text-sm leading-7">
               {segments.length > 0 ? (
                 <div className="flex flex-wrap content-start items-start">
                   {segments.map((seg, idx) => (
                     <span 
                       key={idx} 
                       className={`${seg.colorClass} px-0.5 border-l border-white/20 dark:border-black/10 hover:brightness-95 dark:hover:brightness-110 cursor-help transition-all whitespace-pre-wrap`}
                       title={`Token ID: ${seg.id} | Length: ${seg.text.length} chars`}
                     >
                       {seg.text}
                     </span>
                   ))}
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
                   Type above to see tokens...
                 </div>
               )}
             </div>
             
             <div className="flex-none p-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex items-start gap-2">
                 <AlertCircle size={14} className="shrink-0 mt-0.5" />
                 <p>
                   <strong>Color Meaning:</strong> The colors (Blue, Green, Orange, Purple, Pink) <strong>do not</strong> indicate cost or "expensiveness". 
                   They simply alternate in a cycle to visually distinguish where one token ends and the next begins. All tokens cost the same for a specific model.
                 </p>
             </div>
           </div>

        </div>

        {/* Cost Pane (Right Sidebar) */}
        <div className="lg:w-80 flex-none flex flex-col gap-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
             <div className="flex items-center gap-2 mb-4">
                <Info size={16} className="text-primary" />
                <h3 className="font-bold text-gray-800 dark:text-white">Estimated Cost</h3>
             </div>
             
             <div className="space-y-3">
                {MODELS.map(model => {
                  const inputCost = (stats.tokens / 1_000_000) * model.inputPrice;
                  const outputCost = (stats.tokens / 1_000_000) * model.outputPrice;
                  
                  return (
                    <div key={model.name} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                       <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-sm">{model.name}</span>
                          <span className="text-[10px] text-gray-400 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            ${model.inputPrice.toFixed(2)} / ${model.outputPrice.toFixed(2)}
                          </span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Input</span>
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                              ${inputCost < 0.00001 && inputCost > 0 ? '<0.00001' : inputCost.toFixed(5)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Output</span>
                             <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                              ${outputCost < 0.00001 && outputCost > 0 ? '<0.00001' : outputCost.toFixed(5)}
                            </span>
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
             <div className="mt-4 text-[10px] text-gray-400 text-center leading-tight">
                Prices per 1M tokens (USD). <br/> Based on standard provider pricing.
             </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 p-4">
            <h4 className="text-xs font-bold text-blue-800 dark:text-blue-200 mb-2 uppercase">Understanding Tokens</h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed space-y-2">
              <p>Tokens are the basic units of text for LLMs. They can be parts of words, whole words, or single characters.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>English:</strong> 1 token ≈ 4 characters</li>
                <li><strong>Rule of Thumb:</strong> 100 tokens ≈ 75 words</li>
                <li><strong>Code:</strong> Indentation and brackets count as tokens.</li>
              </ul>
              <p>The visual map on the left shows exactly how your text is broken down.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Tokenizer;