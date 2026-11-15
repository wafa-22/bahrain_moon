# 🇧🇭🌙 Bahrain to the Moon — A Family Space Coding Adventure

**Explore the Moon. Solve Challenges. Learn to Code.**

A browser-based 3D educational adventure for children and beginner programmers, built for the
**NASA Space Apps Challenge 2026**. A Bahraini family of four keeps a lunar base running. The
player explores the Moon in third person, finds emergencies and fixes them by building programs
with **coding blocks**. When the code runs, the 3D world visibly changes.

---

## ▶️ How to run

Requirements: [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Vite opens the game automatically (usually at **http://localhost:5173/**).

Production build: `npm run build` → static files in `dist/` (`npm run preview` to test them).
The build works from any folder (e.g. GitHub Pages) and needs **no internet**: fonts are bundled,
and all textures and sounds are generated in code.

## 🎮 Controls

| Action | Keys |
|---|---|
| Move | `W` `A` `S` `D` or arrow keys |
| Look around | Drag with the mouse · scroll to zoom |
| Interact | `E` (or click the prompt) |
| Moon jump | `Space` |
| Pause / close panel | `Esc` |
| Hide control hints | `H` |

## 🧭 Game flow

1. **Splash screen**: the title over a slowly orbiting view of the 3D lunar base
2. **Character selection**: Amal (Programmer), Amer (Explorer), Ahmed (Engineer), Maryam (Life Support), shown as live 3D characters
3. **Spacesuit customization**: suit accent, visor colour and helmet lamp. The Bahrain flag patch is always on the suit
4. **Lunar arrival**: the lander descends to the pad and your astronaut walks down the ramp (skippable)
5. **Main 3D game**: explore, talk to your family, follow the beacon, solve missions
6. **Mission success screen**: what happened, why it worked, the coding concept and resource changes
7. **Final completion**: the three concepts learned, final resources, Play Again / Keep Exploring

## 🚀 Missions

| # | Mission | Concept | What the child builds | World reaction |
|---|---|---|---|---|
| 01 | **Power Crisis** | Sequence | Order 3 blocks: Inspect → Activate → Connect | Scanner sweeps the panels, panels rotate to the Sun and glow, energy flows through the cable, batteries charge, base lights turn on. Power 30% → 95% |
| 02 | **Oxygen Emergency** | IF / ELSE | `IF [condition] THEN [action] ELSE [action]` | Backup tank fills and glows, bubbles rise, the fan speeds up, air flows through the pipe. Oxygen 35% → 92%, Power −8% |
| 03 | **Solar Storm** | Problem-solving & safety | Pick 4 safe actions out of 7 and put them in a safe order | Red sky and radiation streaks, flashing beacons, the family walks into the shelter, doors close, the storm passes. Safety → 100% |

### Real code checking (no fake buttons)
- **Mission 01** actually *runs* the program step by step. Each command needs what earlier commands
  produce (you can't connect panels that aren't active), so the error message points at the exact failing step.
- **Mission 02** tests the child's rule on 5 oxygen levels (25, 38, 40, 70, 95%). Logically
  equivalent solutions are accepted, e.g. `IF oxygen ≥ 40% THEN normal ELSE backup`.
  Distractors (a `power > 90%` condition and a "Turn Off Oxygen" action) give their own hints.
- **Mission 03** checks a plan against safety rules (forbidden actions, required actions, order
  constraints). More than one correct order works.
- Mistakes are never punished: hints get more specific after a few tries, and the full answer is never shown.

## 🗂️ Project structure

```
bahrain_moon/
├── index.html              # All screens / HUD containers
├── package.json · vite.config.js
├── public/assets/          # (empty — everything is procedural; drop models/sounds here later)
└── src/
    ├── main.js             # Entry point (fonts, error screen)
    ├── styles/             # main.css (colour system, menus) · ui.css (HUD, modals, blocks)
    ├── game/
    │   ├── Game.js         # Renderer, loop, modes, cinematics, pause/restart
    │   ├── GameState.js    # Central state + events (resources always 0–100)
    │   ├── World.js        # Builds the world + every visual reaction to code
    │   ├── Player.js       # Third-person movement, moon jump, collisions
    │   ├── CameraController.js  # Follow camera (drag/zoom, avoids walls)
    │   ├── Interactions.js # "Press E" system
    │   ├── Input.js · Sound.js (Web Audio synth effects)
    ├── world/              # terrain.js · sky.js · structures.js · effects.js
    ├── characters/         # characterData.js · CharacterFactory.js (3D astronauts)
    ├── missions/           # Mission.js (base) · MissionManager.js · PowerCrisis · OxygenEmergency · SolarStorm
    ├── coding/             # CodingBlocks.js (reusable drag/click UI) · CodeValidator.js
    ├── ui/                 # MainMenu · CharacterSelection · HUD · MissionPanel · SuccessScreen
    └── utils/              # Tween.js · noise.js · textures.js (canvas textures)
```

### Adding a new mission
1. Create `src/missions/MyMission.js` extending `Mission` (copy `PowerCrisis.js`).
2. In the constructor register the interaction point. In `onBegin()` set the objective and dialogue.
   `openPuzzle()` calls `openChallenge({ blocks, slots, onRun })`, and `execute()` plays the world reaction.
3. Add it to the list in `MissionManager.js`.

## 🔬 Science notes
- Solar panels turn sunlight into electricity, and batteries store it.
- Oxygen comes from life-support systems with backups. Running the backup costs power.
- Solar storms are a radiation hazard. The player **cannot stop** the storm and must take shelter.
- The flag hangs from a top rod because the Moon has no wind.
- The in-game "Moon Science" panel links to NASA Artemis, NASA Science (Earth's Moon) and NASA Space Place.

## ✅ Status

**Working:** all 7 screens, 4 playable characters + customization, 3D world (terrain, craters,
rocks, Earth, base, solar station, oxygen station, shelter, greenhouse, antenna, flag, landing pad,
rover), third-person movement and camera, collisions, HUD synced with state, all 3 missions
with real validation and visible world changes, restart mission, play again, pause, sound
effects, science panel.

**Not done yet / ideas:**
- Touch controls (on-screen joystick) for tablets and phones
- Arabic language toggle
- Real voice-over and music
- Save progress between sessions
- Proper 3D models (GLTF) for characters and buildings

Original assets only: no NASA logos, no copyrighted game assets.
