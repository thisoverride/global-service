import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { SettingsStore } from '../../core/modules/settingsStore';
import { InputError } from '../../core/modules/http';
import { sourceURL } from './source';

export interface TVConfig { title: string; sourceUrl: string; updatedAt: string; popupProtection: true }
interface Pairing { digest: string; expires: number }
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class StreamSettings {
  constructor(private store: SettingsStore) {}
  async config(): Promise<TVConfig> {
    return (await this.store.get<TVConfig>('config')) ?? {
      title: 'CrackStreams', sourceUrl: 'https://crackstreams.mx/index', updatedAt: '', popupProtection: true,
    };
  }
  async save(input: any) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 40) throw new InputError('Le nom doit contenir de 1 à 40 caractères.');
    const config: TVConfig = { title, sourceUrl: sourceURL(input.sourceUrl), popupProtection: true, updatedAt: new Date().toISOString() };
    await this.store.set('config', config);
    return config;
  }
  async pairingCode() {
    const code = String(randomInt(10000000, 100000000));
    const expires = Date.now() + 5 * 60000;
    await this.store.set('pairing', { digest: digest(code), expires });
    return { code, expires };
  }
  async pair(input: unknown) {
    if (typeof input !== 'string' || !/^\d{8}$/.test(input)) throw new InputError('Code à huit chiffres requis.', 401);
    const stored = await this.store.get<Pairing>('pairing');
    if (!stored || stored.expires < Date.now() || !equal(stored.digest, digest(input)) || !await this.store.consume('pairing', stored)) {
      throw new InputError('Code incorrect, expiré ou déjà utilisé.', 401);
    }
    const token = randomBytes(32).toString('hex');
    await this.store.set('deviceTokenHash', digest(token));
    return { token };
  }
  async authorized(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const stored = await this.store.get<string>('deviceTokenHash');
    return !!stored && equal(stored, digest(token));
  }
  async authorizedHash(hash: string) {
    if (!/^[a-f0-9]{64}$/.test(hash)) return false;
    const stored = await this.store.get<string>('deviceTokenHash');
    return !!stored && equal(stored, hash);
  }
  async revoke() {
    await this.store.set('deviceTokenHash', '');
    await this.store.set('pairing', null);
  }
}
