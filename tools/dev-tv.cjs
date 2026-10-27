// Temporary local development runner: no system service and no PostgreSQL.
// Administration is restricted to this Mac; device APIs are reachable on LAN.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const express = require('express');
const { configureMiddleware } = require('../build/framework/express/config/middleware');
const { TVMessages } = require('../build/modules/tv-messages/service');
const { buildRouter: messagesRouter } = require('../build/modules/tv-messages/routes');
const { StreamSettings } = require('../build/modules/crackstreams/service');
const { Catalog } = require('../build/modules/crackstreams/source');
const { buildRouter: streamRouter, buildDeviceRouter } = require('../build/modules/crackstreams/routes');
const manifests = [require('../build/modules/tv-messages/manifest').manifest, require('../build/modules/crackstreams/manifest').manifest];
const root = path.resolve(__dirname, '..');
const stateRoot = path.resolve(process.env.TV_DEV_STATE || path.join(root, '.local-tv'));

class FileSettings {
  constructor(module) { this.dir = path.join(stateRoot, module); this.queue = Promise.resolve(); }
  file(key) { if (!/^[a-zA-Z]+$/.test(key)) throw new Error('Invalid key'); return path.join(this.dir, key + '.json'); }
  async get(key) { try { return JSON.parse(await fs.readFile(this.file(key), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
  async set(key, value) {
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    const file = this.file(key), tmp = file + '.' + crypto.randomBytes(6).toString('hex');
    await fs.writeFile(tmp, JSON.stringify(value), { mode: 0o600 }); await fs.rename(tmp, file);
  }
  consume(key, value) {
    const next = this.queue.then(async () => {
      if (JSON.stringify(await this.get(key)) !== JSON.stringify(value)) return false;
      await fs.unlink(this.file(key)); return true;
    });
    this.queue = next.catch(() => {}); return next;
  }
}

async function main() {
  await fs.mkdir(stateRoot, { recursive: true, mode: 0o700 });
  const messagesStore = new FileSettings('tv-messages');
  if (process.env.TV_IMPORT_STATE && !await messagesStore.get('credentials')) {
    const old = JSON.parse(await fs.readFile(process.env.TV_IMPORT_STATE, 'utf8'));
    if (!old.tv_host || !old.client_key || !old.fingerprint) throw new Error('Incomplete TV pairing state');
    await messagesStore.set('credentials', { host: old.tv_host, clientKey: old.client_key, fingerprint: old.fingerprint });
  }
  const messages = new TVMessages(messagesStore);
  const settings = new StreamSettings(new FileSettings('crackstreams'));
  const catalog = new Catalog();
  const app = express();
  const addresses = Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4').map(item => item.address);
  const allowed = new Set(['localhost', '127.0.0.1', ...addresses]);
  const port = Number(process.env.TV_DEV_PORT || 8788);
  const lan = addresses.find(ip => ip.startsWith('192.168.')) || addresses.find(ip => ip.startsWith('10.')) || addresses.find(ip => ip !== '127.0.0.1');
  app.use((req, res, next) => {
    let host; try { host = new URL('http://' + req.get('host')).hostname; } catch (_) {}
    if (!allowed.has(host)) return res.status(403).send('Hôte non autorisé.');
    next();
  });
  configureMiddleware(app);
  app.set('trust proxy', false);
  app.set('views', [path.join(root, 'build/views'), ...manifests.map(m => path.join(root, 'build/modules', m.id, 'views'))]);
  app.use((req, res, next) => {
    const active = manifests.find(m => req.path.startsWith(m.basePath));
    res.locals.menuServices = { services: [{ letter: 'TV', items: manifests.map(m => ({ ...m, url: m.basePath })) }] };
    res.locals.activeModule = active ? { ...active, url: active.basePath, links: [] } : null;
    res.locals.currentPath = req.path; res.locals.currentUser = 'Développement local';
    res.locals.tvServerUrl = `http://${lan || 'localhost'}:${port}`;
    res.locals.asset = value => value; res.locals.formatDateTime = iso => new Date(iso).toLocaleString('fr-FR');
    next();
  });
  app.use('/devices/crackstreams', buildDeviceRouter(settings, catalog));
  app.use((req, res, next) => {
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return res.status(403).send('Administration accessible uniquement sur ce Mac.');
    next();
  });
  app.get('/', (_req, res) => res.redirect('/modules/crackstreams'));
  app.use('/modules/tv-messages', messagesRouter(messages));
  app.use('/modules/crackstreams', streamRouter(settings, catalog));
  const server = app.listen(port, '0.0.0.0', () => console.log(`Développement TV : http://localhost:${port}/ — administration locale uniquement. Aucun démarrage automatique.`));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
if (require.main === module) main().catch(() => { console.error('Impossible de lancer le développement TV. Vérifiez le port et les fichiers de configuration.'); process.exit(1); });
module.exports = { FileSettings };
