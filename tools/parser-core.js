/* Tonal Field — Parser core (decoder) · v7
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   The field accumulates nothing but its orientation. Every tone is heard; not every tone moves the field.
   A PHRASE is the run of tones between pauses (what counts as a pause is the caller's one rule).
   - The first phrase, with no field yet, forms by max-min (the degenerate edge; ties settled by a crossing, or by the
     next phrase).
   - After that the field holds or turns by its own curvature. On the lattice g' is zero at every tone, so no in-tune
     tone — an anti included — pushes the field; what the phrase's tones do is set its curvature at the orientation it
     stands in, −35·Σg over the phrase's distinct tones. While Σg ≥ 0 the field holds, whatever the phrase holds. When
     Σg < 0 the orientation is no longer a peak and the field lets go: it lands where the phrase is most consonant (the
     phrase's own highest peak; among equals the shortest turn, then the side the net force −Σg''' points). The phrase is
     the unit: while it sounds the field holds (where it would land is kept as `pending`); at the pause it turns, once,
     and the phrase is relabeled in the new orientation.
   One consequence, stated plainly: a collection one or two steps along the chain (the G or D collection heard from C)
   keeps the old field a peak, so it never releases it; near modulation is not explained by this, and is open.

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
  /* the continuous field and its third derivative, x in radians from Re */
  function gx(x) { return (7 / 12) * Math.cos(5 * x) + (5 / 12) * Math.cos(7 * x); }
  function g3x(x) { return (7 / 12) * 125 * Math.sin(5 * x) + (5 / 12) * 343 * Math.sin(7 * x); }
  var ST = Math.PI / 6;
  /* Σg of the phrase's tones in the orientation re (+ phi semitones, continuous) */
  function sumG(pcs, re, phi) { var s = 0; phi = phi || 0; for (var i = 0; i < pcs.length; i++) s += gx((pcs[i] - re - phi) * ST); return s; }
  /* released: the field lands where the phrase is most consonant — its own highest peak; among equals the shortest turn
     from where it stood, then the side the phrase's net force −Σg''' points */
  function land(pcs, re) {
    var f = 0; for (var i = 0; i < pcs.length; i++) f -= g3x((pcs[i] - re) * ST);
    var best = null, bv = -Infinity, bd = 99, bs = 0;
    for (var r = 0; r < 12; r++) {
      var v = sumG(pcs, r), d = mod12(r - re); if (d > 6) d -= 12;
      var side = (d > 0 ? 1 : d < 0 ? -1 : 0) * (f > EPS ? 1 : f < -EPS ? -1 : 0);
      if (v > bv + EPS || (Math.abs(v - bv) <= EPS && (Math.abs(d) < bd || (Math.abs(d) === bd && side > bs)))) { best = r; bv = v; bd = Math.abs(d); bs = side; }
    }
    return best;
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
      pending: null,       /* where the field will land at the pause, if the phrase so far has let it go */
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

      /* The first phrase — no field yet — forms by max-min, as before (the degenerate edge). */
      if (inc === null) {
        var set = phraseSet(idxs), mm = maximin(set), cands = mm.cands.slice(), re, basis;
        if (cands.length === 1) { re = cands[0]; basis = 'unique'; P.tie = null; }
        else if (cands.length === 2) {
          var tie = { cands: cands, bind: bindingPair(set, cands[0], cands[1], mm.best) };
          var pick = crossing(idxs, tie);
          P.tie = tie;
          if (pick !== null) { re = pick; basis = 'tie-heard'; }
          else { var q = P.events[idxs[idxs.length - 1]].pc; re = gv(q, cands[1]) > gv(q, cands[0]) + EPS ? cands[1] : cands[0]; basis = 'tie-open'; }
        } else { re = from; basis = 'open'; P.tie = null; }
        P.re = re; P.basis = basis;
        for (var m = 0; m < idxs.length; m++) label(idxs[m], re);
        if (re !== from && re !== null) emit(basis === 'tie-heard' ? 'resolve' : basis === 'tie-open' ? 'tie' : 'settle', t, from, re);
        return;
      }

      /* A FIELD EXISTS: it holds or it lets go, by its own curvature. On the lattice g' = 0 at every tone, so no in-tune
         tone pushes the field; the phrase's tones set its curvature at the orientation it stands in, −35·Σg. While Σg ≥ 0
         that orientation is a peak and the field holds. When Σg < 0 it is not, and the field lands on the phrase's own
         highest peak. Earlier tones keep the hearing they arrived with; this tone is heard where the field now stands. */
      P.tie = null;
      /* the phrase is the unit: it is read whole, over its distinct tones so far (a repetition is the same tone heard
         again, not more evidence). While it sounds, the field holds and its tones are heard in it; where the field would
         land is kept as `pending` (shown as a ghost). At the pause the field turns, once, and the phrase is relabeled. */
      var pcs = [];
      idxs.forEach(function (i) { var p = P.events[i].pc; if (pcs.indexOf(p) < 0) pcs.push(p); });
      label(idxs[idxs.length - 1], inc);
      P.re = inc;
      if (sumG(pcs, inc) < -EPS) { P.pending = land(pcs, inc); P.basis = 'pending'; }
      else { P.pending = null; P.basis = 'heard'; }
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
    /* a pause: the phrase is over; the orientation it left is what the next phrase arrives in */
    P.endPhrase = function (t) {
      if (P.phraseStart >= P.events.length) return;
      if (P.pending !== null && P.pending !== undefined && P.incoming !== null) {   /* the field lets go: one turn, and the phrase is heard in it */
        var from = P.re, to = P.pending;
        for (var i = P.phraseStart; i < P.events.length; i++) label(i, to);
        P.re = to; P.basis = 'changed'; P.pending = null;
        var shift = Math.min(mod12(to - from), mod12(from - to));
        emit(shift <= 1 ? 'rotate' : 'morph', t, from, to, shift + ' st');
      }
      P.incomingTie = (P.basis === 'tie-open' && P.tie) ? { cands: P.tie.cands.slice(), start: P.phraseStart } : null;
      P.incoming = P.re; P.phraseStart = P.events.length; P.phrases++;
      emit('phrase', t, P.re, P.re);
    };
    P.flush = function () {};
    P.reset = function () {
      P.re = null; P.incoming = null; P.incomingTie = null; P.basis = 'none'; P.pending = null; P.tie = null; P.phraseStart = 0; P.phrases = 0;
      P.events = []; P.log = [];
    };
    P.on = function (f) { P.listeners.push(f); };
    return P;
  }

  var api = { createParser: createParser, sumG: sumG, land: land, gv: gv, fnName: fnName, maximin: maximin, FN: FN, mod12: mod12, chainDist: chainDist };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFParser = api;
})(this);
