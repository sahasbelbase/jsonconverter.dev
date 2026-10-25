# Dev Tools

A collection of developer utilities that run **entirely in your browser**. No
upload, no account, no server — which means you can safely paste an API response
that contains customer data, a production config, or a signing key.

Live at [jsonconverter-dev.vercel.app](https://jsonconverter-dev.vercel.app/).

## Tools

Each tool has its own URL, so every one of them is linkable and shareable.

| Tool | Path | What it does |
| --- | --- | --- |
| JSON Converter | `/` | Validate, prettify, minify and auto-repair JSON; flatten it to Excel or CSV |
| Format Converter | `/format-converter` | JSON ⇄ YAML, XML and CSV; JSON → TOML and `.properties` |
| JSONPath Query | `/json-query` | Run JSONPath expressions against a document |
| JSON Schema | `/json-schema` | Infer a draft 2020-12 schema from a sample, or validate against one |
| Diff Viewer | `/diff-viewer` | Side-by-side or inline diff with change navigation (F7) |
| Markdown | `/markdown-reader` | Live preview, HTML → Markdown, export to .md / .html / PDF / .doc |
| URL Encoder | `/url-encoder` | Encode, decode and parse URLs, with batch mode |
| Base64 | `/base64` | Text and files, URL-safe output, data URLs |
| Hash Generator | `/hash-generator` | MD5, SHA-1, SHA-256, SHA-384, SHA-512 for text or files |
| JWT Decoder | `/jwt-decoder` | Decode, verify (HS256/RS256/ES256) and review claims |
| Timestamp | `/timestamp-converter` | Epoch ⇄ ISO 8601 ⇄ local time |
| Time Zones | `/timezone-converter` | Convert between cities by name or airport code, plus a world clock |
| UUID | `/uuid-generator` | UUID v4, v7 and ULID in bulk, plus a UUID inspector |
| Regex Tester | `/regex-tester` | Live match highlighting, capture groups, replacement preview |
| Cron Parser | `/cron-parser` | Plain-English explanation and the next run times |
| HTML Viewer | `/html-viewer` | Sandboxed live preview, beautify and minify |
| XML Formatter | `/xml-formatter` | Beautify, minify and validate XML |
| Token Counter | `/token-counter` | Count tokens and estimate API cost for current OpenAI and Claude models |
| Media Player | `/media-player` | Play a direct MP4/MP3 link, or a YouTube/Vimeo embed |

Press <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> anywhere to jump between them.

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Regenerate the sitemap, typecheck, then build |
| `npm run typecheck` | `tsc --noEmit` on its own |
| `npm run sitemap` | Rewrite `public/sitemap.xml` from `lib/tools.ts` |
| `npm run preview` | Serve the production build locally |

### Ads

`components/AdSlot.tsx` renders real AdSense units, and renders **nothing** when
a slot id is missing. Copy `.env.example` to `.env` and fill in the slot ids from
your AdSense dashboard to turn them on.

## How it is put together

- **React 18 + React Router.** One lazily-loaded route per tool. `lib/tools.ts`
  is the single source of truth for routes, the sidebar, the command palette,
  the SEO metadata and the generated sitemap.
- **Tailwind CSS**, compiled at build time (not the CDN build).
- **Monaco Editor**, bundled rather than loaded from a CDN, so the app works
  offline as the PWA claims.
- **TypeScript in strict mode.** `npm run build` fails on a type error.

Adding a tool means adding an entry to `lib/tools.ts`, a page under `pages/`,
and a route in `App.tsx`. The sidebar, palette, SEO tags and sitemap follow.

### Privacy

Everything runs client-side. The only third-party scripts are Google Analytics
and AdSense, both loaded from `index.html`; neither sees the contents of any
tool. Tool inputs are kept in `localStorage` on your own machine so they survive
a reload — except in the JWT decoder, where the token is held only for the
session and the secret and private key never leave memory.

## Credits

Built by **Sahas Belbase** — [GitHub](https://github.com/sahasbelbase) ·
[LinkedIn](https://www.linkedin.com/in/sahas-belbase/) ·
[Portfolio](https://sahas.netlify.app/)
