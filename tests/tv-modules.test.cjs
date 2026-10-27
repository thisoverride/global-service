const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { TVMessages } = require('../build/modules/tv-messages/service');
const { tvAddress } = require('../build/modules/tv-messages/ssap');
const { StreamSettings } = require('../build/modules/crackstreams/service');
const { sourceURL, publicAddress, catalogueURL, parseCatalog, Catalog } = require('../build/modules/crackstreams/source');
const { Playback, playerLinks, validatePlaylist } = require('../build/modules/crackstreams/playback');
const { createHash } = require('node:crypto');
const { buildRouter, buildDeviceRouter } = require('../build/modules/crackstreams/routes');
const { ModuleLoader } = require('../build/core/modules/ModuleLoader');
const { requireAuth } = require('../build/core/auth/requireAuth');
const path = require('node:path');

class MemorySettings {
  map = new Map();
  async get(key) { return this.map.get(key) ?? null; }
  async set(key, value) { this.map.set(key, JSON.parse(JSON.stringify(value))); }
  async consume(key, value) {
    if (JSON.stringify(this.map.get(key)) !== JSON.stringify(value)) return false;
    this.map.delete(key); return true;
  }
}
async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return 'http://127.0.0.1:' + server.address().port;
}

test('configuration accepts HTTPS public domains and rejects LAN, credentials and executable URLs', () => {
  assert.equal(sourceURL(' https://example.org/index#frag '), 'https://example.org/index');
  for (const url of ['http://example.org', 'javascript:alert(1)', 'https://127.0.0.1', 'https://[::1]', 'https://2130706433', 'https://user:secret@example.org', 'https://example.org:8443', 'https://server.local']) assert.throws(() => sourceURL(url));
  assert.equal(tvAddress('192.168.1.100'), '192.168.1.100');
  for (const host of ['127.0.0.1', '8.8.8.8', '192.168.1.999', '192.168.1.100:22']) assert.throws(() => tvAddress(host));
});
test('DNS targets exclude private, mapped, link-local, multicast and reserved addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.0.1', '169.254.169.254', '100.64.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '224.0.0.1', '192.0.2.1']) assert.equal(publicAddress(address), false, address);
  assert.equal(publicAddress('1.1.1.1'), true);
});
test('catalogue extracts only same-origin sports links as text, deduplicates and strips scripts', () => {
  const items = parseCatalog('<script>bad()</script><a href="/league/nba">NBA</a><a href="/league/nba">duplicate</a><a href="https://ads.example/stream/x">AD</a><a href="/stream/final"><b>Final</b> &amp; play</a><a href="javascript:bad()">bad</a><a href="https://u:p@example.org/stream/secret">bad</a>', new URL('https://example.org/index'));
  assert.deepEqual(items.map(item => [item.kind, item.title]), [['category', 'NBA'], ['event', 'Final & play']]);
  assert.deepEqual(parseCatalog('<footer><a href="/stream/unrelated">SEO link</a></footer><aside><a href="/stream/ad">AD</a></aside>', new URL('https://example.org/league/nba')), []);
  assert.equal(catalogueURL('https://example.org/index', '/league/nba').href, 'https://example.org/league/nba');
  for (const input of ['//localhost', '/../../admin', 'https://evil.org', ['/league/a'], '/league/../../admin']) assert.throws(() => catalogueURL('https://example.org/index', input));
});
test('catalog cache is bounded and separates source domains after an address change', async () => {
  let count = 0;
  const catalog = new Catalog(async () => { count++; return '<a href="/league/nba">NBA</a>'; });
  await catalog.read('https://one.example/index'); await catalog.read('https://one.example/index');
  const result = await catalog.read('https://two.example/index');
  assert.equal(count, 2); assert.equal(result[0].url, 'https://two.example/league/nba');
});
test('player parsing reads only advertised data and rejects DRM playlists', () => {
  const html = '<aside><iframe src="https://ads.example/player"></iframe></aside><video><source src="https://cdn.example/live.m3u8"></video><script>window.allStreams = [{"value":"https://player.example/embed"}]; window.DIRECT_STREAM_URL="https://media.example/main.m3u8";</script>';
  const links = playerLinks(html, new URL('https://source.example/stream/game'));
  assert.deepEqual(links.media, ['https://cdn.example/live.m3u8', 'https://media.example/main.m3u8']);
  assert.deepEqual(links.players, ['https://player.example/embed']);
  assert.equal(validatePlaylist(Buffer.from('#EXTM3U\n#EXTINF:5,\nseg.ts\n')), '#EXTM3U\n#EXTINF:5,\nseg.ts\n');
  assert.throws(() => validatePlaylist(Buffer.from('#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="key"')),/DRM/);
});
test('playback resolves public HLS data, rewrites segments and stops after token revocation', async () => {
  const responses = new Map([
    ['https://source.example/stream/game', { body: Buffer.from('<video src="https://cdn.example/live.m3u8"></video>'), type: 'text/html' }],
    ['https://cdn.example/live.m3u8', { body: Buffer.from('#EXTM3U\n#EXTINF:5,\nchunk.ts\n'), type: 'application/vnd.apple.mpegurl' }],
    ['https://cdn.example/chunk.ts', { body: Buffer.from('video bytes'), type: 'video/mp2t' }],
  ]);
  const fetcher = async url => { const item = responses.get(url.href); if (!item) throw new Error('missing fixture'); return { body: item.body, url, headers: { 'content-type': item.type }, status: 200 }; };
  const playback = new Playback(fetcher), token = 'a'.repeat(64), hash = createHash('sha256').update(token).digest('hex');
  const resolved = await playback.resolve('https://source.example/index', '/stream/game', token);
  const match = resolved.url.match(/\/media\/([a-f0-9]+)\/(\d+)$/); assert.ok(match);
  const current = async value => value === hash;
  const playlist = await playback.media(match[1], match[2], current);
  assert.match(playlist.body.toString(), new RegExp('/media/' + match[1] + '/1'));
  assert.equal((await playback.media(match[1], '1', current)).body.toString(), 'video bytes');
  await assert.rejects(playback.media(match[1], match[2], async () => false), /expirée/);
});
test('device pairing is single-use, expires, stores only hashes, and revokes former token', async () => {
  const store = new MemorySettings(), settings = new StreamSettings(store);
  const { code } = await settings.pairingCode();
  assert.equal(JSON.stringify([...store.map]).includes(code), false);
  await assert.rejects(settings.pair('00000000'));
  const results = await Promise.allSettled([settings.pair(code), settings.pair(code)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const token = results.find(r => r.status === 'fulfilled').value.token;
  assert.equal(await settings.authorized(token), true);
  assert.equal(JSON.stringify([...store.map]).includes(token), false);
  const next = await settings.pairingCode();
  const second = await settings.pair(next.code);
  assert.equal(await settings.authorized(token), false);
  await settings.revoke(); assert.equal(await settings.authorized(second.token), false);
  const expired = await settings.pairingCode();
  const stored = await store.get('pairing'); stored.expires = Date.now() - 1; await store.set('pairing', stored);
  await assert.rejects(settings.pair(expired.code));
});
test('messages validate before transport, hide keys and retain only confirmed deliveries in memory', async () => {
  const store = new MemorySettings(); let calls = 0;
  const service = new TVMessages(store, async (_credentials, _pair, message) => {
    calls++; if (message === 'failure') throw new Error('secret transport detail');
    return { clientKey: 'private-key', fingerprint: 'private-pin' };
  });
  await service.configure('192.168.1.100', false);
  for (const message of ['', 123, 'a'.repeat(501), '\x00x']) await assert.rejects(service.perform(false, message));
  assert.equal(calls, 0);
  const status = await service.perform(false, 'Hello');
  assert.equal(status.history[0].message, 'Hello');
  assert.equal(JSON.stringify(status).includes('private-key'), false);
  assert.equal(JSON.stringify([...store.map]).includes('Hello'), false);
  await assert.rejects(service.perform(false, 'again'), /deux secondes/);
  await service.configure('192.168.1.171', false);
  assert.equal((await service.status()).paired, false);
  assert.deepEqual((await new TVMessages(store).status()).history, []);
});
test('concurrent TV operations cannot race association against changes of address', async () => {
  let finish;
  const service = new TVMessages(new MemorySettings(), () => new Promise(resolve => { finish = resolve; }));
  const pending = service.perform(true);
  await Promise.resolve();
  await assert.rejects(service.configure('192.168.1.171', false), /en cours/);
  await assert.rejects(service.perform(false), /en cours/);
  finish({ clientKey: 'key', fingerprint: 'pin' }); await pending;
});
test('device API enforces scoped token, Origin, single-use pairing and rate limit', async t => {
  const settings = new StreamSettings(new MemorySettings());
  const catalog = new Catalog(async () => '<a href="/league/nba">NBA</a>');
  const app = express(); app.use(express.json()); app.use('/devices/crackstreams', buildDeviceRouter(settings, catalog));
  const origin = await serve(t, app), base = origin + '/devices/crackstreams';
  assert.equal((await fetch(base + '/config')).status, 401);
  const { code } = await settings.pairingCode();
  const pair = await fetch(base + '/pair', { method: 'POST', headers: { Origin: 'null', 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  assert.equal(pair.headers.get('access-control-allow-origin'), 'null');
  const { token } = await pair.json();
  const headers = { Authorization: 'Bearer ' + token, Origin: 'null' };
  assert.equal((await fetch(base + '/config', { headers })).status, 200);
  assert.equal((await fetch(base + '/config', { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(base + '/config', { method: 'POST', headers })).status, 405);
  await settings.save({ title: 'New', sourceUrl: 'https://new.example/index' });
  assert.equal((await (await fetch(base + '/config', { headers })).json()).sourceUrl, 'https://new.example/index');
  await settings.revoke(); assert.equal((await fetch(base + '/config', { headers })).status, 401);
  for (let i = 0; i < 10; i++) await fetch(base + '/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"code":"00000000"}' });
  assert.equal((await fetch(base + '/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"code":"00000000"}' })).status, 429);
});
test('administration rejects cross-origin writes and does not leak device token hashes', async t => {
  const settings = new StreamSettings(new MemorySettings());
  const app = express(); app.use(express.json()); app.use('/admin', buildRouter(settings, new Catalog()));
  const origin = await serve(t, app);
  const body = JSON.stringify({ title: 'TV', sourceUrl: 'https://example.org/' });
  const headers = { 'Content-Type': 'application/json', Origin: 'https://evil.example' };
  assert.equal((await fetch(origin + '/admin/api/settings', { method: 'POST', headers, body })).status, 403);
  headers.Origin = origin;
  assert.equal((await fetch(origin + '/admin/api/settings', { method: 'POST', headers, body })).status, 200);
  assert.deepEqual(Object.keys(await (await fetch(origin + '/admin/api/settings')).json()).sort(), ['popupProtection', 'sourceUrl', 'title', 'updatedAt']);
});
test('ModuleLoader keeps admin session protection while device API has independent authentication', async t => {
  const app = express(); app.set('views', 'unused');
  app.use(express.json()); app.use((req, _res, next) => { req.session = {}; next(); });
  const loader = new ModuleLoader();
  const pool = { query: async () => ({ rows: [] }) };
  await loader.loadOne(path.resolve('build/modules/crackstreams'), app, pool, requireAuth);
  app.use(requireAuth);
  const origin = await serve(t, app);
  const headers = { Accept: 'application/json' };
  assert.equal((await fetch(origin + '/modules/crackstreams/api/settings', { headers })).status, 401);
  assert.equal((await fetch(origin + '/devices/crackstreams/config', { headers })).status, 401);
  assert.equal((await fetch(origin + '/devices/crackstreams/app/', { headers })).status, 200);
  const pair = await fetch(origin + '/devices/crackstreams/pair', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{"code":"12345678"}' });
  assert.equal(pair.status, 401); assert.match((await pair.json()).error, /Code incorrect/);
});
