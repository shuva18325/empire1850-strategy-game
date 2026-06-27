/* =====================================================================
 * THE OBSERVATION WING — configuration & static data
 * ===================================================================== */

const CONFIG = {
  // A full shift runs the in-game clock 00:00 -> 06:00 over this many
  // real seconds. Survive to the end of the shift to win.
  SHIFT_SECONDS: 300,
  IN_GAME_HOURS: 6,

  // Simulation tuning (units are "meter points per second").
  IDLE_CREEP: 0.9,      // slow drift toward instability when left alone
  CALM_RATE: 5.0,       // agitation removed/sec while actively calmed
  AGGR_RATE: 6.0,       // agitation added/sec while aggravated (x danger)
  CTRL_DRAIN: 4.5,      // controlability lost/sec while mishandled (x danger)
  CTRL_RECOVER: 3.2,    // controlability regained/sec while handled + logged
  HIGH_AGIT: 70,        // above this, agitation bleeds controlability
  ACK_WINDOW: 22,       // seconds a log entry counts as "acknowledged"

  // The entities learn. Danger ramps up across the shift.
  LEARN_RAMP: 0.6,      // +60% aggression by 06:00

  BREACH_AT: 100,       // agitation that triggers a containment breach
  TMF_THRESHOLD: 10,    // controlability at/below which TMF succeeds
  TMF_COOLDOWN: 80,     // seconds before TMF can be re-armed after use

  CRITICAL_AGIT: 80,    // UI warning + facility alarm threshold

  // Panic button — emergency facility-wide stabilization.
  PANIC_COOLDOWN: 50,   // seconds before it can be used again
  PANIC_RELIEF: 26,     // agitation removed from every entity
  PANIC_CTRL_COST: 9,   // controlability cost to every entity
  PANIC_NOISE: 3.0,     // seconds the panic siren registers as noise

  // Random anomaly scheduler (seconds between events).
  ANOMALY_MIN: 16,
  ANOMALY_MAX: 30,
  OUTAGE_TIME: 5,       // seconds a camera stays blacked out
};

/* ---------------------------------------------------------------------
 * Difficulty modes. `aggro` scales how fast agitation rises, `decay`
 * scales controlability loss, `anomaly` scales the gap between random
 * events (lower = more frequent), `shift` is the shift length in seconds.
 * ------------------------------------------------------------------- */
const DIFFICULTIES = {
  observer: { key: 'observer', label: 'OBSERVER', desc: 'Training rotation. Forgiving meters, slow decay, rare anomalies.', aggro: 0.78, decay: 0.70, anomaly: 1.4, shift: 300 },
  manager:  { key: 'manager',  label: 'MANAGER',  desc: 'Standard shift. The intended experience.',                        aggro: 1.00, decay: 1.00, anomaly: 1.0, shift: 300 },
  director: { key: 'director', label: 'DIRECTOR', desc: 'No margin for error. Fast decay, frequent anomalies.',            aggro: 1.28, decay: 1.35, anomaly: 0.7, shift: 330 },
};

/* ---------------------------------------------------------------------
 * Multi-night campaign. Each night the entities grow bolder and the
 * anomalies come faster. Clear a night to unlock the next.
 * ------------------------------------------------------------------- */
const NIGHTS = {
  1: { label: 'NIGHT 1 — ORIENTATION', aggro: 1.00, anomaly: 1.00, note: 'All six entities online. Baseline behaviour.' },
  2: { label: 'NIGHT 2 — ESCALATION',  aggro: 1.16, anomaly: 0.80, note: 'They have studied you. They destabilise faster and the lights are unreliable.' },
  3: { label: 'NIGHT 3 — COLLAPSE',    aggro: 1.34, anomaly: 0.60, note: 'Containment is failing wing-wide. Anomalies are relentless. Hold anyway.' },
};
const MAX_NIGHT = 3;

/* ---------------------------------------------------------------------
 * Fake OS boot sequence shown before the title screen.
 * ------------------------------------------------------------------- */
const BOOT_LINES = [
  'OBSERVATION WING TERMINAL   //   OS v3.31',
  'PROPERTY OF THE OBSERVATION WING — DO NOT REMOVE',
  '',
  'POWER-ON SELF TEST .............. OK',
  'MEMORY CHECK .................... 640K OK',
  'CAMERA BUS [CAM 01-06] .......... ONLINE',
  'CONTAINMENT RELAYS .............. ENGAGED',
  'AUDIO SUBSYSTEM ................. ONLINE',
  'VENT CONTROL ARRAY .............. ONLINE',
  'LIGHTING GRID .................... NOMINAL',
  'TMF UPLINK ...................... STANDBY',
  '',
  'WARN: 6 ENTITIES PRESENT ON THE WING',
  'WARN: DO NOT TRUST SILENCE',
  'WARN: DO NOT TRUST STILLNESS',
  '',
  'LOADING MANAGER PROTOCOL ........',
];

/* ---------------------------------------------------------------------
 * Corrupted transmissions injected into the log by anomalies. These are
 * lies, mostly. Mostly.
 * ------------------------------------------------------------------- */
const CORRUPT_MESSAGES = [
  'we kn0w which camera you favour.',
  'the door in sub-level 2 was never on the blueprint.',
  'MANAGER #00–– did not clock out. ask the wing why.',
  'stop l00king. it likes that you look.',
  'the vents do not go where you think they go.',
  'one of the six is already out. recount.',
  'h e l l o   m a n a g e r',
  'your predecessor recorded this exact shift. it ended.',
  'C0NTAINMENT IS A SUGGESTION.',
  'we remember the last one. we will remember you.',
  'who is watching CAM-07',
  'you have been the Manager for longer than you think.',
];

/* ---------------------------------------------------------------------
 * The six entities. Each `png` is a different sprite, recreated as
 * pixel-art from the reference stills.
 * ------------------------------------------------------------------- */
const MONSTERS = [
  {
    id: 'doctor_insane',
    name: 'Doctor Insane',
    cam: 'CAM-01',
    location: 'WARD CORNER',
    png: 'assets/monsters/doctor_insane.png',
    danger: 1.6,
    dangerLabel: 'HIGH',
    blurb: 'Tall, thin shadow-humanoid with a cone-shaped head. Moves slowly, unpredictably. Changes posture when unobserved.',
    calming: 'Reduce camera switching. Keep lights DIM.',
  },
  {
    id: 'glass_man',
    name: 'The Glass Man',
    cam: 'CAM-02',
    location: 'EAST HALL',
    png: 'assets/monsters/glass_man.png',
    danger: 1.1,
    dangerLabel: 'MEDIUM',
    blurb: 'Mask-faced figure with tangled, hair-like shadows. Approaches the lens abruptly and taps the screen when irritated.',
    calming: 'Lower audio gain. Avoid direct focus.',
  },
  {
    id: 'sad_guy',
    name: 'Sad Guy',
    cam: 'CAM-03',
    location: 'DECON BATH',
    png: 'assets/monsters/sad_guy.png',
    danger: 0.9,
    dangerLabel: 'LOW–MED',
    blurb: 'Pale, skeletal humanoid in a decayed washroom. Passive — until it is stared at too long.',
    calming: 'Look away for 10–15 seconds.',
  },
  {
    id: 'guilt',
    name: 'Guilt',
    cam: 'CAM-04',
    location: 'OBSERVATION B',
    png: 'assets/monsters/guilt.png',
    danger: 1.45,
    dangerLabel: 'HIGH',
    blurb: 'A shifting silhouette filled with static. Mimics your camera movements and bleeds hallucinations when ignored.',
    calming: 'Observe briefly to “acknowledge” it. Log it often.',
  },
  {
    id: 'locust',
    name: 'The Locust',
    cam: 'CAM-05',
    location: 'VENT SHAFT 9',
    png: 'assets/monsters/locust.png',
    danger: 1.9,
    dangerLabel: 'VERY HIGH',
    blurb: 'A swarm of hundreds of pixel-insect shadows. Splits and spreads. A breach floods every camera with crawling static.',
    calming: 'Stabilize lights. Keep vents OPEN.',
  },
  {
    id: 'listener',
    name: 'The Listener',
    cam: 'CAM-06',
    location: 'SUB-LEVEL 2',
    png: 'assets/monsters/listener.png',
    danger: 1.35,
    dangerLabel: 'MED–HIGH',
    blurb: 'A faceless humanoid that reacts only to sound. Alarms, beeps and running vents draw it. It moves in silence.',
    calming: 'Mute non-essential audio. Silence the wing.',
  },
];

/* ---------------------------------------------------------------------
 * In-universe Manager's Handbook (shown in-game).
 * ------------------------------------------------------------------- */
const HANDBOOK = `MANAGER'S HANDBOOK — REVISION 3.3
Property of: The Observation Wing
Unauthorized removal will result in termination.

SECTION 1 — YOUR ROLE
You are the Manager. You maintain stability within the Observation Wing.
Monitor all six entities, record anomalies, and intervene when agitation
or controlability becomes dangerous.

SECTION 2 — METERS
AGITATION  — measures instability. At 100% the entity BREACHES and the
             facility is lost.
CONTROL    — measures how controllable the entity is. At 10% or lower the
             Tactical Mobile Force may be deployed. Above 10% it will fail.

SECTION 3 — CALMING PROCEDURES
Doctor Insane : Reduce camera switching. Dim the lights.
The Glass Man : Lower audio gain. Avoid direct focus.
Sad Guy       : Look away for 10–15 seconds.
Guilt         : Observe briefly to "acknowledge" it.
The Locust    : Stabilize the lights. Open the vents.
The Listener  : Mute non-essential audio.

Note the conflicts. Doctor Insane wants the lights DIM; the Locust wants
them STABLE. The Locust wants the vents OPEN; the Listener hears them run.
You cannot satisfy everyone at once. Triage.

SECTION 4 — TMF DEPLOYMENT
Deploy the Tactical Mobile Force ONLY when an entity's CONTROL is 10% or
lower. Deployed correctly, the TMF re-contains the entity. Deployed against
a still-controllable entity, the TMF is wiped out instantly and the system
reports: "Operation Failed." The TMF then needs a long cooldown. Do not
waste it.

SECTION 5 — EMERGENCY PROTOCOLS
The PANIC pulse stabilises the entire wing at once — but it costs control
on every entity and the siren is LOUD. The Listener will hear it. Use PANIC
to survive a multi-entity surge, never as routine maintenance.

When anomalies strike: during a POWER SURGE, stabilize the lights to protect
the Locust. During a CAMERA OUTAGE you are blind on one feed — serve that
entity's needs from memory until it restores. During AUDIO FEEDBACK, mute
and ride it out. Ignore corrupted transmissions. They are trying to be read.

SECTION 6 — BREACH PROTOCOL
If any entity breaches, cameras distort, warning lights flash, logs freeze,
and the system reports: "You were overrun. Facility lost."

SECTION 7 — FINAL NOTES
Do not trust silence. Do not trust stillness.
Controlability is as important as agitation. The TMF is a last resort.
Sweep cameras on a rhythm. Log constantly — acknowledgment is the only
thing that rebuilds control.
The entities learn from you. The entities remember you.`;
