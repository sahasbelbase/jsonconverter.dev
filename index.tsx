import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/globals.css';

/**
 * Monaco's ResizeObserver can fire the benign "loop limit exceeded" error.
 * It is harmless, but it surfaces as an overlay in dev and as noise in logs.
 */
const resizeObserverLoopErr =
  /ResizeObserver loop limit exceeded|ResizeObserver loop completed with undelivered notifications/;

window.addEventListener('error', (e) => {
  if (resizeObserverLoopErr.test(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
  if (resizeObserverLoopErr.test(msg)) e.preventDefault();
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
