import React from 'react';
import HtmlViewer from '../components/HtmlViewer';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/html-viewer')!;

const HtmlPage: React.FC = () => {
  const toast = useToast();
  const [value, setValue] = useLocalStorageState('htmlInput');

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Preview HTML without leaving the browser</h2>
          <p>
            The preview runs inside a sandboxed <code>&lt;iframe&gt;</code> with scripts disabled,
            so pasting markup from an untrusted source cannot touch this page or your storage.
          </p>
        </>
      }
    >
      <HtmlViewer value={value} onChange={setValue} onError={toast.error} />
    </ToolShell>
  );
};

export default HtmlPage;
