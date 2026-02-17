import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { 
  ArrowLeft, ArrowRight, ArrowRightLeft, Pencil, 
  ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, MapPin
} from 'lucide-react';

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
  const [changes, setChanges] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [jumpInput, setJumpInput] = useState('');
  
  // Manual layout handling
  const [diffEditorInstance, setDiffEditorInstance] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store active widgets to clean them up
  const widgetsRef = useRef<any[]>([]);
  
  // Unique URIs for this instance to scope models correctly
  const originalUri = useRef(`inmemory://diff/original-${Math.random()}`);
  const modifiedUri = useRef(`inmemory://diff/modified-${Math.random()}`);

  // Manual ResizeObserver
  useEffect(() => {
    if (!diffEditorInstance || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        diffEditorInstance.layout();
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [diffEditorInstance]);

  // Helper to construct a valid Monaco Range
  const getMonacoRange = (startLine: number, endLine: number, model: any) => {
     if (endLine < startLine) {
         // Empty range (Insertion point)
         // Ensure we don't go below 1
         const line = Math.max(1, startLine);
         return {
             startLineNumber: line,
             startColumn: 1,
             endLineNumber: line,
             endColumn: 1
         };
     }
     return {
         startLineNumber: startLine,
         startColumn: 1,
         endLineNumber: endLine,
         endColumn: model.getLineMaxColumn(endLine)
     };
  };

  // Command Handlers
  const applyChangeLeftToRight = useCallback((change: any) => {
    const editor = diffEditorRef.current;
    if (!editor || !change) return;
    
    const originalModel = editor.getModel().original;
    const modifiedModel = editor.getModel().modified;

    // Get text from original
    let text = "";
    if (change.originalEndLineNumber >= change.originalStartLineNumber) {
        text = originalModel.getValueInRange({
            startLineNumber: change.originalStartLineNumber,
            startColumn: 1,
            endLineNumber: change.originalEndLineNumber,
            endColumn: originalModel.getLineMaxColumn(change.originalEndLineNumber)
        });
    }

    const range = getMonacoRange(change.modifiedStartLineNumber, change.modifiedEndLineNumber, modifiedModel);

    // Apply to modified
    if (change.originalEndLineNumber < change.originalStartLineNumber) {
        // Deletion in Original -> Delete in Modified
        // If Modified range is valid, replace it with empty string
        modifiedModel.pushEditOperations([], [{
            range: range,
            text: "" 
        }], () => null);
    } else {
        // Content in Original -> Insert or Replace in Modified
        // Logic handles both insertion (empty modified range) and replacement automatically via range
        modifiedModel.pushEditOperations([], [{
            range: range,
            text: text + (change.modifiedEndLineNumber < change.modifiedStartLineNumber && change.modifiedStartLineNumber > 1 ? '\n' : '')
            // Note: If inserting a block, we might need a newline if we are appending. 
            // Monaco's pushEditOperations usually handles text insertion well, but block insertions need care.
            // Simplified: Just use the text.
        }], () => null);
    }
  }, []);

  const applyChangeRightToLeft = useCallback((change: any) => {
    const editor = diffEditorRef.current;
    if (!editor || !change) return;

    const originalModel = editor.getModel().original;
    const modifiedModel = editor.getModel().modified;

    let text = "";
    if (change.modifiedEndLineNumber >= change.modifiedStartLineNumber) {
        text = modifiedModel.getValueInRange({
            startLineNumber: change.modifiedStartLineNumber,
            startColumn: 1,
            endLineNumber: change.modifiedEndLineNumber,
            endColumn: modifiedModel.getLineMaxColumn(change.modifiedEndLineNumber)
        });
    }

    const range = getMonacoRange(change.originalStartLineNumber, change.originalEndLineNumber, originalModel);

    if (change.modifiedEndLineNumber < change.modifiedStartLineNumber) {
         // Deletion in Modified -> Delete in Original
         originalModel.pushEditOperations([], [{
            range: range,
            text: ""
        }], () => null);
    } else {
         // Content in Modified -> Insert or Replace in Original
         originalModel.pushEditOperations([], [{
            range: range,
            text: text + (change.originalEndLineNumber < change.originalStartLineNumber && change.originalStartLineNumber > 1 ? '\n' : '')
        }], () => null);
    }
  }, []);

  // Widget Rendering Logic
  const clearWidgets = () => {
    const editor = diffEditorRef.current?.getModifiedEditor();
    if (!editor || !widgetsRef.current.length) return;
    widgetsRef.current.forEach(w => editor.removeContentWidget(w));
    widgetsRef.current = [];
  };

  const renderWidgets = useCallback((currentChanges: any[]) => {
    clearWidgets();
    const modifiedEditor = diffEditorRef.current?.getModifiedEditor();
    if (!modifiedEditor) return;

    currentChanges.forEach((change, idx) => {
        // Position at the start of the change in modified editor
        // If modified is deletion (start > end), use start line
        const line = Math.max(1, change.modifiedStartLineNumber);
        
        const widgetId = `diff.action.widget.${idx}`;
        const domNode = document.createElement('div');
        domNode.className = 'flex items-center gap-0.5 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-600 rounded-[4px] px-1 py-0.5 z-20 select-none';
        domNode.style.fontSize = '10px';
        domNode.style.marginTop = '-22px'; // Shift up to sit above the line or near it
        
        // --- Button: L -> R ---
        const btnL2R = document.createElement('button');
        btnL2R.className = 'px-1.5 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1 transition-colors cursor-pointer font-medium';
        btnL2R.title = 'Apply Original to Modified';
        btnL2R.innerHTML = `<span>Apply</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
        btnL2R.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            applyChangeLeftToRight(change);
        };

        // --- Button: R -> L ---
        const btnR2L = document.createElement('button');
        btnR2L.className = 'px-1.5 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1 transition-colors cursor-pointer font-medium';
        btnR2L.title = 'Apply Modified to Original';
        btnR2L.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg><span>Apply</span>`;
        btnR2L.onclick = (e) => {
             e.stopPropagation();
             e.preventDefault();
             applyChangeRightToLeft(change);
        };

        domNode.appendChild(btnL2R);
        
        // Separator
        const sep = document.createElement('div');
        sep.className = 'w-px h-3 bg-gray-200 dark:bg-gray-600 mx-0.5';
        domNode.appendChild(sep);
        
        domNode.appendChild(btnR2L);

        const widget = {
            getId: () => widgetId,
            getDomNode: () => domNode,
            getPosition: () => ({
                position: {
                    lineNumber: line,
                    column: 1
                },
                preference: [0] // EXACT
            })
        };
        
        modifiedEditor.addContentWidget(widget);
        widgetsRef.current.push(widget);
    });
  }, [applyChangeLeftToRight, applyChangeRightToLeft]);


  const handleEditorMount = (editor: any, monaco: any) => {
    diffEditorRef.current = editor;
    setDiffEditorInstance(editor);

    const update = () => {
        const lineChanges = editor.getLineChanges() || [];
        setChanges(lineChanges);
        renderWidgets(lineChanges);
    };

    // Listen for diff updates
    editor.onDidUpdateDiff(update);

    // Initial check (delay slightly to ensure diff is computed)
    setTimeout(update, 200);

    // Sync content changes back to parent
    const originalModel = editor.getModel().original;
    const modifiedModel = editor.getModel().modified;

    originalModel.onDidChangeContent(() => {
        onOriginalChange(originalModel.getValue());
    });
    
    modifiedModel.onDidChangeContent(() => {
        onModifiedChange(modifiedModel.getValue());
    });

    // Listen to cursor updates to track "Active Change" for toolbar
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeCursorPosition((e: any) => {
        const line = e.position.lineNumber;
        const currentChanges = editor.getLineChanges() || [];
        const idx = currentChanges.findIndex((c: any) => 
            // Check if cursor is inside modified range OR adjacent to it for insertions
            (line >= c.modifiedStartLineNumber && line <= c.modifiedEndLineNumber) ||
            (c.modifiedStartLineNumber === 0 && line === 1) || // Edge case for start of file
            (c.modifiedEndLineNumber < c.modifiedStartLineNumber && line === c.modifiedStartLineNumber) // Insertion point
        );
        if (idx !== -1) setCurrentIndex(idx);
    });
  };

  const navigateToChange = (idx: number) => {
    const editor = diffEditorRef.current;
    if (!editor || !changes.length) return;
    
    const targetIdx = Math.max(0, Math.min(idx, changes.length - 1));
    setCurrentIndex(targetIdx);
    
    const change = changes[targetIdx];
    // Prefer jumping to the modified line
    const line = change.modifiedStartLineNumber > 0 ? change.modifiedStartLineNumber : change.originalStartLineNumber;
    
    editor.revealLineInCenter(line);
  };

  const handleNext = () => navigateToChange(currentIndex + 1);
  const handlePrev = () => navigateToChange(currentIndex - 1);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumpInput) return;
    
    if (jumpInput.startsWith('#')) {
        const idx = parseInt(jumpInput.substring(1)) - 1;
        if (!isNaN(idx)) navigateToChange(idx);
    } else {
        const line = parseInt(jumpInput);
        if (!isNaN(line) && diffEditorRef.current) {
            diffEditorRef.current.revealLineInCenter(line);
        }
    }
  };

  const handleApplyCurrentL2R = () => {
      // Use the active index to find the change
      if (currentIndex >= 0 && currentIndex < changes.length) {
          applyChangeLeftToRight(changes[currentIndex]);
      }
  };

  const handleApplyCurrentR2L = () => {
      if (currentIndex >= 0 && currentIndex < changes.length) {
          applyChangeRightToLeft(changes[currentIndex]);
      }
  };

  const handleSwap = useCallback(() => {
    const editor = diffEditorRef.current;
    if (!editor) {
        // Fallback if editor not ready
        const temp = original;
        onOriginalChange(modified);
        onModifiedChange(temp);
        return;
    }

    const originalModel = editor.getModel().original;
    const modifiedModel = editor.getModel().modified;
    
    // Get fresh values from the models
    const valOriginal = originalModel.getValue();
    const valModified = modifiedModel.getValue();

    if (valOriginal === valModified) return;
    
    // Optimistically update models for instant feedback
    // This avoids wait time for React cycle + Monaco prop check
    originalModel.setValue(valModified);
    modifiedModel.setValue(valOriginal);

    // Sync with React State
    onOriginalChange(valModified);
    onModifiedChange(valOriginal);
  }, [onOriginalChange, onModifiedChange, original, modified]);

  const handleCopyRightToLeft = () => onOriginalChange(modified);
  const handleCopyLeftToRight = () => onModifiedChange(original);

  // Clean up widgets on unmount
  useEffect(() => {
      return () => clearWidgets();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary rounded-xl shadow-inner overflow-hidden border border-gray-200 dark:border-gray-700">
      
      {/* Enhanced Diff Toolbar */}
      <div className="flex-none p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row justify-between items-center gap-2">
        
        {/* File Names */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-between xl:justify-start px-2">
           <div className="flex items-center gap-1 group">
             <input 
               type="text" 
               value={originalTitle}
               onChange={(e) => onOriginalTitleChange(e.target.value)}
               className="bg-transparent text-xs font-bold text-red-600 dark:text-red-400 outline-none w-24 sm:w-32 focus:w-48 transition-all"
               placeholder="Original"
             />
             <Pencil size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
           </div>
           <ArrowRight size={12} className="text-gray-400" />
           <div className="flex items-center gap-1 group text-right">
             <input 
               type="text" 
               value={modifiedTitle}
               onChange={(e) => onModifiedTitleChange(e.target.value)}
               className="bg-transparent text-xs font-bold text-green-600 dark:text-green-400 outline-none w-24 sm:w-32 focus:w-48 transition-all text-right"
               placeholder="Modified"
             />
             <Pencil size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
           </div>
        </div>

        {/* Middle: Navigation & Context Actions */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-center bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
            
            {/* Nav Controls */}
            <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => navigateToChange(0)} disabled={changes.length === 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="First Change">
                    <ChevronsUp size={14} />
                </button>
                <button onClick={handlePrev} disabled={currentIndex <= 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Previous Change">
                    <ChevronUp size={14} />
                </button>
                
                <div className="flex items-center px-2 min-w-[60px] justify-center">
                    <span className="text-xs font-mono text-gray-500 select-none">
                        {changes.length > 0 ? `${currentIndex + 1} / ${changes.length}` : '0 / 0'}
                    </span>
                </div>

                <button onClick={handleNext} disabled={currentIndex >= changes.length - 1} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Next Change">
                    <ChevronDown size={14} />
                </button>
                <button onClick={() => navigateToChange(changes.length - 1)} disabled={changes.length === 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Last Change">
                    <ChevronsDown size={14} />
                </button>
            </div>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>

            {/* Jump Input */}
            <form onSubmit={handleJumpSubmit} className="flex items-center shrink-0">
                 <MapPin size={12} className="text-gray-400 mr-1" />
                 <input 
                    type="text" 
                    placeholder=":line or #diff" 
                    className="w-20 text-xs bg-transparent outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    title="Enter line number (e.g. 10) or change number (e.g. #3)"
                 />
            </form>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>

            {/* Active Change Actions (Toolbar) */}
            <div className="flex items-center gap-1 shrink-0">
                <button 
                    onClick={handleApplyCurrentL2R} 
                    disabled={currentIndex === -1}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title="Apply active change from Left to Right"
                >
                    Apply <ArrowRight size={10} />
                </button>
                <button 
                    onClick={handleApplyCurrentR2L}
                    disabled={currentIndex === -1}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title="Apply active change from Right to Left"
                >
                    <ArrowLeft size={10} /> Apply
                </button>
            </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-1 justify-center w-full xl:w-auto">
           <button 
             onClick={handleCopyRightToLeft}
             title="Copy All Right to Left (Overwrite)"
             className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
           >
             <ArrowLeft size={16} />
           </button>
           
           <button 
             onClick={handleSwap}
             title="Swap All"
             className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600 mx-1"
           >
             <ArrowRightLeft size={16} />
           </button>

           <button 
             onClick={handleCopyLeftToRight}
             title="Copy All Left to Right (Overwrite)"
             className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
           >
             <ArrowRight size={16} />
           </button>
        </div>
      </div>

      <div className="flex-1 relative group overflow-hidden" ref={containerRef}>
        <DiffEditor
          height="100%"
          language="json"
          original={original}
          modified={modified}
          originalModelPath={originalUri.current}
          modifiedModelPath={modifiedUri.current}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            originalEditable: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            diffWordWrap: 'off' as const,
            padding: { top: 16, bottom: 16 },
            renderOverviewRuler: false,
            automaticLayout: false
          }}
        />
      </div>
    </div>
  );
};

export default DiffViewer;