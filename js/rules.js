/* =====================================================================
 * THE OBSERVATION WING — per-entity behaviour rules
 *
 * Each rule receives:
 *   e   runtime entity { id, agit, ctrl, ... }
 *   env derived world state (see game.js buildEnv)
 *   C   CONFIG
 * and returns rates PER SECOND:
 *   { agit, ctrl, state, flags }
 *
 * Positive agit = destabilising, negative = calming.
 * Positive ctrl = regaining control, negative = losing it.
 *
 * The design intentionally creates conflicts:
 *   - Doctor Insane wants DIM lights / the Locust wants STABLE lights.
 *   - The Locust wants vents OPEN / the Listener hears the vents run.
 *   - Guilt must be watched / Sad Guy & Glass Man hate being watched.
 * ===================================================================== */

function rule_doctor_insane(e, env, C) {
  const dim = env.lights === 'dim';
  const calmSwitch = env.switchRate < 0.55;
  const ignored = env.unseen[e.id] > 8;
  const acked = env.sinceLog[e.id] < C.ACK_WINDOW;

  let agit = C.IDLE_CREEP, ctrl = 0, state = 'DORMANT';
  const flags = { posture: env.unseen[e.id] > 3 };

  if (dim && calmSwitch) {
    agit = -C.CALM_RATE;
    state = 'SETTLING';
    if (acked) ctrl = C.CTRL_RECOVER;
  } else {
    if (env.lights === 'bright') agit += C.AGGR_RATE * 0.7;
    else if (!dim) agit += C.AGGR_RATE * 0.35;       // "stable" is too bright
    if (!calmSwitch) { agit += C.AGGR_RATE * 0.8; flags.staticBoost = true; }
    state = 'AGITATED';
  }
  // Control drops rapidly if ignored.
  if (ignored) ctrl -= C.CTRL_DRAIN * 1.25;
  if (e.agit > 60) { flags.staring = true; state = 'STARING'; }
  return { agit, ctrl, state, flags };
}

function rule_glass_man(e, env, C) {
  const loudAudio = env.audio === 'high';
  const softAudio = env.audio === 'mute' || env.audio === 'low';
  const directFocus = env.viewedId === e.id && env.onCam[e.id] > 5;
  const acked = env.sinceLog[e.id] < C.ACK_WINDOW;

  let agit = C.IDLE_CREEP * 0.7, ctrl = 0, state = 'WAITING';
  const flags = {};

  if (env.audio === 'mute' && !directFocus) {
    agit = -C.CALM_RATE;
    state = 'STILL';
    if (acked) ctrl = C.CTRL_RECOVER;
  } else {
    if (loudAudio) { agit += C.AGGR_RATE * 0.7; flags.staticBoost = true; }
    else if (env.audio === 'low') agit += C.AGGR_RATE * 0.2;
    if (directFocus) { agit += C.AGGR_RATE * 0.6; }
    state = directFocus ? 'APPROACHING' : 'RESTLESS';
  }
  // Wrong method (loud sound or staring it down) costs control.
  if (loudAudio || directFocus) ctrl -= C.CTRL_DRAIN * 0.9;
  if (e.agit > 55) flags.approach = true;
  return { agit, ctrl, state, flags };
}

function rule_sad_guy(e, env, C) {
  const stared = env.viewedId === e.id && env.onCam[e.id] > 3;
  const lookedAway = env.unseen[e.id] > 2;
  const acked = env.sinceLog[e.id] < C.ACK_WINDOW;

  let agit = C.IDLE_CREEP * 0.5, ctrl = 0, state = 'PASSIVE';
  const flags = {};

  if (stared) {
    agit = C.AGGR_RATE * (0.45 + env.onCam[e.id] * 0.03);   // worse the longer you look
    ctrl -= C.CTRL_DRAIN * 0.8;
    state = 'DISTURBED';
    if (e.agit > 50) flags.approach = true;
  } else if (lookedAway) {
    agit = -C.CALM_RATE;
    state = 'CALMING';
    if (acked) ctrl = C.CTRL_RECOVER * 0.9;
  }
  return { agit, ctrl, state, flags };
}

function rule_guilt(e, env, C) {
  const unseen = env.unseen[e.id];
  const ignored = unseen > 6;
  const acknowledged = env.viewedId === e.id || env.sinceLog[e.id] < C.ACK_WINDOW;

  let agit = C.IDLE_CREEP, ctrl = 0, state = 'WATCHING';
  const flags = { mimic: true };

  if (acknowledged) {
    agit = -C.CALM_RATE;
    state = 'ACKNOWLEDGED';
    ctrl = C.CTRL_RECOVER;
  } else if (ignored) {
    // Rises faster the longer it is ignored.
    agit = C.AGGR_RATE * (0.6 + Math.min(unseen - 6, 12) * 0.06);
    ctrl -= C.CTRL_DRAIN * 1.1;
    state = 'IGNORED';
  }
  if (e.agit > 50) flags.halluc = true;
  return { agit, ctrl, state, flags };
}

function rule_locust(e, env, C) {
  const stable = env.lights === 'stable';
  const contained = stable && env.vents;
  const acked = env.sinceLog[e.id] < C.ACK_WINDOW;

  let agit = C.IDLE_CREEP * 1.2, ctrl = 0, state = 'CRAWLING';
  const flags = {};

  if (contained) {
    agit = -C.CALM_RATE * 0.9;
    state = 'SETTLED';
    if (acked) ctrl = C.CTRL_RECOVER * 0.9;
  } else {
    if (!stable) agit += C.AGGR_RATE * 0.5;
    if (env.flicker && !stable) { agit += C.AGGR_RATE * 0.9; flags.staticBoost = true; }
    if (!env.vents) agit += C.AGGR_RATE * 0.35;
    state = 'SWARMING';
  }
  // Controlability drops extremely fast when not stabilised.
  if (!contained) ctrl -= C.CTRL_DRAIN * 1.4;
  if (e.agit > 40) flags.split = true;
  return { agit, ctrl, state, flags };
}

function rule_listener(e, env, C) {
  // Count noise sources.
  let sources = 0;
  if (env.audio !== 'mute') sources += (env.audio === 'high' ? 2 : 1);
  if (env.vents) sources += 1;
  if (env.beep) sources += 1;
  if (env.alarm) sources += 2;
  const silent = sources === 0;
  const acked = env.sinceLog[e.id] < C.ACK_WINDOW;

  let agit = C.IDLE_CREEP * 0.6, ctrl = 0, state = 'LISTENING';
  const flags = { move: true };

  if (silent) {
    agit = -C.CALM_RATE;
    state = 'BLIND';
    if (acked) ctrl = C.CTRL_RECOVER;
  } else {
    agit = C.AGGR_RATE * (0.3 + sources * 0.28);
    ctrl -= C.CTRL_DRAIN * (0.5 + sources * 0.18);
    state = 'HUNTING';
    if (sources >= 2) flags.staticBoost = true;
  }
  return { agit, ctrl, state, flags };
}

const RULES = {
  doctor_insane: rule_doctor_insane,
  glass_man: rule_glass_man,
  sad_guy: rule_sad_guy,
  guilt: rule_guilt,
  locust: rule_locust,
  listener: rule_listener,
};
