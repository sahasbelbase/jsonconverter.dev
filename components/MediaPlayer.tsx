import React, { useState, useRef } from 'react';
import { Play, Share2, Music, Video, Download } from 'lucide-react';
import Button from './Button';

interface MediaPlayerProps {
  initialUrl: string;
  onUrlChange: (url: string) => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ initialUrl, onUrlChange }) => {
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [currentMediaUrl, setCurrentMediaUrl] = useState(initialUrl);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (inputUrl.trim()) {
      setCurrentMediaUrl(inputUrl);
      onUrlChange(inputUrl);
      // Auto play when URL changes
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.play().catch(e => console.log("Autoplay prevented", e));
        }
      }, 100);
    }
  };

  const handleShare = () => {
    if (currentMediaUrl) {
      navigator.clipboard.writeText(currentMediaUrl);
      alert("Player link copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (!currentMediaUrl) return;

    // Direct file download
    const link = document.createElement('a');
    link.href = currentMediaUrl;
    link.download = currentMediaUrl.split('/').pop() || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadSample = (url: string) => {
    setInputUrl(url);
    setCurrentMediaUrl(url);
    onUrlChange(url);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-2 md:p-4">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* Left Side - Player */}
        <div className="flex-1 flex flex-col gap-4 min-h-[300px]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium mb-2">
              <Play size={12} className="fill-current" /> Media Player
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Online MP4 & MP3 Player
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Paste your MP4 video or MP3 audio link on the right to play your media instantly in the browser.
            </p>
          </div>

          <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-lg flex items-center justify-center min-h-[250px] md:min-h-[300px] relative group">
            {currentMediaUrl ? (
              <video 
                ref={videoRef}
                controls 
                className="w-full h-full max-h-[600px] object-contain"
                src={currentMediaUrl}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <Video size={48} className="mb-2 opacity-50" />
                <p>No media selected</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Controls */}
        <div className="w-full lg:w-96 flex-none pb-8 lg:pb-0">
          <div className="bg-white dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Media Control
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Media URL (MP4/MP3)
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="primary" 
                  onClick={handlePlay} 
                  className="w-full justify-center"
                  size="lg"
                  icon={<Play size={16} className="fill-current" />}
                >
                  Play
                </Button>

                <Button 
                  variant="secondary" 
                  onClick={handleDownload} 
                  className="w-full justify-center"
                  size="lg"
                  disabled={!currentMediaUrl}
                  icon={<Download size={16} />}
                >
                  Download
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={handleShare} 
                className="w-full justify-center border border-gray-200 dark:border-gray-700"
                icon={<Share2 size={16} />}
              >
                Share Player Link
              </Button>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Try Sample Media
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => loadSample('https://www.w3schools.com/html/mov_bbb.mp4')}
                    className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                  >
                    <Video size={14} /> Sample MP4 Video (Big Buck Bunny)
                  </button>
                  <button 
                    onClick={() => loadSample('https://www.w3schools.com/html/horse.mp3')}
                    className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                  >
                    <Music size={14} /> Sample Audio (Horse)
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
             <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-2">Our Media Player Features</h3>
             <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc pl-4">
                <li>Supports MP4, WebM, Ogg video formats</li>
                <li>Supports MP3, WAV, Ogg audio formats</li>
                <li>Responsive player with native controls</li>
                <li>Direct link sharing</li>
                <li>Secure client-side playback</li>
             </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MediaPlayer;
