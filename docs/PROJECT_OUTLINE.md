# Project outline

The full context for the MS Classic Training Simulator, written so work can pick up again after a long break.
Everything here was agreed with the project owner on 2026-10-24 unless it is marked **open**.
Where the data comes from, and what was verified, is in [DATA_SOURCES.md](DATA_SOURCES.md).

## 1. Goal

Predict what a specific **MapleStory Classic World** character will get from training on a specific map for a chosen
number of hours: kills, EXP, mesos and item drops. Then rank every map that suits that character.

- Only Classic World. The Steam install also contains modern GMS; ignore it.
- Classes: Beginner, the four 1st jobs (Warrior, Magician, Bowman, Thief) and their 2nd jobs. **There are no Pirates
  in Classic.** 3rd job (level 70) is not in the Classic game files yet.
- Money means **raw mesos only**. Item prices are out of scope (meso.watch is not used).
- There is no way to check predictions against real play, so accuracy has to come from correct data and formulas.

## 2. Features

### 2.1 Character input
- **Screenshots**: the player drops in several screenshots at once and the site reads them in the browser
  (tesseract.js, as on mapleclassic.training). Accepted windows:
  - the stats window (final numbers: level, job, STR/DEX/INT/LUK, attack range, accuracy, avoid, etc.)
  - the equipment window
  - every skill tab the job has (tab 0 Beginner, 1 first job, 2 second job), including scrolled views because not all
    skills fit in one window
- **Manual entry**: the same fields, typed in. Screenshot reading fills this form, and the player checks and fixes it.
- **Equipment** is recorded but **not used in the maths**, because the stats window already includes it. It's kept so
  a later feature can draw the character wearing that gear.
- **No buffs and no potions.** MP and HP never interrupt training.
- **Attack mix**: the player picks a main attack. For every attack skill with at least one point in it, they set
  what % of the time they use it. The simulation blends the attacks by those percentages.
- **Several saved characters** per browser (idb-keyval), switchable. Nothing leaves the player's computer.
- Risk: the equipment window shows only icons, so reading it needs icon matching against the item art
  (mapleclassic.training already does image matching, see its `src/core`).

### 2.2 Single-map prediction
- The player picks a map and a number of **hours**.
- The model works out one hour and multiplies it. The point of choosing hours is the total kill count, which drives
  the drop estimate.
- Results show kills, EXP and mesos, plus a **drop log**:
  - every item the map's monsters can drop: equipment, use and etc items, plus raw mesos
  - each item with its icon, linking to its meowdb item page
  - expected count as a **whole number, rounded down** (e.g. "3 Red Whips")
  - the **chance of getting at least one** over the session: `1 - (1 - rate)^kills`
- A "how to get there" link to the meowdb pathfinder for the map.

### 2.3 Map rankings
- Simulate every **viable** map (see 2.5) for the character and show a table:
  **map, EXP/hr, mesos/hr, kills/hr, possible drops**.
- Click a column header to sort by it.
- The party size setting applies here too. A party size of 1 means solo.

### 2.4 Party prediction
- Party size N (1–6), with every member a copy of the entered character.
- All members are on the **same map and share its respawns**, so kills are limited by the map, not multiplied by N.
- EXP uses meowdb's party formula (section 4.6). Mesos and drops are pooled and **split evenly**.
- Map capacity rises with the number of players (section 4.4).

### 2.5 Viable maps
A map is skipped from rankings when either rule is true:
- **Too easy**: most of its monsters, counted by spawn points, are **20 or more levels below** the character.
- **Too hard**: the character's chance to hit is under **75%** for **any** monster on the map.

Any other map-wide weighting (e.g. "the map's level") also goes by the majority by spawn count.

## 3. Tech stack

Copied from mapleclassic.training (`C:\Users\nexbo\MapleExpTracker`), which works well:

- React 18, Vite and TypeScript. Static build deployed to GitHub Pages with a `deploy.yml` workflow.
- Vitest for tests. **Add ESLint** (the old project has none, and CLAUDE.md requires lint).
- tesseract.js for screenshot reading, idb-keyval for local storage.
- Simulation runs in a **Web Worker** so ranking every map doesn't freeze the page.
- Node + TypeScript **extraction scripts** (run by hand on the owner's PC, which has the game installed) read the game
  files and write compact data into the repo. That committed data is "our own mirror".
- A **manual refresh script** for after game patches: written and documented, but not run until needed.

## 4. Simulation model (formula model)

A formula model, not a moment-by-moment simulation: it's fast enough to rank every map, and accuracy is the top
priority within it. Formulas come from meowdb's formula pages (quoted in DATA_SOURCES.md) and numbers from the game
files.

### 4.1 Damage per attack
- Physical: meowdb "Dealing Damage" formula, using the stats-window attack range directly where possible. Average hit =
  midpoint adjusted by mastery, × skill damage %, × hits per attack (`attackCount`).
- Magic: `MagicTotal × (1 + INT × M / 125)` to `MagicTotal × (1 + INT / 125)`, × skill `mad` / 100.
- Then apply, in order: monster defense `× 100 / (DEF + 100)`, the level-gap penalty, element modifiers (monster
  `elemAttr` vs skill `elemAttr`), crits (`× (1 + rate × bonus)`), and the 99,999 cap.
- Multi-target skills hit up to `mobCount` monsters inside the skill's hit box (`lt`/`rb`, or `range`).

### 4.2 Hit chance
meowdb's accuracy model: `L = max(0, mobLevel - playerLevel)`, `A = ACC × 100 / (10L + 255)`, `q = mobEVA / A`,
`f = 0.15 + 0.20 / (1 + e^((A - mobEVA)/12))`. P(hit) is 1 when `q ≤ 1 - f`, 0 when `q ≥ 1 + f`, and
`(1 + f - q) / 2f` otherwise. Expected damage is multiplied by P(hit). P(hit) also drives the 75% viability rule.

### 4.3 Attack time
- Body animation frame delays come from the game files (e.g. `swingO1` = 300/150/350 ms).
- Scale each frame by weapon speed tier: `trunc(frame × (10 + tier) / 16)`, sum the frames, round up to 30 ms.
  Magic uses tier 6, and Booster skills lower the tier by 2.
- Cycle time = max(animation, skill lockout). The attack mix is blended:
  `damagePerSecond = Σ(pᵢ × damageᵢ) / Σ(pᵢ × timeᵢ)`.

### 4.4 Monster supply (respawns)
meowdb's spawn model:
- Global respawn tick every **7.56 s**. A spawn point waits a **5 s** cooldown after its monster dies.
- Map capacity = `floor(spawnPoints × min(1, 0.75 + 0.05 × (players - 1)))`.
- Points with a respawn timer (`mobTime > 0`, e.g. bosses) supply `3600 / (timer + 3.78)` per hour.
- **Open:** each map also has a `mobRate` in the game files (e.g. 0.8, 0.9, 1.0) that meowdb's model doesn't
  mention. We need to work out whether it changes capacity.

### 4.5 Movement
- Use the map's real spawn points, footholds (platforms), ropes and ladders to estimate the time spent getting
  between groups of monsters.
- Walk speed `125 × (speed + 20) / 100` px/s, climb speed `speed + 20` px/s (base speed 100).
- Monster wandering: each spawn has a wander range (`rx0`/`rx1`) and every monster has a `speed`. Add a wandering
  adjustment **only if** it can be modeled accurately. Otherwise monsters are treated as standing at their spawn point.

### 4.6 Kills, EXP and mesos per hour
- Kills/hr = min(how fast the party can kill, how fast the map supplies monsters), after travel time.
- EXP per kill comes from the monster's `exp`. In a party: `Share = round(Pool × (0.8 × lvl / sumLvls + 0.2 × dmg / partyDmg))`
  plus a bonus of `min(0.30, 0.10 × (members - 1)) + 0.05 × (hitters - 1)`.
- Mesos per kill: average of the monster's meso range (source still to settle, see DATA_SOURCES.md 3.3).
- Drops: `expected = kills × dropRate`, shown rounded down.
- Multiply the hourly numbers by the chosen hours.

## 5. Data layout (to decide when building the extractor)

Left to the developer once the game data is known. Guidelines:
- Small, compact JSON (short keys, numbers rather than strings, no unused fields), generated by the extractor.
- Ranking needs every viable map at once, so one compact `maps` index plus monsters, skills and items is likely better
  than thousands of tiny files. Detail-only data (footholds) can sit in per-map files loaded on demand.
- Icons are extracted from the game files into the repo. Anything missing falls back to a build-time mirror from
  osmsdataexplorer, the way mapleclassic.training does it. Character and gear sprites follow the same order
  (game files first, maplestory.io as fallback).
- Suggested folders: `public/data/{maps,mobs,skills,items}`, `public/data/icons`, extractor code in `tools/extract`.

## 6. Data priority

1. **Game files** (`...\MapleStory\MSCW\Data`) are the most accurate and always come first.
2. **meowdb** for anything not in the game files (formulas, meso ranges, routes).
3. Then the others (osmsdataexplorer, maplestory.io).
4. **Exception: drop rates always come from osmlib** (meowdb only lists which items can drop).

Always ask the owner before using a resource for something new.

## 7. Open questions and risks

- **osmlib looks like older GMS data, not Classic.** Its monster stats differ from the Classic game files (Ligator:
  osmlib Lv32/1,200 HP, Classic Lv31/853 HP; Wraith: 2,800 vs 2,350 HP). Its drop rates may not match Classic
  either. The owner needs to decide whether to use them as they are.
- **Meso amounts**: not in the game files. meowdb has a formula (`floor(2.1 × level) + 3`, ±10%) that was checked only
  for levels 1–22. osmlib has a per-monster amount and chance, again from older data. **Decide which to use.**
- `mobRate` effect on spawns (4.4).
- Monster wandering accuracy (4.5).
- Equipment icon matching from screenshots (2.1).
- Classic monster and map IDs are renumbered (Snail = mob 2, Lith Harbor = map 010000000). Never assume old GMS IDs.

## 8. Milestones (rough order)

1. Extractor: WZ + MS pack readers in Node/TypeScript; dump maps, monsters, skills, items and icons for Classic.
2. Formula engine with unit tests for each formula (damage, hit chance, attack time, spawns, party EXP).
3. Single-map prediction page with manual character entry.
4. Map rankings with sorting and party size.
5. Screenshot reading (stats, skills, then equipment).
6. Drop log polish: icons, meowdb links, chance of at least one.
7. Deploy to GitHub Pages.
