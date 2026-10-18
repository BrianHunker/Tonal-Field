# Drill page sources

The technique drill pages (`structures.html`, `frame-walk.html`, `semimodes.html`, `hand-lab.html`, `chords.html`, `wish-you-were-here.html`, `custom.html`, `chords-with-semimodes.html`) are built from these files.

- `chain-drills.html`: the base tool; `st/build.py` copies line ranges from it (`/*@COPY:a-b*/`).
- `st/st_a.js` … `st_g.js`, `st_shape.js`, `st_lbl.js`, `st_page.html`: Harmonic Structures.
- `st/st_hand.js`: the hand's mechanism — palm, knuckles, finger and thumb bones in millimetres on a real neck, joint ranges, and the solver that places them.
- `st/st_chordgen.js`, `st/st_chords.js`: the Chords page — shapes found for a chord, the hand gripping each.
- `st/st_custom.js`: the Custom page — a drill written by hand, in TAB and as a line of text (its syntax is at the head of `parse`); chord symbols orient the ring; the hand fingered automatically; saved and loaded as a file.
- `st/st_walk.js`: the drill books (pages, semimode line, roll, the hand drawn from that skeleton, Hand lab posing and Chord Grip).
- `st/build.py`: builds every page into this folder (plus `-dbg` versions); the books are defined at its end.
- `publish.py`: copies built pages up into `technique/` with the site's head.

    python3 st/build.py
    python3 publish.py frame-walk semimodes structures hand-lab chords wish-you-were-here custom chords-with-semimodes

Built pages in this folder are not committed (see `.gitignore`).
