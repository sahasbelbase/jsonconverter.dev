import React from 'react';
import MediaPlayer from '../components/MediaPlayer';
import ToolShell from '../components/ToolShell';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';

const tool = TOOL_BY_PATH.get('/media-player')!;

const MediaPage: React.FC = () => {
  const [url, setUrl] = useLocalStorageState('mediaUrl', '', { maxChars: 2000 });
  const toast = useToast();

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Play a media link without downloading it</h2>
          <p>
            Paste a direct link to a video or audio file and it plays in the browser’s own player,
            with speed and loop controls. YouTube and Vimeo links are recognised and loaded through
            their official embed instead, since neither can be played from a{' '}
            <code>&lt;video&gt;</code> tag.
          </p>
          <h3>If a link will not play</h3>
          <p>
            Two things usually explain it. Either the URL points at a web page containing a player
            rather than at the media file itself, or the server hosting the file does not send a
            cross-origin header, in which case the browser blocks playback from another site. Both
            are decisions made by that server, not by this page.
          </p>
        </>
      }
    >
      <MediaPlayer
        initialUrl={url}
        onUrlChange={setUrl}
        onNotify={toast.success}
        onError={toast.error}
      />
    </ToolShell>
  );
};

export default MediaPage;
