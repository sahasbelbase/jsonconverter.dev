import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Copy, ChevronUp } from 'lucide-react';

interface JsonTreeViewProps {
  data: any;
  searchTerm?: string;
  expandAllSignal?: number;
  collapseAllSignal?: number;
}

interface JsonNodeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  searchTerm?: string;
  path: string;
  currentMatchPath?: string | null;
  expandAllSignal?: number;
  collapseAllSignal?: number;
}

const getType = (value: any) => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

const HighlightedText: React.FC<{ text: string; term?: string; isCurrent?: boolean }> = ({ text, term, isCurrent }) => {
  if (!term) return <>{text}</>;

  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <span key={i} className={`${isCurrent ? 'bg-orange-400 text-white' : 'bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white'} font-bold px-0.5 rounded`}>{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
};

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, isLast = true, searchTerm = '', path, currentMatchPath, expandAllSignal, collapseAllSignal }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandAllSignal && expandAllSignal > 0) {
      setIsExpanded(true);
    }
  }, [expandAllSignal]);

  useEffect(() => {
    if (collapseAllSignal && collapseAllSignal > 0) {
      setIsExpanded(false);
    }
  }, [collapseAllSignal]);

  // Check if this node is the current match
  const isCurrentKeyMatch = currentMatchPath === path + '#key';
  const isCurrentValueMatch = currentMatchPath === path + '#value';
  const isCurrentNode = isCurrentKeyMatch || isCurrentValueMatch;

  // Scroll to view if current match
  useEffect(() => {
    if (isCurrentNode && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentNode]);

  // Determine if this node should be expanded based on children matching
  const hasMatchInChildren = useMemo(() => {
    if (!searchTerm) return false;
    if (typeof data !== 'object' || data === null) return false;

    // Simple check: if JSON string of data includes search term
    const s = JSON.stringify(data).toLowerCase();
    return s.includes(searchTerm.toLowerCase());
  }, [data, searchTerm]);

  useEffect(() => {
    if (searchTerm && hasMatchInChildren) {
      setIsExpanded(true);
    }
  }, [searchTerm, hasMatchInChildren]);

  const type = getType(data);
  const isObject = type === 'object' || type === 'array';
  const keys = isObject ? Object.keys(data) : [];
  const isEmpty = isObject && keys.length === 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  // Check if current node matches search (key or value)
  const isKeyMatch = name && searchTerm && name.toLowerCase().includes(searchTerm.toLowerCase());
  const isValueMatch = !isObject && searchTerm && String(data).toLowerCase().includes(searchTerm.toLowerCase());

  if (!isObject) {
    return (
      <div
        ref={nodeRef}
        className={`font-mono text-sm pl-4 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded flex group ${isCurrentNode ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : (isValueMatch || isKeyMatch) ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}
      >
        <span className="text-purple-600 dark:text-purple-400 mr-1">
          {name && (
            <>
              "<HighlightedText text={name} term={searchTerm} isCurrent={isCurrentKeyMatch} />":
            </>
          )}
        </span>
        <span className={`${type === 'string' ? 'text-green-600 dark:text-green-400' :
          type === 'number' ? 'text-blue-600 dark:text-blue-400' :
            type === 'boolean' ? 'text-orange-600 dark:text-orange-400' :
              'text-gray-500'
          }`}>
          {type === 'string' ? '"' : ''}
          <HighlightedText text={String(data)} term={searchTerm} isCurrent={isCurrentValueMatch} />
          {type === 'string' ? '"' : ''}
        </span>
        {!isLast && <span className="text-gray-400">,</span>}
      </div>
    );
  }

  return (
    <div className={`font-mono text-sm pl-4 ${isKeyMatch ? 'bg-yellow-50 dark:bg-yellow-900/10 rounded' : ''}`}>
      <div
        ref={isKeyMatch ? nodeRef : null}
        className={`flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 py-0.5 rounded group ${isCurrentKeyMatch ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-gray-400 mr-1 w-4 flex justify-center">
          {!isEmpty && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </span>

        <span className="text-purple-600 dark:text-purple-400 mr-1">
          {name && (
            <>
              "<HighlightedText text={name} term={searchTerm} isCurrent={isCurrentKeyMatch} />":
            </>
          )}
        </span>

        <span className="text-gray-600 dark:text-gray-300">
          {type === 'array' ? '[' : '{'}
        </span>

        {!isExpanded && (
          <span className="text-gray-400 text-xs mx-2">
            {type === 'array' ? `Array(${keys.length})` : `Object({${keys.length}})`} ...
          </span>
        )}

        {!isExpanded && (
          <span className="text-gray-600 dark:text-gray-300">
            {type === 'array' ? ']' : '}'}
            {!isLast && <span className="text-gray-400">,</span>}
          </span>
        )}

        <button
          onClick={handleCopy}
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary transition-opacity"
          title="Copy Value"
        >
          <Copy size={12} />
        </button>
      </div>

      {isExpanded && !isEmpty && (
        <div className="border-l border-gray-200 dark:border-gray-700 ml-2">
          {keys.map((key, idx) => (
            <JsonNode
              key={key}
              name={type === 'array' ? undefined : key}
              data={data[key]}
              isLast={idx === keys.length - 1}
              searchTerm={searchTerm}
              path={`${path}.${key}`}
              currentMatchPath={currentMatchPath}
              expandAllSignal={expandAllSignal}
              collapseAllSignal={collapseAllSignal}
            />
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="pl-6 text-gray-600 dark:text-gray-300">
          {type === 'array' ? ']' : '}'}
          {!isLast && <span className="text-gray-400">,</span>}
        </div>
      )}
    </div>
  );
};

// Helper to find all matches
const findAllMatches = (data: any, term: string, path: string = 'root', matches: string[] = []) => {
  if (!term) return matches;
  const lowerTerm = term.toLowerCase();

  // Check primitive value
  if (typeof data !== 'object' || data === null) {
    if (String(data).toLowerCase().includes(lowerTerm)) {
      matches.push(path + '#value');
    }
    return matches;
  }

  // Check object/array keys and children
  Object.keys(data).forEach(key => {
    const currentPath = `${path}.${key}`;
    // Check key match
    if (!Array.isArray(data) && key.toLowerCase().includes(lowerTerm)) {
      matches.push(currentPath + '#key');
    }

    findAllMatches(data[key], term, currentPath, matches);
  });

  return matches;
};

export default function JsonTreeView({ data, searchTerm, expandAllSignal, collapseAllSignal }: JsonTreeViewProps) {
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [matches, setMatches] = useState<string[]>([]);

  useEffect(() => {
    if (searchTerm) {
      const found = findAllMatches(data, searchTerm);
      setMatches(found);
      setCurrentMatchIdx(0);
    } else {
      setMatches([]);
      setCurrentMatchIdx(0);
    }
  }, [data, searchTerm]);

  const handleNext = () => {
    setCurrentMatchIdx(prev => (prev + 1) % matches.length);
  };

  const handlePrev = () => {
    setCurrentMatchIdx(prev => (prev - 1 + matches.length) % matches.length);
  };

  return (
    <div>
      {/* Search Navigation Bar */}
      {searchTerm && matches.length > 0 && (
        <div className="flex-none bg-yellow-50 dark:bg-yellow-900/20 p-2 flex items-center justify-between text-xs border-b border-yellow-100 dark:border-yellow-900/30">
          <span className="text-yellow-800 dark:text-yellow-200 font-medium">
            {matches.length} matches found
          </span>
          <div className="flex items-center gap-2">
            <span className="text-yellow-800 dark:text-yellow-200">
              {currentMatchIdx + 1} / {matches.length}
            </span>
            <button onClick={handlePrev} className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded text-yellow-800 dark:text-yellow-200">
              <ChevronUp size={14} />
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded text-yellow-800 dark:text-yellow-200">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 min-w-max">
        <JsonNode
          data={data}
          isLast={true}
          searchTerm={searchTerm}
          path="root"
          currentMatchPath={matches[currentMatchIdx]}
          expandAllSignal={expandAllSignal}
          collapseAllSignal={collapseAllSignal}
        />
      </div>
    </div>
  );
}
