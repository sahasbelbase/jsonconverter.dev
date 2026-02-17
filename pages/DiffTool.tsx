import React, { useState, useEffect } from 'react';
import DiffViewer from '../components/DiffViewer';
import SeoHead from '../components/SeoHead';

const DiffTool = () => {
  const [original, setOriginal] = useState(() => localStorage.getItem('diffOriginal') || '');
  const [modified, setModified] = useState(() => localStorage.getItem('diffModified') || '');
  const [t1, setT1] = useState('Original');
  const [t2, setT2] = useState('Modified');
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => { localStorage.setItem('diffOriginal', original); }, [original]);
  useEffect(() => { localStorage.setItem('diffModified', modified); }, [modified]);

  return (
    <div className="h-full flex flex-col">
      <SeoHead 
         title="Online Diff Viewer - Compare Text & JSON | Diff Checker" 
         description="Free online Diff Viewer. Compare text, JSON, or code side-by-side to find differences efficiently. distinct highlights for added, removed, and modified lines."
         path="/diff-viewer"
         keywords="diff viewer, text comparison, compare json, compare files online, code diff, text diff checker"
      />
      
      <div className="flex-1 min-h-0">
        <DiffViewer 
          original={original} modified={modified} 
          originalTitle={t1} modifiedTitle={t2}
          onOriginalChange={setOriginal} onModifiedChange={setModified}
          onOriginalTitleChange={setT1} onModifiedTitleChange={setT2}
          theme={isDark ? 'dark' : 'light'}
        />
      </div>

      <article className="mt-8 prose dark:prose-invert max-w-none px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h1 className="text-2xl font-bold mb-4">Online Text Difference Checker</h1>
        <p>
          Compare two text files side-by-side to see what has changed. This <strong>Diff Viewer</strong> highlights added, removed, and modified lines in real-time.
          It is perfect for developers comparing code snippets, JSON files, or configuration files.
        </p>

        <h3 className="text-lg font-semibold mt-4 mb-2">Frequently Asked Questions</h3>
        <details className="cursor-pointer mb-2 group">
          <summary className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary">Does it support code syntax highlighting?</summary>
          <p className="pl-4 mt-2 text-gray-600 dark:text-gray-400">Yes, the editor automatically detects JSON. For other text, it performs a standard text diff.</p>
        </details>
        <details className="cursor-pointer mb-2 group">
          <summary className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary">Is the comparison private?</summary>
          <p className="pl-4 mt-2 text-gray-600 dark:text-gray-400">Yes, the comparison happens entirely in your browser using JavaScript. No data is sent to any server.</p>
        </details>
      </article>
    </div>
  );
};

export default DiffTool;