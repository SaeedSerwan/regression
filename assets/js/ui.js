/*!
 * Regression Lab — shared UI helpers (formatting, axis ticks, SVG plots, code highlighting, quiz)
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* =================================================================== format */
  const SUP = { '-': '⁻', '+': '', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function fmt(v, sig = 4) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e7 || a < 1e-4)) {
      const [mant, exp] = v.toExponential(sig - 1).split('e');
      return `${mant.replace('-', '−')}×10${exp.split('').map((c) => SUP[c]).join('')}`;
    }
    if (a >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }).replace('-', '−');
    return String(Number(v.toPrecision(sig))).replace('-', '−');
  }
  const fixed = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d).replace('-', '−') : '—');
  const pval = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ==================================================================== ticks */
  function niceStep(range, n) {
    const raw = range / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function ticks(lo, hi, n = 6) {
    const st = niceStep(hi - lo, n), out = [];
    for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toPrecision(12));
    return { values: out, step: st };
  }
  function niceDomain(lo, hi, pad = 0.08) {
    if (lo === hi) { lo -= 1; hi += 1; }
    const p = (hi - lo) * pad; lo -= p; hi += p;
    const st = niceStep(hi - lo, 6);
    return [Math.floor(lo / st) * st, Math.ceil(hi / st) * st];
  }
  function tickLabel(v, step) {
    const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    if (Math.abs(v) >= 1e5) return fmt(v, 3);
    return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace('-', '−');
  }

  /* ===================================================================== Plot */
  let clipSeq = 0;
  class Plot {
    constructor(svg, o = {}) {
      this.svg = svg;
      this.W = o.W || 640; this.H = o.H || 440;
      this.m = Object.assign({ l: 64, r: 18, t: 16, b: 50 }, o.m || {});
      this.xLabel = o.xLabel || ''; this.yLabel = o.yLabel || '';
      this.logY = !!o.logY;
      this.clip = 'rlclip' + ++clipSeq;
      svg.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
      this.dom = [0, 1, 0, 1];
    }
    get pw() { return this.W - this.m.l - this.m.r; }
    get ph() { return this.H - this.m.t - this.m.b; }
    setDomain(x0, x1, y0, y1) { this.dom = [x0, x1, y0, y1]; }
    X(v) { const [a, b] = this.dom; return this.m.l + (v - a) / (b - a) * this.pw; }
    Y(v) {
      let [, , a, b] = this.dom;
      if (this.logY) { v = Math.log10(Math.max(v, 1e-300)); a = Math.log10(a); b = Math.log10(b); }
      const px = this.m.t + this.ph - (v - a) / (b - a) * this.ph;
      return clamp(px, -1e5, 1e5);
    }
    invX(px) { const [a, b] = this.dom; return a + (px - this.m.l) / this.pw * (b - a); }
    invY(py) { const [, , a, b] = this.dom; return a + (this.m.t + this.ph - py) / this.ph * (b - a); }
    inside(px, py) { return px >= this.m.l && px <= this.W - this.m.r && py >= this.m.t && py <= this.H - this.m.b; }
    axes() {
      const { m, W, H } = this;
      const [x0, x1, y0, y1] = this.dom;
      const xt = ticks(x0, x1, Math.max(4, Math.round(this.pw / 85)));
      let s = `<defs><clipPath id="${this.clip}"><rect x="${m.l}" y="${m.t}" width="${this.pw}" height="${this.ph}"/></clipPath></defs><g class="grid">`;
      let lab = '<g class="tick">';
      xt.values.forEach((v) => {
        const x = this.X(v).toFixed(1);
        s += `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}"/>`;
        lab += `<text x="${x}" y="${H - m.b + 17}" text-anchor="middle">${tickLabel(v, xt.step)}</text>`;
      });
      let yv, ystep = 1;
      if (this.logY) {
        yv = [];
        for (let e = Math.ceil(Math.log10(y0)); e <= Math.floor(Math.log10(y1)); e++) yv.push(10 ** e);
        if (yv.length > 7) yv = yv.filter((_, i) => i % Math.ceil(yv.length / 6) === 0);
      } else { const t = ticks(y0, y1, Math.max(4, Math.round(this.ph / 70))); yv = t.values; ystep = t.step; }
      yv.forEach((v) => {
        const y = this.Y(v).toFixed(1);
        s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>`;
        lab += `<text x="${m.l - 8}" y="${+y + 4}" text-anchor="end">${this.logY ? fmt(v, 2) : tickLabel(v, ystep)}</text>`;
      });
      s += '</g>' + lab + '</g>';
      s += `<g class="axis"><line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/><line x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${H - m.b}"/></g>`;
      s += `<text class="axis-label" x="${m.l + this.pw / 2}" y="${H - 10}" text-anchor="middle">${esc(this.xLabel)}</text>`;
      s += `<text class="axis-label" transform="translate(16 ${m.t + this.ph / 2}) rotate(-90)" text-anchor="middle">${esc(this.yLabel)}</text>`;
      return s;
    }
    draw(content, overlay = '') {
      this.svg.innerHTML = this.axes() + `<g clip-path="url(#${this.clip})">${content}</g>` + overlay;
    }
    toData(evt) {
      const pt = this.svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
      return { px: p.x, py: p.y, x: this.invX(p.x), y: this.invY(p.y) };
    }
    line(m, b, cls) {
      const [x0, x1] = this.dom;
      return `<line class="${cls}" x1="${this.X(x0)}" y1="${this.Y(m * x0 + b)}" x2="${this.X(x1)}" y2="${this.Y(m * x1 + b)}"/>`;
    }
    hline(y, cls) { return `<line class="${cls}" x1="${this.m.l}" x2="${this.W - this.m.r}" y1="${this.Y(y)}" y2="${this.Y(y)}"/>`; }
    path(pts, cls) {
      if (!pts.length) return '';
      return `<path class="${cls}" d="${pts.map((p, i) => (i ? 'L' : 'M') + this.X(p[0]).toFixed(2) + ' ' + this.Y(p[1]).toFixed(2)).join('')}"/>`;
    }
    legend(items, x, y) {
      return `<g class="legend">${items.map((it, i) => `<line class="${it.cls}" x1="${x}" x2="${x + 22}" y1="${y + i * 18}" y2="${y + i * 18}"/><text x="${x + 28}" y="${y + i * 18 + 4}">${esc(it.label)}</text>`).join('')}</g>`;
    }
  }
  function highlight(src) {
    const re = /(#[^\n]*)|(f?"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(import|from|as|for|in|print|def|return|if|else|lambda|True|False|None)\b|\b(\d+(?:\.\d+)?(?:e[-+]?\d+)?)\b/g;
    let out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  /** Render a multiple-choice quiz into `box`, keeping a running score in `scoreEl`. */
  function makeQuiz(box, scoreEl, questions) {
    const state = questions.map(() => null);
    box.innerHTML = questions.map((x, i) => `
      <div class="q" data-i="${i}"><p class="prompt">${i + 1}. ${x.q}</p>
        <div class="opts">${x.o.map((o, j) => `<button class="opt" data-j="${j}">${String.fromCharCode(65 + j)}. ${o}</button>`).join('')}</div>
        <p class="why">${x.why}</p></div>`).join('');
    $$('.q', box).forEach((qEl) => {
      const i = +qEl.dataset.i;
      $$('.opt', qEl).forEach((btn) => btn.addEventListener('click', () => {
        if (state[i] !== null) return;
        const j = +btn.dataset.j;
        state[i] = j === questions[i].a;
        $$('.opt', qEl).forEach((b) => { b.disabled = true; if (+b.dataset.j === questions[i].a) b.classList.add('right'); });
        if (j !== questions[i].a) btn.classList.add('wrong');
        qEl.classList.add('done');
        const answered = state.filter((s) => s !== null).length, right = state.filter(Boolean).length, N = questions.length;
        scoreEl.textContent = `Score: ${right} / ${answered}` + (answered === N ? (right >= 0.8 * N ? ' · Excellent work!' : right >= 0.6 * N ? ' · Good, review the ones you missed.' : ' · Revisit the sections above and try again.') : '');
      }));
    });
  }

  /** Highlight the table-of-contents link for the section in view. */
  function tocSpy() {
    const links = $$('.toc a');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('main section.chapter').forEach((s) => io.observe(s));
  }

  /** Render KaTeX in the page. */
  function renderMath(root = document.body) {
    if (window.renderMathInElement) {
      renderMathInElement(root, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
        ignoredClasses: ['code-box'], throwOnError: false,
      });
    }
  }

  /** Copy text to the clipboard, with a fallback for older browsers. */
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  }

  window.RLUI = { $, $$, SUP, fmt, fixed, pval, esc, clamp, niceStep, ticks, niceDomain, tickLabel, Plot, highlight, makeQuiz, tocSpy, renderMath, copyText };
})();
