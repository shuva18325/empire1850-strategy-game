# THE OBSERVATION WING
### — A Manager's Protocol —
**Game Design Document · Production Build · Revision 3.3**

> *Property of the Observation Wing. Unauthorized removal will result in termination.*

This document describes the complete, shipping design of **THE OBSERVATION
WING**, a 2D pixel-art observation-horror game. Every system, entity, screen
and rule described here is implemented in the accompanying build
(`index.html` + `js/` + `css/` + `assets/`). There are no placeholders.

---

## TABLE OF CONTENTS
1. [Game Overview](#1--game-overview)
2. [Systems](#2--systems)
3. [The Six Entities](#3--the-six-entities)
4. [UI + Terminal Design](#4--ui--terminal-design)
5. [Manager's Handbook (Final)](#5--managers-handbook-final)
6. [Lore + World Background](#6--lore--world-background)
7. [Extras (Implemented)](#7--extras-implemented)
8. [Presentation Style](#8--presentation-style)
9. [Appendix — Tuning Reference](#9--appendix--tuning-reference)

---

## 1 · GAME OVERVIEW

| Field | Value |
| ----- | ----- |
| **Final title** | **THE OBSERVATION WING** *(tagline: "A Manager's Protocol")* |
| **Genre** | 2D pixel-art **observation-horror** / survival management (analog-horror, single-screen surveillance) |
| **Perspective** | First-person Manager at a CRT surveillance terminal |
| **Session length** | One *shift* ≈ 5 minutes real time (in-fiction 00:00 → 06:00) |
| **Players** | Single player |
| **Tech** | Vanilla HTML / CSS / JavaScript · Canvas rendering · procedural Web Audio · zero dependencies, zero build step |

### Core loop
1. **Observe** the six entities across the camera feeds.
2. **Read the room** — each entity's *Agitation* and *Control* meters tell you who is destabilising and why.
3. **Intervene** with the environmental controls (lights / audio / vents), camera attention, and the Log.
4. **Triage the conflicts** — the entities want mutually exclusive conditions; you cannot satisfy all six.
5. **Escalate when forced** — Panic to buy time, or deploy the one-shot TMF to permanently re-contain a destabilised entity.
6. **Survive** to 06:00, or lose the wing.

> Observe → Diagnose → Intervene → Triage → (Escalate) → Survive.

### Player role
You are the **Manager** of the Observation Wing: the night-shift operator
responsible for keeping six analog-horror entities contained. You never leave
the terminal. Your only tools are cameras, the facility's environmental
systems, your written logs, an emergency Panic pulse, and a single elite
strike team you may only call when it is already too late for an entity.

### Shift structure
A shift is a continuous real-time descent from **00:00 to 06:00**. The shift
clock is shown top-right and fills a progress bar. Three escalating nights form
a short campaign:

| Night | Title | Effect |
| ----- | ----- | ------ |
| **1** | ORIENTATION | Baseline behaviour. |
| **2** | ESCALATION | +16% aggression, anomalies 20% more frequent. |
| **3** | COLLAPSE | +34% aggression, anomalies ~40% more frequent. |

Clearing a night unlocks the next. Across any night the entities also **learn
in real time**: aggression ramps up to +60% by 06:00 (they grow bolder the
longer you watch them).

---

## 2 · SYSTEMS

### 2.1 Agitation System
Every entity carries an **Agitation** meter, `0–100`.

- It **rises** when the entity's personal *trigger conditions* are met (see §3) and **falls** when its *calming conditions* are met.
- Rise rate is scaled by the entity's **Danger Level**, by the **night/difficulty** multipliers, and by the **learn ramp** (time elapsed in the shift).
- Sustained high agitation (`> 70`) additionally **bleeds Control**, so an ignored entity spirals: agitation feeds loss of control, which makes it harder to recover.
- **At 100 → Containment Breach → game over.**

### 2.2 Controlability System
Every entity carries a **Control** meter, `0–100`.

- `100` = fully controllable · `50` = risky · `≤ 10` = unstable, confused, weakened (TMF-viable) · `0` = uncontrollable.
- Control **decays** from: ignoring the entity, using the wrong calming method, environmental triggers, sustained high agitation, the Panic pulse, and random anomalies.
- Control **recovers** when the entity is both *correctly calmed* **and** *acknowledged* — i.e. you **Log** it (a log entry counts as acknowledgment for ~22 seconds).
- The crucial tension: the conditions that push Control to TMF-range (≤10%) are the same conditions that drive Agitation toward breach. To deploy the TMF you must walk an entity to the edge of breach **without going over.**

### 2.3 TMF Deployment System (Tactical Mobile Force)
A single, shared, elite strike team — the facility's last resort.

- **Target** = whichever entity is on the active camera.
- **Control ≤ 10% → OPERATION SUCCEEDS.** The entity is weakened enough to be neutralised and **re-contained for the rest of the shift** (removed as a threat; flagged `RE-CONTAINED`).
- **Control > 10% → "OPERATION FAILED."** The entity is too aware; the squad is **wiped out instantly**, and the assault *enrages* the target (+14 agitation).
- After **any** deployment, the TMF enters an **80-second cooldown** (`T.M.F.` panel in the header counts it down). Misuse is punishing: you lose your only re-containment tool for over a minute.

### 2.4 Camera System
Six fixed feeds, **CAM-01 … CAM-06**, one per entity.

- One **main monitor** (active feed) plus a **6-cell live thumbnail strip**.
- Switch via the thumbnails, the roster rows, or number keys **1–6**.
- The active feed determines who is being *observed* — which matters enormously: some entities calm when watched (Guilt), others destabilise (Sad Guy, Glass Man).
- **Rapid switching** is itself a trigger for Doctor Insane — pace your sweeps.
- Feeds can **black out** during a *Camera Outage* anomaly (see §2.10): the feed shows `SIGNAL LOST` static and the entity counts as **unobserved** until it restores.

### 2.5 Environmental Controls
Three global systems on the Control Deck. **Their requirements conflict by
design — this is the core puzzle.**

| Control | States | Wanted by | Hated by |
| ------- | ------ | --------- | -------- |
| **LIGHTS** | `BRIGHT → DIM → STABLE` | Doctor Insane wants **DIM**; the Locust wants **STABLE** | Bright agitates Doctor Insane; flicker agitates the Locust |
| **AUDIO GAIN** | `HIGH → LOW → MUTE` | Glass Man & Listener want it quiet | High agitates Glass Man & Listener |
| **VENTS** | `CLOSED ⇄ OPEN` | the Locust needs them **OPEN** | the Listener **hears them run** while open |

Key conflicts you must triage:
- **Lights** cannot be DIM (for Doctor Insane) and STABLE (for the Locust) at once.
- **Vents** open to settle the Locust, but the airflow is *noise* that hunts the Listener.
- Every toggle and camera switch produces a **beep** that briefly counts as noise — fiddling has a cost.

### 2.6 Logging System
The **LOG** action (button or **Spacebar**) records an in-character
observation about the entity on the active camera.

- A log entry **acknowledges** the entity (resets its acknowledgment timer; this is what *calms Guilt* and *enables Control recovery* for everyone).
- It also grants an immediate **+6 Control** nudge.
- The log text is **state-aware**: calm / stirring / critical buckets produce different lines (green for calm, neutral for stirring, red for critical), so the feed reads like a real shift journal.
- The shared **Observation Log** console also receives system messages, anomaly alerts, and corrupted transmissions.

### 2.7 Shift Timer
Real-time clock mapped to **00:00 → 06:00** over the shift length (300s on
Observer/Manager, 330s on Director). Displayed numerically with a fill bar.
Reaching 06:00 is the **survival victory** condition.

### 2.8 Breach Logic
When any entity's Agitation reaches **100**:
- The shift **ends immediately**.
- Screen **shakes**, the alarm cuts out into a low breach tone, the static bed maxes out.
- `CONTAINMENT BREACH` stamps across the monitor, logs freeze.
- After a beat, the **Game Over** screen reports the loss and which entity broke out.

### 2.9 Failure States
- **Containment Breach** — any Agitation hits 100 → *"You were overrun. Facility lost."*
- (Soft failure) **Wasting the TMF** above 10% control — not a game over, but you lose the team for 80s and enrage the target, often *causing* a breach shortly after.

### 2.10 Victory States
- **Survival** — reach 06:00 with no breach → *"You held the wing until 06:00. Shift complete."* → **NIGHT CLEARED.**
- **Total Re-containment** — TMF-neutralise all six entities before the clock runs out → *"Every entity re-contained. The wing is yours."*
- **Campaign Clear** — clear Night 3 → *"Three nights held… For now."*

### 2.11 Panic System *(emergency)*
A header-mounted **PANIC** button (or key **P**).

- Fires a **wing-wide stabilization pulse**: every non-contained entity loses **−26 Agitation** instantly.
- **Cost:** every entity also loses **−9 Control**, and the **panic siren is loud** — it registers as a strong noise source that *wakes the Listener*.
- **50-second cooldown.** Panic buys breathing room from a multi-entity spike, but mortgages your Control and feeds the one entity that hates noise. Use it to survive a surge, not as routine maintenance.

---

## 3 · THE SIX ENTITIES

All entities share two universal rules:
- **Breach** at Agitation `100`.
- **TMF**: success at Control `≤ 10%`, failure (squad wiped, +14 agitation) above it.

Each entity uses its **own sprite** (`assets/monsters/`), recreated as pixel
art from the analog-horror reference stills.

---

### 3.1 — Doctor Insane · CAM-01 · WARD CORNER
**Danger: HIGH (1.6×)**

- **Description:** A tall, thin, shadow-like humanoid with elongated limbs and a cone-shaped head, folded into the corner of an empty ward. Moves slowly and unpredictably.
- **Behavior patterns:** Changes posture between frames whenever it is *not* being observed; emits static interference when agitated; turns to **stare directly into the camera** under high stress.
- **Agitation triggers:** Bright lights (strong); any non-dim lighting (mild); **rapid camera switching** (> ~0.55 switches/sec).
- **Control decay:** **Drops rapidly when ignored** (unobserved > 8s); accelerated by high agitation.
- **Calming method:** Keep **lights DIM** and **stop switching cameras**; **Log** it to recover Control.
- **Camera behavior:** Posture-shifts while unwatched; at Agitation > 60 it zooms toward its mask and **stares into the lens**; static bursts on agitation.
- **Breach behavior:** CAM-01 floods with distortion as it rises out of the corner.

---

### 3.2 — The Glass Man · CAM-02 · EAST HALL
**Danger: MEDIUM (1.1×)**

- **Description:** A mask-faced figure with long distorted limbs and tangled, hair-like shadows, pressed against ornate wallpaper, one cracked palm reaching toward the lens.
- **Behavior patterns:** Approaches the camera abruptly; emits sharp audio spikes when irritated; **taps the screen**, tearing the image.
- **Agitation triggers:** **High audio gain** (strong); low audio (mild); **direct focus** (held on the active camera > 5s).
- **Control decay:** Lost when handled wrong — loud audio or staring it down.
- **Calming method:** **Lower audio gain (MUTE is safest)** and **avoid direct focus** — glance, don't stare.
- **Camera behavior:** Lunges/zooms toward the glass at Agitation > 55; at high agitation it produces **torn RGB "tap" slices** across the feed.
- **Breach behavior:** Reaches through the lens; the hand fills the frame.

---

### 3.3 — Sad Guy · CAM-03 · DECON BATH
**Danger: LOW–MEDIUM (0.9×)**

- **Description:** A pale, skeletal humanoid standing in a decayed, tiled washroom. Passive — until it is stared at too long.
- **Behavior patterns:** Remains still for long stretches; agitation rises under **continuous observation**; slowly **approaches the drain beneath the lens** when stressed.
- **Agitation triggers:** Being **stared at** (held on the active camera > 3s) — and it gets *worse the longer you look*.
- **Control decay:** Drops while stared at.
- **Calming method:** **Look away for 10–15 seconds.** Then **Log** it from afar to recover.
- **Camera behavior:** Inert when unwatched; approaches the lens at Agitation > 50.
- **Breach behavior:** Arrives directly beneath the camera; the feed goes white.

---

### 3.4 — Guilt · CAM-04 · OBSERVATION B
**Danger: HIGH (1.45×)**

- **Description:** A shifting silhouette resembling a human outline filled with crawling static — a wide, anvil-headed shadow with two pale crescent eyes.
- **Behavior patterns:** **Mimics your camera movements**; agitation rises when **ignored**; bleeds **hallucination overlays** across the feed.
- **Agitation triggers:** Being **ignored** (unobserved > 6s) — rising faster the longer it goes unseen.
- **Control decay:** Drops while ignored; requires **frequent acknowledgment**.
- **Calming method:** **Observe it briefly to "acknowledge" it**, and **Log it often** — acknowledgment is its food.
- **Camera behavior:** Always renders a chromatic **mimic ghost**; at Agitation > 50 the feed **hallucinates** (doubled, color-shifted overlays).
- **Breach behavior:** The outline fills the entire feed with static; the hallucination becomes the picture.

---

### 3.5 — The Locust · CAM-05 · VENT SHAFT 9
**Danger: VERY HIGH (1.9×)**

- **Description:** A swarm-entity made of hundreds of tiny, pixelated insect-shadows clustered into a vaguely humanoid mass inside a vent shaft.
- **Behavior patterns:** **Splits into multiple swarms**; agitation spikes on **light flickers**; a breach **floods every camera with crawling static**.
- **Agitation triggers:** Unstable lighting (mild); **a light flicker while lights aren't STABLE** (strong); **vents CLOSED** (mild).
- **Control decay:** **Drops extremely fast** whenever it isn't properly stabilised.
- **Calming method:** **Stabilize the lights** *and* **keep the vents OPEN** — both at once. (Note: open vents anger the Listener — triage.)
- **Camera behavior:** Splits into offset swarm copies at Agitation > 40; static intensifies sharply.
- **Breach behavior:** The swarm escapes the shaft and **crawling static bleeds across all feeds.**

---

### 3.6 — The Listener · CAM-06 · SUB-LEVEL 2
**Danger: MEDIUM–HIGH (1.35×)**

- **Description:** A tall, faceless humanoid in the dark of Sub-Level 2 that reacts only to sound. It moves in silence.
- **Behavior patterns:** Agitation rises with **any noise** — alarms, UI beeps, running vents, the panic siren; calms in **total silence**; drifts soundlessly across the frame.
- **Agitation triggers:** Noise sources, scaled by how many: audio HIGH (×2) / LOW (×1), open vents (×1), recent beeps (×1), facility alarm or panic siren (×2).
- **Control decay:** Scales with the number of active noise sources.
- **Calming method:** **Mute non-essential audio, close the vents, and stop touching controls** — silence the wing.
- **Camera behavior:** Drifts laterally and silently; static rises with noise exposure.
- **Breach behavior:** It locates the source of the noise — the lens — and arrives.

---

## 4 · UI + TERMINAL DESIGN

A single-screen **CRT surveillance terminal**: dark panels, phosphor-green and
amber readouts, red warning states, scanlines, vignette, and per-feed static.

### 4.1 OS Boot Screen
On launch, a fake terminal **types out a POST/boot sequence** (`OS v3.31`,
camera bus, containment relays, TMF uplink, and `WARN:` lines about the
entities), with a blinking cursor. Click or press Enter/Space/Esc to skip into
the title.

### 4.2 Title / Shift-Start Screen
`●REC` header, game title and pitch, a 7-point briefing, then two selectors:
- **SELECT NIGHT** — Night 1 unlocked; Nights 2–3 show 🔒 until earned.
- **CLEARANCE / DIFFICULTY** — OBSERVER / MANAGER / DIRECTOR, with a live description line.

Buttons: **BEGIN SHIFT** and **READ HANDBOOK**, plus a flashing-imagery/headphones advisory.

### 4.3 Camera Grid
The **main monitor** (active feed, 4:3, pixelated) with on-screen display
(camera ID, entity name, location, live state label) and a **6-cell thumbnail
strip** below — each a live mini-feed with a status dot (green/amber/red),
warning border when critical, and a `RE-CONTAINED` veil when neutralised.

### 4.4 Entity Status Panels (Roster)
Right-hand **CONTAINMENT STATUS** column: one card per entity with name, camera,
danger label, a red **AGITATION** bar and a green **CONTROL** bar (numeric %),
plus a status tag (`◈ TMF-READY TARGET`, `⚠ NEAR BREACH`, `RE-CONTAINED`). Cards
flash red near breach and are clickable to switch feeds.

### 4.5 TMF Panel
Header **T.M.F.** block: `READY` (green) or a live cooldown countdown (red). The
Deck's **DEPLOY TMF** button arms/flashes when the active target is at ≤10%
control, and disables during cooldown.

### 4.6 Log Panel
Bottom **OBSERVATION LOG** console: timestamped, color-coded scrolling feed
(system = amber, calm = green, critical = red, **corrupted = glitched red/cyan**).

### 4.7 Control Deck + Panic
Six deck buttons — **LIGHTS · AUDIO GAIN · VENTS · LOG · DEPLOY TMF · HANDBOOK** —
each showing its current value. The **PANIC** button lives in the header as a
pulsing red emergency control (separate, deliberate, with its own cooldown).

### 4.8 Breach Alert Screen
Full red-wash, screen shake, `CONTAINMENT BREACH` across the monitor, frozen
logs, breach tone — then the Game Over card.

### 4.9 Shift-Complete Screen
**NIGHT CLEARED** (green) with the survival message and a stat block (night,
clearance, time held, entities re-contained, entities still stable), plus
**PROCEED TO NEXT NIGHT ▸**, **RESTART NIGHT**, and **MAIN TERMINAL**.

### 4.10 Game Over Screen
**FACILITY LOST** (red): *"You were overrun. Facility lost."* with stats
(including which entity breached) and **RESTART NIGHT** / **MAIN TERMINAL**.

---

## 5 · MANAGER'S HANDBOOK (FINAL)

> **MANAGER'S HANDBOOK — REVISION 3.3**
> Property of: The Observation Wing
> Unauthorized removal will result in termination.

**SECTION 1 — YOUR ROLE.** You are the Manager. You maintain stability within
the Observation Wing. Monitor all six entities, record anomalies, and intervene
when agitation or controlability becomes dangerous.

**SECTION 2 — METERS.** *Agitation* measures instability; at 100% the entity
breaches and the facility is lost. *Control* measures how controllable the
entity is; at 10% or lower the TMF may be deployed — above 10% it will fail.

**SECTION 3 — CALMING PROCEDURES.**
- Doctor Insane — reduce camera switching; dim the lights.
- The Glass Man — lower audio gain; avoid direct focus.
- Sad Guy — look away for 10–15 seconds.
- Guilt — observe briefly to "acknowledge" it; log it.
- The Locust — stabilize the lights; open the vents.
- The Listener — mute non-essential audio.

*Note the conflicts.* Doctor Insane wants the lights DIM; the Locust wants them
STABLE. The Locust wants the vents OPEN; the Listener hears them run. You cannot
satisfy everyone at once. **Triage.**

**SECTION 4 — TMF DEPLOYMENT.** Deploy the Tactical Mobile Force ONLY when an
entity's Control is 10% or lower. Deployed correctly, it re-contains the entity.
Deployed against a still-controllable entity, the team is wiped out instantly
and the system reports **"Operation Failed."** Long cooldown follows. Do not
waste it.

**SECTION 5 — EMERGENCY PROTOCOLS.** The PANIC pulse stabilises the entire wing
at the cost of control and noise; it is for surviving a multi-entity surge, not
routine work. During a **Power Surge**, stabilize the lights. During a **Camera
Outage**, protect the blind entity's needs from memory. During **Audio
Feedback**, mute and ride it out.

**SECTION 6 — BREACH PROTOCOL.** If any entity breaches, cameras distort,
warning lights flash, logs freeze, and the system reports **"You were overrun.
Facility lost."**

**SECTION 7 — ENTITY NOTES.** They learn from you. They grow bolder the longer
the shift runs. Treat silence and stillness as warnings, not relief.

**SECTION 8 — WARNINGS & TIPS.**
- Do not trust silence. Do not trust stillness.
- Control is as important as agitation. The TMF is a last resort.
- Sweep cameras on a rhythm — fast enough to acknowledge Guilt, slow enough not to provoke Doctor Insane.
- Mute is your default; raise audio only with intent.
- Log constantly — acknowledgment is the only thing that *rebuilds* control.
- The entities remember you.

---

## 6 · LORE + WORLD BACKGROUND

**Why the facility exists.** The Observation Wing is a deep sub-level annex of a
research complex whose public charter is "anomalous media preservation." Its
real purpose is **containment-by-attention**: the six entities cannot be
destroyed, only *kept calm* — and they are calmed, fed, and bound by the act of
being **watched, recorded, and acknowledged.** The Wing is a machine for paying
attention, and the Manager is its moving part.

**Who built it.** The Wing predates its current operators. Construction records
list a defunct contractor and a blueprint that does not match the building —
there are corridors and a Sub-Level 2 that "were never on the blueprint." The
relays, the camera bus, and the TMF uplink were all retrofitted onto something
older.

**What the entities are.** Not monsters in the classical sense — **reactions.**
Each is a crystallised behavioural loop: a thing that exists in response to a
specific stimulus (light, sound, gaze, neglect, noise, swarming) and *escalates*
when that stimulus is mismanaged. They appear to be analog-horror "characters,"
but the staff notes treat them as **standing conditions** that the building has
failed to discharge. They learn the operator. They remember the last one.

**Why the Manager is needed.** The systems can suppress the entities, but only a
*person* can perform acknowledgment — the cameras need a watcher, the logs need
an author. Automation has been tried. The automated shifts are why there is a
Revision 3.3.

**Hidden secrets.** Corrupted transmissions reference **Manager #00–––**, who
"did not clock out," a **CAM-07** no one can find, and the suggestion that "one
of the six is already out — recount." The Wing implies the Manager has held this
post "longer than you think." None of it is confirmed. All of it is consistent.

**Optional ARG threads.** The boot screen's OS version, the handbook's revision
number, and the corrupted-message pool are designed to seed an alternate-reality
layer: revision numbers that don't add up, a seventh camera, a predecessor whose
shift "ended," and the recurring refrain — *we remember the last one; we will
remember you.*

---

## 7 · EXTRAS (IMPLEMENTED)

These are shipped in the build, not future work.

- **Multi-night campaign (Night 1 / 2 / 3).** Escalating aggression and anomaly frequency; clear a night to unlock the next; carry your clearance forward.
- **Difficulty modes.** OBSERVER (forgiving, slow decay, rare anomalies), MANAGER (standard), DIRECTOR (fast decay, frequent anomalies, longer shift).
- **Random events / anomalies.** A scheduler fires, on a difficulty-scaled timer:
  - **Power Surge** — forces the lighting grid to flicker (endangers the Locust).
  - **Camera Outage** — a feed drops to `SIGNAL LOST`; that entity goes unobserved until it restores.
  - **Audio Feedback** — a noise burst that draws the Listener and Glass Man.
  - **Corrupted Transmission** — see below.
- **Corrupted messages.** Glitch-styled lines injected into the log (the ARG layer): *"the door in sub-level 2 was never on the blueprint," "one of the six is already out. recount," "who is watching CAM-07."*
- **OS boot sequence.** The fake terminal POST described in §4.1.
- **Panic button.** The emergency wing-wide stabilization pulse described in §2.11.
- **Procedural audio.** Low analog hum, 60Hz buzz, a static bed that swells with facility tension, UI beeps, a pulsing containment alarm, and breach/impact tones — all generated at runtime (no audio files).
- **Keyboard control.** `1–6` cameras · `L` lights · `A` audio · `V` vents · `Space` log · `T` TMF · `P` panic · `H` handbook.

---

## 8 · PRESENTATION STYLE

- **Visual:** 2D pixel-art, dark analog-horror. CRT scanlines, vignette, per-feed static that scales with agitation, light-flicker, chromatic hallucination (Guilt), torn-slice distortion (Glass Man), swarm-splitting (Locust), `SIGNAL LOST` outages, screen-shake on breach.
- **Audio:** Quiet, unsettling, procedural — analog hum and buzz under a static bed that rises with tension; sparse beeps and a wavering alarm. Diegetic: the sounds you make are the sounds the Listener hears.
- **UI:** Minimal surveillance terminal — phosphor green / warning amber / alarm red on near-black panels, monospace type, blinking `●REC`.
- **Tone:** Procedural, clinical, in-universe. The handbook, logs, and boot screen all speak in the same dry institutional voice that occasionally **breaks.**
- **Document standard:** Complete and self-consistent — every screen, system, and entity above exists in the build. No placeholders, no TODOs, no missing sections.

---

## 9 · APPENDIX — TUNING REFERENCE

Authoritative values from `js/config.js` (Manager clearance, Night 1 baseline).

| Constant | Value | Meaning |
| -------- | ----- | ------- |
| Shift length | 300s (Director 330s) | 00:00 → 06:00 |
| Idle creep | 0.9 /s | drift toward instability when left alone |
| Calm rate | 5.0 /s | agitation removed while correctly calmed |
| Aggravate rate | 6.0 /s | base agitation gain while triggered (×danger-derived factors) |
| Control drain | 4.5 /s | base control loss while mishandled (×decay) |
| Control recover | 3.2 /s | control regained while calmed **and** logged |
| High-agit threshold | 70 | above this, agitation also bleeds control |
| Acknowledgment window | 22s | how long a Log counts as "acknowledged" |
| Learn ramp | +60% by 06:00 | entities grow bolder across the shift |
| Critical / alarm | 80 | warning + facility alarm threshold |
| **Breach** | **100** | containment breach → game over |
| **TMF threshold** | **≤ 10%** | control at/below which TMF succeeds |
| TMF cooldown | 80s | after any deployment |
| Panic relief / cost | −26 agit / −9 control | wing-wide, all entities |
| Panic cooldown | 50s | emergency only |
| Anomaly interval | 16–30s ×scale | random-event scheduler |
| Camera outage | 5s | feed blackout duration |

**Per-entity danger multipliers:** Doctor Insane 1.6 · Glass Man 1.1 ·
Sad Guy 0.9 · Guilt 1.45 · The Locust 1.9 · The Listener 1.35.

**Difficulty multipliers:** OBSERVER (aggro ×0.78, decay ×0.70, anomalies ×1.4) ·
MANAGER (×1.0 / ×1.0 / ×1.0) · DIRECTOR (×1.28 / ×1.35 / ×0.7).

**Night multipliers:** N1 (aggro ×1.00) · N2 (×1.16, anomalies ×0.80) ·
N3 (×1.34, anomalies ×0.60).

---

*Do not trust silence. Do not trust stillness. The entities remember you.*
