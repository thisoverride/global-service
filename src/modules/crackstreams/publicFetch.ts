import { lookup } from 'dns/promises';
import { request } from 'https';
import { IncomingHttpHeaders } from 'http';
import { sourceURL, publicAddress } from './source';
import { InputError } from '../../core/modules/http';

export interface PublicResponse { body: Buffer; url: URL; headers: IncomingHttpHeaders; status: number }
export interface FetchOptions { referer?: string; maxBytes?: number; range?: string; signal?: AbortSignal }
export async function publicFetch(input: URL, options: FetchOptions = {}, redirects = 0): Promise<PublicResponse> {
  const url = new URL(sourceURL(input.href));
  if (options.signal?.aborted) throw new InputError('Recherche interrompue.', 504);
  const answers = await lookup(url.hostname, { all: true });
  if (!answers.length || answers.some(a => !publicAddress(a.address))) throw new InputError('Adresse réseau non autorisée.');
  const target = answers.find(a => a.family === 4) || answers[0];
  const response = await new Promise<PublicResponse>((resolve, reject) => {
    const headers: Record<string, string> = { Host: url.host, Accept: '*/*', 'Accept-Encoding': 'identity', 'User-Agent': 'Mozilla/5.0 GlobalServiceTV/1.0' };
    if (options.referer) { const ref = new URL(sourceURL(options.referer)); headers.Referer = ref.href; headers.Origin = ref.origin; }
    if (options.range) headers.Range = options.range;
    const req = request({ hostname: target.address, family: target.family, servername: url.hostname,
      port: 443, path: url.pathname + url.search, headers, signal: options.signal }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        res.resume(); resolve({ body: Buffer.alloc(0), url, headers: res.headers, status: res.statusCode! }); return;
      }
      if (res.statusCode !== 200 && res.statusCode !== 206) {
        res.resume(); reject(new InputError(`La source a refusé une requête vidéo (HTTP ${res.statusCode || 502}).`, 502)); return;
      }
      let size = 0; const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > (options.maxBytes || 2 * 1024 * 1024)) req.destroy(new Error('Response too large'));
        else chunks.push(chunk);
      });
      res.on('error', () => reject(new InputError('Lecture du flux interrompue.', 502)));
      res.on('end', () => resolve({ body: Buffer.concat(chunks), url, headers: res.headers, status: res.statusCode! }));
    });
    const timeout = setTimeout(() => req.destroy(new Error('Timeout')), 12000);
    req.on('close', () => clearTimeout(timeout));
    req.on('error', () => reject(new InputError('Source vidéo inaccessible.', 502)));
    req.end();
  });
  if (response.status === 200 || response.status === 206) return response;
  if (!response.headers.location || redirects >= 3) throw new InputError('Trop de redirections du lecteur.', 502);
  return publicFetch(new URL(response.headers.location, url), options, redirects + 1);
}
