import React, { useState, useEffect } from 'react';
import InputArea from '../components/InputArea';
import PreviewTable from '../components/PreviewTable';
import SeoHead from '../components/SeoHead';
import { parseAndFlattenJSON } from '../utils/jsonUtils';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';
import { ParsedData, ViewMode, AlertMessage } from '../types';

const JsonTool = ({ setAlert }: { setAlert: (alert: AlertMessage) => void }) => {
  const [jsonInput, setJsonInput] = useState<string>(() => localStorage.getItem('jsonInput') || '');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.INPUT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    if (jsonInput.length < 5000000) localStorage.setItem('jsonInput', jsonInput); 
  }, [jsonInput]);

  const processData = async () => {
    setIsProcessing(true);
    setError(null);
    setTimeout(() => {
      try {
        const data = parseAndFlattenJSON(jsonInput);
        setParsedData(data);
        setViewMode(ViewMode.PREVIEW);
        setAlert({ type: 'success', message: `Processed ${data.originalSize} records.` });
        setTimeout(() => setAlert({ type: 'info', message: '' }), 1); 
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleExportExcel = () => {
    if (!parsedData) return;
    try {
      exportToExcel(parsedData.rows, 'json_export');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    if (!parsedData) return;
    try {
      exportToCSV(parsedData.rows, 'json_export');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <SeoHead 
         title="JSON Formatter & Validator | Free Online JSON Tools" 
         description="The best free online JSON Formatter and Validator. Minify JSON, fix errors, and convert nested JSON to CSV or Excel instantly. 100% Client-side."
         path="/"
         keywords="json formatter, json validator, json to csv, json beautifier, online json editor, json to excel, json converter"
      />
      
      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === ViewMode.INPUT ? (
          <InputArea 
            value={jsonInput} 
            onChange={setJsonInput} 
            onProcess={processData} 
            isProcessing={isProcessing} 
            error={error} 
          />
        ) : (
          parsedData && (
            <PreviewTable 
              data={parsedData} 
              onExportCSV={handleExportCSV} 
              onExportExcel={handleExportExcel} 
              onBack={() => setViewMode(ViewMode.INPUT)} 
            />
          )
        )}
      </div>

      {/* SEO Content Section */}
      <article className="mt-8 prose dark:prose-invert max-w-none px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h1 className="text-2xl font-bold mb-4">Best Online JSON Formatter & Validator</h1>
        <p>
          Welcome to <strong>JSON Tools</strong>, the ultimate free developer utility for processing JSON data. 
          Whether you need to <a href="#" className="text-primary hover:underline">format JSON</a>, validate syntax, or convert complex nested data structures into readable CSV/Excel spreadsheets, we have you covered.
        </p>
        <p>
          Unlike other web-based tools, our converter runs <strong>100% in your browser</strong>. 
          Your sensitive data never leaves your device, ensuring maximum privacy and security.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Key Features</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong>JSON Validator:</strong> Instantly check for syntax errors with line number pointing.</li>
              <li><strong>Beautifier:</strong> Prettify minified code with 2-space indentation.</li>
              <li><strong>Auto-Fix:</strong> Attempts to fix common errors like trailing commas or single quotes.</li>
              <li><strong>JSON to Excel:</strong> Flatten nested objects and arrays into rows and columns.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">How to use?</h3>
            <ol className="list-decimal pl-5 space-y-1 text-gray-600 dark:text-gray-400">
              <li>Paste your JSON code into the editor.</li>
              <li>If the JSON is valid, the status bar will show a green checkmark.</li>
              <li>Click <strong>Convert to Excel / CSV</strong> to view a table preview.</li>
              <li>Download your data in your preferred format.</li>
            </ol>
          </div>
        </div>
      </article>
    </div>
  );
};

export default JsonTool;