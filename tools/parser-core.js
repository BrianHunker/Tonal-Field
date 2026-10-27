/* Tonal Field — Parser core (decoder) · v1
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   One mechanism, read across space and across time:
   1. SPACE (valence, even about the crest): the field changes as little as it must to keep every
      held tone in the window in its positive half. With no orientation yet, the orientation is the
      max-min reading — the one that maximizes the least-supported held tone's g.
   2. TIME (odd under the mirror): when max-min leaves exactly two orientations, they are mirror
      images through a half-step axis, and the two tones binding the minimum are a mirror pair one
      semitone apart. Only a crossing of that pair can tell the sides apart: the side is the one on
      which the crossing, arriving on a HELD tone, moves out of the hinge into valence.
   An open tie stays open (both readings live). When it is settled, that is a resolution, not a
   rotation: nothing modulated, and the earlier tones are relabeled.
   Irreducibles, exposed as settings rather than buried in rules: the window (how far back held
   tones count) and the exchange rate (how many held violations it takes to turn the field).

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
      windowSec: opts.windowSec || 6,     /* irreducible 1: how far back held tones count */
      exchange: opts.exchange || 1,       /* irreducible 2: held violations needed to turn the field */
      re: null,                           /* current orientation (pitch class of Re) */
      basis: 'none',                      /* none | unique | tie-open | tie-heard | open */
      tie: null,                          /* {cands:[a,b], bind:[p,q], since:index} */
      events: [],                         /* every tone heard, in order: {pc, t, held, re, fn} */
      log: [],                            /* what happened: settle / resolve / reheard / rotate / morph */
      violations: {},                     /* pc -> count of held violations since the last turn */
      collection: [],                     /* held pitch classes since the field last turned */
      since: 0,                           /* event index where the current collection began */
      listeners: []
    };

    function emit(kind, data) {
      var e = { kind: kind, t: data.t, from: data.from, to: data.to, note: data.note || '' };
      P.log.push(e);
      P.listeners.forEach(function (f) { f(e, P); });
    }
    function heldWindow(now) {
      return P.events.filter(function (e) { return e.held && e.t >= now - P.windowSec; });
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
    /* with no crossing yet: the provisional side is the one on which the latest held tone sits higher */
    function provisional(idx, tie) {
      var q = P.events[idx];
      var a = tie.cands[0], c = tie.cands[1];
      return gv(q.pc, c) > gv(q.pc, a) + EPS ? c : a;
    }
    function sameTie(t1, cands) {
      return t1 && cands.length === 2 &&
        ((t1.cands[0] === cands[0] && t1.cands[1] === cands[1]) || (t1.cands[0] === cands[1] && t1.cands[1] === cands[0]));
    }

    function firstWindowIndex(now) {
      for (var i = 0; i < P.events.length; i++) if (P.events[i].t >= now - P.windowSec) return i;
      return P.events.length - 1;
    }

    /* FORMING: the collection (every held tone since the field last turned — tonal memory does not
       decay) is read by max-min. A growing collection can only narrow the reading, so this is the
       field coming into focus, not a modulation; earlier tones are relabeled as it sharpens. */
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

    /* TURNING: a held tone the collection cannot hold in the positive half, past the exchange rate.
       The field turns as little as it must — the new collection is rebuilt from the newest held tones
       backward, keeping each one while some orientation still holds them all in the positive half. */
    function turn(idx, now) {
      var win = heldWindow(now).slice().reverse();      /* newest first */
      var set = [];
      win.forEach(function (e) {
        if (set.indexOf(e.pc) >= 0) return;
        var trial = set.concat([e.pc]);
        if (maximin(trial).best >= -EPS) set = trial;
      });
      var mm = maximin(set), from = P.re;
      var cands = mm.cands.slice();
      var dmin = Math.min.apply(null, cands.map(function (c) { return chainDist(from, c); }));
      cands = cands.filter(function (c) { return chainDist(from, c) === dmin; });   /* minimal change */
      P.collection = set; P.since = idx; P.violations = {};
      if (cands.length === 1) { P.re = cands[0]; P.basis = 'unique'; P.tie = null; }
      else if (cands.length === 2) {
        var tie = { cands: cands, bind: bindingPair(set, cands[0], cands[1], mm.best), since: idx };
        P.tie = tie; P.re = provisional(idx, tie); P.basis = 'tie-open';
      } else { P.basis = 'open'; P.tie = null; }
      var shift = Math.min(mod12(P.re - from), mod12(from - P.re));   /* semitones the field moved */
      emit(shift <= 1 ? 'rotate' : 'morph', { t: now, from: from, to: P.re, note: shift + ' st' });
      relabelFrom(idx);
    }

    /* a tone has become held (or ended without ever being held: held=false) */
    P.tone = function (pc, t, held) {
      pc = mod12(Math.round(pc));
      var ev = { pc: pc, t: t, held: !!held, re: P.re, fn: P.re === null ? null : fnName(pc, P.re) };
      P.events.push(ev);
      var idx = P.events.length - 1;
      if (!held) return ev;                       /* passing tones are labeled, not weighed */

      if (P.collection.indexOf(pc) >= 0) {        /* nothing new in space: only time can speak */
        if (P.tie) form(idx, t);
        return P.events[idx];
      }
      var trial = P.collection.concat([pc]);
      if (maximin(trial).best >= -EPS) { P.collection = trial; form(idx, t); return P.events[idx]; }

      /* the collection cannot hold this tone in the positive half */
      P.violations[pc] = (P.violations[pc] || 0) + 1;
      var total = 0; for (var k in P.violations) total += P.violations[k];
      if (total >= P.exchange) turn(idx, t);      /* otherwise it is colour: heard, labeled, not taken */
      return P.events[idx];
    };
    P.reset = function () {
      P.re = null; P.basis = 'none'; P.tie = null; P.events = []; P.log = []; P.violations = {}; P.collection = []; P.since = 0;
    };
    P.on = function (f) { P.listeners.push(f); };
    return P;
  }

  var api = { createParser: createParser, gv: gv, fnName: fnName, maximin: maximin, FN: FN, mod12: mod12, chainDist: chainDist };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFParser = api;
})(this);
