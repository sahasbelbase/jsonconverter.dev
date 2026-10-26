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
  <>
    <SeoHead title={tool.title} description={tool.description} path={tool.path} />
    {/* The tool fills one screenful of the scrolling card (`h-full`) and no more,
        so its own scrollable panes — the editor and the JSON tree — scroll
        inside themselves instead of stretching the whole card to the height of
        their content. `shrink-0` keeps that height when an article sits below,
        and `min-h-[34rem]` stops it collapsing on a short viewport. The article
        is a sibling, reached by scrolling the card past the tool. */}
    <div className="shrink-0 h-full min-h-[34rem] flex flex-col">{children}</div>
    {article && (
      <article className="shrink-0 mt-8 prose prose-sm dark:prose-invert max-w-none px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        {article}
      </article>
    )}
  </>
);

export default ToolShell;
