import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Copy } from 'lucide-react';
import {
  CHILDREN_PAGE,
  collectMatches,
  escapeRegExp,
  isLargeDocument,
  startsExpanded,
} from '../utils/treeUtils';

/**
 * A single expand/collapse command, not two independent signals.
 *
 * Expand All works by revealing collapsed branches, which mounts their child
 * nodes for the first time. Those children have to agree with the command that
 * is already in effect, so both the initial state and the effect read the same
 * `mode`. With two separate counters a freshly mounted node ran both effects and
 * the stale one won, which is why Expand All used to leave deep branches shut
 * after a Collapse All.
 */
interface ExpansionCommand {
  mode: 'expand' | 'collapse';
  /** Bumped on every click; `0` means no command has been issued yet. */
  version: number;
}

interface JsonTreeViewProps {
  data: any;
  searchTerm?: string;
  expansion?: ExpansionCommand;
}

interface TreeConfig {
  /** Paths that matched the current search, so each node does not re-scan its subtree. */
  matchedPaths: Set<string> | null;
  isLarge: boolean;
  searchTerm: string;
  currentMatchPath: string | null;
  expansion: ExpansionCommand;
}

const TreeContext = createContext<TreeConfig>({
  matchedPaths: null,
  isLarge: false,
  searchTerm: '',
  currentMatchPath: null,
  expansion: { mode: 'expand', version: 0 },
});

const getType = (value: any) => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

const HighlightedText: React.FC<{ text: string; term?: string; isCurrent?: boolean }> = ({
  text,
  term,
  isCurrent,
}) => {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <span
            key={i}
            className={`${isCurrent ? 'bg-orange-400 text-white' : 'bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white'} font-bold px-0.5 rounded`}
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

interface JsonNodeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  path: string;
  depth: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, isLast = true, path, depth }) => {
  const { matchedPaths, isLarge, searchTerm, currentMatchPath, expansion } =
    useContext(TreeContext);

  const type = getType(data);
  const isObject = type === 'object' || type === 'array';
  const keys = isObject ? Object.keys(data) : [];
  const isEmpty = isObject && keys.length === 0;

  // A node mounted while an Expand/Collapse All command is in effect must honour
  // it immediately, otherwise a branch revealed by Expand All would open with
  // its own default and hide everything below it. When no command has been
  // issued, fall back to the depth-based default: a large document opens with
  // only its first level, a small one opens a couple of levels deep.
  const [isExpanded, setIsExpanded] = useState(() =>
    expansion.version > 0
      ? expansion.mode === 'expand' || depth === 0
      : startsExpanded(depth, isLarge)
  );
  const [visibleCount, setVisibleCount] = useState(CHILDREN_PAGE);
  const nodeRef = useRef<HTMLDivElement>(null);

  // React to a new command on nodes that were already mounted when it arrived.
  useEffect(() => {
    if (expansion.version > 0) setIsExpanded(expansion.mode === 'expand' || depth === 0);
  }, [expansion.version, expansion.mode, depth]);

  const isCurrentKeyMatch = currentMatchPath === `${path}#key`;
  const isCurrentValueMatch = currentMatchPath === `${path}#value`;
  const isCurrentNode = isCurrentKeyMatch || isCurrentValueMatch;

  useEffect(() => {
    if (isCurrentNode && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentNode]);

  // Open a branch that contains a search hit. The lookup is a Set built once at
  // the root; the previous version JSON.stringify'd every node's subtree on
  // every keystroke, which is quadratic.
  const containsMatch = matchedPaths?.has(path) ?? false;
  useEffect(() => {
    if (searchTerm && containsMatch) setIsExpanded(true);
  }, [searchTerm, containsMatch]);

  const copyValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const isKeyMatch = Boolean(name && searchTerm && name.toLowerCase().includes(searchTerm.toLowerCase()));
  const isValueMatch =
    !isObject && Boolean(searchTerm) && String(data).toLowerCase().includes(searchTerm.toLowerCase());

  if (!isObject) {
    return (
      <div
        ref={nodeRef}
        className={`font-mono text-sm pl-4 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded flex group ${
          isCurrentNode
            ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700'
            : isValueMatch || isKeyMatch
              ? 'bg-yellow-50 dark:bg-yellow-900/10'
              : ''
        }`}
      >
        <span className="text-purple-600 dark:text-purple-400 mr-1">
          {name && (
            <>
              "<HighlightedText text={name} term={searchTerm} isCurrent={isCurrentKeyMatch} />":
            </>
          )}
        </span>
        <span
          className={
            type === 'string'
              ? 'text-green-600 dark:text-green-400'
              : type === 'number'
                ? 'text-blue-600 dark:text-blue-400'
                : type === 'boolean'
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-500'
          }
        >
          {type === 'string' ? '"' : ''}
          <HighlightedText text={String(data)} term={searchTerm} isCurrent={isCurrentValueMatch} />
          {type === 'string' ? '"' : ''}
        </span>
        {!isLast && <span className="text-gray-400">,</span>}
      </div>
    );
  }

  const visibleKeys = isExpanded ? keys.slice(0, visibleCount) : [];
  const hiddenCount = keys.length - visibleKeys.length;

  return (
    <div className={`font-mono text-sm pl-4 ${isKeyMatch ? 'bg-yellow-50 dark:bg-yellow-900/10 rounded' : ''}`}>
      <div
        ref={isKeyMatch ? nodeRef : null}
        className={`flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 py-0.5 rounded group ${
          isCurrentKeyMatch ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : ''
        }`}
        onClick={() => setIsExpanded((open) => !open)}
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

        <span className="text-gray-600 dark:text-gray-300">{type === 'array' ? '[' : '{'}</span>

        {!isExpanded && (
          <>
            <span className="text-gray-400 text-xs mx-2">
              {type === 'array' ? `${keys.length} items` : `${keys.length} keys`}
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              {type === 'array' ? ']' : '}'}
              {!isLast && <span className="text-gray-400">,</span>}
            </span>
          </>
        )}

        <button
          onClick={copyValue}
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary transition-opacity"
          title="Copy value"
        >
          <Copy size={12} />
        </button>
      </div>

      {isExpanded && !isEmpty && (
        <div className="border-l border-gray-200 dark:border-gray-700 ml-2">
          {visibleKeys.map((key, idx) => (
            <JsonNode
              key={key}
              name={type === 'array' ? undefined : key}
              data={data[key]}
              isLast={idx === visibleKeys.length - 1 && hiddenCount === 0}
              path={`${path}.${key}`}
              depth={depth + 1}
            />
          ))}

          {hiddenCount > 0 && (
            <button
              onClick={() => setVisibleCount((count) => count + CHILDREN_PAGE * 5)}
              className="ml-4 my-1 px-2 py-1 text-xs rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary hover:border-primary transition-colors"
            >
              Show {Math.min(hiddenCount, CHILDREN_PAGE * 5).toLocaleString()} more of{' '}
              {hiddenCount.toLocaleString()}
            </button>
          )}
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

export default function JsonTreeView({
  data,
  searchTerm = '',
  expansion = { mode: 'expand', version: 0 },
}: JsonTreeViewProps) {
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  const isLarge = useMemo(() => isLargeDocument(data), [data]);

  const { hits, onPath } = useMemo(() => collectMatches(data, searchTerm), [data, searchTerm]);

  useEffect(() => setCurrentMatchIdx(0), [hits]);

  const config = useMemo<TreeConfig>(
    () => ({
      matchedPaths: searchTerm ? onPath : null,
      isLarge,
      searchTerm,
      currentMatchPath: hits[currentMatchIdx] ?? null,
      expansion,
    }),
    [searchTerm, onPath, isLarge, hits, currentMatchIdx, expansion]
  );

  return (
    <TreeContext.Provider value={config}>
      <div>
        {searchTerm && hits.length > 0 && (
          <div className="flex-none bg-yellow-50 dark:bg-yellow-900/20 p-2 flex items-center justify-between text-xs border-b border-yellow-100 dark:border-yellow-900/30">
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              {hits.length.toLocaleString()} match{hits.length === 1 ? '' : 'es'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-yellow-800 dark:text-yellow-200">
                {currentMatchIdx + 1} / {hits.length}
              </span>
              <button
                onClick={() => setCurrentMatchIdx((i) => (i - 1 + hits.length) % hits.length)}
                aria-label="Previous match"
                className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded text-yellow-800 dark:text-yellow-200"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => setCurrentMatchIdx((i) => (i + 1) % hits.length)}
                aria-label="Next match"
                className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded text-yellow-800 dark:text-yellow-200"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        )}

        {isLarge && (
          <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">
            Large document — branches start collapsed, and long lists load in pages.
          </p>
        )}

        <div className="p-4 min-w-max">
          <JsonNode data={data} isLast path="root" depth={0} />
        </div>
      </div>
    </TreeContext.Provider>
  );
}
