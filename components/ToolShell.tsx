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
    {/* The tool is given a definite height measured from the viewport, NOT a
        percentage of the scrolling card. A percentage height here (`h-full`)
        created a feedback loop with the live-laid-out Monaco editor: a nudge to
        the card's height grew the editor, which grew the card, without end,
        until the whole page was a million pixels tall. A viewport-based height
        cannot feed back, so the editor and JSON tree scroll inside their own
        panes while the card still scrolls down to the article below.
        `min-h-[32rem]` keeps it usable on a short screen. */}
    <div className="shrink-0 h-[calc(100vh-15rem)] min-h-[32rem] flex flex-col">{children}</div>
    {article && (
      <article className="shrink-0 mt-8 prose prose-base lg:prose-lg dark:prose-invert max-w-3xl px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        {article}
      </article>
    )}
  </>
);

export default ToolShell;
