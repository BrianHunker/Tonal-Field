/* Tonal Field — Parser core (decoder) · v5
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   Every tone counts, however short. Memory never decays and nothing resets on its own.

   SETTLED: once a tritone has been heard — both tones of a hinge pair Fa·Ti sounded, at any distance in
   time — the field is settled, and it is heard that way until a DIFFERENT tritone is heard. Nothing
   else turns it: no cadence, no crossing, no tone outside the field. A new tritone turns it: rotating
   for a one-semitone shift, morphing for anything larger. Which tone of a tritone is Fa is read from
   the tones heard (max-min), nearest along the dominant chain when they do not say.

   BEFORE SETTLING (the degenerate stage): the tones heard so far are read by max-min. When two mirror
   hearings tie, a crossing of the two tones binding the tie, arriving on a held tone, decides the side,
   and what came before is relabeled. These readings are provisional; the first tritone settles them.

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

  function minG(pcs, re) {
    var m = Infinity;
    for (var i = 0; i < pcs.length; i++) m = Math.min(m, gv(pcs[i], re));
    return m;
  }
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
    return pcs.filter(function (p) {
      return Math.abs(gv(p, a) - best) <= EPS || Math.abs(gv(p, b) - best) <= EPS;
    });
  }
  function uniq(arr) { var s = {}, o = []; arr.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }

  function createParser(opts) {
    opts = opts || {};
    var P = {
      re: null,                           /* current orientation (pitch class of Re) */
      basis: 'none',                      /* none | unique | tie-open | tie-heard | open | settled */
      hinges: null,                       /* the tritone [a, a+6] the settled field turns on */
      tie: null,                          /* {cands:[a,b], bind:[p,q], since:index} */
      events: [],                         /* every tone heard, in order: {pc, t, held, re, fn} */
      log: [],                            /* what happened: settle / resolve / reheard / rotate / morph */
      collection: [],                     /* pitch classes heard before the field settled */
      mem: {},                            /* pc -> index of its latest event; memory never decays */
      since: 0,                           /* event index where the current memory began */
      listeners: []
    };

    function emit(kind, data) {
      var e = { kind: kind, t: data.t, from: data.from, to: data.to, note: data.note || '' };
      P.log.push(e);
      P.listeners.forEach(function (f) { f(e, P); });
    }
    function relabelFrom(idx) {
      for (var i = idx; i < P.events.length; i++) {
        P.events[i].re = P.re; P.events[i].fn = P.re === null ? null : fnName(P.events[i].pc, P.re);
      }
    }
    function prevTone(idx) {
      for (var i = idx - 1; i >= 0; i--) if (P.events[i].pc !== P.events[idx].pc) return P.events[i];
      return null;
    }
    /* a held arrival crossing the binding pair picks the side it resolves on */
    function crossingPick(idx, tie) {
      var q = P.events[idx], p = prevTone(idx);
      if (!p || !q.held) return null;
      var b = tie.bind;
      if (b.length !== 2 || b.indexOf(p.pc) < 0 || b.indexOf(q.pc) < 0) return null;
      var a = tie.cands[0], c = tie.cands[1];
      if (gv(q.pc, a) > gv(p.pc, a) + EPS) return a;
      if (gv(q.pc, c) > gv(p.pc, c) + EPS) return c;
      return null;
    }
    /* with no crossing yet: the provisional side is the one on which the latest tone sits higher */
    function provisional(idx, tie) {
      var q = P.events[idx];
      var a = tie.cands[0], c = tie.cands[1];
      return gv(q.pc, c) > gv(q.pc, a) + EPS ? c : a;
    }
    function sameTie(t1, cands) {
      return t1 && cands.length === 2 &&
        ((t1.cands[0] === cands[0] && t1.cands[1] === cands[1]) || (t1.cands[0] === cands[1] && t1.cands[1] === cands[0]));
    }

    /* FORMING: max-min over the collection; earlier tones are relabeled as the reading sharpens */
    function form(idx, now, quiet) {
      var mm = maximin(P.collection), from = P.re;
      if (mm.cands.length === 1) {
        P.re = mm.cands[0]; P.basis = 'unique'; P.tie = null;
        if (!quiet && from !== P.re) emit('settle', { t: now, from: from, to: P.re });
      } else if (mm.cands.length === 2) {
        var tie = { cands: mm.cands, bind: bindingPair(P.collection, mm.cands[0], mm.cands[1], mm.best), since: P.since };
        var keep = sameTie(P.tie, mm.cands) && P.basis === 'tie-heard';
        var pick = crossingPick(idx, tie);
        P.tie = tie;
        if (pick !== null) {
          var wasHeard = P.basis === 'tie-heard';
          P.re = pick; P.basis = 'tie-heard';
          if (!quiet && (from !== P.re || !wasHeard)) emit(wasHeard ? 'reheard' : 'resolve', { t: now, from: from, to: P.re, note: 'crossing' });
        } else if (keep || (from !== null && mm.cands.indexOf(from) >= 0 && P.basis !== 'tie-open')) {
          P.basis = P.basis === 'unique' ? 'tie-heard' : P.basis;   /* already heard one way: it holds */
        } else {
          var wasOpen = P.basis === 'tie-open';
          P.re = provisional(idx, tie); P.basis = 'tie-open';
          if (!quiet && (!wasOpen || from !== P.re)) emit('tie', { t: now, from: from, to: P.re });
        }
      } else {
        P.basis = 'open'; P.tie = null;   /* a symmetric collection: no reading is favored */
        if (!quiet) emit('open', { t: now, from: from, to: from });
      }
      relabelFrom(P.since);
    }

    /* SETTLING and TURNING happen only on a tritone: a tone whose partner (six semitones away) has also
       been heard. Memory never decays, so the partner may have sounded at any time. The tritone is the
       hinge pair Fa·Ti; it fixes the field up to which of its two tones is Fa, and the tones heard
       settle that. Once settled, the field is heard that way until a different tritone is heard. */
    function hingeOrientations(x) { return [mod12(x - 3), mod12(x + 3)]; }   /* x as Fa, x as Ti */
    function recentSet() {                       /* newest first, every tone that still fits with the rest */
      var order = Object.keys(P.mem).map(Number).sort(function (a, b) { return P.mem[b] - P.mem[a]; });
      var set = [];
      order.forEach(function (x) { var trial = set.concat([x]); if (maximin(trial).best >= -EPS) set = trial; });
      return set;
    }
    function pickHinge(cands, set) {
      var m0 = minG(set, cands[0]), m1 = minG(set, cands[1]);
      if (m0 > m1 + EPS) return cands[0];
      if (m1 > m0 + EPS) return cands[1];
      if (P.re !== null) return chainDist(P.re, cands[0]) <= chainDist(P.re, cands[1]) ? cands[0] : cands[1];
      return cands[0];
    }
    function settleOn(idx, now, x) {
      var from = P.re, wasSettled = P.basis === 'settled';
      var set = wasSettled ? recentSet() : Object.keys(P.mem).map(Number);
      P.re = pickHinge(hingeOrientations(x), set);
      P.hinges = [Math.min(x, mod12(x + 6)), Math.max(x, mod12(x + 6))];
      P.basis = 'settled'; P.tie = null;
      P.settledAt = wasSettled ? idx : 0;        /* the first settling owns everything heard so far */
      if (wasSettled) {
        var shift = Math.min(mod12(P.re - from), mod12(from - P.re));   /* semitones the field moved */
        emit(shift <= 1 ? 'rotate' : 'morph', { t: now, from: from, to: P.re, note: shift + ' st' });
        relabelFrom(idx);                         /* a turn happens here; what came before was heard as it was */
      } else {
        emit('hinged', { t: now, from: from, to: P.re, note: 'hinges ' + P.hinges.join('·') });
        relabelFrom(0);                           /* the first settling is how everything so far is heard */
      }
    }
    P.flush = function () {};

    /* a tone has been heard (held: whether it has sounded long enough to count as an arrival) */
    P.tone = function (pc, t, held) {
      pc = mod12(Math.round(pc));
      var ev = { pc: pc, t: t, held: !!held, re: P.re, fn: P.re === null ? null : fnName(pc, P.re) };
      P.events.push(ev);
      var idx = P.events.length - 1;
      /* a tritone is heard when this tone's partner has sounded and still belongs to the field as it
         stands — placed by it, or sounded since it last turned. A partner left behind in an earlier
         field is not re-heard. */
      var partner = mod12(pc + 6), pIdx = P.mem[partner];
      var partnerHeard = pIdx !== undefined &&
        (P.basis !== 'settled' || pIdx >= P.settledAt || gv(partner, P.re) >= -EPS);
      P.mem[pc] = idx;

      if (P.basis === 'settled') {
        var pair = [Math.min(pc, mod12(pc + 6)), Math.max(pc, mod12(pc + 6))];
        if (partnerHeard && (pair[0] !== P.hinges[0] || pair[1] !== P.hinges[1])) settleOn(idx, t, pc);
        return P.events[idx];                     /* anything else, cadences included, cannot turn it */
      }
      if (partnerHeard) { settleOn(idx, t, pc); return P.events[idx]; }

      /* not yet settled: the degenerate stage, read by max-min and, for ties, by crossings */
      if (P.collection.indexOf(pc) < 0) P.collection = P.collection.concat([pc]);
      form(idx, t);
      return P.events[idx];
    };
    /* a held arrival: lets a tie (before any tritone) be settled by a crossing that lands late */
    P.arrive = function (idx) {
      var e = P.events[idx]; if (!e || e.held) return;
      e.held = true;
      if (P.basis !== 'settled' && P.tie && P.collection.indexOf(e.pc) >= 0) form(idx, e.t);
    };
    P.reset = function () {
      P.re = null; P.basis = 'none'; P.tie = null; P.events = []; P.log = []; P.collection = []; P.mem = {}; P.since = 0; P.hinges = null; P.settledAt = 0;
    };
    P.on = function (f) { P.listeners.push(f); };
    return P;
  }

  var api = { createParser: createParser, gv: gv, fnName: fnName, maximin: maximin, FN: FN, mod12: mod12, chainDist: chainDist };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFParser = api;
})(this);
