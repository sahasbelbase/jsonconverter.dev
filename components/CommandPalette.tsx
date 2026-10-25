import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { TOOLS } from '../lib/tools';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ctrl/Cmd+K jump list. The sidebar only reveals its labels on hover, which is
 * unusable on touch and with a keyboard, so this is the accessible way around.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter((tool) =>
      `${tool.label} ${tool.desc} ${tool.heading} ${tool.keywords}`.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => setCursor(0), [query]);

  if (!isOpen) return null;

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault();
      go(results[cursor].path);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center p-4 pt-[12vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-secondary rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a tool…"
            aria-label="Search tools"
            className="flex-1 py-4 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
            esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No tool matches “{query}”.</p>
          )}
          {results.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => go(tool.path)}
                onMouseEnter={() => setCursor(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === cursor ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <Icon size={18} className={idx === cursor ? 'text-primary' : 'text-gray-400'} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{tool.label}</span>
                  <span className="block text-xs text-gray-400 truncate">{tool.desc}</span>
                </span>
                {idx === cursor && <CornerDownLeft size={14} className="text-gray-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
