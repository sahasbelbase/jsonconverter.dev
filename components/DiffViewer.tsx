import React, { useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, ArrowRight, ArrowRightLeft, Copy, Pencil } from 'lucide-react';
import Button from './Button';

interface DiffViewerProps {
  original: string;
  modified: string;
  originalTitle: string;
  modifiedTitle: string;
  onOriginalChange: (value: string) => void;
  onModifiedChange: (value: string) => void;
  onOriginalTitleChange: (value: string) => void;
  onModifiedTitleChange: (value: string) => void;
  theme: 'light' | 'dark';
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  original,
  modified,
  originalTitle,
  modifiedTitle,
  onOriginalChange,
  onModifiedChange,
  onOriginalTitleChange,
  onModifiedTitleChange,
  theme
}) => {
  const diffEditorRef = useRef<any>(null);

  const handleEditorMount = (editor: any) => {
    diffEditorRef.current = editor;

    const originalModel = editor.getModel().original;
    const modifiedModel = editor.getModel().modified;

    originalModel.onDidChangeContent(() => {
      onOriginalChange(originalModel.getValue());
    });

    modifiedModel.onDidChangeContent(() => {
      onModifiedChange(modifiedModel.getValue());
    });
  };

  const handleSwap = () => {
    const temp = original;
    const tempTitle = originalTitle;
    onOriginalChange(modified);
    onModifiedChange(temp);
    // Optional: Swap titles too? Usually users want to keep "Left" vs "Right" context, 
    // but sometimes swapping content implies swapping the file identity.
    // For a generic diff tool, swapping content is the primary action. 
    // Let's NOT swap titles automatically to avoid confusion if they named them "Prod" and "Dev".
  };

  const handleCopyRightToLeft = () => {
    onOriginalChange(modified);
  };

  const handleCopyLeftToRight = () => {
    onModifiedChange(original);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary rounded-xl shadow-inner overflow-hidden border border-gray-200 dark:border-gray-700">
      
      {/* Diff Toolbar */}
      <div className="flex-none p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2">
        
        {/* Left Label */}
        <div className="flex items-center gap-2 w-full sm:w-1/3 justify-center sm:justify-start pl-2">
           <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all group w-full sm:w-auto">
             <input 
               type="text" 
               value={originalTitle}
               onChange={(e) => onOriginalTitleChange(e.target.value)}
               className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-400 outline-none w-full sm:w-auto text-center sm:text-left focus:text-primary"
               placeholder="Original Name"
             />
             <Pencil size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
           </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 justify-center w-full sm:w-1/3">
           <button 
             onClick={handleCopyRightToLeft}
             title="Copy Right to Left (Overwrite Original)"
             className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
           >
             <ArrowLeft size={16} />
           </button>
           
           <button 
             onClick={handleSwap}
             title="Swap Sides"
             className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600 mx-1"
           >
             <ArrowRightLeft size={16} />
           </button>

           <button 
             onClick={handleCopyLeftToRight}
             title="Copy Left to Right (Overwrite Modified)"
             className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
           >
             <ArrowRight size={16} />
           </button>
        </div>

        {/* Right Label */}
        <div className="flex items-center gap-2 w-full sm:w-1/3 justify-center sm:justify-end pr-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all group w-full sm:w-auto justify-end">
             <Pencil size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
             <input 
               type="text" 
               value={modifiedTitle}
               onChange={(e) => onModifiedTitleChange(e.target.value)}
               className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-400 outline-none w-full sm:w-auto text-center sm:text-right focus:text-primary"
               placeholder="Modified Name"
             />
           </div>
        </div>
      </div>

      <div className="flex-1 relative group">
        <DiffEditor
          height="100%"
          language="json"
          original={original}
          modified={modified}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            originalEditable: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            diffWordWrap: 'off',
            padding: { top: 16, bottom: 16 }
          }}
        />
      </div>
    </div>
  );
};

export default DiffViewer;
