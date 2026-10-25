import type { LucideIcon } from 'lucide-react';
import {
  FileJson, GitCompareArrows, FileCode2, Code, Calculator, Shield, Link2,
  CirclePlay, FileText, Binary, Hash, Clock, Fingerprint, Regex, CalendarClock,
  FileSearch, Shuffle,
} from 'lucide-react';

/**
 * The single source of truth for every tool: its route, its sidebar entry and
 * its SEO metadata.
 *
 * Previously the tool list lived in three places that drifted apart — a
 * `ToolMode` enum, a hand-written sidebar array, and a `switch` of SEO strings —
 * and `sitemap.xml` listed five URLs for tools that were never built. Routes,
 * navigation and the sitemap are all generated from this array now.
 */
export interface ToolMeta {
  /** Stable id, also used as the localStorage key prefix. */
  id: string;
  /** Route path, without a trailing slash. */
  path: string;
  /** Sidebar label. */
  label: string;
  /** Sidebar sub-label. */
  desc: string;
  icon: LucideIcon;
  /** Heading shown above the workspace. */
  heading: string;
  title: string;
  description: string;
  keywords: string;
  group: 'json' | 'text' | 'web' | 'generate';
}

export const TOOLS: ToolMeta[] = [
  {
    id: 'converter',
    path: '/',
    label: 'Converter',
    desc: 'Format & Export',
    icon: FileJson,
    heading: 'JSON Converter & Formatter',
    title: 'JSON to Excel/CSV Converter, Formatter & Validator',
    description:
      'Convert JSON to Excel (XLSX) or CSV instantly. Validate, prettify, minify and auto-repair JSON in your browser — nothing is uploaded.',
    keywords:
      'JSON converter, JSON to CSV, JSON to Excel, JSON formatter, JSON validator, online developer tools',
    group: 'json',
  },
  {
    id: 'format',
    path: '/format-converter',
    label: 'Formats',
    desc: 'JSON ↔ YAML/XML',
    icon: FileCode2,
    heading: 'Format Converter',
    title: 'JSON to YAML, XML, TOML & Back',
    description:
      'Convert JSON to YAML, XML, TOML, CSV or .properties — and convert YAML, XML and CSV back to JSON. Runs entirely client-side.',
    keywords: 'JSON to YAML, YAML to JSON, JSON to XML, XML to JSON, CSV to JSON, format converter, TOML',
    group: 'json',
  },
  {
    id: 'query',
    path: '/json-query',
    label: 'JSON Query',
    desc: 'JSONPath search',
    icon: FileSearch,
    heading: 'JSONPath Query',
    title: 'JSONPath Evaluator & Online JSON Query Tool',
    description:
      'Run JSONPath expressions against your JSON and see matches instantly, with a cheat sheet of the common operators.',
    keywords: 'JSONPath, JSON query, JSONPath evaluator, JSONPath tester, query JSON online',
    group: 'json',
  },
  {
    id: 'schema',
    path: '/json-schema',
    label: 'JSON Schema',
    desc: 'Infer & validate',
    icon: Shuffle,
    heading: 'JSON Schema Generator & Validator',
    title: 'JSON Schema Generator and Validator',
    description:
      'Infer a JSON Schema (draft 2020-12) from a sample document, or validate a document against a schema you already have.',
    keywords: 'JSON schema generator, infer JSON schema, validate JSON schema, JSON schema online',
    group: 'json',
  },
  {
    id: 'diff',
    path: '/diff-viewer',
    label: 'Diff',
    desc: 'Compare Text',
    icon: GitCompareArrows,
    heading: 'Diff Viewer',
    title: 'Text & Code Diff Viewer — Compare JSON, Code and Text',
    description:
      'Compare two files side by side, jump between changes, ignore whitespace or case, and swap panes. No data leaves your browser.',
    keywords: 'diff viewer, text compare, code diff, compare JSON, online diff tool, difference checker',
    group: 'text',
  },
  {
    id: 'markdown',
    path: '/markdown-reader',
    label: 'Markdown',
    desc: 'MD ↔ HTML',
    icon: FileText,
    heading: 'Markdown Reader & Converter',
    title: 'Markdown Editor, Previewer and HTML ↔ Markdown Converter',
    description:
      'Write Markdown with a live preview, convert HTML back into clean Markdown, and export to PDF, DOC or .md.',
    keywords: 'markdown reader, markdown preview, HTML to markdown, markdown to HTML, markdown to PDF',
    group: 'text',
  },
  {
    id: 'url',
    path: '/url-encoder',
    label: 'URL Encoder',
    desc: 'Parse & Encode',
    icon: Link2,
    heading: 'URL Encoder & Parser',
    title: 'URL Encoder / Decoder and Query String Parser',
    description:
      'Encode or decode URLs with batch support, and inspect every component of a URL including its query parameters.',
    keywords: 'URL encoder, URL decoder, encode URI, decode URI, URL parser, query string parser',
    group: 'web',
  },
  {
    id: 'base64',
    path: '/base64',
    label: 'Base64',
    desc: 'Encode & Decode',
    icon: Binary,
    heading: 'Base64 Encoder & Decoder',
    title: 'Base64 Encoder and Decoder (Text, Files, Data URLs)',
    description:
      'Encode text or files to Base64 and decode it back, with URL-safe output and data-URL support. Everything stays on your device.',
    keywords: 'base64 encode, base64 decode, base64 converter, data URL, URL-safe base64',
    group: 'web',
  },
  {
    id: 'hash',
    path: '/hash-generator',
    label: 'Hash',
    desc: 'SHA & MD5',
    icon: Hash,
    heading: 'Hash Generator',
    title: 'Hash Generator — SHA-1, SHA-256, SHA-384, SHA-512, MD5',
    description:
      'Generate cryptographic hashes of text or files in your browser using the Web Crypto API, and compare a hash against an expected value.',
    keywords: 'hash generator, SHA-256 online, SHA-512, MD5 generator, checksum, file hash',
    group: 'web',
  },
  {
    id: 'jwt',
    path: '/jwt-decoder',
    label: 'JWT Decoder',
    desc: 'Debug & Verify',
    icon: Shield,
    heading: 'JWT Decoder & Verifier',
    title: 'JWT Decoder, Verifier and Debugger',
    description:
      'Decode, verify and debug JSON Web Tokens. Supports HS256, RS256 and ES256 signatures plus a security review of the claims.',
    keywords: 'JWT decoder, JSON Web Token, verify JWT, debug JWT, HS256, RS256, ES256',
    group: 'web',
  },
  {
    id: 'timestamp',
    path: '/timestamp-converter',
    label: 'Timestamp',
    desc: 'Epoch & ISO',
    icon: Clock,
    heading: 'Timestamp Converter',
    title: 'Unix Timestamp Converter — Epoch, ISO 8601 and Local Time',
    description:
      'Convert between Unix epoch seconds or milliseconds, ISO 8601, UTC and your local time zone, with a live clock.',
    keywords: 'unix timestamp converter, epoch converter, ISO 8601, epoch to date, timestamp to date',
    group: 'generate',
  },
  {
    id: 'uuid',
    path: '/uuid-generator',
    label: 'UUID',
    desc: 'UUID & ULID',
    icon: Fingerprint,
    heading: 'UUID & ULID Generator',
    title: 'UUID Generator (v4, v7) and ULID Generator',
    description:
      'Generate cryptographically random UUID v4, time-ordered UUID v7 and ULID identifiers in bulk, and inspect what a UUID encodes.',
    keywords: 'UUID generator, GUID generator, UUID v4, UUID v7, ULID generator, random ID',
    group: 'generate',
  },
  {
    id: 'regex',
    path: '/regex-tester',
    label: 'Regex',
    desc: 'Test & Explain',
    icon: Regex,
    heading: 'Regex Tester',
    title: 'Regex Tester with Live Match Highlighting',
    description:
      'Test JavaScript regular expressions against sample text with live highlighting, capture groups and replacement preview.',
    keywords: 'regex tester, regular expression tester, regex online, regex match, regex replace',
    group: 'generate',
  },
  {
    id: 'cron',
    path: '/cron-parser',
    label: 'Cron',
    desc: 'Explain schedule',
    icon: CalendarClock,
    heading: 'Cron Expression Parser',
    title: 'Cron Expression Parser and Explainer',
    description:
      'Translate a cron expression into plain English and preview the next run times, with a reference for every field.',
    keywords: 'cron parser, cron expression, crontab, cron explainer, next run time',
    group: 'generate',
  },
  {
    id: 'html',
    path: '/html-viewer',
    label: 'HTML Viewer',
    desc: 'Beautify & View',
    icon: Code,
    heading: 'HTML Viewer & Beautifier',
    title: 'HTML Viewer, Beautifier and Live Preview',
    description:
      'Edit HTML with a live sandboxed preview, and beautify or minify it in one click. Secure client-side processing.',
    keywords: 'HTML viewer, HTML beautifier, HTML editor, live HTML preview, minify HTML',
    group: 'web',
  },
  {
    id: 'xml',
    path: '/xml-formatter',
    label: 'XML Formatter',
    desc: 'Beautify & Minify',
    icon: FileCode2,
    heading: 'XML Formatter',
    title: 'XML Formatter, Beautifier and Minifier',
    description:
      'Beautify, minify and validate XML with syntax highlighting, entirely in the browser.',
    keywords: 'XML formatter, XML beautifier, format XML, minify XML, online XML editor',
    group: 'text',
  },
  {
    id: 'tokenizer',
    path: '/token-counter',
    label: 'Tokenizer',
    desc: 'Count & Cost',
    icon: Calculator,
    heading: 'Token Counter & Cost Estimator',
    title: 'LLM Token Counter and API Cost Estimator',
    description:
      'Count tokens and estimate API cost for current OpenAI and Anthropic models, with a live breakdown of how your text is tokenized.',
    keywords: 'token counter, LLM tokens, GPT token counter, Claude token counter, API cost estimator',
    group: 'generate',
  },
  {
    id: 'media',
    path: '/media-player',
    label: 'Media Player',
    desc: 'Video & Audio',
    icon: CirclePlay,
    heading: 'Media Player',
    title: 'Online Media Player for MP4, WebM and MP3',
    description:
      'Play MP4, WebM, Ogg video and MP3, WAV audio from a direct link in your browser, with playback speed and loop controls.',
    keywords: 'online media player, play MP4, play MP3, web video player, stream video url',
    group: 'web',
  },
];

export const TOOL_BY_PATH = new Map(TOOLS.map((t) => [t.path, t]));

export const SITE_URL = 'https://jsonconverter-dev.vercel.app';
