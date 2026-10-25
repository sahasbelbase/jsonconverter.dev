import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import {
  ArrowLeftRight,
  Columns,
  Download,
  FileCode2,
  FileDown,
  FileText,
  PanelLeft,
  Trash2,
  Upload,
} from 'lucide-react';
import MonacoEditor from './MonacoEditor';
import Button from './Button';
import CopyButton from './CopyButton';

interface MarkdownReaderProps {
  value: string;
  onChange: (value: string) => void;
  onNotify?: (message: string) => void;
  onError?: (message: string) => void;
}

type Direction = 'md-to-html' | 'html-to-md';
type Pane = 'editor' | 'preview';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});
// Tables, strikethrough and task lists are GitHub extensions, not core Markdown.
turndown.use(gfm);

const MarkdownReader: React.FC<MarkdownReaderProps> = ({ value, onChange, onNotify, onError }) => {
  const [direction, setDirection] = useState<Direction>('md-to-html');
  const [isSplit, setIsSplit] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > 1024
  );
  const [pane, setPane] = useState<Pane>('editor');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHtmlSource = direction === 'html-to-md';

  /** The converted side: rendered HTML, or Markdown turned back from HTML. */
  const converted = useMemo(() => {
    if (!value.trim()) return '';
    try {
      return isHtmlSource ? turndown.turndown(value) : (marked.parse(value, { async: false }) as string);
    } catch (e) {
      return `<!-- conversion failed: ${(e as Error).message} -->`;
    }
  }, [value, isHtmlSource]);

  const handleFile = (file: File) => {
    const isHtmlFile = /\.html?$/i.test(file.name);
    const isMarkdownFile = /\.(md|markdown|txt)$/i.test(file.name);
    if (!isHtmlFile && !isMarkdownFile) {
      onError?.('Upload a .md, .markdown, .txt or .html file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange((e.target?.result as string) ?? '');
      setDirection(isHtmlFile ? 'html-to-md' : 'md-to-html');
    };
    reader.onerror = () => onError?.('Could not read that file.');
    reader.readAsText(file);
  };

  /** Moves the converted text into the editor and flips the direction. */
  const swapDirection = () => {
    if (converted) onChange(converted);
    setDirection((d) => (d === 'md-to-html' ? 'html-to-md' : 'md-to-html'));
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(`Downloaded ${filename}.`);
  };

  const downloadPdf = async () => {
    const element = document.getElementById('markdown-preview-content');
    if (!element) return;
    try {
      // Loaded on demand: html2pdf pulls in html2canvas and jsPDF, which is more
      // than the rest of this page put together.
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin: 10,
          filename: 'document.pdf',
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            // Capture in light mode; a dark background prints as a black page.
            onclone: (clonedDoc: Document) => clonedDoc.documentElement.classList.remove('dark'),
          },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        })
        .from(element)
        .save();
      onNotify?.('Downloaded document.pdf.');
    } catch (e) {
      onError?.(`Could not create the PDF: ${(e as Error).message}`);
    }
  };

  const downloadDoc = () => {
    const html = isHtmlSource ? value : converted;
    const source = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${html}</body></html>`;
    download(source, 'document.doc', 'application/msword');
  };

  const showEditor = isSplit || pane === 'editor';
  const showPreview = isSplit || pane === 'preview';

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex-none flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark border border-gray-200 dark:border-gray-700 text-sm font-medium">
            <span className={isHtmlSource ? 'text-gray-400' : 'text-primary'}>Markdown</span>
            <button
              onClick={swapDirection}
              title="Convert the other way"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeftRight size={15} />
            </button>
            <span className={isHtmlSource ? 'text-primary' : 'text-gray-400'}>HTML</span>
          </div>

          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => {
                setIsSplit(false);
                setPane('editor');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isSplit && pane === 'editor'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <PanelLeft size={15} /> Source
            </button>
            <button
              onClick={() => {
                setIsSplit(false);
                setPane('preview');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isSplit && pane === 'preview'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileText size={15} /> {isHtmlSource ? 'Markdown' : 'Preview'}
            </button>
            <button
              onClick={() => setIsSplit(true)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSplit ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Columns size={15} /> Split
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            accept=".md,.markdown,.txt,.html,.htm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload size={14} />}
          >
            Upload
          </Button>

          <span className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={() =>
              isHtmlSource
                ? download(converted, 'document.md', 'text/markdown')
                : download(value, 'document.md', 'text/markdown')
            }
            title="Download Markdown"
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={15} /> <span className="hidden sm:inline">.md</span>
          </button>
          <button
            onClick={() =>
              download(isHtmlSource ? value : converted, 'document.html', 'text/html')
            }
            title="Download HTML"
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FileCode2 size={15} /> <span className="hidden sm:inline">.html</span>
          </button>
          <button
            onClick={downloadPdf}
            title="Download PDF"
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FileDown size={15} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={downloadDoc}
            title="Download Word document"
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText size={15} /> <span className="hidden sm:inline">.doc</span>
          </button>

          <span className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          <CopyButton value={value} />
          <button
            onClick={() => onChange('')}
            title="Clear"
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-[400px]">
        {showEditor && (
          <div
            className={`flex flex-col bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden relative ${
              isSplit ? 'lg:w-1/2' : 'w-full'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="flex-none h-9 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {isHtmlSource ? 'HTML source' : 'Markdown source'}
              </span>
            </div>
            <div className="flex-1 relative min-h-[300px]">
              <MonacoEditor
                value={value}
                onChange={(next) => onChange(next ?? '')}
                language={isHtmlSource ? 'html' : 'markdown'}
                options={{ wordWrap: 'on', lineNumbers: 'on' }}
              />
              {!value && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none bg-white/60 dark:bg-dark-secondary/60">
                  <FileText size={44} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    Paste {isHtmlSource ? 'HTML' : 'Markdown'} here, or drop a file
                  </p>
                </div>
              )}
              {isDragOver && (
                <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed z-50 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-sm">Drop to load</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showPreview && (
          <div
            className={`flex flex-col bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
              isSplit ? 'lg:w-1/2' : 'w-full'
            }`}
          >
            <div className="flex-none h-9 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {isHtmlSource ? 'Markdown output' : 'Live preview'}
              </span>
              {isHtmlSource && <CopyButton value={converted} label="Copy Markdown" />}
            </div>

            {isHtmlSource ? (
              <div className="flex-1 min-h-[300px]">
                <MonacoEditor value={converted} onChange={() => {}} language="markdown" readOnly />
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-6">
                <div id="markdown-preview-content" className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {value || '*Nothing to preview yet.*'}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownReader;
