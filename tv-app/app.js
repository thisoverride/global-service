(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var session = read('global-service-tv-session');
  var config = read('global-service-tv-config');
  var screen = 'setup';
  var catalogGeneration = 0;
  var noticeTimer;
  var refreshing = false;
  var hls = null;
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function notice(text, error) {
    clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').className = 'notice' + (error ? ' error' : ''); $('notice').hidden = false;
    noticeTimer = setTimeout(function () { $('notice').hidden = true; }, error ? 12000 : 6500);
  }
  function api(path, data, credentials) {
    var current = credentials || session;
    return new Promise(function (resolve, reject) {
      if (!current) { reject(new Error('Associez cet écran.')); return; }
      var xhr = new XMLHttpRequest();
      xhr.open(data === undefined ? 'GET' : 'POST', current.server + '/devices/crackstreams' + path);
      xhr.timeout = 35000;
      xhr.setRequestHeader('Accept', 'application/json');
      if (current.token) xhr.setRequestHeader('Authorization', 'Bearer ' + current.token);
      if (data !== undefined) xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        var result;
        try { result = JSON.parse(xhr.responseText); } catch (_) { reject(new Error('Le serveur ne renvoie pas la configuration attendue.')); return; }
        if (xhr.status < 200 || xhr.status >= 300) {
          var error = new Error(result.error || 'Serveur indisponible.'); error.status = xhr.status; reject(error); return;
        }
        resolve(result);
      };
      xhr.onerror = xhr.ontimeout = function () { reject(new Error('Serveur inaccessible. Vérifiez son adresse et le réseau.')); };
      xhr.send(data === undefined ? null : JSON.stringify(data));
    });
  }
  function serverOrigin(value) {
    var url = new URL(value.trim());
    var local = /^(localhost|127\.0\.0\.1|10\.[0-9.]+|192\.168\.[0-9.]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9.]+)$/.test(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Utilisez l’adresse du serveur, sans chemin : HTTPS ou HTTP sur votre réseau local.');
    }
    return url.origin;
  }
  function show(name, push) {
    screen = name;
    $('home').hidden = name !== 'home' && name !== 'category';
    $('setup').hidden = name !== 'setup';
    $('player').hidden = name !== 'player';
    if (name !== 'player') stopVideo();
    if (push) history.pushState({ screen: name }, '');
  }
  function setup(push) {
    show('setup', push);
    $('server-url').value = session ? session.server : (location.protocol === 'http:' || location.protocol === 'https:' ? location.origin : '');
    $('cancel-setup').hidden = !session;
    $('server-url').focus();
  }
  function markConfig(next) {
    if (!next || typeof next.title !== 'string' || typeof next.sourceUrl !== 'string') throw new Error('Configuration invalide.');
    var url = new URL(next.sourceUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.origin === location.origin) throw new Error('Adresse du site refusée.');
    var changed = config && (config.sourceUrl !== next.sourceUrl || config.title !== next.title);
    config = next;
    save('global-service-tv-config', next);
    $('brand-name').textContent = next.title.toUpperCase();
    $('connection').textContent = 'Connecté';
    return changed;
  }
  function refresh() {
    if (!session || refreshing) return Promise.resolve();
    refreshing = true;
    return api('/config').then(function (next) {
      var changed = markConfig(next);
      if (changed) {
        notice(screen === 'player' ? 'Nouvelle adresse reçue. Elle sera utilisée au retour à l’accueil.' : 'Configuration mise à jour.');
        if (screen === 'home' || screen === 'category') home(false);
      }
    }).catch(function (error) {
      $('connection').textContent = 'Serveur hors ligne';
      if (error.status === 401) {
        session = null; config = null; localStorage.removeItem('global-service-tv-session'); localStorage.removeItem('global-service-tv-config'); setup(false); notice(error.message, true);
      } else if (!config) { setup(false); notice(error.message, true); }
    }).then(function () { refreshing = false; });
  }
  function friendly(title) { return title.replace(/\s+Start time:.*$/i, '').replace(/\s*(?:streams?|click to view all games)\s*/gi, ' ').replace(/\s+/g, ' ').trim(); }
  function cards(items, category) {
    var container = $('catalog'); container.textContent = '';
    var selected = items.filter(function (item) { return item.kind === (category ? 'event' : 'category'); });
    $('catalog-count').textContent = selected.length + (category ? ' liens disponibles' : ' catégories');
    $('empty').hidden = selected.length !== 0;
    $('empty').textContent = category ? 'Aucun lien de diffusion détecté dans cette catégorie. Revenez au catalogue ou réessayez plus tard.' : 'Le catalogue n’est pas disponible. Actualisez dans un instant.';
    if (category) {
      var page = document.createElement('button'); page.className = 'sport-card'; page.textContent = 'Ouvrir la page de cette catégorie ↗';
      page.textContent = 'Choisir une autre catégorie';
      page.onclick = function () { home(true); }; container.appendChild(page);
    }
    selected.forEach(function (item, index) {
      var button = document.createElement('button'); button.className = 'sport-card';
      var number = document.createElement('span'); number.className = 'sport-number'; number.textContent = (index + 1 < 10 ? '0' : '') + (index + 1) + ' / ' + (category ? 'DIFFUSION' : 'SPORT');
      var title = document.createElement('span'); title.className = 'sport-title'; title.textContent = friendly(item.title);
      var caption = document.createElement('span'); caption.className = 'sport-caption'; caption.textContent = category ? 'Ouvrir la diffusion' : 'Voir le programme';
      var arrow = document.createElement('span'); arrow.className = 'sport-arrow'; arrow.textContent = '↗';
      button.appendChild(number); button.appendChild(title); button.appendChild(caption); button.appendChild(arrow);
      button.onclick = function () { if (item.kind === 'category') categoryPage(item); else openPlayer(item.url, item.title); };
      container.appendChild(button);
    });
  }
  function loadCatalog(category) {
    var generation = ++catalogGeneration;
    $('catalog').textContent = ''; $('catalog-count').textContent = 'Chargement…'; $('empty').hidden = true;
    return api('/catalog' + (category ? '?path=' + encodeURIComponent(category.path) : '')).then(function (result) {
      if (generation !== catalogGeneration) return;
      if (!config || result.sourceUrl !== config.sourceUrl) return;
      cards(result.items, category);
      if (category) { var first = $('catalog').querySelector('button'); if (first) first.focus(); }
    }).catch(function (error) {
      if (generation !== catalogGeneration) return;
      cards([], category); $('empty').textContent = error.message;
    });
  }
  function home(push) {
    if (!session || !config) { setup(false); return; }
    show('home', push); $('hero').hidden = false;
    $('catalog-title').textContent = 'Au programme'; $('catalog-eyebrow').textContent = 'CHOISISSEZ VOTRE TERRAIN';
    $('brand-name').textContent = config.title.toUpperCase();
    loadCatalog(null); $('open-site').focus();
  }
  function categoryPage(item) {
    show('category', true); $('hero').hidden = true;
    $('catalog-title').textContent = friendly(item.title); $('catalog-eyebrow').textContent = 'LE PROGRAMME / LIENS DU SITE';
    loadCatalog(item);
  }
  function openPlayer(address, title) {
    if (!config) return;
    var url = new URL(address);
    if (url.protocol !== 'https:' || url.origin !== new URL(config.sourceUrl).origin || url.username || url.password) { notice('Ce lien ne correspond pas au site configuré.', true); return; }
    ++catalogGeneration;
    if (!/^\/stream\//.test(url.pathname)) { notice('Choisissez une diffusion dans le catalogue.', true); return; }
    show('player', true); $('player-title').textContent = title;
    $('video-loading').hidden = false; $('video-loading').textContent = 'Recherche du flux vidéo…';
    $('player-help').textContent = 'Le lecteur intégré lit les flux HLS accessibles publiquement. Certains lecteurs protégés ou nécessitant un compte ne sont pas compatibles.';
    $('video').removeAttribute('src'); $('video').load();
    api('/api/resolve', { path: url.pathname }).then(function (result) {
      if (screen !== 'player') return;
      var mediaUrl = session.server + result.url;
      if (window.Hls && window.Hls.isSupported()) {
        hls = new window.Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30, maxBufferLength: 30, maxMaxBufferLength: 60 });
        hls.loadSource(mediaUrl); hls.attachMedia($('video'));
        hls.on(window.Hls.Events.MANIFEST_PARSED, function () { $('video-loading').hidden = true; $('video').play().catch(function () {}); });
        hls.on(window.Hls.Events.ERROR, function (_event, data) {
          if (data.fatal) { stopVideo(); $('video-loading').hidden = false; $('video-loading').textContent = 'Ce flux ne peut pas être lu sur cet écran.'; $('player-help').textContent = 'Revenez à l’accueil puis essayez une autre diffusion.'; }
        });
      } else if ($('video').canPlayType('application/vnd.apple.mpegurl')) {
        $('video').src = mediaUrl; $('video').addEventListener('loadedmetadata', function ready() { $('video').removeEventListener('loadedmetadata', ready); $('video-loading').hidden = true; }, { once: true }); $('video').load(); $('video').play().catch(function () {});
      } else { throw new Error('Cet écran ne prend pas en charge la lecture HLS.'); }
    }).catch(function (error) {
      if (screen === 'player') { $('video-loading').hidden = false; $('video-loading').textContent = error.message; $('player-help').textContent = 'Essayez une autre diffusion ou vérifiez le lien enregistré dans la console.'; }
    });
    $('close-player').focus();
  }
  function stopVideo() {
    if (hls) { hls.destroy(); hls = null; }
    var video = $('video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  }
  function goBack() {
    if (screen === 'home') { if (window.webOSSystem && window.webOSSystem.platformBack) window.webOSSystem.platformBack(); return; }
    if (session && config) { history.back(); } else { setup(false); }
  }
  $('setup-form').onsubmit = function (event) {
    event.preventDefault();
    var server;
    try { server = serverOrigin($('server-url').value); } catch (error) { notice(error.message || 'Adresse invalide.', true); return; }
    $('connect-button').disabled = true;
    api('/pair', { code: $('pairing-code').value.trim() }, { server: server }).then(function (result) {
      session = { server: server, token: result.token }; save('global-service-tv-session', session); $('pairing-code').value = '';
      return api('/config');
    }).then(function (next) { markConfig(next); history.replaceState({ screen: 'home' }, ''); home(false); notice('Cet écran est connecté à Global Service.'); })
      .catch(function (error) { notice(error.message, true); })
      .then(function () { $('connect-button').disabled = false; });
  };
  $('settings-button').onclick = $('rail-settings').onclick = function () { setup(true); };
  $('cancel-setup').onclick = function () { home(false); refresh(); };
  $('home-button').onclick = function () { home(false); refresh(); };
  $('reload-button').onclick = function () { refresh().then(function () { home(false); }); };
  $('open-site').onclick = function () { loadCatalog(null); };
  $('close-player').onclick = function () { history.back(); };
  window.addEventListener('popstate', function () { home(false); refresh(); });
  document.addEventListener('keydown', function (event) {
    var code = event.keyCode;
    var input = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (code === 461 || code === 27 || (code === 8 && !input)) { event.preventDefault(); goBack(); return; }
    if (code < 37 || code > 40 || (input && (code === 37 || code === 39))) return;
    var controls = Array.prototype.slice.call(document.querySelectorAll('button:not([disabled]),input')).filter(function (el) { return el.getClientRects().length > 0 && (screen !== 'player' || $('player').contains(el)); });
    var current = document.activeElement;
    if (controls.indexOf(current) < 0) { if (controls[0]) controls[0].focus(); return; }
    var a = current.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best, score = Infinity;
    controls.forEach(function (candidate) {
      if (candidate === current) return;
      var b = candidate.getBoundingClientRect(), dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      var forward = code === 37 ? -dx : code === 39 ? dx : code === 38 ? -dy : dy;
      var side = Math.abs(code === 37 || code === 39 ? dy : dx);
      if (forward < 5) return;
      var distance = forward + side * 3;
      if (distance < score) { score = distance; best = candidate; }
    });
    if (best) { event.preventDefault(); best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });
  function clock() { $('clock').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  clock(); setInterval(clock, 30000);
  setInterval(function () { if (!document.hidden) refresh(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  history.replaceState({ screen: session ? 'home' : 'setup' }, '');
  if (session && config) { home(false); refresh(); }
  else if (session) { refresh().then(function () { if (config) home(false); }); }
  else { setup(false); }
}());
