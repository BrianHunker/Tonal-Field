/* Tonal Field — Parser · polyphonic listening · v1
   © Brian Hunker 2026 · GablesGuitar.com/tonal-field

   Several tones at once, from one signal (a guitar's output, a microphone). The measurement is Spotify's Basic Pitch
   model (Apache-2.0, tools/basic-pitch/): a small network that, for every ~11.6 ms frame, reports how strongly each of
   88 keys is sounding, how likely each is starting, and a pitch contour at a third of a semitone. It measures which
   frequencies are sounding; it decides nothing about what they mean — that stays with the field.

   The model takes a fixed two-second window (shorter windows break its lowest octaves, which need the length). To listen live, the newest two seconds are kept in a rolling buffer at
   22 050 Hz and the model is run on them again and again, as fast as the machine allows; each pass hands on only the
   frames that are new and that stand at least LOOK frames behind the window's leading edge (the edge has no future
   context, so the frames right at it are less sure). LOOK is the one trade between latency and certainty.

   A per-key tracker turns the frames into tones: a tone starts where its key's onset and activation both rise, carries
   a continuous pitch read from the contour (never rounded), restarts on a fresh onset, and ends when its activation
   falls away. */
(function (root) {
  'use strict';

  var SR = 22050, N = 43844, HOP = 256, NF = 172, KEYS = 88, CB = 264, MIDI0 = 21, FR = HOP / SR;

  /* the audio-thread tap: posts the input in blocks of 512 samples, stamped with the context time at the block's end */
  var TAP_SRC =
    'class TFTap extends AudioWorkletProcessor {\n' +
    '  constructor(){ super(); this.b = new Float32Array(512); this.n = 0; }\n' +
    '  process(inputs){\n' +
    '    var ch = inputs[0]; if (!ch || !ch.length) return true;\n' +
    '    var L = ch[0].length;\n' +
    '    for (var i = 0; i < L; i++){ var v = 0; for (var c = 0; c < ch.length; c++) v += ch[c][i]; this.b[this.n++] = v / ch.length;\n' +
    '      if (this.n === 512){ this.port.postMessage({ x: this.b, t: currentTime + (i + 1) / sampleRate }); this.b = new Float32Array(512); this.n = 0; } }\n' +
    '    return true;\n' +
    '  }\n' +
    '}\n' +
    "registerProcessor('tf-tap', TFTap);\n";

  function create(o) {
    var ac = o.ac, P = {
      on: false, ready: null, busy: false, wait: false, look: o.look !== undefined ? o.look : 3, err: null,
      lastMs: 0,            /* the last pass's inference time */
      latency: 0,           /* how far behind the present the newest handed-on frame stood */
      onFrame: o.onFrame || function () {}
    };
    var ring = new Float32Array(N), total = 0;      /* resampled samples, ever */
    var mapS = 0, mapT = 0;                          /* the newest (sample count, context time) pair */
    var ratio = SR / ac.sampleRate, phase = 0, prev = 0;
    var emittedT = -Infinity, model = null, node = null, lp1 = null, lp2 = null;

    /* resampling to 22 050 Hz: two low-pass stages in the audio graph clear what would alias, then linear interpolation */
    function feed(x, tEnd) {
      for (var i = 0; i < x.length; i++) {
        var cur = x[i];
        while (phase < 1) { ring[total % N] = prev + (cur - prev) * phase; total++; phase += 1 / ratio; }
        phase -= 1; prev = cur;
      }
      mapS = total; mapT = tEnd;
      if (!P.busy && !P.wait) pass();
    }
    function window_() {                             /* the newest N samples, oldest first */
      var w = new Float32Array(N), s = total - N;
      for (var i = 0; i < N; i++) { var k = s + i; w[i] = k < 0 ? 0 : ring[k % N]; }
      return w;
    }
    function pass() {
      if (!model || !P.on || total < HOP * 8) return;
      P.busy = true;
      var end = total, w = window_(), t0 = performance.now();
      var outs = tf.tidy(function () {
        var r = model.execute(tf.tensor3d(w, [1, N, 1]), ['Identity_1', 'Identity_2', 'Identity']);
        return r.map(function (z) { return tf.keep(z); });
      });
      Promise.all(outs.map(function (z) { return z.data(); })).then(function (d) {
        outs.forEach(function (z) { z.dispose(); });
        P.lastMs = performance.now() - t0;
        var fr = d[0], on = d[1], ct = d[2], start = end - N, newest = null;
        for (var j = 0; j <= NF - 1 - P.look; j++) {
          var s = start + j * HOP; if (s < 0) continue;
          var t = mapT - (mapS - s) / SR;
          if (t <= emittedT + 1e-6) continue;
          emittedT = t; newest = t;
          /* the frame's own level, measured on the signal before the model normalizes it: the model scales every window to
             full range, so silence would come out as tones from the noise floor */
          var e2 = 0, c0 = Math.max(0, j * HOP - HOP), c1 = Math.min(N, j * HOP + HOP);
          for (var q = c0; q < c1; q++) e2 += w[q] * w[q];
          P.onFrame({ t: t, rms: Math.sqrt(e2 / Math.max(1, c1 - c0)), frames: fr.subarray(j * KEYS, (j + 1) * KEYS), onsets: on.subarray(j * KEYS, (j + 1) * KEYS), contour: ct.subarray(j * CB, (j + 1) * CB) });
        }
        if (newest !== null) P.latency = ac.currentTime - newest;
        P.busy = false;
        /* the page comes first: after a pass, the main thread is left free for half as long as the pass took */
        P.wait = true;
        setTimeout(function () { P.wait = false; if (P.on && total - end >= HOP) pass(); }, Math.max(4, P.lastMs * 0.5));
      }).catch(function (e) { P.busy = false; P.err = e; });
    }

    P.ready = (function () {
      if (typeof tf === 'undefined') return Promise.reject(new Error('the TensorFlow library did not load'));
      return tf.ready().then(function () { return tf.loadGraphModel(o.modelUrl); }).then(function (m) {
        model = m;
        /* one warm-up pass, so the first real one is not slow */
        tf.tidy(function () { model.execute(tf.zeros([1, N, 1]), ['Identity_1']); });
        var url = URL.createObjectURL(new Blob([TAP_SRC], { type: 'application/javascript' }));
        return ac.audioWorklet.addModule(url);
      }).then(function () {
        lp1 = ac.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 9500; lp1.Q.value = 0.54;
        lp2 = ac.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 9500; lp2.Q.value = 1.31;
        node = new AudioWorkletNode(ac, 'tf-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
        o.input.connect(lp1); lp1.connect(lp2); lp2.connect(node);
        var sink = ac.createGain(); sink.gain.value = 0; node.connect(sink); sink.connect(ac.destination);
        node.port.onmessage = function (e) { if (P.on) feed(e.data.x, e.data.t); };
        return P;
      });
    })();
    P.start = function () { P.on = true; emittedT = ac.currentTime; };
    P.stop = function () { P.on = false; };
    P.backend = function () { return typeof tf !== 'undefined' ? tf.getBackend() : '—'; };
    return P;
  }

  /* ---------- the tracker: frames to tones ---------- */
  var ZERO = new Float32Array(KEYS);
  function makeTracker(o) {
    o = o || {};
    var T = { onTh: 0.5, frTh: 0.3, runTh: 0.35, runN: 3, minGap: 0.08, rise: 0.12 };
    var act = new Array(KEYS), prevOn = new Float32Array(KEYS), run = new Int16Array(KEYS), nid = 0;
    var hist = new Float32Array(KEYS * 4), hpos = 0;          /* each key's activation over the last four frames */
    function recentLow(k) { var m = Infinity; for (var i = 0; i < 4; i++) m = Math.min(m, hist[k * 4 + i]); return m; }
    /* continuous pitch near key k, from the contour. The model's contour peaks one bin (a third of a semitone) above the
       tone it hears, the same at every pitch measured (+0.32 … +0.34 semitone, C3 to F4), so the bin is read one lower. */
    function pitchOf(k, ct, a) {
      var c = 3 * k + 1, best = -1, bv = 0;
      for (var b = Math.max(0, c - 4); b <= Math.min(CB - 1, c + 4); b++) if (ct[b] > bv) { bv = ct[b]; best = b; }
      if (best < 0 || bv < 0.15) return MIDI0 + k;
      var y0 = best > 0 ? ct[best - 1] : bv, y2 = best < CB - 1 ? ct[best + 1] : bv, den = y0 - 2 * bv + y2;
      var off = den < 0 ? 0.5 * (y0 - y2) / den : 0; if (off > 0.5) off = 0.5; if (off < -0.5) off = -0.5;
      return MIDI0 + (best + off - 1) / 3;
    }
    return {
      set: function (k, v) { T[k] = v; },
      active: function () { var out = []; for (var k = 0; k < KEYS; k++) if (act[k]) out.push(act[k]); return out; },
      frame: function (F, cb) {
        var fr = F.frames, on = F.onsets, ct = F.contour, t = F.t;
        /* below the input gate the frame is silence: nothing starts, and what was sounding ends */
        if (F.rms !== undefined && o.gate && F.rms < o.gate()) { fr = ZERO; on = ZERO; }
        for (var k = 0; k < KEYS; k++) {
          var a = fr[k], s = on[k], n = act[k];
          var onsetPeak = s >= T.onTh && s >= prevOn[k];
          run[k] = a >= T.runTh ? run[k] + 1 : 0;
          if (!n) {
            /* a tone starts on an onset, or — for tones the model marks with no clear onset, low strings above all — when
               it has held above the threshold for runN frames */
            if ((onsetPeak && a >= T.frTh) || run[k] >= T.runN) {
              var ts = onsetPeak ? t : t - (run[k] - 1) * FR;          /* a held start is dated from where the hold began */
              n = act[k] = { id: ++nid, key: k, t0: ts, m: pitchOf(k, ct, a), amp: a, low: 0 };
              cb('on', n, ts);
            }
          } else {
            /* struck again: an onset AND the tone's own activation rising above its recent low — a pick adds energy;
               the ripple of a driven, sustained tone fires the onset signal without raising the activation */
            if (onsetPeak && prevOn[k] < T.onTh && t - n.t0 > T.minGap && a - recentLow(k) >= T.rise) {
              cb('off', n, t); n = act[k] = { id: ++nid, key: k, t0: t, m: pitchOf(k, ct, a), amp: a, low: 0 }; cb('on', n, t);
            } else if (a < T.frTh) { if (++n.low >= 2) { cb('off', n, t); act[k] = null; } }
            else { n.low = 0; n.m = pitchOf(k, ct, a); n.amp = a; cb('move', n, t); }
          }
          prevOn[k] = s;
        }
        for (var k2 = 0; k2 < KEYS; k2++) hist[k2 * 4 + hpos] = fr[k2];
        hpos = (hpos + 1) % 4;
      },
      clear: function (cb, t) { for (var k = 0; k < KEYS; k++) if (act[k]) { if (cb) cb('off', act[k], t); act[k] = null; } }
    };
  }

  var api = { create: create, makeTracker: makeTracker, SR: SR, FRAME_S: HOP / SR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFPoly = api;
})(this);
