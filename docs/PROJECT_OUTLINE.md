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
- **Buffs count, potions don't.** Every buff skill the character has points in (Boosters, Rage, Magic Guard, Haste,
  …) counts at **100% uptime**. MP and HP never interrupt training.
- **Enter stats with no buffs on.** The Stats window includes active buffs, so the form and screenshot box tell
  players to take screenshots or copy numbers unbuffed, to avoid counting a buff twice.
- **Current EXP %**: optional, defaults to 0%. Used for goal-level maths.
- **Default profiles**: pick a job and level to get a ready-made character (stats, skill points, gear) built from that
  job's meowdb class guide (1st job 1–30, 2nd job 30–70, Beginner guide). Above 70, the level-70 build carries forward:
  extra AP goes to the stat the guide adds most, gear and skills stay as at 70, extra SP stays unspent. Screenshots or typed
  values override any part of a default.
- **Attack mix**: the player picks a main attack. For every attack skill with at least one point in it, they set
  what % of the time they use it. The simulation blends the attacks by those percentages.
- **Several saved characters** per browser (idb-keyval), switchable. Nothing leaves the player's computer.
- Risk: the equipment window shows only icons, so reading it needs icon matching against the item art
  (mapleclassic.training already does image matching, see its `src/core`).

### 2.2 Single-map prediction
- The player sets the session length **either** by hours **or** by a goal level; the other is worked out and shown
  ("Level 34 to 40 takes about 14.5 hours here").
  - Hours: a free-form box, **0.5 to 1,000**, rounded to the nearest half hour and clamped to those limits.
  - Goal level: any level above the current one, up to **100**, starting from the current EXP %.
  - On the way to a goal the character's stats, skills and gear stay as entered (only the level rises, so EXP per
    level grows). The page reminds players to update their character as they level.
- The model works out one hour and multiplies it. **Kills, EXP and mesos are fixed averages.**
- Results show kills, EXP and mesos, plus a **drop log** that looks like a real session:
  - every item the map's monsters can drop: equipment, use and etc items, plus raw mesos
  - **every item drop is rolled randomly** from its rate and the session's kills (common items land near their
    average, rare items like a Plunger sometimes appear), so the log differs a little each run
  - each item with its icon, linking to its meowdb item page, and its chance of getting at least one
  - a **"Roll again"** button re-rolls the drops; the latest roll is saved, so the same map + character + inputs
    shows the same drops after a reload
  - rolling is done once per item (binomial / Poisson sampling), never once per kill, so 1,000 hours stays fast
- A clear **"How to get there"** button to the meowdb pathfinder for the map.

### 2.3 Map rankings
- Simulate every **viable** map (see 2.5) for the character and show a table:
  **map, EXP/hr, mesos/hr, kills/hr, time to reach the goal level, likely equipment drops**.
- Click a column header to sort by it.
- The party size setting applies here too. A party size of 1 means solo.
- **Train on a map** opens on the #1 map here unless the player picked a map (search or a ranking link).
- **Compare**: pick another saved character, or another job at the same level (its guide build). Best maps shows
  two ranked tables side by side, with a gold edge on maps in both top 10. Train on a map shows their kills, EXP and
  mesos under yours; drops stay yours.

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

One-off maps are never ranked, because players can't train there for hours. The extractor marks a map one-off
from its game-file `info`: a time limit (`timeLimit`), `genReturnMap`, a special `fieldType`, a town, or a forced
return to another map together with movement limits (`forcedReturn` ≠ 999999999 and `fieldLimit` > 0). That covers
party quests, the 2nd job tests, quest maps (Pig Farm, Mushmom, the Cursed Sanctuary) and towns. They can still
be picked on **Train on a map**.

### 2.6 Character window
- A small window showing the character in their class and gear, like mapleclassic.training's `CharacterStage`.
  Shown on **Your character** (standing idle) and **Train on a map** (attacking that map's most common monster,
  or a Slime when that monster can't be drawn).
- Uses the right body animation for the weapon (swing, stab, shoot, throw). Shows the main attack's skill effect only
  if it can look true to the game in scale and style; otherwise no projectile.
- Casts every buff the character has points in, one after another, at the start and about every 30 seconds.
- **Real map scenes**: the window is a cropped render of an actual map from the game files (backgrounds, objects and
  tiles drawn in game order), with the character standing on a real foothold. Scenes are 348×160 game pixels shown
  at 1.5× (mapleclassic.training's zoom), pre-rendered by the extractor, not drawn live.
  - **Train on a map**: a spot on that training map near its most common monster, which stands on the same ground.
  - **Your character**: a spot near the spawn point of the job's starting town: Perion `010004000` (Warriors),
    Ellinia `010002000` (Magicians), Henesys `010001000` (Bowmen), Kerning City `010003000` (Thieves). Sleepywood
    `010005000` is available too. A map's region is in `info.mapMark` (Henesys, Ellinia, Perion, KerningCity,
    Dungeon = Sleepywood, Rith = Lith Harbor, Amherst, MushroomVillage, SouthPerry).
- **Skill effects come from the game files**: e.g. Lucky Seven = the claw's throw pose + the skill's `effect` frames
  + the throwing star's `bullet` frames (`Item/Consume/0207.img`) flying to the monster + the skill's `hit` frames on
  it. All are anchored by their game origins, so scale matches the game.
- Sprites come from **maplestory.io**, as on mapleclassic.training. To keep its traffic low: request a look only when
  gear, hair or face changes, fetch only the frames used (standing, one attack), and cache them in the browser with
  no expiry. maplestory.io's CDN already serves repeated looks cheaply.
- maplestory.io can take a minute to draw a brand-new look, or answer "busy". So the scene, monster and effects
  (all from our mirror) draw at once, and the character joins when its frames arrive. Frames are requested one at a
  time, and a busy answer is retried after 30 s, 90 s and 3 minutes before giving up.
- Later upgrade: draw characters in the browser from game-file sprites in our mirror, removing maplestory.io calls.
- A **loading animation** (the character attacking) appears only when a simulation takes **5 seconds or longer**.

### 2.7 Look
- Same palette and font as mapleclassic.training: background `#0F0E1C`, panels `#1A1830`, surface `#161429`, lines
  `#2F2B50`, text `#EEECF8`, muted `#9C97B9`, accent `#8B7BFF`, warm `#FFB257`, EXP `#A6E05A`, HP `#FF6B78`,
  MP `#5AA9FF`, drops `#F5C542`; system font.
- Design mockups: the private "MS Classic Training Simulator designs" canvas on claude.ai.

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
- **Who you fight**: players camp one monster. For each monster on the map, the simulation camps the platforms
  (spawn groups) where it makes up most of the spawn points (or every platform it spawns on, if it's never the
  majority). Other monsters on those platforms are fought only when in the way, counted at half their spawns.
  The option with the most EXP per hour wins; the "main monster" shown is the one defeated most often.
- Kills/hr = min(how fast the party can kill, how fast the camped platforms supply monsters), after travel time.
- EXP per kill comes from the monster's `exp`. In a party: `Share = round(Pool × (0.8 × lvl / sumLvls + 0.2 × dmg / partyDmg))`
  plus a bonus of `min(0.30, 0.10 × (members - 1)) + 0.05 × (hitters - 1)`.
- Mesos per kill: average of the monster's meso range from meowdb (the game files have none), falling back to
  meowdb's estimate `floor(2.1 × level) + 3`.
- Drops: `expected = kills × dropRate`, shown rounded down. Quest items (`info/quest` in `Item/Etc`) are left out.
- Multiply the hourly numbers by the chosen hours.

## 5. Data layout (to decide when building the extractor)

Left to the developer once the game data is known. Guidelines:
- Small, compact JSON (short keys, numbers rather than strings, no unused fields), generated by the extractor.
- Ranking needs every viable map at once, so one compact `maps` index plus monsters, skills and items is likely better
  than thousands of tiny files. Detail-only data (footholds) can sit in per-map files loaded on demand.
- Icons are extracted from the game files into the repo. Anything missing falls back to a build-time mirror from
  osmsdataexplorer, the way mapleclassic.training does it. Character sprites come from maplestory.io for now (2.6).
- meowdb class guides are read once into our mirror (default profiles), never fetched by players.
- Suggested folders: `public/data/{maps,mobs,skills,items}`, `public/data/icons`, extractor code in `tools/extract`.

## 6. Data priority

1. **Game files** (`...\MapleStory\MSCW\Data`) are the most accurate and always come first.
2. **meowdb** for anything not in the game files (formulas, meso ranges, routes).
3. Then the others (osmsdataexplorer, maplestory.io).
4. **Exception: drop rates always come from osmlib** (meowdb only lists which items can drop), even though osmlib's
   monster stats are older than Classic. Take only drop rates from osmlib.
5. **Mesos**: game files if they ever include them (they don't today), otherwise meowdb.

Always ask the owner before using a resource for something new.

## 7. Open questions and risks

- osmlib is older GMS data (its monster stats differ from Classic), so its drop rates may be a little off. Decided:
  use them anyway.
- meowdb's meso estimate was only checked for levels 1–22; prefer its per-monster meso data where it exists.
- `mobRate` effect on spawns (4.4).
- Monster wandering accuracy (4.5).
- Equipment icon matching from screenshots (2.1).
- Screenshot reading is built and tested against game-file window art, but not yet against real screenshots.
  Players check the filled-in form before saving.
- Classic monster and map IDs are renumbered (Snail = mob 2, Lith Harbor = map 010000000). Never assume old GMS IDs.

## 8. Milestones (rough order)

1. Extractor: WZ + MS pack readers in Node/TypeScript; dump maps, monsters, skills, items and icons for Classic.
2. Formula engine with unit tests for each formula (damage, hit chance, attack time, spawns, party EXP).
3. Single-map prediction page with manual character entry.
4. Map rankings with sorting and party size.
5. Screenshot reading (stats, skills, then equipment).
6. Drop log polish: icons, meowdb links, chance of at least one.
7. Deploy to GitHub Pages.
