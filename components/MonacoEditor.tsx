import React, { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import '../lib/monaco';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  theme?: 'light' | 'dark';
  language?: string;
  onMount?: (editor: any, monaco: any) => void;
  options?: Record<string, unknown>;
  readOnly?: boolean;
}

/**
 * `automaticLayout` is off on purpose: it polls on a timer and fights the
 * flex layout. A ResizeObserver with a rAF-deferred `layout()` is both cheaper
 * and the documented way to avoid the "ResizeObserver loop" warning.
 */
const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  theme,
  language = 'json',
  onMount,
  options,
  readOnly = false,
}) => {
  const [editor, setEditor] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Follow the app theme unless the caller pins one.
  useEffect(() => {
    if (theme) return;
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    const node = containerRef.current;
    if (!editor || !node) return;

    // Only re-layout when the box actually changed size. Laying out on every
    // observer tick can feed a growth loop when an unrelated element on the page
    // keeps nudging the layout; comparing against the last applied size breaks it.
    let lastW = 0;
    let lastH = 0;
    const applySize = () => {
      const { width, height } = node.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
        lastW = w;
        lastH = h;
        editor.layout({ width: w, height: h });
      }
    };

    const observer = new ResizeObserver(() => window.requestAnimationFrame(applySize));
    observer.observe(node);
    applySize();
    return () => observer.disconnect();
  }, [editor]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    setEditor(editorInstance);
    onMount?.(editorInstance, monaco);
  };

  const resolvedTheme = theme ?? (isDark ? 'dark' : 'light');

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden relative">
      <Editor
        height="100%"
        width="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          formatOnPaste: false,
          formatOnType: false,
          automaticLayout: false,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          readOnly,
          scrollbar: { vertical: 'visible', horizontal: 'visible' },
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'multiline',
            seedSearchStringFromSelection: 'always',
          },
          ...options,
        }}
        onMount={handleEditorMount}
        loading={
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Loading editor…
          </div>
        }
      />
    </div>
  );
};

export default MonacoEditor;
