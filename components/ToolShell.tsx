import React from 'react';
import SeoHead from './SeoHead';
import type { ToolMeta } from '../lib/tools';

interface ToolShellProps {
  tool: ToolMeta;
  children: React.ReactNode;
  /** Long-form copy rendered under the tool, for people and for search engines. */
  article?: React.ReactNode;
}

/**
 * Every tool page renders through here so the canonical URL, title and
 * description always match the route the visitor is actually on.
 */
const ToolShell: React.FC<ToolShellProps> = ({ tool, children, article }) => (
  <div className="flex-1 flex flex-col">
    <SeoHead title={tool.title} description={tool.description} path={tool.path} />
    {/* A definite minimum height: the tool fills the viewport on a tall screen,
        but never collapses behind the article below it on a short one. */}
    <div className="flex-1 flex flex-col min-h-[34rem]">{children}</div>
    {article && (
      <article className="mt-8 prose prose-sm dark:prose-invert max-w-none px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        {article}
      </article>
    )}
  </div>
);

export default ToolShell;
