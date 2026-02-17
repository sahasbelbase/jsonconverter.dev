import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl/Cmd', 'Enter'], description: 'Process / Convert JSON' },
    { keys: ['Ctrl/Cmd', 'F'], description: 'Search (Context aware)' },
    { keys: ['Esc'], description: 'Close Search / Modals' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold">
            <Keyboard size={20} className="text-primary" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between group">
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {shortcut.description}
              </span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, kIdx) => (
                  <kbd 
                    key={kIdx} 
                    className="px-2 py-1 text-xs font-sans font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm min-w-[24px] text-center"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800">
          <p className="font-semibold mb-1">How Search Works (Ctrl+F):</p>
          <p>
             If you click on the <strong>Code Editor</strong>, Ctrl+F searches the code.<br/>
             If you click on the <strong>Tree View</strong>, Ctrl+F searches the tree.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsHelp;
