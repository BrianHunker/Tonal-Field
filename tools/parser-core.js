/* Tonal Field — Parser core (decoder) · v3
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   Every tone counts, however short. Memory does not decay and nothing resets on its own.

   1. FORMING (space): the tones heard since the field last turned are read by max-min — the
      orientation that maximizes the least-supported tone's g. A growing collection can only narrow
      the reading, so this is the field coming into focus, not a modulation.
   2. TIES (time, the degenerate edge): when max-min leaves two orientations they are mirror images
      through a half-step axis, bound by a mirror pair one semitone apart. A crossing of that pair
      arriving on a held tone settles the side — the one on which the crossing moves out of the hinge
      into valence. Held-ness is used here and only here.
   3. TURNING: a tone the current field cannot place turns the field only if some orientation can
      account for every tone heard since the last turn — each one either placed in its positive half,
      or superseded: replaced by a later tone one semitone away that the new orientation does place.
      If no orientation can, the tone is colour: heard, labeled, remembered, and the field holds.
      (A diatonic orientation holds exactly two half-steps, both touching a hinge; harmonic and
      melodic minor, phrygian and lydian dominant leave a tone no single orientation explains.)
      When it turns, it turns as little as it must: nearest along the dominant chain.

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
      pending: null,                      /* a turn asked for, decided by the next tone */
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

    /* signed steps along the dominant chain from orientation a to b (b = a + 7k): + sharpward, − flatward */
    function chainSteps(a, b) { for (var k = 0; k < 12; k++) if (mod12(a + 7 * k) === b) return k > 6 ? k - 12 : k; return 0; }

    /* TURNING. The new orientation must account for every tone in memory: placed in its positive half,
       or superseded — moved one semitone in the direction the field turns (sharpward +1, flatward −1)
       by a later tone it does place. That is the field changing as little as it must: each chain step
       alters exactly one tone by one semitone. Returns the orientations that can. */
    function accountFor(q) {
      var pcs = Object.keys(P.mem).map(Number);
      var out = [];
      for (var r = 0; r < 12; r++) {
        if (r === P.re || gv(q, r) < -EPS) continue;
        var k = chainSteps(P.re, r), dirs = k === 6 ? [1, -1] : [k > 0 ? 1 : -1];
        var live = [], ok = true;
        for (var i = 0; i < pcs.length && ok; i++) {
          var x = pcs[i];
          if (gv(x, r) >= -EPS) { live.push(x); continue; }
          var sup = dirs.some(function (d) { var y = mod12(x + d); return P.mem[y] !== undefined && P.mem[y] > P.mem[x] && gv(y, r) >= -EPS; });
          if (!sup) ok = false;
        }
        if (ok) out.push({ re: r, live: live, m: minG(live, r) });
      }
      return out;
    }
    function choose(opts) {
      var best = Math.max.apply(null, opts.map(function (o) { return o.m; }));
      opts = opts.filter(function (o) { return o.m >= best - EPS; });
      var dmin = Math.min.apply(null, opts.map(function (o) { return chainDist(P.re, o.re); }));
      return { best: best, opts: opts.filter(function (o) { return chainDist(P.re, o.re) === dmin; }) };   /* as little as it must */
    }
    function applyTurn(idx, now, ch) {
      var from = P.re, opts = ch.opts, live = opts[0].live;
      var mem = {}; live.forEach(function (x) { mem[x] = P.mem[x]; });
      P.mem = mem; P.collection = live.slice(); P.since = idx;
      if (opts.length === 1) { P.re = opts[0].re; P.basis = 'unique'; P.tie = null; }
      else {
        var tie = { cands: [opts[0].re, opts[1].re], bind: bindingPair(live, opts[0].re, opts[1].re, ch.best), since: idx };
        P.tie = tie; P.re = provisional(idx, tie); P.basis = 'tie-open';
      }
      var shift = Math.min(mod12(P.re - from), mod12(from - P.re));   /* semitones the field moved */
      emit(shift <= 1 ? 'rotate' : 'morph', { t: now, from: from, to: P.re, note: shift + ' st' });
      relabelFrom(idx);
    }
    /* A turn is decided by the tone after the one that asked for it: the new orientation must place it.
       If that tone goes straight back to what the turn would have replaced, or is itself outside the new
       orientation, the asking tone was an approach, not an arrival — it is colour and the field holds.
       Silence (flush) commits it. */
    function settlePending(nextPc) {
      var pd = P.pending; if (!pd) return;
      P.pending = null;
      var opts = accountFor(pd.q);
      if (nextPc !== undefined) opts = opts.filter(function (o) { return gv(nextPc, o.re) >= -EPS; });
      if (!opts.length) { P.events[pd.idx].colour = true; return; }
      applyTurn(pd.idx, pd.t, choose(opts));
    }
    P.flush = function () { settlePending(); };

    /* a tone has been heard (held: whether it has sounded long enough to count as an arrival) */
    P.tone = function (pc, t, held) {
      pc = mod12(Math.round(pc));
      var ev = { pc: pc, t: t, held: !!held, re: P.re, fn: P.re === null ? null : fnName(pc, P.re) };
      P.events.push(ev);
      var idx = P.events.length - 1;
      if (P.pending && pc !== P.events[P.pending.idx].pc) settlePending(pc);
      P.mem[pc] = idx;

      if (P.collection.indexOf(pc) >= 0) {        /* nothing new in space: only time can speak */
        if (P.tie) form(idx, t);
        return P.events[idx];
      }
      var trial = P.collection.concat([pc]);
      if (maximin(trial).best >= -EPS) { P.collection = trial; form(idx, t); return P.events[idx]; }
      /* the field as it stands cannot place this tone: can any orientation account for what was heard? */
      if (P.pending && P.events[P.pending.idx].pc === pc) return P.events[idx];
      var opts = accountFor(pc);
      if (!opts.length) { ev.colour = true; return P.events[idx]; }   /* colour: heard, remembered; the field holds */
      P.pending = { idx: idx, t: t, q: pc };
      return P.events[idx];
    };
    /* a held arrival on a tone already counted: lets a tie be settled by a crossing that lands late */
    P.arrive = function (idx) {
      var e = P.events[idx]; if (!e || e.held) return;
      e.held = true;
      if (P.tie && P.collection.indexOf(e.pc) >= 0) form(idx, e.t);
    };
    P.reset = function () {
      P.re = null; P.basis = 'none'; P.tie = null; P.events = []; P.log = []; P.collection = []; P.mem = {}; P.since = 0; P.pending = null;
    };
    P.on = function (f) { P.listeners.push(f); };
    return P;
  }

  var api = { createParser: createParser, gv: gv, fnName: fnName, maximin: maximin, FN: FN, mod12: mod12, chainDist: chainDist };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFParser = api;
})(this);
