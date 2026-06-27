# THE OBSERVATION WING

A 2D pixel‑art **observation‑horror** game. You are the **Manager** of a secret
research facility holding six analog‑horror entities. Watch them across the
camera feeds, log their behaviour, keep them calm, and hold the wing until the
shift ends at **06:00**.

If any entity's **Agitation** reaches 100%, it breaches containment and the
terminal reports:

> **You were overrun. Facility lost.**

No build step, no dependencies. Pure HTML / CSS / vanilla JS + Canvas + Web
Audio. Open it and play.

> 📖 Full design spec: **[docs/GAME_DESIGN_DOCUMENT.md](docs/GAME_DESIGN_DOCUMENT.md)**

---

## Run it

```bash
# from the repo root, serve the folder with anything static:
python3 -m http.server 8099
# then open http://localhost:8099/index.html
```

Opening `index.html` directly from disk works too, though a local server is
recommended so the sprite PNGs load cleanly. Headphones recommended — the
ambience, static and alarms are part of the game.

---

## How to play

You monitor **six camera feeds**. Each entity has two meters:

| Meter | Meaning |
| ----- | ------- |
| **AGITATION** | How unstable it is. **100% → containment breach → game over.** |
| **CONTROL**   | How controllable it is. **≤ 10% → the TMF can re‑contain it.** Above 10%, the TMF fails. |

Every entity destabilises differently and wants a *different* environment.
**Their needs conflict — you cannot satisfy all six at once. Triage.**

### The control deck

| Control | Effect |
| ------- | ------ |
| **LIGHTS** | `BRIGHT → DIM → STABLE`. Doctor Insane wants **DIM**; the Locust wants **STABLE**. |
| **AUDIO GAIN** | `HIGH → LOW → MUTE`. The Glass Man and the Listener want it quiet. |
| **VENTS** | `CLOSED ⇄ OPEN`. The Locust needs them **OPEN** — but the Listener *hears them run*. |
| **LOG** | Record an observation on the active camera. Acknowledges the entity and nudges its **Control** back up. |
| **DEPLOY TMF** | Send the Tactical Mobile Force at the entity on the active camera. |
| **HANDBOOK** | The in‑universe Manager's Handbook (Rev 3.3). |
| **PANIC** *(header)* | Emergency wing‑wide stabilization: −26 agitation on every entity, but −9 control on every entity **and** the siren wakes the Listener. 50s cooldown. |

Switching cameras, toggling controls, running vents and the facility alarm all
make **noise** — which draws the Listener. Watch what you touch.

**Random anomalies** punctuate the shift: power surges (lights flicker → the
Locust), camera outages (`SIGNAL LOST` on a feed), audio feedback (draws the
Listener), and corrupted transmissions in the log.

### Difficulty & nights

Pick a **clearance** — `OBSERVER` (forgiving) · `MANAGER` (standard) ·
`DIRECTOR` (brutal) — and a **night**. Clear a night to unlock the next:
**Night 1 → 2 → 3**, each with bolder entities and more frequent anomalies.

### Keyboard

`1–6` select camera · `L` lights · `A` audio · `V` vents · `Space` log ·
`T` deploy TMF · `P` panic · `H` handbook · `Enter` skip boot.

### Tactical Mobile Force (TMF)

A one‑shot elite squad with a long cooldown.

- Deploy on an entity at **Control ≤ 10%** → **the operation succeeds** and the
  entity is re‑contained for the rest of the shift.
- Deploy on a still‑controllable entity (**Control > 10%**) → **"Operation
  Failed."** The squad is wiped out and the TMF goes on an 80‑second cooldown.

Forcing an entity's Control down low enough to deploy also pushes its
Agitation toward a breach — getting the timing right is the gamble.

### Winning

Hold the wing until the shift clock reaches **06:00**, or re‑contain all six
entities with the TMF.

---

## The six entities

Each entity uses its **own** sprite, recreated as pixel art from the reference
stills (`assets/monsters/`).

| # | Entity | Danger | Calm it by |
| - | ------ | ------ | ---------- |
| 1 | **Doctor Insane** — cone‑headed shadow that changes posture unseen and stares into the lens | High | Dim the lights, stop switching cameras |
| 2 | **The Glass Man** — mask‑faced figure that lunges at the glass and taps the screen | Medium | Lower audio gain, don't stare it down |
| 3 | **Sad Guy** — pale skeletal figure in a decayed washroom | Low–Med | Look away for 10–15 seconds |
| 4 | **Guilt** — a static‑filled silhouette that mimics your camera and bleeds hallucinations | High | Observe it briefly / log it often to acknowledge it |
| 5 | **The Locust** — a swarm of pixel‑insect shadows that splits and floods the feed | Very High | Stabilize the lights, keep the vents open |
| 6 | **The Listener** — a faceless thing that reacts only to sound | Med–High | Mute non‑essential audio; silence the wing |

The entities **learn**: their aggression ramps up across the shift.

---

## Project layout

```
index.html                    markup + overlays (boot, title, handbook, end)
css/style.css                 surveillance / analog‑horror styling (CRT, scanlines, vignette)
js/config.js                  tuning, entity metadata, difficulties, nights, boot + corrupt text, Handbook
js/rules.js                   per‑entity agitation/control behaviour (the conflicts live here)
js/audio.js                   procedural Web Audio: hum, static bed, beeps, alarm
js/game.js                    state, simulation, anomalies, canvas rendering, UI wiring
assets/monsters/*.png         the six entity sprites (640×480 pixel art)
tools/generate_sprites.py     regenerates the sprites with Pillow
docs/GAME_DESIGN_DOCUMENT.md  the full design document
```

### Regenerating the sprites

```bash
pip install Pillow
python3 tools/generate_sprites.py   # writes assets/monsters/*.png
```

---

*Do not trust silence. Do not trust stillness. The entities remember you.*
