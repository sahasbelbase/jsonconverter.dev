/**
 * Generates public/sitemap.xml from lib/tools.ts.
 *
 * The hand-maintained sitemap listed five URLs for tools that were never built
 * (/base64-tools, /hash-generator, /timestamp-converter, /json-formatter,
 * /other-tools) and all of them resolved to the home page. Generating it means
 * the sitemap can only ever contain routes that exist.
 *
 * Run with: npm run sitemap
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'lib/tools.ts'), 'utf8');

const siteUrl = source.match(/export const SITE_URL = '([^']+)'/)?.[1];
if (!siteUrl) throw new Error('Could not find SITE_URL in lib/tools.ts');

const paths = [...source.matchAll(/^\s{4}path: '([^']+)',$/gm)].map((m) => m[1]);
if (!paths.length) throw new Error('Could not find any tool paths in lib/tools.ts');

const today = new Date().toISOString().slice(0, 10);

const urls = paths
  .map((path) => {
    const loc = `${siteUrl}${path === '/' ? '/' : path}`;
    const priority = path === '/' ? '1.0' : '0.8';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n');

writeFileSync(
  join(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
);

console.log(`Wrote public/sitemap.xml with ${paths.length} URLs.`);
