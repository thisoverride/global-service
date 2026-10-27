import express, { Router } from 'express';
import path from 'path';
import { PROJECT_ROOT } from '../../core/paths';
import { asyncRoute, moduleError, sameOrigin, InputError } from '../../core/modules/http';
import { StreamSettings } from './service';
import { Catalog } from './source';
import { Playback } from './playback';

export function buildRouter(settings: StreamSettings, catalog: Catalog) {
  const router = Router();
  router.use(sameOrigin);
  router.get('/', (_req, res) => res.render('crackstreams-index'));
  router.get('/api/settings', asyncRoute(async (_req, res) => res.json(await settings.config())));
  router.post('/api/settings', asyncRoute(async (req, res) => res.json(await settings.save(req.body))));
  router.post('/api/pairing-code', asyncRoute(async (_req, res) => res.json(await settings.pairingCode())));
  router.post('/api/revoke', asyncRoute(async (_req, res) => { await settings.revoke(); res.json({ ok: true }); }));
  router.post('/api/check', asyncRoute(async (_req, res) => {
    const config = await settings.config();
    const items = await catalog.read(config.sourceUrl);
    res.json({ categories: items.filter(item => item.kind === 'category').length, events: items.filter(item => item.kind === 'event').length });
  }));
  router.use(moduleError);
  return router;
}

export function buildDeviceRouter(settings: StreamSettings, catalog: Catalog, playback = new Playback()) {
  const router = Router();
  // This serves only application assets, never admin data. A packaged app
  // has origin "null"; the browser preview uses the console's own origin.
  router.use('/app', (_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self' http: https:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-cache'); next();
  }, express.static(path.join(PROJECT_ROOT, 'tv-app'), { index: 'index.html' }));
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin && origin !== 'null' && origin !== `${req.protocol}://${req.get('host')}`) {
      res.status(403).json({ error: 'Origine non autorisée.' }); return;
    }
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  router.get('/media/:ticket/:id', asyncRoute(async (req, res) => {
    const media = await playback.media(req.params.ticket, req.params.id, hash => settings.authorizedHash(hash), req.get('range'));
    res.status(media.status);
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (media.contentRange) res.setHeader('Content-Range', media.contentRange);
    if (req.get('range') && media.status === 206) res.setHeader('Accept-Ranges', 'bytes');
    res.send(media.body);
  }));
  const attempts = new Map<string, { count: number; until: number }>();
  let total = { count: 0, until: 0 };
  router.post('/pair', asyncRoute(async (req, res) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    if (total.until <= now) total = { count: 0, until: now + 60000 };
    const ip = req.ip || req.socket.remoteAddress || '';
    const rate = attempts.get(ip) || { count: 0, until: now + 600000 };
    if (++total.count > 100 || ++rate.count > 10 || attempts.size >= 1000) throw new InputError('Trop de tentatives. Patientez avant de réessayer.', 429);
    attempts.set(ip, rate);
    res.json(await settings.pair(req.body.code));
  }));
  router.use(asyncRoute(async (req, res) => {
    const token = req.get('authorization')?.replace(/^Bearer /, '') || '';
    if (!await settings.authorized(token)) throw new InputError('Associez cette application depuis la console.', 401);
    const config = await settings.config();
    if (req.method === 'POST' && req.path === '/api/resolve') {
      res.json(await playback.resolve(config.sourceUrl, req.body?.path, token)); return;
    }
    if (req.method !== 'GET') throw new InputError('Méthode non autorisée.', 405);
    if (req.path === '/config') { res.json(config); return; }
    if (req.path === '/catalog') { res.json({ items: await catalog.read(config.sourceUrl, req.query.path), sourceUrl: config.sourceUrl }); return; }
    throw new InputError('Page introuvable.', 404);
  }));
  router.use(moduleError);
  return router;
}
