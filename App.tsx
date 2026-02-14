import React, { useState, useEffect } from 'react';
import { Moon, Sun, Table2, Braces, ShieldCheck, Github, Linkedin, Globe } from 'lucide-react';
import InputArea from './components/InputArea';
import PreviewTable from './components/PreviewTable';
import AdSlot from './components/AdSlot';
import { parseAndFlattenJSON } from './utils/jsonUtils';
import { exportToCSV, exportToExcel } from './utils/exportUtils';
import { AlertMessage, ParsedData, ViewMode } from './types';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.INPUT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
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

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 transition-colors duration-200 overflow-hidden">
      
      {/* Header */}
      <header className="flex-none bg-white dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Braces className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">
                JSON <span className="text-primary">Tools</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Validator, Formatter & Converter
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
        
        {/* Top Ad Placement */}
        <div className="flex-none w-full mb-2">
          <AdSlot position="top" />
        </div>

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

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Main Column: Tools */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            
            {/* Privacy Trust Message */}
            <div className="flex-none flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
              <ShieldCheck size={12} className="text-green-600 dark:text-green-500" />
              <span>Your JSON is processed locally in your browser. Ads do not access your data.</span>
            </div>

            {/* Dynamic Tool Area - Flex 1 to take remaining height, min-h-0 to allow scrolling inside */}
            <div className="flex-1 bg-white dark:bg-dark-secondary rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 p-2 relative flex flex-col min-h-0">
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

            {/* Bottom Ad - Visible on Mobile/Tablet */}
            <div className="flex-none mt-2 lg:hidden">
               <AdSlot position="bottom" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none bg-white dark:bg-dark-secondary border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="text-sm text-gray-500 dark:text-gray-400">
             © {new Date().getFullYear()} JSON Tools. All rights reserved.
           </div>
           
           <div className="flex items-center gap-6">
              <a 
                href="https://github.com/sahasbelbase" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-sm"
              >
                <Github size={18} />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/sahas-belbase/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-sm"
              >
                <Linkedin size={18} />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
              <a 
                href="https://sahas.netlify.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-sm"
              >
                <Globe size={18} />
                <span className="hidden sm:inline">Portfolio</span>
              </a>
           </div>
        </div>
      </footer>
    </div>
  );
}

export default App;