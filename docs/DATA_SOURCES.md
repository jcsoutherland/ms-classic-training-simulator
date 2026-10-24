# Data sources

What we want from each resource, how to read it, and what the 2026-10-24 check found.
Rule: game files first, then meowdb, then the rest. Drop rates always come from osmlib. Ask the owner before using a
resource for something new, and never add load to the fan sites: read each page once and keep the result here or in
our own mirror.

## 1. Requirements check

Checked end to end for three maps covering levels 10–50, and for every 1st and 2nd job.

| Requirement | Status | Source | Notes |
|---|---|---|---|
| Classes and jobs | ✅ | Game files (`String/Skill.img`, `Packs/Skill_00000.ms`) | Beginner, 100/110/120/130 Warrior line, 200/210/220/230 Magician line, 300/310/320 Bowman line, 400/410/420 Thief line. No Pirates, no 3rd job yet. |
| Skills with stats per level | ✅ | Game files (`Skill_00000.ms`) | Per level: `damage`/`mad`, `mobCount`, `attackCount`, `mpCon`, `range`, hit box `lt`/`rb`, `mastery`, `accX`, `time`. Readable text per level is in `String/Skill.img` (`h1..hN`). |
| Attack range per weapon | ✅ | Game files + meowdb | Weapons have `incWAT` and type. Weapon multipliers and the damage formula come from meowdb (the stats window range can be used directly). |
| Attack speed per weapon / class | ✅ | Game files + meowdb | Weapons have `attackSpeed` (e.g. sword 4, bow 6, claw 5). Body animation frame delays in `Character/00002000.img`. Speed scaling formula from meowdb. |
| Maps and which monsters spawn | ✅ | Game files (`Map/Map/Map0`, `String/Map.img`) | 334 maps, 347 map names. Each spawn point has monster id, x/y, platform, wander range `rx0`/`rx1`, `mobTime`. Matches meowdb's counts exactly. |
| How often monsters respawn | ⚠️ | meowdb spawn model | Not in game files (server-side). meowdb: 7.56 s global tick, 5 s point cooldown, capacity by player count. Maps also have `mobRate`, which meowdb doesn't explain. |
| Spawn spacing / map layout | ✅ | Game files | Spawn positions, footholds (platforms), ropes/ladders, portals, map bounds. |
| Monster stats | ✅ | Game files (`Packs/Mob_00000.ms`) | `level, exp, maxHP, PDDamage, MDDamage, acc, eva, speed, undead, elemAttr`. 118 monsters. |
| Meso drops | ✅ | meowdb | Not in game files (none of the 41 monster `info` fields is a meso amount; checked 2026-10-24). Use meowdb: its per-monster meso data where shown, else `floor(2.1 × level) + 3`, ×90–110%. |
| Item drops with rate | ✅ | osmlib | **Always osmlib** (owner decision), even though osmlib's monster stats are older than Classic. Rates exist for all three test monsters. |
| Accuracy / hit chance | ✅ | meowdb formulas | Full formula including level difference (see 3.1). Monster `eva` from game files. |
| Party EXP / meso split | ✅ | meowdb formulas | Share + party bonus formula (see 3.1). Mesos split evenly (owner decision). |
| How to get there | ✅ | meowdb | `https://meowdb.com/msclassic/pathfinder?to=<mapId>&taxi=1`; map pages at `/msclassic/maps/<mapId>`. Map IDs are the same as in the game files. |
| Item and skill icons | ✅ | Game files (`_Canvas` WZ files) | Decoded a test icon: zlib, BGRA4444, 27×24. |
| Character / gear sprites | ✅ | maplestory.io | Decided 2026-10-24: drawn by maplestory.io, cached in the browser (see 6). Game-file canvases exist for a later upgrade. |

**Verdict: feasible.** Everything needed is available. The only ⚠️ item is respawn timing, which comes from meowdb's
model rather than the game.

## 2. Game files (Classic World)

Location: `C:\Program Files (x86)\Steam\steamapps\common\MapleStory\MSCW\Data` (the folder outside `MSCW` is modern GMS).

### 2.1 How to read them
- **WZ files** (`*.wz`, `*_000.wz`): standard `PKG1` package format, 64-bit style (no version header), **no string
  encryption key (zero IV)**, version hash for **version 779**. Each folder has a tiny `X.wz`, an `X.ini` and the real
  data in `X_000.wz`. Images (`_Canvas`) are in separate `_Canvas/_Canvas_000.wz` files that the data links to
  through `_outlink`.
- **MS packs** (`Packs/Mob_00000.ms`, `Packs/Skill_00000.ms`): MS **version 4** (`Ms_FileV2` in WzComparerR2). The header
  and entry table are ChaCha20-encrypted with keys built from the file name + salt. Each entry's first 1024 bytes are
  ChaCha20-encrypted too, and the rest is plain. Inside, every entry is a normal WZ image (zero IV). The decoding steps
  follow WzComparerR2 (MIT licence): `Ms_FileV2.cs`, `Ms_ImageV2.cs`. Node's built-in `chacha20` cipher works.
  Quirk: the entry-table reader resets the ChaCha20 counter to 0 whenever a read ends exactly on a 64-byte boundary.
- Throwaway probe scripts that proved all of this exist outside the repo; the extractor will be written fresh to the
  code style.

### 2.2 What we take
| File | Data |
|---|---|
| `String/String_000.wz` | `Map.img` (map names by region), `Mob.img` (monster names), `Skill.img` (skill names, descriptions, per-level text), `Eqp/Consume/Etc.img` (item names) |
| `Map/Map/Map0/Map0_000.wz` | every map: `info` (`mobRate`, bounds, `returnMap`), `life` (spawn points), `foothold`, `ladderRope`, `portal` |
| `Packs/Mob_00000.ms` | monster stats (`info`) and animations |
| `Packs/Skill_00000.ms` | job skill trees (`Skill/<job>.img`), per-level numbers |
| `Character/Weapon/Weapon_000.wz` | weapon `attackSpeed`, `incWAT`, requirements, type (from the id) |
| `Character/Character_000.wz` | body action frame delays (`swingO1`, `stabO1`, `shoot1`, `magic1`, …) |
| `Item/*/_Canvas`, `Character/*/_Canvas` | icons and sprites |

### 2.3 Facts worth remembering
- Classic IDs are renumbered: monsters are small numbers (Snail `2`, Green Mushroom `13`, Ligator `29`, Wraith `43`)
  and maps look like `010003090`. Monsters `800xxx` are stronger variants that `link` to a base monster.
- Map `info` has no `createMobInterval` or `fixedMobCapacity` on the test maps; respawn timing is server-side.
- `mobTime` is 0 for normal spawn points.
- One-off maps: ordinary training maps have `forcedReturn` 999999999 and `fieldLimit` 0. The 2nd job tests
  (`080001000`–`080001300`) and quest maps send you back (`forcedReturn` = a real map) and set `fieldLimit` (72).
  `forcedReturn` alone is not enough: many open maps set it too.

## 3. meowdb (https://meowdb.com/msclassic)

What we want: **formulas**, **"how to get there" links**, **item page links**, and fallback data (meso ranges). Read
each page once; store results in the mirror. Formula pages:
`/formulas` (stats & accuracy), `/formulas/damage`, `/formulas/attack-speed`, `/formulas/spawns`,
`/formulas/leveling`, `/formulas/targeting`, `/formulas/damage-taken`.

### 3.1 Formulas (as read on 2026-10-24)
- **Accuracy**: Warrior `floor((1.2 DEX + 2 Lv + 0.6 LUK)/2.5 + 10)`, Bowman `/4.8 + 20`, Thief `/4 + 15`, Beginner
  `/2.5 + 5`, Magician `floor((1.2 INT + 2 Lv + 0.6 LUK)/5.1 + 20)`.
- **Hit chance**: `L = max(0, mobLv - Lv)`, `A = ACC × 100 / (10L + 255)`, `f = 0.15 + 0.20/(1 + e^((A - EVA)/12))`,
  `q = EVA/A`. P = 1 if `q ≤ 1-f`, 0 if `q ≥ 1+f`, else `(1 + f - q)/(2f)`. Auto-hit if `A - EVA ≥ 25 + L(0.5 Lv + 15)`.
- **Physical damage**: `MAX = S × WATK × (1.0 + (Primary × WeaponMult + Secondary)/100 + AttackPower/50)`, MIN uses
  `0.8` and `Primary × M`, with mastery `M = (masteryLevel/10 + 0.1) × 0.7`. WeaponMult 1.0–3.5 by weapon/action.
- **Magic damage**: `MagicTotal = floor(INT/2) + MATK`; `MIN = S × MagicTotal × (1 + INT × M/125)`, `MAX = S × MagicTotal × (1 + INT/125)`.
- **Defense**: `damage × 100 / (DEF + 100)`. **Level penalty**: gap 1–9 `1/(1 + gap² × 0.005)`, gap ≥10 `1/(1 + 0.05 gap)`.
- **Elements**: immune 0, resist 0.75, neutral 1, weak 1.25. **Crit**: base 5% rate, +20% damage. **Cap** 99,999.
- **Attack speed**: base swing/stab/bow 800 ms, crossbow 820, spear 750. Frame × `(10 + tier)/16`, round to 30 ms.
  Booster = tier − 2. Magic tier 6. Walk `125 × (speed + 20)/100` px/s.
- **Spawns**: tick 7.56 s, point cooldown 5 s, capacity `floor(points × min(1, 0.75 + 0.05(players − 1)))`, timed points
  `3600/(timer + 3.78)` per hour. The page calls this "MeowDB's model".
- **Party EXP**: `Pool = mobEXP × partyDmg / mobHP`; `Share = max(1, round(Pool × (0.8 Lv/ΣLv + 0.2 dmg/partyDmg)))`;
  bonus `min(0.30, 0.10(members − 1)) + 0.05(hitters − 1)`.
- **EXP to level**: Lv 6–50 `q = floor(Lv²/3)`, `(q + 19) × q`; 51–89 previous × 1.0548; full table on the page.
- **Meso estimate**: `floor(2.1 × mobLv) + 3`, × 90–110%, checked for levels 1–22 only.

### 3.2 Links
- Map: `/msclassic/maps/<mapId>`; route: `/msclassic/pathfinder?to=<mapId>&taxi=1`.
- Monster: `/msclassic/monsters/<mobId>`. Item: `/msclassic/item-db/<meowdbItemNumber>` (meowdb's own numbering;
  map names to numbers once from `/msclassic/item-db/all`, as mapleclassic.training does).

### 3.3 Class guides (default profiles)
Index: `/msclassic/guides`. Each guide has per-level tables for AP (stats), SP (skill order), gear by level and
training spots. Read each once into the mirror.
- 1st job, Lv 1–30: `thief-class-guide`, `warrior-class-guide`, `bowman-class-guide`, `magician-class-guide`
- 2nd job, Lv 30–70: `fighter-`, `page-`, `spearman-`, `fp-wizard-`, `il-wizard-`, `cleric-`, `hunter-`,
  `crossbowman-`, `assassin-`, `bandit-class-guide`
- Beginner: `beginners-guide-first-steps-in-maple-world` (to level 35, not class-specific)
- No guides past 70 (3rd job isn't out).
- Also useful for the simulator: `weapon-reach`, `attack-speed-and-animation-times`,
  `spawn-engine-respawn-and-map-capacity`, `exp-table-level-1-to-100`, `best-grind-maps-every-level`.

### 3.4 Meso and drop notes
Monster pages load their community drop and meso lists in the browser. They list "MSEA reference drops" (historical)
and show osmlib rates with a note that they may not match Classic.

## 4. osmlib (https://osmlib.com/?locale=en)

What we want: **item drop rates per monster** (the only source for rates). It is a browser-rendered app. The data ships
inside its JavaScript bundle and `translations/en/{mobs,items,maps}.json`, so one download per refresh can feed our
mirror. Each drop shows a percent plus "1 in N".

Test results (osmlib vs Classic game files):

| Monster | osmlib level / HP / EXP | Classic level / HP / EXP | Sample drops (osmlib) |
|---|---|---|---|
| Green Mushroom | 15 / 250 / 26 | 14 / 233 / 26 | present (not listed here) |
| Ligator | 32 / 1,200 / 60 | 31 / 853 / 58 | Ligator Skin 50%, Alligator Skin Pouch 20%, White Potion 1%, Plunger 0.01%; mesos "95, 65%" |
| Wraith | 48 / 2,800 / 120 | 48 / 2,350 / 122 | Mithril Nordic Helm 0.008%, Red Sonata 0.007%; mesos "220, 62%" |

The stats differ, so osmlib is older GMS data. **Decided:** use osmlib drop rates regardless; take only the drop
rates from it, never its monster stats or meso amounts.

## 5. osmsdataexplorer (https://osmsdataexplorer.com)

What we want: fallback lists (items, maps, monsters) and the image mirror that mapleclassic.training already uses
(`/data/current/{items,maps,monsters}.json`). Not needed for the core data, since the game files cover it.

## 6. maplestory.io

What we want: the character window's sprites (decided 2026-10-24). mapleclassic.training already renders characters
from it (`src/core/avatar/msio.ts`), relying on its CDN cache. Request a look only when it changes, fetch only the
frames used, cache them in the browser. A brand-new look takes ~30 s to render the first time, and while busy it
answers 520 with no CORS header (the browser reports a CORS error). We retry after 30 s, 90 s and 3 minutes.

## 7. mapleclassic.training (`C:\Users\nexbo\MapleExpTracker`)

What we reuse: the stack, deploy workflow, `dev/mirror-data.mjs` pattern (gentle, at most every three weeks, ~4 req/s),
the meowdb item-number index, and screenshot reading. There is no real-play data to check predictions against.

## 8. Test maps

| Map (id) | mobRate | Spawn points | Main monster | Layout |
|---|---|---|---|---|
| The Forest of Wisdom (010002020) | 0.8 | Green Mushroom 30, Slime 25, Snail 3 | Green Mushroom Lv14, 233 HP, 26 EXP, acc 79, eva 8 | 283 platform segments, 16 ropes/ladders |
| The Swamp of Despair I (010003090) | 1.0 | Ligator 41, Jr. Necki 10, Slime 9, Horny Mushroom 3 | Ligator Lv31, 853 HP, 58 EXP, eva 21, weak to fire | 207 segments, 25 ropes/ladders |
| Line 1 <Area 4> (010003065) | 0.9 | Wraith 59 | Wraith Lv48, 2,350 HP, 122 EXP, PDD 30, eva 32, undead, weak to holy | 294 segments, 18 ropes/ladders |
