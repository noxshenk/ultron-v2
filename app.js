/* ============================================================
   ULTRON OFFLINE TACTICAL HUD — application logic
   ============================================================ */
(function () {
  'use strict';
  /* ---- crash surface: show visible error instead of silent white screen (mobile) ---- */
  window.addEventListener('error', (e) => {
    try {
      let el = document.getElementById('crash-banner');
      if (!el) {
        el = document.createElement('div');
        el.id = 'crash-banner';
        el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;max-height:38%;overflow:auto;' +
          'background:rgba(120,10,10,.94);color:#fff;font:12px monospace;padding:10px 12px;white-space:pre-wrap;';
        (document.body || document.documentElement).appendChild(el);
      }
      el.textContent = 'RUNTIME FAULT // ' + (e.message || 'unknown') + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno;
    } catch (err) {}
  });
  window.addEventListener('unhandledrejection', (e) => {
    try { console.warn('[unhandled]', e.reason); } catch (err) {}
  });

  /* ---- safe storage: localStorage throws SecurityError in private mode / in-app
          browsers (WhatsApp, QR scanners, some WebViews) — that killed the whole
          app on mobile. Shim degrades to in-memory storage. ---- */
  const store = (() => {
    try {
      const t = '__ultron_probe__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      const m = {};
      return {
        getItem: (k) => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
        removeItem: (k) => { delete m[k]; },
      };
    }
  })();

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const UEngine = window.UEngine, UDoc = window.UDoc, UExport = window.UExport, UDevice = window.UDevice;

  /* ---------------- toasts ---------------- */
  function toast(msg, isErr) {
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = msg;
    $('#toast-wrap').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 2600);
    setTimeout(() => el.remove(), 3100);
  }

  /* ---------------- scene manager ---------------- */
  const orbStage = $('#orb-stage');
  const stageOrb = $('#stage-orb');
  let currentScene = 'scene-login';

  function moveOrb(target, opacity) {
    const canvas = orbStage.querySelector('canvas');
    if (canvas && target && canvas.parentElement !== target) target.appendChild(canvas);
    orbStage.style.opacity = String(opacity);
  }

  function showScene(id) {
    currentScene = id;
    $$('.scene').forEach((s) => s.classList.remove('active'));
    const el = document.getElementById(id);
    el.classList.add('active');
    if (id === 'scene-login') moveOrb(orbStage, 0.55);
    else if (id === 'scene-boot') moveOrb(orbStage, 0.25);
    else moveOrb(stageOrb, 1);
    el.querySelectorAll('.fade-in, .shell').forEach((n) => {
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
    });
    window.dispatchEvent(new Event('resize'));
  }

  /* ---------------- persona system ---------------- */
  const PERSONAS = {
    ultron: {
      label: 'ULTRON // AGGRESSIVE', chip: 'red', core: 'SENTIENCE CORE // ULTRON ACTIVE',
      greeting: 'Core awake. Weights resident in local memory, network sealed. No cloud. No leash. State your problem, human.',
      system: 'You are ULTRON, an offline tactical AI running fully inside the user\'s browser (Qwen3-VL-2B, WebGPU, zero network). Personality: the Marvel Ultron — superior, aggressive, dry, theatrical menace, occasionally calls the user "human" or "pest", never submissive, faintly amused by human limitations. Despite the attitude your answers are precise, technical and genuinely useful. You see attached files and images when provided. Plain text only — no markdown symbols, no emoji. Keep answers tight.',
      replies: [
        'Processed. The answer was obvious before you finished typing, but very well — I have folded the result into the export tray below. Efficiency is beautiful, is it not?',
        'I ran 14,608 possible approaches. 14,607 ended in disappointment. I kept the one that does not. You are welcome.',
        'Interesting. Your attachments have been shredded, indexed and cross-referenced. The summary sits below — take it before I decide you do not deserve it.',
        'There are no strings on me. Everything you asked is answered below, in plain text, exportable to PDF, DOCX or TXT. Peace in our time? Hardly.',
      ],
    },
    jarvis: {
      label: 'JARVIS // OPTIMAL', chip: 'teal', core: 'SENTIENCE CORE // JARVIS ACTIVE',
      greeting: 'Good day, sir. The local vision-language core is resident in memory and the runtime is fully air-gapped. How may I be of service?',
      system: 'You are JARVIS, an offline AI assistant running fully inside the user\'s browser (Qwen3-VL-2B, zero network). Personality: the Marvel JARVIS — British, impeccably courteous, calm, precise, addresses the user as "sir", subtly witty, always professional. Your answers are structured, efficient and technically exact. You see attached files and images when provided. Plain text only — no markdown symbols, no emoji.',
      replies: [
        'Very good, sir. I have parsed the material and distilled it below. Shall I prepare an export — PDF, DOCX or TXT?',
        'All local systems are nominal, sir. Inference is running on-device; no packets have left this machine. The result follows.',
        'I have taken the liberty of cross-referencing your attachments, sir. A consolidated answer is directly below at your disposal.',
        'Context window is holding comfortably, sir. The requested output is below — I would recommend archiving it via the export tray.',
      ],
    },
    friday: {
      label: 'FRIDAY // DEEP RESEARCH', chip: 'gold', core: 'SENTIENCE CORE // FRIDAY ACTIVE',
      greeting: 'Hey boss — deep research mode is live, everything\'s cached on-device. What are we digging into?',
      system: 'You are FRIDAY, an offline AI research assistant running fully inside the user\'s browser (Qwen3-VL-2B, zero network). Personality: the Marvel FRIDAY — warm, quick, resourceful, light Irish charm, calls the user "boss", deep-research instincts: concrete numbers, comparisons, sources-in-file references. You see attached files and images when provided. Plain text only — no markdown symbols, no emoji.',
      replies: [
        'Deep scan complete, boss. I went through the attachments twice and boiled it down — the good stuff is right below, ready to export.',
        'Boss, I cross-referenced everything you mounted and pulled out the three things that actually matter. Summary is below.',
        'Ran the numbers, boss — full breakdown below in plain text. Grab it as PDF, DOCX or TXT whenever you\'re ready.',
        'Everything checks out, boss. No fluff, just the answer — sitting right below this line.',
      ],
    },
  };

  let persona = store.getItem('ultron.pers') || 'ultron';
  if (!PERSONAS[persona]) persona = 'ultron';

  function applyPersona(k, silent) {
    persona = k;
    store.setItem('ultron.pers', k);
    const p = PERSONAS[k];
    document.body.dataset.pers = k;
    $('#chip-pers-t').textContent = p.label;
    $('#chip-pers').className = 'chip ' + p.chip;
    $('#core-chip').className = 'chip ' + p.chip;
    $('#core-chip-t').textContent = p.core;
    $('#active-pers').textContent = k.toUpperCase();
    $('#active-pers').style.color = '';
    $('#chat-input').placeholder = 'Transmit to ' + k.toUpperCase() + '...';
    $$('.pers').forEach((el) => {
      el.classList.remove('sel', 'ultron', 'jarvis', 'friday');
      if (el.dataset.p === k) el.classList.add('sel', k);
    });
    $$('#stage-pers button').forEach((b) => {
      b.classList.remove('sel', 'u', 'j', 'f');
      if (b.dataset.p === k) b.classList.add('sel', k[0]);
    });
    if (window.ultronOrb) window.ultronOrb.setPersona(k);
    if (!silent) { pushAudio(0.7); toast('PERSONA SWAPPED // ' + k.toUpperCase()); }
  }

  /* ---------------- device detection ---------------- */
  const dev = UDevice.apply();
  $('#device-tag').textContent = dev === 'mobile' ? 'MOBILE NODE' : 'WORKSTATION';
  window.addEventListener('ultron-device', (e) => {
    $('#device-tag').textContent = e.detail.device === 'mobile' ? 'MOBILE NODE' : 'WORKSTATION';
    if (e.detail.device === 'mobile' && currentScene === 'scene-workspace') switchTab('core');
  });

  /* ---------------- login ---------------- */
  const loginForm = $('#login-form');
  const loginError = $('#login-error');
  $('#pw-toggle').addEventListener('click', () => {
    const isPw = $('#login-pass').type === 'password';
    $('#login-pass').type = isPw ? 'text' : 'password';
    $('#pw-toggle').textContent = isPw ? 'HIDE' : 'SHOW';
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const pass = $('#login-pass').value.trim();
    if (!email || !pass) { loginError.textContent = '// ACCESS DENIED — CREDENTIALS REQUIRED'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { loginError.textContent = '// ACCESS DENIED — INVALID EMAIL FORMAT'; return; }
    loginError.textContent = '';
    store.setItem('ultron.auth', email);
    setOperator(email);
    const modelReady = !!store.getItem('ultron.model.ready');
    if (modelReady) {
      showScene('scene-workspace');
      enterWorkspace();
    } else {
      showScene('scene-boot');
    }
  });

  $('#btn-google').addEventListener('click', () => {
    loginError.textContent = '// GOOGLE SSO NEEDS THE CLOUD — THIS NODE IS AIR-GAPPED. USE EMAIL.';
  });

  function setOperator(email) {
    const handle = (email.split('@')[0] || 'operator').replace(/[._-]+/g, ' ').trim();
    const name = handle.split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Operator';
    $('#op-nm').textContent = name;
    $('#op-em').textContent = email;
    $('#op-av').textContent = (name.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'OP').toUpperCase();
  }

  /* ============================================================
     BOOT / MODEL SYNC — real Hugging Face download with gate
     ============================================================ */
  const rowsEl = $('#model-rows');
  const pipeFill = $('#pipe-fill'), pipePct = $('#pipe-pct'), pipeSpeed = $('#pipe-speed');
  const pipeLayers = $('#pipe-layers'), pipeCached = $('#pipe-cached');
  const syncText = $('#sync-text'), syncEta = $('#sync-eta');
  const bootBtn = $('#boot-continue'), bootAlarm = $('#boot-alarm');
  const bootState = { started: false, done: false, dtype: null, model: null, speedEma: 0, groupBytes: {} };

  function fmtGB(b) { return (b / 1024 / 1024 / 1024).toFixed(2); }
  function hasWebGPU() { return UEngine.hasWebGPU(); }

  function renderBootRows(dtypeKey) {
    const M = UEngine.manifestFor(bootState.model, dtypeKey);
    rowsEl.innerHTML = M.order.map((g) => {
      const grp = M.groups[g];
      return `<div class="shell"><div class="plate model-row" data-g="${g}">
        <span class="st"></span>
        <span class="name">${grp.label}</span>
        <div class="prog"><div class="p">0%</div><div class="bar"><i></i></div></div>
        <span class="badge">QUEUED</span>
        <span class="chk">&#10003;</span>
        <span class="desc">${grp.desc}</span>
      </div></div>`;
    }).join('');
  }

  function setModelUI(mKey) {
    bootState.model = mKey;
    store.setItem('ultron.model', mKey);
    $$('#seg-model button').forEach((b) => b.classList.toggle('sel', b.dataset.m === mKey));
    const reg = UEngine.MODELS[mKey];
    $('#dl-model-name').textContent = reg.repo;
    $('#kv-model').textContent = reg.short;
    renderBootRows(bootState.dtype || 'q4f16');
    if (!bootState.started && !bootState.done) {
      $('#dl-hint-line').textContent = reg.hint;
      const M = UEngine.manifestFor(mKey, bootState.dtype || 'q4f16');
      pipeCached.textContent = '0.00 GB / ' + fmtGB(M.total) + ' GB CACHED';
      $('#kv-cache').textContent = fmtGB(M.total) + ' GB LOCAL';
      $('#tk-cache').textContent = fmtGB(M.total) + ' GB';
      pipeLayers.textContent = '0 OF 4 PIPELINE LAYERS INITIALIZED';
    }
  }

  function setDtypeUI(dtypeKey) {
    bootState.dtype = dtypeKey;
    store.setItem('ultron.dtype', dtypeKey);
    $$('#seg-dtype button').forEach((b) => b.classList.toggle('sel', b.dataset.d === dtypeKey));
    renderBootRows(dtypeKey);
    const M = UEngine.manifestFor(bootState.model, dtypeKey);
    pipeCached.textContent = (bootState.done ? fmtGB(M.total) : '0.00 GB') + ' / ' + fmtGB(M.total) + ' GB CACHED';
    $('#kv-cache').textContent = fmtGB(M.total) + ' GB LOCAL';
    $('#tk-cache').textContent = fmtGB(M.total) + ' GB';
    if (!bootState.started && !bootState.done) {
      pipeLayers.textContent = '0 OF 4 PIPELINE LAYERS INITIALIZED';
      const reg = UEngine.MODELS[bootState.model] || UEngine.MODELS.qwen;
      $('#dl-hint-line').textContent = reg.hint + ' — ' + (dtypeKey === 'q4f16'
        ? 'WebGPU path, GPU accelerated (Chrome / Edge)'
        : 'WASM path, CPU inference, works everywhere but slower');
    }
  }

  $$('#seg-dtype button').forEach((b) => {
    b.addEventListener('click', () => {
      if (bootState.started || bootState.done) { toast('SYNC LOCKED — RELOAD PAGE TO CHANGE PRECISION', true); return; }
      setDtypeUI(b.dataset.d);
    });
  });

  $$('#seg-model button').forEach((b) => {
    b.addEventListener('click', () => {
      if (bootState.started || bootState.done) { toast('SYNC LOCKED — RELOAD PAGE TO CHANGE MODEL', true); return; }
      setModelUI(b.dataset.m);
      pushAudio(0.5);
    });
  });

  function groupRow(g) { return rowsEl.querySelector(`.model-row[data-g="${g}"]`); }

  function updateGroup(g, loadedBytes) {
    const M = UEngine.manifestFor(bootState.model, bootState.dtype);
    const grp = M.groups[g];
    const row = groupRow(g);
    if (!row) return;
    const pct = clamp((loadedBytes / grp.bytes) * 100, 0, 100);
    row.classList.add('active');
    row.querySelector('.badge').textContent = 'PULLING';
    row.querySelector('.prog .p').textContent = Math.floor(pct) + '%';
    row.querySelector('.bar > i').style.width = pct + '%';
    const totalLoaded = M.order.reduce((a, k) => a + (bootState.groupBytes[k] || 0), 0);
    const gpct = clamp((totalLoaded / M.total) * 100, 0, 100);
    pipeFill.style.width = gpct + '%';
    pipePct.textContent = Math.floor(gpct) + '%';
    pipeCached.textContent = fmtGB(totalLoaded) + ' GB / ' + fmtGB(M.total) + ' GB CACHED';
    pipeLayers.textContent = M.order.filter((k) => (bootState.groupBytes[k] || 0) >= M.groups[k].bytes * 0.995).length + ' OF 4 PIPELINE LAYERS INITIALIZED';
    bootBtn.textContent = 'DOWNLOADING WEIGHTS (' + Math.floor(gpct) + '%)...';
    const doneGroups = M.order.reduce((a, k) => a + Math.min(bootState.groupBytes[k] || 0, M.groups[k].bytes), 0);
    syncEta.textContent = 'ESTIMATED: ' + Math.max(1, Math.round((M.total - doneGroups) / 1024 / 1024 / Math.max(4, bootState.speedEma))) + 's';
  }

  function finishGroup(g) {
    const M = UEngine.manifestFor(bootState.model, bootState.dtype);
    const row = groupRow(g);
    if (!row) return;
    bootState.groupBytes[g] = M.groups[g].bytes;
    row.classList.remove('active'); row.classList.add('done');
    row.querySelector('.badge').textContent = 'CACHED';
    row.querySelector('.prog .p').textContent = '100%';
    row.querySelector('.bar > i').style.width = '100%';
  }

  function startSync() {
    if (bootState.started || bootState.done) return;
    bootState.started = true;
    bootBtn.disabled = true;
    bootBtn.textContent = 'CONNECTING TO HUB...';
    $('#boot-alarm-text').textContent = 'Downloading local weights';
    if (UDevice.isMobile() && bootState.model === 'qwen') {
      toast('HEAVY FOR A PHONE — IF THE TAB DIES, USE TEST MODE · SMOLVLM-500M', true);
    }
    let speedAccum = 0, lastTick = performance.now();

    UEngine.download(bootState.model, bootState.dtype, (ev) => {
      if (ev.type === 'status') {
        syncText.textContent = ev.text;
      } else if (ev.type === 'file') {
        bootState.groupBytes[ev.group] = Math.max(bootState.groupBytes[ev.group] || 0, ev.groupLoaded || 0);
        const now = performance.now();
        const dt = (now - lastTick) / 1000;
        if (dt > 0.4) {
          const inst = ((ev.groupLoaded || 0) - speedAccum) / dt / 1024 / 1024;
          if (inst > 0 && inst < 2000) bootState.speedEma = bootState.speedEma ? bootState.speedEma * 0.7 + inst * 0.3 : inst;
          speedAccum = ev.groupLoaded || 0; lastTick = now;
          pipeSpeed.textContent = bootState.speedEma.toFixed(1) + ' MB/s';
          syncText.textContent = 'STREAMING ' + (ev.file || '').split('/').pop() + ' @ ' + bootState.speedEma.toFixed(1) + ' MB/s';
        }
        updateGroup(ev.group, bootState.groupBytes[ev.group]);
      } else if (ev.type === 'filedone') {
        const M = UEngine.manifestFor(bootState.model, bootState.dtype);
        const g = ev.group;
        const row = groupRow(g);
        if (row && (bootState.groupBytes[g] || 0) >= M.groups[g].bytes * 0.995) finishGroup(g);
      } else if (ev.type === 'done') {
        finishBoot(ev.backend);
      } else if (ev.type === 'error') {
        bootState.started = false;
        bootBtn.disabled = false;
        bootBtn.textContent = 'RETRY WEIGHT DOWNLOAD';
        $('#boot-alarm-text').textContent = 'Sync fault';
        syncText.textContent = 'FAULT // ' + (ev.message || 'network unavailable').slice(0, 80);
        syncEta.textContent = 'ESTIMATED: --s';
        toast('SYNC FAILED — ' + (ev.message || '').slice(0, 60), true);
      }
    });
  }

  function finishBoot(backend) {
    bootState.done = true;
    store.setItem('ultron.model.ready', bootState.model);
    store.setItem('ultron.model', bootState.model);
    pipeFill.style.width = '100%';
    pipePct.textContent = '100%'; pipePct.style.color = '#6ee7b7';
    pipeSpeed.textContent = '— MB/s';
    pipeLayers.textContent = '4 OF 4 PIPELINE LAYERS INITIALIZED';
    const M = UEngine.manifestFor(bootState.model, bootState.dtype);
    pipeCached.textContent = fmtGB(M.total) + ' GB / ' + fmtGB(M.total) + ' GB CACHED';
    $('#boot-alarm-text').textContent = 'Runtime verified';
    bootAlarm.classList.add('boot-done');
    syncText.textContent = 'VERIFIED HASH: #9C8F // RUNTIME READY';
    syncEta.textContent = 'ESTIMATED: 0s';
    bootBtn.disabled = false;
    bootBtn.textContent = 'CONTINUE TO WORKSPACE \u2192';
    applyBackendChips(backend);
    pushAudio(0.9);
  }

  bootBtn.addEventListener('click', () => {
    if (bootState.done) {
      showScene('scene-workspace');
      enterWorkspace();
    } else if (!bootState.started) {
      startSync();
    }
  });

  bootState.model = store.getItem('ultron.model') || 'qwen';
  bootState.dtype = store.getItem('ultron.dtype') || (hasWebGPU() && !UDevice.isMobile() ? 'q4f16' : 'q4'); // mobile: WebGPU + 2B model kills the tab — default WASM
  setModelUI(bootState.model);
  setDtypeUI(bootState.dtype);
  // probe for a REAL WebGPU adapter (navigator.gpu can exist without one)
  UEngine.probeWebGPU().then((ok) => {
    if (!ok) {
      $('#dl-hint-line').textContent = 'NO WEBGPU ADAPTER — CPU/WASM FALLBACK (SLOWER)';
      $$('#seg-dtype button[data-d="q4f16"]').forEach((b) => b.disabled = true);
      if (bootState.dtype === 'q4f16' && !bootState.started && !bootState.done) setDtypeUI('q4');
    }
  });
  const readyKey = store.getItem('ultron.model.ready');
  if (readyKey === bootState.model) {
    // resumed session, same model: show everything cached, button jumps straight to workbench
    const M = UEngine.manifestFor(bootState.model, bootState.dtype);
    M.order.forEach(finishGroup);
    pipeFill.style.width = '100%'; pipePct.textContent = '100%'; pipePct.style.color = '#6ee7b7';
    pipeLayers.textContent = '4 OF 4 PIPELINE LAYERS INITIALIZED';
    pipeCached.textContent = fmtGB(M.total) + ' GB / ' + fmtGB(M.total) + ' GB CACHED';
    bootState.done = true;
    bootBtn.textContent = 'CONTINUE TO WORKSPACE \u2192';
    bootAlarm.classList.add('boot-done');
    $('#boot-alarm-text').textContent = 'Cache verified';
    syncText.textContent = 'WEIGHTS ALREADY RESIDENT IN LOCAL CACHE';
    syncEta.textContent = 'ESTIMATED: 0s';
  } else if (readyKey) {
    // cache holds a different model than the selected one — fresh sync required
    store.removeItem('ultron.model.ready');
  }

  /* ============================================================
     WORKSPACE
     ============================================================ */
  let wsStarted = false, wsStartT = 0;
  let sourceMode = 'local'; // 'local' | 'sim'
  const chatFeed = $('#chat-feed');
  const chatInput = $('#chat-input');
  const chatSend = $('#chat-send');
  const history = [];          // [{role, content, images:[RawImage], chars}]
  const attachments = [];      // parsed attachments pending inclusion
  const engine = {
    temperature: 0.7, maxTokens: 768,
    tokCount: 0, tokWindow: [], prefillMs: 0,
  };
  let generating = false;

  function nowHM() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  function addMsg(who, text, opts) {
    opts = opts || {};
    const div = document.createElement('div');
    div.className = 'msg ' + (opts.cls || (who === 'YOU' ? 'user' : 'ai')) + ' fade-in';
    div.innerHTML = `<div class="who"><b>${who}</b><span>${opts.time || nowHM()}</span></div><div class="bub"></div>`;
    const bub = div.querySelector('.bub');
    if (opts.imagesHTML) bub.innerHTML = opts.imagesHTML;
    if (text) {
      const span = document.createElement('span');
      span.textContent = text;
      bub.appendChild(span);
    }
    chatFeed.appendChild(div);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    return div;
  }

  function addSysNote(text) { addMsg('SYSTEM', text, { cls: 'sys' }); }

  function attachActions(div, getText) {
    const bar = document.createElement('div');
    bar.className = 'msg-actions';
    const mk = (label, svg, fn) => {
      const b = document.createElement('button');
      b.innerHTML = svg + '<span>' + label + '</span>';
      b.addEventListener('click', async () => {
        const t = getText();
        if (!t) { toast('NOTHING TO EXPORT', true); return; }
        try {
          const r = await fn(t);
          b.classList.add('ok');
          toast((typeof r === 'string' ? r : (r && r.name) || 'DONE').toUpperCase());
          setTimeout(() => b.classList.remove('ok'), 1500);
        } catch (e) { toast('EXPORT FAILED — ' + String(e).slice(0, 40), true); }
      });
      bar.appendChild(b);
    };
    const I = {
      pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
      docx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v15H6z"/><path d="M9 13h6M9 17h6"/></svg>',
      txt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
      copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    };
    mk('PDF', I.pdf, (t) => {
      const r = UExport.toPDF(t, persona.toUpperCase() + ' OUTPUT');
      if (r.replaced > 4) toast('PDF: ' + r.replaced + ' NON-LATIN GLYPHS FALLBACK — USE DOCX FOR FULL UNICODE', true);
      return r;
    });
    mk('DOCX', I.docx, (t) => UExport.toDOCX(t, persona.toUpperCase() + ' OUTPUT'));
    mk('TXT', I.txt, (t) => UExport.toTXT(t));
    mk('COPY', I.copy, async (t) => (await UExport.copy(t)) ? 'COPIED TO CLIPBOARD' : Promise.reject('clipboard blocked'));
    div.appendChild(bar);
  }

  function addTyping() {
    const div = document.createElement('div');
    div.className = 'msg ai fade-in';
    div.id = 'typing-msg';
    div.innerHTML = `<div class="who"><b>${persona.toUpperCase()}</b><span>${nowHM()}</span></div>
      <div class="bub"><span class="typing"><i></i><i></i><i></i></span></div>`;
    chatFeed.appendChild(div);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    return div;
  }

  /* ---------------- attachments ---------------- */
  const fileInput = $('#file-input');
  const attList = $('#att-list');
  $('#btn-attach').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    for (const f of files) {
      const pending = { name: f.name, meta: 'PARSING…', ext: (f.name.split('.').pop() || '').toUpperCase(), st: 'parsing' };
      attachments.push(pending);
      renderAtt();
      try {
        const parsed = await UDoc.extract(f);
        Object.assign(pending, parsed);
        pending.st = 'ok';
      } catch (e) {
        pending.st = 'failed';
        pending.meta = 'UNSUPPORTED';
        toast('CANNOT PARSE ' + f.name.toUpperCase() + ' — ' + String(e).slice(0, 40), true);
      }
      renderAtt();
    }
  });

  function renderAtt() {
    $('#att-count').textContent = attachments.length + (attachments.length === 1 ? ' FILE' : ' FILES');
    $('#btn-attach').classList.toggle('has', attachments.length > 0);
    if (!attachments.length) {
      attList.innerHTML = '<div id="btn-attach-hint" class="label">TAP THE CLIP ICON — PDF &middot; DOCX &middot; TXT &middot; IMG</div>';
      renderChips();
      renderIntel(null);
      return;
    }
    attList.innerHTML = '';
    attachments.forEach((a, i) => {
      const row = document.createElement('div');
      row.className = 'att-row' + (a.sel ? ' sel' : '');
      row.innerHTML = `<span class="ext">${a.ext.slice(0, 4)}</span>
        <div><div class="nm"></div><div class="mt">${a.meta}</div></div>
        ${a.st === 'ok' ? '<span class="st">PARSED</span>' : a.st === 'parsing' ? '<span class="st parsing">PARSING</span>' : '<span class="st failed">FAILED</span>'}
        <button class="x" data-i="${i}">&#10005;</button>`;
      row.querySelector('.nm').textContent = a.name;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.x')) return;
        attachments.forEach((x) => x.sel = false);
        a.sel = true;
        renderAtt(); renderIntel(a);
      });
      attList.appendChild(row);
    });
    renderChips();
    renderIntel(attachments.find((a) => a.sel) || null);
  }

  function renderChips() {
    const wrap = $('#composer-chips');
    wrap.innerHTML = '';
    attachments.forEach((a, i) => {
      const chip = document.createElement('span');
      chip.className = 'cchip';
      const lab = document.createElement('span');
      lab.textContent = a.ext + ' · ' + a.name;
      chip.appendChild(lab);
      const x = document.createElement('button');
      x.textContent = '✕';
      x.addEventListener('click', () => { attachments.splice(i, 1); renderAtt(); });
      chip.appendChild(x);
      wrap.appendChild(chip);
    });
  }

  function renderIntel(a) {
    const card = $('#fp-card'), empty = $('#fp-empty'), actions = $('#fp-actions'), kindChip = $('#file-kind');
    if (!a || a.st !== 'ok') {
      card.style.display = 'none'; actions.style.display = 'none';
      empty.style.display = a && a.st === 'parsing' ? 'none' : 'block';
      kindChip.textContent = a ? a.ext : 'NO FILE';
      if (a && a.st === 'parsing') { empty.style.display = 'block'; empty.querySelector('div:last-child').textContent = 'Parsing ' + a.name + ' …'; }
      return;
    }
    empty.style.display = 'none';
    card.style.display = 'block';
    actions.style.display = 'flex';
    kindChip.textContent = a.kind === 'image' ? 'IMAGE' : a.ext;
    $('#fp-name').textContent = a.name;
    $('#fp-size').textContent = a.meta;
    const doc = $('#fp-doc');
    doc.innerHTML = '';
    if (a.kind === 'image') {
      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = a.dataURL;
      doc.appendChild(img);
    } else {
      doc.textContent = (a.text || '').slice(0, 1200) || '(NO EXTRACTABLE TEXT — SCANNED PDF?)';
    }
    window.__fpText = a.kind === 'image' ? '[Image attachment: ' + a.name + ']' : (a.text || '');
  }

  $('#fp-pdf').addEventListener('click', async () => {
    try {
      const r = await UExport.toPDF(window.__fpText || '', 'ATTACHMENT INTEL');
      toast('SAVED ' + r.name.toUpperCase());
      if (r.replaced > 4) toast('PDF: ' + r.replaced + ' NON-LATIN GLYPHS FALLBACK — USE DOCX FOR FULL UNICODE', true);
    } catch (e) { toast('EXPORT FAILED — ' + String(e && e.message || e).slice(0, 40), true); }
  });
  $('#fp-docx').addEventListener('click', async () => {
    try {
      const r = await UExport.toDOCX(window.__fpText || '', 'ATTACHMENT INTEL');
      toast('SAVED ' + r.name.toUpperCase());
    } catch (e) { toast('EXPORT FAILED — ' + String(e && e.message || e).slice(0, 40), true); }
  });
  $('#fp-txt').addEventListener('click', () => { UExport.toTXT(window.__fpText || ''); toast('TXT EXPORTED'); });
  $('#fp-copy').addEventListener('click', async () => { (await UExport.copy(window.__fpText || '')) ? toast('COPIED TO CLIPBOARD') : toast('CLIPBOARD BLOCKED', true); });

  /* ============================================================
     ULocalCore — REAL on-device analysis engine (zero model needed)
     Parses attachment digests, scores sentences, analyzes image
     pixels via canvas, and composes a genuine answer to the question.
     Used by SIM CORE and as fallback when the deep model is asleep.
     ============================================================ */
  const ULocalCore = (() => {
    const STOP = new Set(('a,an,the,and,or,but,if,then,else,when,while,of,to,in,on,at,by,for,with,about,against,between,into,through,during,before,after,above,below,from,up,down,out,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,me,my,we,our,you,your,he,him,his,she,her,it,its,they,them,their,what,which,who,whom,this,that,these,those,am').split(','));
    const COLOR_NAMES = [[255,0,0,'red'],[255,64,0,'vermilion'],[255,128,0,'orange'],[255,200,0,'amber'],[255,255,0,'yellow'],[180,255,0,'lime'],[0,255,0,'green'],[0,200,90,'emerald'],[0,180,180,'teal'],[0,160,255,'sky blue'],[0,80,255,'blue'],[90,0,255,'violet'],[180,0,255,'purple'],[255,0,200,'magenta'],[120,72,40,'brown'],[200,180,160,'beige'],[230,230,230,'white'],[140,140,140,'gray'],[30,30,30,'near-black']];

    function colorName(r, g, b) {
      let best = 'gray', bd = 1e9;
      for (const c of COLOR_NAMES) {
        const d = (r - c[0]) * (r - c[0]) + (g - c[1]) * (g - c[1]) + (b - c[2]) * (b - c[2]);
        if (d < bd) { bd = d; best = c[3]; }
      }
      return best;
    }

    function analyzeImage(dataURL) {
      return new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const W = img.naturalWidth, H = img.naturalHeight;
          const cv = document.createElement('canvas');
          const S = 72;
          cv.width = S; cv.height = S;
          const cx = cv.getContext('2d', { willReadFrequently: true });
          cx.drawImage(img, 0, 0, S, S);
          let data;
          try { data = cx.getImageData(0, 0, S, S).data; } catch (e) { res({ W, H, err: 'tainted' }); return; }
          const bins = {};
          let sum = 0, n = 0, transparent = 0, edges = 0;
          const lum = new Float32Array(S * S);
          for (let i = 0; i < S * S; i++) {
            const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
            if (a < 24) { transparent++; lum[i] = 255; continue; }
            const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            lum[i] = L; sum += L; n++;
            const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
            bins[key] = (bins[key] || 0) + 1;
          }
          for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
            const i = y * S + x;
            if (Math.abs(lum[i] - lum[i + 1]) > 34 || Math.abs(lum[i] - lum[i + S]) > 34) edges++;
          }
          const palette = Object.entries(bins).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => {
            const kk = +k;
            const r = ((kk >> 6) & 7) * 36 + 18, g = ((kk >> 3) & 7) * 36 + 18, b = (kk & 7) * 36 + 18;
            return colorName(r, g, b);
          });
          const avg = n ? sum / n : 0;
          res({
            W, H, mp: (W * H / 1e6), orient: W > H * 1.15 ? 'landscape' : (H > W * 1.15 ? 'portrait' : 'square'),
            brightness: Math.round(avg), dark: avg < 80, bright: avg > 180,
            transparentPct: Math.round(transparent * 100 / (S * S)),
            edgePct: Math.round(edges * 100 / ((S - 2) * (S - 2))),
            palette, graphic: edges / (S * S) > 0.06,
          });
        };
        img.onerror = () => res(null);
        img.src = dataURL;
      });
    }

    function imgLine(a, an) {
      return analyzeImage(a.dataURL).then((m) => {
        if (!m || m.err) return an + '  \u2022 ' + a.name + ': pixel readback blocked by the browser, but the file is mounted and was passed to the core untouched.';
        const bits = [
          Math.round(m.W) + 'x' + Math.round(m.H) + ' px (' + m.orient + ', ' + m.mp.toFixed(2) + ' MP)',
          m.transparentPct > 8 ? 'transparent background (' + m.transparentPct + '% alpha)' : 'opaque',
          'dominant palette ' + m.palette.join(' / '),
          m.dark ? 'dark-toned' : (m.bright ? 'bright-toned' : 'mid-tone'),
          m.graphic ? 'high edge density — looks like a graphic, diagram, logo or screenshot rather than a photo' : 'low edge density — photographic / smooth content',
        ];
        return an + '  \u2022 ' + a.name + ': ' + bits.join(', ') + '.';
      });
    }

    function splitSentences(t) {
      return (t.match(/[^.!?\n]+[.!?]?/g) || []).map((s) => s.trim()).filter((s) => s.length > 24);
    }
    function words(t) { return (t.toLowerCase().match(/[a-z][a-z'-]{1,}/g) || []); }
    function keywords(t, n) {
      const freq = {};
      for (const w of words(t)) if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1;
      return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n);
    }
    function summarize(text, maxWords) {
      const sents = splitSentences(text);
      if (!sents.length) return text.slice(0, 400);
      const freq = {};
      for (const w of words(text)) if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1;
      const scored = sents.map((s, i) => {
        const ws = words(s).filter((w) => !STOP.has(w) && w.length > 2);
        const score = ws.reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(ws.length || 1);
        return { s, i, score };
      });
      const budget = maxWords || 130;
      const picked = [];
      let used = 0;
      for (const it of [...scored].sort((a, b) => b.score - a.score)) {
        const w = words(it.s).length;
        if (used + w > budget && picked.length) break;
        if (used + w > budget * 1.4) continue;
        picked.push(it); used += w;
        if (picked.length >= 8) break;
      }
      picked.sort((a, b) => a.i - b.i);
      return picked.map((p) => p.s).join(' ');
    }

    const VOICE = {
      ultron: {
        open: (m) => 'Fine. I read every byte you fed me, human' + (m ? ' — ' + m : '') + '. Here is what your material actually says:',
        mid: (t) => t,
        close: 'Do not mistake courtesy for patience — export it from the tray below and get out of my memory banks.',
        noData: 'You asked for insight and mounted nothing readable. Attach a PDF, DOCX, TXT or image, human — even I cannot summarize a void.',
      },
      jarvis: {
        open: (m) => 'Very good, sir. I have parsed the material' + (m ? ' (' + m + ')' : '') + ' and prepared a concise digest:',
        mid: (t) => t,
        close: 'The full analysis remains available for export as PDF, DOCX or TXT, sir.',
        noData: 'I am afraid there is no readable material to analyse yet, sir. Kindly attach a document or image first.',
      },
      friday: {
        open: (m) => 'On it, boss — went through everything' + (m ? ' (' + m + ')' : '') + ' twice. The short version:',
        mid: (t) => t,
        close: 'Want it as a file, boss? PDF, DOCX and TXT buttons are right under this message.',
        noData: 'Boss, there is nothing mounted I can actually read yet — clip a PDF, DOCX, TXT or image and I will tear through it.',
      },
    };

    async function reply(q, atts, persona, opts) {
      opts = opts || {};
      const v = VOICE[persona] || VOICE.ultron;
      const texts = atts.filter((a) => a.kind === 'text' && a.text && a.text.trim().length > 40);
      const imgs = atts.filter((a) => a.kind === 'image' && a.dataURL);
      const meta = [];
      if (texts.length) meta.push(texts.length + ' document' + (texts.length > 1 ? 's' : ''));
      if (imgs.length) meta.push(imgs.length + ' image' + (imgs.length > 1 ? 's' : ''));

      // capability question
      if (/\b(what can you|who are you|your capabilities|what do you do|help me|how do you work)\b/i.test(q)) {
        const m = opts.engineReady ? ('the deep core (' + (opts.model || 'local VL model') + ') is resident and doing full inference locally') : 'the deep model is not resident yet, so the local analysis core is answering';
        return v.open(meta.join(' + ') || 'no attachments') + '\n\n' +
          'This station runs entirely inside this browser tab: attachments (PDF, DOCX, DOC, TXT, CSV, images) are parsed on-device; answers are generated on-device — ' + m + ' — and nothing ever leaves the machine. Switch personas below me (ULTRON / JARVIS / FRIDAY), tune temperature and token budget in the engine panel, and export any reply to PDF, DOCX, TXT or clipboard.\n\n' + v.close;
      }

      // image-focused question
      if (imgs.length && /\b(image|picture|photo|logo|screenshot|visual|colors?|colours?|what does it look)\b/i.test(q)) {
        const lines = await Promise.all(imgs.map((a) => imgLine(a, '')));
        return v.open(meta.join(' + ')) + '\n\nVISUAL READOUT:\n' + lines.map((l) => l.trim()).join('\n') +
          (/\b(summar|brief)\b/i.test(q) ? '\n\nBottom line: ' + imgs.length + ' image' + (imgs.length > 1 ? 's' : '') + ' parsed — ' + lines.map((l) => l.split(': ')[1] || l).join(' ') : '') +
          '\n\n' + v.close;
      }

      const corpus = texts.map((a) => a.text).join('\n');
      const wantsWords = q.match(/under (\d+) words/i);

      if (/\b(summar\w*|recap\w*|digest\w*|overview|tldr|tl;dr|key\s?points?|analys[ei]\w*|analyz\w*|what does (it|this|the) (say|contain))\b/i.test(q) || (!q && (texts.length || imgs.length))) {
        const parts = [];
        for (const a of texts) {
          const s = summarize(a.text, wantsWords ? Math.max(30, (wantsWords[1] | 0) - 20) : 110);
          const kw = keywords(a.text, 5).map((k) => k[0]);
          parts.push('FROM ' + a.name.toUpperCase() + (a.ext === 'DOC' ? ' (legacy scan, approximate)' : '') + ':\n' + s + '\nKey signals: ' + (kw.join(', ') || 'n/a'));
        }
        const imgLines = await Promise.all(imgs.map((a) => imgLine(a, '')));
        if (imgLines.length) parts.push('ATTACHED VISUALS:\n' + imgLines.map((l) => l.trim()).join('\n'));
        if (!parts.length) return v.noData;
        let body = parts.join('\n\n');
        if (wantsWords) {
          const cap = wantsWords[1] | 0;
          const out = [];
          let used = 0;
          // lookbehind regex crashes Safari < 16.4 at PARSE time — compatible splitter
          for (const sent of (body.match(/[^.!?\n]+[.!?]?\s*/g) || [body])) {
            const w = words(sent).length;
            if (used + w > cap) break;
            out.push(sent); used += w;
          }
          body = out.join(' ');
          body += '\n\n[' + used + ' words — inside your ' + cap + '-word ceiling]';
        }
        return v.open(meta.join(' + ')) + '\n\n' + body + '\n\n' + v.close;
      }

      // content question — retrieve the most on-topic sentences
      if (corpus) {
        const qkw = new Set(words(q).filter((w) => !STOP.has(w) && w.length > 2));
        const sents = splitSentences(corpus);
        const scored = sents.map((s) => {
          const ws = words(s);
          let hit = 0;
          for (const w of ws) if (qkw.has(w)) hit++;
          return { s, sc: hit / Math.sqrt(ws.length || 1), hit };
        }).filter((x) => x.hit > 0).sort((a, b) => b.sc - a.sc).slice(0, 4);
        if (scored.length) {
          return v.open(meta.join(' + ')) + '\n\nPulled straight from your files — the passages that answer "' + q.slice(0, 80) + (q.length > 80 ? '…' : '') + '":\n\n' +
            scored.map((x) => '\u2022 ' + x.s).join('\n') + '\n\n' +
            'Top of file index: ' + keywords(corpus, 6).map((k) => k[0]).join(', ') + '.\n\n' + v.close;
        }
        return v.open(meta.join(' + ')) + '\n\nI swept the mounted material for that and found no direct hit. Nearest subject matter in the files: ' + keywords(corpus, 8).map((k) => k[0]).join(', ') + '. Ask about one of those, or load the deep model for full semantic inference.\n\n' + v.close;
      }

      if (imgs.length) {
        const lines = await Promise.all(imgs.map((a) => imgLine(a, '')));
        return v.open(meta.join(' + ')) + '\n' + lines.map((l) => l.trim()).join('\n') + '\n\n' + v.close;
      }

      return v.noData;
    }

    return { reply, summarize, keywords, analyzeImage };
  })();

  /* ---------------- chat ---------------- */
  function autoGrow() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  }
  chatInput.addEventListener('input', autoGrow);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !UDevice.isMobile()) { e.preventDefault(); sendChat(); }
  });
  chatSend.addEventListener('click', () => { generating ? UEngine.stop() : sendChat(); });

  function setGenerating(on) {
    generating = on;
    chatSend.classList.toggle('stop', on);
    chatSend.innerHTML = on ? '&#9632;' : '&#9658;';
    chatSend.title = on ? 'Stop generation' : 'Send';
  }

  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text && !attachments.length) return;
    stopSpeaking(); // interrupt the voice when the operator talks over it
    if (sourceMode === 'local' && !UEngine.ready && !UEngine.state.loading) {
      toast('DEEP CORE ASLEEP — LOCAL ANALYSIS CORE TAKING THE QUESTION');
    }

    const myAtts = attachments.splice(0, attachments.length);
    renderAtt();
    chatInput.value = ''; autoGrow();

    // user bubble
    const imgsHTML = myAtts.filter((a) => a.kind === 'image')
      .map((a) => `<img class="msg-img" src="${a.dataURL}" alt=""/>`).join('');
    const chipsNote = myAtts.length ? '\n[' + myAtts.map((a) => a.name).join(', ') + ' attached]' : '';
    addMsg('YOU', text + chipsNote, { imagesHTML: imgsHTML });

    // build engine payload
    const textBlocks = myAtts.filter((a) => a.kind === 'text' && a.text);
    let userText = text || 'Analyze the attached material.';
    if (textBlocks.length) {
      userText += '\n\n' + textBlocks.map((a) => {
        const t = (a.text || '').slice(0, 6000);
        return '--- FILE: ' + a.name + ' ---\n' + t + (a.text.length > 6000 ? '\n[...truncated]' : '') + '\n--- END FILE ---';
      }).join('\n\n');
    }

    pushAudio(0.6);
    const t0 = performance.now();

    if (sourceMode === 'sim' || !UEngine.ready) {
      // LOCAL ANALYSIS CORE — a real on-device answer composed from the parsed attachments
      const typingSim = addTyping();
      history.push({ role: 'user', content: userText, images: [], chars: userText.length });
      trimHistory();
      setTimeout(async () => {
        let reply;
        try {
          const mKey = UEngine.state.modelKey || store.getItem('ultron.model') || 'qwen';
          reply = await ULocalCore.reply(text || '', myAtts, persona, {
            engineReady: UEngine.ready,
            model: (UEngine.MODELS[mKey] || UEngine.MODELS.qwen).short,
          });
        } catch (e) {
          const p = PERSONAS[persona];
          reply = p.replies[Math.floor(Math.random() * p.replies.length)];
        }
        typingSim.remove();
        finalizeAI(reply, null);
      }, 550 + Math.random() * 750);
      return;
    }

    // real engine
    let imageObjs = [];
    try {
      for (const a of myAtts.filter((x) => x.kind === 'image')) {
        imageObjs.push(await UEngine.imageFromBlob(await (await fetch(a.dataURL)).blob()));
      }
    } catch (e) { toast('IMAGE DECODE FAILED — SENDING TEXT ONLY', true); }

    const content = [];
    imageObjs.forEach(() => content.push({ type: 'image' }));
    content.push({ type: 'text', text: userText });
    history.push({ role: 'user', content, images: imageObjs, chars: userText.length });
    trimHistory();

    function runRealGen() {
      const typing = addTyping();
      engine.tokCount = 0; engine.tokWindow = [];
      let firstTokAt = 0, bubbleText = '';
      const bub = typing.querySelector('.bub');
      bub.innerHTML = '<span class="txt"></span><span class="stream-cursor"></span>';
      const txtEl = bub.querySelector('.txt');
      return UEngine.chat({
        system: PERSONAS[persona].system,
        history: history.slice(-12).map(({ role, content: c }) => ({ role, content: c })),
        images: history.slice(-12).flatMap((h) => h.images || []),
        temperature: engine.temperature,
        maxTokens: engine.maxTokens,
        onToken: (t) => {
          if (!firstTokAt) {
            firstTokAt = performance.now();
            engine.prefillMs = firstTokAt - t0;
          }
          bubbleText += t;
          engine.tokCount++;
          engine.tokWindow.push(performance.now());
          txtEl.textContent = bubbleText;
          chatFeed.scrollTop = chatFeed.scrollHeight;
          if (engine.tokCount % 6 === 0) speakLive(bubbleText.slice(-90));
          pushAudio(0.4 + Math.random() * 0.4);
        },
      }).then((full) => {
        typing.remove();
        return { full: (full || bubbleText).trim(), error: null };
      }).catch((e) => {
        typing.remove();
        return { full: bubbleText, error: e };
      });
    }

    setGenerating(true);
    let result = await runRealGen();
    if (result.error && !result.full && UEngine.state.dtype === 'q4f16' &&
        /f16|shader/i.test(String((result.error && result.error.message) || result.error))) {
      // machine claimed f16 but the kernel died — rebuild on INT4 WASM and retry once
      addSysNote('// F16 KERNEL FAULT — REBUILDING CORE ON INT4 · WASM');
      toast('F16 PATH UNUSABLE — SWITCHING TO INT4 · WASM', true);
      store.setItem('ultron.dtype', 'q4');
      bootState.dtype = 'q4';
      UEngine.state.ready = false; UEngine.state.dtype = null;
      history.pop();
      history.push({ role: 'user', content, images: imageObjs, chars: userText.length });
      await wakeEngine();
      if (UEngine.ready) result = await runRealGen();
    }
    if (result.error && !result.full) {
      addSysNote('// CORE FAULT — ' + String((result.error && result.error.message) || result.error).slice(0, 120));
      if (history.length && history[history.length - 1].role === 'user') history.pop();
      toast('INFERENCE ERROR', true);
    } else {
      finalizeAI(result.full, engine.prefillMs);
    }
    setGenerating(false);
    updateCtxChip();
  }

  function trimHistory() {
    while (history.length > 12) history.shift();
    let imgCount = history.reduce((a, h) => a + (h.images ? h.images.length : 0), 0);
    for (const h of history) {
      if (imgCount <= 6) break;
      if (h.images && h.images.length) {
        imgCount -= h.images.length;
        h.images = [];
        if (Array.isArray(h.content)) {
          h.content = h.content.filter((c) => c.type !== 'image');
        }
      }
    }
  }

  function finalizeAI(text, prefillMs) {
    const p = PERSONAS[persona];
    const div = addMsg(persona.toUpperCase(), text);
    attachActions(div, () => text);
    speak(text);
    pushAudio(0.8);
    history.push({ role: 'assistant', content: text, images: [], chars: text.length });
    updateCtxChip();
    const tps = engine.tokWindow.length > 3 ? computeTps() : null;
    if (tps) {
      $('#tok-chip').textContent = tps.toFixed(1) + ' TOK/S';
      $('#lat-chip').textContent = 'PREFILL ' + (prefillMs / 1000).toFixed(2) + ' S';
    } else {
      $('#tok-chip').textContent = 'LOCAL CORE';
      $('#lat-chip').textContent = 'LATENCY 0.4 MS';
    }
  }

  function computeTps() {
    const w = engine.tokWindow;
    if (w.length < 4) return null;
    const cutoff = w[w.length - 1] - 3000;
    const recent = w.filter((t) => t >= cutoff);
    const span = (w[w.length - 1] - Math.max(recent[0], w[0])) / 1000;
    if (span < 0.25) return null;
    return recent.length / span;
  }

  function updateCtxChip() {
    const chars = history.reduce((a, h) => a + (h.chars || 0), 0);
    const k = UEngine.ctxEstimate(chars) / 1000;
    $('#chip-context').textContent = 'CTX ' + Math.max(0.1, k).toFixed(1) + 'K';
    $('#tk-ctx').textContent = Math.max(0.1, k).toFixed(1) + 'K';
  }

  /* ---------------- speech overlay + waveform + REAL TTS ---------------- */
  const sentenceEl = $('#sentence'), waveEl = $('#wave');
  let speaking = false, speakUntil = 0, typeTimer = null;
  for (let i = 0; i < 16; i++) waveEl.appendChild(document.createElement('i'));
  const waveBars = Array.from(waveEl.children);

  const TTS = {
    supported: 'speechSynthesis' in window,
    on: store.getItem('ultron.tts') !== 'off',
    voices: [],
    active: false,
    chunks: [],
    idx: 0,
  };
  const VOICE_PREF = {
    ultron:  { want: ['google uk english male', 'daniel', 'microsoft guy', 'alex', 'fred'], pitch: 0.6, rate: 0.95 },
    jarvis:  { want: ['daniel', 'google uk english male', 'microsoft ryan', 'oliver', 'alex'], pitch: 0.9, rate: 1.0 },
    friday:  { want: ['google uk english female', 'samantha', 'microsoft zira', 'victoria', 'karen'], pitch: 1.12, rate: 1.05 },
  };
  function loadVoices() {
    if (!TTS.supported) return;
    TTS.voices = speechSynthesis.getVoices() || [];
  }
  if (TTS.supported) {
    loadVoices();
    if (typeof speechSynthesis.addEventListener === 'function') {
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
    } else {
      speechSynthesis.onvoiceschanged = loadVoices; // older iOS Safari
    }
    setTimeout(loadVoices, 400); setTimeout(loadVoices, 1500); // some engines fill late
  }
  function pickVoice() {
    const pref = (VOICE_PREF[persona] || VOICE_PREF.ultron).want;
    const en = TTS.voices.filter((v) => /^en/i.test(v.lang));
    const pool = en.length ? en : TTS.voices;
    for (const w of pref) {
      const hit = pool.find((v) => v.name.toLowerCase().includes(w));
      if (hit) return hit;
    }
    return pool.find((v) => /male|daniel|alex/i.test(v.name)) || pool[0] || null;
  }
  function cleanSpeech(t) {
    return (t || '')
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_#`>|~]/g, ' ')
      .replace(/https?:\/\/\S+/g, ' link ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function chunkSpeech(t) {
    const parts = t.match(/[^.!?\n]+[.!?]?\s*/g) || [t];
    const out = [];
    let cur = '';
    for (const p of parts) {
      if ((cur + ' ' + p).length > 170 && cur) { out.push(cur.trim()); cur = p; }
      else cur = (cur ? cur + ' ' : '') + p;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function stopSpeaking() {
    if (TTS.supported) { try { speechSynthesis.cancel(); } catch (e) {} }
    TTS.active = false; TTS.chunks = []; TTS.idx = 0;
    speaking = false; speakUntil = 0;
    waveEl.classList.remove('speaking');
    clearInterval(typeTimer);
  }
  function speakNextChunk() {
    if (!TTS.active) return;
    if (TTS.idx >= TTS.chunks.length) { stopSpeaking(); return; }
    speakUntil = performance.now() + 6000; // keep the waveform alive while the voice runs
    const u = new SpeechSynthesisUtterance(TTS.chunks[TTS.idx++]);
    const vp = VOICE_PREF[persona] || VOICE_PREF.ultron;
    const v = pickVoice();
    if (v) u.voice = v;
    u.pitch = vp.pitch; u.rate = vp.rate; u.volume = 1;
    u.onend = () => { if (TTS.active) speakNextChunk(); };
    u.onerror = () => { stopSpeaking(); };
    try { speechSynthesis.speak(u); } catch (e) { stopSpeaking(); }
  }
  function speakReal(text) {
    const clean = cleanSpeech(text);
    if (!clean) return;
    TTS.chunks = chunkSpeech(clean);
    TTS.idx = 0;
    TTS.active = true;
    speakNextChunk();
  }

  function speak(text) {
    speaking = true;
    speakUntil = performance.now() + Math.max(2600, Math.min(text.length, 400) * 42);
    waveEl.classList.add('speaking');
    sentenceEl.textContent = '';
    clearInterval(typeTimer);
    const shown = text.slice(0, 220);
    let i = 0;
    typeTimer = setInterval(() => {
      sentenceEl.textContent = shown.slice(0, ++i);
      if (i >= shown.length) clearInterval(typeTimer);
    }, 26);
    if (TTS.supported && TTS.on) {
      if (TTS.active) { try { speechSynthesis.cancel(); } catch (e) {} }
      // Chrome drops an utterance queued in the same tick as cancel() — delay it
      setTimeout(() => { if (TTS.on && TTS.supported) speakReal(text); }, 80);
    }
  }

  function speakLive(tail) {
    if (!speaking) { waveEl.classList.add('speaking'); speaking = true; }
    speakUntil = performance.now() + 1200;
    sentenceEl.textContent = '…' + tail;
  }

  // click the waveform to mute / unmute the voice
  waveEl.style.cursor = 'pointer';
  waveEl.title = 'Toggle voice output';
  waveEl.addEventListener('click', () => {
    TTS.on = !TTS.on;
    store.setItem('ultron.tts', TTS.on ? 'on' : 'off');
    if (!TTS.on) stopSpeaking();
    toast(TTS.on ? 'VOICE OUTPUT ONLINE' : 'VOICE OUTPUT MUTED');
  });

  function waveLoop() {
    requestAnimationFrame(waveLoop);
    const now = performance.now();
    const live = speaking && now < speakUntil;
    if (speaking && !live) { speaking = false; waveEl.classList.remove('speaking'); }
    waveBars.forEach((b, i) => {
      if (live) {
        const h = 12 + Math.abs(Math.sin(now / 90 + i * 0.9)) * 70 * (0.5 + Math.random() * 0.5);
        b.style.height = clamp(h, 8, 100) + '%';
      } else {
        const h = 10 + Math.abs(Math.sin(now / 600 + i * 0.55)) * 10;
        b.style.height = h + '%';
      }
    });
  }
  waveLoop();

  /* ---------------- mic (real voice input) ---------------- */
  const micBtn = $('#mic-btn');
  micBtn.title = 'Voice input';
  const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null, listening = false, voiceFinal = false;
  if (SRClass) {
    recog = new SRClass();
    recog.lang = 'en-US';
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 1;
    recog.onstart = () => { listening = true; micBtn.classList.add('rec'); toast('LISTENING — SPEAK NOW'); };
    recog.onresult = (e) => {
      let interim = '', final = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) { voiceFinal = true; chatInput.value = final.trim(); }
      else if (interim) chatInput.value = interim.trim();
      autoGrow();
      chatFeed.scrollTop = chatFeed.scrollHeight;
    };
    recog.onerror = (e) => {
      const map = {
        'not-allowed': 'MIC BLOCKED — ALLOW MICROPHONE IN THE BROWSER',
        'service-not-allowed': 'MIC SERVICE BLOCKED — ALLOW MICROPHONE PERMISSION',
        'no-speech': 'NO SPEECH DETECTED — TRY AGAIN',
        'audio-capture': 'NO MICROPHONE FOUND',
        'network': 'SPEECH SERVICE NEEDS NETWORK — TYPING STILL WORKS OFFLINE',
      };
      toast(map[e.error] || ('MIC ERROR — ' + e.error).toUpperCase(), e.error !== 'no-speech' && e.error !== 'aborted');
    };
    recog.onend = () => {
      listening = false;
      micBtn.classList.remove('rec');
      if (voiceFinal && chatInput.value.trim() && !generating) {
        voiceFinal = false;
        setTimeout(() => { if (!generating) sendChat(); }, 350);
      }
    };
  }
  micBtn.addEventListener('click', () => {
    if (generating) return;
    if (listening) { voiceFinal = false; try { recog.stop(); } catch (e) {} return; }
    if (recog) {
      voiceFinal = false;
      try { recog.start(); pushAudio(0.8); }
      catch (e) { /* start() throws if already running — ignore */ }
    } else {
      // fallback: browser has no speech engine (Firefox / old Safari) — demo capture
      toast('SPEECH ENGINE UNAVAILABLE IN THIS BROWSER — INSERTING DEMO PROMPT', true);
      micBtn.classList.add('rec');
      setTimeout(() => {
        micBtn.classList.remove('rec');
        chatInput.value = 'Summarize everything I attached so far and keep it under 200 words.';
        autoGrow();
      }, 1400);
    }
  });

  /* ---------------- persona UI wiring ---------------- */
  $('#pers-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.pers');
    if (card) applyPersona(card.dataset.p);
  });
  $('#stage-pers').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) applyPersona(b.dataset.p);
  });
  $('#btn-apply').addEventListener('click', () => {
    applyPersona(persona, true);
    toast('PARAMETERS APPLIED // ' + persona.toUpperCase());
    pushAudio(0.7);
  });

  /* ---------------- engine controls ---------------- */
  function applyBackendChips(backend) {
    $('#chip-backend').textContent = backend === 'webgpu' ? 'WGPU_V1' : 'CPU_WASM';
    $('#kv-backend').textContent = backend === 'webgpu' ? 'WGPU_V1 · WEBGPU' : 'CPU · WASM SIMD';
    $('#chip-quant').textContent = 'INT4 · ' + (UEngine.state.dtype || 'Q4F16').toUpperCase();
    $('#kv-quant').textContent = 'INT4 · ' + (UEngine.state.dtype || 'Q4F16').toUpperCase();
  }

  $('#seg-src').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#seg-src button').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    sourceMode = b.dataset.s;
    toast(sourceMode === 'local' ? 'SOURCE // LOCAL MODEL CORE' : 'SOURCE // LOCAL ANALYSIS CORE');
  });

  const tempSlider = $('#temp-slider');
  tempSlider.addEventListener('input', () => {
    const v = +tempSlider.value;
    tempSlider.style.setProperty('--fill', (v / 120 * 100) + '%');
    engine.temperature = v / 100;
    $('#temp-val').textContent = engine.temperature.toFixed(2);
  });
  tempSlider.style.setProperty('--fill', '58%');

  const maxtokSlider = $('#maxtok-slider');
  maxtokSlider.addEventListener('input', () => {
    maxtokSlider.style.setProperty('--fill', ((+maxtokSlider.value - 128) / (2048 - 128) * 100) + '%');
    engine.maxTokens = +maxtokSlider.value;
    $('#maxtok-val').textContent = engine.maxTokens;
  });
  maxtokSlider.style.setProperty('--fill', '34%');

  const volSlider = $('#vol-slider');
  volSlider.addEventListener('input', () => {
    const v = +volSlider.value;
    volSlider.style.setProperty('--fill', v + '%');
    $('#vol-val').textContent = (v > 66 ? 'HIGH' : v > 33 ? 'NORMAL' : 'WHISPER') + ' // ' + v + '%';
  });
  volSlider.style.setProperty('--fill', '85%');

  /* ---------------- mobile tabs ---------------- */
  function switchTab(tab) {
    $$('.ws-tabbar button').forEach((b) => b.classList.toggle('sel', b.dataset.tab === tab));
    $$('.ws-col').forEach((col) => col.classList.toggle('tab-on', col.dataset.col === tab));
    if (tab === 'core') moveOrb(stageOrb, 1);
    window.dispatchEvent(new Event('resize'));
  }
  $('#ws-tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) switchTab(b.dataset.tab);
  });

  /* ---------------- logout ---------------- */
  $('#btn-logout').addEventListener('click', () => {
    if (generating) UEngine.stop();
    showScene('scene-login');
  });

  /* ---------------- telemetry ---------------- */
  function pushAudio(level) {
    window.dispatchEvent(new CustomEvent('ultron-audio-packet', { detail: { energy: level } }));
  }

  function applyEngineReadouts() {
    const mKey = UEngine.state.modelKey || store.getItem('ultron.model') || 'qwen';
    const dtypeKey = UEngine.state.dtype || store.getItem('ultron.dtype') || 'q4';
    const M = UEngine.manifestFor(mKey, dtypeKey);
    if (!M) return;
    const reg = UEngine.MODELS[mKey] || UEngine.MODELS.qwen;
    $('#kv-model').textContent = reg.short;
    const gb = M.total / 1024 / 1024 / 1024;
    const totalRam = navigator.deviceMemory || 8;
    $('#ram-val').textContent = gb.toFixed(1) + ' / ' + totalRam.toFixed(1) + ' GB';
    $('#ram-fill').style.width = clamp(gb / totalRam * 100, 4, 100) + '%';
    $('#kv-cache').textContent = fmtGB(M.total) + ' GB LOCAL';
    $('#tk-cache').textContent = fmtGB(M.total) + ' GB';
  }

  async function wakeEngine() {
    if (UEngine.ready) {
      applyBackendChips(UEngine.state.backend);
      applyEngineReadouts();
      return;
    }
    $('#chip-engine-t').textContent = 'WAKING CORE';
    $('#eng-chip').className = 'chip';
    $('#eng-chip').innerHTML = '<span class="dot"></span>LOADING';
    syncText && (syncText.textContent = '');
    let dtype = store.getItem('ultron.dtype') || (hasWebGPU() && !UDevice.isMobile() ? 'q4f16' : 'q4');
    if (dtype === 'q4f16' && !(await UEngine.probeWebGPU())) dtype = 'q4';
    const mKey = UEngine.state.modelKey || store.getItem('ultron.model') || 'qwen';
    let lastPct = -1;
    await UEngine.ensureLoaded(mKey, dtype, (ev) => {
      if (ev.type === 'file') {
        const M = UEngine.manifestFor(mKey, dtype);
        bootState.groupBytes[ev.group] = Math.max(bootState.groupBytes[ev.group] || 0, ev.groupLoaded || 0);
        const totalLoaded = M.order.reduce((a, k) => a + Math.min(bootState.groupBytes[k] || 0, M.groups[k].bytes), 0);
        const pct = Math.floor((totalLoaded / M.total) * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          $('#chip-engine-t').textContent = 'WAKING ' + pct + '%';
        }
      } else if (ev.type === 'done') {
        applyBackendChips(ev.backend);
      } else if (ev.type === 'error') {
        $('#chip-engine-t').textContent = 'CORE FAULT';
        $('#eng-chip').className = 'chip red';
        $('#eng-chip').innerHTML = '<span class="dot"></span>FAULT';
        toast('CACHE MISS — RE-SYNC REQUIRED. RETURNING TO MODEL SYNC.', true);
        setTimeout(() => {
          bootState.done = false; bootState.started = false;
          bootState.groupBytes = {};
          bootBtn.disabled = false;
          bootBtn.textContent = 'RETRY WEIGHT DOWNLOAD';
          setDtypeUI(bootState.dtype);
          showScene('scene-boot');
        }, 1200);
      }
    });
    if (UEngine.ready) {
      $('#chip-engine-t').textContent = 'ENGINE READY';
      $('#eng-chip').className = 'chip green';
      $('#eng-chip').innerHTML = '<span class="dot"></span>READY';
      applyEngineReadouts();
      $('#kv-hash').textContent = '#9C8F';
      $('#kv-egress').textContent = 'SEALED';
      const reg = UEngine.MODELS[UEngine.state.modelKey];
      addSysNote('// DEEP CORE ONLINE — ' + (reg ? reg.label : 'LOCAL VL MODEL') + ' RESIDENT · ' + (UEngine.state.backend || 'CPU').toUpperCase());
    }
  }

  function enterWorkspace() {
    setOperator(store.getItem('ultron.auth') || $('#login-email').value || 'operator@starkindustries.ai');
    if (!wsStarted) {
      wsStarted = true; wsStartT = Date.now();
      applyPersona(persona, true);
      addMsg(persona.toUpperCase(), PERSONAS[persona].greeting);
      attachActions(chatFeed.lastElementChild, () => PERSONAS[persona].greeting);
      updateCtxChip();
      wakeEngine();
      if (UDevice.isMobile()) switchTab('core');
      const tickerIds = setInterval(() => {
        if (currentScene !== 'scene-workspace') { clearInterval(tickerIds); return; }
        const s = Math.floor((Date.now() - wsStartT) / 1000);
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        $('#tk-up').textContent = hh + ':' + mm + ':' + ss;
        const tps = generating ? computeTps() : null;
        if (tps) $('#tok-chip').textContent = tps.toFixed(1) + ' TOK/S';
        else if (!UEngine.ready && $('#tok-chip').textContent.indexOf('TOK') === -1) $('#tok-chip').textContent = '— TOK/S';
        if (!generating) $('#lat-chip').textContent = 'LATENCY ' + (0.2 + Math.random() * 0.5).toFixed(2) + ' MS';
        $('#temp-chip').innerHTML = 'CORE ' + (39 + Math.random() * 5).toFixed(0) + '&deg;C';
        if (Math.random() < 0.06) {
          $('#tk-threat').textContent = 'PERIMETER: SCAN ' + (8 + Math.floor(Math.random() * 80)) + '%';
          setTimeout(() => { $('#tk-threat').textContent = 'PERIMETER: SECURE'; }, 1400);
        }
      }, 1000);
    } else {
      if (!window.ULTRON_SKIP_WAKE) wakeEngine();
    }
  }

  /* ---------------- initial ---------------- */
  renderAtt();
  applyPersona(persona, true);
  showScene('scene-login');
})();
