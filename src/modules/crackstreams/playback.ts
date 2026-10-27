import { randomBytes, createHash } from 'crypto';
import { load } from 'cheerio';
import { InputError } from '../../core/modules/http';
import { catalogueURL, sourceURL } from './source';
import { publicFetch, PublicResponse, FetchOptions } from './publicFetch';

export interface PlayerLinks { media: string[]; players: string[] }
export function playerLinks(html: string, base: URL): PlayerLinks {
  const $ = load(html), media = new Set<string>(), players = new Set<string>();
  const add = (set: Set<string>, raw: unknown) => {
    if (typeof raw !== 'string' || set.size >= 8) return;
    try { set.add(sourceURL(new URL(raw.replace(/\\\//g, '/'), base).href)); } catch { /* skip non-public URL syntax */ }
  };
  $('video[src],video source[src],source[type="application/x-mpegURL"]').each((_i, element) => add(media, $(element).attr('src')));
  $('iframe[src]').each((_i, element) => {
    if (!$(element).closest('aside,footer').length) add(players, $(element).attr('src'));
  });
  $('script:not([src])').each((_i, element) => {
    const script = $(element).text();
    // Parse data only. Never evaluate the site's scripts or execute its ads.
    if (script.length > 128000) return;
    const list = script.match(/\ballStreams\s*=\s*(\[[^\n]*\])\s*;/);
    if (list) {
      try { for (const item of JSON.parse(list[1]).slice(0, 8)) add(players, item.value); } catch { /* unknown player schema */ }
    }
    for (const match of script.matchAll(/\bDIRECT_STREAM_URL\s*=\s*("(?:[^"\\]|\\.)*"|'[^'\r\n]*')/g)) {
      try { add(media, match[1][0] === '"' ? JSON.parse(match[1]) : match[1].slice(1, -1)); } catch { /* invalid literal */ }
    }
    for (const match of script.matchAll(/(?:\bfile|\bsrc|\bsource)\s*:\s*["'](https?:[^"'\s]+\.m3u8(?:\?[^"'\s]*)?)["']/g)) add(media, match[1]);
  });
  return { media: [...media], players: [...players] };
}

export function validatePlaylist(body: Buffer): string {
  const text = body.toString('utf8').replace(/^\uFEFF/, '');
  if (!text.startsWith('#EXTM3U') || text.length > 1024 * 1024) throw new InputError('Ce lecteur ne fournit pas de playlist HLS compatible.', 422);
  if (/METHOD=SAMPLE-AES|KEYFORMAT="(?!identity")/i.test(text)) throw new InputError('Ce flux nécessite un lecteur avec DRM. Il n’est pas pris en charge.', 422);
  return text;
}

interface PlaybackSession {
  tokenHash: string; expires: number; created: number; referer: string;
  resources: Map<string, string>; byUrl: Map<string, string>; nextId: number;
}
type Fetcher = (url: URL, options?: FetchOptions) => Promise<PublicResponse>;
export class Playback {
  private sessions = new Map<string, PlaybackSession>();
  private resolving = 0;
  private downloads = 0;
  constructor(private fetcher: Fetcher = publicFetch) {}

  async resolve(source: string, path: unknown, token: string) {
    if (typeof path !== 'string' || !path.startsWith('/stream/')) throw new InputError('Choisissez une diffusion dans le catalogue.');
    const page = catalogueURL(source, path);
    if (this.resolving >= 2) throw new InputError('Une recherche est déjà en cours. Patientez.', 429);
    this.resolving++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const signal = controller.signal;
    try {
      const queue = [{ url: page.href, referer: source, depth: 0 }], seen = new Set<string>();
      let drm = false;
      while (queue.length && seen.size < 8 && !signal.aborted) {
        const next = queue.shift()!;
        if (seen.has(next.url)) continue;
        seen.add(next.url);
        try {
          const response = await this.fetcher(new URL(next.url), { referer: next.referer, maxBytes: 2 * 1024 * 1024, signal });
          if (!(response.headers['content-type'] || '').includes('text/html')) continue;
          const links = playerLinks(response.body.toString('utf8'), response.url);
          for (const url of links.media) {
            try {
              const manifest = await this.fetcher(new URL(url), { referer: response.url.href, maxBytes: 1024 * 1024, signal });
              validatePlaylist(manifest.body);
              const ticket = this.create(manifest.url.href, response.url.href, token);
              return { url: `/devices/crackstreams/media/${ticket}/0`, format: 'hls', expiresIn: 1200 };
            } catch (error) { if (error instanceof Error && error.message.includes('DRM')) drm = true; }
          }
          if (next.depth < 2) for (const url of links.players) queue.push({ url, referer: response.url.href, depth: next.depth + 1 });
        } catch { /* try the next advertised player, with the same total deadline */ }
      }
      throw new InputError(drm ? 'Cette diffusion nécessite un lecteur avec DRM.' : 'Aucun flux direct compatible n’est disponible pour cette diffusion. Elle peut être hors ligne ou utiliser un lecteur non pris en charge.', 422);
    } finally { clearTimeout(timer); this.resolving--; }
  }

  private create(url: string, referer: string, token: string): string {
    for (const [key, session] of this.sessions) if (session.expires < Date.now()) this.sessions.delete(key);
    if (this.sessions.size >= 8) this.sessions.delete(this.sessions.keys().next().value!);
    const ticket = randomBytes(24).toString('hex');
    this.sessions.set(ticket, { tokenHash: createHash('sha256').update(token).digest('hex'),
      created: Date.now(), expires: Date.now() + 1200000, referer,
      resources: new Map([['0', url]]), byUrl: new Map([[url, '0']]), nextId: 1 });
    return ticket;
  }

  private resource(session: PlaybackSession, ticket: string, value: string, base: URL): string {
    const target = sourceURL(new URL(value, base).href);
    let id = session.byUrl.get(target);
    if (!id) {
      if (session.resources.size >= 4096) throw new InputError('Session de lecture à renouveler.', 410);
      id = String(session.nextId++); session.resources.set(id, target); session.byUrl.set(target, id);
    }
    return `/devices/crackstreams/media/${ticket}/${id}`;
  }

  async media(ticket: string, id: string, tokenIsCurrent: (hash: string) => Promise<boolean>, range?: string) {
    const session = this.sessions.get(ticket);
    if (!session || session.expires < Date.now() || Date.now() - session.created > 4 * 3600000 || !await tokenIsCurrent(session.tokenHash)) {
      this.sessions.delete(ticket); throw new InputError('Session de lecture expirée. Relancez la diffusion.', 401);
    }
    const url = session.resources.get(id);
    if (!url) throw new InputError('Ressource inconnue.', 404);
    if (range && (!/^bytes=\d+-\d+$/.test(range) || Number(range.split('-')[1]) - Number(range.slice(6).split('-')[0]) > 16 * 1024 * 1024)) throw new InputError('Plage vidéo invalide.');
    if (this.downloads >= 8) throw new InputError('Trop de requêtes vidéo simultanées.', 429);
    this.downloads++;
    try {
      const response = await this.fetcher(new URL(url), { referer: session.referer, maxBytes: 16 * 1024 * 1024, range });
      session.expires = Date.now() + 1200000;
      if (response.body.subarray(0, 10).toString().replace(/^\uFEFF/, '').startsWith('#EXTM3U')) {
        const text = validatePlaylist(response.body);
        const rewritten = text.split(/\r?\n/).map(line => {
          if (!line.trim()) return line;
          if (line[0] !== '#') return this.resource(session, ticket, line.trim(), response.url);
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${this.resource(session, ticket, uri, response.url)}"`);
        }).join('\n');
        return { body: Buffer.from(rewritten), contentType: 'application/vnd.apple.mpegurl', status: 200, contentRange: undefined };
      }
      const type = String(response.headers['content-type'] || 'application/octet-stream').split(';')[0];
      if (!/^(video\/|audio\/|application\/octet-stream$)/.test(type)) throw new InputError('La source ne renvoie pas de vidéo.', 502);
      return { body: response.body, contentType: type, status: response.status, contentRange: response.headers['content-range'] };
    } finally { this.downloads--; }
  }
}
