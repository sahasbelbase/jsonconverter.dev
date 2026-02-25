# Dev Tools - Technical Documentation

## Overview
Dev Tools is a comprehensive, client-side developer utility suite built with React and TypeScript. It provides a collection of essential tools for developers, including JSON conversion, formatting, diffing, media playback, and token counting, all running directly in the browser without server-side processing for enhanced privacy and speed.

## Core Technologies & Libraries

### Framework & Runtime
- **React 18**: UI library for building interactive components.
- **TypeScript**: Strongly typed superset of JavaScript for code safety.
- **Vite**: Next-generation frontend tooling for fast builds and development.
- **Tailwind CSS**: Utility-first CSS framework for styling and dark mode support.

### Key Libraries
- **@monaco-editor/react**: Integration of the VS Code editor (Monaco) for robust code editing, syntax highlighting, and error detection.
- **xlsx**: Library for parsing and generating Excel (.xlsx) and CSV files.
- **lucide-react**: Consistent and lightweight icon set.
- **react-helmet-async**: Manages document head tags for SEO and metadata.
- **react-player**: Handles media playback for YouTube, MP4, and other formats.
- **js-tiktoken**: Tokenizer for OpenAI models, running efficiently in the browser.
- **react-router-dom**: Client-side routing (if applicable).

## Features & Algorithms

### 1. JSON Converter & Formatter
- **Recursive Flattening Algorithm**: Custom algorithm (`parseAndFlattenJSON`) to transform deeply nested JSON objects into flat table structures for Excel/CSV export.
- **Error Analysis**: `analyzeJsonError` utility that parses syntax errors and provides human-readable suggestions (e.g., detecting trailing commas, missing quotes).
- **Auto-Fix**: Heuristic-based `fixJson` function to correct common JSON errors like single quotes, missing commas, or trailing commas.

### 2. Code Editor (Monaco)
- **Validation**: Real-time JSON syntax validation with error markers (red squiggles) and gutter icons.
- **Minimap & Folding**: Advanced editor features enabled for better code navigation.
- **Theme Support**: Dynamic switching between VS Dark and Light themes based on app state.

### 3. Media Player
- **Universal Playback**: Supports YouTube, MP4, WebM, MP3, and HLS streams.
- **External Download Helper**: Bypasses CORS restrictions for YouTube downloads by routing to external services.
- **Direct Downloads**: Native browser download handling for direct media files.

### 4. Tokenizer (Token Counter)
- **Model Support**: Uses `cl100k_base` encoding (GPT-4, GPT-3.5) via `js-tiktoken`.
- **Visual Token Map**: Maps individual tokens to colored segments to visualize how LLMs process text.
- **Cost Estimation**: Real-time calculation of input/output costs for various models (GPT-4o, o1, etc.).

### 5. Diff Viewer
- **Text Comparison**: Side-by-side difference highlighting for text or code.

### 6. Other Tools
- **JWT Decoder**: Client-side decoding of JSON Web Tokens to inspect headers and payloads.
- **URL Encoder/Decoder**: Standard URI encoding/decoding utilities.
- **XML/HTML Formatters**: Beautification and minification of markup languages.

## Technical Techniques

### Client-Side Architecture
- **Zero-Backend Processing**: All data transformations (JSON -> Excel, Token Counting) happen in the browser. This ensures user data never leaves their device, enhancing security and privacy.
- **PWA (Progressive Web App)**: Configured with `vite-plugin-pwa` for offline capabilities and installability.

### Performance Optimization
- **Lazy Loading**: Heavy components or libraries can be split (though currently bundled for simplicity in this version).
- **Debouncing**: Input handling in the Tokenizer and Editor is debounced to prevent freezing the UI during heavy calculations.
- **Memoization**: React `useCallback` and `useMemo` hooks used to prevent unnecessary re-renders.

### SEO & Accessibility
- **Dynamic Meta Tags**: `SeoHead` component manages title, description, and Open Graph tags for each tool.
- **Structured Data**: JSON-LD schema injection for rich search results.
- **Responsive Design**: Mobile-first approach using Tailwind's responsive modifiers (`md:`, `lg:`).
- **Dark Mode**: System-aware dark mode with manual toggle, persisted in local state.

## Ads & Monetization
- **Google AdSense**: Integrated via `AdSlot` component with error handling and ad-blocking detection.
- **Ads.txt**: Static file served from `public/` to verify domain ownership for AdSense.
