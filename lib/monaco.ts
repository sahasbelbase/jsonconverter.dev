/**
 * Monaco is bundled with the app rather than pulled from a CDN at runtime.
 *
 * The previous build pointed the loader at jsdelivr, which meant every editor in
 * the app showed "Loading Editor..." forever when offline or behind a network
 * that blocks the CDN — while the app simultaneously shipped as an offline PWA.
 *
 * This module is only reachable from lazily-loaded tool chunks, so the editor
 * (and its workers) stay out of the initial payload.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

let configured = false;

export const setupMonaco = () => {
  if (configured) return;
  configured = true;

  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      // Only the two language services this app actually uses get a worker.
      // The TypeScript worker alone is ~6 MB of diagnostics machinery that
      // nothing here needs — syntax highlighting comes from Monaco's core, so
      // every other language falls back to the plain editor worker.
      switch (label) {
        case 'json':
          return new jsonWorker();
        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker();
        default:
          return new editorWorker();
      }
    },
  };

  loader.config({ monaco });
};

setupMonaco();

export { monaco };
