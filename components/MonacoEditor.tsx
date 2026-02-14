import React from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Configure loader to use CDN to avoid local bundler issues
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  theme?: 'light' | 'dark';
  onMount?: (editor: any, monaco: any) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, onChange, theme = 'light', onMount }) => {
  return (
    <Editor
      height="100%"
      defaultLanguage="json"
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
        automaticLayout: true,
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
        }
      }}
      onMount={onMount}
      loading={
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Loading Editor...
        </div>
      }
    />
  );
};

export default MonacoEditor;