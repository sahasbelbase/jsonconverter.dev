import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Music, Play, Share2, Video } from 'lucide-react';
import Button from './Button';

interface MediaPlayerProps {
  initialUrl: string;
  onUrlChange: (url: string) => void;
  onNotify?: (message: string) => void;
  onError?: (message: string) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SAMPLES = [
  { label: 'Sample MP4 video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', icon: Video },
  { label: 'Sample MP3 audio', url: 'https://www.w3schools.com/html/horse.mp3', icon: Music },
];

/** YouTube, Vimeo and friends cannot be played in a <video> tag — they need their embed. */
const getEmbedUrl = (raw: string): string | null => {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v');
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      if (url.pathname.startsWith('/embed/')) return `https://www.youtube-nocookie.com${url.pathname}`;
    }
    if (host === 'youtu.be') {
      return `https://www.youtube-nocookie.com/embed${url.pathname}`;
    }
    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
};

const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url);

const MediaPlayer: React.FC<MediaPlayerProps> = ({ initialUrl, onUrlChange, onNotify, onError }) => {
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [failed, setFailed] = useState(false);
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  const embedUrl = useMemo(() => (currentUrl ? getEmbedUrl(currentUrl) : null), [currentUrl]);
  const audioOnly = useMemo(() => isAudio(currentUrl), [currentUrl]);

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.playbackRate = speed;
  }, [speed, currentUrl]);

  const play = () => {
    const url = inputUrl.trim();
    if (!url) return;
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      onError?.('That is not a valid URL. Paste a full link including https://');
      return;
    }
    setFailed(false);
    setCurrentUrl(url);
    onUrlChange(url);
  };

  const share = async () => {
    if (!currentUrl) return;
    const link = `${window.location.origin}${window.location.pathname}?src=${encodeURIComponent(currentUrl)}`;
    try {
      await navigator.clipboard.writeText(link);
      onNotify?.('Player link copied to the clipboard.');
    } catch {
      onError?.('The browser blocked clipboard access.');
    }
  };

  // A ?src= link opens straight into the player.
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get('src');
    if (src && !initialUrl) {
      setInputUrl(src);
      setCurrentUrl(src);
    }
  }, [initialUrl]);

  const download = () => {
    if (!currentUrl) return;
    // The `download` attribute is ignored cross-origin, so this opens the file
    // in a new tab rather than silently doing nothing.
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
    onNotify?.('Opened the file in a new tab — use your browser’s Save to keep it.');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full overflow-y-auto p-2">
      <div className="flex-1 flex flex-col gap-3 min-h-[320px]">
        <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-lg flex items-center justify-center min-h-[280px] relative">
          {!currentUrl ? (
            <div className="text-gray-500 flex flex-col items-center">
              <Video size={44} className="mb-2 opacity-50" />
              <p className="text-sm">No media loaded</p>
            </div>
          ) : embedUrl ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title="Embedded player"
              className="w-full h-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : failed ? (
            <div className="text-center text-gray-400 p-6 text-sm">
              <p className="font-medium mb-1">The browser could not play that link.</p>
              <p className="text-xs">
                It needs to be a direct file URL (ending in .mp4, .webm, .mp3…) that allows
                cross-origin playback. A page containing a player will not work.
              </p>
            </div>
          ) : audioOnly ? (
            <audio
              ref={mediaRef}
              key={currentUrl}
              src={currentUrl}
              controls
              loop={loop}
              onError={() => setFailed(true)}
              className="w-full px-6"
            />
          ) : (
            <video
              ref={mediaRef}
              key={currentUrl}
              src={currentUrl}
              controls
              loop={loop}
              playsInline
              onError={() => setFailed(true)}
              className="w-full h-full max-h-[600px] object-contain"
            />
          )}
        </div>

        {!embedUrl && currentUrl && !failed && (
          <div className="flex-none flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Speed</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark text-sm"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Loop
            </label>
          </div>
        )}
      </div>

      <div className="w-full lg:w-80 flex-none space-y-4">
        <div className="bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Media URL
            </span>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && play()}
              placeholder="https://example.com/video.mp4"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={play} className="w-full justify-center" icon={<Play size={15} />}>
              Play
            </Button>
            <Button
              variant="secondary"
              onClick={download}
              disabled={!currentUrl || !!embedUrl}
              className="w-full justify-center"
              icon={<Download size={15} />}
            >
              Open file
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={share}
            disabled={!currentUrl}
            className="w-full justify-center border border-gray-200 dark:border-gray-700"
            icon={<Share2 size={15} />}
          >
            Copy player link
          </Button>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">Try a sample</p>
            {SAMPLES.map(({ label, url, icon: Icon }) => (
              <button
                key={url}
                onClick={() => {
                  setInputUrl(url);
                  setCurrentUrl(url);
                  setFailed(false);
                  onUrlChange(url);
                }}
                className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900">
          <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">What plays here</p>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc pl-4">
            <li>Direct links to MP4, WebM and Ogg video</li>
            <li>Direct links to MP3, WAV, M4A and Ogg audio</li>
            <li>YouTube and Vimeo links, through their own embed</li>
            <li>Playback speed and loop, for everything but embeds</li>
          </ul>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-2">
            A direct link has to allow cross-origin playback. If a server sends no CORS header the
            browser refuses it, and nothing this page does can change that.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
