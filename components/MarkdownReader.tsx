import React, { useState, useRef } from 'react';
import MonacoEditor from './MonacoEditor';
import Button from './Button';
import { 
  FileText, Copy, Trash2, Upload, Columns, PanelLeft, Download, FileDown, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';
import { marked } from 'marked';

interface MarkdownReaderProps {
  value: string;
  onChange: (val: string) => void;
}

const MarkdownReader: React.FC<MarkdownReaderProps> = ({ value, onChange }) => {
  const [isSplitView, setIsSplitView] = useState(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [activePane, setActivePane] = useState<'editor' | 'preview'>('editor');
  const [isDragOver, setIsDragOver] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Actions
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
    if (!file.name.match(/\.(md|markdown|txt)$/) && file.type !== 'text/markdown') {
      alert("Please upload a valid Markdown file (.md, .txt).");
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('markdown-preview-content');
    if (!element) return;
    const opt = {
      margin:       10,
      filename:     'document.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2,
        onclone: (clonedDoc: any) => {
          // Temporarily remove dark mode classes from html element during capture
          clonedDoc.documentElement.classList.remove('dark');
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadDoc = async () => {
    try {
      const htmlContent = await marked(value);
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + htmlContent + footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = 'document.doc';
      fileDownload.click();
      document.body.removeChild(fileDownload);
    } catch (err) {
      console.error("Failed to generate DOC", err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-secondary p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto max-w-full">
            <button
              onClick={() => { setIsSplitView(false); setActivePane('editor'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${!isSplitView && activePane === 'editor' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              <PanelLeft size={16} /> Editor
            </button>
            <button
              onClick={() => { setIsSplitView(false); setActivePane('preview'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${!isSplitView && activePane === 'preview' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              <FileText size={16} /> Preview
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2 self-center hidden sm:block" />
            <button
              onClick={() => setIsSplitView(true)}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isSplitView ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              <Columns size={16} /> Split View
            </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <input
            type="file"
            ref={fileInputRef}
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />} className="whitespace-nowrap">
            Upload
          </Button>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
          
          <button onClick={handleDownloadMd} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Download .MD">
            <Download size={16} /> <span className="hidden sm:inline">.MD</span>
          </button>
          <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Download PDF">
            <FileDown size={16} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={handleDownloadDoc} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Download DOC">
            <FileText size={16} /> <span className="hidden sm:inline">DOC</span>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button onClick={handleCopy} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Copy Markdown">
            {copySuccess ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
          <button onClick={handleClear} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Clear">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[500px]">
        {/* Editor Pane */}
        {(activePane === 'editor' || isSplitView) && (
          <div 
            className={`flex flex-col bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative ${isSplitView ? 'lg:w-1/2' : 'w-full'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex-none h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Markdown Editor</span>
            </div>
            <div className="flex-1 relative">
              <MonacoEditor
                value={value}
                onChange={(val) => onChange(val || '')}
                language="markdown"
                options={{
                  wordWrap: 'on',
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  padding: { top: 16 }
                }}
              />
              {!value && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none z-10 bg-white/50 dark:bg-dark-secondary/50 backdrop-blur-[1px]">
                  <FileText size={48} className="mb-4 opacity-30" />
                  <p className="mb-4 font-medium text-sm">Type your markdown here or drop a file</p>
                </div>
              )}
              {isDragOver && (
                <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm border-2 border-blue-500 border-dashed z-50 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex flex-col items-center">
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="font-medium text-gray-700 dark:text-gray-200">Drop file to load</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Pane */}
        {(activePane === 'preview' || isSplitView) && (
          <div className={`flex flex-col bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${isSplitView ? 'lg:w-1/2' : 'w-full'}`}>
            <div className="flex-none h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 bg-gray-50 dark:bg-gray-800/50 justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Preview</span>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-white dark:bg-gray-900">
              <div id="markdown-preview-content" className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value || '*No content to preview*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownReader;
