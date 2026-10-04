# Tonal Field — lessons

Interactive tonal lessons by Brian Hunker, built with the Tonal Field tool.
Each lesson is one self-contained page that plays and animates a progression.

## How the site is laid out

- `index.html` — the page visitors see first: the ring, then Brian's Tonality Toolbox (one box per instrument; the `BOXES` list draws its trays and tool compartments), then Music, a collapsed alphabetical list of every song. The lessons themselves are the `LESSONS` list near the bottom of the file; each is one entry (title, instrument, kind, tools, file, view names, a sentence or two). An `exercise` is listed inside each tool it names, one link per view; a `music` piece is listed under Music, and in the panel of each tool it names.
- `lessons/` — one HTML file per lesson. Each is a complete copy of the tool, saved with that lesson's views, so it keeps working exactly as it was made even as the tool moves on.
- `.nojekyll` — tells GitHub Pages to serve the files exactly as they are.

## Adding a lesson

1. Put the lesson's HTML file in `lessons/`, with a short name and no spaces (for example `lessons/secondary-dominants.html`).
2. Add an entry for it to the `LESSONS` list in `index.html`: `kind:'exercise'` with the tool ids it builds, or `kind:'music'` with the tool ids it calls for. An exercise's views each get their own link (`lesson.html#view=Name`), so a single exercise can be handed to a student.

The page goes live a minute or two after the change is saved to the `main` branch.
