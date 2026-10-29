/* Tonal Field — Parser · beat tracker · v2
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   The beat is read from the playing itself, in two steps:
   1. the PULSE — the spacing that best explains the gaps between neighbouring onsets over the last few
      seconds (a gap may be one to four pulses); timing only, loudness plays no part;
   2. the BEAT — how the pulse groups: every 1, 2, 3 or 4 pulses, starting on whichever pulse. The beat is the
      longest grouping whose beats are all struck harder than everything between them. Loudness alone decides this.
   An onset on the beat is a beat; any other is a subdivision. If no grouping sets its onsets clearly apart
   in level, there is no accent to read, and every pulse is a beat (`accented` is false). */
(function (root) {
  'use strict';

  function makeBeat(o) {
    o = o || {};
    var WIN = o.window || 6;                      /* seconds of onsets the beat is read from */
    var CONTRAST = o.contrast || 0.12;
    var MAXP = o.maxPeriod || 1.25;               /* the longest a beat can be (48 bpm) */            /* least level difference (natural log, ≈1 dB) that counts as an accent */
    var B = { onsets: [], pulse: null, group: 1, period: null, phase: null, ready: false, accented: false, contrast: 0 };

    function recency(now) { return B.onsets.map(function (x) { return Math.exp(-(now - x.t) / WIN); }); }
    /* how well spacing L explains the gaps between neighbouring onsets (each gap one, two, three or four L) */
    function vote(L, w) {
      var v = 0, sg = 0.022, ons = B.onsets;
      for (var i = 1; i < ons.length; i++) {
        var d = ons[i].t - ons[i - 1].t; if (d > 1.6) continue;
        var k = Math.max(1, Math.round(d / L)); if (k > 4) continue;
        var e = d - k * L; v += w[i] * Math.exp(-e * e / (2 * sg * sg)) / k;
      }
      return v;
    }
    function estimate(now) {
      var ons = B.onsets;
      if (ons.length < 5 || ons[ons.length - 1].t - ons[0].t < 1.2) { B.ready = false; return; }
      var w = recency(now), bestL = null, bestV = -1;
      for (var L = 0.1; L <= 1.2; L += 0.004) { var v = vote(L, w); if (v > bestV * 1.0001) { bestV = v; bestL = L; } }
      if (B.pulse !== null) {                      /* keep the pulse unless a clearly better one appears */
        var cur = null, cv = -1;
        for (var L2 = B.pulse * 0.93; L2 <= B.pulse * 1.07; L2 += 0.002) { var v2 = vote(L2, w); if (v2 > cv) { cv = v2; cur = L2; } }
        if (cv * 1.3 >= bestV) bestL = cur;
      }
      /* count the pulses gap by gap back from the latest onset, then fit tempo and phase to that count */
      var T0 = bestL, n = new Array(ons.length), on = new Array(ons.length);
      n[ons.length - 1] = 0; on[ons.length - 1] = true;
      for (var i = ons.length - 2; i >= 0; i--) {
        var gap = (ons[i + 1].t - ons[i].t) / T0, kk = Math.round(gap);
        n[i] = n[i + 1] - kk; on[i] = kk >= 1 && Math.abs(gap - kk) <= 0.3;
      }
      var sw = 0, sn = 0, st = 0, snn = 0, snt = 0;
      for (var i2 = 0; i2 < ons.length; i2++) if (on[i2]) { var wi = w[i2]; sw += wi; sn += wi * n[i2]; st += wi * ons[i2].t; snn += wi * n[i2] * n[i2]; snt += wi * n[i2] * ons[i2].t; }
      var den = sw * snn - sn * sn, T = T0, p0 = ons[ons.length - 1].t;
      if (den > 1e-9) { T = (sw * snt - sn * st) / den; p0 = (st - T * sn) / sw; }
      if (!(T > 0.08 && T < 1.3)) { T = T0; p0 = ons[ons.length - 1].t; }
      B.pulse = T;
      var idx = [], lv = [], ww = [];
      for (var i3 = 0; i3 < ons.length; i3++) {
        if (!on[i3] || Math.abs(ons[i3].t - (p0 + n[i3] * T)) > 0.3 * T) continue;   /* between pulses: no part */
        idx.push(n[i3]); lv.push(Math.log(ons[i3].s)); ww.push(w[i3]);
      }
      /* the level at each position in the cycle: a cycle of 4 pulses (for groupings of 2 and 4) and of 3 */
      function levels(M) {
        var cl = [], cq = [], cw = [];
        for (var q = 0; q < M; q++) { cl.push(0); cq.push(0); cw.push(0); }
        for (var k = 0; k < idx.length; k++) { var r = ((idx[k] % M) + M) % M; cl[r] += ww[k] * lv[k]; cq[r] += ww[k] * lv[k] * lv[k]; cw[r] += ww[k]; }
        return cl.map(function (x, q) {
          if (cw[q] < 0.3) return null;
          var m = x / cw[q]; return { m: m, se: Math.sqrt(Math.max(0, cq[q] / cw[q] - m * m) / cw[q]) };   /* the level, and how surely it is known */
        });
      }
      var LV = { 3: levels(3), 4: levels(4) };
      /* how far every position on the grouping's beats stands above every position off them — counted only if
         that difference is surely more than the variation of levels within the positions */
      function contrast(g, j) {
        var L = LV[g === 3 ? 3 : 4], lo = Infinity, hi = -Infinity, sd = 0;
        for (var r = 0; r < L.length; r++) {
          if (L[r] === null) continue;
          sd = Math.max(sd, L[r].se);
          if (((r - j) % g + g) % g === 0) lo = Math.min(lo, L[r].m); else hi = Math.max(hi, L[r].m);
        }
        if (lo === Infinity || hi === -Infinity) return -1;
        var c = lo - hi; return c >= 2 * sd ? c : -1;
      }
      /* the beat: the longest grouping the accents bear out (its beats louder than everything between) */
      var best = { g: 1, j: 0, c: 0 };
      for (var g = 2; g <= 4; g++) {
        if (T * g > MAXP) break;
        for (var j = 0; j < g; j++) {
          var c = contrast(g, j);
          if (c >= CONTRAST && (g > best.g || c > best.c)) best = { g: g, j: j, c: c };
        }
      }
      /* keep the beat already heard unless another grouping is clearly stronger */
      if (B.accented && B.group > 1 && T * B.group <= MAXP) {
        var g0 = B.group, j0 = ((Math.round((B.phase - p0) / T) % g0) + g0) % g0, c0 = contrast(g0, j0);
        if (c0 >= CONTRAST && (best.g < g0 || (best.g === g0 && c0 >= 0.75 * best.c))) best = { g: g0, j: j0, c: c0 };
      }
      B.contrast = best.c;
      if (best.c >= CONTRAST) { B.accented = true; B.group = best.g; B.lastJ = best.j; }
      else { B.accented = false; B.group = 1; B.lastJ = 0; }
      B.period = T * B.group; B.phase = p0 + B.lastJ * T; B.ready = true;
    }
    /* an onset at time t with level s (any positive measure; only ratios matter); returns whether it is a beat */
    B.onset = function (t, s) {
      B.onsets.push({ t: t, s: Math.max(1e-6, s) });
      while (B.onsets.length && B.onsets[0].t < t - WIN) B.onsets.shift();
      estimate(t);
      return B.isBeat(t);
    };
    B.isBeat = function (t) {
      if (!B.ready) return true;
      var x = (t - B.phase) / B.period, d = Math.abs(x - Math.round(x)) * B.period;
      return d <= Math.min(0.3 * B.pulse, Math.max(0.05, 0.12 * B.period));
    };
    /* the first beat after time t */
    B.next = function (t) {
      if (!B.ready) return null;
      return B.phase + (Math.floor((t - B.phase) / B.period) + 1) * B.period;
    };
    B.reset = function () { B.onsets = []; B.pulse = null; B.group = 1; B.lastJ = 0; B.period = null; B.phase = null; B.ready = false; B.accented = false; B.contrast = 0; };
    B.reset();
    return B;
  }

  var api = { makeBeat: makeBeat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFBeat = api;
})(this);
