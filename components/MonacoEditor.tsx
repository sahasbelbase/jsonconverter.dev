import React, { useRef, useEffect, useState } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';

// Configure loader to use CDN to avoid local bundler issues
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  theme?: 'light' | 'dark';
  language?: string;
  onMount?: (editor: any, monaco: any) => void;
  options?: any;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, onChange, theme = 'light', language = 'json', onMount, options }) => {
  const [editor, setEditor] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      // Wrap layout call in RAF to avoid "ResizeObserver loop limit exceeded"
      window.requestAnimationFrame(() => {
        editor.layout();
      });
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [editor]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    setEditor(editorInstance);
    if (onMount) onMount(editorInstance, monaco);
  };

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden relative">
      <Editor
        height="100%"
        width="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          formatOnPaste: false,
          formatOnType: false,
          automaticLayout: false, // Critical: Disable native auto-layout to prevent loops
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible'
          },
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'multiline',
            seedSearchStringFromSelection: 'always',
          },
          ...options
        }}
        onMount={handleEditorMount}
        loading={
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Loading Editor...
          </div>
        }
      />
    </div>
  );
};

export default MonacoEditor;