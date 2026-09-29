/* Owl Studio — a single-page front end for the Suno API (https://docs.sunoapi.org/) */
(() => {
  'use strict';

  // ================= Constants =================
  const NS = 'owlstudio.';
  // On Netlify the /suno-api and /suno-upload paths are proxied (see netlify.toml) so the
  // browser never has to deal with CORS. Anywhere else we fall back to calling Suno directly.
  const API_BASES = ['/suno-api', 'https://api.sunoapi.org'];
  const UPLOAD_BASES = ['/suno-upload', 'https://sunoapiorg.redpandaai.co'];
  const DEFAULT_CALLBACK = 'https://example.com/owl-studio-callback';

  const MODELS = [
    { id: 'V6', name: 'V6', ico: '🌟', desc: 'Most natural vocals, richest detail', tag: 'Best' },
    { id: 'V6_WILD', name: 'V6 Wild', ico: '🔥', desc: 'Bolder, more distinctive and experimental' },
    { id: 'V6_MINI', name: 'V6 Mini', ico: '⚡', desc: 'Lightweight and fast' },
    { id: 'V5_5', name: 'V5.5', ico: '🎙️', desc: 'Voice-customised model', legacy: true },
    { id: 'V5', name: 'V5', ico: '🎼', desc: 'Superior expression, fast', legacy: true },
    { id: 'V4_5PLUS', name: 'V4.5+', ico: '🎹', desc: 'Richer tones, up to 8 min', legacy: true },
    { id: 'V4_5ALL', name: 'V4.5 All', ico: '🧱', desc: 'Better song structure', legacy: true },
    { id: 'V4_5', name: 'V4.5', ico: '💡', desc: 'Smart prompts, up to 8 min', legacy: true },
    { id: 'V4', name: 'V4', ico: '🎤', desc: 'Improved vocals, up to 4 min', legacy: true }
  ];
  const DURATION_MODELS = ['V5_5', 'V6', 'V6_MINI', 'V6_WILD'];
  const STYLE_LIMIT = { V4: 200 };

  const VIBES = ['Pop', 'Hip-hop', 'R&B', 'Rock', 'Indie', 'EDM', 'Lo-fi', 'Country', 'Jazz', 'Latin', 'Reggaeton', 'K-pop', 'Afrobeats', 'Classical', 'Cinematic', 'Folk', 'Metal', 'Funk', 'Gospel', 'Synthwave'];
  const STYLE_TAGS = ['upbeat', 'melancholic', 'dreamy', 'energetic', 'chill', 'epic', 'acoustic', 'female vocals', 'male vocals', 'duet', 'choir', 'piano', 'guitar', '808s', 'strings', 'synths', '90 bpm', '120 bpm', 'lo-fi', 'anthemic'];
  const SURPRISES = [
    ['A triumphant anthem for an owl who finally aces her finals, with a stadium-sized chorus', ['Pop', 'Cinematic']],
    ['A lazy Sunday morning song about pancakes, sunshine and a cat who refuses to move', ['Lo-fi', 'Jazz']],
    ['A road-trip singalong cruising down A1A with the windows down and the ocean on the left', ['Country', 'Pop']],
    ['A dramatic villain song sung by a houseplant that nobody remembers to water', ['Cinematic', 'Rock']],
    ['A neon-soaked midnight drive through Miami, retro synths and a heartbreak', ['Synthwave', 'Pop']],
    ['A hype track about the group project member who actually did all the work', ['Hip-hop']],
    ['A lullaby for a sleepy robot learning to dream', ['Classical', 'Lo-fi']],
    ['A summer beach party with steel drums and pure good vibes', ['Latin', 'Reggaeton']],
    ['A soulful ballad about the last slice of pizza', ['R&B', 'Gospel']],
    ['An epic metal saga about a squirrel defending its acorn kingdom', ['Metal']]
  ];
  const LYRIC_IDEAS = ['First day of college', 'Falling for your best friend', 'Hurricane season in Florida', 'Coffee at 3 a.m.', 'A dog who thinks he is a wolf', 'Graduation day', 'Long-distance love', 'Chasing sunsets'];
  const COOK_LINES = ['Warming up the vocalist…', 'Tuning the guitars…', 'Writing a killer hook…', 'Mixing the drums…', 'Adding a little reverb…', 'Arguing about the bridge…', 'Polishing the chorus…', 'Mastering the track…'];
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ================= Small helpers =================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'dataset') Object.assign(n.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, '');
        else n.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : String(kid));
    return n;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} }
  };
  const fmtTime = (s) => {
    if (!isFinite(s) || s < 0) return '0:00';
    s = Math.round(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clean = (obj) => {
    const o = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
      o[k] = v;
    }
    return o;
  };

  function toast(msg, opts = {}) {
    const t = el('div', { class: 'toast' + (opts.error ? ' err' : '') }, el('span', { text: msg }));
    if (opts.action) t.append(el('button', { type: 'button', text: opts.action, onclick: () => { opts.onAction(); t.remove(); } }));
    $('#toasts').append(t);
    setTimeout(() => t.remove(), opts.ms || (opts.error ? 7000 : 4500));
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('#confetti');
    const colors = ['#7c3aed', '#db2777', '#f59e0b', '#10b981', '#3b82f6'];
    for (let i = 0; i < 60; i++) {
      const c = el('i');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = pick(colors);
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.4 + 's';
      c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      box.append(c);
      setTimeout(() => c.remove(), 3800);
    }
  }

  function busy(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('is-busy', on);
  }
  function showErr(node, msg) {
    node.textContent = msg || '';
    node.hidden = !msg;
  }

  // ================= Theme =================
  const themeButtons = $$('[data-theme-choice]');
  function applyTheme(choice) {
    const root = document.documentElement;
    if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
    themeButtons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeChoice === choice)));
    try { localStorage.setItem(NS + 'theme', choice); } catch (e) {}
  }
  themeButtons.forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeChoice)));
  applyTheme((() => { try { return localStorage.getItem(NS + 'theme') || 'system'; } catch (e) { return 'system'; } })());

  // ================= API key =================
  let apiKey = '';
  function loadKey() {
    try { return localStorage.getItem(NS + 'key') || sessionStorage.getItem(NS + 'key') || ''; } catch (e) { return ''; }
  }
  function saveKey(k, remember) {
    try {
      localStorage.removeItem(NS + 'key');
      sessionStorage.removeItem(NS + 'key');
      if (remember) localStorage.setItem(NS + 'key', k);
      else sessionStorage.setItem(NS + 'key', k);
    } catch (e) {}
  }
  function forgetKey() {
    try { localStorage.removeItem(NS + 'key'); sessionStorage.removeItem(NS + 'key'); } catch (e) {}
    apiKey = '';
  }
  const callbackUrl = () => store.get('callback', '') || DEFAULT_CALLBACK;

  // ================= API client =================
  class ApiError extends Error {
    constructor(msg, code) { super(msg); this.code = code; }
  }
  const CODE_MSG = {
    400: 'Some settings were not accepted',
    401: 'That API key was not accepted. Double-check it and try again.',
    404: 'That feature is not available right now.',
    405: 'Too many requests — slow down for a moment.',
    413: 'Your prompt or lyrics are too long for this model.',
    429: 'You are out of credits. Top up at sunoapi.org to keep creating.',
    430: 'You are sending requests too quickly. Wait a few seconds and try again.',
    455: 'Suno is under maintenance. Please try again shortly.',
    500: 'Suno hit a server error. Please try again.'
  };
  function friendly(code, msg) {
    const base = CODE_MSG[code];
    if (!base) return msg || 'Request failed (' + code + ')';
    if (msg && !/^success$/i.test(msg) && (code === 400 || code === 500 || code === 413)) return base + ': ' + msg;
    return base;
  }

  let apiBase = null;
  let uploadBase = null;
  async function request(bases, current, path, { method = 'GET', body, query } = {}) {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const order = current ? [current, ...bases.filter((b) => b !== current)] : bases;
    let lastErr = new ApiError('Could not reach the Suno API. Check your connection.', 0);
    for (const base of order) {
      let res;
      try {
        res = await fetch(base + path + qs, {
          method,
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) {
        continue; // network / CORS failure — try the next route
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        // e.g. a static host without the Netlify proxy returns an HTML 404
        lastErr = new ApiError('Unexpected response from the API (HTTP ' + res.status + ').', res.status);
        continue;
      }
      const json = await res.json().catch(() => ({}));
      const code = json.code != null ? Number(json.code) : res.status;
      if (code !== 200 || !res.ok) {
        throw new ApiError(friendly(code, json.msg), code);
      }
      return { json, base };
    }
    throw lastErr;
  }
  async function api(path, opts) {
    const { json, base } = await request(API_BASES, apiBase, path, opts);
    apiBase = base;
    return json;
  }
  async function uploadFile(file, onStatus) {
    if (file.size > 50 * 1024 * 1024) throw new ApiError('That file is over 50 MB — please use a smaller file or paste a public link.', 413);
    onStatus && onStatus('Reading file…');
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new ApiError('Could not read that file.', 0));
      r.readAsDataURL(file);
    });
    onStatus && onStatus('Uploading ' + file.name + '…');
    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'upload';
    const { json, base } = await request(UPLOAD_BASES, uploadBase, '/api/file-base64-upload', {
      method: 'POST',
      body: { base64Data: dataUrl, uploadPath: 'owl-studio', fileName: Date.now() + '-' + safeName }
    });
    uploadBase = base;
    const url = json.data && (json.data.downloadUrl || json.data.fileUrl);
    if (!url) throw new ApiError('Upload finished but no file link came back.', 0);
    return url;
  }

  // ================= Credits =================
  const creditsPill = $('#credits-pill');
  let credits = null;
  async function refreshCredits() {
    try {
      const j = await api('/api/v1/generate/credit');
      credits = typeof j.data === 'number' ? j.data : Number(j.data);
      $('#credits-value').textContent = isFinite(credits) ? credits.toLocaleString() : '—';
      creditsPill.classList.toggle('low', isFinite(credits) && credits < 20);
      creditsPill.hidden = false;
      return credits;
    } catch (e) {
      if (e.code === 401) lock('Your API key is no longer valid. Please enter it again.');
      throw e;
    }
  }
  creditsPill.addEventListener('click', () => refreshCredits().then(() => toast('Credits updated: ' + credits.toLocaleString())).catch((e) => toast(e.message, { error: true })));

  // ================= Gate / unlock =================
  const gate = $('#gate');
  const studio = $('#studio');
  const keyForm = $('#key-form');
  const keyInput = $('#key-input');

  $('#key-toggle').addEventListener('click', (e) => {
    const show = keyInput.type === 'password';
    keyInput.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Hide' : 'Show';
    e.currentTarget.setAttribute('aria-pressed', String(show));
  });

  keyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#key-submit');
    const k = keyInput.value.trim();
    showErr($('#key-error'), '');
    if (k.length < 8) return showErr($('#key-error'), 'That does not look like a full API key.');
    busy(btn, true);
    apiKey = k;
    try {
      await refreshCredits();
      saveKey(k, $('#key-remember').checked);
      keyInput.value = '';
      unlock(true);
    } catch (err) {
      apiKey = '';
      showErr($('#key-error'), err.message);
    } finally {
      busy(btn, false);
    }
  });

  function unlock(fresh) {
    gate.hidden = true;
    studio.hidden = false;
    $('#key-btn').hidden = false;
    if (fresh) toast(`You're in! ${isFinite(credits) ? credits.toLocaleString() + ' credits ready to spend.' : ''} Let's make something.`);
    resumeJobs();
  }
  function lock(msg) {
    forgetKey();
    stopAllPolls();
    studio.hidden = true;
    gate.hidden = false;
    creditsPill.hidden = true;
    $('#key-btn').hidden = true;
    if (msg) showErr($('#key-error'), msg);
    keyInput.focus();
  }

  // ================= Tabs =================
  const tabs = $$('[data-tab]');
  function go(name) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (name === 'library') renderLibrary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  tabs.forEach((t) => t.addEventListener('click', () => go(t.dataset.tab)));
  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    go(n.dataset.tab);
    n.focus();
  });
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g && !studio.hidden) { e.preventDefault(); go(g.dataset.go); }
  });

  // ================= Character counters =================
  function bindCounter(input) {
    const out = $(`[data-count-for="${input.id}"]`);
    if (!out) return;
    const upd = () => {
      const max = Number(input.getAttribute('maxlength')) || 0;
      out.textContent = input.value.length + (max ? ' / ' + max.toLocaleString() : '');
      out.classList.toggle('over', max && input.value.length > max * 0.95);
    };
    input.addEventListener('input', upd);
    upd();
  }
  $$('[data-count-for]').forEach((c) => { const i = document.getElementById(c.dataset.countFor); if (i) bindCounter(i); });
  const fireInput = (i) => i.dispatchEvent(new Event('input', { bubbles: true }));

  // ================= Generic form fields =================
  function modelOptions(includeLegacy = true) {
    return MODELS.filter((m) => includeLegacy || !m.legacy).map((m) => [m.id, m.name + (m.legacy ? ' (legacy)' : '') + ' — ' + m.desc]);
  }
  const GENDER_OPTS = [['', 'Any voice'], ['f', 'Female'], ['m', 'Male']];

  function uploadField(spec, value) {
    const url = el('input', { type: 'url', placeholder: 'https://… public link to your file', value: value || '', 'aria-label': spec.label + ' link' });
    const status = el('div', { class: 'up-status' }, spec.hint || '');
    const file = el('input', { type: 'file', accept: spec.accept || 'audio/*', 'aria-label': 'Choose ' + spec.label + ' file' });
    const wrap = el('div', { class: 'upload' },
      el('div', { class: 'up-row' },
        el('label', { class: 'ghost small file-btn' }, '⬆ Upload file', file),
        url),
      status);
    async function handle(f) {
      if (!f) return;
      status.className = 'up-status';
      wrap.dataset.uploading = '1';
      try {
        const link = await uploadFile(f, (m) => { status.textContent = m; });
        url.value = link;
        status.textContent = '✓ Uploaded ' + f.name + ' (kept for 3 days)';
        status.className = 'up-status ok';
      } catch (err) {
        status.textContent = err.message + ' You can also paste a public link instead.';
        status.className = 'up-status bad';
      } finally {
        delete wrap.dataset.uploading;
      }
    }
    file.addEventListener('change', () => handle(file.files[0]));
    wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('drag'); });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drag'));
    wrap.addEventListener('drop', (e) => { e.preventDefault(); wrap.classList.remove('drag'); handle(e.dataTransfer.files[0]); });
    return { node: wrap, input: url, isBusy: () => !!wrap.dataset.uploading };
  }

  // Renders a list of field specs; returns helpers to read and validate the values.
  function buildFields(container, specs, preset = {}) {
    container.replaceChildren();
    const refs = {};
    for (const s of specs) {
      const v = preset[s.name] != null ? preset[s.name] : s.value;
      const id = 'f-' + Math.random().toString(36).slice(2, 9);
      const labelText = [s.label, s.required ? el('span', { class: 'req', text: ' *' }) : null];
      let input;
      let node;
      if (s.type === 'upload') {
        const u = uploadField(s, v);
        refs[s.name] = { spec: s, input: u.input, isBusy: u.isBusy };
        node = el('div', { class: 'field' }, el('span', { class: 'label' }, el('span', null, ...labelText)), u.node);
      } else if (s.type === 'toggle') {
        input = el('input', { type: 'checkbox', role: 'switch', id });
        input.checked = !!v;
        node = el('label', { class: 'switch-row', for: id }, el('span', null, el('b', { text: s.label }), s.hint ? el('small', { text: s.hint }) : null), input);
      } else {
        if (s.type === 'textarea') input = el('textarea', { id, rows: s.rows || 5, maxlength: s.max, placeholder: s.placeholder });
        else if (s.type === 'select' || s.type === 'model' || s.type === 'gender') {
          const opts = s.type === 'model' ? modelOptions() : s.type === 'gender' ? GENDER_OPTS : s.options;
          input = el('select', { id }, opts.map(([val, lab]) => el('option', { value: val, text: lab })));
        } else input = el('input', { id, type: s.type || 'text', maxlength: s.max, placeholder: s.placeholder, min: s.min, max: s.type === 'number' ? s.maxVal : null, step: s.step });
        if (v != null) input.value = v;
        else if (s.type === 'model') input.value = 'V6';
        const count = s.max && s.type !== 'number' ? el('span', { class: 'count', 'data-count-for': id }) : null;
        node = el('label', { class: 'field', for: id }, el('span', { class: 'label' }, el('span', null, ...labelText), count), input, s.hint ? el('small', { class: 'hint', text: s.hint }) : null);
      }
      if (input) refs[s.name] = { spec: s, input };
      container.append(node);
      if (input && s.max && s.type !== 'number') bindCounter(input);
    }
    return {
      refs,
      values() {
        const out = {};
        for (const [name, r] of Object.entries(refs)) {
          const s = r.spec;
          if (s.type === 'toggle') out[name] = r.input.checked;
          else if (s.type === 'number') out[name] = r.input.value === '' ? undefined : Number(r.input.value);
          else out[name] = r.input.value.trim();
        }
        return out;
      },
      validate() {
        for (const r of Object.values(refs)) {
          if (r.isBusy && r.isBusy()) return 'Hang on — a file is still uploading.';
          if (r.spec.required && r.spec.type !== 'toggle' && !r.input.value.trim()) {
            r.input.focus();
            return (r.spec.label || 'This field') + ' is required.';
          }
          if (r.spec.type === 'upload' && r.input.value && !/^https?:\/\//i.test(r.input.value.trim())) return r.spec.label + ' must be a public http(s) link.';
        }
        return null;
      }
    };
  }

  // ================= Dialog =================
  const dlg = $('#dlg');
  let dlgSubmit = null;
  function openDialog({ title, body, okLabel = 'Go', onSubmit, cancelLabel = 'Cancel', hideOk = false }) {
    $('#dlg-title').textContent = title;
    const b = $('#dlg-body');
    b.replaceChildren();
    if (body) b.append(body);
    showErr($('#dlg-error'), '');
    $('#dlg-ok').hidden = hideOk;
    $('#dlg-ok .btn-label').textContent = okLabel;
    $('#dlg-cancel').textContent = hideOk ? 'Close' : cancelLabel;
    dlgSubmit = onSubmit || null;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeDialog() {
    $$('audio, video', dlg).forEach((m) => m.pause());
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  $('#dlg-close').addEventListener('click', closeDialog);
  $('#dlg-cancel').addEventListener('click', closeDialog);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(); });
  $('#dlg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!dlgSubmit) return closeDialog();
    const btn = $('#dlg-ok');
    busy(btn, true);
    showErr($('#dlg-error'), '');
    try {
      const keepOpen = await dlgSubmit();
      if (keepOpen !== true) closeDialog();
    } catch (err) {
      showErr($('#dlg-error'), err.message);
    } finally {
      busy(btn, false);
    }
  });

  // ================= Settings dialog =================
  $('#key-btn').addEventListener('click', () => {
    const cb = el('input', { type: 'url', value: store.get('callback', ''), placeholder: DEFAULT_CALLBACK });
    const masked = apiKey ? apiKey.slice(0, 4) + '••••••••' + apiKey.slice(-4) : '—';
    const body = el('div', null,
      el('dl', { class: 'kv' },
        el('dt', { text: 'API key' }), el('dd', { text: masked }),
        el('dt', { text: 'Credits' }), el('dd', { text: isFinite(credits) ? credits.toLocaleString() : '—' }),
        el('dt', { text: 'Route' }), el('dd', { text: apiBase === '/suno-api' ? 'Netlify proxy → api.sunoapi.org' : apiBase || 'not connected yet' })),
      el('hr', { style: 'border:0;border-top:1px solid var(--border);margin:16px 0' }),
      el('label', { class: 'field' },
        el('span', { class: 'label', text: 'Callback URL (optional)' }), cb,
        el('small', { class: 'hint', text: 'Suno requires a callback URL on every task. Owl Studio polls for results itself, so a placeholder is used unless you add your own webhook.' })),
      el('div', { class: 'row gap wrap' },
        el('button', { type: 'button', class: 'ghost small', text: '🔒 Lock & forget key', onclick: () => { closeDialog(); lock(); toast('Key removed from this browser.'); } }),
        el('button', { type: 'button', class: 'ghost small', text: '🗑 Clear library', onclick: () => {
          if (!confirm('Remove all songs from this browser’s library? (Files on Suno are not affected.)')) return;
          library = []; saveLibrary(); renderLibrary(); toast('Library cleared.');
        } }),
        el('a', { class: 'ghost small', href: 'https://sunoapi.org/billing', target: '_blank', rel: 'noopener', text: '🪙 Buy credits' })));
    openDialog({
      title: 'Settings',
      body,
      okLabel: 'Save',
      onSubmit: async () => {
        const v = cb.value.trim();
        if (v && !/^https?:\/\//i.test(v)) throw new Error('Callback URL must start with http(s)://');
        store.set('callback', v);
        toast('Settings saved.');
      }
    });
  });

  // ================= Personas =================
  let personas = store.get('personas', []);
  function renderPersonas() {
    const sel = $('#c-persona');
    const cur = sel.value;
    sel.replaceChildren(el('option', { value: '', text: personas.length ? 'None' : 'None yet — create one from a song’s ⋯ menu' }),
      ...personas.map((p) => el('option', { value: p.id, text: '🧑‍🎤 ' + p.name })));
    sel.value = personas.some((p) => p.id === cur) ? cur : '';
  }

  // ================= CREATE =================
  let mode = 'simple';
  let model = store.get('model', 'V6');
  const vibes = new Set();
  let refForm;

  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  function setMode(m) {
    mode = m;
    showErr($('#create-error'), '');
    $$('[data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
    $$('[data-show-mode]').forEach((n) => { n.hidden = n.dataset.showMode !== m; });
    updateCreateUI();
  }

  function renderModels() {
    const showLegacy = $('#show-legacy').checked || MODELS.find((m) => m.id === model)?.legacy;
    $('#show-legacy').checked = !!showLegacy;
    const box = $('#model-cards');
    box.replaceChildren(...MODELS.filter((m) => showLegacy || !m.legacy).map((m) =>
      el('button', { type: 'button', role: 'radio', class: 'model', 'aria-checked': String(m.id === model), onclick: () => { model = m.id; store.set('model', model); renderModels(); updateCreateUI(); } },
        el('span', { class: 'm-ico', text: m.ico }),
        el('b', null, m.name, m.tag ? el('span', { class: 'tag', text: m.tag }) : null, m.legacy ? el('span', { class: 'tag old', text: 'legacy' }) : null),
        el('small', { text: m.desc }))));
  }
  $('#show-legacy').addEventListener('change', renderModels);

  function renderChips() {
    $('#vibe-chips').replaceChildren(...VIBES.map((v) =>
      el('button', { type: 'button', 'aria-pressed': String(vibes.has(v)), text: v, onclick: (e) => {
        vibes.has(v) ? vibes.delete(v) : vibes.add(v);
        e.currentTarget.setAttribute('aria-pressed', String(vibes.has(v)));
      } })));
    $('#style-chips').replaceChildren(...STYLE_TAGS.map((t) =>
      el('button', { type: 'button', text: '+ ' + t, onclick: () => {
        const i = $('#c-style');
        const parts = i.value.split(',').map((x) => x.trim()).filter(Boolean);
        if (!parts.includes(t)) parts.push(t);
        i.value = parts.join(', ');
        fireInput(i);
      } })));
    $('#lyric-ideas').replaceChildren(...LYRIC_IDEAS.map((t) =>
      el('button', { type: 'button', text: t, onclick: () => { const i = $('#lyrics-prompt'); i.value = 'A song about ' + t.toLowerCase(); fireInput(i); i.focus(); } })));
  }

  $('#surprise-btn').addEventListener('click', () => {
    const [idea, vs] = pick(SURPRISES);
    const p = $('#simple-prompt');
    p.value = idea;
    fireInput(p);
    vibes.clear();
    vs.forEach((v) => vibes.add(v));
    renderChips();
  });

  // Section tag buttons insert at the cursor
  $$('.tag-bar [data-tag]').forEach((b) => b.addEventListener('click', () => {
    const t = $('#c-lyrics');
    const ins = (t.selectionStart > 0 && t.value[t.selectionStart - 1] !== '\n' ? '\n\n' : '') + b.dataset.tag + '\n';
    t.setRangeText(ins, t.selectionStart, t.selectionEnd, 'end');
    t.focus();
    fireInput(t);
  }));

  $$('#c-gender [data-val]').forEach((b) => b.addEventListener('click', () => {
    $$('#c-gender [data-val]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));
  const genderVal = () => $('#c-gender [aria-checked="true"]').dataset.val;

  // Sliders
  const VARIETY = ['Off', 'Normal', 'High', 'Extra', 'Max'];
  [['ft-sw', 'o-sw'], ['ft-wd', 'o-wd'], ['ft-aw', 'o-aw']].forEach(([i, o]) => {
    const inp = document.getElementById(i);
    inp.addEventListener('input', () => { document.getElementById(o).textContent = Number(inp.value).toFixed(2); });
  });
  $('#ft-va').addEventListener('input', (e) => { $('#o-va').textContent = VARIETY[e.target.value]; });
  $('#ft-on').addEventListener('change', updateCreateUI);
  $('#dur-on').addEventListener('change', updateCreateUI);
  $('#dur').addEventListener('input', (e) => { $('#o-dur').textContent = fmtTime(Number(e.target.value)); });
  $('#instrumental').addEventListener('change', updateCreateUI);

  function updateCreateUI() {
    const instr = $('#instrumental').checked;
    $('#lyrics-field').hidden = instr;
    $('#c-gender').closest('.field').style.opacity = instr ? '.45' : '';
    $$('#c-gender button').forEach((b) => { b.disabled = instr; });
    $('#aw-wrap').hidden = instr;
    $('#ft-grid').classList.toggle('off', !$('#ft-on').checked);
    const durOk = mode === 'custom' && DURATION_MODELS.includes(model);
    $('#duration-wrap').hidden = !durOk;
    $('#dur-slider').hidden = !$('#dur-on').checked;
    $('#c-style').setAttribute('maxlength', STYLE_LIMIT[model] || 1000);
    fireInput($('#c-style'));
    $('#create-btn .btn-label').textContent = instr ? '🎹 Create instrumental' : '🎵 Create song';
  }

  $('#boost-btn').addEventListener('click', async (e) => {
    const i = $('#c-style');
    const content = i.value.trim() || [...vibes].join(', ');
    if (!content) { toast('Type a few style words first, then Boost will expand them.'); i.focus(); return; }
    const btn = e.currentTarget;
    busy(btn, true);
    try {
      const j = await api('/api/v1/style/generate', { method: 'POST', body: { content: content.slice(0, 500) } });
      const result = j.data && j.data.result;
      if (result) {
        i.value = result.slice(0, Number(i.getAttribute('maxlength')) || 1000);
        fireInput(i);
        toast('Style boosted ✨');
      } else toast('Boost is still thinking — try again in a moment.');
      refreshCredits().catch(() => {});
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      busy(btn, false);
    }
  });

  $('#create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#create-btn');
    const errBox = $('#create-error');
    showErr(errBox, '');
    const instrumental = $('#instrumental').checked;
    let body;
    let label;

    if (mode === 'simple') {
      const prompt = $('#simple-prompt').value.trim();
      const refs = refForm.values();
      const refErr = refForm.validate();
      if (refErr) return showErr(errBox, refErr);
      const style = [...vibes].join(', ');
      if (!prompt && !style && !refs.image && !refs.audio && !refs.video) return showErr(errBox, 'Describe your song, pick a vibe, or add a reference to get started.');
      if (!style && !refs.image && !refs.audio && !refs.video) return showErr(errBox, 'Pick at least one vibe (or add a reference) so Suno knows the sound you’re after.');
      body = clean({
        customMode: false, instrumental, model, callBackUrl: callbackUrl(),
        prompt, style,
        imageUrls: refs.image ? [refs.image] : undefined,
        audioUrls: refs.audio ? [refs.audio] : undefined,
        videoUrls: refs.video ? [refs.video] : undefined
      });
      label = prompt ? prompt.slice(0, 60) : style;
    } else {
      const title = $('#c-title').value.trim();
      const style = $('#c-style').value.trim();
      const lyrics = $('#c-lyrics').value.trim();
      const negativeTags = $('#c-negative').value.trim();
      if (!style && !negativeTags && (instrumental || !lyrics)) return showErr(errBox, 'Add a style of music' + (instrumental ? '.' : ' or some lyrics.'));
      if (!instrumental && !lyrics) return showErr(errBox, 'Add lyrics for a vocal song — or flip on Instrumental. Need words? Try the ✍️ Lyrics lab.');
      if (style.length > (STYLE_LIMIT[model] || 1000)) return showErr(errBox, `Style is too long for ${model} (max ${STYLE_LIMIT[model] || 1000} characters).`);
      const ft = $('#ft-on').checked;
      const personaId = $('#c-persona-id').value.trim() || $('#c-persona').value;
      body = clean({
        customMode: true, instrumental, model, callBackUrl: callbackUrl(),
        title, style, negativeTags,
        lyrics: instrumental ? undefined : lyrics,
        vocalGender: instrumental ? undefined : genderVal(),
        duration: $('#dur-on').checked && DURATION_MODELS.includes(model) ? Number($('#dur').value) : undefined,
        styleWeight: ft ? Number($('#ft-sw').value) : undefined,
        weirdnessConstraint: ft ? Number($('#ft-wd').value) : undefined,
        audioWeight: ft && !instrumental ? Number($('#ft-aw').value) : undefined,
        variety: ft ? Number($('#ft-va').value) : undefined,
        personaId: personaId || undefined,
        personaModel: personaId ? $('#c-persona-model').value : undefined
      });
      label = title || style.slice(0, 60) || 'Custom song';
    }

    busy(btn, true);
    try {
      const j = await api('/api/v1/generate', { method: 'POST', body });
      startJob({ kind: 'music', taskId: j.data.taskId, label, sub: modelName(model) + (instrumental ? ' · instrumental' : '') });
      toast('🎶 Your song is cooking! Two versions are on the way.', { action: 'Watch', onAction: () => go('library') });
      go('library');
      refreshCredits().catch(() => {});
    } catch (err) {
      showErr(errBox, err.message);
    } finally {
      busy(btn, false);
    }
  });
  const modelName = (id) => (MODELS.find((m) => m.id === id) || { name: id || '' }).name;

  // ================= LYRICS =================
  let lyricSets = store.get('lyrics', []);
  $('#lyrics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#lyrics-btn');
    const prompt = $('#lyrics-prompt').value.trim();
    showErr($('#lyrics-error'), '');
    if (!prompt) return showErr($('#lyrics-error'), 'Tell us what the song is about.');
    busy(btn, true);
    try {
      const j = await api('/api/v1/lyrics', { method: 'POST', body: { prompt, callBackUrl: callbackUrl() } });
      startJob({ kind: 'lyrics', taskId: j.data.taskId, label: prompt.slice(0, 60), sub: 'Lyrics' });
      renderLyricsPending();
      refreshCredits().catch(() => {});
    } catch (err) {
      showErr($('#lyrics-error'), err.message);
    } finally {
      busy(btn, false);
    }
  });

  function renderLyricsPending() {
    const pending = jobs.filter((j) => j.kind === 'lyrics' && j.state === 'pending');
    renderLyrics(pending);
  }
  function renderLyrics(pending = jobs.filter((j) => j.kind === 'lyrics' && j.state === 'pending')) {
    const box = $('#lyrics-results');
    const nodes = pending.map((j) => el('div', { class: 'card lyric-card' },
      el('h3', { text: '✍️ Writing…' }), el('p', { class: 'muted', text: j.label }),
      el('div', { class: 'progress indet' }, el('i'))));
    for (const set of lyricSets.slice(0, 6)) {
      for (const l of set.items) {
        nodes.push(el('div', { class: 'card lyric-card' },
          el('h3', { text: l.title || 'Untitled' }),
          el('small', { class: 'muted', text: 'From: ' + set.prompt }),
          el('pre', { text: l.text }),
          el('div', { class: 'row gap wrap' },
            el('button', { type: 'button', class: 'primary small', text: '🎵 Make it a song', onclick: () => useLyrics(l) }),
            el('button', { type: 'button', class: 'ghost small', text: '📋 Copy', onclick: () => copy(l.text) }))));
      }
    }
    box.replaceChildren(...nodes);
  }
  function useLyrics(l) {
    setMode('custom');
    $('#instrumental').checked = false;
    $('#c-title').value = (l.title || '').slice(0, 80);
    $('#c-lyrics').value = l.text || '';
    fireInput($('#c-title'));
    fireInput($('#c-lyrics'));
    updateCreateUI();
    go('create');
    toast('Lyrics loaded — now choose a style and hit Create.');
    setTimeout(() => $('#c-style').focus(), 300);
  }
  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => toast('Copied to clipboard.'), () => toast('Could not copy.', { error: true }));
  }

  // ================= REMIX =================
  const UP_AUDIO = { type: 'upload', accept: 'audio/*' };
  const REMIX_TOOLS = {
    cover: {
      ico: '🎨', name: 'Cover / Restyle', short: 'New style, same melody',
      desc: 'Transform a song into a new style while keeping its core melody (max 8 minutes).',
      path: '/api/v1/generate/upload-cover',
      fields: [
        { ...UP_AUDIO, name: 'uploadUrl', label: 'Source audio', required: true },
        { name: 'style', label: 'New style', placeholder: 'acoustic folk, warm, fingerpicked guitar', max: 1000, required: true },
        { name: 'title', label: 'Title', max: 80 },
        { name: 'lyrics', label: 'Lyrics (optional)', type: 'textarea', max: 5000, rows: 4 },
        { name: 'instrumental', label: 'Instrumental', type: 'toggle', hint: 'No vocals' },
        { name: 'vocalGender', label: 'Vocals', type: 'gender' },
        { name: 'negativeTags', label: 'Exclude styles', max: 1000 },
        { name: 'model', label: 'Model', type: 'model' }
      ]
    },
    extend: {
      ico: '➡️', name: 'Extend my audio', short: 'Continue your recording',
      desc: 'Upload a track and Suno will keep it going in the same style (max 8 minutes source).',
      path: '/api/v1/generate/upload-extend',
      fields: [
        { ...UP_AUDIO, name: 'uploadUrl', label: 'Source audio', required: true },
        { name: 'continueAt', label: 'Continue from (seconds)', type: 'number', min: 1, step: 0.1, hint: 'Leave blank to continue from the end' },
        { name: 'style', label: 'Style', max: 1000 },
        { name: 'title', label: 'Title', max: 100 },
        { name: 'lyrics', label: 'Lyrics for the new part', type: 'textarea', max: 5000, rows: 4 },
        { name: 'instrumental', label: 'Instrumental', type: 'toggle' },
        { name: 'vocalGender', label: 'Vocals', type: 'gender' },
        { name: 'model', label: 'Model', type: 'model' }
      ]
    },
    vocals: {
      ico: '🎤', name: 'Add vocals', short: 'Sing over an instrumental',
      desc: 'Layer AI vocals on top of your instrumental or beat.',
      path: '/api/v1/generate/add-vocals',
      fields: [
        { ...UP_AUDIO, name: 'uploadUrl', label: 'Instrumental audio', required: true },
        { name: 'title', label: 'Title', max: 80, required: true },
        { name: 'style', label: 'Vocal & music style', placeholder: 'soulful female R&B vocals', max: 1000, required: true },
        { name: 'lyrics', label: 'Lyrics', type: 'textarea', max: 5000, rows: 5 },
        { name: 'negativeTags', label: 'Exclude', max: 1000, required: true, value: 'off-key, distorted, shouting' },
        { name: 'vocalGender', label: 'Vocals', type: 'gender' },
        { name: 'model', label: 'Model', type: 'model' }
      ]
    },
    instrumental: {
      ico: '🎸', name: 'Add instrumental', short: 'Backing track for vocals',
      desc: 'Turn an a-cappella vocal or hummed melody into a full production.',
      path: '/api/v1/generate/add-instrumental',
      fields: [
        { ...UP_AUDIO, name: 'uploadUrl', label: 'Vocal / melody audio', required: true },
        { name: 'title', label: 'Title', max: 80, required: true },
        { name: 'tags', label: 'Instrumental style', placeholder: 'lush indie pop, live drums, warm bass', max: 1000, required: true },
        { name: 'negativeTags', label: 'Exclude', max: 1000, required: true, value: 'distorted, noisy' },
        { name: 'model', label: 'Model', type: 'model' }
      ]
    },
    mashup: {
      ico: '🔀', name: 'Mashup', short: 'Blend two tracks',
      desc: 'Mix two audio files into one brand-new mashup.',
      path: '/api/v1/generate/mashup',
      fields: [
        { ...UP_AUDIO, name: 'a', label: 'Track A', required: true },
        { ...UP_AUDIO, name: 'b', label: 'Track B', required: true },
        { name: 'style', label: 'Style', max: 1000 },
        { name: 'title', label: 'Title', max: 80 },
        { name: 'lyrics', label: 'Lyrics (optional)', type: 'textarea', max: 5000, rows: 4 },
        { name: 'vocalGender', label: 'Vocals', type: 'gender' },
        { name: 'model', label: 'Model', type: 'model' }
      ],
      toBody: (v) => ({ ...v, a: undefined, b: undefined, uploadUrlList: [v.a, v.b] })
    },
    stems: {
      ico: '🎚️', name: 'Split stems', short: 'Vocals, drums, bass…',
      desc: 'Separate any song (up to 20 MB) into vocals and instrumental, or into individual instruments.',
      path: '/api/v1/vocal-removal/generate', kind: 'stems',
      fields: [
        { ...UP_AUDIO, name: 'audioUrl', label: 'Song to split', required: true },
        { name: 'type', label: 'Separation', type: 'select', options: [['separate_vocal', 'Vocals + instrumental (2 stems)'], ['split_stem', 'Full split — drums, bass, guitar, keys… (up to 12 stems)']] }
      ]
    }
  };
  let remixTool = 'cover';
  let remixForm;
  function renderRemixTools() {
    $('#remix-tools').replaceChildren(...Object.entries(REMIX_TOOLS).map(([k, t]) =>
      el('button', { type: 'button', role: 'radio', class: 'tool', 'aria-checked': String(k === remixTool), onclick: () => selectRemix(k) },
        el('span', { text: t.ico }), el('b', { text: t.name }), el('small', { text: t.short }))));
  }
  function selectRemix(k, preset) {
    remixTool = k;
    const t = REMIX_TOOLS[k];
    renderRemixTools();
    $('#remix-title').textContent = t.ico + ' ' + t.name;
    $('#remix-desc').textContent = t.desc;
    $('#remix-btn .btn-label').textContent = t.ico + ' ' + (k === 'stems' ? 'Split it' : 'Create');
    showErr($('#remix-error'), '');
    remixForm = buildFields($('#remix-fields'), t.fields, preset);
  }
  $('#remix-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = REMIX_TOOLS[remixTool];
    const err = remixForm.validate();
    showErr($('#remix-error'), err);
    if (err) return;
    const v = remixForm.values();
    const body = clean({ ...(t.toBody ? t.toBody(v) : v), callBackUrl: callbackUrl() });
    if (body.instrumental) delete body.vocalGender;
    const btn = $('#remix-btn');
    busy(btn, true);
    try {
      const j = await api(t.path, { method: 'POST', body });
      startJob({ kind: t.kind || 'music', taskId: j.data.taskId, label: v.title || t.name, sub: t.name + (v.model ? ' · ' + modelName(v.model) : '') });
      toast(t.ico + ' ' + t.name + ' started!', { action: 'Watch', onAction: () => go('library') });
      go('library');
      refreshCredits().catch(() => {});
    } catch (er) {
      showErr($('#remix-error'), er.message);
    } finally {
      busy(btn, false);
    }
  });

  // ================= SOUNDS =================
  let soundsForm;
  function renderSounds() {
    const keys = [['Any', 'Any key']];
    NOTES.forEach((n) => { keys.push([n, n + ' major']); keys.push([n + 'm', n + ' minor']); });
    soundsForm = buildFields($('#sounds-fields'), [
      { name: 'prompt', label: 'Describe the sound', type: 'textarea', rows: 3, max: 500, required: true, placeholder: 'Punchy trap drum loop with rolling hi-hats and a deep 808' },
      { name: 'soundLoop', label: 'Seamless loop', type: 'toggle', hint: 'Make it loop perfectly' },
      { name: 'soundTempo', label: 'Tempo (BPM)', type: 'number', min: 1, maxVal: 300, step: 1, placeholder: '120' },
      { name: 'soundKey', label: 'Key', type: 'select', options: keys },
      { name: 'model', label: 'Model', type: 'model' }
    ]);
  }
  $('#sounds-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = soundsForm.validate();
    showErr($('#sounds-error'), err);
    if (err) return;
    const v = soundsForm.values();
    if (v.soundTempo != null && (v.soundTempo < 1 || v.soundTempo > 300)) return showErr($('#sounds-error'), 'Tempo must be between 1 and 300 BPM.');
    const body = clean({ ...v, soundLoop: v.soundLoop || undefined, soundKey: v.soundKey === 'Any' ? undefined : v.soundKey, callBackUrl: callbackUrl() });
    const btn = $('#sounds-btn');
    busy(btn, true);
    try {
      const j = await api('/api/v1/generate/sounds', { method: 'POST', body });
      startJob({ kind: 'music', taskId: j.data.taskId, label: v.prompt.slice(0, 60), sub: 'Sound' + (v.soundTempo ? ' · ' + v.soundTempo + ' bpm' : '') });
      toast('🥁 Sound on the way!');
      go('library');
      refreshCredits().catch(() => {});
    } catch (er) {
      showErr($('#sounds-error'), er.message);
    } finally {
      busy(btn, false);
    }
  });

  // ================= Jobs & polling =================
  // Each kind knows how to poll its task and turn the response into a common shape.
  const failed = (s) => /FAIL|ERROR|SENSITIVE/i.test(String(s || ''));
  const POLL = {
    music: {
      path: '/api/v1/generate/record-info', ico: '🎵',
      parse(d) {
        const r = d.response || {};
        const tracks = (r.sunoData || r.data || []).filter(Boolean);
        const status = d.status || r.status || (tracks[0] && tracks[0].status) || 'PENDING';
        const playable = tracks.filter((t) => t.audio_url || t.stream_audio_url);
        if (status === 'SUCCESS' || (/CALLBACK/i.test(status) && tracks.some((t) => t.audio_url))) return { state: 'done', progress: 1, tracks };
        if (failed(status) || /EXCEPTION/.test(status)) return { state: 'failed', error: d.errorMessage || r.errorMessage || humanStatus(status) };
        if (status === 'FIRST_SUCCESS') return { state: 'pending', progress: 0.8, tracks: playable, msg: 'First version ready — finishing the second…' };
        if (status === 'TEXT_SUCCESS') return { state: 'pending', progress: 0.45, tracks: playable, msg: 'Lyrics written — recording now…' };
        return { state: 'pending', progress: 0.15, tracks: playable };
      }
    },
    lyrics: {
      path: '/api/v1/lyrics/record-info', ico: '✍️',
      parse(d) {
        const r = d.response || {};
        const items = (r.data || []).filter((x) => x && x.text);
        const status = d.status || r.status || 'PENDING';
        if (status === 'SUCCESS' || (/CALLBACK/i.test(status) && items.length)) return { state: 'done', progress: 1, items };
        if (failed(status) || /EXCEPTION/.test(status)) return { state: 'failed', error: d.errorMessage || humanStatus(status) };
        return { state: 'pending', progress: 0.4 };
      }
    },
    wav: {
      path: '/api/v1/wav/record-info', ico: '💿',
      parse(d) {
        const url = d.response && d.response.audioWavUrl;
        if (url) return { state: 'done', progress: 1, url };
        if (failed(d.successFlag) || /EXCEPTION/.test(d.successFlag || '')) return { state: 'failed', error: d.errorMessage || humanStatus(d.successFlag) };
        return { state: 'pending', progress: 0.5 };
      }
    },
    stems: {
      path: '/api/v1/vocal-removal/record-info', ico: '🎚️',
      parse(d) {
        const r = d.response || {};
        const stems = collectStems(r);
        if (stems.length && (d.successFlag === 'SUCCESS' || /CALLBACK/.test(d.successFlag || '') || !d.successFlag)) return { state: 'done', progress: 1, stems };
        if (failed(d.successFlag) || /EXCEPTION/.test(d.successFlag || '')) return { state: 'failed', error: d.errorMessage || humanStatus(d.successFlag) };
        return { state: 'pending', progress: 0.5 };
      }
    },
    video: {
      path: '/api/v1/mp4/record-info', ico: '🎬',
      parse(d) {
        const url = d.response && d.response.videoUrl;
        if (url) return { state: 'done', progress: 1, url };
        if (failed(d.successFlag) || /EXCEPTION/.test(d.successFlag || '')) return { state: 'failed', error: d.errorMessage || humanStatus(d.successFlag) };
        return { state: 'pending', progress: 0.5 };
      }
    },
    cover: {
      path: '/api/v1/suno/cover/record-info', ico: '🖼️',
      parse(d) {
        const imgs = (d.response && d.response.images) || [];
        if (imgs.length) return { state: 'done', progress: 1, images: imgs };
        const f = Number(d.successFlag);
        if (f === 3 || (d.errorMessage && f !== 0 && f !== 2)) return { state: 'failed', error: d.errorMessage || 'Cover art generation failed' };
        return { state: 'pending', progress: f === 2 ? 0.6 : 0.3 };
      }
    }
  };
  function humanStatus(s) {
    const map = {
      CREATE_TASK_FAILED: 'Suno could not start this task.',
      GENERATE_AUDIO_FAILED: 'Suno could not generate the audio. Try a different prompt or model.',
      SENSITIVE_WORD_ERROR: 'The prompt or lyrics contain words Suno does not allow. Please rephrase.',
      CALLBACK_EXCEPTION: 'The task finished with a callback error.',
      GENERATE_WAV_FAILED: 'WAV conversion failed.',
      GENERATE_MP4_FAILED: 'Video generation failed.'
    };
    return map[s] || (s ? 'Task failed (' + String(s).toLowerCase().replace(/_/g, ' ') + ')' : 'Task failed.');
  }
  const STEM_KEYS = [
    ['vocalUrl', 'Vocals', '🎤'], ['instrumentalUrl', 'Instrumental', '🎹'], ['backingVocalsUrl', 'Backing vocals', '👥'],
    ['drumsUrl', 'Drums', '🥁'], ['bassUrl', 'Bass', '🎸'], ['guitarUrl', 'Guitar', '🎸'], ['keyboardUrl', 'Keyboard', '🎹'],
    ['percussionUrl', 'Percussion', '🪘'], ['stringsUrl', 'Strings', '🎻'], ['synthUrl', 'Synth', '🎛️'], ['fxUrl', 'FX', '✨'],
    ['brassUrl', 'Brass', '🎺'], ['woodwindsUrl', 'Woodwinds', '🎷']
  ];
  function collectStems(r) {
    const out = STEM_KEYS.filter(([k]) => r[k]).map(([k, name, ico]) => ({ name, ico, url: r[k] }));
    if (!out.length && Array.isArray(r.originData)) {
      r.originData.filter((x) => x && x.audio_url).forEach((x) => out.push({ name: x.stem_type_group_name || 'Stem', ico: '🎵', url: x.audio_url }));
    }
    return out;
  }

  let jobs = store.get('jobs', []);
  const timers = new Map();
  const saveJobs = () => store.set('jobs', jobs.slice(0, 60));

  function startJob({ kind, taskId, label, sub, trackId }) {
    if (!taskId) { toast('The API did not return a task ID.', { error: true }); return; }
    const job = { id: taskId, kind, label, sub, trackId, state: 'pending', progress: 0.05, createdAt: Date.now(), line: pick(COOK_LINES) };
    jobs = [job, ...jobs.filter((j) => j.id !== taskId)];
    saveJobs();
    renderJobs();
    schedulePoll(job, 2500);
  }
  function schedulePoll(job, delay) {
    clearTimeout(timers.get(job.id));
    timers.set(job.id, setTimeout(() => poll(job), delay));
  }
  function stopAllPolls() {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  }
  function resumeJobs() {
    jobs.filter((j) => j.state === 'pending').forEach((j, i) => schedulePoll(j, 500 + i * 400));
    renderJobs();
    renderLyrics();
  }

  async function poll(job) {
    if (!apiKey) return;
    const P = POLL[job.kind];
    const age = Date.now() - job.createdAt;
    let res;
    try {
      const j = await api(P.path, { query: { taskId: job.id } });
      res = P.parse(j.data || {});
    } catch (e) {
      if (e.code === 401) return;
      res = { state: 'pending', progress: job.progress, transient: e.message };
    }
    if (res.state === 'pending' && age > 20 * 60 * 1000) res = { state: 'stalled', error: 'This is taking longer than usual.' };
    Object.assign(job, { state: res.state, progress: res.progress ?? job.progress, msg: res.msg, error: res.error });
    if (res.tracks && res.tracks.length) addTracks(res.tracks, job);
    if (res.state === 'done') onJobDone(job, res);
    if (res.state === 'failed') {
      toast('😕 ' + (job.label || 'Task') + ': ' + res.error, { error: true });
      if (job.kind === 'lyrics') renderLyrics();
    }
    if (res.state === 'pending') {
      job.line = pick(COOK_LINES);
      schedulePoll(job, age < 60000 ? 4000 : age < 300000 ? 7000 : 12000);
    } else timers.delete(job.id);
    saveJobs();
    renderJobs();
  }

  function onJobDone(job, res) {
    const track = job.trackId && library.find((t) => t.id === job.trackId);
    switch (job.kind) {
      case 'music':
        confetti();
        toast('🎉 “' + (res.tracks[0]?.title || job.label) + '” is ready!', { action: 'Play', onAction: () => playTrack(res.tracks[0]?.id) });
        refreshCredits().catch(() => {});
        break;
      case 'lyrics':
        lyricSets = [{ prompt: job.label, items: res.items.map((x) => ({ title: x.title, text: x.text })) }, ...lyricSets].slice(0, 10);
        store.set('lyrics', lyricSets);
        renderLyrics();
        toast('✍️ Fresh lyrics are ready!', { action: 'View', onAction: () => go('lyrics') });
        break;
      case 'wav':
        if (track) { track.extras.wav = res.url; saveLibrary(); }
        toast('💿 WAV ready' + (track ? ' for “' + track.title + '”' : ''), { action: 'Download', onAction: () => window.open(res.url, '_blank', 'noopener') });
        break;
      case 'video':
        if (track) { track.extras.video = res.url; saveLibrary(); }
        toast('🎬 Music video ready!', { action: 'Watch', onAction: () => showVideo(res.url, track) });
        break;
      case 'stems':
        job.result = res.stems;
        if (track) { track.extras.stems = res.stems; saveLibrary(); }
        toast('🎚️ Stems are ready!', { action: 'Open', onAction: () => showStems(res.stems, track ? track.title : job.label) });
        break;
      case 'cover':
        if (track) { track.extras.covers = res.images; saveLibrary(); }
        toast('🖼️ New cover art ready!', { action: 'View', onAction: () => showCovers(res.images, track) });
        break;
    }
    renderLibrary();
  }

  function renderJobs() {
    const box = $('#jobs');
    const visible = jobs.filter((j) => j.state !== 'done' && !(j.state === 'failed' && Date.now() - j.createdAt > 3600e3) && j.kind !== 'lyrics' || (j.kind === 'stems' && j.state === 'done' && !j.trackId && j.result));
    box.replaceChildren(...visible.slice(0, 12).map((j) => {
      const ico = POLL[j.kind]?.ico || '🎵';
      const failedJob = j.state === 'failed' || j.state === 'stalled';
      const doneStems = j.kind === 'stems' && j.state === 'done';
      let actions;
      if (doneStems) actions = el('button', { class: 'ghost small', type: 'button', text: 'Open stems', onclick: () => showStems(j.result, j.label) });
      else if (j.state === 'stalled') actions = el('button', { class: 'ghost small', type: 'button', text: 'Check again', onclick: () => { j.state = 'pending'; j.createdAt = Date.now(); poll(j); } });
      else if (failedJob) actions = el('button', { class: 'ghost small', type: 'button', text: 'Dismiss', onclick: () => { jobs = jobs.filter((x) => x !== j); saveJobs(); renderJobs(); } });
      const pct = Math.round((j.progress || 0.05) * 100);
      return el('div', { class: 'job' + (failedJob ? ' failed' : '') },
        el('div', { class: 'j-ico' + (j.state === 'pending' ? ' spin' : ''), text: failedJob ? '!' : ico }),
        el('div', null,
          el('b', { text: j.label || 'Task' }),
          el('small', { text: failedJob ? j.error : doneStems ? 'Stems ready' : [j.sub, j.msg || j.line].filter(Boolean).join(' · ') }),
          j.state === 'pending' ? el('div', { class: 'progress' }, el('i', { style: 'width:' + pct + '%' })) : null),
        actions || el('span'));
    }));
  }

  // ================= Library =================
  let library = store.get('library', []);
  const saveLibrary = () => store.set('library', library.slice(0, 300));
  let menuOpen = null;

  function addTracks(items, job) {
    let changed = false;
    for (const t of items.slice().reverse()) {
      if (!t.id) continue;
      let tr = library.find((x) => x.id === t.id);
      if (!tr) {
        tr = { id: t.id, taskId: job.id, createdAt: Date.now(), fav: false, extras: {}, sub: job.sub };
        library.unshift(tr);
      }
      Object.assign(tr, clean({
        title: t.title || tr.title || job.label,
        tags: t.tags, lyrics: t.prompt, model: t.model_name,
        image: t.image_url || t.source_image_url, audio: t.audio_url || t.source_audio_url,
        stream: t.stream_audio_url || t.source_stream_audio_url, duration: t.duration
      }));
      changed = true;
    }
    if (changed) { saveLibrary(); renderLibrary(); }
  }

  function visibleTracks() {
    const q = $('#lib-search').value.trim().toLowerCase();
    const fav = $('#lib-filter').value === 'fav';
    return library.filter((t) => (!fav || t.fav) && (!q || [t.title, t.tags, t.lyrics].join(' ').toLowerCase().includes(q)));
  }
  $('#lib-search').addEventListener('input', () => renderLibrary());
  $('#lib-filter').addEventListener('change', () => renderLibrary());

  let renderPending = false;
  function renderLibrary() {
    $('#lib-count').textContent = library.length;
    if ($('#panel-library').hidden) return;
    if (menuOpen) { renderPending = true; return; } // don't yank an open menu away
    renderPending = false;
    const list = visibleTracks();
    $('#lib-empty').hidden = library.length > 0 || jobs.some((j) => j.state === 'pending');
    $('#library').replaceChildren(...list.map(trackCard));
    if (library.length && !list.length) $('#library').append(el('p', { class: 'muted', text: 'No songs match that search.' }));
  }

  function trackCard(t) {
    const playing = current && current.id === t.id;
    const isPlaying = playing && !audio.paused;
    const extras = [];
    if (t.extras.wav) extras.push(el('a', { href: t.extras.wav, target: '_blank', rel: 'noopener', text: '💿 WAV' }));
    if (t.extras.video) extras.push(el('a', { href: '#', text: '🎬 Video', onclick: (e) => { e.preventDefault(); showVideo(t.extras.video, t); } }));
    if (t.extras.stems) extras.push(el('a', { href: '#', text: '🎚️ Stems', onclick: (e) => { e.preventDefault(); showStems(t.extras.stems, t.title); } }));
    if (t.extras.covers) extras.push(el('a', { href: '#', text: '🖼️ Art', onclick: (e) => { e.preventDefault(); showCovers(t.extras.covers, t); } }));
    if (t.extras.persona) extras.push(el('a', { href: '#', text: '🧑‍🎤 Persona', onclick: (e) => { e.preventDefault(); copy(t.extras.persona); } }));
    const ready = !!t.audio;
    return el('article', { class: 'track' + (playing ? ' playing' : ''), dataset: { id: t.id } },
      el('div', { class: 't-art' },
        t.image ? el('img', { src: t.image, alt: '', loading: 'lazy' }) : null,
        el('button', { type: 'button', class: 't-fav', 'aria-pressed': String(!!t.fav), 'aria-label': 'Favourite', text: t.fav ? '★' : '☆', onclick: () => { t.fav = !t.fav; saveLibrary(); renderLibrary(); } }),
        t.duration ? el('span', { class: 't-dur', text: fmtTime(t.duration) }) : ready ? null : el('span', { class: 't-dur', text: 'streaming…' }),
        el('button', { type: 'button', class: 't-play', 'aria-label': (isPlaying ? 'Pause ' : 'Play ') + (t.title || ''), text: isPlaying ? '❚❚' : '▶', onclick: () => (current && current.id === t.id ? togglePlay() : playTrack(t.id)) })),
      el('div', { class: 't-body' },
        el('div', { class: 't-title', title: t.title, text: t.title || 'Untitled' }),
        el('div', { class: 't-tags', text: t.tags || '' }),
        el('div', { class: 't-meta' }, t.sub ? el('span', { text: t.sub }) : null, t.model ? el('span', { text: t.model }) : null),
        extras.length ? el('div', { class: 't-extras' }, extras) : null,
        el('div', { class: 't-actions' },
          ready ? el('a', { class: 'ghost small', href: t.audio, target: '_blank', rel: 'noopener', download: (t.title || 'song') + '.mp3', text: '⬇ MP3' }) : el('span', { class: 'ghost small', text: '⏳ Finishing' }),
          el('div', { class: 'menu-wrap' },
            el('button', { type: 'button', class: 'ghost small', 'aria-haspopup': 'menu', 'aria-label': 'More actions', text: '⋯', onclick: (e) => openMenu(e, t) })))));
  }

  function openMenu(e, t) {
    e.stopPropagation();
    closeMenu();
    const wrap = e.currentTarget.parentElement;
    const needsAudio = (fn) => () => { if (!t.audio) return toast('Wait until the song has finished generating.'); fn(t); };
    const item = (ico, label, fn, cls) => el('button', { type: 'button', role: 'menuitem', class: cls, onclick: () => { closeMenu(); fn(); } }, el('span', { text: ico }), label);
    const menu = el('div', { class: 'menu', role: 'menu' },
      item('🎤', 'Karaoke (synced lyrics)', () => playTrack(t.id, true)),
      item('📝', 'View lyrics & details', () => showDetails(t)),
      el('hr'),
      item('➕', 'Extend this song', needsAudio(extendDialog)),
      item('✂️', 'Replace a section', needsAudio(replaceDialog)),
      item('🎨', 'Restyle (cover)', needsAudio((x) => { go('remix'); selectRemix('cover', { uploadUrl: x.audio, title: (x.title + ' (Cover)').slice(0, 80) }); })),
      item('🎤', 'Use as backing for new vocals', needsAudio((x) => { go('remix'); selectRemix('vocals', { uploadUrl: x.audio, title: x.title }); })),
      el('hr'),
      item('🎚️', 'Split into stems', needsAudio(stemsDialog)),
      item('💿', 'Get studio WAV', needsAudio(() => simpleTask(t, 'wav', '/api/v1/wav/generate', 'WAV conversion'))),
      item('🎬', 'Make a music video', needsAudio(videoDialog)),
      item('🖼️', 'Generate new cover art', needsAudio(() => simpleTask(t, 'cover', '/api/v1/suno/cover/generate', 'Cover art', { taskId: t.taskId }))),
      item('🧑‍🎤', 'Create a persona from this voice', needsAudio(personaDialog)),
      el('hr'),
      item('📋', 'Copy task & audio IDs', () => copy('taskId: ' + t.taskId + '\naudioId: ' + t.id)),
      item('🗑', 'Remove from library', () => { library = library.filter((x) => x !== t); saveLibrary(); renderLibrary(); toast('Removed.'); }, 'danger'));
    // Fixed-position popover so card overflow never clips it
    document.body.append(menu);
    menuOpen = menu;
    const r = wrap.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const bottomLimit = window.innerHeight - (player.hidden ? 0 : player.offsetHeight) - 8;
    menu.style.left = Math.max(8, Math.min(r.right - m.width, window.innerWidth - m.width - 8)) + 'px';
    menu.style.top = (r.bottom + 6 + m.height <= bottomLimit ? r.bottom + 6 : Math.max(8, r.top - m.height - 6)) + 'px';
    menu.querySelector('button').focus();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen.remove();
    menuOpen = null;
    if (renderPending) renderLibrary();
  }
  function updatePlayingUI() {
    $$('.track').forEach((card) => {
      const on = !!current && card.dataset.id === current.id;
      const playing = on && !audio.paused;
      card.classList.toggle('playing', on);
      const b = $('.t-play', card);
      b.textContent = playing ? '❚❚' : '▶';
      b.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + ($('.t-title', card).textContent || ''));
    });
  }
  document.addEventListener('click', (e) => { if (menuOpen && !menuOpen.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, { passive: true });

  async function simpleTask(t, kind, path, name, body) {
    try {
      const j = await api(path, { method: 'POST', body: body ? { ...body, callBackUrl: callbackUrl() } : { taskId: t.taskId, audioId: t.id, callBackUrl: callbackUrl() } });
      startJob({ kind, taskId: j.data.taskId || j.data.task_id, label: t.title, sub: name, trackId: t.id });
      toast(POLL[kind].ico + ' ' + name + ' started for “' + t.title + '”');
      refreshCredits().catch(() => {});
    } catch (e) {
      toast(e.message, { error: true });
    }
  }

  function formDialog(title, specs, preset, okLabel, submit) {
    const box = el('div');
    const f = buildFields(box, specs, preset);
    openDialog({
      title, body: box, okLabel,
      onSubmit: async () => {
        const err = f.validate();
        if (err) throw new Error(err);
        await submit(f.values());
      }
    });
  }

  function extendDialog(t) {
    formDialog('➕ Extend “' + t.title + '”', [
      { name: 'continueAt', label: 'Continue from (seconds)', type: 'number', min: 1, step: 0.1, value: t.duration ? Math.max(1, Math.floor(t.duration - 1)) : '', hint: t.duration ? 'Song length: ' + fmtTime(t.duration) + '. Pick an earlier point to rewrite the ending.' : '' },
      { name: 'style', label: 'Style', max: 1000, value: t.tags || '' },
      { name: 'title', label: 'Title', max: 100, value: t.title || '' },
      { name: 'lyrics', label: 'Lyrics for the new part', type: 'textarea', max: 5000, rows: 5, placeholder: '[Verse 3]\n…' },
      { name: 'instrumental', label: 'Instrumental', type: 'toggle' },
      { name: 'vocalGender', label: 'Vocals', type: 'gender' },
      { name: 'model', label: 'Model', type: 'model' }
    ], {}, '➕ Extend', async (v) => {
      if (t.duration && v.continueAt != null && (v.continueAt <= 0 || v.continueAt >= t.duration)) throw new Error('“Continue from” must be between 0 and ' + Math.floor(t.duration) + ' seconds.');
      const body = clean({ ...v, audioId: t.id, taskId: t.taskId, callBackUrl: callbackUrl() });
      if (body.instrumental) delete body.vocalGender;
      const j = await api('/api/v1/generate/extend', { method: 'POST', body });
      startJob({ kind: 'music', taskId: j.data.taskId, label: (v.title || t.title) + ' (extended)', sub: 'Extend · ' + modelName(v.model) });
      toast('➕ Extending “' + t.title + '”…');
      refreshCredits().catch(() => {});
    });
  }

  function replaceDialog(t) {
    const dur = t.duration || 0;
    formDialog('✂️ Replace a section', [
      { name: 'infillStartS', label: 'Start (seconds)', type: 'number', min: 0, step: 0.1, required: true, value: dur ? Math.floor(dur * 0.4) : 30 },
      { name: 'infillEndS', label: 'End (seconds)', type: 'number', min: 1, step: 0.1, required: true, value: dur ? Math.floor(dur * 0.4) + 15 : 45, hint: 'The section must be at least 10 seconds long' + (dur ? ' · song is ' + fmtTime(dur) : '') },
      { name: 'prompt', label: 'New lyrics for this section', type: 'textarea', rows: 3, required: true, max: 5000 },
      { name: 'fullLyrics', label: 'Full lyrics after the change', type: 'textarea', rows: 6, required: true, max: 5000, value: t.lyrics || '' },
      { name: 'tags', label: 'Style', required: true, max: 1000, value: t.tags || '' },
      { name: 'title', label: 'Title', required: true, max: 80, value: t.title || '' },
      { name: 'negativeTags', label: 'Exclude', max: 1000 }
    ], {}, '✂️ Replace', async (v) => {
      if (v.infillEndS - v.infillStartS < 10) throw new Error('The section must be at least 10 seconds long.');
      if (dur && v.infillEndS > dur) throw new Error('End is past the end of the song (' + fmtTime(dur) + ').');
      const body = clean({ ...v, taskId: t.taskId, audioId: t.id, callBackUrl: callbackUrl() });
      const j = await api('/api/v1/generate/replace-section', { method: 'POST', body });
      startJob({ kind: 'music', taskId: j.data.taskId, label: v.title + ' (edit)', sub: 'Replace section' });
      toast('✂️ Rewriting that section…');
      refreshCredits().catch(() => {});
    });
  }

  function stemsDialog(t) {
    formDialog('🎚️ Split “' + t.title + '”', [
      { name: 'type', label: 'Separation', type: 'select', options: [['separate_vocal', 'Vocals + instrumental (2 stems) — great for karaoke'], ['split_stem', 'Full split — drums, bass, guitar, keys… (up to 12 stems)']] }
    ], {}, '🎚️ Split', async (v) => {
      const j = await api('/api/v1/vocal-removal/generate', { method: 'POST', body: { taskId: t.taskId, audioId: t.id, type: v.type, callBackUrl: callbackUrl() } });
      startJob({ kind: 'stems', taskId: j.data.taskId, label: t.title, sub: 'Stem split', trackId: t.id });
      toast('🎚️ Splitting stems…');
      refreshCredits().catch(() => {});
    });
  }

  function videoDialog(t) {
    formDialog('🎬 Music video for “' + t.title + '”', [
      { name: 'author', label: 'Artist name', max: 50, placeholder: 'Angela A.' },
      { name: 'domainName', label: 'Watermark / brand', max: 50, placeholder: 'owlstudio.app' }
    ], {}, '🎬 Make video', async (v) => {
      const j = await api('/api/v1/mp4/generate', { method: 'POST', body: clean({ ...v, taskId: t.taskId, audioId: t.id, callBackUrl: callbackUrl() }) });
      startJob({ kind: 'video', taskId: j.data.taskId, label: t.title, sub: 'Music video', trackId: t.id });
      toast('🎬 Rendering your video…');
      refreshCredits().catch(() => {});
    });
  }

  function personaDialog(t) {
    const d = t.duration || 60;
    formDialog('🧑‍🎤 Create a persona', [
      { name: 'name', label: 'Persona name', required: true, max: 80, placeholder: 'Midnight Angela' },
      { name: 'description', label: 'Describe the voice & style', type: 'textarea', rows: 3, required: true, placeholder: 'Warm, breathy female pop vocal with a soulful edge' },
      { name: 'vocalStart', label: 'Vocal sample start (s)', type: 'number', min: 0, step: 0.1, value: Math.min(20, Math.max(0, Math.floor(d / 4))) },
      { name: 'vocalEnd', label: 'Vocal sample end (s)', type: 'number', min: 1, step: 0.1, value: Math.min(d, Math.min(20, Math.max(0, Math.floor(d / 4))) + 25), hint: 'Pick 10–30 seconds where the vocals are clear' },
      { name: 'style', label: 'Style (optional)', max: 1000, value: t.tags || '' }
    ], {}, '🧑‍🎤 Create persona', async (v) => {
      const len = (v.vocalEnd ?? 30) - (v.vocalStart ?? 0);
      if (len < 10 || len > 30) throw new Error('The vocal sample must be 10–30 seconds long.');
      const j = await api('/api/v1/generate/generate-persona', { method: 'POST', body: clean({ ...v, taskId: t.taskId, audioId: t.id }) });
      const id = j.data && j.data.personaId;
      if (!id) throw new Error('No persona ID came back.');
      personas = [{ id, name: v.name }, ...personas.filter((p) => p.id !== id)];
      store.set('personas', personas);
      t.extras.persona = id;
      saveLibrary();
      renderPersonas();
      renderLibrary();
      toast('🧑‍🎤 Persona “' + v.name + '” created! Use it in Custom → Fine-tune.', { action: 'Use it', onAction: () => { setMode('custom'); $('#c-persona').value = id; $('#finetune').open = true; go('create'); } });
    });
  }

  function showDetails(t) {
    const body = el('div', null,
      t.image ? el('img', { src: t.image, alt: '', style: 'width:120px;border-radius:12px;margin-bottom:12px' }) : null,
      el('dl', { class: 'kv' },
        el('dt', { text: 'Style' }), el('dd', { text: t.tags || '—' }),
        el('dt', { text: 'Length' }), el('dd', { text: t.duration ? fmtTime(t.duration) : '—' }),
        el('dt', { text: 'Model' }), el('dd', { text: t.model || '—' }),
        el('dt', { text: 'Task ID' }), el('dd', { text: t.taskId }),
        el('dt', { text: 'Audio ID' }), el('dd', { text: t.id })),
      el('h3', { text: 'Lyrics', style: 'margin-top:16px' }),
      el('div', { class: 'lyrics-view', text: t.lyrics || 'No lyrics (instrumental).' }),
      t.lyrics ? el('div', { class: 'row gap', style: 'margin-top:10px' },
        el('button', { type: 'button', class: 'ghost small', text: '📋 Copy lyrics', onclick: () => copy(t.lyrics) }),
        el('button', { type: 'button', class: 'ghost small', text: '🎵 Reuse in a new song', onclick: () => { closeDialog(); useLyrics({ title: t.title, text: t.lyrics }); } })) : null);
    openDialog({ title: t.title || 'Details', body, hideOk: true });
  }
  function showStems(stems, title) {
    const body = el('div', { class: 'stems' }, (stems || []).map((s) =>
      el('div', { class: 'stem' },
        el('div', { class: 'stem-head' }, el('span', { text: s.ico + ' ' + s.name }), el('a', { href: s.url, target: '_blank', rel: 'noopener', class: 'link', text: '⬇ Download' })),
        el('audio', { controls: true, preload: 'none', src: s.url }))));
    openDialog({ title: '🎚️ Stems — ' + (title || ''), body, hideOk: true });
  }
  function showVideo(url, t) {
    const body = el('div', null, el('video', { src: url, controls: true, playsinline: true, poster: t && t.image }),
      el('p', { style: 'margin-top:10px' }, el('a', { href: url, target: '_blank', rel: 'noopener', text: '⬇ Download MP4' })));
    audio.pause();
    openDialog({ title: '🎬 ' + ((t && t.title) || 'Music video'), body, hideOk: true });
  }
  function showCovers(images, t) {
    const body = el('div', null,
      el('p', { class: 'muted', text: 'Tap an image to use it as this song’s cover in your library.' }),
      el('div', { class: 'covers' }, images.map((src) => el('button', { type: 'button', style: 'border:0;padding:0;background:none', 'aria-label': 'Use this cover', onclick: () => {
        if (t) { t.image = src; saveLibrary(); renderLibrary(); updatePlayerMeta(); toast('Cover updated.'); }
      } }, el('img', { src, alt: 'Cover option' })))),
      el('p', { class: 'hint' }, 'Right-click / long-press an image to save it.'));
    openDialog({ title: '🖼️ New cover art', body, hideOk: true });
  }

  // ================= Player & karaoke =================
  const audio = $('#audio');
  const player = $('#player');
  let current = null;
  let karaokeOn = false;
  const alignedCache = new Map();
  let words = [];

  function setPlayerHeight() {
    document.documentElement.style.setProperty('--player-h', player.hidden ? '0px' : player.offsetHeight + 'px');
  }
  window.addEventListener('resize', setPlayerHeight);

  function playTrack(id, karaoke) {
    const t = library.find((x) => x.id === id);
    if (!t) return;
    const src = t.audio || t.stream;
    if (!src) return toast('This song is still generating — hang tight!');
    current = t;
    audio.src = src;
    audio.play().catch(() => {});
    player.hidden = false;
    updatePlayerMeta();
    setPlayerHeight();
    if (karaoke) setKaraoke(true);
    else if (karaokeOn) loadKaraoke();
    updatePlayingUI();
  }
  function updatePlayerMeta() {
    if (!current) return;
    $('#p-title').textContent = current.title || 'Untitled';
    $('#p-sub').textContent = current.tags || '';
    const art = $('#p-art');
    if (current.image) art.src = current.image; else art.removeAttribute('src');
  }
  function togglePlay() {
    if (!current) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  }
  function step(dir) {
    const list = visibleTracks().filter((t) => t.audio || t.stream);
    if (!list.length) return;
    const i = current ? list.findIndex((t) => t.id === current.id) : -1;
    playTrack(list[(i + dir + list.length) % list.length].id);
  }
  $('#p-play').addEventListener('click', togglePlay);
  $('#p-prev').addEventListener('click', () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1)));
  $('#p-next').addEventListener('click', () => step(1));
  audio.addEventListener('play', () => { $('#p-play').textContent = '❚❚'; $('#p-play').setAttribute('aria-label', 'Pause'); updatePlayingUI(); });
  audio.addEventListener('pause', () => { $('#p-play').textContent = '▶'; $('#p-play').setAttribute('aria-label', 'Play'); updatePlayingUI(); });
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('loadedmetadata', () => { $('#p-dur').textContent = fmtTime(audio.duration); });
  audio.addEventListener('error', () => { if (current) toast('Could not play this audio. The file may have expired (Suno keeps files for 14 days).', { error: true }); });
  const bar = $('#p-bar');
  let seeking = false;
  bar.addEventListener('input', () => { seeking = true; $('#p-cur').textContent = fmtTime((bar.value / 100) * audio.duration); });
  bar.addEventListener('change', () => { if (isFinite(audio.duration)) audio.currentTime = (bar.value / 100) * audio.duration; seeking = false; });
  audio.addEventListener('timeupdate', () => {
    if (!seeking && isFinite(audio.duration)) {
      bar.value = (audio.currentTime / audio.duration) * 100;
      $('#p-cur').textContent = fmtTime(audio.currentTime);
    }
    if (karaokeOn) syncKaraoke();
  });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || player.hidden || e.target.closest('input, textarea, select, button, [contenteditable], dialog')) return;
    e.preventDefault();
    togglePlay();
  });

  $('#p-lyrics').addEventListener('click', () => setKaraoke(!karaokeOn));
  function setKaraoke(on) {
    karaokeOn = on;
    $('#p-lyrics').setAttribute('aria-pressed', String(on));
    $('#karaoke').hidden = !on;
    if (on) loadKaraoke(); else setPlayerHeight();
  }
  async function loadKaraoke() {
    const box = $('#karaoke');
    const t = current;
    if (!t) return;
    words = [];
    box.textContent = '🎤 Loading synced lyrics…';
    setPlayerHeight();
    let aligned;
    try {
      if (!alignedCache.has(t.id)) {
        alignedCache.set(t.id, api('/api/v1/generate/get-timestamped-lyrics', { method: 'POST', body: { taskId: t.taskId, audioId: t.id } })
          .then((j) => (j.data && j.data.alignedWords) || [])
          .catch((e) => { alignedCache.delete(t.id); throw e; }));
      }
      aligned = await alignedCache.get(t.id);
    } catch (e) {
      if (current === t) box.textContent = t.lyrics ? '' : 'Synced lyrics are not available for this track.';
      if (current === t && t.lyrics) box.append(el('div', { class: 'lyrics-view', style: 'max-height:24vh;text-align:left', text: t.lyrics }));
      setPlayerHeight();
      return;
    }
    if (current !== t) return;
    box.replaceChildren();
    for (const w of aligned) {
      const txt = String(w.word || '').replace(/\[[^\]]*\]/g, '');
      if (!txt.trim()) continue;
      const parts = txt.split('\n');
      parts.forEach((p, i) => {
        if (i > 0) box.append(el('br'));
        if (p.trim()) {
          const span = el('span', { class: 'w', text: p + ' ' });
          box.append(span);
          words.push({ s: w.startS, e: w.endS, n: span });
        }
      });
    }
    if (!words.length) box.textContent = t.lyrics ? 'Synced lyrics are not available — this looks like an instrumental.' : 'No lyrics in this track — enjoy the vibes 🎶';
    setPlayerHeight();
    syncKaraoke();
  }
  function syncKaraoke() {
    if (!words.length) return;
    const now = audio.currentTime;
    let active = null;
    for (const w of words) {
      const on = w.s <= now;
      w.n.classList.toggle('on', on);
      const isNow = on && now <= w.e + 0.15;
      w.n.classList.toggle('now', isNow);
      if (on) active = w.n;
    }
    if (active) {
      const box = $('#karaoke');
      const target = active.offsetTop - box.offsetTop - box.clientHeight / 2 + active.offsetHeight;
      if (Math.abs(box.scrollTop - target) > 8) box.scrollTop = target;
    }
  }

  // ================= Init =================
  function init() {
    renderModels();
    renderChips();
    renderPersonas();
    refForm = buildFields($('#ref-fields'), [
      { type: 'upload', name: 'image', label: 'Image', accept: 'image/jpeg,image/png,image/webp,image/bmp', hint: 'JPEG, PNG, WebP or BMP · up to 10 MB' },
      { type: 'upload', name: 'audio', label: 'Audio clip', accept: 'audio/*', hint: '6 seconds to 30 minutes' },
      { type: 'upload', name: 'video', label: 'Video', accept: 'video/mp4,video/quicktime,video/webm', hint: 'MP4, MOV or WebM · up to 241 seconds' }
    ]);
    renderRemixTools();
    selectRemix('cover');
    renderSounds();
    setMode('simple');
    updateCreateUI();
    $('#lib-count').textContent = library.length;
    renderLyrics();

    const saved = loadKey();
    if (saved) {
      apiKey = saved;
      unlock(false);
      refreshCredits().catch((e) => { if (e.code !== 401) toast(e.message, { error: true }); });
    } else {
      keyInput.focus();
    }
  }
  init();
})();
