# jsonconverter.dev — audit (2026-10-23)

Baseline: `main` @ 53ae7b1. Build succeeds (`npm run build`), dev server runs.
Everything below was verified by reading the code and running the app locally.

---

## A. Broken / high impact

### A1. There is no routing at all
`App.tsx` wraps everything in `<BrowserRouter>` but never renders a `<Route>`.
Tool selection is React state + `localStorage`, so:

- `http://localhost:5173/jwt-decoder` renders the **Converter** (verified in browser).
- No tool is linkable or shareable; browser back/forward do nothing.
- `SeoHead` emits `<link rel="canonical" href=".../jwt-decoder">` based on the
  *active tool*, not the URL — so every URL can claim any canonical.
- `public/sitemap.xml` lists 13 URLs. All return the same page. Five of them
  (`/json-formatter`, `/base64-tools`, `/hash-generator`, `/timestamp-converter`,
  `/other-tools`) are for tools that **do not exist**.
- `AnalyticsTracker` tracks `location.pathname`, which never changes → every
  pageview lands on `/`.

Net effect: ~0 SEO value for 10 tools, and Google sees 13 duplicate pages.

### A2. `pages/` is dead code
`pages/JsonTool.tsx`, `DiffTool.tsx`, `FormatTool.tsx`, `HtmlTool.tsx` are never
imported (leftovers from the reverted refactor in `efa0309`). `JsonTool.tsx` even
contains the long-form SEO copy that the live site never renders.

### A3. All 10 tools mount at once
Every tool is rendered and hidden with `className="... hidden"`. That means
~6 Monaco editor instances, the tokenizer and the JWT tool are alive at all times.

Direct consequence — **cross-tool keyboard hijacking**: `InputArea` attaches a
`window` keydown listener (`InputArea.tsx:155`). Because `InputArea` is always
mounted, pressing **Ctrl/Cmd+X with nothing selected while in the JWT or Markdown
tool silently wipes the JSON converter's input**, and Ctrl+C copies the JSON
input instead of what you meant. Same for Ctrl+Enter.

### A4. Bundle is a single 7.4 MB file
```
dist/assets/index-*.js   7,437 kB │ gzip: 3,117 kB
```
No code splitting. The main cost is `js-tiktoken`'s bundled BPE ranks (`encodingForModel`
pulls them all in) plus `xlsx`, `html2pdf.js` and `react-markdown` — all loaded even
if you only wanted to prettify JSON. The PWA plugin then refuses to precache it:
`assets/index-*.js is 7.44 MB, and won't be precached`, so the "offline" PWA is not offline.

### A5. Theme preference is never saved
`theme` starts `'light'`; a mount effect flips it to dark only from
`prefers-color-scheme`. `toggleTheme` writes nothing. Every input field in the app
is persisted to localStorage — but the one setting a user actually toggles is lost
on reload.

### A6. JWT secrets and private keys are written to localStorage
`App.tsx:130-134` persists `jwtSecret`, `jwtPublicKey` and `jwtPrivateKey`.
The app's own selling point is "nothing leaves your browser"; leaving signing keys
in localStorage on a shared machine undercuts that. (The decoder itself is fine —
it uses WebCrypto correctly for HS256/RS256/ES256.)

### A7. "Bot protection" blocks real users, protects nothing
`utils/botUtils.ts` is called before converting. There is no server and no cost to
protect, yet it:
- blocks the Convert button whenever `navigator.webdriver` is set,
- caps the user at 20 conversions/minute,
- and on honeypot/`too fast` it **returns silently** — the button just does nothing,
  with no message (`InputArea.tsx:120-130`).

### A8. Ads are fake placeholders
`index.html` loads the real AdSense script with publisher `ca-pub-4378496741687724`,
but `AdSlot.tsx` renders a hand-drawn "Sponsored Placement / Advertisement" box and
never emits an `<ins class="adsbygoogle">`. Nothing is ever served and nothing is
earned; a dummy box labelled "Advertisement" is also the kind of thing AdSense
review flags.

---

## B. Correctness bugs in the converters

### B1. `toYAML` loses string types (`utils/formatUtils.ts`)
`escapeString` only quotes on special characters, so round-tripping breaks:
`"version": "1.0"` → `version: 1.0` (float), `"zip": "007"` → `zip: 007`,
`"answer": "yes"` → `answer: yes` (bool in YAML 1.1). Keys are never escaped at all.

### B2. `toXML` emits invalid XML for nulls
`null` becomes `<tag xsi:nil="true"/>` but `xmlns:xsi` is never declared → the
output fails any XML parser.

### B3. `toTOML` emits invalid TOML for nulls, and has dead code
`formatPrimitive(null)` returns `''`, producing a bare `key = ` line. The whole
`convert()` function (lines 136-175) is unreachable — `tomlify()` is what runs.
Nested tables inside `[[arrays]]` get the wrong path.

### B4. Media player can't play YouTube
`App.tsx` advertises "Play YouTube videos" in the meta description and the sitemap
has `/media-player`, but `MediaPlayer.tsx` is a bare `<video src>`. A YouTube URL
shows a black box. `react-player` is in the import map but not in `package.json`.
The Download button also uses `<a download>` on cross-origin URLs, where the
`download` attribute is ignored — it just opens the file.

### B5. Tokenizer numbers are stale and partly wrong
Model list is GPT-4o / GPT-3.5 / Claude 3.5 Sonnet with 2024 prices, and every
model is counted with `cl100k_base` — which is not Claude's tokenizer and not
o200k (GPT-4o/5). Counts for non-OpenAI models are approximations presented as facts.

---

## C. Build / dependency problems

### C1. No `tsconfig.json`
There is no TypeScript config and no typecheck script. Vite strips types with
esbuild without checking them, so **type errors cannot fail the build** — the
`.tsx` extensions are decoration right now.

### C2. `index.html` import map fights the bundler
A 20-entry import map pins CDN copies of react, xlsx, monaco, etc. Vite bundles
the npm copies, so the map is dead weight in production — except it is also
**internally inconsistent**: `react` → 18.3.1 but `react-dom/` → 19.2.4;
`react-markdown` 9 vs 10 installed; `marked` 12 vs 18; `html2pdf.js` 0.10.1 vs 0.14.
It even maps `vite` and `@vitejs/plugin-react`, which are build-time only.

### C3. Tailwind via `cdn.tailwindcss.com`
The CDN build is explicitly "not for production": it ships the JIT compiler to every
visitor, re-scans the DOM at runtime, and causes a flash of unstyled content.

### C4. Monaco from jsdelivr, so the "offline PWA" isn't
`MonacoEditor.tsx:5` points the loader at `cdn.jsdelivr.net`. Offline, or on a
network that blocks the CDN, every editor in the app shows "Loading Editor..." forever.

### C5. Global scrollbar suppression
`index.html` hides scrollbars on **every element** with `!important`
(`::-webkit-scrollbar { display: none }` + `scrollbar-width: none` on `*`), then
fights itself back with an ID-specific override for the tree pane. Users lose the
only cue that a long table or tree scrolls.

### C6. Vulnerable runtime deps
`npm audit`: 28 advisories. Most are dev-only, but `xlsx@0.18.5` (prototype
pollution + ReDoS, no npm fix published — SheetJS moved off npm) and `dompurify`
via `html2pdf.js` ship to users.

### C7. Misc
- `package.json` is still named `json-to-excel-converter`, version never bumped.
- No `.gitignore`, no lint config, no tests, no CI.
- README's feature list is aspirational (claims a Base64 tool, hash generator, etc.
  that don't exist) and the Tech Stack section says "ESM via CDN".
- Alert toasts have no dark-mode colours (`App.tsx:417`) — light chips on dark UI.
- `MediaPlayer` and `InputArea` use `window.alert()` for errors instead of the
  app's own toast.

---

## D. Suggested new features

Ordered by effort-to-value. Nothing here is started.

1. **Real routes + per-tool pages** — the fix for A1/A2, and the precondition for
   any SEO. One route per tool, lazy-loaded, with the long-form copy from
   `pages/JsonTool.tsx` actually rendered, plus a proper 404.
2. **The tools the sitemap already promises**: Base64 encoder/decoder, hash
   generator (MD5/SHA-1/SHA-256/SHA-512 via WebCrypto), timestamp/epoch converter.
3. **Reverse conversions** — YAML→JSON, XML→JSON, CSV→JSON. Today everything is
   one-way out of JSON.
4. **JSONPath / JMESPath query box** over the parsed tree.
5. **JSON Schema inference + validation** (generate a schema from a sample; validate
   a document against one).
6. **UUID / ULID generator**, **cron expression explainer**, **regex tester** —
   cheap, high-traffic tool pages.
7. **Command palette (Ctrl+K)** to jump between tools, replacing the hover-only sidebar.
8. **Share via URL fragment** — put the payload in the hash so links stay client-side.
9. **Web Worker for parsing/flattening** so multi-MB files don't freeze the tab
   (`processData` currently fakes async with `setTimeout(…, 100)`).
10. **Streaming/virtualised table** in `PreviewTable` (currently renders 20 rows/page
    but keeps every row in memory and re-filters the whole array on each keystroke).
