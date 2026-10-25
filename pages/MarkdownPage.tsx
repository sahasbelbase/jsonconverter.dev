import React from 'react';
import MarkdownReader from '../components/MarkdownReader';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/markdown-reader')!;

const MarkdownPage: React.FC = () => {
  const [value, setValue] = useLocalStorageState('markdownInput');
  const toast = useToast();

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Markdown in, HTML out — and back again</h2>
          <p>
            Write Markdown and watch it render, or paste HTML and get clean Markdown back. The
            reverse direction is the useful one for salvaging content: paste the HTML of a page, a
            Confluence export or a rich-text email, and get Markdown you can actually keep in a
            repo.
          </p>
          <h3>What survives the round trip</h3>
          <p>
            Headings, lists, links, images, blockquotes and fenced code blocks convert cleanly in
            both directions. Tables, strikethrough and task lists work too — those are GitHub
            extensions rather than core Markdown, and they are enabled here.
          </p>
          <p>
            What does not survive is anything Markdown has no syntax for: inline styles, class
            names, <code>&lt;div&gt;</code> wrappers and layout. Those are dropped rather than
            preserved as raw HTML, which is usually what you want when the point is to get out of
            HTML.
          </p>
          <h3>Exports</h3>
          <p>
            <strong>.md</strong> and <strong>.html</strong> save the two sides directly.{' '}
            <strong>PDF</strong> renders the preview as it appears (always on a light background,
            so a dark theme does not print as a black page). <strong>.doc</strong> writes a Word
            file that Word and Pages both open.
          </p>
        </>
      }
    >
      <MarkdownReader
        value={value}
        onChange={setValue}
        onNotify={toast.success}
        onError={toast.error}
      />
    </ToolShell>
  );
};

export default MarkdownPage;
