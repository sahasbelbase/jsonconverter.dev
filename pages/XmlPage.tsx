import React from 'react';
import XmlViewer from '../components/XmlViewer';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/xml-formatter')!;

const XmlPage: React.FC = () => {
  const toast = useToast();
  const [value, setValue] = useLocalStorageState('xmlInput');

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Format and check XML</h2>
          <p>
            Beautify indents each element on its own line; minify strips the whitespace between
            tags. Both preserve the text inside elements, including CDATA sections.
          </p>
        </>
      }
    >
      <XmlViewer value={value} onChange={setValue} onError={toast.error} />
    </ToolShell>
  );
};

export default XmlPage;
