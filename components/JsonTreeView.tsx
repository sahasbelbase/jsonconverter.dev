import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';

interface JsonTreeViewProps {
  data: any;
  searchTerm?: string;
}

interface JsonNodeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  searchTerm?: string;
  forceExpand?: boolean;
}

const getType = (value: any) => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

// Helper to check if a node or its children match the search term
const checkMatch = (data: any, name: string | undefined, term: string): boolean => {
  if (!term) return false;
  const lowerTerm = term.toLowerCase();
  
  // Check current key
  if (name && name.toLowerCase().includes(lowerTerm)) return true;
  
  // Check primitive value
  if (typeof data !== 'object' && String(data).toLowerCase().includes(lowerTerm)) return true;

  return false;
};

const HighlightedText: React.FC<{ text: string; term?: string }> = ({ text, term }) => {
  if (!term) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white font-bold px-0.5 rounded">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
};

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, isLast = true, searchTerm = '', forceExpand = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Determine if this node should be expanded based on children matching
  const hasMatchInChildren = useMemo(() => {
    if (!searchTerm) return false;
    if (typeof data !== 'object' || data === null) return false;
    
    // Recursive check usually expensive, but needed for "Filter/Expand" behavior
    // For simplicity in this version, we expand if the DIRECT key/value matches 
    // OR if we pass a forceExpand from parent. 
    // Ideally, we'd do a full deep search before rendering, but React state makes this tricky without a pre-processing step.
    // We will rely on the parent telling us to expand, or default behavior.
    
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

  // Check if current node matches search
  const isKeyMatch = name && searchTerm && name.toLowerCase().includes(searchTerm.toLowerCase());
  const isValueMatch = !isObject && searchTerm && String(data).toLowerCase().includes(searchTerm.toLowerCase());

  if (!isObject) {
    return (
      <div className={`font-mono text-sm pl-4 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded flex group ${isValueMatch ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
        <span className="text-purple-600 dark:text-purple-400 mr-1">
          {name && (
            <>
              "<HighlightedText text={name} term={searchTerm} />":
            </>
          )}
        </span>
        <span className={`${
          type === 'string' ? 'text-green-600 dark:text-green-400' :
          type === 'number' ? 'text-blue-600 dark:text-blue-400' :
          type === 'boolean' ? 'text-orange-600 dark:text-orange-400' :
          'text-gray-500'
        }`}>
          {type === 'string' ? '"' : ''}
          <HighlightedText text={String(data)} term={searchTerm} />
          {type === 'string' ? '"' : ''}
        </span>
        {!isLast && <span className="text-gray-400">,</span>}
      </div>
    );
  }

  return (
    <div className={`font-mono text-sm pl-4 ${isKeyMatch ? 'bg-yellow-50 dark:bg-yellow-900/20 rounded' : ''}`}>
      <div 
        className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 py-0.5 rounded group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-gray-400 mr-1 w-4 flex justify-center">
          {!isEmpty && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </span>
        
        <span className="text-purple-600 dark:text-purple-400 mr-1">
          {name && (
             <>
               "<HighlightedText text={name} term={searchTerm} />":
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

export default function JsonTreeView({ data, searchTerm }: JsonTreeViewProps) {
  return (
    <div className="p-4 bg-white dark:bg-dark-secondary rounded-none lg:rounded-br-xl h-full overflow-auto">
      <JsonNode data={data} isLast={true} searchTerm={searchTerm} />
    </div>
  );
}