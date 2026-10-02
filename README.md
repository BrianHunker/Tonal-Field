# Tonal Field — lessons

Interactive tonal lessons by Brian Hunker, built with the Tonal Field tool.
Each lesson is one self-contained page that plays and animates a progression.

## How the site is laid out

- `index.html` — the page visitors see first: the ring, a four-lesson "New here?" path (the `START` list), and every lesson on three shelves — Foundations, Songs, Lines — with a Guitar/Piano filter. The lessons themselves are the `LESSONS` block near the bottom of the file; each is one entry (title, instrument, series, file, view names, a sentence or two). `SHELVES` says which shelf each series sits on; a series on no shelf lands on a last shelf, "More".
- `lessons/` — one HTML file per lesson. Each is a complete copy of the tool, saved with that lesson's views, so it keeps working exactly as it was made even as the tool moves on.
- `.nojekyll` — tells GitHub Pages to serve the files exactly as they are.

## Adding a lesson

1. Put the lesson's HTML file in `lessons/`, with a short name and no spaces (for example `lessons/secondary-dominants.html`).
2. Add an entry for it to the `LESSONS` list in `index.html`, with its `instrument` and its `series`. Lessons appear in the order they are listed. A new series goes on a shelf by adding its name to that shelf in `SHELVES`.

The page goes live a minute or two after the change is saved to the `main` branch.
