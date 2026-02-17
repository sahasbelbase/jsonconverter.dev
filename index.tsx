import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Suppress benign ResizeObserver error which can occur when using Monaco Editor
// This error is harmless and typically happens when a ResizeObserver callback 
// modifies the size of an observed element within the same frame.
window.addEventListener('error', (e) => {
  if (
    e.message === 'ResizeObserver loop completed with undelivered notifications.' || 
    e.message === 'ResizeObserver loop limit exceeded' ||
    (typeof e.message === 'string' && e.message.includes('ResizeObserver'))
  ) {
    e.stopImmediatePropagation();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);