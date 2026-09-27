# Tonal Field — lessons

Interactive tonal lessons by Brian Hunker, built with the Tonal Field tool.
Each lesson is one self-contained page that plays and animates a progression.

## How the site is laid out

- `index.html` — the lesson list students see first, grouped by instrument (Piano, Guitar) and, within each, by series. The list itself is the `LESSONS` block near the bottom of the file; each lesson is one entry (title, instrument, series, file, view names, a sentence or two).
- `lessons/` — one HTML file per lesson. Each is a complete copy of the tool, saved with that lesson's views, so it keeps working exactly as it was made even as the tool moves on.
- `.nojekyll` — tells GitHub Pages to serve the files exactly as they are.

## Adding a lesson

1. Put the lesson's HTML file in `lessons/`, with a short name and no spaces (for example `lessons/secondary-dominants.html`).
2. Add an entry for it to the `LESSONS` list in `index.html`, with its `instrument` and (optionally) its `series`. Lessons in a series appear in the order they are listed.

The page goes live a minute or two after the change is saved to the `main` branch.
