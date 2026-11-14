/* ============================================================
   ULTRON OFFLINE — SERVICES LAYER
   UEngine  : real Qwen3-VL-2B-Instruct via transformers.js (HF)
   UDoc     : attachment parsing (pdf / docx / txt / images)
   UExport  : per-message export (PDF / DOCX / TXT / clipboard)
   UDevice  : mobile / desktop detection
   ============================================================ */
(function () {
  'use strict';

  /* ---- lazy script loader: in the GitHub-Pages site build the heavy vendor
     libs (pdf.js 312KB, jsPDF 357KB, fflate 32KB) live in /vendor and load ON
     DEMAND — a phone no longer parses ~1MB of JS before first paint.
     In the single-file build the libs are already inline, so these resolve
     instantly with zero network. ---- */
  const ULoad = {
    cache: {},
    load(src) {
      if (ULoad.cache[src]) return ULoad.cache[src];
      ULoad.cache[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => { delete ULoad.cache[src]; reject(new Error('LOAD FAILED: ' + src)); };
        document.head.appendChild(s);
      });
      return ULoad.cache[src];
    },
  };
  window.ULoad = ULoad;

  /* ========================================================
     UDevice — device class detection (drives mobile vs PC UI)
     ======================================================== */
  const UDevice = (() => {
    const mmCoarse = () => window.matchMedia('(pointer: coarse)').matches;
    const mmNarrow = () => window.matchMedia('(max-width: 780px)').matches;
    function isMobile() {
      const uaTouch = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent);
      const coarse = mmCoarse();
      return (uaTouch && coarse) || (coarse && mmNarrow()) || mmNarrow();
    }
    function apply() {
      const dev = isMobile() ? 'mobile' : 'desktop';
      if (document.body.dataset.device !== dev) {
        document.body.dataset.device = dev;
        window.dispatchEvent(new CustomEvent('ultron-device', { detail: { device: dev } }));
      }
      return dev;
    }
    let tid = null;
    window.addEventListener('resize', () => { clearTimeout(tid); tid = setTimeout(apply, 150); });
    return { isMobile, apply };
  })();

  /* ========================================================
     UEngine — transformers.js runtime + dual model registry
     TEST MODE : HuggingFaceTB/SmolVLM-500M-Instruct (~0.4 GB)
     FULL MODE : onnx-community/Qwen3-VL-2B-Instruct-ONNX (~1.4 GB)
     ======================================================== */
  const UEngine = (() => {
    // Component byte sizes measured from the Hugging Face repos (verified 2026-11)
    const MODELS = {
      smol: {
        key: 'smol', label: 'SMOLVLM-500M-INSTRUCT', short: 'SmolVLM-500M-Instruct',
        repo: 'HuggingFaceTB/SmolVLM-500M-Instruct',
        cls: 'AutoModelForVision2Seq',           // SmolVLM architecture
        hint: 'TEST MODE — compact vision-language core, fastest sync',
        manifest: {
          q4f16: {
            total: 4.35e6 + 57.69e6 + 94.62e6 + 205.33e6,
            groups: {
              config:  { label: 'TOKENIZER + CONFIG', desc: 'tokenizer.json · vocab.json · chat template · processor', bytes: 4.35e6 },
              vision:  { label: 'VISION ENCODER · INT4/F16', desc: 'onnx/vision_encoder_q4f16 (~58 MB) — image understanding', bytes: 57.69e6 },
              embed:   { label: 'EMBEDDING MATRIX · INT4/F16', desc: 'onnx/embed_tokens_q4f16 (~95 MB) — 49k vocabulary', bytes: 94.62e6 },
              decoder: { label: 'LLM DECODER · INT4/F16', desc: 'onnx/decoder_model_merged_q4f16 (~205 MB) — 32 layers, 576 hidden', bytes: 205.33e6 },
            },
            order: ['config', 'vision', 'embed', 'decoder'],
          },
          q4: {
            total: 4.35e6 + 66.73e6 + 189.24e6 + 229.12e6,
            groups: {
              config:  { label: 'TOKENIZER + CONFIG', desc: 'tokenizer.json · vocab.json · chat template · processor', bytes: 4.35e6 },
              vision:  { label: 'VISION ENCODER · INT4', desc: 'onnx/vision_encoder_q4 (~67 MB) — image understanding', bytes: 66.73e6 },
              embed:   { label: 'EMBEDDING MATRIX · INT4', desc: 'onnx/embed_tokens_q4 (~189 MB) — 49k vocabulary', bytes: 189.24e6 },
              decoder: { label: 'LLM DECODER · INT4', desc: 'onnx/decoder_model_merged_q4 (~229 MB) — 32 layers, 576 hidden', bytes: 229.12e6 },
            },
            order: ['config', 'vision', 'embed', 'decoder'],
          },
        },
      },
      qwen: {
        key: 'qwen', label: 'QWEN3-VL-2B-INSTRUCT', short: 'Qwen3-VL-2B-Instruct',
        repo: 'onnx-community/Qwen3-VL-2B-Instruct-ONNX',
        cls: 'Qwen3VLForConditionalGeneration',  // Qwen3-VL architecture
        hint: 'FULL MODE — flagship vision-language core, deeper reasoning',
        manifest: {
          q4f16: {
            total: 9.12e6 + 196.95e6 + 179.89e6 + 995.10e6,
            groups: {
              config:  { label: 'TOKENIZER + CONFIG', desc: 'tokenizer.json · chat template · processor · generation config', bytes: 9.12e6 },
              vision:  { label: 'VISION ENCODER · INT4', desc: 'onnx/vision_encoder_q4f16 (~197 MB) — image understanding', bytes: 196.95e6 },
              embed:   { label: 'EMBEDDING MATRIX · INT4', desc: 'onnx/embed_tokens_q4f16 (~180 MB) — 151k vocabulary', bytes: 179.89e6 },
              decoder: { label: 'LLM DECODER · INT4', desc: 'onnx/decoder_model_merged_q4f16 (~995 MB) — 28 layers, 2048 hidden', bytes: 995.10e6 },
            },
            order: ['config', 'vision', 'embed', 'decoder'],
          },
          q4: {
            total: 9.12e6 + 217.95e6 + 199.34e6 + 1102.63e6,
            groups: {
              config:  { label: 'TOKENIZER + CONFIG', desc: 'tokenizer.json · chat template · processor · generation config', bytes: 9.12e6 },
              vision:  { label: 'VISION ENCODER · INT4', desc: 'onnx/vision_encoder_q4 (~218 MB) — image understanding', bytes: 217.95e6 },
              embed:   { label: 'EMBEDDING MATRIX · INT4', desc: 'onnx/embed_tokens_q4 (~199 MB) — 151k vocabulary', bytes: 199.34e6 },
              decoder: { label: 'LLM DECODER · INT4', desc: 'onnx/decoder_model_merged_q4 (~1103 MB) — 28 layers, 2048 hidden', bytes: 1102.63e6 },
            },
            order: ['config', 'vision', 'embed', 'decoder'],
          },
        },
      },
    };
    const TF_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';

    const S = {
      tf: null, tok: null, proc: null, model: null, modelKey: null,
      ready: false, loading: false, backend: null, dtype: null,
      stopper: null, generating: false, lastError: null,
    };

    function hasWebGPU() { return typeof navigator !== 'undefined' && !!navigator.gpu; }

    // Real adapter probe — adapter must exist, declare shader-f16, and PROVE it by
    // running an actual f16 compute roundtrip (software adapters may claim the
    // feature but fail to compile f16 WGSL, which kills OrtRun later).
    let _adapterProbe = null;
    async function probeWebGPU() {
      if (typeof navigator === 'undefined' || !navigator.gpu) return false;
      if (_adapterProbe === null) {
        _adapterProbe = await (async () => {
          try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter || !adapter.features || !adapter.features.has('shader-f16')) return false;
            const device = await adapter.requestDevice({ requiredFeatures: ['shader-f16'] });
            const code = 'enable f16;\n' +
              '@group(0) @binding(0) var<storage, read_write> out: array<u32>;\n' +
              '@compute @workgroup_size(1)\n' +
              'fn main() { let x: f16 = f16(2.0); out[0] = bitcast<u32>(f32(x * x)); }';
            const mod = device.createShaderModule({ code });
            const pipe = await device.createComputePipelineAsync({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } });
            const buf = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
            const rb = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
            const enc = device.createCommandEncoder();
            const pass = enc.beginComputePass();
            pass.setPipeline(pipe);
            pass.setBindGroup(0, device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: buf } }] }));
            pass.dispatchWorkgroups(1);
            pass.end();
            enc.copyBufferToBuffer(buf, 0, rb, 0, 4);
            device.queue.submit([enc.finish()]);
            await rb.mapAsync(GPUMapMode.READ);
            const v = new Uint32Array(rb.getMappedRange())[0];
            rb.unmap();
            device.destroy();
            return v === 0x40800000; // 4.0f
          } catch (e) { return false; }
        })();
      }
      return _adapterProbe;
    }

    function groupForFile(url) {
      const f = String(url).split('/').pop();
      if (/vision_encoder/.test(f)) return 'vision';
      if (/embed_tokens/.test(f)) return 'embed';
      if (/decoder_model_merged/.test(f)) return 'decoder';
      return 'config';
    }

    async function ensureLib() {
      if (S.tf) return S.tf;
      const mod = await import(/* webpackIgnore: true */ TF_CDN);
      mod.env.allowLocalModels = false;
      // Cache API is unavailable on some opaque origins (file://) — degrade gracefully
      let cacheOK = false;
      try { cacheOK = !!(window.caches && await window.caches.has('transformers-cache')) || 'caches' in window; } catch (e) { cacheOK = false; }
      mod.env.useBrowserCache = cacheOK;
      // mobile guard: multi-threaded WASM without cross-origin isolation crashes
      // Android WebViews and older iOS Safari — pin to single thread when isolated
      try {
        if (mod.env && mod.env.backends && mod.env.backends.onnx && mod.env.backends.onnx.wasm &&
            (typeof crossOriginIsolated === 'undefined' || !crossOriginIsolated)) {
          mod.env.backends.onnx.wasm.numThreads = 1;
        }
      } catch (e) {}
      S.tf = mod;
      return mod;
    }

    // Real download with per-file progress mapped to the 4 UI groups
    async function download(modelKey, dtype, on) {
      if (S.loading) return;
      const reg = MODELS[modelKey] || MODELS.qwen;
      S.loading = true; S.ready = false; S.lastError = null; S.modelKey = reg.key;
      const loaded = {}; // group -> bytes
      const modelId = window.ULTRON_MODEL_OVERRIDE || reg.repo;
      try {
        // Validate the GPU path BEFORE pulling 1+ GB of weights
        if (dtype === 'q4f16' && !(await probeWebGPU())) {
          throw new Error('WEBGPU ADAPTER UNAVAILABLE — SWITCH TO INT4 · CPU/WASM');
        }
        on({ type: 'status', text: 'FETCHING TRANSFORMERS.JS RUNTIME' });
        const T = await ensureLib();
        const cb = (data) => {
          if (!data || !data.file) return;
          const g = groupForFile(data.file);
          if (data.status === 'progress') {
            loaded[g] = Math.max(loaded[g] || 0, data.loaded || 0);
            on({ type: 'file', file: data.file, group: g, loaded: data.loaded || 0, total: data.total || 0, groupLoaded: loaded[g] });
          } else if (data.status === 'done') {
            on({ type: 'filedone', file: data.file, group: g });
          }
        };
        on({ type: 'status', text: 'PULLING TOKENIZER + CONFIG' });
        S.tok = await T.AutoTokenizer.from_pretrained(modelId, { progress_callback: cb });
        try {
          S.proc = await T.AutoProcessor.from_pretrained(modelId, { progress_callback: cb });
        } catch (e) {
          // text-only models have no processor — tokenizer path only
          S.proc = null;
        }
        const device = (dtype === 'q4f16' && (await probeWebGPU())) ? 'webgpu' : 'wasm';
        on({ type: 'status', text: 'COMPILING ' + device.toUpperCase() + ' KERNELS · PULLING WEIGHTS' });
        // architecture class from the registry (verified against transformers.js 4.3.2)
        const Cls = T[reg.cls] || T.AutoModelForVision2Seq || T.AutoModelForCausalLM;
        S.model = await Cls.from_pretrained(modelId, {
          dtype, device, progress_callback: cb,
        });
        S.backend = device; S.dtype = dtype; S.ready = true;
        on({ type: 'done', backend: device });
      } catch (e) {
        S.lastError = String((e && e.message) || e);
        on({ type: 'error', message: S.lastError });
      }
      S.loading = false;
    }

    // Wake from browser cache (fast path when sessions already alive)
    async function ensureLoaded(modelKey, dtype, on) {
      if (S.ready) return { cached: true };
      return download(modelKey || S.modelKey || 'qwen', dtype || S.dtype || 'q4f16', on);
    }

    function stop() { if (S.stopper) S.stopper.interrupt(); }

    async function imageFromBlob(blob) {
      const T = await ensureLib();
      return await T.RawImage.fromBlob(blob);
    }

    /**
     * chat(): stream a completion for a full conversation.
     * history: [{role:'user'|'assistant', content: string | Array}]
     *   user content arrays use [{type:'image'}, {type:'text', text}]
     * images: array of RawImage in order of appearance (may be empty)
     */
    async function chat(opts) {
      const { tok, model, tf } = S;
      if (!tok || !model) throw new Error('ENGINE NOT LOADED');
      S.generating = true;
      S.stopper = new tf.InterruptableStoppingCriteria();
      try {
        const convo = [{ role: 'system', content: opts.system }, ...opts.history];
        const text = tok.apply_chat_template(convo, { add_generation_prompt: true, tokenize: false });
        const imgs = (opts.images && opts.images.length) ? opts.images : null;
        // VL processors require images; text-only calls fall back to the tokenizer
        let inputs;
        if (S.proc && imgs) {
          inputs = await S.proc(text, imgs);
        } else if (S.proc) {
          try { inputs = await S.proc(text); }
          catch (e) { inputs = await tok(text); }
        } else {
          inputs = tok(text);
        }
        const dims = inputs.input_ids.dims || [];
        const nPrompt = dims[dims.length - 1]; // .at() crashes Safari < 15.4 at parse time
        const streamer = new tf.TextStreamer(tok, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (t) => opts.onToken && opts.onToken(t),
        });
        const genOpts = {
          max_new_tokens: opts.maxTokens || 768,
          streamer,
          stopping_criteria: S.stopper,
        };
        if (opts.temperature > 0.05) {
          genOpts.do_sample = true;
          genOpts.temperature = opts.temperature;
          genOpts.top_p = 0.9;
        } else {
          genOpts.do_sample = false;
        }
        const out = await model.generate({ ...inputs, ...genOpts });
        S.generating = false;
        // normalize generate() output (Tensor [batch, seq] — or {sequences} when return_dict_in_generate)
        const seq = (out && out.sequences) ? out.sequences : out;
        const row = (seq && seq.dims && seq.dims.length === 2) ? seq[0] : seq;
        const genLen = (row && row.dims && row.dims.length) ? row.dims[0] : 0;
        if (!genLen || genLen <= nPrompt) return '';
        return tok.decode(row.slice([nPrompt, null]), { skip_special_tokens: true }).trim();
      } catch (e) {
        S.generating = false;
        throw e;
      }
    }

    // Rough token estimate for context chip (chars/4 heuristic)
    function ctxEstimate(chars) { return Math.round(chars / 4); }

    return {
      MODELS, manifestFor(modelKey, dtype) {
        const reg = MODELS[modelKey] || MODELS.qwen;
        return reg.manifest[dtype] || reg.manifest.q4;
      },
      hasWebGPU, probeWebGPU,
      download, ensureLoaded, chat, stop, imageFromBlob, ensureLib, ctxEstimate,
      get state() { return S; },
      get ready() { return S.ready; },
      get generating() { return S.generating; },
      get modelKey() { return S.modelKey; },
    };
  })();

  /* ========================================================
     UDoc — attachment parsing
     ======================================================== */
  const UDoc = (() => {
    let pdfjsReady = false;
    async function ensurePdfJs() {
      if (window.pdfjsLib) {
        if (!pdfjsReady) {
          const el = document.getElementById('pdf-worker-code');
          if (el && el.textContent && el.textContent.trim()) {
            // single-file build: worker code is inlined as text/plain
            const blob = new Blob([el.textContent], { type: 'application/javascript' });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
          } else {
            // site build: same-origin worker file
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
          }
          pdfjsReady = true;
        }
        return;
      }
      // site build: pdf.js is NOT parsed at startup — pull it only when a PDF arrives
      await ULoad.load('vendor/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      pdfjsReady = true;
    }

    async function extractPdf(file) {
      await ensurePdfJs();
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const maxPages = Math.min(pdf.numPages, 40);
      let out = '';
      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        let lastY = null, line = '';
        const lines = [];
        tc.items.forEach((it) => {
          const y = it.transform[5];
          if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trim()); line = ''; }
          line += it.str + (it.hasEOL ? ' ' : '');
          lastY = y;
        });
        if (line.trim()) lines.push(line.trim());
        out += lines.filter(Boolean).join('\n') + '\n';
        if (out.length > 200000) break;
      }
      return { text: out.trim(), pages: pdf.numPages };
    }

    async function extractDocx(file) {
      if (!window.fflate) await ULoad.load('vendor/fflate.min.js');
      const buf = new Uint8Array(await file.arrayBuffer());
      const files = window.fflate.unzipSync(buf);
      const docXml = files['word/document.xml'];
      if (!docXml) throw new Error('NOT A VALID DOCX');
      const xml = new TextDecoder('utf-8').decode(docXml);
      const paras = xml.split(/<w:p[ >]/).slice(1).map((p) => {
        const runs = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return runs.map((r) => r.replace(/<[^>]+>/g, '')).join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      }).filter((t) => t.trim().length);
      return { text: paras.join('\n') };
    }

    async function extractLegacyDoc(file) {
      // Best-effort text scrape from old binary .doc (Word 97-2003)
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 8192) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
      }
      const runs = bin.match(/[\x20-\x7E\u00A0-\u00FF]{6,}/g) || [];
      const text = runs.filter((s) => /[a-zA-Z]{3}/.test(s)).slice(0, 400).join('\n');
      return { text, approx: true };
    }

    function readAsDataURL(file) {
      return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
    }

    async function extract(file) {
      const name = file.name;
      const ext = (name.split('.').pop() || '').toLowerCase();
      const sizeMB = file.size / (1024 * 1024);
      const base = { name, ext: ext.toUpperCase() || 'FILE', sizeMB, file };

      if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
        const dataURL = await readAsDataURL(file);
        return { ...base, kind: 'image', dataURL, meta: 'IMAGE · ' + sizeMB.toFixed(2) + ' MB' };
      }
      if (ext === 'pdf') {
        const r = await extractPdf(file);
        return { ...base, kind: 'text', text: r.text, meta: 'PDF · ' + r.pages + 'P · ' + sizeMB.toFixed(2) + ' MB' };
      }
      if (ext === 'docx') {
        const r = await extractDocx(file);
        return { ...base, kind: 'text', text: r.text, meta: 'DOCX · ' + sizeMB.toFixed(2) + ' MB' };
      }
      if (ext === 'doc') {
        const r = await extractLegacyDoc(file);
        return { ...base, kind: 'text', text: r.text, meta: 'DOC(LEGACY) · ' + sizeMB.toFixed(2) + ' MB', approx: true };
      }
      if (['txt', 'md', 'csv', 'json', 'log', 'xml', 'yaml', 'yml', 'html'].includes(ext) || file.type.startsWith('text/')) {
        const text = await file.text();
        return { ...base, kind: 'text', text, meta: ext.toUpperCase() + ' · ' + sizeMB.toFixed(2) + ' MB' };
      }
      throw new Error('UNSUPPORTED FORMAT');
    }

    return { extract };
  })();

  /* ========================================================
     UExport — per-output export (PDF / DOCX / TXT / COPY)
     ======================================================== */
  const UExport = (() => {
    function stamp() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
    }

    function saveBlob(blob, name) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }

    function sanitizeLatin1(s) {
      const map = { '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u2013': '-', '\u2014': '--', '\u2026': '...', '\u2022': '*', '\u00A0': ' ', '\u2192': '->', '\u00D7': 'x' };
      let replaced = 0;
      let out = '';
      for (const ch of s) {
        if (map[ch] !== undefined) { out += map[ch]; replaced++; }
        else if (ch.charCodeAt(0) <= 255) out += ch;
        else { out += '?'; replaced++; }
      }
      return { text: out, replaced };
    }

    async function toPDF(text, title) {
      if (!window.jspdf) await ULoad.load('vendor/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const { text: clean, replaced } = sanitizeLatin1(text);
      const W = 595.28, H = 841.89, M = 56;
      let y = M;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(110);
      doc.text('ULTRON OFFLINE // EXPORT — ' + (title || 'OUTPUT'), M, y);
      doc.setDrawColor(180); doc.line(M, y + 6, W - M, y + 6);
      y += 30;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(25);
      const lines = doc.splitTextToSize(clean, W - M * 2);
      const pageOf = () => doc.internal.getCurrentPageInfo().pageNumber;
      for (const ln of lines) {
        if (y > H - M) { doc.addPage(); y = M; }
        doc.text(ln, M, y);
        y += 15.4;
      }
      const total = pageOf();
      doc.setFontSize(8); doc.setTextColor(150);
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.text('Page ' + p + ' / ' + total + '  ·  generated locally, zero network', W - M, H - 30, { align: 'right' });
      }
      const name = 'ultron_output_' + stamp() + '.pdf';
      doc.save(name);
      return { name, replaced };
    }

    function esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async function toDOCX(text, title) {
      if (!window.fflate) await ULoad.load('vendor/fflate.min.js');
      const head = (title || 'ULTRON EXPORT').slice(0, 80);
      const bodyParas = text.split('\n').map((ln) => {
        const t = esc(ln);
        return '<w:p><w:r><w:t xml:space="preserve">' + (t || '') + '</w:t></w:r></w:p>';
      }).join('');
      const docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
        + '<w:p><w:r><w:rPr><w:b/><w:sz w:val="30"/></w:rPr><w:t xml:space="preserve">' + esc(head) + '</w:t></w:r></w:p>'
        + '<w:p><w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">ULTRON Offline Workstation - generated locally</w:t></w:r></w:p>'
        + bodyParas
        + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
        + '</w:body></w:document>';
      const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        + '</Types>';
      const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        + '</Relationships>';
      const zip = window.fflate.zipSync({
        '[Content_Types].xml': new TextEncoder().encode(contentTypes),
        '_rels/.rels': new TextEncoder().encode(rels),
        'word/document.xml': new TextEncoder().encode(docXml),
      }, { level: 6 });
      const name = 'ultron_output_' + stamp() + '.docx';
      saveBlob(new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), name);
      return { name };
    }

    function toTXT(text) {
      const name = 'ultron_output_' + stamp() + '.txt';
      saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), name);
      return { name };
    }

    async function copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (_) { /* noop */ }
        ta.remove();
        return ok;
      }
    }

    return { toPDF, toDOCX, toTXT, copy, sanitizeLatin1 };
  })();

  window.UDevice = UDevice;
  window.UEngine = UEngine;
  window.UDoc = UDoc;
  window.UExport = UExport;
})();
