import React, { useState, useEffect } from 'react';
import { Moon, Sun, Braces, ShieldCheck, Github, Linkedin, Globe, Keyboard } from 'lucide-react';
import InputArea from './components/InputArea';
import PreviewTable from './components/PreviewTable';
import AdSlot from './components/AdSlot';
import ShortcutsHelp from './components/ShortcutsHelp';
import Sidebar from './components/Sidebar';
import DiffViewer from './components/DiffViewer';
import FormatConverter from './components/FormatConverter';
import HtmlViewer from './components/HtmlViewer';
import Tokenizer from './components/Tokenizer';
import JwtDecoder from './components/JwtDecoder';
import { parseAndFlattenJSON } from './utils/jsonUtils';
import { exportToCSV, exportToExcel } from './utils/exportUtils';
import { AlertMessage, ParsedData, ViewMode, ToolMode } from './types';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // -- State: Converter Tool --
  const [jsonInput, setJsonInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.INPUT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // -- State: Diff Tool --
  const [diffOriginal, setDiffOriginal] = useState<string>('');
  const [diffModified, setDiffModified] = useState<string>('');
  const [diffOriginalTitle, setDiffOriginalTitle] = useState<string>('Original (Read-only / Editable)');
  const [diffModifiedTitle, setDiffModifiedTitle] = useState<string>('Modified (Editable)');

  // -- State: Format Tool --
  const [formatInput, setFormatInput] = useState<string>('');

  // -- State: HTML Tool --
  const [htmlInput, setHtmlInput] = useState<string>('');
  
  // -- State: JWT Tool --
  const [jwtToken, setJwtToken] = useState<string>('');
  const [jwtSecret, setJwtSecret] = useState<string>('');
  const [jwtPublicKey, setJwtPublicKey] = useState<string>('');
  const [jwtPrivateKey, setJwtPrivateKey] = useState<string>('');

  // -- State: Global --
  const [activeTool, setActiveTool] = useState<ToolMode>(ToolMode.CONVERTER);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [adsBlocked, setAdsBlocked] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Auto-Save: Load from LocalStorage on mount
  useEffect(() => {
    try {
      const savedInput = localStorage.getItem('jsonInput');
      if (savedInput) setJsonInput(savedInput);

      const savedOriginal = localStorage.getItem('diffOriginal');
      if (savedOriginal) setDiffOriginal(savedOriginal);

      const savedModified = localStorage.getItem('diffModified');
      if (savedModified) setDiffModified(savedModified);
      
      const savedFormatInput = localStorage.getItem('formatInput');
      if (savedFormatInput) setFormatInput(savedFormatInput);

      const savedHtmlInput = localStorage.getItem('htmlInput');
      if (savedHtmlInput) setHtmlInput(savedHtmlInput);
      
      const savedJwtToken = localStorage.getItem('jwtToken');
      if (savedJwtToken) setJwtToken(savedJwtToken);
      
      const savedJwtSecret = localStorage.getItem('jwtSecret');
      if (savedJwtSecret) setJwtSecret(savedJwtSecret);

      const savedJwtPublicKey = localStorage.getItem('jwtPublicKey');
      if (savedJwtPublicKey) setJwtPublicKey(savedJwtPublicKey);

      const savedJwtPrivateKey = localStorage.getItem('jwtPrivateKey');
      if (savedJwtPrivateKey) setJwtPrivateKey(savedJwtPrivateKey);
      
      const savedTool = localStorage.getItem('activeTool');
      if (savedTool && Object.values(ToolMode).includes(savedTool as ToolMode)) {
        setActiveTool(savedTool as ToolMode);
      }

    } catch (e) {
      console.warn("Failed to load from local storage", e);
    }
  }, []);

  // Auto-Save: Save Inputs to LocalStorage on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (jsonInput.length < 5_000_000) localStorage.setItem('jsonInput', jsonInput);
        if (diffOriginal.length < 5_000_000) localStorage.setItem('diffOriginal', diffOriginal);
        if (diffModified.length < 5_000_000) localStorage.setItem('diffModified', diffModified);
        if (formatInput.length < 5_000_000) localStorage.setItem('formatInput', formatInput);
        if (htmlInput.length < 5_000_000) localStorage.setItem('htmlInput', htmlInput);
        if (jwtToken.length < 100_000) localStorage.setItem('jwtToken', jwtToken);
        if (jwtSecret.length < 10_000) localStorage.setItem('jwtSecret', jwtSecret);
        if (jwtPublicKey.length < 10_000) localStorage.setItem('jwtPublicKey', jwtPublicKey);
        if (jwtPrivateKey.length < 10_000) localStorage.setItem('jwtPrivateKey', jwtPrivateKey);
        localStorage.setItem('activeTool', activeTool);
      } catch (e) { /* Ignore quota */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [jsonInput, diffOriginal, diffModified, formatInput, htmlInput, jwtToken, jwtSecret, jwtPublicKey, jwtPrivateKey, activeTool]);

  // Clear errors when switching tools
  useEffect(() => {
    setAlert(null);
    setInputError(null);
  }, [activeTool]);

  useEffect(() => {
    // Theme initialization
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    // AdBlock Detection
    const checkAdBlock = () => {
      const bait = document.createElement('div');
      bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
      bait.style.cssText = 'height: 1px; width: 1px; position: absolute; left: -10000px; top: -1000px;';
      document.body.appendChild(bait);

      setTimeout(() => {
        if (bait.offsetParent === null || bait.offsetHeight === 0 || bait.clientHeight === 0) {
          setAdsBlocked(true);
        }
        bait.remove();
      }, 500); 
    };

    checkAdBlock();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const processData = async () => {
    setIsProcessing(true);
    setAlert(null);
    setInputError(null);
    
    setTimeout(() => {
      try {
        const data = parseAndFlattenJSON(jsonInput);
        setParsedData(data);
        setViewMode(ViewMode.PREVIEW);
        showAlert('success', `Successfully processed ${data.originalSize} records.`);
      } catch (err: any) {
        console.error(err);
        setInputError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    if (inputError) setInputError(null);
  };

  const handleExportExcel = () => {
    if (!parsedData) return;
    try {
      exportToExcel(parsedData.rows, 'json_export');
      showAlert('success', 'Excel file downloaded.');
    } catch (e) {
      showAlert('error', 'Failed to export Excel.');
    }
  };

  const handleExportCSV = () => {
    if (!parsedData) return;
    try {
      exportToCSV(parsedData.rows, 'json_export');
      showAlert('success', 'CSV file downloaded.');
    } catch (e) {
      showAlert('error', 'Failed to export CSV.');
    }
  };

  const handleBack = () => {
    setViewMode(ViewMode.INPUT);
    setInputError(null);
  };

  const getToolTitle = () => {
    switch (activeTool) {
      case ToolMode.CONVERTER: return 'Converter & Formatter';
      case ToolMode.DIFF: return 'Diff Viewer';
      case ToolMode.FORMAT: return 'Convert JSON to Other Formats';
      case ToolMode.HTML: return 'HTML Viewer & Beautifier';
      case ToolMode.TOKENIZER: return 'Token Counter & Cost Estimator';
      case ToolMode.JWT: return 'JWT Decoder & Verifier';
      default: return 'JSON Tool';
    }
  };

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 transition-colors duration-200 overflow-hidden">
      
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Header */}
      <header className="flex-none bg-white dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between ml-16 md:ml-auto">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Braces className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">
                JSON <span className="text-primary">Tools</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Dev Utilities
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcuts(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Keyboard Shortcuts"
            >
              <Keyboard size={18} />
              <span className="hidden md:inline text-sm font-medium">Shortcuts</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Left Sidebar - Fixed Position */}
        <div className="absolute top-0 bottom-0 left-0 z-50 flex h-full">
           <Sidebar activeTool={activeTool} onSelect={setActiveTool} />
        </div>

        {/* Content Area - Adjusted padding for Sidebar */}
        <main className="flex-1 flex flex-col min-h-0 w-full px-4 py-4 overflow-hidden relative bg-gray-50 dark:bg-dark pl-20">
          
          {/* Top Ad */}
          {!adsBlocked && (
            <div className="flex-none w-full mb-2 min-h-[50px] transition-all duration-300 ease-in-out pl-2">
              <AdSlot position="top" onError={() => setAdsBlocked(true)} />
            </div>
          )}

          {/* Alert Toast */}
          {alert && (
            <div className={`fixed bottom-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-up flex items-center gap-2 ${
              alert.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 
              alert.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              <span>{alert.message}</span>
            </div>
          )}

          {/* Tool Workspace */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 max-w-screen-2xl mx-auto w-full">
            
            <div className="flex-none flex items-center justify-between mb-2 px-1">
               <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 ml-2">
                  {getToolTitle()}
               </h2>
               <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <ShieldCheck size={12} className={adsBlocked ? "text-primary" : "text-green-600 dark:text-green-500"} />
                  <span>
                    {!adsBlocked 
                      ? "Ads do not access data." 
                      : "Clean mode."}
                  </span>
               </div>
            </div>

            <div className="flex-1 bg-white dark:bg-dark-secondary rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 p-2 relative flex flex-col min-h-0 transition-all">
              
              {/* CONVERTER TOOL */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTool === ToolMode.CONVERTER ? 'block' : 'hidden'}`}>
                {viewMode === ViewMode.INPUT ? (
                  <InputArea 
                    value={jsonInput} 
                    onChange={handleInputChange} 
                    onProcess={processData}
                    isProcessing={isProcessing}
                    error={inputError}
                  />
                ) : (
                  parsedData && (
                    <PreviewTable 
                      data={parsedData} 
                      onExportCSV={handleExportCSV}
                      onExportExcel={handleExportExcel}
                      onBack={handleBack}
                    />
                  )
                )}
              </div>

              {/* DIFF TOOL */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTool === ToolMode.DIFF ? 'block' : 'hidden'}`}>
                <DiffViewer 
                   original={diffOriginal}
                   modified={diffModified}
                   originalTitle={diffOriginalTitle}
                   modifiedTitle={diffModifiedTitle}
                   onOriginalChange={setDiffOriginal}
                   onModifiedChange={setDiffModified}
                   onOriginalTitleChange={setDiffOriginalTitle}
                   onModifiedTitleChange={setDiffModifiedTitle}
                   theme={theme}
                />
              </div>

              {/* FORMAT TOOL */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTool === ToolMode.FORMAT ? 'block' : 'hidden'}`}>
                <FormatConverter 
                   initialValue={formatInput}
                   onValueChange={setFormatInput}
                />
              </div>

              {/* HTML VIEWER TOOL */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTool === ToolMode.HTML ? 'block' : 'hidden'}`}>
                <HtmlViewer 
                   value={htmlInput}
                   onChange={setHtmlInput}
                />
              </div>

              {/* TOKENIZER TOOL */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTool === ToolMode.TOKENIZER ? 'block' : 'hidden'}`}>
                <Tokenizer />
              </div>
              
              {/* JWT TOOL */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTool === ToolMode.JWT ? 'block' : 'hidden'}`}>
                <JwtDecoder 
                  initialToken={jwtToken}
                  onTokenChange={setJwtToken}
                  initialSecret={jwtSecret}
                  onSecretChange={setJwtSecret}
                  initialPublicKey={jwtPublicKey}
                  onPublicKeyChange={setJwtPublicKey}
                  initialPrivateKey={jwtPrivateKey}
                  onPrivateKeyChange={setJwtPrivateKey}
                />
              </div>

            </div>

            {/* Bottom Ad (Mobile) */}
            {!adsBlocked && (
              <div className="flex-none mt-2 lg:hidden min-h-[50px] transition-all duration-300 ease-in-out">
                 <AdSlot position="bottom" onError={() => setAdsBlocked(true)} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex-none bg-white dark:bg-dark-secondary border-t border-gray-200 dark:border-gray-700 py-3 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 ml-16 md:ml-auto">
           <div className="text-xs text-gray-500 dark:text-gray-400">
             © 2026 JSON Tools. @ For devs, by the dev.
           </div>
           
           <div className="flex items-center gap-6">
              <a 
                href="https://github.com/sahasbelbase" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-xs"
              >
                <Github size={16} />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/sahas-belbase/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-xs"
              >
                <Linkedin size={16} />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
              <a 
                href="https://sahas.netlify.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-xs"
              >
                <Globe size={16} />
                <span className="hidden sm:inline">Portfolio</span>
              </a>
           </div>
        </div>
      </footer>
    </div>
  );
}

export default App;