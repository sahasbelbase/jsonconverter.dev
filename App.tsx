import React, { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import NotFound from './components/NotFound';
import { ToastProvider } from './lib/toast';

/**
 * One route per tool, each in its own lazily-loaded chunk.
 *
 * The previous build mounted all ten tools at once behind `hidden` CSS inside a
 * single 7.4 MB bundle, which meant six Monaco editors were alive at all times
 * and a global key handler belonging to the JSON tool could wipe its input while
 * you were using an unrelated tool.
 */
const ConverterPage = lazy(() => import('./pages/ConverterPage'));
const FormatPage = lazy(() => import('./pages/FormatPage'));
const QueryPage = lazy(() => import('./pages/QueryPage'));
const SchemaPage = lazy(() => import('./pages/SchemaPage'));
const DiffPage = lazy(() => import('./pages/DiffPage'));
const MarkdownPage = lazy(() => import('./pages/MarkdownPage'));
const UrlPage = lazy(() => import('./pages/UrlPage'));
const Base64Page = lazy(() => import('./pages/Base64Page'));
const HashPage = lazy(() => import('./pages/HashPage'));
const JwtPage = lazy(() => import('./pages/JwtPage'));
const TimestampPage = lazy(() => import('./pages/TimestampPage'));
const TimezonePage = lazy(() => import('./pages/TimezonePage'));
const UuidPage = lazy(() => import('./pages/UuidPage'));
const RegexPage = lazy(() => import('./pages/RegexPage'));
const CronPage = lazy(() => import('./pages/CronPage'));
const HtmlPage = lazy(() => import('./pages/HtmlPage'));
const XmlPage = lazy(() => import('./pages/XmlPage'));
const TokenizerPage = lazy(() => import('./pages/TokenizerPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));

const App: React.FC = () => (
  <BrowserRouter>
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ConverterPage />} />
          <Route path="format-converter" element={<FormatPage />} />
          <Route path="json-query" element={<QueryPage />} />
          <Route path="json-schema" element={<SchemaPage />} />
          <Route path="diff-viewer" element={<DiffPage />} />
          <Route path="markdown-reader" element={<MarkdownPage />} />
          <Route path="url-encoder" element={<UrlPage />} />
          <Route path="base64" element={<Base64Page />} />
          <Route path="hash-generator" element={<HashPage />} />
          <Route path="jwt-decoder" element={<JwtPage />} />
          <Route path="timestamp-converter" element={<TimestampPage />} />
          <Route path="timezone-converter" element={<TimezonePage />} />
          <Route path="uuid-generator" element={<UuidPage />} />
          <Route path="regex-tester" element={<RegexPage />} />
          <Route path="cron-parser" element={<CronPage />} />
          <Route path="html-viewer" element={<HtmlPage />} />
          <Route path="xml-formatter" element={<XmlPage />} />
          <Route path="token-counter" element={<TokenizerPage />} />
          <Route path="media-player" element={<MediaPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
