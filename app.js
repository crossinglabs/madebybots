// Made by Bots — board renderer. All apps come from apps.json; adding an entry adds a chip + net.
const VB = { w: 1600, h: 1000 };
const CORE = { x: 670, y: 370, w: 260, h: 300 };
const CHIP = { w: 320, h: 120 };              // h shrinks to 96 when a column holds 3+ chips
const COLS = { left: 110, right: 1170 };        // chip x per column
const ROWS = { top: 290, bottom: 850 };           // chip-center y band
const LANE = 14;                                  // spacing between parallel traces
const SVGNS = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const board = document.querySelector('[data-board]');
const svg = board.querySelector('svg.traces');
const nets = svg.querySelector('.nets');
const decor = svg.querySelector('.decor');
const list = document.getElementById('apps-list');
const sheet = document.querySelector('[data-sheet]');
const sheetInner = sheet.querySelector('.sheet-inner');

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- layout ---------- */
// Alternate right/left so the first (featured) app lands top-right; rows spread evenly per column.
function layout(apps) {
  const cols = { right: [], left: [] };
  apps.forEach((a, i) => cols[i % 2 === 0 ? 'right' : 'left'].push(a));
  const dense = Math.max(cols.right.length, cols.left.length) >= 3;
  CHIP.h = dense ? 96 : 120;
  board.classList.toggle('is-dense', dense);   // hides net labels so stacked chips don't collide
  const placed = [];
  for (const side of ['right', 'left']) {
    const k = cols[side].length;
    cols[side].forEach((app, r) => {
      const cy = k === 1 ? 520 - 120 : ROWS.top + (ROWS.bottom - ROWS.top) * (r + 0.5) / k;
      placed.push({ app, side, x: COLS[side], y: Math.round(cy - CHIP.h / 2), cy: Math.round(cy) });
    });
  }
  return placed;
}

// Orthogonal route with a single 45° jog: core edge -> lane -> diagonal -> chip edge.
function route(p, offset) {
  const coreCy = CORE.y + CORE.h / 2;
  const sy = Math.round(coreCy + (p.cy - coreCy) * 0.3) + offset;
  const ey = p.cy + offset;
  const dy = Math.abs(ey - sy);
  if (p.side === 'right') {
    const sx = CORE.x + CORE.w, ex = p.x;
    const bend = sx + 28 + (offset + LANE) * 0.6;
    return { d: `M${sx} ${sy} H${bend} L${bend + dy} ${ey} H${ex}`, via: [bend, sy], end: [ex, ey] };
  }
  const sx = CORE.x, ex = p.x + CHIP.w;
  const bend = sx - 28 - (offset + LANE) * 0.6;
  return { d: `M${sx} ${sy} H${bend} L${bend - dy} ${ey} H${ex}`, via: [bend, sy], end: [ex, ey] };
}

function chipPath(x, y, w, h, notch = 14) {
  return `M${x + notch} ${y} H${x + w} V${y + h} H${x} V${y + notch} Z`;
}

function pins(g, x, y, w, h, step = 20, len = 10, sides = 'tblr') {
  const path = [];
  if (sides.includes('t')) for (let px = x + step; px < x + w - 4; px += step) path.push(`M${px} ${y - len}V${y}`);
  if (sides.includes('b')) for (let px = x + step; px < x + w - 4; px += step) path.push(`M${px} ${y + h}V${y + h + len}`);
  if (sides.includes('l')) for (let py = y + step; py < y + h - 4; py += step) path.push(`M${x - len} ${py}H${x}`);
  if (sides.includes('r')) for (let py = y + step; py < y + h - 4; py += step) path.push(`M${x + w} ${py}H${x + w + len}`);
  el('path', { d: path.join(''), class: 'pin' }, g);
}

/* ---------- render ---------- */
function drawDecor() {
  const core = el('g', { class: 'core-pkg' }, decor);
  pins(core, CORE.x, CORE.y, CORE.w, CORE.h, 20, 12);
  el('path', { d: chipPath(CORE.x, CORE.y, CORE.w, CORE.h, 22), class: 'core-body' }, core);
  el('rect', { x: CORE.x + 16, y: CORE.y + 16, width: CORE.w - 32, height: CORE.h - 32, class: 'core-inner' }, core);
  el('circle', { cx: CORE.x + 34, cy: CORE.y + 34, r: 3.5, class: 'pin1' }, core);
  const dy = CORE.y + CORE.h + 190;
  el('path', { d: `M${CORE.x} ${dy - 8}V${dy + 8}M${CORE.x + CORE.w} ${dy - 8}V${dy + 8}M${CORE.x} ${dy}H${CORE.x + CORE.w}`, class: 'dim-line' }, decor);
  const t = el('text', { x: CORE.x + CORE.w / 2, y: dy - 10, 'text-anchor': 'middle', class: 'dim-text' }, decor);
  t.textContent = 'BUS A · ALL NETS';
}

function drawNets(placed) {
  for (const p of placed) {
    const { app } = p;
    const g = el('g', { class: `net is-${app.status}`, 'data-id': app.id }, nets);
    const r = route(p, 0);
    el('path', { d: r.d, class: 'trace' }, g);
    el('circle', { cx: r.via[0], cy: r.via[1], r: 2.75, class: 'via' }, g);
    el('rect', { x: (p.side === 'right' ? r.end[0] - 8 : r.end[0]), y: r.end[1] - 2.5, width: 8, height: 5, class: 'pad' }, g);
    pins(g, p.x, p.y, CHIP.w, CHIP.h, 22, 8, 'tb');
    el('path', { d: chipPath(p.x, p.y, CHIP.w, CHIP.h), class: `chip-body${app.status === 'placeholder' ? ' is-placeholder' : ''}` }, g);
  }
}

function statusLabel(s) { return { live: 'LIVE', building: 'BUILDING', placeholder: 'COMING SOON' }[s] || s.toUpperCase(); }

function drawChips(placed) {
  // DOM order = data order (keyboard order), independent of visual column
  const byId = new Map(placed.map(p => [p.app.id, p]));
  list.innerHTML = '';
  for (const app of window.__apps) {
    const p = byId.get(app.id);
    const li = document.createElement('li');
    li.className = 'chip';
    li.dataset.status = app.status;
    li.dataset.id = app.id;
    li.style.cssText = `--x:${p.x};--y:${p.y};--w:${CHIP.w};--h:${CHIP.h}`;
    const isPh = app.status === 'placeholder';
    const meta = isPh ? 'COMING SOON · IN DEVELOPMENT' : [statusLabel(app.status), app.version, app.primaryTech, app.platform].filter(Boolean).join(' · ');
    const name = app.name;
    // Accessible name keeps the visible label as one phrase, then the action.
    const label = isPh ? `${name} ${meta}` : `${name} ${meta}. Open datasheet.`;
    li.innerHTML = `
      <span class="chip-ref" aria-hidden="true">${esc(app.ref)}</span>
      <button class="chip-btn" type="button" ${isPh ? 'aria-disabled="true"' : 'aria-haspopup="dialog"'}
        aria-label="${esc(label)}">
        <span class="chip-name"><span class="led" data-status="${esc(app.status)}"></span>${esc(name)}</span>
        <span class="chip-meta">${esc(meta)}</span>
        ${isPh ? '' : '<span class="chip-go" aria-hidden="true">→</span>'}
      </button>
      <span class="chip-net" aria-hidden="true">NET — ${esc(app.id.replace(/-/g, '').toUpperCase())} · ${statusLabel(app.status)}</span>`;
    const btn = li.querySelector('button');
    const on = () => setActive(app.id);
    const off = () => setActive(null);
    btn.addEventListener('pointerenter', on);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('focus', on);
    btn.addEventListener('blur', off);
    if (!isPh) btn.addEventListener('click', () => { location.hash = `#/apps/${app.id}`; });
    list.appendChild(li);
  }
  const dot = document.createElement('li');
  dot.className = 'signal-dot';
  dot.setAttribute('aria-hidden', 'true');
  list.appendChild(dot);
}

function setActive(id) {
  if (id) board.dataset.active = id; else delete board.dataset.active;
  nets.querySelectorAll('.net').forEach(n => n.classList.toggle('is-active', n.dataset.id === id));
}

/* ---------- datasheet ---------- */
let lastTrigger = null;

function renderSheet(app) {
  const figs = (app.screenshots || []).map(s => `
    <figure><div class="frame"><img src="${esc(s.src)}" width="${s.width}" height="${s.height}" alt="${esc(s.alt)}" decoding="async"></div>
    <figcaption class="mono">${esc(s.caption)}</figcaption></figure>`).join('');
  const extra = Object.entries(app.links || {}).filter(([, v]) => v)
    .map(([k, v]) => `<a class="btn btn-ghost" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)} ↗</a>`).join('');
  sheetInner.innerHTML = `
    <header class="sheet-head">
      <div>
        <h2 id="sheet-title" tabindex="-1">${esc(app.name)}</h2>
        <p class="mono sheet-ref">${esc(app.ref)} · DATASHEET · REV A</p>
      </div>
      <span class="status-pill mono"><span class="led" data-status="${esc(app.status)}"></span>${statusLabel(app.status)}</span>
    </header>
    <div class="sheet-body">
      <div class="spec">
        <section><h3>01 · Function</h3><p class="lead">${esc(app.summary)}</p>
          ${app.function?.length ? `<ul class="bullets">${app.function.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</section>
        ${app.approach ? `<section><h3>02 · Approach</h3><p>${esc(app.approach)}</p></section>` : ''}
        <section><h3>03 · Stack</h3><ul class="tags">${(app.stack || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>
      </div>
      <div class="figs">${figs}</div>
    </div>
    <footer class="sheet-foot">
      <dl class="mono">
        <div><dt>Product</dt><dd>${esc(app.name)}</dd></div>
        <div><dt>Platform</dt><dd>${esc(app.platform || '—')}</dd></div>
        <div><dt>Status</dt><dd>${statusLabel(app.status)}</dd></div>
      </dl>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-close>Back to board</button>
        ${extra}
        ${app.url ? `<a class="btn btn-primary" href="${esc(app.url)}" target="_blank" rel="noopener">Launch <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>` : ''}
      </div>
    </footer>`;
  sheetInner.querySelector('[data-close]').addEventListener('click', () => closeSheet());
}

function openSheet(id) {
  const app = window.__apps.find(a => a.id === id && a.status !== 'placeholder');
  if (!app) return;
  const chip = list.querySelector(`.chip[data-id="${CSS.escape(id)}"]`);
  lastTrigger = chip?.querySelector('button') || document.activeElement;
  renderSheet(app);
  setActive(id);
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('h2').focus?.();
}

function closeSheet() {
  if (sheet.open) sheet.close();
}

sheet.addEventListener('close', () => {
  board.classList.remove('is-zooming');
  setActive(null);
  if (location.hash.startsWith('#/apps/')) history.replaceState(null, '', location.pathname + location.search);
  lastTrigger?.focus?.();
});
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); }); // click on backdrop

function syncRoute() {
  const m = location.hash.match(/^#\/apps\/([\w-]+)$/);
  if (m) openSheet(m[1]); else closeSheet();
}
addEventListener('hashchange', syncRoute);

/* Pause pulses when the tab is hidden or the board is offscreen. */
function watchMotion() {
  const root = document.documentElement;
  let onScreen = true;
  const apply = () => {
    root.classList.toggle('is-paused', document.visibilityState === 'hidden' || !onScreen);
  };
  document.addEventListener('visibilitychange', apply);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      apply();
    }).observe(board);
  }
  apply();
}

/* ---------- boot ---------- */
async function boot() {
  watchMotion();
  const res = await fetch('apps.json', { cache: 'no-cache' });
  const data = await res.json();
  window.__apps = data.apps;
  const cfg = data.site || {};
  document.querySelectorAll('[data-config]').forEach(a => {
    const v = cfg[a.dataset.config];
    if (v) { a.href = v; a.hidden = false; }
  });
  const placed = layout(data.apps);
  drawDecor();
  drawNets(placed);
  drawChips(placed);
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  syncRoute();
}
boot().catch(err => console.error('apps.json failed to load', err));
