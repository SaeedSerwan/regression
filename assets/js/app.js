/*!
 * Regression Lab — interactive front end
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const RL = window.RL;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const { fmt, fixed, pval, esc, clamp, niceStep, ticks, niceDomain, tickLabel, Plot, highlight } = window.RLUI;

  /* ================================================================ PLAYGROUND */
  const PG = {
    key: 'study', meta: null, pts: [], dom: [0, 10, 0, 10],
    user: { m: 0, b: 0 }, best: { m: 0, b: 0 },
    showBest: false, showResid: true, showSquares: false, showMean: false,
    metricSrc: 'best',
    rnd: { n: 25, noise: 2, slope: 1.5, seed: 1 },
    subscribers: [],
  };
  const pgPlot = new Plot($('#pg-plot'), { W: 680, H: 470 });
  const xs = () => PG.pts.map((p) => p[0]);
  const ys = () => PG.pts.map((p) => p[1]);
  const meanY = () => (PG.pts.length ? RL.mean(ys()) : (PG.dom[2] + PG.dom[3]) / 2);
  const lineFor = (src) => (src === 'user' ? PG.user : PG.best);

  function computeDomain() {
    if (PG.meta.domain) return PG.meta.domain.slice();
    if (PG.pts.length < 2) return [0, 10, 0, 10];
    const X = xs(), Y = ys();
    const [x0, x1] = PG.key === 'random' ? [0, 10] : niceDomain(Math.min(...X), Math.max(...X));
    const [y0, y1] = niceDomain(Math.min(...Y), Math.max(...Y), 0.12);
    return [x0, x1, y0, y1];
  }

  const mS = $('#m-slider'), bS = $('#b-slider');
  function setSliderRanges() {
    const [x0, x1, y0, y1] = PG.dom;
    const k = (y1 - y0) / (x1 - x0);
    const mc = PG.best.m;
    const mMin = mc - 3 * k, mMax = mc + 3 * k;
    const corners = [mMin * x0, mMin * x1, mMax * x0, mMax * x1];
    const bMin = y0 - Math.max(...corners), bMax = y1 - Math.min(...corners);
    Object.assign(mS, { min: mMin, max: mMax, step: (mMax - mMin) / 1000 });
    Object.assign(bS, { min: bMin, max: bMax, step: (bMax - bMin) / 1000 });
  }
  function syncSliders() {
    mS.value = PG.user.m; bS.value = PG.user.b;
    $('#m-val').textContent = fmt(PG.user.m);
    $('#b-val').textContent = fmt(PG.user.b);
  }

  function refit() { PG.best = PG.pts.length >= 2 ? RL.ols(xs(), ys()) : { m: 0, b: meanY() }; }

  function setData(pts, meta, key) {
    PG.pts = pts.map((p) => p.slice());
    PG.meta = meta; PG.key = key;
    refit();
    PG.dom = computeDomain();
    setSliderRanges();
    // start with a deliberately imperfect line so there is something to improve
    const [, , y0, y1] = PG.dom;
    const m = PG.best.m * 0.4;
    const mx = PG.pts.length ? RL.mean(xs()) : (PG.dom[0] + PG.dom[1]) / 2;
    PG.user = { m, b: meanY() - m * mx + 0.14 * (y1 - y0) };
    syncSliders();
    pgPlot.xLabel = meta.xLabel; pgPlot.yLabel = meta.yLabel;
    $('#ds-story').textContent = meta.story || '';
    changed();
  }

  let raf = 0;
  function changed() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; renderPlayground(); PG.subscribers.forEach((f) => f()); });
  }

  function renderPlayground() {
    const P = pgPlot;
    P.setDomain(...PG.dom);
    const { m, b } = PG.user;
    let c = '';
    if (PG.showMean && PG.pts.length) c += P.hline(meanY(), 'line-mean');
    if (PG.showSquares) {
      const right = P.W - P.m.r;
      PG.pts.forEach(([x, y]) => {
        const py = P.Y(y), ph = P.Y(m * x + b), L = Math.abs(py - ph), px = P.X(x);
        const sx = px + L > right ? px - L : px;
        c += `<rect class="sq" x="${sx}" y="${Math.min(py, ph)}" width="${L}" height="${L}"/>`;
      });
    }
    if (PG.showResid) PG.pts.forEach(([x, y]) => { c += `<line class="resid" x1="${P.X(x)}" x2="${P.X(x)}" y1="${P.Y(y)}" y2="${P.Y(m * x + b)}"/>`; });
    if (PG.showBest && PG.pts.length >= 2) c += P.line(PG.best.m, PG.best.b, 'line-fit');
    c += P.line(m, b, 'line-user');
    PG.pts.forEach(([x, y], i) => { c += `<circle class="pt drag${i === hoverIdx ? ' hover' : ''}" cx="${P.X(x)}" cy="${P.Y(y)}" r="6.5"/>`; });
    let over = '';
    if (!PG.pts.length) over = `<text x="${P.m.l + P.pw / 2}" y="${P.m.t + P.ph / 2}" text-anchor="middle" class="axis-label">Click to add points</text>`;
    P.draw(c, over);
    $('#user-eq').textContent = `ŷ = ${fmt(m)}x ${PG.user.b < 0 ? '−' : '+'} ${fmt(Math.abs(PG.user.b))}`;
    $('#best-eq').textContent = PG.pts.length >= 2 ? `ŷ = ${fmt(PG.best.m)}x ${PG.best.b < 0 ? '−' : '+'} ${fmt(Math.abs(PG.best.b))}` : '';
    renderMetricTable();
  }

  function renderMetricTable() {
    const body = $('#metric-body');
    if (PG.pts.length < 2) { body.innerHTML = '<tr><td colspan="3">Add at least two points.</td></tr>'; $('#meter-val').textContent = '—'; $('#meter-fill').style.width = '0'; return; }
    const X = xs(), Y = ys();
    const u = RL.lineMetrics(X, Y, PG.user.m, PG.user.b), f = RL.lineMetrics(X, Y, PG.best.m, PG.best.b);
    const rows = [
      ['MAE', 'mae', 'low'], ['MSE', 'mse', 'low'], ['RMSE', 'rmse', 'low'],
      ['R²', 'r2', 'high'], ['Adj. R²', 'adjR2', 'high'], ['MAPE', 'mape', 'low'], ['SSE', 'sse', 'low'],
    ];
    body.innerHTML = rows.map(([lab, k, dir]) => {
      const a = u[k], z = f[k];
      const tol = 1e-9 * (Math.abs(z) + 1);
      const uBetter = dir === 'low' ? a < z - tol : a > z + tol;
      const fBetter = dir === 'low' ? z < a - tol : z > a + tol;
      const show = (v) => (k === 'mape' ? (Number.isFinite(v) ? v.toFixed(2) + '%' : '—') : k.includes('r2') || k === 'adjR2' ? `<span class="${v < 0 ? 'neg' : ''}">${fixed(v, 3)}</span>` : fmt(v));
      return `<tr><td>${lab}</td><td class="${uBetter ? 'better' : ''}">${show(a)}</td><td class="${fBetter ? 'better' : ''}">${show(z)}</td></tr>`;
    }).join('');
    const ratio = u.sse > 0 ? clamp(f.sse / u.sse, 0, 1) : 1;
    $('#meter-val').textContent = (ratio * 100).toFixed(1) + '%';
    $('#meter-fill').style.width = ratio * 100 + '%';
  }

  /* ---------- pointer interaction */
  let dragIdx = -1, hoverIdx = -1;
  const tip = $('#tooltip');
  function nearest(px, py, r = 13) {
    let best = -1, bd = r * r;
    PG.pts.forEach(([x, y], i) => {
      const d = (pgPlot.X(x) - px) ** 2 + (pgPlot.Y(y) - py) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function snap(v, lo, hi) { const st = niceStep(hi - lo, 400); return +(Math.round(v / st) * st).toPrecision(10); }
  const svgPG = $('#pg-plot');
  svgPG.addEventListener('pointerdown', (e) => {
    const p = pgPlot.toData(e);
    let i = nearest(p.px, p.py);
    if (i < 0) {
      if (!pgPlot.inside(p.px, p.py)) return;
      PG.pts.push([snap(p.x, PG.dom[0], PG.dom[1]), snap(p.y, PG.dom[2], PG.dom[3])]);
      i = PG.pts.length - 1;
      refit(); changed();
    }
    dragIdx = i;
    svgPG.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svgPG.addEventListener('pointermove', (e) => {
    const p = pgPlot.toData(e);
    if (dragIdx >= 0) {
      const [x0, x1, y0, y1] = PG.dom;
      PG.pts[dragIdx] = [snap(clamp(p.x, x0, x1), x0, x1), snap(clamp(p.y, y0, y1), y0, y1)];
      refit(); changed();
    }
    const h = dragIdx >= 0 ? dragIdx : nearest(p.px, p.py);
    if (h !== hoverIdx) { hoverIdx = h; changed(); }
    if (h >= 0) {
      const [x, y] = PG.pts[h], yh = PG.user.m * x + PG.user.b;
      tip.hidden = false;
      tip.textContent = `x = ${fmt(x)}, y = ${fmt(y)} · ŷ = ${fmt(yh)} · e = ${fmt(y - yh)}`;
      tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY - 30 + 'px';
    } else tip.hidden = true;
  });
  const endDrag = () => { dragIdx = -1; };
  svgPG.addEventListener('pointerup', endDrag);
  svgPG.addEventListener('pointercancel', endDrag);
  svgPG.addEventListener('pointerleave', () => { if (dragIdx < 0) { tip.hidden = true; hoverIdx = -1; changed(); } });
  svgPG.addEventListener('dblclick', (e) => {
    const p = pgPlot.toData(e);
    const i = nearest(p.px, p.py);
    if (i >= 0) { PG.pts.splice(i, 1); hoverIdx = -1; tip.hidden = true; refit(); changed(); }
  });

  /* ---------- controls */
  mS.addEventListener('input', () => { PG.user.m = +mS.value; $('#m-val').textContent = fmt(PG.user.m); changed(); });
  bS.addEventListener('input', () => { PG.user.b = +bS.value; $('#b-val').textContent = fmt(PG.user.b); changed(); });
  $('#btn-snap').addEventListener('click', () => { PG.user = { ...PG.best }; setSliderRangesIfNeeded(); syncSliders(); changed(); });
  $('#btn-flat').addEventListener('click', () => { PG.user = { m: 0, b: meanY() }; setSliderRangesIfNeeded(); syncSliders(); changed(); });
  function setSliderRangesIfNeeded() {
    if (PG.user.m < +mS.min || PG.user.m > +mS.max || PG.user.b < +bS.min || PG.user.b > +bS.max) setSliderRanges();
  }
  [['#tg-best', 'showBest'], ['#tg-resid', 'showResid'], ['#tg-squares', 'showSquares'], ['#tg-mean', 'showMean']].forEach(([id, k]) => {
    const el = $(id); el.checked = PG[k];
    el.addEventListener('change', () => { PG[k] = el.checked; changed(); });
  });

  const dsSel = $('#ds-select');
  function loadKey(key) {
    $('#random-controls').hidden = key !== 'random';
    if (key === 'random') return genRandom();
    if (key === 'custom') return;
    const d = RL.DATASETS[key];
    setData(d.make(), d, key);
  }
  dsSel.addEventListener('change', () => loadKey(dsSel.value));

  const RANDOM_META = { title: 'Random linear data', xLabel: 'x', yLabel: 'y', xUnit: '', yUnit: '', story: 'Synthetic data: y = 2 + (true slope)·x + Gaussian noise. Raise the noise and watch R² fall while RMSE rises.' };
  function genRandom() {
    const r = PG.rnd;
    $('#rnd-n-val').textContent = r.n; $('#rnd-noise-val').textContent = r.noise.toFixed(1); $('#rnd-slope-val').textContent = r.slope.toFixed(1);
    setData(RL.randomLinear({ n: r.n, noise: r.noise, slope: r.slope, intercept: 2, seed: r.seed }), RANDOM_META, 'random');
  }
  [['#rnd-n', 'n'], ['#rnd-noise', 'noise'], ['#rnd-slope', 'slope']].forEach(([id, k]) => {
    $(id).addEventListener('input', (e) => { PG.rnd[k] = +e.target.value; genRandom(); });
  });
  $('#rnd-go').addEventListener('click', () => { PG.rnd.seed++; genRandom(); });

  /* ---------- import / export */
  $('#btn-import').addEventListener('click', () => { const p = $('#import-panel'); p.hidden = !p.hidden; });
  $('#import-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { $('#import-text').value = r.result; parseImport(); };
    r.readAsText(f);
  });
  $('#import-go').addEventListener('click', parseImport);
  function parseImport() {
    const msg = $('#import-msg');
    const lines = $('#import-text').value.trim().split(/\r?\n/).filter((l) => l.trim());
    const pts = []; let header = null;
    lines.forEach((l, i) => {
      const parts = l.split(/[,;\t ]+/).filter(Boolean);
      const a = parseFloat(parts[0]), b = parseFloat(parts[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) pts.push([a, b]);
      else if (i === 0 && parts.length >= 2) header = parts;
    });
    if (pts.length < 2) { msg.className = 'msg err'; msg.textContent = 'Need at least two numeric rows of x, y.'; return; }
    const opt = dsSel.querySelector('option[value=custom]');
    opt.disabled = false; dsSel.value = 'custom';
    $('#random-controls').hidden = true;
    setData(pts, { title: 'Your data', xLabel: header ? header[0] : 'x', yLabel: header ? header[1] : 'y', xUnit: '', yUnit: '', story: `Your dataset: ${pts.length} points.` }, 'custom');
    msg.className = 'msg ok'; msg.textContent = `Loaded ${pts.length} points.`;
  }
  $('#btn-export').addEventListener('click', () => {
    const csv = [`${PG.meta.xLabel},${PG.meta.yLabel}`.replace(/[^\w ,()%²°.-]/g, ''), ...PG.pts.map((p) => p.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `regression-${PG.key}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ============================================================ LEAST SQUARES */
  PG.subscribers.push(function leastSquares() {
    if (PG.pts.length < 2) { ['#ls-sum-e', '#ls-sum-abs', '#ls-sum-sq'].forEach((s) => { $(s).textContent = '—'; }); $('#ls-calc').textContent = 'Add at least two points.'; return; }
    const X = xs(), Y = ys(), { m, b } = PG.user;
    let se = 0, sa = 0, sq = 0;
    X.forEach((x, i) => { const e = Y[i] - (m * x + b); se += e; sa += Math.abs(e); sq += e * e; });
    $('#ls-sum-e').textContent = fmt(se); $('#ls-sum-abs').textContent = fmt(sa); $('#ls-sum-sq').textContent = fmt(sq);
    const mx = RL.mean(X), my = RL.mean(Y);
    let sxy = 0, sxx = 0;
    X.forEach((x, i) => { sxy += (x - mx) * (Y[i] - my); sxx += (x - mx) ** 2; });
    $('#ls-calc').innerHTML = `On the current data: x̄ = ${fmt(mx)}, ȳ = ${fmt(my)}<br>m = ${fmt(sxy)} ÷ ${fmt(sxx)} = <b>${fmt(PG.best.m)}</b><br>b = ${fmt(my)} − ${fmt(PG.best.m)} × ${fmt(mx)} = <b>${fmt(PG.best.b)}</b>`;
  });

  /* ================================================================== METRICS */
  const CARDS = [
    { k: 'mae', name: 'MAE', full: 'Mean Absolute Error', tex: String.raw`\text{MAE} = \frac{1}{n}\sum_{i=1}^{n}\lvert y_i-\hat y_i\rvert`,
      plain: 'The average size of a miss, ignoring direction. The most intuitive error metric.', units: 'Same as y', range: '0 → ∞, lower is better',
      watch: 'Every unit of error counts the same: a 10-unit miss is exactly twice as bad as a 5-unit miss.' },
    { k: 'mse', name: 'MSE', full: 'Mean Squared Error', tex: String.raw`\text{MSE} = \frac{1}{n}\sum_{i=1}^{n}(y_i-\hat y_i)^2`,
      plain: 'The average squared miss. This is the quantity least squares minimises and the usual training loss.', units: 'y² (hard to read directly)', range: '0 → ∞, lower is better',
      watch: 'Squaring lets large errors dominate: one outlier can swamp it.', sq: true },
    { k: 'rmse', name: 'RMSE', full: 'Root Mean Squared Error', tex: String.raw`\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat y_i)^2}`,
      plain: 'MSE converted back to the units of y: a typical error that gives extra weight to big misses.', units: 'Same as y', range: '0 → ∞, lower is better',
      watch: 'Always ≥ MAE. A large RMSE ÷ MAE ratio means a few big errors.' },
    { k: 'r2', name: 'R²', full: 'Coefficient of determination', tex: String.raw`R^2 = 1-\frac{\text{SSE}}{\text{SST}} = 1-\frac{\sum (y_i-\hat y_i)^2}{\sum (y_i-\bar y)^2}`,
      plain: 'The fraction of the variation in y that the model explains, compared with always predicting the mean.', units: 'Unitless', range: '−∞ → 1; 1 is perfect, 0 = no better than ȳ',
      watch: 'Never decreases when you add features, even useless ones. Becomes negative when the model is worse than the mean.', unitless: true },
    { k: 'adjR2', name: 'Adjusted R²', full: 'R² penalised for model size', tex: String.raw`\bar R^2 = 1-(1-R^2)\,\frac{n-1}{n-p-1}`,
      plain: 'R² with a penalty for every extra feature p, so adding junk features no longer looks like progress.', units: 'Unitless', range: '≤ R²',
      watch: 'Here p = 1. The adjustment matters most in multiple regression and with small n.', unitless: true },
    { k: 'mape', name: 'MAPE', full: 'Mean Absolute Percentage Error', tex: String.raw`\text{MAPE} = \frac{100\%}{n}\sum_{i=1}^{n}\left\lvert\frac{y_i-\hat y_i}{y_i}\right\rvert`,
      plain: 'The average miss as a percentage of the true value. Easy to communicate to non-specialists.', units: 'Percent', range: '0 → ∞, lower is better',
      watch: 'Undefined when y = 0 and explodes when y is near 0. Points with y = 0 are skipped here.', pct: true },
  ];
  $('#metric-cards').innerHTML = CARDS.map((c) => `
    <article class="mcard">
      <header><h4>${c.name}</h4><span class="live" id="live-${c.k}">—</span></header>
      <span class="full">${c.full}</span>
      <div class="f" data-tex="${esc(c.tex)}"></div>
      <p>${c.plain}</p>
      <dl><dt>Units</dt><dd>${c.units}</dd><dt>Range</dt><dd>${c.range}</dd><dt>Watch out</dt><dd>${c.watch}</dd></dl>
    </article>`).join('');
  $$('#metric-cards [data-tex]').forEach((el) => { try { katex.render(el.dataset.tex, el, { displayMode: true, throwOnError: false }); } catch (e) { el.textContent = el.dataset.tex; } });

  $$('#metrics .seg-btn').forEach((btn) => btn.addEventListener('click', () => {
    $$('#metrics .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    PG.metricSrc = btn.dataset.src;
    $('#metric-src-label').textContent = btn.dataset.src === 'user' ? 'your line' : 'best-fit line';
    PG.subscribers.forEach((f) => f());
  }));

  PG.subscribers.push(function metricCards() {
    const enough = PG.pts.length >= 2;
    const L = lineFor(PG.metricSrc);
    const met = enough ? RL.lineMetrics(xs(), ys(), L.m, L.b) : {};
    const yu = PG.meta.yUnit ? ' ' + PG.meta.yUnit : '';
    CARDS.forEach((c) => {
      const v = met[c.k];
      let s = '—';
      if (enough && Number.isFinite(v)) s = c.pct ? v.toFixed(2) + '%' : c.unitless ? fixed(v, 3) : fmt(v) + (c.sq && yu ? yu + '²' : yu);
      $('#live-' + c.k).textContent = s;
    });
    renderResidTable(met, L);
    renderR2Bars();
  });

  function renderResidTable(met, L) {
    const t = $('#resid-table');
    if (PG.pts.length < 2) { t.innerHTML = '<tbody><tr><td class="lab">Add at least two points in the playground.</td></tr></tbody>'; return; }
    const rows = PG.pts.map(([x, y], i) => {
      const yh = L.m * x + L.b, e = y - yh;
      return `<tr><td class="lab">${i + 1}</td><td>${fmt(x)}</td><td>${fmt(y)}</td><td>${fmt(yh)}</td><td>${fmt(e)}</td><td>${fmt(Math.abs(e))}</td><td>${fmt(e * e)}</td><td>${y !== 0 ? (Math.abs(e / y) * 100).toFixed(2) + '%' : '—'}</td></tr>`;
    }).join('');
    const n = PG.pts.length;
    t.innerHTML = `<thead><tr><th style="text-align:left">#</th><th>x</th><th>y</th><th>ŷ</th><th>e = y − ŷ</th><th>|e|</th><th>e²</th><th>|e / y|</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td class="lab" colspan="4">Sum (n = ${n})</td><td>${fmt(met.meanError * n)}</td><td>${fmt(met.mae * n)}</td><td>SSE ${fmt(met.sse)}</td><td></td></tr>
        <tr><td class="lab" colspan="4">Mean = sum ÷ n</td><td>${fmt(met.meanError)}</td><td>MAE ${fmt(met.mae)}</td><td>MSE ${fmt(met.mse)}</td><td>MAPE ${Number.isFinite(met.mape) ? met.mape.toFixed(2) + '%' : '—'}</td></tr>
        <tr><td class="lab" colspan="6">RMSE = √MSE</td><td>${fmt(met.rmse)}</td><td></td></tr>
      </tfoot>`;
  }

  function renderR2Bars() {
    const box = $('#r2-bars');
    if (PG.pts.length < 2) { box.innerHTML = ''; return; }
    const X = xs(), Y = ys();
    box.innerHTML = [['Best fit', PG.best, 'fit'], ['Your line', PG.user, '']].map(([name, L, cls]) => {
      const m = RL.lineMetrics(X, Y, L.m, L.b);
      const max = Math.max(m.sst, m.sse) || 1;
      const over = m.sse > m.sst;
      return `<div class="r2-row"><div class="head"><span><strong style="color:var(--${cls || 'user'})">${name}</strong></span>
        <span>R² = 1 − ${fmt(m.sse)} ÷ ${fmt(m.sst)} = <b class="${m.r2 < 0 ? 'nsig' : ''}">${fixed(m.r2, 3)}</b></span></div>
        <div class="bar"><span class="lab">SST</span><div class="track"><div class="fill sst" style="width:${m.sst / max * 100}%"></div></div><span class="val">${fmt(m.sst)}</span></div>
        <div class="bar"><span class="lab">SSE</span><div class="track"><div class="fill sse ${cls} ${over ? 'over' : ''}" style="width:${m.sse / max * 100}%"></div></div><span class="val">${fmt(m.sse)}</span></div>
      </div>`;
    }).join('');
  }

  /* ================================================================= OUTLIERS */
  const OUT = (() => {
    const base = RL.randomLinear({ n: 14, slope: 1.2, intercept: 3, noise: 0.9, seed: 8 });
    const ox = 7, oy = 3 + 1.2 * ox;
    return { base, ox, oy, offset: 0, refit: true, baseFit: RL.ols(base.map((p) => p[0]), base.map((p) => p[1])) };
  })();
  const outPlot = new Plot($('#out-plot'), { W: 520, H: 380, xLabel: 'x', yLabel: 'y' });
  const outChart = new Plot($('#out-chart'), { W: 520, H: 380, xLabel: 'Outlier offset', yLabel: 'Error' });
  function outlierMetrics(off) {
    const pts = OUT.base.concat([[OUT.ox, OUT.oy + off]]);
    const X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
    const L = OUT.refit ? RL.ols(X, Y) : OUT.baseFit;
    return { pts, L, met: RL.lineMetrics(X, Y, L.m, L.b), oe: (OUT.oy + off) - (L.m * OUT.ox + L.b) };
  }
  function renderOutliers() {
    const { pts, L, met, oe } = outlierMetrics(OUT.offset);
    outPlot.setDomain(0, 10, -15, 40);
    let c = outPlot.line(OUT.baseFit.m, OUT.baseFit.b, 'line-ghost') + outPlot.line(L.m, L.b, 'line-fit solid');
    pts.forEach(([x, y], i) => {
      const yh = L.m * x + L.b;
      c += `<line class="resid fit" x1="${outPlot.X(x)}" x2="${outPlot.X(x)}" y1="${outPlot.Y(y)}" y2="${outPlot.Y(yh)}"/>`;
      c += `<circle class="pt${i === pts.length - 1 ? ' out' : ''}" cx="${outPlot.X(x)}" cy="${outPlot.Y(y)}" r="${i === pts.length - 1 ? 8 : 5.5}"/>`;
    });
    outPlot.draw(c, outPlot.legend([{ cls: 'line-fit solid', label: OUT.refit ? 'OLS fit (with outlier)' : 'Line (fixed)' }, { cls: 'line-ghost', label: 'Fit without outlier' }], outPlot.m.l + 12, outPlot.m.t + 14));

    const offs = []; for (let o = -25; o <= 25; o += 0.5) offs.push(o);
    const series = offs.map((o) => outlierMetrics(o).met);
    const ymax = Math.max(...series.map((s) => s.rmse)) * 1.08;
    outChart.setDomain(-25, 25, 0, ymax);
    let ch = outChart.path(offs.map((o, i) => [o, series[i].mae]), 'series-a');
    ch += outChart.path(offs.map((o, i) => [o, series[i].rmse]), 'series-b');
    ch += outChart.path(offs.map((o, i) => [o, series[i].medae]), 'series-c');
    ch += `<line class="marker" x1="${outChart.X(OUT.offset)}" x2="${outChart.X(OUT.offset)}" y1="${outChart.m.t}" y2="${outChart.H - outChart.m.b}"/>`;
    ch += `<circle class="dot-a" cx="${outChart.X(OUT.offset)}" cy="${outChart.Y(met.mae)}" r="5"/><circle class="dot-b" cx="${outChart.X(OUT.offset)}" cy="${outChart.Y(met.rmse)}" r="5"/>`;
    outChart.draw(ch, outChart.legend([{ cls: 'series-b', label: 'RMSE' }, { cls: 'series-a', label: 'MAE' }, { cls: 'series-c', label: 'Median abs. error' }], outChart.W / 2 - 60, outChart.m.t + 14));

    $('#out-val').textContent = (OUT.offset > 0 ? '+' : '') + OUT.offset.toFixed(1);
    const share = met.sse > 0 ? (oe * oe) / met.sse * 100 : 0;
    const ratio = met.rmse / met.mae;
    $('#out-stats').innerHTML = `
      <div class="stat"><span>MAE</span><b>${fmt(met.mae)}</b></div>
      <div class="stat"><span>RMSE</span><b>${fmt(met.rmse)}</b></div>
      <div class="stat ${ratio > 1.6 ? 'hot' : ''}"><span>RMSE ÷ MAE</span><b>${ratio.toFixed(2)}</b></div>
      <div class="stat"><span>Median abs. error</span><b>${fmt(met.medae)}</b></div>
      <div class="stat ${share > 50 ? 'hot' : ''}"><span>Outlier's share of SSE</span><b>${share.toFixed(0)}%</b></div>
      <div class="stat"><span>Fitted slope</span><b>${fmt(L.m)}</b></div>`;
  }
  $('#out-slider').addEventListener('input', (e) => { OUT.offset = +e.target.value; renderOutliers(); });
  $('#out-refit').addEventListener('change', (e) => { OUT.refit = e.target.checked; renderOutliers(); });

  /* ========================================================= GRADIENT DESCENT */
  const GD = { scale: 'z', lr: 0.1, running: false, ok: false };
  const gdPlot = new Plot($('#gd-plot'), { W: 420, H: 360, m: { l: 58, r: 12, t: 12, b: 46 } });
  const gdLoss = new Plot($('#gd-loss'), { W: 420, H: 360, m: { l: 64, r: 12, t: 12, b: 46 }, logY: true, xLabel: 'Iteration', yLabel: 'MSE' });
  const cv = $('#gd-contour'), ctx = cv.getContext('2d');
  let heat = null;

  function gdSetup() {
    GD.running = false; $('#gd-play').textContent = 'Run';
    const X = xs(), Y = ys(), n = X.length;
    GD.ok = n >= 2 && Math.max(...X) > Math.min(...X) && Math.max(...Y) > Math.min(...Y);
    if (!GD.ok) { heat = null; gdRender(); return; }
    const mx = RL.mean(X), my = RL.mean(Y);
    const sx = Math.sqrt(RL.mean(X.map((x) => (x - mx) ** 2))), sy = Math.sqrt(RL.mean(Y.map((y) => (y - my) ** 2)));
    const [p, q] = GD.scale === 'z' ? [mx, sx] : [Math.min(...X), Math.max(...X) - Math.min(...X)];
    const xp = X.map((x) => (x - p) / q), yp = Y.map((y) => (y - my) / sy);
    const A = RL.mean(xp.map((v) => v * v)), B = RL.mean(xp), C = RL.mean(xp.map((v, i) => v * yp[i]));
    const det = A - B * B;
    const wOpt = C / det, cOpt = -B * C / det;          // solves [[A,B],[B,1]]·[w,c] = [C,0]
    Object.assign(GD, { p, q, mx, my, sy, A, B, C, wOpt, cOpt, R: 3 });
    GD.lossFn = (w, c) => A * w * w + 2 * B * w * c + c * c - 2 * C * w + 1;
    GD.lossMin = GD.lossFn(wOpt, cOpt);
    buildHeat();
    gdReset();
  }
  function gdReset() {
    if (!GD.ok) return;
    GD.w = GD.wOpt - 2.4; GD.c = GD.cOpt + 1.7;
    GD.iter = 0; GD.path = [[GD.w, GD.c]]; GD.losses = [GD.lossFn(GD.w, GD.c)]; GD.diverged = false; GD.done = false;
    GD.running = false; $('#gd-play').textContent = 'Run';
    gdRender();
  }
  function gdStep() {
    const { A, B, C } = GD;
    const gw = 2 * (A * GD.w + B * GD.c - C), gc = 2 * (B * GD.w + GD.c);
    GD.w -= GD.lr * gw; GD.c -= GD.lr * gc;
    GD.iter++;
    const L = GD.lossFn(GD.w, GD.c);
    GD.path.push([GD.w, GD.c]); GD.losses.push(L);
    if (!Number.isFinite(L) || L > 1e10) { GD.diverged = true; GD.running = false; }
    if (Math.hypot(gw, gc) < 1e-7 || GD.iter >= 2000) { GD.done = true; GD.running = false; }
  }
  const toOrig = (w, c) => { const m = GD.sy * w / GD.q; return { m, b: GD.my + GD.sy * (c - w * GD.p / GD.q) }; };

  function buildHeat() {
    const N = cv.width, img = ctx.createImageData(N, N), vals = new Float64Array(N * N);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const [w, c] = pxToWC(i, j);
      const v = Math.log(GD.lossFn(w, c) - GD.lossMin + 1e-3);
      vals[j * N + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const stops = dark ? [[14, 40, 52], [36, 110, 128], [168, 208, 214], [235, 238, 236]] : [[11, 62, 78], [39, 125, 145], [171, 214, 222], [250, 247, 241]];
    for (let k = 0; k < vals.length; k++) {
      let t = (vals[k] - lo) / (hi - lo);
      const band = Math.floor(t * 16); t = band / 16;
      const s = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1))), f = t * (stops.length - 1) - s;
      const shade = band % 2 ? 0.94 : 1;
      for (let ch = 0; ch < 3; ch++) img.data[k * 4 + ch] = (stops[s][ch] + (stops[s + 1][ch] - stops[s][ch]) * f) * shade;
      img.data[k * 4 + 3] = 255;
    }
    heat = document.createElement('canvas'); heat.width = heat.height = N;
    heat.getContext('2d').putImageData(img, 0, 0);
  }
  function pxToWC(i, j) { const N = cv.width; return [GD.wOpt - GD.R + (i / N) * 2 * GD.R, GD.cOpt + GD.R - (j / N) * 2 * GD.R]; }
  function wcToPx(w, c) { const N = cv.width; return [(w - GD.wOpt + GD.R) / (2 * GD.R) * N, (GD.cOpt + GD.R - c) / (2 * GD.R) * N]; }

  function gdRender() {
    const N = cv.width;
    ctx.clearRect(0, 0, N, N);
    gdPlot.xLabel = PG.meta ? PG.meta.xLabel : 'x'; gdPlot.yLabel = PG.meta ? PG.meta.yLabel : 'y';
    if (!GD.ok) {
      ctx.fillStyle = getComputedStyle(document.body).color; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Need at least two distinct points', N / 2, N / 2);
      gdPlot.setDomain(...PG.dom); gdPlot.draw(''); gdLoss.setDomain(0, 50, 0.1, 10); gdLoss.draw('');
      $('#gd-stats').innerHTML = ''; return;
    }
    ctx.drawImage(heat, 0, 0);
    // axes labels
    ctx.fillStyle = matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255,255,255,.8)' : 'rgba(28,34,48,.7)'; ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center'; ctx.fillText('slope weight w →', N / 2, N - 8);
    ctx.save(); ctx.translate(14, N / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('intercept weight c →', 0, 0); ctx.restore();
    // optimum
    const [ox, oy] = wcToPx(GD.wOpt, GD.cOpt);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox - 7, oy - 7); ctx.lineTo(ox + 7, oy + 7); ctx.moveTo(ox + 7, oy - 7); ctx.lineTo(ox - 7, oy + 7); ctx.stroke();
    // path
    const userCol = getComputedStyle(document.documentElement).getPropertyValue('--user').trim() || '#d52a55';
    ctx.strokeStyle = userCol; ctx.fillStyle = userCol; ctx.lineWidth = 2;
    ctx.beginPath();
    GD.path.forEach(([w, c], i) => { const [x, y] = wcToPx(w, c); const cx = clamp(x, -50, N + 50), cy = clamp(y, -50, N + 50); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); });
    ctx.stroke();
    GD.path.slice(-60).forEach(([w, c]) => { const [x, y] = wcToPx(w, c); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); });
    const [cx, cy] = wcToPx(GD.w, GD.c);
    ctx.beginPath(); ctx.arc(clamp(cx, 6, N - 6), clamp(cy, 6, N - 6), 6.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();

    // data + line
    gdPlot.setDomain(...PG.dom);
    const cur = toOrig(GD.w, GD.c);
    let c = gdPlot.line(PG.best.m, PG.best.b, 'line-fit');
    if (Number.isFinite(cur.m)) c += gdPlot.line(cur.m, cur.b, 'line-user');
    PG.pts.forEach(([x, y]) => { c += `<circle class="pt" cx="${gdPlot.X(x)}" cy="${gdPlot.Y(y)}" r="4.5"/>`; });
    gdPlot.draw(c);

    // loss curve (original units)
    const s2 = GD.sy * GD.sy;
    const L = GD.losses.map((v) => v * s2);
    const best = GD.lossMin * s2;
    const finite = L.filter(Number.isFinite);
    const lo = Math.max(1e-12, Math.min(best, ...finite) * 0.6), hi = Math.max(...finite, best * 10) * 1.5;
    gdLoss.setDomain(0, Math.max(50, Math.ceil(GD.iter / 50) * 50), lo, Math.min(hi, 1e14));
    let lc = gdLoss.hline(best, 'line-fit');
    lc += gdLoss.path(L.map((v, i) => [i, Math.min(v, 1e14)]), 'series-b');
    const lastL = L[L.length - 1];
    if (Number.isFinite(lastL)) lc += `<circle class="dot-b" cx="${gdLoss.X(GD.iter)}" cy="${gdLoss.Y(Math.min(lastL, 1e14))}" r="4.5"/>`;
    gdLoss.draw(lc, GD.diverged ? `<text class="warn" x="${gdLoss.W / 2}" y="${gdLoss.m.t + 24}" text-anchor="middle">Diverged: learning rate too large</text>` : '');

    const cm = L[L.length - 1];
    const status = GD.diverged ? 'Diverged' : GD.done ? 'Converged' : GD.running ? 'Training…' : GD.iter ? 'Paused' : 'Ready';
    $('#gd-stats').innerHTML = `
      <div class="stat"><span>Iteration</span><b>${GD.iter}</b></div>
      <div class="stat"><span>Slope m</span><b>${fmt(cur.m)}</b></div>
      <div class="stat"><span>Intercept b</span><b>${fmt(cur.b)}</b></div>
      <div class="stat"><span>MSE now</span><b>${fmt(cm)}</b></div>
      <div class="stat"><span>Optimal MSE</span><b>${fmt(best)}</b></div>
      <div class="stat ${GD.diverged ? 'bad' : GD.done ? 'good' : ''}"><span>Status</span><b>${status}</b></div>`;
  }
  function gdLoop() {
    if (!GD.running) { gdRender(); return; }
    const steps = GD.iter < 30 ? 1 : GD.iter < 200 ? 2 : 5;
    for (let i = 0; i < steps && GD.running; i++) gdStep();
    gdRender();
    if (GD.running) requestAnimationFrame(gdLoop); else $('#gd-play').textContent = 'Run';
  }
  $('#gd-play').addEventListener('click', () => {
    if (!GD.ok) return;
    if (GD.diverged || GD.done) gdReset();
    GD.running = !GD.running;
    $('#gd-play').textContent = GD.running ? 'Pause' : 'Run';
    if (GD.running) requestAnimationFrame(gdLoop);
  });
  $('#gd-step').addEventListener('click', () => { if (!GD.ok || GD.diverged) return; GD.running = false; $('#gd-play').textContent = 'Run'; gdStep(); gdRender(); });
  $('#gd-reset').addEventListener('click', gdReset);
  const lrS = $('#gd-lr');
  function readLR() { GD.lr = 10 ** +lrS.value; $('#gd-lr-val').textContent = GD.lr < 0.01 ? GD.lr.toFixed(4) : GD.lr.toFixed(3); }
  lrS.addEventListener('input', readLR);
  $('#gd-scale').addEventListener('change', (e) => { GD.scale = e.target.value; gdSetup(); });
  readLR();
  PG.subscribers.push(gdSetup);

  /* ============================================================== OVERFITTING */
  const OF = { seed: 2, noise: 0.3, deg: 1 };
  const ofPlot = new Plot($('#of-plot'), { W: 520, H: 380, xLabel: 'x', yLabel: 'y' });
  const ofChart = new Plot($('#of-chart'), { W: 520, H: 380, xLabel: 'Polynomial degree', yLabel: 'RMSE (log scale)', logY: true });
  function ofData() {
    OF.pts = RL.curveData({ n: 30, noise: OF.noise, seed: OF.seed });
    OF.train = OF.pts.filter((p) => !p.test); OF.test = OF.pts.filter((p) => p.test);
    const tx = OF.train.map((p) => p.x), ty = OF.train.map((p) => p.y);
    OF.fits = []; OF.curve = [];
    for (let d = 1; d <= 12; d++) {
      const f = RL.polyFit(tx, ty, d);
      const tr = RL.metrics(ty, tx.map(f.predict), d);
      const te = RL.metrics(OF.test.map((p) => p.y), OF.test.map((p) => f.predict(p.x)), d);
      OF.fits[d] = f; OF.curve.push({ d, tr, te });
    }
    OF.bestDeg = OF.curve.reduce((a, b) => (b.te.rmse < a.te.rmse ? b : a)).d;
  }
  function renderOverfit() {
    const f = OF.fits[OF.deg];
    ofPlot.setDomain(0, 1, -2.2, 2.2);
    const curve = []; for (let i = 0; i <= 300; i++) { const x = i / 300; curve.push([x, clamp(f.predict(x), -50, 50)]); }
    const truth = []; for (let i = 0; i <= 100; i++) { const x = i / 100; truth.push([x, Math.sin(2 * Math.PI * x)]); }
    let c = ofPlot.path(truth, 'line-ghost') + ofPlot.path(curve, 'line-user');
    OF.pts.forEach((p) => { c += `<circle class="pt${p.test ? ' test' : ''}" cx="${ofPlot.X(p.x)}" cy="${ofPlot.Y(p.y)}" r="5.5"/>`; });
    ofPlot.draw(c, ofPlot.legend([{ cls: 'line-user', label: `Degree ${OF.deg} fit` }, { cls: 'line-ghost', label: 'True curve sin(2πx)' }], ofPlot.m.l + 12, ofPlot.H - ofPlot.m.b - 32));

    const all = OF.curve.flatMap((r) => [r.tr.rmse, r.te.rmse]).filter((v) => v > 0);
    ofChart.setDomain(0.5, 12.5, 10 ** Math.floor(Math.log10(Math.min(...all))), 10 ** Math.ceil(Math.log10(Math.max(...all))));
    let ch = ofChart.path(OF.curve.map((r) => [r.d, Math.max(r.tr.rmse, 1e-12)]), 'series-a');
    ch += ofChart.path(OF.curve.map((r) => [r.d, r.te.rmse]), 'series-b');
    OF.curve.forEach((r) => { ch += `<circle class="dot-a" cx="${ofChart.X(r.d)}" cy="${ofChart.Y(Math.max(r.tr.rmse, 1e-12))}" r="3.5"/><circle class="dot-b" cx="${ofChart.X(r.d)}" cy="${ofChart.Y(r.te.rmse)}" r="3.5"/>`; });
    ch += `<line class="marker" x1="${ofChart.X(OF.deg)}" x2="${ofChart.X(OF.deg)}" y1="${ofChart.m.t}" y2="${ofChart.H - ofChart.m.b}"/>`;
    ofChart.draw(ch, ofChart.legend([{ cls: 'series-a', label: 'Train RMSE' }, { cls: 'series-b', label: 'Test RMSE' }], ofChart.m.l + 14, ofChart.m.t + 14));

    const r = OF.curve[OF.deg - 1], minTe = OF.curve[OF.bestDeg - 1].te.rmse;
    const verdict = OF.deg <= 2 && r.te.rmse > minTe * 1.3 ? ['Underfitting (high bias)', 'bad'] : r.te.rmse > minTe * 1.5 && OF.deg > OF.bestDeg ? ['Overfitting (high variance)', 'bad'] : ['Good balance', 'good'];
    $('#of-deg-val').textContent = OF.deg; $('#of-noise-val').textContent = OF.noise.toFixed(2);
    $('#of-stats').innerHTML = `
      <div class="stat"><span>Train RMSE</span><b>${fmt(r.tr.rmse, 3)}</b></div>
      <div class="stat"><span>Test RMSE</span><b>${fmt(r.te.rmse, 3)}</b></div>
      <div class="stat"><span>Train R²</span><b>${fixed(r.tr.r2, 3)}</b></div>
      <div class="stat ${r.te.r2 < 0 ? 'hot' : ''}"><span>Test R²</span><b>${fixed(r.te.r2, 3)}</b></div>
      <div class="stat"><span>Best test degree</span><b>${OF.bestDeg}</b></div>
      <div class="stat ${verdict[1]}"><span>Verdict</span><b style="font-size:.95rem">${verdict[0]}</b></div>`;
  }
  $('#of-deg').addEventListener('input', (e) => { OF.deg = +e.target.value; renderOverfit(); });
  $('#of-noise').addEventListener('input', (e) => { OF.noise = +e.target.value; ofData(); renderOverfit(); });
  $('#of-new').addEventListener('click', () => { OF.seed++; ofData(); renderOverfit(); });

  /* ================================================================ INFERENCE */
  PG.subscribers.push(function inference() {
    const r = RL.inference(xs(), ys());
    if (!r) { $('#inf-coef').innerHTML = '<tbody><tr><td class="lab">Need at least three points with different x values.</td></tr></tbody>'; $('#inf-summary').innerHTML = ''; $('#inf-text').textContent = ''; return; }
    const row = (lab, est, se, t, p, ci) => `<tr><td class="lab">${lab}</td><td>${fmt(est)}</td><td>${fmt(se)}</td><td>${fixed(t, 2)}</td><td class="${p < 0.05 ? 'sig' : 'nsig'}">${pval(p)}</td><td>[${fmt(ci[0])}, ${fmt(ci[1])}]</td></tr>`;
    $('#inf-coef').innerHTML = `<thead><tr><th>Term</th><th>Estimate</th><th>Std. error</th><th>t</th><th>p-value</th><th>95% CI</th></tr></thead><tbody>
      ${row('Intercept (b)', r.b, r.seB, r.tB, r.pB, r.ciB)}${row(`Slope (m): ${esc(PG.meta.xLabel)}`, r.m, r.seM, r.tM, r.pM, r.ciM)}</tbody>`;
    const st = (l, v) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`;
    $('#inf-summary').innerHTML = st('Observations n', r.n) + st('R²', fixed(r.r2, 4)) + st('Adjusted R²', fixed(r.adjR2, 4)) + st('Pearson r', fixed(r.r, 4)) +
      st('Residual std. error', fmt(r.residualStdError)) + st(`F (${r.dfReg}, ${r.dfRes})`, fmt(r.F)) + st('p-value (F)', pval(r.pF)) +
      st('SS model / residual', `${fmt(r.ssm, 3)} / ${fmt(r.sse, 3)}`);
    const xu = PG.meta.xUnit ? ` ${PG.meta.xUnit}` : ' unit of x';
    const yu = PG.meta.yUnit ? ` ${PG.meta.yUnit}` : '';
    const dir = r.m >= 0 ? 'increase' : 'decrease';
    const yLab = PG.meta.yLabel.replace(/\s*\(.*\)$/, '').toLowerCase();
    $('#inf-text').innerHTML = `<strong>Reading the output:</strong> each additional 1${esc(xu)} is associated with an average ${dir} of <b>${fmt(Math.abs(r.m))}${esc(yu)}</b> in ${esc(yLab)} (95% CI ${fmt(r.ciM[0])} to ${fmt(r.ciM[1])}). ` +
      (r.pM < 0.05
        ? `The slope's p-value is ${pval(r.pM)}, so the relationship is <span class="sig">statistically significant</span> at the 5% level: such a slope would be very unlikely if the true slope were 0.`
        : `The slope's p-value is ${pval(r.pM)}, so we <span class="nsig">cannot rule out</span> a true slope of 0 at the 5% level. Notice the confidence interval contains 0.`);
  });

  /* ===================================================================== CODE */
  let codeTab = 'numpy';
  function pyArr(a) {
    const s = a.map((v) => String(+v.toPrecision(10)));
    const lines = []; for (let i = 0; i < s.length; i += 10) lines.push(s.slice(i, i + 10).join(', '));
    return '[' + lines.join(',\n              ') + ']';
  }
  const f4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : 'nan');
  function codeText() {
    const X = xs(), Y = ys();
    if (X.length < 3) return '# Add at least three points in the playground to generate code.';
    const { m, b } = PG.best, met = RL.lineMetrics(X, Y, m, b), inf = RL.inference(X, Y);
    const head = `# Data: ${PG.meta.title}\nx = np.array(${pyArr(X)})   # ${PG.meta.xLabel}\ny = np.array(${pyArr(Y)})   # ${PG.meta.yLabel}\n`;
    const out = [['MAE', met.mae], ['MSE', met.mse], ['RMSE', met.rmse], ['R²', met.r2], ['Adjusted R²', met.adjR2], ['MAPE %', met.mape]];
    const expected = out.map(([k, v]) => `# ${k.padEnd(12)} ${f4(v)}`).join('\n');
    if (codeTab === 'numpy') return `import numpy as np

${head}
# 1. Fit the line with ordinary least squares (closed form)
x_mean, y_mean = x.mean(), y.mean()
m = np.sum((x - x_mean) * (y - y_mean)) / np.sum((x - x_mean) ** 2)
b = y_mean - m * x_mean
y_hat = m * x + b
print(f"y_hat = {m:.4f} * x + {b:.4f}")

# 2. Evaluation metrics, straight from their definitions
e = y - y_hat                     # residuals
n, p = len(y), 1                  # p = number of features
mae    = np.mean(np.abs(e))
mse    = np.mean(e ** 2)
rmse   = np.sqrt(mse)
r2     = 1 - np.sum(e ** 2) / np.sum((y - y_mean) ** 2)
adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)
nz     = y != 0                   # MAPE is undefined where y == 0
mape   = np.mean(np.abs(e[nz] / y[nz])) * 100

for name, value in [("MAE", mae), ("MSE", mse), ("RMSE", rmse),
                    ("R²", r2), ("Adjusted R²", adj_r2), ("MAPE %", mape)]:
    print(f"{name:12s} {value:.4f}")

# Expected output:
# y_hat = ${f4(m)} * x + ${f4(b)}
${expected}
`;
    if (codeTab === 'sklearn') return `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (mean_absolute_error, mean_squared_error,
                             r2_score, mean_absolute_percentage_error)

${head}X = x.reshape(-1, 1)              # scikit-learn expects a 2-D feature matrix

model = LinearRegression().fit(X, y)
y_pred = model.predict(X)
print(f"slope m = {model.coef_[0]:.4f}, intercept b = {model.intercept_:.4f}")

n, p = len(y), X.shape[1]
mae    = mean_absolute_error(y, y_pred)
mse    = mean_squared_error(y, y_pred)
rmse   = np.sqrt(mse)             # or root_mean_squared_error (scikit-learn ≥ 1.4)
r2     = r2_score(y, y_pred)
adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)   # scikit-learn has no built-in adjusted R²
mape   = mean_absolute_percentage_error(y, y_pred) * 100

for name, value in [("MAE", mae), ("MSE", mse), ("RMSE", rmse),
                    ("R²", r2), ("Adjusted R²", adj_r2), ("MAPE %", mape)]:
    print(f"{name:12s} {value:.4f}")

# Expected output:
# slope m = ${f4(m)}, intercept b = ${f4(b)}
${expected}${met.mapeSkipped ? '\n# (MAPE differs here: scikit-learn does not skip y == 0)' : ''}

# --- Good practice: evaluate on data the model has NOT seen -------------
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
model = LinearRegression().fit(X_train, y_train)
print("Test RMSE:", np.sqrt(mean_squared_error(y_test, model.predict(X_test))))
print("Test R²  :", r2_score(y_test, model.predict(X_test)))
`;
    return `import numpy as np
import statsmodels.api as sm

${head}
X = sm.add_constant(x)            # adds the intercept column of 1s
results = sm.OLS(y, X).fit()
print(results.summary())

# Key numbers you should see in the summary:
# R-squared:            ${f4(inf.r2)}
# Adj. R-squared:       ${f4(inf.adjR2)}
# F-statistic:          ${f4(inf.F)}   (p = ${inf.pF.toExponential(2)})
#                coef     std err        t      P>|t|
# const    ${f4(inf.b).padStart(10)} ${f4(inf.seB).padStart(10)} ${inf.tB.toFixed(3).padStart(8)} ${inf.pB.toFixed(3).padStart(8)}
# x1       ${f4(inf.m).padStart(10)} ${f4(inf.seM).padStart(10)} ${inf.tM.toFixed(3).padStart(8)} ${inf.pM.toFixed(3).padStart(8)}

# Prediction metrics from the fitted model
resid = results.resid
print("MAE :", np.mean(np.abs(resid)))
print("RMSE:", np.sqrt(np.mean(resid ** 2)))
`;
  }
  function renderCode() { $('#code-block').innerHTML = highlight(codeText()); }
  $$('#code .seg-btn').forEach((btn) => btn.addEventListener('click', () => {
    $$('#code .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    codeTab = btn.dataset.code; renderCode();
  }));
  $('#code-copy').addEventListener('click', async () => {
    const t = codeText();
    try { await navigator.clipboard.writeText(t); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    $('#code-copy').textContent = 'Copied ✓'; setTimeout(() => { $('#code-copy').textContent = 'Copy'; }, 1500);
  });
  PG.subscribers.push(renderCode);

  /* ===================================================================== QUIZ */
  const QUIZ = [
    { q: 'A model has MAE = 4 and RMSE = 10 on the same data. What does the gap suggest?',
      o: ['The model is biased upwards', 'A few large errors dominate (likely outliers)', 'The errors are all roughly the same size', 'The model is overfitting'], a: 1,
      why: 'RMSE squares errors before averaging, so it is pulled up by large misses. When RMSE is much larger than MAE, the error is concentrated in a few big residuals.' },
    { q: 'House prices are in BD thousands. What are the units of MSE?',
      o: ['BD thousands', 'Percent', '(BD thousands)²', 'Unitless'], a: 2,
      why: 'MSE averages squared errors, so it is in squared units. That is why we usually report RMSE, which is back in the units of y.' },
    { q: 'A model reports R² = 0.81. Which statement is correct?',
      o: ['81% of predictions are exactly right', 'The model explains 81% of the variance in y, compared with predicting the mean', 'The slope is 0.81', 'The correlation is 0.81'], a: 1,
      why: 'R² = 1 − SSE/SST: the model removes 81% of the squared error that the mean-only baseline makes. (In simple regression R² = r², so r ≈ 0.9.)' },
    { q: 'Can R² be negative?',
      o: ['No, it is a squared quantity', 'Only with more than one feature', 'Yes: when the model predicts worse than the mean (e.g. on test data or with a badly chosen line)', 'Only if the slope is negative'], a: 2,
      why: 'Despite the name, R² is 1 − SSE/SST. If SSE > SST it is negative. Try it in the playground by dragging your line away from the data.' },
    { q: 'Why does least squares use squared residuals instead of simply adding the residuals?',
      o: ['Positive and negative residuals would cancel out', 'Squares are faster to compute', 'It makes the errors smaller', 'It removes outliers'], a: 0,
      why: 'Raw residuals cancel: the flat line through ȳ has a residual sum of exactly 0. Squaring makes every error positive and gives a smooth, differentiable loss.' },
    { q: 'Which relationship always holds for the same set of predictions?',
      o: ['MAE ≥ RMSE', 'RMSE ≥ MAE', 'MSE ≤ MAE', 'R² ≥ adjusted R² is false'], a: 1,
      why: 'By the power-mean inequality the root of the mean square is never smaller than the mean absolute value. Equality holds only when all absolute errors are equal.' },
    { q: 'You add a column of random noise as an extra feature. What usually happens?',
      o: ['R² and adjusted R² both drop', 'R² stays the same or rises; adjusted R² usually drops', 'Both rise sharply', 'RMSE on new data improves'], a: 1,
      why: 'R² can never decrease when a feature is added on the training data. Adjusted R² charges a penalty per feature, so a useless one typically lowers it.' },
    { q: 'Training RMSE keeps falling as polynomial degree rises, but test RMSE starts rising. This is…',
      o: ['Underfitting', 'Overfitting', 'Data leakage', 'Convergence'], a: 1,
      why: 'The model is fitting the noise in the training set. Choose the complexity that minimises error on held-out data (see section 7).' },
    { q: 'When is MAPE a poor choice?',
      o: ['When y is measured in money', 'When some true values are zero or very close to zero', 'When there are many data points', 'When the model is linear'], a: 1,
      why: 'MAPE divides by y. A true value of 0 makes it undefined; values near 0 make it explode.' },
    { q: 'Gradient descent’s loss grows larger every iteration. The most likely cause is…',
      o: ['The learning rate is too small', 'The learning rate is too large', 'Too many data points', 'The features are standardised'], a: 1,
      why: 'Steps that are too large overshoot the minimum of the bowl and land higher up the other side, again and again. Lower η (see section 6).' },
  ];
  const quizState = QUIZ.map(() => null);
  $('#quiz-box').innerHTML = QUIZ.map((x, i) => `
    <div class="q" data-i="${i}"><p class="prompt">${i + 1}. ${x.q}</p>
      <div class="opts">${x.o.map((o, j) => `<button class="opt" data-j="${j}">${String.fromCharCode(65 + j)}. ${o}</button>`).join('')}</div>
      <p class="why">${x.why}</p></div>`).join('');
  $$('#quiz-box .q').forEach((qEl) => {
    const i = +qEl.dataset.i;
    $$('.opt', qEl).forEach((btn) => btn.addEventListener('click', () => {
      if (quizState[i] !== null) return;
      const j = +btn.dataset.j;
      quizState[i] = j === QUIZ[i].a;
      $$('.opt', qEl).forEach((b) => { b.disabled = true; if (+b.dataset.j === QUIZ[i].a) b.classList.add('right'); });
      if (j !== QUIZ[i].a) btn.classList.add('wrong');
      qEl.classList.add('done');
      const answered = quizState.filter((s) => s !== null).length, right = quizState.filter(Boolean).length;
      $('#quiz-score').textContent = `Score: ${right} / ${answered}` + (answered === QUIZ.length ? (right >= 8 ? ' · Excellent work!' : right >= 6 ? ' · Good, review the ones you missed.' : ' · Revisit sections 4–7 and try again.') : '');
    }));
  });

  /* ====================================================================== TOC */
  const tocLinks = $$('.toc a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) tocLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  $$('main section.chapter').forEach((s) => io.observe(s));

  /* ===================================================================== INIT */
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
      ignoredClasses: ['code-box'], throwOnError: false,
    });
  }
  ofData(); renderOverfit();
  renderOutliers();
  dsSel.value = 'study';
  loadKey('study');

  // exposed for debugging / testing in the browser console
  window.RegressionLab = { PG, GD, OF, OUT };
})();
