import React from 'react';
import UrlConverter from '../components/UrlConverter';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/url-encoder')!;

const UrlPage: React.FC = () => {
  const [value, setValue] = useLocalStorageState('urlInput');

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Encode, decode and inspect URLs</h2>
          <p>
            <code>encodeURIComponent</code> escapes everything that is not safe inside a single
            query value, including <code>/</code>, <code>?</code> and <code>&amp;</code>. Use it for
            the value of a parameter. <code>encodeURI</code> leaves the characters that give a URL
            its structure intact, so use it when you are escaping a whole address.
          </p>
          <p>
            Batch mode processes one line at a time, which is the quickest way to clean a list of
            redirect targets or tracking links pulled out of a log.
          </p>
        </>
      }
    >
      <UrlConverter initialValue={value} onValueChange={setValue} />
    </ToolShell>
  );
};

export default UrlPage;
