import { Router } from 'express';
import { asyncRoute, sameOrigin, moduleError, InputError } from '../../core/modules/http';
import { TVMessages } from './service';
export function buildRouter(service: TVMessages) {
  const router = Router();
  router.use(sameOrigin);
  router.get('/', (_req, res) => res.render('tv-messages-index'));
  router.get('/api/status', asyncRoute(async (_req, res) => res.json(await service.status())));
  router.post('/api/settings', asyncRoute(async (req, res) => {
    await service.configure(req.body.host, req.body.reset === true); res.json(await service.status());
  }));
  router.post('/api/pair', asyncRoute(async (_req, res) => res.json(await service.perform(true))));
  router.post('/api/check', asyncRoute(async (_req, res) => res.json(await service.perform(false))));
  router.post('/api/messages', asyncRoute(async (req, res) => {
    if (typeof req.body.message !== 'string') throw new InputError('Le message est requis.');
    res.json(await service.perform(false, req.body.message));
  }));
  router.use(moduleError);
  return router;
}
