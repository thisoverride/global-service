const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createTVTransport } = require('../build/modules/tv-messages/ssap');

test('real TLS + SSAP handshake, certificate pinning before credentials, escaped toast and negative acknowledgement', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-ssap-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(temp, 'key.pem'), '-out', path.join(temp, 'cert.pem'), '-days', '1', '-subj', '/CN=TestTV'], { stdio: 'ignore' });
  const server = https.createServer({ key: fs.readFileSync(path.join(temp, 'key.pem')), cert: fs.readFileSync(path.join(temp, 'cert.pem')) });
  const wss = new WebSocket.Server({ server });
  const frames = []; let acceptToast = true;
  wss.on('connection', ws => ws.on('message', data => {
    const frame = JSON.parse(data.toString()); frames.push(frame);
    if (frame.type === 'register') ws.send(JSON.stringify({ type: 'registered', payload: { 'client-key': 'mock-key' } }));
    else ws.send(JSON.stringify({ id: frame.id, type: 'response', payload: { returnValue: acceptToast } }));
  }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { wss.clients.forEach(ws => ws.terminate()); wss.close(); server.close(resolve); }));
  const transport = createTVTransport((_url, options) => new WebSocket('wss://127.0.0.1:' + server.address().port, options));
  const credentials = { host: '192.168.1.100', ...await transport({ host: '192.168.1.100' }, true) };
  assert.equal(credentials.fingerprint.length, 64);
  assert.deepEqual(frames[0].payload.manifest.permissions, ['WRITE_NOTIFICATION_TOAST']);
  await transport(credentials, false, '<hi> & hello');
  assert.equal(frames.at(-1).payload.message, '&lt;hi&gt; &amp; hello');
  const before = frames.length;
  await assert.rejects(transport({ ...credentials, fingerprint: '0'.repeat(64) }, false), /certificat/);
  assert.equal(frames.length, before, 'no pairing key sent to mismatched certificate');
  acceptToast = false;
  await assert.rejects(transport(credentials, false, 'hello'), /refusé le message/);
  await assert.rejects(transport({ host: '192.168.1.100' }, false), /Associez/);
});
