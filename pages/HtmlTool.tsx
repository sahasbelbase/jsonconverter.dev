import React, { useState, useEffect } from 'react';
import HtmlViewer from '../components/HtmlViewer';
import SeoHead from '../components/SeoHead';

const HtmlTool = () => {
  const [val, setVal] = useState(() => localStorage.getItem('htmlInput') || '');
  useEffect(() => { localStorage.setItem('htmlInput', val); }, [val]);

  return (
    <div className="h-full flex flex-col">
      <SeoHead 
         title="HTML Viewer & Beautifier | Real-time HTML Editor" 
         description="Format, beautify, and preview HTML code online. Real-time HTML sandbox for developers to test and debug code snippets."
         path="/html-viewer"
         keywords="html viewer, html beautifier, html preview, html formatter, clean html, online html editor"
      />
      
      <div className="flex-1 min-h-0">
        <HtmlViewer value={val} onChange={setVal} />
      </div>

      <article className="mt-8 prose dark:prose-invert max-w-none px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h1 className="text-2xl font-bold mb-4">Online HTML Viewer and Formatter</h1>
        <p>
          Test, view, and format HTML code in real-time. This tool includes a split-screen editor with a live browser preview, making it easy to prototype web layouts or debug HTML snippets.
        </p>
        <h3 className="text-lg font-semibold mt-4 mb-2">Key Features</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
          <li><strong>Live Preview:</strong> See changes instantly as you type.</li>
          <li><strong>Beautify:</strong> Auto-indent messy HTML code.</li>
          <li><strong>Minify:</strong> Compress HTML for production use.</li>
          <li><strong>Secure:</strong> Sandbox environment prevents malicious script execution on your main window.</li>
        </ul>
      </article>
    </div>
  );
};

export default HtmlTool;