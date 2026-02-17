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

  // Fix ResizeObserver Error: Manual Layout
  useEffect(() => {
    if (!diffEditorInstance || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (diffEditorInstance) {
          diffEditorInstance.layout();
        }
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
        modifiedModel.pushEditOperations([], [{
            range: range,
            text: text + (change.modifiedEndLineNumber < change.modifiedStartLineNumber && change.modifiedStartLineNumber > 1 ? '\n' : '')
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

    const modifiedModel = modifiedEditor.getModel();
    if (!modifiedModel) return;

    currentChanges.forEach((change, idx) => {
        // Validate line number to avoid out of bounds
        const lineCount = modifiedModel.getLineCount();
        const line = Math.min(Math.max(1, change.modifiedStartLineNumber), lineCount);
        
        // Fix: Position widget at the END of the line + Spacing to prevent obscuring text
        const maxCol = modifiedModel.getLineMaxColumn(line);

        const widgetId = `diff.action.widget.${idx}`;
        const domNode = document.createElement('div');
        
        // Semi-transparent style with hover effect to minimize visual interference
        domNode.className = 'flex items-center gap-0.5 bg-blue-50/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm border border-blue-200 dark:border-gray-600 rounded px-1.5 py-0.5 z-20 select-none opacity-60 hover:opacity-100 transition-opacity ml-4';
        domNode.style.fontSize = '10px';
        
        // --- Button: L -> R ---
        const btnL2R = document.createElement('button');
        btnL2R.className = 'px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1 transition-colors cursor-pointer font-bold';
        btnL2R.title = 'Apply Original to Modified';
        btnL2R.innerHTML = `<span>Apply</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
        btnL2R.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            applyChangeLeftToRight(change);
        };

        // --- Button: R -> L ---
        const btnR2L = document.createElement('button');
        btnR2L.className = 'px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1 transition-colors cursor-pointer font-bold';
        btnR2L.title = 'Apply Modified to Original';
        btnR2L.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg><span>Apply</span>`;
        btnR2L.onclick = (e) => {
             e.stopPropagation();
             e.preventDefault();
             applyChangeRightToLeft(change);
        };

        domNode.appendChild(btnL2R);
        
        const sep = document.createElement('div');
        sep.className = 'w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1';
        domNode.appendChild(sep);
        
        domNode.appendChild(btnR2L);

        const widget = {
            getId: () => widgetId,
            getDomNode: () => domNode,
            getPosition: () => ({
                position: {
                    lineNumber: line,
                    column: maxCol // Position at end of line
                },
                preference: [0] // EXACT position
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
      
      {/* Enhanced Diff Toolbar - Grid/Flex Layout for Title Separation */}
      <div className="flex-none p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row items-center gap-2">
        
        {/* Left: Original Title */}
        <div className="flex-1 w-full xl:w-auto flex items-center justify-start min-w-0 px-2">
             <span className="text-xs font-bold text-gray-400 mr-2 shrink-0 select-none">ORIGINAL</span>
             <div className="relative group flex-1">
                 <input 
                   type="text" 
                   value={originalTitle}
                   onChange={(e) => onOriginalTitleChange(e.target.value)}
                   className="bg-transparent text-xs font-bold text-red-600 dark:text-red-400 outline-none w-full truncate focus:bg-white dark:focus:bg-gray-700 rounded px-1 transition-all border border-transparent focus:border-gray-300 dark:focus:border-gray-600"
                   placeholder="Original"
                   title="Original File Name"
                 />
                 <Pencil size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 pointer-events-none" />
             </div>
        </div>

        {/* Center: Controls & Navigation */}
        <div className="flex-none flex items-center justify-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm mx-2">
            
            {/* Navigation */}
            <div className="flex items-center gap-0.5">
                <button onClick={() => navigateToChange(0)} disabled={changes.length === 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="First Change"><ChevronsUp size={14} /></button>
                <button onClick={handlePrev} disabled={currentIndex <= 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Prev Change"><ChevronUp size={14} /></button>
                <div className="flex items-center px-1 min-w-[50px] justify-center">
                    <span className="text-[10px] font-mono text-gray-500 select-none">
                        {changes.length > 0 ? `${currentIndex + 1}/${changes.length}` : '0/0'}
                    </span>
                </div>
                <button onClick={handleNext} disabled={currentIndex >= changes.length - 1} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Next Change"><ChevronDown size={14} /></button>
                <button onClick={() => navigateToChange(changes.length - 1)} disabled={changes.length === 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Last Change"><ChevronsDown size={14} /></button>
            </div>
            
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>

            {/* Jump Input */}
            <form onSubmit={handleJumpSubmit} className="flex items-center px-1">
                 <input 
                    type="text" 
                    placeholder=":line" 
                    className="w-10 text-[10px] bg-transparent outline-none text-gray-600 dark:text-gray-300 placeholder-gray-400 text-center"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    title="Jump to line"
                 />
            </form>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>

            {/* Global Actions */}
            <div className="flex items-center gap-1">
                <button onClick={handleCopyRightToLeft} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Copy All Right to Left"><ArrowLeft size={14} /></button>
                <button onClick={handleSwap} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Swap Sides"><ArrowRightLeft size={14} /></button>
                <button onClick={handleCopyLeftToRight} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Copy All Left to Right"><ArrowRight size={14} /></button>
            </div>
        </div>

        {/* Right: Modified Title */}
        <div className="flex-1 w-full xl:w-auto flex items-center justify-end min-w-0 px-2">
             <div className="relative group flex-1">
                 <input 
                   type="text" 
                   value={modifiedTitle}
                   onChange={(e) => onModifiedTitleChange(e.target.value)}
                   className="bg-transparent text-xs font-bold text-green-600 dark:text-green-400 outline-none w-full truncate focus:bg-white dark:focus:bg-gray-700 rounded px-1 transition-all border border-transparent focus:border-gray-300 dark:focus:border-gray-600 text-right"
                   placeholder="Modified"
                   title="Modified File Name"
                 />
                 <Pencil size={10} className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 pointer-events-none" />
             </div>
             <span className="text-xs font-bold text-gray-400 ml-2 shrink-0 select-none">MODIFIED</span>
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
            automaticLayout: false // Critical for manual ResizeObserver logic
          }}
        />
      </div>
    </div>
  );
};

export default DiffViewer;