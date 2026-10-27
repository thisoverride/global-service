import { SettingsStore } from '../../core/modules/settingsStore';
import { InputError } from '../../core/modules/http';
import { TVCredentials, TVTransport, requestTV, tvAddress } from './ssap';

export class TVMessages {
  private busy = false;
  private lastSent = 0;
  private reachable: boolean | null = null;
  private lastError = '';
  private history: { message: string; sentAt: string }[] = [];
  constructor(private store: SettingsStore, private transport: TVTransport = requestTV) {}

  async credentials(): Promise<TVCredentials> {
    return (await this.store.get<TVCredentials>('credentials')) ?? { host: process.env.TV_HOST || '' };
  }
  async status() {
    const credentials = await this.credentials();
    return { host: credentials.host, paired: !!(credentials.clientKey && credentials.fingerprint),
      busy: this.busy, reachable: this.reachable, error: this.lastError, history: this.history };
  }
  async configure(host: unknown, reset: boolean) {
    if (this.busy) throw new InputError('Une opération TV est en cours.', 409);
    const address = tvAddress(host);
    this.busy = true;
    try {
      const old = await this.credentials();
      await this.store.set('credentials', old.host === address && !reset ? old : { host: address });
      this.reachable = null; this.lastError = '';
    } finally { this.busy = false; }
  }
  async perform(pair: boolean, input?: unknown) {
    let message: string | undefined;
    if (input !== undefined) {
      if (typeof input !== 'string' || !(message = input.trim()) || message.length > 500 || /[\x00-\x08\x0b-\x1f\x7f]/.test(message)) {
        throw new InputError('Écrivez un message de 1 à 500 caractères.');
      }
      if (Date.now() - this.lastSent < 2000) throw new InputError('Attendez deux secondes entre les messages.', 429);
    }
    if (this.busy) throw new InputError('Une opération TV est en cours.', 409);
    this.busy = true;
    if (message !== undefined) this.lastSent = Date.now();
    try {
      const credentials = await this.credentials();
      const result = await this.transport(credentials, pair, message);
      await this.store.set('credentials', { ...credentials, ...result });
      this.reachable = true; this.lastError = '';
      if (message !== undefined) this.history = [{ message, sentAt: new Date().toISOString() }, ...this.history].slice(0, 10);
    } catch (error) {
      this.reachable = false;
      this.lastError = error instanceof InputError ? error.message : 'Connexion TV indisponible.';
      throw error;
    } finally { this.busy = false; }
    return this.status();
  }
}
