import WebSocket from 'ws';
import { TLSSocket } from 'tls';
import { createHash } from 'crypto';
import { isIP } from 'net';
import { InputError } from '../../core/modules/http';

export interface TVCredentials { host: string; clientKey?: string; fingerprint?: string }
export interface TVResult { clientKey: string; fingerprint: string }
export type TVTransport = (credentials: TVCredentials, pair: boolean, message?: string) => Promise<TVResult>;

export function tvAddress(value: unknown): string {
  const host = typeof value === 'string' ? value.trim() : '';
  const parts = host.split('.').map(Number);
  if (isIP(host) !== 4 || !(parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31))) {
    throw new InputError('Saisissez une adresse IPv4 locale de TV, par exemple 192.168.1.100.');
  }
  return host;
}

// Independent Node implementation of webOS SSAP. TLS is pinned after the
// first on-screen approval; no pairing key is sent before the pin check.
export function createTVTransport(createSocket: (url: string, options: WebSocket.ClientOptions) => WebSocket = (url, options) => new WebSocket(url, options)): TVTransport {
 return (credentials, pair, message) => new Promise((resolve, reject) => {
  const host = tvAddress(credentials.host);
  if (!pair && (!credentials.clientKey || !credentials.fingerprint)) {
    reject(new InputError('Associez d’abord la TV et acceptez la demande à son écran.'));
    return;
  }
  const ws = createSocket(`wss://${host}:3001/`, {
    rejectUnauthorized: false, handshakeTimeout: 7000, maxPayload: 256 * 1024, perMessageDeflate: false,
  });
  let finished = false;
  let fingerprint = '';
  let result: TVResult | undefined;
  const finish = (error?: Error) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    ws.terminate();
    if (error) reject(error); else resolve(result!);
  };
  const timer = setTimeout(() => finish(new InputError(pair ?
    'Appairage expiré. Acceptez la demande sur la TV puis réessayez.' : 'La TV ne répond pas.', 504)), pair ? 65000 : 15000);
  ws.on('error', () => finish(new InputError('TV injoignable. Vérifiez son adresse et son alimentation.', 502)));
  ws.on('close', () => { if (!finished) finish(new InputError('La TV a fermé la connexion.', 502)); });
  ws.on('open', () => {
    const socket = (ws as unknown as { _socket: TLSSocket })._socket;
    const cert = socket.getPeerCertificate();
    if (!cert.raw) return finish(new InputError('Certificat TV absent.', 502));
    fingerprint = createHash('sha256').update(cert.raw).digest('hex');
    if (credentials.fingerprint && credentials.fingerprint.replace(/:/g, '').toLowerCase() !== fingerprint) {
      return finish(new InputError('Le certificat de la TV a changé. Vérifiez la TV avant de réinitialiser son association.', 409));
    }
    ws.send(JSON.stringify({ id: 'register', type: 'register', payload: {
      forcePairing: false, pairingType: 'PROMPT',
      ...(credentials.clientKey ? { 'client-key': credentials.clientKey } : {}),
      manifest: { manifestVersion: 1, appVersion: '1.0', appId: 'local.dalency.tv-messages',
        vendorId: 'local.dalency', localizedAppNames: { '': 'Messages TV' },
        localizedVendorNames: { '': 'Dalency' }, permissions: ['WRITE_NOTIFICATION_TOAST'] },
    } }));
  });
  ws.on('message', (data) => {
    let frame: any;
    try { frame = JSON.parse(data.toString()); } catch { return finish(new InputError('Réponse TV invalide.', 502)); }
    if (frame.type === 'error') return finish(new InputError('La TV a refusé la demande. Vérifiez son association.', 502));
    if (frame.type === 'registered' && !result) {
      const key = frame.payload?.['client-key'] || credentials.clientKey;
      if (typeof key !== 'string' || !key || key.length > 4096) return finish(new InputError('Clé TV absente.', 502));
      result = { clientKey: key, fingerprint };
      if (message === undefined) return finish();
      const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      ws.send(JSON.stringify({ id: 'toast', type: 'request', uri: 'ssap://system.notifications/createToast', payload: { message: escaped } }));
    }
    if (result && frame.id === 'toast' && frame.type === 'response') {
      finish(frame.payload?.returnValue === true ? undefined : new InputError('La TV a refusé le message.', 502));
    }
  });
 });
}
export const requestTV = createTVTransport();
