/*!
 * Regression Lab — core maths
 * Pure functions: fitting, error metrics, statistical inference, datasets.
 * Works in the browser (window.RL) and in Node (module.exports) so it can be tested.
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.RL = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- basics */
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const mean = (a) => (a.length ? sum(a) / a.length : NaN);

  /** Ordinary least squares for one feature: y ≈ m·x + b */
  function ols(xs, ys) {
    const n = xs.length;
    if (n === 0) return { m: 0, b: 0 };
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
    }
    if (sxx === 0) return { m: 0, b: my };
    const m = sxy / sxx;
    return { m, b: my - m * mx };
  }

  /** Pearson correlation coefficient r */
  function pearson(xs, ys) {
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < xs.length; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
      syy += (ys[i] - my) ** 2;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
  }

  /**
   * Error metrics for any set of predictions.
   * p = number of predictors (features) — used by adjusted R².
   */
  function metrics(ys, yhat, p = 1) {
    const n = ys.length;
    const out = { n, p };
    if (n === 0) return out;
    const my = mean(ys);
    let sse = 0, sae = 0, sst = 0, ssr = 0, ape = 0, apeN = 0, maxErr = 0, se = 0;
    const absErr = [];
    for (let i = 0; i < n; i++) {
      const e = ys[i] - yhat[i];
      se += e;
      sse += e * e;
      sae += Math.abs(e);
      absErr.push(Math.abs(e));
      sst += (ys[i] - my) ** 2;
      ssr += (yhat[i] - my) ** 2;
      if (Math.abs(e) > maxErr) maxErr = Math.abs(e);
      if (ys[i] !== 0) { ape += Math.abs(e / ys[i]); apeN++; }
    }
    absErr.sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    out.sse = sse;                 // sum of squared errors (residual sum of squares)
    out.sst = sst;                 // total sum of squares
    out.ssr = ssr;                 // regression (explained) sum of squares
    out.meanError = se / n;        // bias: average signed error
    out.mae = sae / n;
    out.mse = sse / n;
    out.rmse = Math.sqrt(sse / n);
    out.r2 = sst > 0 ? 1 - sse / sst : NaN;
    out.adjR2 = sst > 0 && n - p - 1 > 0 ? 1 - (1 - out.r2) * (n - 1) / (n - p - 1) : NaN;
    out.mape = apeN ? (ape / apeN) * 100 : NaN;
    out.mapeSkipped = n - apeN;   // points with y = 0 cannot enter MAPE
    out.medae = n % 2 ? absErr[mid] : (absErr[mid - 1] + absErr[mid]) / 2;
    out.maxErr = maxErr;
    return out;
  }

  function lineMetrics(xs, ys, m, b) {
    return metrics(ys, xs.map((x) => m * x + b), 1);
  }

  /* ------------------------------------------------- distributions (p-values) */
  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  /** Regularised incomplete beta I_x(a, b) */
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  /** Two-sided p-value of a t statistic */
  const tPValue = (t, df) => (isFinite(t) ? ibeta(df / (df + t * t), df / 2, 0.5) : 0);
  /** Upper-tail p-value of an F statistic */
  const fPValue = (F, d1, d2) => (isFinite(F) ? ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2) : 0);
  /** Critical t value for a two-sided test (default 95 %) */
  function tCritical(df, alpha = 0.05) {
    let lo = 0, hi = 1000;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (tPValue(mid, df) > alpha) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /** Full simple-regression summary: coefficients, standard errors, t, p, CI, F test */
  function inference(xs, ys) {
    const n = xs.length;
    if (n < 3) return null;
    const { m, b } = ols(xs, ys);
    const mx = mean(xs);
    const sxx = sum(xs.map((x) => (x - mx) ** 2));
    if (sxx === 0) return null;
    const met = lineMetrics(xs, ys, m, b);
    const dfRes = n - 2, dfReg = 1, dfTot = n - 1;
    const sigma2 = met.sse / dfRes;                  // residual variance estimate
    const seM = Math.sqrt(sigma2 / sxx);
    const seB = Math.sqrt(sigma2 * (1 / n + mx * mx / sxx));
    const tM = m / seM, tB = b / seB;
    const ssm = met.sst - met.sse;
    const F = ssm / dfReg / sigma2;
    const tc = tCritical(dfRes);
    return {
      n, m, b, seM, seB, tM, tB,
      pM: tPValue(tM, dfRes), pB: tPValue(tB, dfRes),
      ciM: [m - tc * seM, m + tc * seM], ciB: [b - tc * seB, b + tc * seB],
      F, pF: fPValue(F, dfReg, dfRes), dfReg, dfRes, dfTot,
      sse: met.sse, sst: met.sst, ssm, msr: ssm / dfReg, mse: sigma2,
      residualStdError: Math.sqrt(sigma2), r: pearson(xs, ys), r2: met.r2, adjR2: met.adjR2, tCrit: tc,
    };
  }

  /* ---------------------------------------------- polynomial least squares */
  /** Solve min ||A c − y|| with Householder QR (stable for high-degree polynomials). */
  function lstsq(A, y) {
    const n = A.length, k = A[0].length;
    const R = A.map((r) => r.slice());
    const q = y.slice();
    for (let j = 0; j < k; j++) {
      let norm = 0;
      for (let i = j; i < n; i++) norm += R[i][j] ** 2;
      norm = Math.sqrt(norm);
      if (norm === 0) continue;
      const alpha = R[j][j] > 0 ? -norm : norm;
      const v = new Array(n).fill(0);
      v[j] = R[j][j] - alpha;
      for (let i = j + 1; i < n; i++) v[i] = R[i][j];
      let vv = 0;
      for (let i = j; i < n; i++) vv += v[i] * v[i];
      if (vv === 0) continue;
      for (let c = j; c < k; c++) {
        let d = 0;
        for (let i = j; i < n; i++) d += v[i] * R[i][c];
        const f = 2 * d / vv;
        for (let i = j; i < n; i++) R[i][c] -= f * v[i];
      }
      let d = 0;
      for (let i = j; i < n; i++) d += v[i] * q[i];
      const f = 2 * d / vv;
      for (let i = j; i < n; i++) q[i] -= f * v[i];
    }
    const c = new Array(k).fill(0);
    for (let j = k - 1; j >= 0; j--) {
      let s = q[j];
      for (let i = j + 1; i < k; i++) s -= R[j][i] * c[i];
      c[j] = Math.abs(R[j][j]) > 1e-12 ? s / R[j][j] : 0;
    }
    return c;
  }

  /** Fit a polynomial of the given degree; returns a predict(x) function */
  function polyFit(xs, ys, degree) {
    const lo = Math.min(...xs), hi = Math.max(...xs);
    const c0 = (lo + hi) / 2, s = (hi - lo) / 2 || 1;   // map x to [-1, 1] for stability
    const row = (x) => { const u = (x - c0) / s; const r = [1]; for (let d = 1; d <= degree; d++) r.push(r[d - 1] * u); return r; };
    const coef = lstsq(xs.map(row), ys);
    const predict = (x) => { const r = row(x); let v = 0; for (let i = 0; i < r.length; i++) v += coef[i] * r[i]; return v; };
    return { predict, coef, degree };
  }

  /* ---------------------------------------------------------- randomness */
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.normal = () => {
      let u = 0; while (u === 0) u = next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    next.uniform = (lo, hi) => lo + (hi - lo) * next();
    return next;
  }

  const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

  /* ------------------------------------------------------------- datasets */
  const DATASETS = {
    study: {
      title: 'Study hours → exam score',
      xLabel: 'Hours studied per week', yLabel: 'Exam score (%)', xUnit: 'h', yUnit: 'pts',
      story: 'Each point is a student. Does studying more go with a higher score?',
      make(seed = 7) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 20; i++) {
          const x = round(r.uniform(0.5, 10), 1);
          const y = round(Math.min(100, 45 + 5 * x + 6 * r.normal()), 1);
          pts.push([x, y]);
        }
        return pts;
      },
    },
    house: {
      title: 'House size → price',
      xLabel: 'Floor area (m²)', yLabel: 'Price (BD thousands)', xUnit: 'm²', yUnit: 'BD k',
      story: 'Apartments and villas: bigger homes usually cost more — but by how much per m²?',
      make(seed = 11) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 25; i++) {
          const x = Math.round(r.uniform(80, 400));
          const y = round(20 + 0.35 * x + 15 * r.normal(), 1);
          pts.push([x, y]);
        }
        return pts;
      },
    },
    icecream: {
      title: 'Temperature → ice-cream sales',
      xLabel: 'Daily max temperature (°C)', yLabel: 'Cones sold', xUnit: '°C', yUnit: 'cones',
      story: 'A beach kiosk records sales on 20 days. Hotter days, more cones?',
      make(seed = 3) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 20; i++) {
          const x = round(r.uniform(18, 45), 1);
          const y = Math.max(0, Math.round(-40 + 9 * x + 25 * r.normal()));
          pts.push([x, y]);
        }
        return pts;
      },
    },
    car: {
      title: 'Car age → resale value',
      xLabel: 'Age (years)', yLabel: 'Resale value (BD thousands)', xUnit: 'yr', yUnit: 'BD k',
      story: 'A negative relationship: every extra year knocks some value off.',
      make(seed = 21) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 20; i++) {
          const x = round(r.uniform(0, 15), 1);
          const y = round(Math.max(0.5, 12 - 0.65 * x + 1.2 * r.normal()), 2);
          pts.push([x, y]);
        }
        return pts;
      },
    },
    salary: {
      title: 'Experience → monthly salary',
      xLabel: 'Years of experience', yLabel: 'Monthly salary (BD)', xUnit: 'yr', yUnit: 'BD',
      story: 'Software engineers at different career stages. How much is one more year of experience worth?',
      make(seed = 17) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 24; i++) {
          const x = round(r.uniform(0, 20), 1);
          const y = Math.round(450 + 85 * x + 160 * r.normal());
          pts.push([x, y]);
        }
        return pts;
      },
    },
    advertising: {
      title: 'Advertising spend → sales',
      xLabel: 'Monthly ad spend (BD thousands)', yLabel: 'Monthly sales (BD thousands)', xUnit: 'BD k', yUnit: 'BD k',
      story: 'A retailer tracks marketing budget against revenue across 22 months.',
      make(seed = 29) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 22; i++) {
          const x = round(r.uniform(1, 25), 1);
          const y = round(30 + 3.2 * x + 9 * r.normal(), 1);
          pts.push([x, y]);
        }
        return pts;
      },
    },
    engine: {
      title: 'Engine size → CO₂ emissions',
      xLabel: 'Engine size (litres)', yLabel: 'CO₂ emissions (g/km)', xUnit: 'L', yUnit: 'g/km',
      story: 'Twenty-five car models. Larger engines burn more fuel and emit more CO₂.',
      make(seed = 41) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 25; i++) {
          const x = round(r.uniform(1.0, 6.0), 1);
          const y = Math.round(100 + 38 * x + 18 * r.normal());
          pts.push([x, y]);
        }
        return pts;
      },
    },
    noise: {
      title: 'No relationship (pure noise)',
      xLabel: 'x', yLabel: 'y', xUnit: '', yUnit: '',
      story: 'x and y are unrelated. Watch R² stay near 0 no matter what line you draw.',
      make(seed = 5) {
        const r = rng(seed), pts = [];
        for (let i = 0; i < 25; i++) pts.push([round(r.uniform(0, 10), 2), round(5 + 2 * r.normal(), 2)]);
        return pts;
      },
    },
    blank: {
      title: 'Blank canvas — make your own',
      xLabel: 'x', yLabel: 'y', xUnit: '', yUnit: '',
      story: 'Click anywhere on the plot to add points.',
      domain: [0, 10, 0, 10],
      make() { return []; },
    },
  };

  /** Random linear data with a chosen amount of noise */
  function randomLinear({ n = 25, slope = 1.5, intercept = 2, noise = 2, seed = 1 } = {}) {
    const r = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const x = round(r.uniform(0, 10), 2);
      pts.push([x, round(intercept + slope * x + noise * r.normal(), 2)]);
    }
    return pts;
  }

  /** Data for the over-fitting lab: y = sin(2πx) + noise, split into train / test */
  function curveData({ n = 30, noise = 0.3, seed = 2, testFraction = 1 / 3 } = {}) {
    const r = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const x = r.uniform(0, 1);
      pts.push({ x, y: Math.sin(2 * Math.PI * x) + noise * r.normal(), test: false });
    }
    const idx = pts.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    idx.slice(0, Math.round(n * testFraction)).forEach((i) => { pts[i].test = true; });
    return pts;
  }

  return {
    sum, mean, ols, pearson, metrics, lineMetrics, inference, tPValue, fPValue, tCritical,
    ibeta, lstsq, polyFit, rng, DATASETS, randomLinear, curveData,
  };
});
