import React, { useMemo } from 'react';
import { JSONPath } from 'jsonpath-plus';
import { AlertCircle } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import MonacoEditor from '../components/MonacoEditor';
import CopyButton from '../components/CopyButton';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/json-query')!;

const SAMPLE = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "price": 8.99 }
    ],
    "bicycle": { "color": "red", "price": 19.95 }
  }
}`;

const CHEATSHEET: { expression: string; meaning: string }[] = [
  { expression: '$', meaning: 'The root of the document.' },
  { expression: '$.store.book[*].title', meaning: 'Every book title.' },
  { expression: '$..price', meaning: 'Every price at any depth.' },
  { expression: '$.store.book[0,1]', meaning: 'The first two books.' },
  { expression: '$.store.book[-1:]', meaning: 'The last book.' },
  { expression: '$..book[?(@.price < 10)]', meaning: 'Books cheaper than 10.' },
  { expression: "$..book[?(@.category === 'fiction')]", meaning: 'Books in one category.' },
  { expression: '$..book.length', meaning: 'How many books there are.' },
];

const QueryPage: React.FC = () => {
  const [document, setDocument] = useLocalStorageState('queryDocument', SAMPLE);
  const [expression, setExpression] = useLocalStorageState('queryExpression', '$..book[?(@.price < 10)]');

  const result = useMemo(() => {
    if (!document.trim()) return { output: '', error: null as string | null, count: 0 };
    let data: unknown;
    try {
      data = JSON.parse(document);
    } catch (e) {
      return { output: '', error: `Document is not valid JSON — ${(e as Error).message}`, count: 0 };
    }

    if (!expression.trim()) return { output: '', error: null, count: 0 };

    try {
      const matches = JSONPath({ path: expression, json: data as object, wrap: true }) as unknown[];
      return { output: JSON.stringify(matches, null, 2), error: null, count: matches.length };
    } catch (e) {
      return { output: '', error: (e as Error).message, count: 0 };
    }
  }, [document, expression]);

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Pull one value out of a large response</h2>
          <p>
            JSONPath is to JSON what XPath is to XML. Instead of scrolling through a 5,000-line API
            response looking for the one field you need, you describe where it lives and get every
            match back.
          </p>
          <h3>The operators worth knowing</h3>
          <ul>
            <li>
              <code>$..key</code> — a recursive descent. This is the one that saves the most time:
              it finds <code>key</code> at any depth, however deeply the response nests it.
            </li>
            <li>
              <code>[?(@.field &gt; 10)]</code> — a filter. <code>@</code> is the current item, and
              the expression inside is ordinary JavaScript.
            </li>
            <li>
              <code>[start:end]</code> — slicing, including negatives, so <code>[-3:]</code> is the
              last three items.
            </li>
          </ul>
          <p>
            Filters are evaluated by the <code>jsonpath-plus</code> library in your browser against
            the document you pasted. Nothing is sent anywhere.
          </p>
        </>
      }
    >
      <div className="flex flex-col flex-1 gap-3 p-2 min-h-[420px]">
        <div className="flex-none">
          <div className="flex items-center gap-2">
            <input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              spellCheck={false}
              placeholder="$..book[?(@.price < 10)]"
              className="flex-1 px-4 py-2.5 font-mono text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {result.error ? '' : `${result.count} match${result.count === 1 ? '' : 'es'}`}
            </span>
          </div>
          {result.error && (
            <p className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {result.error}
            </p>
          )}
        </div>

        <div className="flex-1 grid lg:grid-cols-2 gap-3 min-h-[300px]">
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Document</span>
            </div>
            <div className="flex-1 min-h-[240px]">
              <MonacoEditor
                value={document}
                onChange={(value) => setDocument(value ?? '')}
                language="json"
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex-none h-9 px-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Matches</span>
              <CopyButton value={result.output} label="Copy" />
            </div>
            <div className="flex-1 min-h-[240px]">
              <MonacoEditor value={result.output} onChange={() => {}} language="json" readOnly />
            </div>
          </div>
        </div>

        <div className="flex-none rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Cheat sheet</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {CHEATSHEET.map((item) => (
              <button
                key={item.expression}
                onClick={() => setExpression(item.expression)}
                className="flex items-baseline gap-2 text-left py-0.5 group"
              >
                <code className="font-mono text-xs text-primary group-hover:underline shrink-0">
                  {item.expression}
                </code>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.meaning}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default QueryPage;
