# HANDOFF — jsonconverter.dev

Last updated: 2026-10-25

## What this project is

A collection of developer utilities that run entirely client-side. React 18 +
Vite + TypeScript + Tailwind, deployed on Vercel at
`https://jsonconverter-dev.vercel.app`. Repo:
`https://github.com/sahasbelbase/jsonconverter.dev`.

Local checkout: `/Users/sahas/Documents/Projects/devtools/jsonconverter.dev`

## State

Branch **`feat/routing-and-tools`**, one commit ahead of `main` (`45ae302`).
**Not pushed. No PR.** `main` is still the old version.

`npm run build` passes (sitemap → `tsc --noEmit` → vite build). All 18 routes
were opened in a browser and render with no console errors.

### Measured results

| | Before | After |
| --- | --- | --- |
| First-load JS | 7,437 KB (3,117 KB gzip) | 222 KB (73 KB gzip) |
| First-load CSS | Tailwind CDN compiler | 62 KB (10 KB gzip) |
| PWA precache | nothing (bundle too big to cache) | 414 KB, 9 entries |
| Routes | 1 (everything rendered `/`) | 18, one per tool |
| Typecheck | no tsconfig at all | strict, fails the build |

## What was done

Full findings from the audit of the original code are in **`AUDIT.md`**.
The commit message on `45ae302` lists every fix. In short:

- **Real routing.** `BrowserRouter` had no `<Route>`; every URL rendered the
  converter. `lib/tools.ts` is now the single source of truth for routes, the
  sidebar, the ⌘K palette, SEO tags and the generated sitemap.
- **Code splitting.** One lazy chunk per tool. Monaco, the tokenizer rank
  tables and html2pdf load on demand.
- **Toolchain.** Added `tsconfig.json` (there was none), compiled Tailwind,
  deleted the broken 20-entry import map, bundled Monaco instead of CDN.
- **Bug fixes.** Theme now persists; JWT secrets no longer written to
  localStorage; YAML/XML/TOML emitters rewritten (they were corrupting data);
  Monaco layout fixed; client-side "bot protection" removed; real AdSense units
  replace the fake placeholder boxes.
- **New tools.** Base64, hash generator, timestamp, UUID/ULID, regex tester,
  cron parser, JSONPath, JSON Schema, reverse format converters, HTML→Markdown.
- **Rebuilt.** Diff viewer (change navigation, F7), token counter (current
  models and prices), media player (YouTube/Vimeo), markdown reader.

## Next steps

1. **Review the branch**, then push and open a PR:
   ```bash
   git push -u origin feat/routing-and-tools
   ```
2. **Fill in the AdSense slot ids.** `components/AdSlot.tsx` renders nothing
   without them. Copy `.env.example` to `.env`, get the three slot ids from the
   AdSense dashboard (Ads → By ad unit), and set the same vars in Vercel's
   environment settings. Until then the site shows no ads at all — which is
   correct, but earns nothing.
3. **Re-submit the sitemap in Search Console** after deploying. The old sitemap
   had 13 URLs that all served the same page; the new one has 18 real ones.
   Expect Google to take a few weeks to re-crawl.
4. **Decide about the domain.** `SITE_URL` in `lib/tools.ts` and the canonical
   tags all point at `jsonconverter-dev.vercel.app`. If the real domain is
   meant to be `jsonconverter.dev`, change that one constant and re-run
   `npm run sitemap`.

### Known gaps (deliberate, not bugs)

- **Claude token counts are estimates.** Anthropic publishes no browser
  tokenizer, so `lib/models.ts` encodes with cl100k and scales by 1.3× for
  Claude 4.7+. The UI says so. Prices in that file are dated `2026-10-23` and
  will drift — they are all in one array, easy to refresh.
- **The JSON Schema validator is partial.** It does not resolve `$ref`,
  evaluate `if/then/else`, or assert `format`. The page says so. If it needs to
  be complete, swap in Ajv.
- **No tests.** There are none and there never were. The MD5 implementation and
  the cron matcher were verified against Node's `crypto` and by hand during
  development, but nothing is pinned down in CI. A few Vitest cases around
  `utils/` (formatUtils round trips, hashUtils, cronUtils, schemaUtils) would
  be the highest-value thing to add next.
- **Flattening still runs on the main thread.** `parseAndFlattenJSON` is
  synchronous; a multi-MB file will freeze the tab for a moment. Moving it to a
  Web Worker is the obvious follow-up.
- **`npm audit` still reports dev-dependency advisories.** The runtime ones
  (xlsx) are fixed; the rest are transitive build tooling.

## Sahas's rules for whoever picks this up

- Write a `HANDOFF.md` like this one, unprompted, when a chat gets long: what
  the project is, what is done with measured numbers, what is next step by
  step, open decisions, file paths. Then hand over a ready-to-paste prompt and
  say plainly that it is time to start a new chat.
- Report what was actually measured, not what should work.

## Key files

| Path | Why it matters |
| --- | --- |
| `lib/tools.ts` | Every route, label, icon and SEO string. Start here to add a tool. |
| `App.tsx` | The route table. One `lazy()` import per page. |
| `components/Layout.tsx` | Header, sidebar, ad slots, `<Outlet/>`, footer. |
| `components/ToolShell.tsx` | Wraps each page with its SEO head and article. |
| `lib/models.ts` | Token prices. The thing most likely to go stale. |
| `utils/formatUtils.ts` | All the JSON ⇄ YAML/XML/CSV/TOML conversion. |
| `scripts/generate-sitemap.mjs` | Run via `npm run sitemap`; reads `lib/tools.ts`. |
| `AUDIT.md` | What was wrong with the original code, with evidence. |
