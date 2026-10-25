# Game-file extractor

Reads MapleStory Classic World's own game files and writes the site's data mirror to `public/data/`.
It only reads the game folder; it never changes it. Run it by hand after a game patch.

```bash
npm run extract
```

With the game somewhere else, pass the Classic `Data` folder:

```bash
npm run extract -- "D:/Games/MapleStory/MSCW/Data"
```

To redo one part only, add `--only=` with any of `maps`, `mobs`, `skills`, `items`, `towns`, `windows`:

```bash
npm run extract -- "C:/Program Files (x86)/Steam/steamapps/common/MapleStory/MSCW/Data" --only=maps,towns
```

## What it writes

| File | Contents |
|---|---|
| `maps-index.json` | every map with monsters: name, street, region, `mobRate`, spawn counts, whether it's a one-off map |
| `maps/<id>.json` | spawn points, platforms, ropes, bounds, where the character window stands |
| `mobs.json`, `mob-animations.json`, `img/mobs/` | monster stats and their stand/move/hit/die frames |
| `jobs.json`, `skill-animations.json`, `img/skills/` | every 1st/2nd job skill per level, icons, effect/hit/ball frames |
| `items.json`, `img/items/` | item names and icons |
| `weapons.json`, `actions.json`, `bullets.json`, `img/bullets/` | weapon speeds, body animation timings, star/arrow frames |
| `scenes/<id>.webp`, `scenes/town-<name>.webp` | 348×160 scenes for the character window |
| `ui-layout.json`, `img/ui/`, `equip-prints.json`, `skill-prints.json` | game window art and icon fingerprints for screenshot reading |
| `manifest.json` | when it ran and how many of each it found |

Drop rates come from osmlib through `npm run mirror` (`tools/mirror/`, one gentle pass, cached in `tools/.cache/`).
Meso ranges, item links and class guides (`mesos.json`, `item-links.json`, `guides.json`) are a fixed snapshot from
NiaDB and are no longer refreshed: NiaDB's reuse policy asks for permission before mirroring its data.

## After a patch

1. Run `npm run extract`.
2. Run `npm test` (the data checks catch broken output).
3. Look at a few scenes in `public/data/scenes/`.
4. Commit `public/data/`.

The file formats are described in `docs/DATA_SOURCES.md` §2.1.
