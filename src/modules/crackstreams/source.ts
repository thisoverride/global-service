import { lookup } from 'dns/promises';
import { request } from 'https';
import * as ipaddr from 'ipaddr.js';
import { load } from 'cheerio';
import { InputError } from '../../core/modules/http';

export function sourceURL(input: unknown): string {
  if (typeof input !== 'string' || input.length > 2048) throw new InputError('Adresse du site invalide.');
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new InputError('Saisissez une adresse HTTPS complète.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !host.includes('.') || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(host) || ipaddr.isValid(host)) {
    throw new InputError('Utilisez un site public en HTTPS, sans identifiants ni port particulier.');
  }
  url.hash = '';
  return url.href;
}

export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

export function catalogueURL(source: string, path?: unknown): URL {
  const base = new URL(sourceURL(source));
  if (path === undefined || path === '') return base;
  if (typeof path !== 'string' || path.length > 2048 || !/^\/(league|stream)\/[a-zA-Z0-9_\/-]+$/.test(path)) {
    throw new InputError('Catégorie invalide.');
  }
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new InputError('Lien externe refusé.');
  return url;
}

// Fetch only public HTML. The validated DNS result is pinned to the socket,
// preventing a second DNS lookup from changing the destination to the LAN.
export async function fetchHTML(url: URL, redirects = 0): Promise<string> {
  const answers = await lookup(url.hostname, { all: true });
  if (!answers.length || answers.some(answer => !publicAddress(answer.address))) throw new InputError('Cette adresse ne désigne pas un site public.');
  const address = answers.find(answer => answer.family === 4) || answers[0];
  const result = await new Promise<{ html?: string; location?: string }>((resolve, reject) => {
    const req = request({ hostname: address.address, family: address.family,
      servername: url.hostname, port: 443, path: url.pathname + url.search,
      headers: { Host: url.host, Accept: 'text/html', 'Accept-Encoding': 'identity', 'User-Agent': 'GlobalService-TV/1.0' },
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        res.resume(); resolve({ location: res.headers.location }); return;
      }
      if (res.statusCode !== 200 || !res.headers['content-type']?.includes('text/html')) {
        res.resume(); reject(new InputError('Le site ne renvoie pas de page disponible.', 502)); return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on('data', chunk => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) req.destroy(new Error('HTML limit'));
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
    });
    const deadline = setTimeout(() => req.destroy(new Error('HTML timeout')), 10000);
    req.on('error', () => reject(new InputError('Le site est momentanément inaccessible.', 502)));
    req.on('close', () => clearTimeout(deadline));
    req.end();
  });
  if (result.html !== undefined) return result.html;
  if (!result.location || redirects >= 2) throw new InputError('Redirection du site non prise en charge. Mettez son adresse à jour.', 502);
  const next = new URL(result.location, url);
  if (next.origin !== url.origin || next.username || next.password) throw new InputError('Le site a changé de domaine. Modifiez son adresse dans les réglages.', 409);
  return fetchHTML(next, redirects + 1);
}

export interface CatalogItem { title: string; path: string; url: string; kind: 'category' | 'event' }
export function parseCatalog(html: string, url: URL): CatalogItem[] {
  const $ = load(html);
  const items = new Map<string, CatalogItem>();
  $('a[href]').each((_index, el) => {
    if (items.size >= 100) return;
    // Footer/SEO links are not sporting events. Navigation can contribute
    // categories, but event links must come from the actual programme.
    if ($(el).closest('footer,aside,.league-article').length) return;
    let target: URL;
    try { target = new URL($(el).attr('href') || '', url); } catch { return; }
    if (target.origin !== url.origin || target.username || target.password) return;
    const match = target.pathname.match(/^\/(league|stream)\/[a-zA-Z0-9_\/-]+$/);
    if (!match) return;
    if (match[1] === 'stream' && $(el).closest('nav,header').length) return;
    const title = ($(el).find('h2,h3').first().text() || $(el).text()).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!title) return;
    target.search = ''; target.hash = '';
    const entry = { title, path: target.pathname, url: target.href, kind: match[1] === 'league' ? 'category' as const : 'event' as const };
    if (!items.has(entry.path)) items.set(entry.path, entry);
  });
  return Array.from(items.values());
}

export class Catalog {
  private cache = new Map<string, { expires: number; items: CatalogItem[] }>();
  constructor(private fetcher = fetchHTML) {}
  async read(source: string, path?: unknown) {
    const url = catalogueURL(source, path);
    const cached = this.cache.get(url.href);
    if (cached && cached.expires > Date.now()) return cached.items;
    const items = parseCatalog(await this.fetcher(url), url);
    if (this.cache.size >= 32) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(url.href, { expires: Date.now() + 60000, items });
    return items;
  }
}
