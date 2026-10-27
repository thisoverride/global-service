(function () {
  'use strict';
  var root = document.querySelector('[data-module]');
  if (!root) return;
  var moduleName = root.dataset.module;
  var base = '/modules/' + moduleName + '/api';
  var feedback = document.getElementById('feedback');
  function note(message, error) { feedback.textContent = message; feedback.className = 'alert ' + (error ? 'alert-danger' : 'alert-success'); feedback.hidden = false; }
  async function api(path, data) {
    var response = await fetch(base + path, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
    if (response.status === 401) throw new Error('Reconnectez-vous à la console.');
    var result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Service indisponible.');
    return result;
  }
  async function action(button, fn) {
    button.disabled = true;
    try { await fn(); } catch (e) { note(e.message, true); } finally { button.disabled = false; }
  }
  function bind(id, fn) { var button = document.getElementById(id); button.addEventListener('click', function () { action(button, fn); }); }
  if (moduleName === 'tv-messages') {
    var message = document.getElementById('message');
    var host = document.getElementById('tv-host');
    function update(state) {
      if (document.activeElement !== host) host.value = state.host;
      document.getElementById('tv-status').textContent = state.busy ? 'Opération en cours' : state.reachable === false ? 'TV injoignable' : state.paired ? 'TV associée' : 'À associer';
      var history = document.getElementById('history'); history.replaceChildren();
      if (!state.history.length) { var empty = document.createElement('tr'); var cell = document.createElement('td'); cell.colSpan = 2; cell.textContent = 'Aucun message envoyé pendant cette session.'; empty.appendChild(cell); history.appendChild(empty); }
      state.history.forEach(function (entry) { var row = document.createElement('tr'); var text = document.createElement('td'); var time = document.createElement('td'); text.textContent = entry.message; time.textContent = new Date(entry.sentAt).toLocaleTimeString('fr-FR'); row.append(text, time); history.appendChild(row); });
    }
    message.addEventListener('input', function () { document.getElementById('char-count').textContent = message.value.length + ' / 500'; });
    root.querySelectorAll('[data-message]').forEach(function (button) { button.onclick = function () { message.value = button.dataset.message; message.dispatchEvent(new Event('input')); message.focus(); }; });
    document.getElementById('message-form').onsubmit = function (e) { e.preventDefault(); action(e.submitter || this.querySelector('button'), async function () { update(await api('/messages', { message: message.value })); note('Message accepté par la TV.'); message.value = ''; message.dispatchEvent(new Event('input')); }); };
    document.getElementById('tv-settings-form').onsubmit = function (e) { e.preventDefault(); action(this.querySelector('button'), async function () { update(await api('/settings', { host: host.value })); note('Adresse enregistrée.'); }); };
    bind('pair-tv', async function () { note('Acceptez la demande sur la TV…'); update(await api('/pair', {})); note('TV associée.'); });
    bind('check-tv', async function () { update(await api('/check', {})); note('La TV répond.'); });
    bind('reset-tv', async function () { if (confirm('Effacer la clé d’association ? Une nouvelle validation sur la TV sera nécessaire.')) { update(await api('/settings', { host: host.value, reset: true })); note('Association réinitialisée.'); } });
    api('/status').then(update).catch(function (e) { note(e.message, true); });
  } else {
    if (!document.getElementById('server-origin').textContent.trim()) document.getElementById('server-origin').textContent = location.origin;
    api('/settings').then(function (config) { document.getElementById('stream-title').value = config.title; document.getElementById('source-url').value = config.sourceUrl; }).catch(function (e) { note(e.message, true); });
    document.getElementById('stream-settings-form').onsubmit = function (e) { e.preventDefault(); action(this.querySelector('button'), async function () { await api('/settings', { title: document.getElementById('stream-title').value, sourceUrl: document.getElementById('source-url').value }); note('Réglages enregistrés. La TV les recevra dans moins d’une minute.'); }); };
    bind('check-source', async function () { note('Vérification du site…'); var result = await api('/check', {}); note('Site accessible : ' + result.categories + ' catégories et ' + result.events + ' liens de diffusion détectés.'); });
    bind('pair-code', async function () { var result = await api('/pairing-code', {}); document.getElementById('pairing-code').textContent = result.code; document.getElementById('pairing-result').hidden = false; note('Saisissez ce code dans l’application TV.'); });
    bind('revoke-device', async function () { if (confirm('Révoquer l’accès de la TV ? Une nouvelle association sera nécessaire.')) { await api('/revoke', {}); document.getElementById('pairing-result').hidden = true; note('Accès révoqué.'); } });
  }
}());
