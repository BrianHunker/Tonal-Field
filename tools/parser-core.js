/* Tonal Field — Parser core (decoder) · v6
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   The field accumulates nothing. It holds no memory beyond its current orientation, and that
   orientation was set by nothing more than the last phrase. It applies only to how the next phrase
   is first received.

   A PHRASE is the run of tones between pauses (what counts as a pause is the caller's one rule).
   Each phrase is heard against the orientation it arrives in:
   - if that orientation places every tone of the phrase in its positive half, the phrase is heard
     in it and nothing changes — no cadence, no crossing, nothing short of a tone it cannot place;
   - otherwise the phrase is definitive about a new orientation, read from its own tones, newest first
     (a tone the later tones contradict is dropped): the field changes as little as it must — of the
     orientations that place those tones, the nearest to the incoming one along the dominant chain,
     max-min among equals. The change happens at the first tone the incoming orientation could not place.
   When the phrase arrives with no orientation at all (the first phrase — the degenerate edge), it is
   read by max-min alone, and when two mirror readings tie, a crossing of the two tones binding the
   tie, arriving on a held tone, decides the side. If a phrase ends with the tie still open, the next
   phrase may settle it: placed by the other reading, it resolves the tie and relabels that phrase.
   At the pause, whatever orientation the phrase left is what the next phrase arrives in.

   Orientation is written as `re`: the pitch class that is Re (0 = the tuning grid's C). */
(function (root) {
  'use strict';

  var FN = ['Re', '~La', 'Mi', 'Fa', '~Do', 'Sol', '~Re', 'La', '~Mi', 'Ti', 'Do', '~Sol'];
  var EPS = 1e-9;

  function mod12(n) { return ((n % 12) + 12) % 12; }
  /* lattice valence: g at the tone's position = cos(5·(p−re)·π/6), exact on the lattice */
  function gv(pc, re) { return Math.cos(5 * mod12(pc - re) * Math.PI / 6); }
  function fnName(pc, re) { return FN[mod12(pc - re)]; }
  /* distance between two orientations along the dominant chain (0..6 steps) */
  function chainDist(a, b) { var d = mod12(5 * mod12(b - a)); return Math.min(d, 12 - d); }
  function minG(pcs, re) { var m = Infinity; for (var i = 0; i < pcs.length; i++) m = Math.min(m, gv(pcs[i], re)); return m; }
  /* every orientation that maximizes the least-supported tone's g */
  function maximin(pcs) {
    var best = -Infinity, out = [];
    for (var re = 0; re < 12; re++) {
      var m = minG(pcs, re);
      if (m > best + EPS) { best = m; out = [re]; }
      else if (Math.abs(m - best) <= EPS) out.push(re);
    }
    return { cands: out, best: best };
  }
  /* the tones sitting at the minimum under either of two tied orientations */
  function bindingPair(pcs, a, b, best) {
    return pcs.filter(function (p) { return Math.abs(gv(p, a) - best) <= EPS || Math.abs(gv(p, b) - best) <= EPS; });
  }

  function createParser() {
    var P = {
      re: null,            /* the orientation now (pitch class of Re) */
      incoming: null,      /* the orientation the current phrase arrived in */
      basis: 'none',       /* none | heard | changed | unique | tie-open | tie-heard | open */
      tie: null,           /* {cands:[a,b], bind:[p,q]} while two mirror readings tie */
      phraseStart: 0,      /* index of the current phrase's first tone */
      phrases: 0,          /* how many phrases have ended */
      events: [],          /* every tone heard, in order: {pc, t, held, re, fn, phrase} */
      log: [],
      listeners: []
    };
    function emit(kind, t, from, to, note) {
      var e = { kind: kind, t: t, from: from, to: to, note: note || '' };
      P.log.push(e); P.listeners.forEach(function (f) { f(e, P); });
    }
    function label(i, re) { var e = P.events[i]; e.re = re; e.fn = re === null ? null : fnName(e.pc, re); }

    /* the phrase's own reading: newest first, keeping each tone the later ones do not contradict */
    function phraseSet(idxs) {
      var set = [];
      for (var k = idxs.length - 1; k >= 0; k--) {
        var x = P.events[idxs[k]].pc;
        if (set.indexOf(x) >= 0) continue;
        var trial = set.concat([x]);
        if (maximin(trial).best >= -EPS) set = trial;
      }
      return set;
    }
    /* the latest crossing of the binding pair inside the phrase that arrives on a held tone */
    function crossing(idxs, tie) {
      for (var k = idxs.length - 1; k > 0; k--) {
        var q = P.events[idxs[k]]; if (!q.held) continue;
        var j = k - 1; while (j >= 0 && P.events[idxs[j]].pc === q.pc) j--;
        if (j < 0) continue;
        var p = P.events[idxs[j]];
        if (tie.bind.indexOf(p.pc) < 0 || tie.bind.indexOf(q.pc) < 0) continue;
        var a = tie.cands[0], c = tie.cands[1];
        if (gv(q.pc, a) > gv(p.pc, a) + EPS) return a;
        if (gv(q.pc, c) > gv(p.pc, c) + EPS) return c;
      }
      return null;
    }

    /* read the phrase so far against the orientation it arrived in */
    function read() {
      var idxs = []; for (var i = P.phraseStart; i < P.events.length; i++) idxs.push(i);
      if (!idxs.length) return;
      var inc = P.incoming, from = P.re, t = P.events[idxs[idxs.length - 1]].t;

      /* the degenerate edge, once more: if the last phrase ended on an open tie and this phrase is placed
         by the other reading, the tie is resolved — the last phrase is relabeled, nothing modulated */
      var it = P.incomingTie;
      if (it) {
        var pcsNow = idxs.map(function (i) { return P.events[i].pc; });
        var other = it.cands[0] === inc ? it.cands[1] : it.cands[0];
        if (minG(pcsNow, inc) < -EPS && minG(pcsNow, other) >= -EPS) {
          P.re = other; P.incoming = other; P.basis = 'tie-heard'; P.tie = null; P.incomingTie = null;
          for (var j = it.start; j < P.events.length; j++) label(j, other);
          emit('resolve', t, from, other, 'next phrase');
          return;
        }
      }

      var force = -1;                                /* the first tone the incoming orientation cannot place */
      if (inc !== null) for (var k = 0; k < idxs.length; k++) if (gv(P.events[idxs[k]].pc, inc) < -EPS) { force = k; break; }
      if (inc !== null && force < 0) {               /* heard in the orientation it arrived in */
        P.re = inc; P.basis = 'heard'; P.tie = null;
        idxs.forEach(function (i) { label(i, inc); });
        return;
      }

      var set = phraseSet(idxs), mm = maximin(set), cands = mm.cands.slice();
      if (inc !== null) {
        /* the field changes as little as it must: of the orientations that place the phrase,
           the nearest to the incoming one along the dominant chain, then the max-min among those */
        var ok = []; for (var r = 0; r < 12; r++) if (minG(set, r) >= -EPS) ok.push(r);
        var dmin = Math.min.apply(null, ok.map(function (c) { return chainDist(inc, c); }));
        ok = ok.filter(function (c) { return chainDist(inc, c) === dmin; });
        var bm = Math.max.apply(null, ok.map(function (c) { return minG(set, c); }));
        cands = ok.filter(function (c) { return minG(set, c) >= bm - EPS; });
        mm = { cands: cands, best: bm };
      }
      var re, basis;
      if (cands.length === 1) { re = cands[0]; basis = inc === null ? 'unique' : 'changed'; P.tie = null; }
      else if (cands.length === 2) {
        var tie = { cands: cands, bind: bindingPair(set, cands[0], cands[1], mm.best) };
        var pick = crossing(idxs, tie);
        P.tie = tie;
        if (pick !== null) { re = pick; basis = 'tie-heard'; }
        else {                                       /* provisional: the side on which the latest tone sits higher */
          var q = P.events[idxs[idxs.length - 1]].pc;
          re = gv(q, cands[1]) > gv(q, cands[0]) + EPS ? cands[1] : cands[0];
          basis = 'tie-open';
        }
      } else { re = from !== null ? from : inc; basis = 'open'; P.tie = null; }

      P.re = re; P.basis = basis;
      var startK = inc === null ? 0 : force;
      for (var m = 0; m < idxs.length; m++) label(idxs[m], m < startK ? inc : re);
      if (re !== from && re !== null) {
        if (inc === null || from === null) emit(basis === 'tie-heard' ? 'resolve' : basis === 'tie-open' ? 'tie' : 'settle', t, from, re);
        else {
          var shift = Math.min(mod12(re - from), mod12(from - re));
          emit(shift <= 1 ? 'rotate' : 'morph', t, from, re, shift + ' st');
        }
      }
    }

    /* a tone has been heard (held: whether it has sounded long enough to count as an arrival) */
    P.tone = function (pc, t, held) {
      pc = mod12(Math.round(pc));
      var ev = { pc: pc, t: t, held: !!held, re: P.re, fn: P.re === null ? null : fnName(pc, P.re), phrase: P.phrases };
      P.events.push(ev);
      read();
      return ev;
    };
    /* the tone at idx has sounded long enough to be an arrival (matters only for a tie) */
    P.arrive = function (idx) {
      var e = P.events[idx]; if (!e || e.held) return;
      e.held = true;
      if (P.tie && idx >= P.phraseStart) read();
    };
    /* a closer listen corrects a tone's pitch class: within the current phrase the phrase is read again */
    P.retune = function (idx, pc) {
      var e = P.events[idx]; if (!e) return;
      pc = mod12(Math.round(pc)); if (e.pc === pc) return;
      e.pc = pc;
      if (idx >= P.phraseStart) read(); else e.fn = e.re === null ? null : fnName(pc, e.re);
    };
    /* a pause: the phrase is over; the orientation it left is what the next phrase arrives in */
    P.endPhrase = function (t) {
      if (P.phraseStart >= P.events.length) return;
      P.incomingTie = (P.basis === 'tie-open' && P.tie) ? { cands: P.tie.cands.slice(), start: P.phraseStart } : null;
      P.incoming = P.re; P.phraseStart = P.events.length; P.phrases++;
      emit('phrase', t, P.re, P.re);
    };
    P.flush = function () {};
    P.reset = function () {
      P.re = null; P.incoming = null; P.incomingTie = null; P.basis = 'none'; P.tie = null; P.phraseStart = 0; P.phrases = 0;
      P.events = []; P.log = [];
    };
    P.on = function (f) { P.listeners.push(f); };
    return P;
  }

  var api = { createParser: createParser, gv: gv, fnName: fnName, maximin: maximin, FN: FN, mod12: mod12, chainDist: chainDist };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFParser = api;
})(this);
