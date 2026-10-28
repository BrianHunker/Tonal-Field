/* Tonal Field — Parser · fundamental contour tracker · v1
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   Two stages.
   1. ANALYZER (runs in the audio thread, every ~5 ms): the YIN difference function of the newest
      ~23 ms of signal against every lag down to 55 Hz, computed through one FFT pair. Every dip of the
      normalized difference is a CANDIDATE fundamental; each gets a probability from a spread of
      thresholds (pYIN): a dip is credited for every threshold at which it is the first dip below —
      so the shortest-lag (highest) credible period is favored, as a single threshold would, but the
      others are kept. Nothing is chosen here.
   2. TRACKER (main thread): the contour is the path through those candidates, frame by frame, that the
      evidence supports most continuously (Viterbi over 20-cent pitch states plus one silent state,
      decided a short fixed lag behind the present). Small moves are cheap, so glides and vibrato pass;
      a leap costs a fixed price that one or two frames of false evidence cannot pay, so a momentary
      octave or ±5/7 reading is outvoted by the frames around it. The output is continuous pitch —
      the chosen candidate's own frequency, never rounded to a lattice. */
(function (root) {
  'use strict';

  /* ---------- the analyzer (also serialized into the AudioWorklet) ---------- */
  function analyzerFactory() {
    function nextPow2(n) { var p = 1; while (p < n) p <<= 1; return p; }
    function makeFFT(N) {
      var lev = Math.round(Math.log(N) / Math.LN2), rev = new Uint32Array(N), cs = new Float64Array(N / 2), sn = new Float64Array(N / 2);
      for (var i = 0; i < N; i++) { var r = 0, x = i; for (var b = 0; b < lev; b++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
      for (var k = 0; k < N / 2; k++) { cs[k] = Math.cos(2 * Math.PI * k / N); sn[k] = Math.sin(2 * Math.PI * k / N); }
      return function (re, im, inv) {
        for (var i = 0; i < N; i++) { var j = rev[i]; if (j > i) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
        for (var size = 2; size <= N; size <<= 1) {
          var half = size >> 1, step = N / size;
          for (var s = 0; s < N; s += size) for (var q = 0; q < half; q++) {
            var wr = cs[q * step], wi = inv ? sn[q * step] : -sn[q * step];
            var a = s + q, c = a + half;
            var xr = re[c] * wr - im[c] * wi, xi = re[c] * wi + im[c] * wr;
            re[c] = re[a] - xr; im[c] = im[a] - xi; re[a] += xr; im[a] += xi;
          }
        }
        if (inv) for (var m = 0; m < N; m++) { re[m] /= N; im[m] /= N; }
      };
    }
    /* CDF of Beta(2,BB) — the spread of thresholds, tabulated */
    var BB = (typeof TF_BETA_B !== 'undefined') ? TF_BETA_B : 5;
    var BETA = (function () {
      var n = 2000, F = new Float64Array(n + 1), acc = 0, prev = 0;
      for (var i = 1; i <= n; i++) { var s = i / n, pdf = s * Math.pow(1 - s, BB - 1); acc += 0.5 * (pdf + prev) / n; prev = pdf; F[i] = acc; }
      for (var j = 0; j <= n; j++) F[j] /= acc;
      return function (s) { if (s <= 0) return 0; if (s >= 1) return 1; var x = s * n, k = Math.floor(x); return F[k] + (F[k + 1] - F[k]) * (x - k); };
    })();

    return function makeAnalyzer(sr, o) {
      o = o || {};
      var fmin = o.fmin || 55, fmax = o.fmax || 1600;
      var W = Math.round(sr * 0.0232);                    /* integration window, ~23 ms */
      var tmax = Math.floor(sr / fmin), tmin = Math.max(2, Math.floor(sr / fmax));
      var span = W + tmax + 2, N = nextPow2(span);
      var hop = Math.round(sr * 0.005);
      var fft = makeFFT(N);
      var ring = new Float32Array(span), rpos = 0, filled = 0, sinceHop = 0, clock = 0;
      var y = new Float64Array(span), re = new Float64Array(N), im = new Float64Array(N);
      var pre = new Float64Array(span + 1), d = new Float64Array(tmax + 2), cm = new Float64Array(tmax + 2);
      var Rr = new Float64Array(N), Ri = new Float64Array(N);

      function analyse(tEnd) {
        /* y[0] is the newest sample, y[j] j samples older */
        for (var j = 0; j < span; j++) y[j] = ring[(rpos - 1 - j + span * 2) % span];
        var e2 = 0; for (var q = 0; q < W; q++) e2 += y[q] * y[q];
        var rms = Math.sqrt(e2 / W);
        pre[0] = 0; for (var p = 0; p < span; p++) pre[p + 1] = pre[p] + y[p] * y[p];
        /* z = a + i·b, a = newest W samples, b = the whole span */
        for (var k = 0; k < N; k++) { re[k] = k < W ? y[k] : 0; im[k] = k < span ? y[k] : 0; }
        fft(re, im, false);
        for (var k2 = 0; k2 < N; k2++) {
          var n2 = (N - k2) % N;
          var Ar = 0.5 * (re[k2] + re[n2]), Ai = 0.5 * (im[k2] - im[n2]);       /* A = (Z + conj Z[-k]) / 2 */
          var Br = 0.5 * (im[k2] + im[n2]), Bi = -0.5 * (re[k2] - re[n2]);      /* B = (Z − conj Z[-k]) / 2i */
          Rr[k2] = Ar * Br + Ai * Bi; Ri[k2] = Ar * Bi - Ai * Br;               /* conj(A)·B */
        }
        for (var k3 = 0; k3 < N; k3++) { re[k3] = Rr[k3]; im[k3] = Ri[k3]; }
        fft(re, im, true);                                                     /* re[tau] = Σ a[j]·b[j+tau] */
        var run = 0; cm[0] = 1;
        for (var tau = 1; tau <= tmax + 1; tau++) {
          var eb = pre[tau + W] - pre[tau];
          var v = e2 + eb - 2 * re[tau]; if (v < 0) v = 0;
          d[tau] = v; run += v; cm[tau] = run > 0 ? v * tau / run : 1;
        }
        /* every dip is a candidate; credit each with the thresholds at which it is the first dip below */
        var out = [], mprev = 1;
        for (var t2 = tmin; t2 <= tmax; t2++) {
          if (!(cm[t2] < cm[t2 - 1] && cm[t2] <= cm[t2 + 1] && cm[t2] < mprev)) continue;
          var a0 = cm[t2 - 1], b0 = cm[t2], c0 = cm[t2 + 1], den = a0 - 2 * b0 + c0;
          var off = den > 0 ? 0.5 * (a0 - c0) / den : 0; if (off > 0.5) off = 0.5; if (off < -0.5) off = -0.5;
          var val = b0 - 0.25 * (a0 - c0) * off; if (val < 0) val = 0;
          var pr = BETA(mprev) - BETA(val);
          if (pr > 0.004) out.push(sr / (t2 + off), pr);
          mprev = Math.min(mprev, val);
        }
        return { t: tEnd - 0.5 * W / sr, rms: rms, c: out };
      }
      return {
        hop: hop, W: W, sr: sr,
        /* push a block of samples (ending at time tEnd); returns the frames completed */
        push: function (x, tEnd) {
          var frames = [];
          for (var i = 0; i < x.length; i++) {
            ring[rpos] = x[i]; rpos = (rpos + 1) % span; if (filled < span) filled++;
            if (++sinceHop >= hop && filled >= span) { sinceHop = 0; frames.push(analyse(tEnd - (x.length - 1 - i) / sr)); }
          }
          return frames;
        }
      };
    };
  }
  var makeAnalyzer = analyzerFactory();

  /* the AudioWorklet that runs the analyzer and posts its frames */
  var WORKLET_SRC =
    'var makeAnalyzer = (' + analyzerFactory.toString() + ')();\n' +
    'class TFPitch extends AudioWorkletProcessor {\n' +
    '  constructor() { super(); this.a = makeAnalyzer(sampleRate); this.port.postMessage({ hello: true, hop: this.a.hop, W: this.a.W, sr: sampleRate }); }\n' +
    '  process(inputs) {\n' +
    '    var ch = inputs[0]; if (!ch || !ch.length) return true;\n' +
    '    var x = ch[0];\n' +
    '    if (ch.length > 1) { x = new Float32Array(ch[0].length); for (var c = 0; c < ch.length; c++) for (var i = 0; i < x.length; i++) x[i] += ch[c][i] / ch.length; }\n' +
    '    var fr = this.a.push(x, currentTime + x.length / sampleRate);\n' +
    '    if (fr.length) this.port.postMessage({ frames: fr });\n' +
    '    return true;\n' +
    '  }\n' +
    '}\n' +
    "registerProcessor('tf-pitch', TFPitch);\n";

  /* ---------- the tracker ---------- */
  function makeTracker(o) {
    o = o || {};
    var fmin = o.fmin || 55, fmax = o.fmax || 1600, BIN = 20;          /* cents per pitch state */
    var nb = Math.ceil(1200 * Math.log2(fmax / fmin) / BIN) + 1, U = nb;  /* nb voiced states + one silent */
    var LAG = o.lag || 10;                                             /* frames decided behind the present */
    var M = 5;                                                         /* ±1 semitone per frame moves freely */
    var SW = 0.01, JUMP = 0.02, EPS = 1e-9, UW = o.uw !== undefined ? o.uw : 0.3;
    var near = new Float64Array(2 * M + 1), ns = 0;
    for (var k = -M; k <= M; k++) { near[k + M] = M + 1 - Math.abs(k); ns += near[k + M]; }
    var lnNear = new Float64Array(2 * M + 1);
    for (var k2 = 0; k2 < 2 * M + 1; k2++) lnNear[k2] = Math.log((1 - SW - JUMP) * near[k2] / ns);
    var lnJump = Math.log(JUMP / nb), lnSW = Math.log(SW), lnStayU = Math.log(1 - SW), lnOnset = Math.log(SW / nb);
    var delta = new Float64Array(nb + 1), nd = new Float64Array(nb + 1);
    for (var s = 0; s < nb; s++) delta[s] = Math.log(0.5 / nb); delta[U] = Math.log(0.5);
    var hist = [];                                                      /* last LAG+1 frames: {fr, bp, obs} */
    var gate = o.gate || 0.008;

    function binOf(f) { return 1200 * Math.log2(f / fmin) / BIN; }
    function fOfBin(b) { return fmin * Math.pow(2, b * BIN / 1200); }

    function step(fr) {
      /* observation */
      var lv = new Float64Array(nb), V = 0, cs = fr.c;
      if (fr.rms >= gate) for (var i = 0; i < cs.length; i += 2) {
        var f = cs[i], p = cs[i + 1]; if (f < fmin || f > fmax) continue;
        var b = Math.round(binOf(f)); if (b < 0 || b >= nb) continue;
        if (p > lv[b]) lv[b] = p; V += p;
      }
      if (V > 1) V = 1;
      var obsU = Math.log(EPS + UW * (1 - V));
      /* best previous state overall (for leaps and onsets) */
      var best = -Infinity, bestS = U;
      for (var q = 0; q <= nb; q++) if (delta[q] > best) { best = delta[q]; bestS = q; }
      var bestV = -Infinity, bestVS = 0;
      for (var q2 = 0; q2 < nb; q2++) if (delta[q2] > bestV) { bestV = delta[q2]; bestVS = q2; }
      var bp = new Int16Array(nb + 1);
      for (var s2 = 0; s2 < nb; s2++) {
        var m = -Infinity, arg = -1;
        for (var d = -M; d <= M; d++) {
          var from = s2 - d; if (from < 0 || from >= nb) continue;
          var v = delta[from] + lnNear[d + M]; if (v > m) { m = v; arg = from; }
        }
        var vj = bestV + lnJump; if (vj > m) { m = vj; arg = bestVS; }        /* a leap */
        var vo = delta[U] + lnOnset; if (vo > m) { m = vo; arg = U; }         /* an onset from silence */
        nd[s2] = m + Math.log(EPS + lv[s2]); bp[s2] = arg;
      }
      /* silence */
      var mu = delta[U] + lnStayU, au = U;
      var vs = bestV + lnSW; if (vs > mu) { mu = vs; au = bestVS; }
      nd[U] = mu + obsU; bp[U] = au;
      var mx = -Infinity; for (var z = 0; z <= nb; z++) if (nd[z] > mx) mx = nd[z];
      for (var z2 = 0; z2 <= nb; z2++) delta[z2] = nd[z2] - mx;
      hist.push({ fr: fr, bp: bp }); if (hist.length > LAG + 1) hist.shift();
      if (hist.length < LAG + 1) return null;
      /* backtrack from the present to the frame LAG behind */
      var st = 0, sm = -Infinity; for (var w = 0; w <= nb; w++) if (delta[w] > sm) { sm = delta[w]; st = w; }
      for (var h = hist.length - 1; h > 0; h--) st = hist[h].bp[st];
      var old = hist[0].fr;
      if (st === U) return { t: old.t, f: null, conf: 0, rms: old.rms, c: old.c };
      /* the contour's own frequency: the candidate in that state, else the state's centre (a bridged frame) */
      var bf = null, bpv = 0, cc = old.c;
      for (var j = 0; j < cc.length; j += 2) {
        var bj = binOf(cc[j]); if (Math.abs(bj - st) <= 1.5 && cc[j + 1] > bpv) { bpv = cc[j + 1]; bf = cc[j]; }
      }
      return { t: old.t, f: bf !== null ? bf : fOfBin(st), conf: bpv, bridged: bf === null, rms: old.rms, c: old.c };
    }
    return { push: step, setGate: function (g) { gate = g; }, lag: LAG };
  }

  var api = { makeAnalyzer: makeAnalyzer, makeTracker: makeTracker, WORKLET_SRC: WORKLET_SRC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFPitch = api;
})(this);
