/* Tonal Field — Parser · beat tracker · v1
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   The beat is read from the playing itself, from two things only:
   - how the onsets are spaced: the tempo is the spacing that recurs most among the last few seconds of
     onsets (every pair of onsets votes for its distance, weighted by how accented both are);
   - which onsets are accented: of all the ways to lay that spacing over the onsets, the beat is the one
     that lands on the strongest ones.
   An onset that falls on the beat is a beat; any other is a subdivision. Nothing is assumed about metre,
   and the tempo follows the player: it is re-read at every onset, and kept unless a clearly better one
   appears. */
(function (root) {
  'use strict';

  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[b.length >> 1] : 1; }

  function makeBeat(o) {
    o = o || {};
    var WIN = o.window || 6;                      /* seconds of onsets the tempo is read from */
    var B = { onsets: [], period: null, phase: null, ready: false };

    function weights(now) {
      var med = median(B.onsets.map(function (x) { return x.s; })) || 1;
      return B.onsets.map(function (x) {
        var a = Math.pow(Math.max(0.3, Math.min(3, x.s / med)), 3);   /* accents count for much more than their level */
        return a * Math.exp(-(now - x.t) / WIN);             /* recent onsets count more */
      });
    }
    /* how strongly a spacing L recurs among the onsets */
    function vote(L, w) {
      var v = 0, sg = 0.025, ons = B.onsets;
      for (var i = 0; i < ons.length; i++) for (var j = i + 1; j < ons.length; j++) {
        var d = ons[j].t - ons[i].t; if (d > 4) break;
        var k = Math.round(d / L); if (k < 1 || k > 4) continue;
        var e = d - k * L; v += w[i] * w[j] * Math.exp(-e * e / (2 * sg * sg)) / k;
      }
      return v;
    }
    function prior(L) { var z = Math.log2(L / 0.6) / 0.8; return Math.exp(-0.5 * z * z); }   /* centred near 100 bpm, broad */
    function phaseScore(cand, L, w) {
      var sc = 0, ons = B.onsets;
      for (var i = 0; i < ons.length; i++) {
        var x = (ons[i].t - cand) / L, d = (x - Math.round(x)) * L;
        sc += w[i] * Math.exp(-d * d / (2 * 0.035 * 0.035));
      }
      return sc;
    }
    function bestPhase(L, w, now) {
      var best = -1, ph = 0, ons = B.onsets;
      for (var c = 0; c < ons.length; c++) {          /* earliest wins among equals: the first onset heard is a beat */
        var sc = phaseScore(ons[c].t, L, w);
        if (sc > best * 1.02) { best = sc; ph = ons[c].t; }
      }
      if (B.phase !== null) {                         /* and the beat already heard is kept unless the accents clearly move it */
        var keep = B.phase + Math.round((ph - B.phase) / L) * L, ks = phaseScore(keep, L, w);
        if (ks * 1.3 >= best) ph = keep;
      }
      return ph;
    }
    function estimate(now) {
      var ons = B.onsets;
      if (ons.length < 5 || ons[ons.length - 1].t - ons[0].t < 1.5) { B.ready = false; return; }
      var w = weights(now), bestL = null, bestV = -1;
      for (var L = 0.3; L <= 1.2; L += 0.005) { var v = vote(L, w) * prior(L); if (v > bestV) { bestV = v; bestL = L; } }
      if (B.period !== null) {                             /* keep the beat unless a clearly better one appears */
        var cur = null, cv = -1;
        for (var L2 = B.period * 0.92; L2 <= B.period * 1.08; L2 += 0.003) { var v2 = vote(L2, w) * prior(L2); if (v2 > cv) { cv = v2; cur = L2; } }
        if (cv * 1.3 >= bestV) { bestL = cur; bestV = cv; }
      }
      B.period = bestL; B.phase = bestPhase(bestL, w, now); B.ready = true;
    }
    /* an onset at time t with accent s (any positive measure; only ratios matter); returns whether it is a beat */
    B.onset = function (t, s) {
      B.onsets.push({ t: t, s: Math.max(1e-6, s) });
      while (B.onsets.length && B.onsets[0].t < t - WIN) B.onsets.shift();
      estimate(t);
      return B.isBeat(t);
    };
    B.isBeat = function (t) {
      if (!B.ready) return true;
      var x = (t - B.phase) / B.period, d = Math.abs(x - Math.round(x)) * B.period;
      return d <= Math.max(0.06, 0.12 * B.period);
    };
    /* the first beat after time t */
    B.next = function (t) {
      if (!B.ready) return null;
      var k = Math.floor((t - B.phase) / B.period) + 1;
      return B.phase + k * B.period;
    };
    B.reset = function () { B.onsets = []; B.period = null; B.phase = null; B.ready = false; };
    return B;
  }

  var api = { makeBeat: makeBeat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFBeat = api;
})(this);
