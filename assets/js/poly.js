/*!
 * Regression Lab — polynomial regression lesson
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const RL = window.RL;
  const { $, $$, SUP, fmt, fixed, esc, clamp, niceStep, niceDomain, Plot, highlight, makeQuiz, tocSpy, renderMath, copyText } = window.RLUI;

  const MAXDEG = 10;
  const supPow = (j) => (j === 1 ? '' : String(j).split('').map((c) => SUP[c]).join(''));
  const ordinal = (d) => ['', 'straight line', 'quadratic', 'cubic', 'quartic', 'quintic'][d] || `degree ${d}`;

  /** Pretty-print ŷ = β0 + β1x + β2x² … */
  function polyEq(beta, xName = 'x') {
    let s = 'ŷ = ';
    beta.forEach((b, j) => {
      const v = fmt(Math.abs(b), 4);
      const term = j === 0 ? v : `${v}${xName}${supPow(j)}`;
      if (j === 0) s += (b < 0 ? '−' : '') + term;
      else s += (b < 0 ? ' − ' : ' + ') + term;
    });
    return s;
  }
  /** Sample a function across [x0, x1] for drawing, clamping extreme values */
  function sample(f, x0, x1, y0, y1, n = 320) {
    const span = (y1 - y0) * 20, out = [];
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; out.push([x, clamp(f(x), y0 - span, y1 + span)]); }
    return out;
  }

  /* =================================================================== ANATOMY */
  const AN = { b3: 0, b2: 1, b1: 0, b0: -5 };
  const anPlot = new Plot($('#an-plot'), { W: 640, H: 420, xLabel: 'x', yLabel: 'y' });
  const PRESETS = { line: [0, 0, 2, 3], up: [0, 1, 0, -5], down: [0, -1.2, 2, 12], s: [0.4, 0, -6, 0] };
  function renderAnatomy() {
    const { b3, b2, b1, b0 } = AN;
    const f = (x) => ((b3 * x + b2) * x + b1) * x + b0;
    anPlot.setDomain(-5, 5, -30, 30);
    let c = anPlot.hline(0, 'line-ghost') + `<line class="line-ghost" x1="${anPlot.X(0)}" x2="${anPlot.X(0)}" y1="${anPlot.m.t}" y2="${anPlot.H - anPlot.m.b}"/>`;
    c += anPlot.path(sample(f, -5, 5, -30, 30), 'line-user');
    // turning points: roots of 3b3 x² + 2b2 x + b1
    const tps = [];
    const A = 3 * b3, B = 2 * b2, C = b1;
    if (Math.abs(A) > 1e-12) {
      const disc = B * B - 4 * A * C;
      if (disc > 1e-12) [(-B - Math.sqrt(disc)) / (2 * A), (-B + Math.sqrt(disc)) / (2 * A)].forEach((x) => tps.push(x));
    } else if (Math.abs(B) > 1e-12) tps.push(-C / B);
    tps.forEach((x) => { if (x >= -5 && x <= 5) c += `<circle class="dot-a" cx="${anPlot.X(x)}" cy="${anPlot.Y(f(x))}" r="6"/>`; });
    c += `<circle class="pt" cx="${anPlot.X(0)}" cy="${anPlot.Y(b0)}" r="5"/>`;
    anPlot.draw(c);

    const deg = Math.abs(b3) > 1e-9 ? 3 : Math.abs(b2) > 1e-9 ? 2 : Math.abs(b1) > 1e-9 ? 1 : 0;
    const lead = [b0, b1, b2, b3][deg];
    let ends;
    if (deg === 0) ends = 'Flat: y never changes.';
    else if (deg % 2 === 0) ends = lead > 0 ? 'Both ends point <b>up</b> (∪).' : 'Both ends point <b>down</b> (∩).';
    else ends = lead > 0 ? 'Falls on the left, <b>rises</b> on the right.' : 'Rises on the left, <b>falls</b> on the right.';
    let extra = '';
    if (deg === 2) {
      const vx = -b1 / (2 * b2);
      extra = `<dt>Vertex</dt><dd>x = −β₁ ÷ 2β₂ = ${fmt(vx, 3)}, y = ${fmt(f(vx), 3)} (${b2 > 0 ? 'minimum' : 'maximum'})</dd>`;
    }
    $('#an-facts').innerHTML = `<h4>What you are looking at</h4><dl class="facts">
      <dt>Degree</dt><dd>${deg} (${deg === 0 ? 'constant' : ordinal(deg)})</dd>
      <dt>Bends</dt><dd>${tps.length} turning point${tps.length === 1 ? '' : 's'} <span class="tiny">(at most ${Math.max(0, deg - 1)})</span></dd>
      <dt>End behaviour</dt><dd>${ends}</dd>
      <dt>y-intercept</dt><dd>β₀ = ${fmt(b0, 3)} (the black dot)</dd>${extra}</dl>`;
    const terms = [[b3, 'x³'], [b2, 'x²'], [b1, 'x'], [b0, '']].filter(([b]) => Math.abs(b) > 1e-9);
    $('#an-eq').textContent = 'y = ' + (terms.length ? terms.map(([b, t], i) => (i ? (b < 0 ? ' − ' : ' + ') : b < 0 ? '−' : '') + (t && Math.abs(Math.abs(b) - 1) < 1e-9 ? '' : fmt(Math.abs(b), 3)) + t).join('') : '0');
    ['b3', 'b2', 'b1', 'b0'].forEach((k) => { $(`#an-${k}-val`).textContent = fmt(AN[k], 3); });
  }
  ['b3', 'b2', 'b1', 'b0'].forEach((k) => $(`#an-${k}`).addEventListener('input', (e) => { AN[k] = +e.target.value; renderAnatomy(); }));
  $$('[data-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const [b3, b2, b1, b0] = PRESETS[btn.dataset.preset];
    Object.assign(AN, { b3, b2, b1, b0 });
    ['b3', 'b2', 'b1', 'b0'].forEach((k) => { $(`#an-${k}`).value = AN[k]; });
    renderAnatomy();
  }));

  /* ================================================================ PLAYGROUND */
  const P = { key: 'stopping', meta: null, pts: [], dom: [0, 1, 0, 1], deg: 1, showLine: true, showResid: true, wave: { n: 30, noise: 0.25, seed: 4 }, subs: [] };
  const ppPlot = new Plot($('#pp-plot'), { W: 680, H: 440 });
  const resPlot = new Plot($('#pp-resid'), { W: 680, H: 230, m: { l: 64, r: 18, t: 12, b: 44 }, yLabel: 'Residual e' });
  const xs = () => P.pts.map((p) => p[0]);
  const ys = () => P.pts.map((p) => p[1]);
  const enough = () => P.pts.length >= 3 && new Set(xs()).size >= 2;
  let FIT = null, LINE = null;

  const fitter = (deg, lam = 0) => (a, b) => RL.polyFit(a, b, deg, lam).predict;
  function refit() {
    if (!enough()) { FIT = LINE = null; return; }
    FIT = RL.polyFit(xs(), ys(), P.deg);
    LINE = RL.polyFit(xs(), ys(), 1);
  }
  function computeDomain() {
    if (P.meta.domain) return P.meta.domain.slice();
    if (P.pts.length < 2) return [0, 10, 0, 10];
    const [x0, x1] = P.key === 'wave' ? [0, 1] : niceDomain(Math.min(...xs()), Math.max(...xs()));
    const [y0, y1] = niceDomain(Math.min(...ys()), Math.max(...ys()), 0.15);
    return [x0, x1, y0, y1];
  }
  function setData(pts, meta, key) {
    P.pts = pts.map((p) => p.slice()); P.meta = meta; P.key = key;
    P.dom = computeDomain();
    ppPlot.xLabel = meta.xLabel; ppPlot.yLabel = meta.yLabel; resPlot.xLabel = meta.xLabel;
    $('#pds-story').textContent = meta.story || '';
    changed();
  }
  let raf = 0;
  function changed() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; refit(); renderPlayground(); P.subs.forEach((f) => f()); });
  }

  function renderPlayground() {
    const Pl = ppPlot;
    Pl.setDomain(...P.dom);
    const [x0, x1, y0, y1] = P.dom;
    let c = '';
    if (FIT && P.showResid) P.pts.forEach(([x, y]) => { c += `<line class="resid" x1="${Pl.X(x)}" x2="${Pl.X(x)}" y1="${Pl.Y(y)}" y2="${Pl.Y(FIT.predict(x))}"/>`; });
    if (LINE && P.showLine && P.deg > 1) c += Pl.path(sample(LINE.predict, x0, x1, y0, y1, 2), 'line-fit');
    if (FIT) c += Pl.path(sample(FIT.predict, x0, x1, y0, y1), 'line-user');
    P.pts.forEach(([x, y], i) => { c += `<circle class="pt drag${i === hoverIdx ? ' hover' : ''}" cx="${Pl.X(x)}" cy="${Pl.Y(y)}" r="6.5"/>`; });
    const over = !P.pts.length ? `<text x="${Pl.m.l + Pl.pw / 2}" y="${Pl.m.t + Pl.ph / 2}" text-anchor="middle" class="axis-label">Click to add points</text>`
      : !FIT ? `<text x="${Pl.m.l + Pl.pw / 2}" y="${Pl.m.t + 24}" text-anchor="middle" class="axis-label">Add at least 3 points to fit a curve</text>` : '';
    Pl.draw(c, over);

    // residual plot
    resPlot.setDomain(x0, x1, -1, 1);
    if (FIT) {
      const eD = P.pts.map(([x, y]) => y - FIT.predict(x));
      const eL = P.pts.map(([x, y]) => y - LINE.predict(x));
      const M = Math.max(...eL.map(Math.abs), ...eD.map(Math.abs), 1e-9) * 1.15;
      resPlot.setDomain(x0, x1, -M, M);
      let r = resPlot.hline(0, 'line-ghost');
      P.pts.forEach(([x], i) => { r += `<line class="resid" x1="${resPlot.X(x)}" x2="${resPlot.X(x)}" y1="${resPlot.Y(0)}" y2="${resPlot.Y(eD[i])}"/><circle class="pt" cx="${resPlot.X(x)}" cy="${resPlot.Y(eD[i])}" r="4.5"/>`; });
      resPlot.draw(r);
    } else resPlot.draw('');
    $('#pp-resid-deg').textContent = P.deg;
    $('#pp-deg-val').textContent = `${P.deg} (${ordinal(P.deg)})`;
    $('#pp-col-deg').textContent = `Degree ${P.deg}`;
    $('#pp-eq').textContent = FIT ? polyEq(FIT.beta) : '';
    renderMetrics();
  }

  function renderMetrics() {
    const body = $('#pp-metrics');
    if (!FIT) { body.innerHTML = '<tr><td colspan="3">Add at least three points.</td></tr>'; return; }
    const X = xs(), Y = ys();
    const mD = RL.metrics(Y, X.map(FIT.predict), P.deg), mL = RL.metrics(Y, X.map(LINE.predict), 1);
    mD.cv = RL.kFoldRMSE(X, Y, fitter(P.deg)); mL.cv = RL.kFoldRMSE(X, Y, fitter(1));
    const rows = [['MAE', 'mae', 'low'], ['MSE', 'mse', 'low'], ['RMSE', 'rmse', 'low'], ['R²', 'r2', 'high'], ['Adj. R²', 'adjR2', 'high'], ['CV RMSE', 'cv', 'low']];
    body.innerHTML = rows.map(([lab, k, dir]) => {
      const a = mD[k], z = mL[k];
      const ok = Number.isFinite(a) && Number.isFinite(z);
      const tol = 1e-9 * (Math.abs(z) + 1);
      const aB = ok && (dir === 'low' ? a < z - tol : a > z + tol), zB = ok && (dir === 'low' ? z < a - tol : z > a + tol);
      const show = (v) => (k === 'r2' || k === 'adjR2' ? `<span class="${v < 0 ? 'neg' : ''}">${fixed(v, 3)}</span>` : fmt(v));
      return `<tr${k === 'cv' ? ' class="cv-row"' : ''}><td>${lab}</td><td class="${aB ? 'better' : ''}">${show(a)}</td><td class="${zB ? 'better' : ''}">${show(z)}</td></tr>`;
    }).join('');
  }

  /* ---------- pointer interaction */
  let dragIdx = -1, hoverIdx = -1;
  const tip = $('#tooltip'), svg = $('#pp-plot');
  function nearest(px, py, r = 13) {
    let best = -1, bd = r * r;
    P.pts.forEach(([x, y], i) => { const d = (ppPlot.X(x) - px) ** 2 + (ppPlot.Y(y) - py) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const snap = (v, lo, hi) => { const st = niceStep(hi - lo, 400); return +(Math.round(v / st) * st).toPrecision(10); };
  svg.addEventListener('pointerdown', (e) => {
    const p = ppPlot.toData(e);
    let i = nearest(p.px, p.py);
    if (i < 0) {
      if (!ppPlot.inside(p.px, p.py)) return;
      P.pts.push([snap(p.x, P.dom[0], P.dom[1]), snap(p.y, P.dom[2], P.dom[3])]);
      i = P.pts.length - 1; changed();
    }
    dragIdx = i; svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    const p = ppPlot.toData(e);
    if (dragIdx >= 0) {
      const [x0, x1, y0, y1] = P.dom;
      P.pts[dragIdx] = [snap(clamp(p.x, x0, x1), x0, x1), snap(clamp(p.y, y0, y1), y0, y1)];
      changed();
    }
    const h = dragIdx >= 0 ? dragIdx : nearest(p.px, p.py);
    if (h !== hoverIdx) { hoverIdx = h; changed(); }
    if (h >= 0 && P.pts[h]) {
      const [x, y] = P.pts[h], yh = FIT ? FIT.predict(x) : NaN;
      tip.hidden = false;
      tip.textContent = `x = ${fmt(x)}, y = ${fmt(y)} · ŷ = ${fmt(yh)} · e = ${fmt(y - yh)}`;
      tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY - 30 + 'px';
    } else tip.hidden = true;
  });
  const endDrag = () => { dragIdx = -1; };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('pointerleave', () => { if (dragIdx < 0) { tip.hidden = true; hoverIdx = -1; changed(); } });
  svg.addEventListener('dblclick', (e) => {
    const p = ppPlot.toData(e), i = nearest(p.px, p.py);
    if (i >= 0) { P.pts.splice(i, 1); hoverIdx = -1; tip.hidden = true; changed(); }
  });

  /* ---------- controls */
  $('#pp-deg').addEventListener('input', (e) => { P.deg = +e.target.value; changed(); });
  $('#ptg-line').addEventListener('change', (e) => { P.showLine = e.target.checked; changed(); });
  $('#ptg-resid').addEventListener('change', (e) => { P.showResid = e.target.checked; changed(); });

  const BLANK = { title: 'Blank canvas', xLabel: 'x', yLabel: 'y', story: 'Click anywhere on the plot to add points. Try making a curve, then find the right degree.', domain: [0, 10, 0, 10] };
  const WAVE = { title: 'Random wave', xLabel: 'x', yLabel: 'y', xUnit: '', yUnit: '', story: 'Synthetic data from y = sin(2πx) + noise. The true curve is not a polynomial at all, yet a degree-3 to 5 polynomial approximates it well.' };
  const sel = $('#pds-select');
  function loadKey(key) {
    $('#pwave-controls').hidden = key !== 'wave';
    if (key === 'custom') return;
    if (key === 'blank') return setData([], BLANK, 'blank');
    if (key === 'wave') return genWave();
    const d = RL.POLY_DATASETS[key];
    setData(d.make(), d, key);
  }
  function genWave() {
    const w = P.wave;
    $('#pw-n-val').textContent = w.n; $('#pw-noise-val').textContent = w.noise.toFixed(2);
    setData(RL.curveData({ n: w.n, noise: w.noise, seed: w.seed }).map((p) => [+p.x.toFixed(3), +p.y.toFixed(3)]), WAVE, 'wave');
  }
  sel.addEventListener('change', () => loadKey(sel.value));
  $('#pw-n').addEventListener('input', (e) => { P.wave.n = +e.target.value; genWave(); });
  $('#pw-noise').addEventListener('input', (e) => { P.wave.noise = +e.target.value; genWave(); });
  $('#pw-go').addEventListener('click', () => { P.wave.seed++; genWave(); });

  $('#pbtn-import').addEventListener('click', () => { const p = $('#pimport-panel'); p.hidden = !p.hidden; });
  $('#pimport-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { $('#pimport-text').value = r.result; parseImport(); }; r.readAsText(f);
  });
  $('#pimport-go').addEventListener('click', parseImport);
  function parseImport() {
    const msg = $('#pimport-msg');
    const lines = $('#pimport-text').value.trim().split(/\r?\n/).filter((l) => l.trim());
    const pts = []; let header = null;
    lines.forEach((l, i) => {
      const parts = l.split(/[,;\t ]+/).filter(Boolean);
      const a = parseFloat(parts[0]), b = parseFloat(parts[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) pts.push([a, b]);
      else if (i === 0 && parts.length >= 2) header = parts;
    });
    if (pts.length < 3) { msg.className = 'msg err'; msg.textContent = 'Need at least three numeric rows of x, y.'; return; }
    const opt = sel.querySelector('option[value=custom]'); opt.disabled = false; sel.value = 'custom';
    $('#pwave-controls').hidden = true;
    setData(pts, { title: 'Your data', xLabel: header ? header[0] : 'x', yLabel: header ? header[1] : 'y', story: `Your dataset: ${pts.length} points.` }, 'custom');
    msg.className = 'msg ok'; msg.textContent = `Loaded ${pts.length} points.`;
  }
  $('#pbtn-export').addEventListener('click', () => {
    const csv = [`${P.meta.xLabel},${P.meta.yLabel}`.replace(/[^\w ,()%²°.-]/g, ''), ...P.pts.map((p) => p.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `polynomial-${P.key}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ============================================================ DESIGN MATRIX */
  P.subs.push(function designMatrix() {
    const t = $('#dm-table');
    if (!P.pts.length) { t.innerHTML = '<tbody><tr><td class="lab">Add points in the playground.</td></tr></tbody>'; return; }
    const d = P.deg;
    let powers = [];
    for (let j = 0; j <= d; j++) powers.push(j);
    if (d > 6) powers = [0, 1, 2, 3, null, d - 1, d];
    const head = powers.map((j) => (j === null ? '<th>…</th>' : `<th>${j === 0 ? '1' : 'x' + supPow(j)}</th>`)).join('');
    const rows = P.pts.slice(0, 8).map(([x], i) => `<tr><td class="lab">${i + 1}</td>${powers.map((j) => (j === null ? '<td>…</td>' : `<td>${fmt(x ** j, 4)}</td>`)).join('')}<td class="ycol">${fmt(P.pts[i][1])}</td></tr>`).join('');
    const maxRow = powers.map((j) => (j === null ? '<td>…</td>' : `<td>${fmt(Math.max(...xs().map((x) => Math.abs(x ** j))), 3)}</td>`)).join('');
    const more = P.pts.length > 8 ? `<tr><td class="lab" colspan="${powers.length + 2}">… ${P.pts.length - 8} more rows</td></tr>` : '';
    t.innerHTML = `<thead><tr><th style="text-align:left">#</th>${head}<th class="ycol">y</th></tr></thead><tbody>${rows}${more}</tbody>
      <tfoot><tr><td class="lab">Largest |value|</td>${maxRow}<td></td></tr></tfoot>`;
  });

  /* =================================================================== DEGREE */
  const dgRmse = new Plot($('#dg-rmse'), { W: 520, H: 360, xLabel: 'Degree d', yLabel: 'RMSE', logY: true });
  const dgR2 = new Plot($('#dg-r2'), { W: 520, H: 360, xLabel: 'Degree d', yLabel: 'R²' });
  $('#fold-diagram').innerHTML = [0, 1, 2, 3, 4].map((f) => `<div class="fold-row"><span>Round ${f + 1}</span>${[0, 1, 2, 3, 4].map((c) => `<i class="${c === f ? 'test' : ''}"></i>`).join('')}</div>`).join('') +
    '<div class="fold-key"><i></i> train <i class="test"></i> validation</div>';
  P.subs.push(function degreeCharts() {
    if (!enough()) { dgRmse.setDomain(0.5, 10.5, 0.1, 10); dgRmse.draw(''); dgR2.setDomain(0.5, 10.5, 0, 1); dgR2.draw(''); $('#dg-stats').innerHTML = ''; return; }
    const X = xs(), Y = ys(), rows = [];
    for (let d = 1; d <= MAXDEG; d++) {
      const f = RL.polyFit(X, Y, d);
      const m = RL.metrics(Y, X.map(f.predict), d);
      rows.push({ d, tr: m.rmse, cv: RL.kFoldRMSE(X, Y, fitter(d)), r2: m.r2, adj: m.adjR2 });
    }
    const valid = rows.filter((r) => Number.isFinite(r.cv));
    const best = valid.length ? valid.reduce((a, b) => (b.cv < a.cv ? b : a)) : null;
    const all = rows.flatMap((r) => [r.tr, r.cv]).filter((v) => Number.isFinite(v) && v > 0);
    const lo = Math.min(...all), hi = Math.max(...all);
    dgRmse.setDomain(0.5, MAXDEG + 0.5, 10 ** Math.floor(Math.log10(lo)), 10 ** Math.ceil(Math.log10(hi) + 1e-9));
    let c = dgRmse.path(rows.map((r) => [r.d, Math.max(r.tr, 1e-12)]), 'series-a') + dgRmse.path(valid.map((r) => [r.d, r.cv]), 'series-b');
    rows.forEach((r) => {
      c += `<circle class="dot-a" cx="${dgRmse.X(r.d)}" cy="${dgRmse.Y(Math.max(r.tr, 1e-12))}" r="3.5"/>`;
      if (Number.isFinite(r.cv)) c += `<circle class="dot-b" cx="${dgRmse.X(r.d)}" cy="${dgRmse.Y(r.cv)}" r="3.5"/>`;
    });
    if (best) c += `<circle class="best-ring" cx="${dgRmse.X(best.d)}" cy="${dgRmse.Y(best.cv)}" r="9"/>`;
    c += `<line class="marker" x1="${dgRmse.X(P.deg)}" x2="${dgRmse.X(P.deg)}" y1="${dgRmse.m.t}" y2="${dgRmse.H - dgRmse.m.b}"/>`;
    dgRmse.draw(c, dgRmse.legend([{ cls: 'series-a', label: 'Train RMSE' }, { cls: 'series-b', label: '5-fold CV RMSE' }], dgRmse.m.l + 14, dgRmse.m.t + 14));

    const r2v = rows.flatMap((r) => [r.r2, r.adj]).filter(Number.isFinite);
    const vmin = Math.max(-1, Math.min(...r2v));
    dgR2.setDomain(0.5, MAXDEG + 0.5, Math.max(-1, vmin - (1 - vmin) * 0.2), 1 + (1 - vmin) * 0.04);
    const adjValid = rows.filter((r) => Number.isFinite(r.adj));
    const bestAdj = adjValid.length ? adjValid.reduce((a, b) => (b.adj > a.adj ? b : a)) : null;
    let g = dgR2.path(rows.map((r) => [r.d, r.r2]), 'series-a') + dgR2.path(adjValid.map((r) => [r.d, Math.max(r.adj, -1)]), 'series-b');
    rows.forEach((r) => { g += `<circle class="dot-a" cx="${dgR2.X(r.d)}" cy="${dgR2.Y(r.r2)}" r="3.5"/>`; });
    adjValid.forEach((r) => { g += `<circle class="dot-b" cx="${dgR2.X(r.d)}" cy="${dgR2.Y(Math.max(r.adj, -1))}" r="3.5"/>`; });
    if (bestAdj) g += `<circle class="best-ring" cx="${dgR2.X(bestAdj.d)}" cy="${dgR2.Y(bestAdj.adj)}" r="9"/>`;
    g += `<line class="marker" x1="${dgR2.X(P.deg)}" x2="${dgR2.X(P.deg)}" y1="${dgR2.m.t}" y2="${dgR2.H - dgR2.m.b}"/>`;
    dgR2.draw(g, dgR2.legend([{ cls: 'series-a', label: 'R²' }, { cls: 'series-b', label: 'Adjusted R²' }], dgR2.W - dgR2.m.r - 130, dgR2.H - dgR2.m.b - 34));

    const cur = rows[P.deg - 1];
    $('#dg-stats').innerHTML = `
      <div class="stat good"><span>Best degree (CV)</span><b>${best ? best.d : '—'}</b></div>
      <div class="stat"><span>Its CV RMSE</span><b>${best ? fmt(best.cv) : '—'}</b></div>
      <div class="stat"><span>Your degree ${P.deg}: CV RMSE</span><b>${fmt(cur.cv)}</b></div>
      <div class="stat"><span>Your degree ${P.deg}: train RMSE</span><b>${fmt(cur.tr)}</b></div>
      <div class="stat"><span>Best degree (adj. R²)</span><b>${bestAdj ? bestAdj.d : '—'}</b></div>`;
  });

  /* ============================================================ EXTRAPOLATION */
  const exPlot = new Plot($('#ex-plot'), { W: 900, H: 420 });
  let EXT = 0.5;
  $('#ex-ext').addEventListener('input', (e) => { EXT = +e.target.value; extrapolation(); });
  function extrapolation() {
    $('#ex-ext-val').textContent = Math.round(EXT * 100) + '% of the data range';
    exPlot.xLabel = P.meta.xLabel; exPlot.yLabel = P.meta.yLabel;
    if (!enough()) { exPlot.setDomain(0, 1, 0, 1); exPlot.draw(''); return; }
    const X = xs(), Y = ys();
    const lo = Math.min(...X), hi = Math.max(...X), r = hi - lo;
    const ylo = Math.min(...Y), yhi = Math.max(...Y), yr = yhi - ylo || 1;
    const x0 = lo - EXT * r, x1 = hi + EXT * r, y0 = ylo - 0.9 * yr, y1 = yhi + 0.9 * yr;
    exPlot.setDomain(x0, x1, y0, y1);
    let c = `<rect class="data-band" x="${exPlot.X(lo)}" y="${exPlot.m.t}" width="${exPlot.X(hi) - exPlot.X(lo)}" height="${exPlot.ph}"/>`;
    const degs = [...new Set([1, 2, P.deg, 8])].filter((d) => d <= MAXDEG).sort((a, b) => a - b);
    const cls = (d) => (d === P.deg ? 'line-user' : d === 1 ? 'line-fit' : d === 2 ? 'series-c' : 'line-ghost');
    degs.forEach((d) => { const f = RL.polyFit(X, Y, d); c += exPlot.path(sample(f.predict, x0, x1, y0, y1, 400), cls(d)); });
    P.pts.forEach(([x, y]) => { c += `<circle class="pt" cx="${exPlot.X(x)}" cy="${exPlot.Y(y)}" r="4.5"/>`; });
    exPlot.draw(c, exPlot.legend(degs.map((d) => ({ cls: cls(d), label: `Degree ${d}${d === P.deg ? ' (your choice)' : ''}` })), exPlot.m.l + 14, exPlot.m.t + 14) +
      `<text class="band-label" x="${(exPlot.X(lo) + exPlot.X(hi)) / 2}" y="${exPlot.H - exPlot.m.b - 10}" text-anchor="middle">training data range</text>`);
  }
  P.subs.push(extrapolation);

  /* ==================================================================== RIDGE */
  const RG = { deg: 10, logLam: -3 };
  const rgPlot = new Plot($('#rg-plot'), { W: 520, H: 380 });
  const rgCv = new Plot($('#rg-cv'), { W: 520, H: 380, xLabel: 'log₁₀ λ', yLabel: 'CV RMSE', logY: true });
  $('#rg-deg').addEventListener('input', (e) => { RG.deg = +e.target.value; ridge(); });
  $('#rg-lam').addEventListener('input', (e) => { RG.logLam = +e.target.value; ridge(); });
  function ridge() {
    $('#rg-deg-val').textContent = RG.deg;
    const lam = 10 ** RG.logLam;
    $('#rg-lam-val').textContent = lam < 0.01 ? `10${String(Math.round(RG.logLam * 10) / 10).replace('-', '⁻').replace('.', '·').split('').map((c) => SUP[c] || c).join('')}` : fmt(lam, 3);
    rgPlot.xLabel = P.meta.xLabel; rgPlot.yLabel = P.meta.yLabel;
    if (!enough()) { rgPlot.setDomain(...P.dom); rgPlot.draw(''); rgCv.setDomain(-6, 2, 0.1, 10); rgCv.draw(''); $('#rg-bars').innerHTML = ''; $('#rg-stats').innerHTML = ''; return; }
    const X = xs(), Y = ys();
    const ols = RL.polyFit(X, Y, RG.deg), rdg = RL.polyFit(X, Y, RG.deg, lam);
    const [x0, x1, y0, y1] = P.dom;
    rgPlot.setDomain(x0, x1, y0, y1);
    let c = rgPlot.path(sample(ols.predict, x0, x1, y0, y1), 'line-fit') + rgPlot.path(sample(rdg.predict, x0, x1, y0, y1), 'line-user');
    P.pts.forEach(([x, y]) => { c += `<circle class="pt" cx="${rgPlot.X(x)}" cy="${rgPlot.Y(y)}" r="4.5"/>`; });
    rgPlot.draw(c, rgPlot.legend([{ cls: 'line-user', label: `Ridge, λ = ${fmt(lam, 2)}` }, { cls: 'line-fit', label: 'Least squares (λ = 0)' }], rgPlot.m.l + 14, rgPlot.m.t + 14));

    const grid = []; for (let v = -6; v <= 2.001; v += 0.25) grid.push(+v.toFixed(2));
    const cvs = grid.map((v) => RL.kFoldRMSE(X, Y, fitter(RG.deg, 10 ** v)));
    const cvOls = RL.kFoldRMSE(X, Y, fitter(RG.deg)), cvNow = RL.kFoldRMSE(X, Y, fitter(RG.deg, lam));
    const fin = cvs.concat([cvOls, cvNow]).filter((v) => Number.isFinite(v) && v > 0);
    rgCv.setDomain(-6, 2, 10 ** Math.floor(Math.log10(Math.min(...fin))), 10 ** Math.ceil(Math.log10(Math.max(...fin)) + 1e-9));
    const bi = cvs.reduce((b, v, i) => (v < cvs[b] ? i : b), 0);
    let g = rgCv.hline(cvOls, 'line-fit') + rgCv.path(grid.map((v, i) => [v, cvs[i]]), 'series-b');
    g += `<circle class="best-ring" cx="${rgCv.X(grid[bi])}" cy="${rgCv.Y(cvs[bi])}" r="9"/>`;
    g += `<line class="marker" x1="${rgCv.X(RG.logLam)}" x2="${rgCv.X(RG.logLam)}" y1="${rgCv.m.t}" y2="${rgCv.H - rgCv.m.b}"/><circle class="dot-b" cx="${rgCv.X(RG.logLam)}" cy="${rgCv.Y(cvNow)}" r="5"/>`;
    rgCv.draw(g, rgCv.legend([{ cls: 'series-b', label: 'Ridge' }, { cls: 'line-fit', label: 'Least squares' }], rgCv.m.l + 14, rgCv.m.t + 14));

    // coefficient bars (scaled basis, excluding intercept), log scale
    const a = ols.coef.slice(1).map(Math.abs), b = rdg.coef.slice(1).map(Math.abs);
    const top = Math.log10(Math.max(...a, ...b, 1e-9)), bottom = top - 6;
    const w = (v) => clamp((Math.log10(Math.max(v, 1e-300)) - bottom) / (top - bottom) * 100, 0, 100);
    $('#rg-bars').innerHTML = a.map((v, k) => `<div class="cbar"><span class="lab">β${String(k + 1).split('').map((ch) => '₀₁₂₃₄₅₆₇₈₉'[ch]).join('')}</span>
      <div class="tracks"><div class="track"><div class="fill fit" style="width:${w(v)}%"></div></div><div class="track"><div class="fill user" style="width:${w(b[k])}%"></div></div></div>
      <span class="val">${fmt(v, 3)}<br>${fmt(b[k], 3)}</span></div>`).join('');

    const trR = RL.metrics(Y, X.map(rdg.predict), RG.deg).rmse, trO = RL.metrics(Y, X.map(ols.predict), RG.deg).rmse;
    const norm = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    $('#rg-stats').innerHTML = `
      <div class="stat"><span>Train RMSE: LS / ridge</span><b>${fmt(trO, 3)} / ${fmt(trR, 3)}</b></div>
      <div class="stat ${cvNow < cvOls ? 'good' : ''}"><span>CV RMSE: LS / ridge</span><b>${fmt(cvOls, 3)} / ${fmt(cvNow, 3)}</b></div>
      <div class="stat good"><span>Best λ (CV)</span><b>${fmt(10 ** grid[bi], 2)}</b></div>
      <div class="stat"><span>Coefficient size ‖β‖: ridge ÷ LS</span><b>${(norm(b) / norm(a) * 100).toFixed(1)}%</b></div>`;
  }
  P.subs.push(ridge);

  /* ===================================================================== CODE */
  let codeTab = 'numpy';
  function pyArr(a) {
    const s = a.map((v) => String(+v.toPrecision(10)));
    const lines = []; for (let i = 0; i < s.length; i += 10) lines.push(s.slice(i, i + 10).join(', '));
    return '[' + lines.join(',\n              ') + ']';
  }
  const f4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : 'nan');
  function codeText() {
    if (!enough()) return '# Add at least three points in the playground to generate code.';
    const X = xs(), Y = ys(), d = P.deg;
    const m = RL.metrics(Y, X.map(FIT.predict), d);
    const head = `# Data: ${P.meta.title}\nx = np.array(${pyArr(X)})   # ${P.meta.xLabel}\ny = np.array(${pyArr(Y)})   # ${P.meta.yLabel}\n`;
    if (codeTab === 'numpy') return `import numpy as np

${head}degree = ${d}

# np.polyfit solves the least-squares problem on the features 1, x, x², …, x^degree
coefs = np.polyfit(x, y, degree)          # highest power first
y_hat = np.polyval(coefs, x)
print("coefficients (x^${d} … x^0):", np.round(coefs, 6))
# (For high degrees NumPy may warn the fit is poorly conditioned: scale x first.)

e = y - y_hat
n, p = len(y), degree                     # p = number of features (x, x², …)
mae    = np.mean(np.abs(e))
rmse   = np.sqrt(np.mean(e ** 2))
r2     = 1 - np.sum(e ** 2) / np.sum((y - y.mean()) ** 2)
adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)
for name, value in [("MAE", mae), ("RMSE", rmse), ("R²", r2), ("Adjusted R²", adj_r2)]:
    print(f"{name:12s} {value:.4f}")

# Expected metrics:
# MAE          ${f4(m.mae)}
# RMSE         ${f4(m.rmse)}
# R²           ${f4(m.r2)}
# Adjusted R²  ${f4(m.adjR2)}
`;
    if (codeTab === 'sklearn') return `import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

${head}X = x.reshape(-1, 1)

def poly_model(degree):
    """Expand x into x, x², …, scale the features, then fit ordinary least squares."""
    return make_pipeline(PolynomialFeatures(degree, include_bias=False),
                         StandardScaler(),
                         LinearRegression())

model = poly_model(${d}).fit(X, y)
pred = model.predict(X)
print(f"Train MAE : {mean_absolute_error(y, pred):.4f}")
print(f"Train RMSE: {np.sqrt(mean_squared_error(y, pred)):.4f}")
print(f"Train R²  : {r2_score(y, pred):.4f}")

# Choose the degree with 5-fold cross-validation
cv = KFold(n_splits=5, shuffle=True, random_state=0)
for d in range(1, 11):
    scores = cross_val_score(poly_model(d), X, y, cv=cv,
                             scoring="neg_root_mean_squared_error")
    print(f"degree {d:2d}   CV RMSE = {-scores.mean():.4f}")

# Expected (training metrics):
# Train MAE : ${f4(m.mae)}
# Train RMSE: ${f4(m.rmse)}
# Train R²  : ${f4(m.r2)}
# CV values will be close to, not identical to, the website's,
# because the folds are drawn differently.
`;
    return `import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import LinearRegression, Ridge, RidgeCV
from sklearn.model_selection import KFold, cross_val_score

${head}X = x.reshape(-1, 1)
degree = ${RG.deg}
cv = KFold(n_splits=5, shuffle=True, random_state=0)

def cv_rmse(model):
    return -cross_val_score(model, X, y, cv=cv, scoring="neg_root_mean_squared_error").mean()

features = lambda: [PolynomialFeatures(degree, include_bias=False), StandardScaler()]
ols   = make_pipeline(*features(), LinearRegression())
ridge = make_pipeline(*features(), Ridge(alpha=1.0))
print(f"Least squares CV RMSE: {cv_rmse(ols):.4f}")
print(f"Ridge (alpha=1) CV RMSE: {cv_rmse(ridge):.4f}")

# Let cross-validation choose the penalty
search = make_pipeline(*features(), RidgeCV(alphas=np.logspace(-6, 2, 33)))
search.fit(X, y)
print("best alpha:", search[-1].alpha_)
print("coefficients:", np.round(search[-1].coef_, 3))

# Note: scikit-learn standardises features to mean 0 / std 1, while this
# website maps x to [-1, 1], so the best λ values are on different scales.
`;
  }
  function renderCode() { $('#pcode-block').innerHTML = highlight(codeText()); }
  $$('#code .seg-btn').forEach((btn) => btn.addEventListener('click', () => {
    $$('#code .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    codeTab = btn.dataset.code; renderCode();
  }));
  $('#pcode-copy').addEventListener('click', async () => {
    await copyText(codeText());
    $('#pcode-copy').textContent = 'Copied ✓'; setTimeout(() => { $('#pcode-copy').textContent = 'Copy'; }, 1500);
  });
  P.subs.push(renderCode);
  ['#rg-deg', '#rg-lam'].forEach((id) => $(id).addEventListener('input', () => { if (codeTab === 'ridge') renderCode(); }));

  /* ===================================================================== QUIZ */
  makeQuiz($('#pquiz-box'), $('#pquiz-score'), [
    { q: 'Is ŷ = β₀ + β₁x + β₂x² a linear model?',
      o: ['No, it contains x², so it is non-linear', 'Yes: it is linear in the coefficients β, so ordinary least squares still applies', 'Only when β₂ = 0', 'Only if x is standardised'], a: 1,
      why: '“Linear” in linear regression refers to the parameters. Each β multiplies a fixed feature (1, x, x²), so we fit it exactly like multiple linear regression on engineered features.' },
    { q: 'After fitting a straight line, the residual plot shows a clear U-shape. What does this suggest?',
      o: ['The model is overfitting', 'The data has outliers', 'The relationship is curved: try adding a quadratic term', 'The learning rate is too high'], a: 2,
      why: 'A systematic pattern in the residuals means the model is missing structure. A U-shape is the classic sign that a squared term is needed.' },
    { q: 'You raise the degree from 3 to 9 on the same training data. What happens to the training RMSE?',
      o: ['It can only stay the same or decrease', 'It always increases', 'It is unpredictable', 'It always becomes exactly 0'], a: 0,
      why: 'A degree-9 model contains every degree-3 model (just set the extra coefficients to 0), so least squares can never do worse on the training data. That is exactly why training error cannot choose the degree.' },
    { q: 'What is the most reliable way to choose the polynomial degree?',
      o: ['The highest R² on the training data', 'The lowest training RMSE', 'The lowest cross-validated (held-out) error', 'Always use degree 2'], a: 2,
      why: 'Cross-validation measures error on data the model did not see during fitting, which is what we care about. Adjusted R² is a cheaper approximation.' },
    { q: 'You fit a degree-9 polynomial to 10 data points. What do you expect?',
      o: ['A smooth, reliable curve', 'The curve passes through every point (training error ≈ 0) but generalises poorly', 'An error, because it cannot be fitted', 'The same result as a straight line'], a: 1,
      why: 'With as many coefficients as points, the polynomial can interpolate every point exactly. It memorises the noise, a textbook case of overfitting.' },
    { q: 'Why should you scale x before fitting a high-degree polynomial?',
      o: ['It makes the curve smoother', 'Powers like x¹⁰ create columns of wildly different magnitudes, which makes the computation unstable and the ridge penalty unfair', 'Scikit-learn requires it', 'It increases R²'], a: 1,
      why: 'If x ≈ 100 then x¹⁰ ≈ 10²⁰. Ill-conditioned matrices lose precision, and a penalty on β would treat features on different scales unequally.' },
    { q: 'In ridge regression, what happens as λ becomes very large?',
      o: ['The curve wiggles more', 'Coefficients shrink towards 0 and the curve flattens towards the mean ȳ', 'Training error falls', 'The degree increases'], a: 1,
      why: 'The penalty dominates the loss, so the cheapest solution is β₁ … β_d ≈ 0, leaving only the unpenalised intercept: a flat line at ȳ.' },
    { q: 'A stopping-distance model was trained on speeds of 20–130 km/h. How far should you trust its prediction at 250 km/h?',
      o: ['Fully: the curve fits well', 'Only if R² > 0.95', 'Very little: that is extrapolation far outside the training range', 'Only for degree 1'], a: 2,
      why: 'Outside the data, a polynomial’s highest power takes over and different degrees can disagree wildly. The model has no evidence about that region.' },
    { q: 'At most how many turning points (bends) can a degree-4 polynomial have?',
      o: ['1', '2', '3', '4'], a: 2,
      why: 'Its derivative has degree 3 and so at most 3 roots. In general, degree d allows at most d − 1 turning points.' },
  ]);

  /* ===================================================================== INIT */
  renderMath();
  tocSpy();
  renderAnatomy();
  sel.value = 'stopping';
  loadKey('stopping');
  window.PolyLab = { P, RG, get FIT() { return FIT; } };
})();
