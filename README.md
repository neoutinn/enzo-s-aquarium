# Enzo's Aquarium

*A private tank where every fish is something someone wrote.*

<p>
  <img alt="single file" src="https://img.shields.io/badge/build-single%20HTML%20file-3fb3e6?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-none-8a5424?style=flat-square">
  <img alt="storage" src="https://img.shields.io/badge/storage-IndexedDB%20(local)-125786?style=flat-square">
  <img alt="status" src="https://img.shields.io/badge/status-private-1c0f08?style=flat-square">
</p>

```
        .        ⋆              .              ⋆        .
   ──────────────────────────────────────────────────────────
        ><(((°>       ·        ><>        ·       <°)))><
   ──────────────────────────────────────────────────────────
              .          ⋆            .
```

Enter a passcode, and the gate opens onto a pixel-art tank. Every fish
swimming past is a personal piece of writing hatched by the author (me) and drifting under a day/night sky.
Click one to read it.

---

## What it is

Enzo's Aquarium is a **writing journal disguised as a fish tank.** There's
no server, no account system, no analytics — it's a single self-contained
`index.html` file that runs entirely in the visitor's browser. Everything
persists locally via IndexedDB, so what you see is whatever's actually
stored on that device.

## Features

- **Pixel-art fish, six species deep** — Clownfish, Neon Tetra, Goldfish,
  Angelfish, Betta, and Guppy, each with its own body shape and color
  palette derived from the entry's own id (so the same entry always
  hatches the same fish). Sprites are rendered with a silhouette outline,
  scale-glint texture, and fin-ray striping for depth, not flat color
  blocks.
- **Living sky** — a real-time day/night cycle with a moving sun and
  moon, stars that fade in, drifting clouds, and the occasional bird.
- **Fluid water** — a wave-driven surface with parallax bands, caustics,
  and drifting bubbles.
- **Author Mode** — a second, separate passcode unlocks fish creation,
  editing, and deletion for the site owner only. Visitors just read.
- **No backend** — reads and writes go straight to the browser's
  IndexedDB. Nothing leaves the device.
- **Paginated tank** — the library pages through fish in batches so the
  tank stays readable as the collection grows.

## Running it locally

No build step, no install. Either:

```bash
open index.html
```

or, for the most reliable experience (some browsers restrict IndexedDB
under `file://`), serve it from a plain static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How an entry becomes a fish

1. In Author Mode, a new entry is given a name and its text.
2. The entry is hashed to deterministically pick a species, palette, size,
   and swim behavior — the same entry always looks the same way twice.
3. It's written to IndexedDB and immediately takes its place in the tank.
4. Visitors click any fish to open it in a reading modal.

The tank ships with a small set of placeholder example entries (clearly
marked as such in their text) so an empty tank never looks broken —
delete or replace them from Author Mode once real writing goes in.

## Project structure

It's one file, organized top to bottom as:

| Section | What lives there |
|---|---|
| `<style>` | Layout, gate UI, dock, modal, and the pixel font (`@font-face`, embedded) |
| Markup | Gate screen, canvas tank, dock controls, reading modal, create/admin overlays |
| `IndexedDB layer` | `dbPut` / `dbGetAll` — the only persistence in the app |
| `Sprite system` | ASCII pixel-art bodies (`DARTER_BASE`, `ANGEL_BASE`, `BETTA_BASE`) + per-species palettes in `SPECIES` |
| `Tank renderer` | Sky, water, sand, decor, bubbles, weeds, and the fish themselves — all `<canvas>`, driven by `requestAnimationFrame` |
| `Library ↔ tank bridge` | Pagination and the glue between stored records and live swimming fish |
| `Modal` | The zoomed-in reading view, rendered at higher resolution from the same sprite data |

## Notes

This is a personal project and the repo is private — there's no license
file because it isn't meant for reuse or distribution.
