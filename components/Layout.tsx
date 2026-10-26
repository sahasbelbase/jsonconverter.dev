import React, { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Braces, Github, Globe, Keyboard, Linkedin, Moon, ShieldCheck, Sun } from 'lucide-react';
import Sidebar from './Sidebar';
import AdSlot from './AdSlot';
import ShortcutsHelp from './ShortcutsHelp';
import AnalyticsTracker from './AnalyticsTracker';
import CommandPalette from './CommandPalette';
import { useTheme } from '../lib/useTheme';
import { TOOL_BY_PATH } from '../lib/tools';
import { COMMAND_PALETTE_HINT } from '../lib/platform';

const WorkspaceFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      Loading tool…
    </div>
  </div>
);

const Layout: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [showPalette, setShowPalette] = React.useState(false);
  const location = useLocation();

  const tool = TOOL_BY_PATH.get(location.pathname);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette((open) => !open);
      }
      if (e.key === '?' && e.shiftKey && !/^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName ?? '')) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 overflow-hidden">
      <AnalyticsTracker />
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} />

      <header className="flex-none bg-white dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between ml-16 md:ml-auto">
          <Link to="/" className="flex items-center gap-3 group/logo">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Braces className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight leading-none block">
                Dev <span className="text-primary">Tools</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Developer Utilities
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPalette(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
              title={`Search tools (${COMMAND_PALETTE_HINT})`}
            >
              <span className="font-medium">Search tools</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                {COMMAND_PALETTE_HINT}
              </kbd>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 z-50 flex h-full">
          <Sidebar />
        </div>

        <main className="flex-1 flex flex-col min-h-0 w-full pr-2 md:pr-4 py-4 overflow-hidden relative pl-20 md:pl-24">
          <div className="flex-1 flex flex-col min-w-0 min-h-0 max-w-screen-2xl mx-auto w-full">
            <div className="flex-none flex items-center justify-between mb-2 px-1">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 ml-2 truncate">
                {tool?.heading ?? 'Dev Tools'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                <ShieldCheck size={12} className="text-green-600 dark:text-green-500" />
                <span className="hidden sm:inline">Runs entirely in your browser.</span>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-dark-secondary rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 relative flex flex-col min-h-0 overflow-y-auto">
              <Suspense fallback={<WorkspaceFallback />}>
                <Outlet />
              </Suspense>
            </div>

            {/* A single slim banner anchored below the workspace — out of the
                way of the tool, but still on screen as the user works. */}
            <AdSlot position="bottom" />
          </div>
        </main>
      </div>

      <footer className="flex-none bg-white dark:bg-dark-secondary border-t border-gray-200 dark:border-gray-700 py-3 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 ml-16 md:ml-auto">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Dev Tools. For devs, by a dev.
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/sahasbelbase"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-xs"
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/sahas-belbase/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-xs"
            >
              <Linkedin size={16} />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
            <a
              href="https://sahas.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-primary transition-colors flex items-center gap-2 text-xs"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">Portfolio</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
