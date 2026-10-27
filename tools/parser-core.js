/* Tonal Field — Parser core (decoder) · v4
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   Every tone counts, however short. Memory does not decay and nothing resets on its own.

   1. FORMING (space): the tones heard since the field last turned are read by max-min — the
      orientation that maximizes the least-supported tone's g. A growing collection can only narrow
      the reading, so this is the field coming into focus, not a modulation.
   2. TIES (time, the degenerate edge): when max-min leaves two orientations they are mirror images
      through a half-step axis, bound by a mirror pair one semitone apart. A crossing of that pair
      arriving on a held tone settles the side — the one on which the crossing moves out of the hinge
      into valence. Held-ness is used here and only here.
   3. TURNING: a tone the field cannot place turns it, as little as it must — the nearest orientation
      along the dominant chain that holds the newest tones (and every older tone it still can). It
      rotates for a one-semitone shift and morphs for anything larger. Non-diatonic colour (tones that
      should not turn the field) is deliberately not handled yet: diatonic rotation and morph first.

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
      basis: 'none',                      /* none | unique | tie-open | tie-heard | open */
      tie: null,                          /* {cands:[a,b], bind:[p,q], since:index} */
      events: [],                         /* every tone heard, in order: {pc, t, held, re, fn} */
      log: [],                            /* what happened: settle / resolve / reheard / rotate / morph */
      collection: [],                     /* pitch classes placed by the field since it last turned */
      mem: {},                            /* pc -> index of its latest event since the field last turned */
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

    /* TURNING: a tone the field cannot place turns it, as little as it must. The new collection is
       rebuilt from what was heard, newest first, keeping each tone while some orientation still holds
       them all in the positive half; the nearest such orientation along the dominant chain is taken. */
    function turn(idx, now) {
      var order = Object.keys(P.mem).map(Number).sort(function (a, b) { return P.mem[b] - P.mem[a]; });
      var set = [];
      order.forEach(function (x) { var trial = set.concat([x]); if (maximin(trial).best >= -EPS) set = trial; });
      var mm = maximin(set), from = P.re;
      var cands = mm.cands.slice();
      var dmin = Math.min.apply(null, cands.map(function (c) { return chainDist(from, c); }));
      cands = cands.filter(function (c) { return chainDist(from, c) === dmin; });
      var mem = {}; set.forEach(function (x) { mem[x] = P.mem[x]; });
      P.mem = mem; P.collection = set; P.since = idx;
      if (cands.length === 1) { P.re = cands[0]; P.basis = 'unique'; P.tie = null; }
      else {
        var tie = { cands: cands.slice(0, 2), bind: bindingPair(set, cands[0], cands[1], mm.best), since: idx };
        P.tie = tie; P.re = provisional(idx, tie); P.basis = 'tie-open';
      }
      var shift = Math.min(mod12(P.re - from), mod12(from - P.re));   /* semitones the field moved */
      emit(shift <= 1 ? 'rotate' : 'morph', { t: now, from: from, to: P.re, note: shift + ' st' });
      relabelFrom(idx);
    }
    P.flush = function () {};

    /* a tone has been heard (held: whether it has sounded long enough to count as an arrival) */
    P.tone = function (pc, t, held) {
      pc = mod12(Math.round(pc));
      var ev = { pc: pc, t: t, held: !!held, re: P.re, fn: P.re === null ? null : fnName(pc, P.re) };
      P.events.push(ev);
      var idx = P.events.length - 1;
      P.mem[pc] = idx;

      if (P.collection.indexOf(pc) >= 0) {        /* nothing new in space: only time can speak */
        if (P.tie) form(idx, t);
        return P.events[idx];
      }
      var trial = P.collection.concat([pc]);
      if (maximin(trial).best >= -EPS) { P.collection = trial; form(idx, t); return P.events[idx]; }
      turn(idx, t);                               /* the field as it stands cannot place this tone */
      return P.events[idx];
    };
    /* a held arrival on a tone already counted: lets a tie be settled by a crossing that lands late */
    P.arrive = function (idx) {
      var e = P.events[idx]; if (!e || e.held) return;
      e.held = true;
      if (P.tie && P.collection.indexOf(e.pc) >= 0) form(idx, e.t);
    };
    P.reset = function () {
      P.re = null; P.basis = 'none'; P.tie = null; P.events = []; P.log = []; P.collection = []; P.mem = {}; P.since = 0;
    };
    P.on = function (f) { P.listeners.push(f); };
    return P;
  }

  var api = { createParser: createParser, gv: gv, fnName: fnName, maximin: maximin, FN: FN, mod12: mod12, chainDist: chainDist };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFParser = api;
})(this);
