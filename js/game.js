/* =====================================================================
 * THE OBSERVATION WING — main engine
 * state · simulation · rendering · UI
 * ===================================================================== */
(function () {
  'use strict';

  const C = CONFIG;
  const $ = (s) => document.querySelector(s);

  /* ----------------------------- DOM ----------------------------- */
  const monitor = $('#monitor');
  const mctx = monitor.getContext('2d');
  const MW = monitor.width, MH = monitor.height;

  const el = {
    clock: $('#clock'), shiftFill: $('#shiftFill'),
    tmfState: $('#tmfState'),
    osdCam: $('#osdCam'), osdName: $('#osdName'), osdLoc: $('#osdLoc'), osdState: $('#osdState'),
    breachText: $('#breachText'),
    roster: $('#rosterList'), strip: $('#cam-strip'),
    vLights: $('#vLights'), vAudio: $('#vAudio'), vVents: $('#vVents'), vTMF: $('#vTMF'),
    btnLights: $('#btnLights'), btnAudio: $('#btnAudio'), btnVents: $('#btnVents'),
    btnLog: $('#btnLog'), btnTMF: $('#btnTMF'), btnHandbook: $('#btnHandbook'),
    logFeed: $('#logFeed'),
    app: $('#app'), flash: $('#flash'), soundToggle: $('#soundToggle'),
    oTitle: $('#overlay-title'), oBook: $('#overlay-handbook'), oEnd: $('#overlay-end'),
    handbookText: $('#handbookText'),
    endTitle: $('#endTitle'), endMsg: $('#endMsg'), endStats: $('#endStats'),
  };

  /* ----------------------------- assets ----------------------------- */
  const images = {};
  MONSTERS.forEach((m) => { const i = new Image(); i.src = m.png; images[m.id] = i; });

  // Precomputed static-noise tiles (cheap to blit).
  const NOISE = [];
  (function makeNoise() {
    for (let n = 0; n < 6; n++) {
      const c = document.createElement('canvas');
      c.width = 120; c.height = 90;
      const x = c.getContext('2d');
      const im = x.createImageData(120, 90);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = Math.random() * 255;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
        im.data[i + 3] = Math.random() * 255;
      }
      x.putImageData(im, 0, 0);
      NOISE.push(c);
    }
  })();

  /* ----------------------------- state ----------------------------- */
  let G = null;

  function freshEntities() {
    return MONSTERS.map((def) => ({
      def, agit: rand(6, 16), ctrl: rand(78, 95),
      contained: false, state: 'DORMANT', flags: {},
    }));
  }

  function newGame() {
    G = {
      phase: 'playing', paused: false,
      elapsed: 0,
      controls: { lights: 'bright', audio: 'high', vents: false },
      activeIdx: 0,
      entities: freshEntities(),
      unseen: {}, onCam: {}, sinceLog: {},
      switchTimes: [],
      flicker: { active: false, t: 0, next: rand(5, 11) },
      beepUntil: -1,
      alarm: false,
      tmf: { state: 'ready', cd: 0 },
      tension: 0,
      result: null,
      driftSeed: Math.random() * 1000,
    };
    MONSTERS.forEach((m) => { G.unseen[m.id] = 0; G.onCam[m.id] = 0; G.sinceLog[m.id] = 999; });
    buildRoster();
    buildStrip();
    syncControlLabels();
    el.logFeed.innerHTML = '';
    sysLog('Shift started. Six entities online. Hold the wing until 06:00.', 'sys');
  }

  /* ----------------------------- helpers ----------------------------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return G.elapsed; }

  /* ----------------------------- environment ----------------------------- */
  function buildEnv(dt) {
    // maintain per-entity timers
    const viewedId = G.entities[G.activeIdx].def.id;
    MONSTERS.forEach((m) => {
      if (m.id === viewedId) { G.onCam[m.id] += dt; G.unseen[m.id] = 0; }
      else { G.onCam[m.id] = 0; G.unseen[m.id] += dt; }
      G.sinceLog[m.id] += dt;
    });
    // switch rate over a 4s window
    const t = now();
    G.switchTimes = G.switchTimes.filter((s) => t - s < 4);
    const switchRate = G.switchTimes.length / 4;

    return {
      lights: G.controls.lights,
      audio: G.controls.audio,
      vents: G.controls.vents,
      flicker: G.flicker.active,
      beep: now() < G.beepUntil,
      alarm: G.alarm,
      viewedId,
      switchRate,
      unseen: G.unseen, onCam: G.onCam, sinceLog: G.sinceLog,
      ramp: 1 + (G.elapsed / C.SHIFT_SECONDS) * C.LEARN_RAMP,
    };
  }

  /* ----------------------------- simulation ----------------------------- */
  function simulate(dt) {
    G.elapsed += dt;

    // light-flicker anomaly scheduler
    const fl = G.flicker;
    if (fl.active) { fl.t -= dt; if (fl.t <= 0) { fl.active = false; fl.next = rand(6, 14); } }
    else { fl.next -= dt; if (fl.next <= 0) { fl.active = true; fl.t = rand(0.8, 1.8); } }

    const env = buildEnv(dt);

    let anyCritical = false;
    let aliveThreats = 0, containedCount = 0;

    for (const e of G.entities) {
      if (e.contained) { containedCount++; continue; }
      aliveThreats++;
      const r = RULES[e.def.id](e, env, C);

      let agitRate = r.agit;
      if (agitRate > 0) agitRate *= env.ramp;           // they learn / grow bolder
      e.agit = clamp(e.agit + agitRate * dt, 0, 100);

      let ctrlRate = r.ctrl;
      e.ctrl = clamp(e.ctrl + ctrlRate * dt, 0, 100);

      // High agitation bleeds controlability.
      if (e.agit > C.HIGH_AGIT) e.ctrl = clamp(e.ctrl - ((e.agit - C.HIGH_AGIT) / 30) * 2 * dt, 0, 100);

      e.state = r.state;
      e.flags = r.flags;

      if (e.agit >= C.CRITICAL_AGIT) anyCritical = true;
      if (e.agit >= C.BREACH_AT) { breach(e); return; }
    }

    // facility alarm tracks any critical entity (this itself draws the Listener)
    if (anyCritical !== G.alarm) {
      G.alarm = anyCritical;
      AUDIO.setAlarm(anyCritical);
      if (anyCritical) sysLog('⚠ FACILITY ALARM — an entity is approaching breach.', 'bad');
    }

    // TMF cooldown
    if (G.tmf.state === 'cooldown') {
      G.tmf.cd -= dt;
      if (G.tmf.cd <= 0) { G.tmf.state = 'ready'; sysLog('TMF re-armed and standing by.', 'sys'); }
    }

    // tension drives the audio static bed
    const maxAgit = Math.max(0, ...G.entities.filter((e) => !e.contained).map((e) => e.agit));
    G.tension = maxAgit / 100;
    AUDIO.setTension(G.tension);

    // win conditions
    if (aliveThreats === 0 && containedCount === MONSTERS.length) { winGame('secured'); return; }
    if (G.elapsed >= C.SHIFT_SECONDS) { winGame('survived'); return; }
  }

  /* ----------------------------- rendering ----------------------------- */
  function drawFeed(ctx, w, h, e, opts) {
    opts = opts || {};
    const img = images[e.def.id];
    const agit = e.agit / 100;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);

    if (img.complete && img.naturalWidth) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const f = e.flags || {};
      // base zoom + behavioural approach
      let z = 1;
      let panY = 0;
      if (f.approach) z += 0.55 * agit;                 // Sad Guy / Glass Man lunge
      if (f.staring) { z += 0.6 * agit; panY = -ih * 0.12 * z; } // Doctor Insane to the face
      if (f.move) ctx.save();                            // Listener drift handled via pan
      const driftX = f.move ? Math.sin((now() + G.driftSeed) * 0.6) * w * 0.06 : 0;

      const sw = iw / z, sh = ih / z;
      let sx = (iw - sw) / 2;
      let sy = (ih - sh) / 2 + clamp(panY, -(ih - sh) / 2, (ih - sh) / 2);

      // jitter scales with agitation
      const j = (e.contained ? 0 : agit) * 6;
      const jx = (Math.random() - 0.5) * j + driftX;
      const jy = (Math.random() - 0.5) * j;

      // Guilt hallucination: chromatic ghost behind
      if (f.halluc) {
        ctx.globalAlpha = 0.4 + 0.3 * agit;
        ctx.drawImage(img, sx, sy, sw, sh, jx - 8 * agit, jy, w, h);
        ctx.globalAlpha = 1;
      }
      // Locust split copies
      if (f.split) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(img, sx, sy, sw, sh, jx - 14 * agit, jy + 6, w, h);
        ctx.drawImage(img, sx, sy, sw, sh, jx + 14 * agit, jy - 6, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(img, sx, sy, sw, sh, jx, jy, w, h);
      if (f.move) ctx.restore();

      // Glass Man "tap" — torn RGB slice at high agitation
      if (f.approach && agit > 0.55 && Math.random() < 0.4) {
        const sy2 = Math.random() * h * 0.8;
        const sh2 = 8 + Math.random() * 18;
        ctx.globalAlpha = 0.6;
        ctx.drawImage(monitor, 0, sy2, w, sh2, (Math.random() - 0.5) * 30, sy2, w, sh2);
        ctx.globalAlpha = 1;
      }
    }

    // ---- lighting tint ----
    const lights = G.controls.lights;
    if (lights === 'dim') paintRect(ctx, w, h, 'rgba(0,0,0,0.45)');
    else if (lights === 'stable') paintRect(ctx, w, h, 'rgba(10,20,30,0.12)');
    if (G.flicker.active && lights !== 'stable') {
      paintRect(ctx, w, h, Math.random() < 0.5 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.08)');
    }

    // ---- static ----
    const base = opts.thumb ? 0.05 : 0.06;
    const amt = clamp(base + agit * 0.5 + ((e.flags && e.flags.staticBoost) ? 0.18 : 0), 0, 0.85);
    const tile = NOISE[(Math.random() * NOISE.length) | 0];
    ctx.globalAlpha = amt;
    ctx.drawImage(tile, (Math.random() * 40) | 0, (Math.random() * 30) | 0, 80, 60, 0, 0, w, h);
    ctx.globalAlpha = 1;

    // ---- vignette ----
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    if (e.contained) { paintRect(ctx, w, h, 'rgba(0,30,15,0.35)'); }
  }

  function paintRect(ctx, w, h, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); }

  function render() {
    if (!G) return;
    const e = G.entities[G.activeIdx];
    drawFeed(mctx, MW, MH, e, {});

    // OSD
    el.osdCam.textContent = e.def.cam;
    el.osdName.textContent = e.def.name.toUpperCase();
    el.osdLoc.textContent = e.def.location;
    el.osdState.textContent = e.contained ? 'RE-CONTAINED' : e.state;

    // thumbnails
    G.entities.forEach((ent, i) => {
      const t = thumbs[i];
      drawFeed(t.ctx, t.c.width, t.c.height, ent, { thumb: true });
      const lvl = ent.contained ? 'safe' : ent.agit > C.CRITICAL_AGIT ? 'hot' : ent.agit > 45 ? 'mid' : 'ok';
      t.dot.className = 'dot' + (lvl === 'hot' ? ' hot' : lvl === 'mid' ? ' mid' : '');
      t.btn.classList.toggle('warn', !ent.contained && ent.agit > C.CRITICAL_AGIT);
      t.btn.classList.toggle('active', i === G.activeIdx);
      t.btn.classList.toggle('contained', ent.contained);
    });

    // roster meters
    G.entities.forEach((ent, i) => {
      const r = rosterRows[i];
      r.agit.style.width = ent.agit.toFixed(0) + '%';
      r.ctrl.style.width = ent.ctrl.toFixed(0) + '%';
      r.agitN.textContent = ent.agit.toFixed(0) + '%';
      r.ctrlN.textContent = ent.ctrl.toFixed(0) + '%';
      r.row.classList.toggle('active', i === G.activeIdx);
      r.row.classList.toggle('warn', !ent.contained && ent.agit > C.CRITICAL_AGIT);
      r.row.classList.toggle('contained', ent.contained);
      let tag = '';
      if (ent.contained) tag = 'RE-CONTAINED';
      else if (ent.ctrl <= C.TMF_THRESHOLD) tag = '◈ TMF-READY TARGET';
      else if (ent.agit > C.CRITICAL_AGIT) tag = '⚠ NEAR BREACH';
      r.tag.textContent = tag;
    });

    // header
    const mins = (G.elapsed / C.SHIFT_SECONDS) * C.IN_GAME_HOURS * 60;
    const hh = Math.floor(mins / 60), mm = Math.floor(mins % 60);
    el.clock.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    el.shiftFill.style.width = clamp((G.elapsed / C.SHIFT_SECONDS) * 100, 0, 100) + '%';

    // TMF status + arm hint
    const target = G.entities[G.activeIdx];
    const canTMF = G.tmf.state === 'ready' && !target.contained;
    if (G.tmf.state === 'cooldown') {
      el.tmfState.textContent = Math.ceil(G.tmf.cd) + 's';
      el.tmfState.className = 'tmf-state cooldown';
      el.vTMF.textContent = 'COOLDOWN';
    } else {
      el.tmfState.textContent = 'READY';
      el.tmfState.className = 'tmf-state ready';
      el.vTMF.textContent = canTMF && target.ctrl <= C.TMF_THRESHOLD ? '◈ TARGET' : '— ARMED';
    }
    el.btnTMF.classList.toggle('armed', canTMF && target.ctrl <= C.TMF_THRESHOLD);
    el.btnTMF.disabled = G.tmf.state !== 'ready';

    // breach alarm red wash on near-breach
    el.app.style.boxShadow = G.alarm ? 'inset 0 0 60px rgba(180,30,20,0.18)' : 'none';
  }

  /* ----------------------------- UI build ----------------------------- */
  const thumbs = [];
  const rosterRows = [];

  function buildStrip() {
    el.strip.innerHTML = ''; thumbs.length = 0;
    G.entities.forEach((ent, i) => {
      const btn = document.createElement('button');
      btn.className = 'cam-thumb';
      const c = document.createElement('canvas'); c.width = 120; c.height = 90;
      const label = document.createElement('span'); label.className = 'tlabel';
      label.textContent = ent.def.cam;
      const dot = document.createElement('span'); dot.className = 'dot';
      btn.append(c, label, dot);
      btn.addEventListener('click', () => setCam(i));
      el.strip.appendChild(btn);
      thumbs.push({ btn, c, ctx: c.getContext('2d'), dot });
    });
  }

  function buildRoster() {
    el.roster.innerHTML = ''; rosterRows.length = 0;
    G.entities.forEach((ent, i) => {
      const row = document.createElement('div'); row.className = 'ent';
      row.innerHTML =
        `<div class="ent-top"><span class="ent-name">${ent.def.name}</span>` +
        `<span class="ent-cam">${ent.def.cam} · ${ent.def.dangerLabel}</span></div>` +
        `<div class="meter"><div class="meter-label"><span>AGITATION</span><span class="agN">0%</span></div>` +
        `<div class="bar agit"><i></i></div></div>` +
        `<div class="meter"><div class="meter-label"><span>CONTROL</span><span class="ctN">0%</span></div>` +
        `<div class="bar ctl"><i></i></div></div>` +
        `<div class="ent-tag"></div>`;
      row.addEventListener('click', () => setCam(i));
      el.roster.appendChild(row);
      rosterRows.push({
        row,
        agit: row.querySelector('.bar.agit > i'),
        ctrl: row.querySelector('.bar.ctl > i'),
        agitN: row.querySelector('.agN'),
        ctrlN: row.querySelector('.ctN'),
        tag: row.querySelector('.ent-tag'),
      });
    });
  }

  /* ----------------------------- actions ----------------------------- */
  function setCam(i) {
    if (G.phase !== 'playing') return;
    if (i === G.activeIdx) return;
    G.activeIdx = i;
    G.switchTimes.push(now());
    AUDIO.beep();
    noiseBlip();
  }

  function cycleLights() {
    const order = ['bright', 'dim', 'stable'];
    G.controls.lights = order[(order.indexOf(G.controls.lights) + 1) % order.length];
    onControlChange();
    syncControlLabels();
  }
  function cycleAudio() {
    const order = ['high', 'low', 'mute'];
    G.controls.audio = order[(order.indexOf(G.controls.audio) + 1) % order.length];
    AUDIO.setAudioMode(G.controls.audio);
    onControlChange();
    syncControlLabels();
  }
  function toggleVents() {
    G.controls.vents = !G.controls.vents;
    onControlChange();
    syncControlLabels();
  }
  function onControlChange() { noiseBlip(); AUDIO.beep(); }
  function noiseBlip() { G.beepUntil = now() + 1.6; }   // counts as audible to the Listener

  function syncControlLabels() {
    el.vLights.textContent = G.controls.lights.toUpperCase();
    el.vAudio.textContent = G.controls.audio.toUpperCase();
    el.vVents.textContent = G.controls.vents ? 'OPEN' : 'CLOSED';
    el.btnVents.classList.toggle('act', G.controls.vents);
  }

  function doLog() {
    const e = G.entities[G.activeIdx];
    if (e.contained) { sysLog(`${e.def.name} is re-contained. Nothing to record.`, 'sys'); return; }
    G.sinceLog[e.def.id] = 0;                  // acknowledgment window
    e.ctrl = clamp(e.ctrl + 6, 0, 100);        // immediate control nudge
    AUDIO.beep(); noiseBlip();
    entityLog(e);
  }

  function deployTMF() {
    if (G.tmf.state !== 'ready') return;
    const e = G.entities[G.activeIdx];
    if (e.contained) { sysLog(`${e.def.name} is already re-contained.`, 'sys'); return; }
    G.tmf.state = 'cooldown'; G.tmf.cd = C.TMF_COOLDOWN;
    AUDIO.thud(160);

    if (e.ctrl <= C.TMF_THRESHOLD) {
      e.contained = true; e.agit = 6; e.ctrl = 88;
      bigFlash('TARGET NEUTRALIZED', true);
      sysLog(`TMF deployed on ${e.def.name}. Control ${e.ctrl.toFixed(0)}% — operation succeeded. Entity re-contained.`, 'good');
      if (G.alarm && !G.entities.some((x) => !x.contained && x.agit >= C.CRITICAL_AGIT)) {
        G.alarm = false; AUDIO.setAlarm(false);
      }
    } else {
      bigFlash('OPERATION FAILED', false);
      AUDIO.thud(90);
      sysLog(`TMF deployed on ${e.def.name} at ${e.ctrl.toFixed(0)}% control. Entity too aware. Force wiped out. "Operation Failed."`, 'bad');
      // the failed assault rattles it further
      e.agit = clamp(e.agit + 14, 0, 100);
    }
  }

  /* ----------------------------- logging ----------------------------- */
  function stamp() {
    const mins = (G.elapsed / C.SHIFT_SECONDS) * C.IN_GAME_HOURS * 60;
    const hh = Math.floor(mins / 60), mm = Math.floor(mins % 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  function pushLine(text, cls) {
    const d = document.createElement('div');
    d.className = 'l' + (cls ? ' ' + cls : '');
    d.innerHTML = `<span class="t">[${stamp()}]</span> ${text}`;
    el.logFeed.appendChild(d);
    while (el.logFeed.childNodes.length > 60) el.logFeed.removeChild(el.logFeed.firstChild);
    el.logFeed.scrollTop = el.logFeed.scrollHeight;
  }
  function sysLog(t, cls) { pushLine(t, cls || 'sys'); }

  const LOGTEXT = {
    doctor_insane: {
      calm: ['Subject motionless in the corner. Cone tilted away from the lens.',
             'Posture relaxed. Limbs folded. No interference on the feed.'],
      stir: ['Subject has shifted posture between frames. Static blooming on CAM-01.',
             'Camera switching is agitating it. Cone now oriented toward the lens.'],
      hot: ['IT IS STARING INTO THE CAMERA. Dim the lights. Stop switching feeds.'],
    },
    glass_man: {
      calm: ['Mask-figure still against the wallpaper. Audio quiet.', 'No tapping. Limbs at rest.'],
      stir: ['Sharp audio spike logged. Figure drifting toward the lens.', 'Screen tapping detected — UI distortion rising.'],
      hot: ['IT IS AT THE GLASS. Cut the audio gain. Stop staring at it.'],
    },
    sad_guy: {
      calm: ['Subject inert in the washroom. Ribs unmoving.', 'Looking away has settled it. No advance.'],
      stir: ['Continuous observation is disturbing it. It has taken a step.', 'Agitation climbing under direct watch. Look away.'],
      hot: ['IT IS ALMOST AT THE DRAIN BENEATH THE LENS. Look away NOW.'],
    },
    guilt: {
      calm: ['Silhouette acknowledged. Static settling within the outline.', 'It mirrors my cursor calmly. Acknowledged.'],
      stir: ['Being ignored. The outline is filling with crawling static.', 'Hallucination overlay forming. It wants to be seen.'],
      hot: ['THE FEED IS BLEEDING. Acknowledge it before it forgets containment.'],
    },
    locust: {
      calm: ['Swarm settled in the vent shaft. Lights stable, vents drawing air.', 'Insect-shadows dormant. Airflow holding them down.'],
      stir: ['Swarm splitting. Light instability is feeding it. Stabilize and vent.', 'Crawling mass spreading across the frame.'],
      hot: ['SWARM FLOODING THE FEED. Stabilize lights and OPEN the vents NOW.'],
    },
    listener: {
      calm: ['Subject blind in the dark. No sound, no movement.', 'Total silence. It cannot find its bearing.'],
      stir: ['It hears the wing. Mute non-essential audio. Close the vents.', 'Drawn by noise — alarms and beeps. Silence the floor.'],
      hot: ['IT IS TRACKING THE NOISE TO THE LENS. KILL ALL SOUND.'],
    },
  };
  function entityLog(e) {
    const set = LOGTEXT[e.def.id];
    let bucket = 'calm', cls = 'good';
    if (e.agit > C.CRITICAL_AGIT) { bucket = 'hot'; cls = 'bad'; }
    else if (e.agit > 40) { bucket = 'stir'; cls = ''; }
    const arr = set[bucket];
    const line = arr[(Math.random() * arr.length) | 0];
    pushLine(`<b>${e.def.cam} ${e.def.name}:</b> ${line}`, cls);
  }

  /* ----------------------------- end states ----------------------------- */
  function bigFlash(text, good) {
    el.flash.textContent = text;
    el.flash.className = 'flash show' + (good ? ' good' : '');
    el.flash.addEventListener('animationend', () => { el.flash.className = 'flash'; }, { once: true });
  }

  function breach(e) {
    G.phase = 'ended'; G.paused = true; G.result = 'lost';
    AUDIO.setAlarm(false); AUDIO.thud(70); AUDIO.setTension(1);
    el.app.classList.add('shake');
    setTimeout(() => el.app.classList.remove('shake'), 600);
    el.breachText.textContent = 'CONTAINMENT BREACH';
    el.breachText.style.opacity = '1';
    sysLog(`✖ ${e.def.name} BREACHED CONTAINMENT.`, 'bad');
    setTimeout(() => endScreen(false, e), 1400);
  }

  function winGame(kind) {
    G.phase = 'ended'; G.paused = true; G.result = 'won';
    AUDIO.setAlarm(false);
    endScreen(true, null, kind);
  }

  function endScreen(won, e, kind) {
    el.endTitle.textContent = won ? 'WING SECURED' : 'FACILITY LOST';
    el.endTitle.className = won ? 'win' : 'lost';
    if (won) {
      el.endMsg.textContent = kind === 'secured'
        ? 'Every entity re-contained. The wing is yours.'
        : 'You held the wing until 06:00. Shift complete.';
    } else {
      el.endMsg.textContent = 'You were overrun. Facility lost.';
    }
    const contained = G.entities.filter((x) => x.contained).length;
    const survivedMin = Math.floor((G.elapsed / C.SHIFT_SECONDS) * C.IN_GAME_HOURS * 60);
    const stable = G.entities.filter((x) => !x.contained && x.agit < 40).length;
    el.endStats.innerHTML =
      `<li>Time held: <b>${Math.floor(survivedMin / 60)}h ${survivedMin % 60}m</b> of the shift</li>` +
      `<li>Entities re-contained by TMF: <b>${contained} / ${MONSTERS.length}</b></li>` +
      (won ? `<li>Entities still stable at clock-out: <b>${stable}</b></li>`
           : `<li>Lost to: <b>${e ? e.def.name : 'containment breach'}</b></li>`);
    el.oEnd.classList.add('show');
  }

  /* ----------------------------- loop ----------------------------- */
  let last = performance.now();
  function frame(t) {
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t;
    if (G && G.phase === 'playing' && !G.paused) simulate(dt);
    if (G) render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ----------------------------- wiring ----------------------------- */
  function start() {
    AUDIO.init();
    AUDIO.setMuted(AUDIO.muted);
    newGame();
    AUDIO.setAudioMode(G.controls.audio);
    el.oTitle.classList.remove('show');
  }

  el.handbookText.textContent = HANDBOOK;
  $('#btnStart').addEventListener('click', start);
  $('#btnReadFirst').addEventListener('click', () => el.oBook.classList.add('show'));
  $('#btnCloseBook').addEventListener('click', () => {
    el.oBook.classList.remove('show');
    if (G && G.phase === 'playing') G.paused = false;
  });
  el.btnHandbook.addEventListener('click', () => {
    if (G && G.phase === 'playing') G.paused = true;
    el.oBook.classList.add('show');
  });
  $('#btnRestart').addEventListener('click', () => {
    el.oEnd.classList.remove('show');
    el.breachText.style.opacity = '0';
    newGame();
    AUDIO.setAudioMode(G.controls.audio);
  });

  el.btnLights.addEventListener('click', () => G && G.phase === 'playing' && cycleLights());
  el.btnAudio.addEventListener('click', () => G && G.phase === 'playing' && cycleAudio());
  el.btnVents.addEventListener('click', () => G && G.phase === 'playing' && toggleVents());
  el.btnLog.addEventListener('click', () => G && G.phase === 'playing' && doLog());
  el.btnTMF.addEventListener('click', () => G && G.phase === 'playing' && deployTMF());

  el.soundToggle.addEventListener('click', () => {
    AUDIO.init();
    AUDIO.setMuted(!AUDIO.muted);
    el.soundToggle.textContent = AUDIO.muted ? '🔇' : '🔊';
  });

  // keyboard shortcuts
  window.addEventListener('keydown', (ev) => {
    if (!G || G.phase !== 'playing') return;
    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '6') setCam(+k - 1);
    else if (k === 'l') cycleLights();
    else if (k === 'a') cycleAudio();
    else if (k === 'v') toggleVents();
    else if (k === ' ') { ev.preventDefault(); doLog(); }
    else if (k === 't') deployTMF();
    else if (k === 'h') { G.paused = true; el.oBook.classList.add('show'); }
  });
})();
