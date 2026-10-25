import React from 'react';
import DiffViewer from '../components/DiffViewer';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/diff-viewer')!;

const DiffPage: React.FC = () => {
  const [original, setOriginal] = useLocalStorageState('diffOriginal');
  const [modified, setModified] = useLocalStorageState('diffModified');
  const [originalTitle, setOriginalTitle] = useLocalStorageState('diffOriginalTitle', 'Original');
  const [modifiedTitle, setModifiedTitle] = useLocalStorageState('diffModifiedTitle', 'Changed');
  const toast = useToast();

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Comparing two versions of anything</h2>
          <p>
            Paste the old version on the left and the new one on the right. Both panes are
            editable, so you can fix something and watch the diff update as you type.
          </p>
          <h3>Getting a diff that is actually readable</h3>
          <ul>
            <li>
              <strong>Format both</strong> pretty-prints two JSON documents with the same
              indentation first. Without it, a minified file against a formatted one shows up as
              “everything changed”.
            </li>
            <li>
              <strong>Ignore whitespace</strong> hides lines that differ only in spacing — useful
              after a re-indent or a change of editor.
            </li>
            <li>
              <strong>F7</strong> and <strong>Shift+F7</strong> step through the changes and wrap
              around at the end, so you can review a long file without scrolling.
            </li>
          </ul>
          <p>
            The comparison runs in a Web Worker in your browser. Nothing is uploaded, which makes
            this safe for config files and production data.
          </p>
        </>
      }
    >
      <DiffViewer
        original={original}
        modified={modified}
        originalTitle={originalTitle}
        modifiedTitle={modifiedTitle}
        onOriginalChange={setOriginal}
        onModifiedChange={setModified}
        onOriginalTitleChange={setOriginalTitle}
        onModifiedTitleChange={setModifiedTitle}
        onNotify={toast.info}
      />
    </ToolShell>
  );
};

export default DiffPage;
