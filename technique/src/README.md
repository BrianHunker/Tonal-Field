# Drill page sources

The technique drill pages (`structures.html`, `frame-walk.html`, `semimodes.html`, `hand-lab.html`) are built from these files.

- `chain-drills.html`: the base tool; `st/build.py` copies line ranges from it (`/*@COPY:a-b*/`).
- `st/st_a.js` … `st_g.js`, `st_shape.js`, `st_lbl.js`, `st_page.html`: Harmonic Structures.
- `st/st_walk.js`: the drill books (pages, semimode line, roll, the drawn hand, Hand lab posing and Chord Grip).
- `st/build.py`: builds every page into this folder (plus `-dbg` versions); the books are defined at its end.
- `publish.py`: copies built pages up into `technique/` with the site's head.

    python3 st/build.py
    python3 publish.py frame-walk semimodes structures hand-lab

Built pages in this folder are not committed (see `.gitignore`).
