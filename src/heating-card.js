/**
 * glowstat-heating-card: whole-house heating card. It reads only the SmartHeatZones overview entity
 * (`sensor.smartheatzones_overview`, contract schema 1): the boiler with today's counters and one row
 * per zone with its distance to the target, the source chip and the reason for its state.
 */

/** How long loaded history stays fresh (ms), and the retry delay after a failed request. */
const GS_HEAT_REFRESH_MS = 5 * 60 * 1000;
const GS_HEAT_RETRY_MS = 60 * 1000;

/** Newest overview contract this card understands. */
const GS_HEAT_SCHEMA = 1;

Object.assign(GS_I18N.en, {
  h_title: 'Heating', h_entity: 'Overview sensor (SmartHeatZones)',
  h_boiler_on: 'Boiler running', h_boiler_off: 'Boiler off', h_since: 'since {t}', h_held_by: 'held by',
  h_starts: 'starts', h_runtime: 'runtime', h_afterheat_joins: 'afterheat', h_counters_since: 'counting since {t}',
  h_boiler_failed: 'Boiler command failed', h_chip_afterheat: 'afterheat',
  h_src_backup: 'backup sensor', h_src_limp: 'emergency cycle',
  h_next: 'Next: {temp}° at {at}', h_unavailable: 'Overview not available', h_schema_new: 'The SmartHeatZones data (schema {n}) is newer than this card: update GlowStat.',
  h_other: 'other sensors',
  show_timeline: 'Show timelines', show_eta: 'Show time to target', show_actions: 'Show quick actions',
  r_needs_heat: 'Cold – needs heat', r_holding: 'Heating until {off_above}°',
  r_afterheat: 'Riding along on the running boiler', r_in_band: 'Idle – heats below {on_below}°, target {target}°',
  r_target_reached: 'Target {target}° reached', r_door_open: 'Door or window open', r_hvac_off: 'Switched off',
  r_no_reading: 'No temperature reading', r_overheat: 'Overheat protection',
  r_limp_heating: 'Emergency cycle – heating now', r_limp_waiting: 'Emergency cycle – next heating in {next_in_min} min',
  r_limp_waiting_none: 'Emergency cycle – waiting',
  h_eta: '~{n} min to target', h_timeline: 'heating periods',
  h_all_away: 'All away', h_all_eco: 'All eco', h_group_ok: '{p} {t}/{t} ok', h_group_bad: '{p}: {b} of {t} silent',
  h_set_failed: 'Could not change the climate setting',
});
Object.assign(GS_I18N.hu, {
  h_title: 'Fűtés', h_entity: 'Áttekintő szenzor (SmartHeatZones)',
  h_boiler_on: 'A kazán megy', h_boiler_off: 'A kazán áll', h_since: '{t} óta', h_held_by: 'tartja',
  h_starts: 'indítás', h_runtime: 'üzemidő', h_afterheat_joins: 'utánfűtés', h_counters_since: 'számlálás kezdete: {t}',
  h_boiler_failed: 'A kazánparancs nem sikerült', h_chip_afterheat: 'utánfűtés',
  h_src_backup: 'tartalék érzékelő', h_src_limp: 'vészüzem',
  h_next: 'Következő: {temp}° ekkor: {at}', h_unavailable: 'Az áttekintés nem elérhető', h_schema_new: 'A SmartHeatZones adat (séma: {n}) újabb, mint a kártya: frissítsd a GlowStatot.',
  h_other: 'egyéb érzékelők',
  show_timeline: 'Idővonalak megjelenítése', show_eta: 'Cél eléréséig hátralévő idő', show_actions: 'Gyorsműveletek megjelenítése',
  r_needs_heat: 'Hideg – fűtésre szorul', r_holding: 'Fűt {off_above}°-ig',
  r_afterheat: 'Rátapad a már működő kazánra', r_in_band: 'Pihen – {on_below}° alatt fűt, cél {target}°',
  r_target_reached: 'Cél ({target}°) elérve', r_door_open: 'Ajtó vagy ablak nyitva', r_hvac_off: 'Kikapcsolva',
  r_no_reading: 'Nincs hőmérséklet-adat', r_overheat: 'Túlmelegedés-védelem',
  r_limp_heating: 'Vészüzem – most fűt', r_limp_waiting: 'Vészüzem – következő fűtés {next_in_min} perc múlva',
  r_limp_waiting_none: 'Vészüzem – várakozik',
  h_eta: '~{n} perc a célig', h_timeline: 'fűtési időszakok',
  h_all_away: 'Mind távol', h_all_eco: 'Mind eco', h_group_ok: '{p} {t}/{t} rendben', h_group_bad: '{p}: {b}/{t} néma',
  h_set_failed: 'A beállítás módosítása nem sikerült',
});

/** A temperature without a trailing ".0" (21 -> "21", 20.5 -> "20.5"), in the card language. */
function gsHeatDeg(L, value) {
  const v = Number(value);
  return gsNum(L, v, v % 1 ? 1 : 0);
}

/**
 * Translated reason of a zone. The reason is {code, ...params}; an unknown code is shown as is,
 * so a newer integration never produces an empty line.
 */
function gsHeatReason(L, reason) {
  if (!reason || !reason.code) return '';
  let key = 'r_' + reason.code;
  if (reason.code === 'limp_waiting' && (reason.next_in_min === null || reason.next_in_min === undefined)) key = 'r_limp_waiting_none';
  const template = gsT(L, key);
  if (template === key) return String(reason.code);
  return template.replace(/\{(\w+)\}/g, (m, name) => (
    reason[name] === undefined || reason[name] === null ? '' : (name === 'next_in_min' ? String(reason[name]) : gsHeatDeg(L, reason[name]))
  ));
}

/** Local "HH:MM" of an ISO time ('' for an invalid one). */
function gsHeatClock(L, iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString(L.language, { hour: '2-digit', minute: '2-digit' });
}

/** "1 h 30 min" / "12 min" from seconds. */
function gsHeatDuration(seconds) {
  const m = Math.floor(Math.max(0, Number(seconds) || 0) / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/**
 * Heating periods inside [from, to] (ms) from a history of {state: 'on'|'off', last_changed}.
 * The first entry may start before `from` (the history request returns the state at its start).
 * @returns {Array<{start: number, end: number, on: boolean}>}
 */
function gsHeatSegments(history, from, to) {
  const pts = (history || [])
    .map((h) => ({ t: Date.parse(h.last_changed), on: h.state === 'on' }))
    .filter((p) => !isNaN(p.t))
    .sort((a, b) => a.t - b.t);
  const out = [];
  pts.forEach((p, i) => {
    const start = Math.max(from, p.t);
    const end = Math.min(to, i + 1 < pts.length ? pts[i + 1].t : to);
    if (end > start) out.push({ start, end, on: p.on });
  });
  return out;
}

/**
 * Minutes until `target` is reached, from the last 60 minutes of a sensor history, or null when
 * the trend is not clear: needs at least 6 points over at least 20 minutes, a slope between 0.2
 * and 6 °C/h (least squares), a current value below the target and a result of at most 480 minutes.
 * @param {Array<{t: number, v: number}>} points Sensor history (t in ms).
 */
function gsEta(points, target, now) {
  const pts = (points || [])
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.t >= now - 3600000 && p.t <= now)
    .sort((a, b) => a.t - b.t);
  if (pts.length < 6 || pts[pts.length - 1].t - pts[0].t < 20 * 60000) return null;
  const last = pts[pts.length - 1];
  if (!(last.v < target)) return null;
  const t0 = pts[0].t;
  const n = pts.length;
  let sx = 0; let sy = 0; let sxy = 0; let sxx = 0;
  pts.forEach((p) => {
    const x = (p.t - t0) / 3600000;
    sx += x; sy += p.v; sxy += x * p.v; sxx += x * x;
  });
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const slope = (n * sxy - sx * sy) / denom; // °C per hour
  if (!(slope >= 0.2 && slope <= 6)) return null;
  const minutes = Math.round(((target - last.v) / slope) * 60);
  return minutes > 0 && minutes <= 480 ? minutes : null;
}

const GS_HEAT_CSS = `
  :host { display: block; }
  ha-card { display: block; overflow: hidden; container-type: inline-size; }
  .wrap { padding: 12px; display: grid; gap: 10px; }
  .boiler { display: grid; gap: 2px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--divider-color); }
  .boiler.on { border-color: rgba(255,112,67,0.6); background: rgba(255,112,67,0.10); }
  .boiler.fault { border-color: rgb(239,83,80); background: rgba(239,83,80,0.12); }
  .bstate { font-weight: 600; font-size: 15px; }
  .bsince, .bheld, .bcount, .bcsince { font-size: 12px; color: var(--secondary-text-color); }
  .bfail { font-size: 12px; font-weight: 600; color: rgb(239,83,80); }
  .zone { display: grid; gap: 4px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--divider-color); }
  .zone.warn { border-color: rgba(255,174,0,0.7); }
  .zone.fault { border-color: rgb(239,83,80); background: rgba(239,83,80,0.10); }
  .zone.flash { animation: heatflash 1s ease-in-out 6; }
  @keyframes heatflash { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 12px 2px rgba(239,83,80,0.7); } }
  @media (prefers-reduced-motion: reduce) { .zone.flash { animation: none; box-shadow: 0 0 0 2px rgb(239,83,80); } }
  .zhead { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .zname { font-weight: 600; cursor: pointer; }
  .ztemp { margin-left: auto; font-weight: 500; }
  .chip { font-size: 11px; padding: 1px 8px; border-radius: 10px; background: color-mix(in srgb, var(--primary-color) 20%, transparent); }
  .zone.warn .chip { background: rgba(255,174,0,0.25); }
  .bar { position: relative; height: 8px; border-radius: 4px; background: var(--divider-color); }
  .bar .band { position: absolute; top: 0; bottom: 0; background: rgba(0,168,28,0.35); border-radius: 4px; }
  .bar .t-on, .bar .t-off { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--secondary-text-color); }
  .bar .t-cur { position: absolute; top: -3px; width: 10px; height: 14px; margin-left: -5px; border-radius: 5px; background: var(--primary-color); }
  .tl { position: relative; height: 6px; border-radius: 3px; background: var(--divider-color); overflow: hidden; }
  .tl .seg { position: absolute; top: 0; bottom: 0; background: rgb(255,112,67); }
  .eta { font-size: 12px; font-weight: 500; }
  .health { display: flex; flex-wrap: wrap; gap: 6px; }
  .hgroup { font-size: 12px; padding: 2px 10px; border-radius: 10px; border: 1px solid var(--divider-color); color: var(--secondary-text-color); }
  .hgroup.bad { border-color: rgba(255,174,0,0.8); color: var(--primary-text-color); background: rgba(255,174,0,0.15); }
  .actions { display: flex; gap: 8px; }
  .act { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 14px; cursor: pointer; user-select: none; font-size: 13px; border: 1px solid var(--divider-color); }
  .act:active { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .act ha-icon { --mdc-icon-size: 20px; }
  .reason { font-size: 12px; color: var(--secondary-text-color); }
  .next { font-size: 12px; color: var(--secondary-text-color); }
  .hint { padding: 10px; font-size: 13px; color: var(--secondary-text-color); }
`;

class GlowStatHeatingCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = '';
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
  }

  connectedCallback() {
    this._subscribe();
  }

  /** Stop listening for fail-safe events (a subscription that is still pending is dropped when it resolves). */
  disconnectedCallback() {
    this._subToken = null;
    this._subState = null;
    const unsub = this._unsub;
    this._unsub = null;
    if (typeof unsub === 'function') this._runUnsub(unsub);
  }

  _runUnsub(unsub) {
    try {
      unsub();
    } catch (e) {
      console.error('GlowStat: cannot stop the event subscription', e);
    }
  }

  /**
   * Subscribe once to the smartheatzones_failsafe event (needs an admin user; without one the
   * subscription is rejected, which is warned about once and only costs the flash).
   */
  _subscribe() {
    const conn = this._hass && this._hass.connection;
    if (this._subState || !this.isConnected || !conn || typeof conn.subscribeEvents !== 'function') return;
    this._subState = 'pending';
    const token = {};
    this._subToken = token;
    let request;
    try {
      request = Promise.resolve(conn.subscribeEvents((ev) => this._onFailsafe(ev), 'smartheatzones_failsafe'));
    } catch (e) {
      request = Promise.reject(e);
    }
    request.then((unsub) => {
      if (this._subToken !== token) this._runUnsub(unsub);
      else { this._unsub = unsub; this._subState = 'active'; }
    }).catch((e) => {
      if (this._subToken !== token) return;
      this._subState = 'failed';
      console.warn('GlowStat: the fail-safe event subscription was refused (admin users only), the zone flash is off', e);
    });
  }

  /** Flash the row of the zone the event names for 6 seconds. */
  _onFailsafe(ev) {
    const zone = ev && ev.data && ev.data.zone;
    if (!zone) return;
    this._flash = String(zone);
    this._sig = '';
    this._paint();
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this._flash = null;
      this._sig = '';
      this._paint();
    }, 6000);
  }

  static getConfigElement() {
    return document.createElement('glowstat-heating-card-editor');
  }

  static getStubConfig() {
    return { entity: 'sensor.smartheatzones_overview' };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error('GlowStat: "entity" is required');
    this._config = { ...config };
    this._sig = '';
    this._hist = {};
    this._paint();
    this._loadHistory();
    this._subscribe();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._paint();
    }
    this._loadHistory();
    this._subscribe();
  }

  getCardSize() {
    const st = this._hass && this._config && this._hass.states[this._config.entity];
    return 2 + ((st && st.attributes && st.attributes.zones) || []).length;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 6 };
  }

  _signature() {
    if (!this._hass || !this._config) return '';
    const st = this._hass.states[this._config.entity];
    return [st ? st.state + JSON.stringify(st.attributes) : '∅', gsLangObj(this._hass, this._config).language].join('|');
  }

  /** History keys the card needs now: [{key, entity, kind, ms}]. */
  _wanted() {
    const cfg = this._config;
    const st = this._hass && this._hass.states[cfg.entity];
    const a = st && st.attributes;
    if (!a || !Array.isArray(a.zones) || !a.boiler) return [];
    const hours = Math.min(72, Math.max(1, Number(cfg.history_hours) || 24));
    const want = [];
    if (cfg.show_timeline !== false) {
      a.zones.forEach((z) => want.push({ key: 'z|' + z.entity_id, entity: z.entity_id, kind: 'zone', ms: hours * 3600000 }));
      if (a.boiler.entity) want.push({ key: 'b|' + a.boiler.entity, entity: a.boiler.entity, kind: 'boiler', ms: hours * 3600000 });
    }
    if (cfg.show_eta !== false) {
      a.zones.filter((z) => z.hvac_action === 'heating' && z.sensor_entity)
        .forEach((z) => want.push({ key: 's|' + z.sensor_entity, entity: z.sensor_entity, kind: 'sensor', ms: 70 * 60000 }));
    }
    return want;
  }

  /** Request the history that is missing or older than GS_HEAT_REFRESH_MS (failed ones are retried after a minute). */
  _loadHistory() {
    if (!this._hass || !this._config) return;
    const hass = this._hass;
    this._hist = this._hist || {};
    this._wanted().forEach((w) => {
      const entry = this._hist[w.key];
      if (entry && (entry.busy || Date.now() - entry.t < (entry.err ? GS_HEAT_RETRY_MS : GS_HEAT_REFRESH_MS))) return;
      const mine = { ...(entry || {}), busy: true, t: Date.now(), err: false };
      this._hist[w.key] = mine;
      const end = Date.now();
      const start = end - w.ms;
      const url = 'history/period/' + new Date(start).toISOString()
        + '?filter_entity_id=' + encodeURIComponent(w.entity)
        + '&end_time=' + encodeURIComponent(new Date(end).toISOString())
        + (w.kind === 'zone' ? '&significant_changes_only=0' : '&minimal_response&no_attributes&significant_changes_only=0');
      Promise.resolve().then(() => hass.callApi('GET', url)).then((r) => {
        const rows = (r && r[0]) || [];
        const when = (p) => p.last_changed || p.last_updated;
        if (w.kind === 'zone') mine.data = rows.map((p) => ({ state: p.attributes && p.attributes.hvac_action === 'heating' ? 'on' : 'off', last_changed: when(p) }));
        else if (w.kind === 'boiler') mine.data = rows.map((p) => ({ state: p.state, last_changed: when(p) }));
        else mine.data = rows.map((p) => ({ t: Date.parse(when(p)), v: parseFloat(p.state) })).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
        mine.from = start;
        mine.to = end;
      }).catch((e) => {
        mine.err = true;
        console.error('GlowStat: heating history request failed for ' + w.entity, e);
      }).finally(() => {
        mine.busy = false;
        mine.t = Date.now();
        this._sig = '';
        this._paint();
      });
    });
  }

  /** Bar of the heating periods for a history key, or '' without history. */
  _timelineHtml(key, L) {
    const entry = this._hist && this._hist[key];
    if (!entry || !entry.data || !entry.data.length) return '';
    const span = entry.to - entry.from;
    const segs = gsHeatSegments(entry.data, entry.from, entry.to).filter((g) => g.on).map((g) => (
      `<div class="seg" style="left:${(((g.start - entry.from) / span) * 100).toFixed(2)}%;width:${(((g.end - g.start) / span) * 100).toFixed(2)}%"></div>`
    ));
    return `<div class="tl" role="img" aria-label="${gsEsc(gsT(L, 'h_timeline'))}">${segs.join('')}</div>`;
  }

  /** "~25 min to target" for a heating zone with a clear rising trend, else ''. */
  _etaHtml(z, L) {
    if (this._config.show_eta === false || z.hvac_action !== 'heating' || z.adjusted_target === null || z.adjusted_target === undefined) return '';
    const entry = this._hist && this._hist['s|' + z.sensor_entity];
    if (!entry || !entry.data) return '';
    const minutes = gsEta(entry.data, Number(z.adjusted_target), Date.now());
    return minutes === null ? '' : `<div class="eta">${gsEsc(gsT(L, 'h_eta').replace('{n}', String(minutes)))}</div>`;
  }

  /** Rows of the zones. */
  _zoneHtml(z, L, unit) {
    const num = (v) => (v === null || v === undefined ? '–' : gsNum(L, Number(v), 1));
    const cls = ['zone'];
    if (this._flash === z.name) cls.push('flash');
    if (Array.isArray(z.relay_fault) && z.relay_fault.length) cls.push('fault');
    else if (z.sensor_source === 'backup' || z.sensor_source === 'none' || z.sensor_fault) cls.push('warn');
    let chip = '';
    if (z.joined) chip = gsT(L, 'h_chip_afterheat');
    else if (z.sensor_source === 'backup') chip = gsT(L, 'h_src_backup');
    else if (z.sensor_source === 'none') chip = gsT(L, 'h_src_limp');
    const values = [z.on_below, z.off_above, z.target, z.current].filter((v) => v !== null && v !== undefined).map(Number);
    const lo = Math.min(...values) - 1.5;
    const hi = Math.max(...values) + 1.5;
    const pos = (v) => Math.max(0, Math.min(100, ((Number(v) - lo) / (hi - lo)) * 100)).toFixed(1);
    const hasBand = z.on_below !== null && z.on_below !== undefined && z.off_above !== null && z.off_above !== undefined;
    const bar = `<div class="bar">${hasBand ? `<div class="band" style="left:${pos(z.on_below)}%;width:${(pos(z.off_above) - pos(z.on_below)).toFixed(1)}%"></div><div class="t-on" style="left:${pos(z.on_below)}%"></div><div class="t-off" style="left:${pos(z.off_above)}%"></div>` : ''}${z.current !== null && z.current !== undefined ? `<div class="t-cur" style="left:${pos(z.current)}%"></div>` : ''}</div>`;
    const next = z.next_change
      ? `<div class="next">${gsEsc(gsT(L, 'h_next').replace('{temp}', gsHeatDeg(L, z.next_change.temp)).replace('{at}', z.next_change.at))}</div>` : '';
    return `<div class="${cls.join(' ')}" data-name="${gsEsc(z.name)}" data-entity="${gsEsc(z.entity_id)}">
      <div class="zhead"><span class="zname" data-more="1" role="button" tabindex="0">${gsEsc(z.name)}</span>${chip ? `<span class="chip">${gsEsc(chip)}</span>` : ''}
        <span class="ztemp">${num(z.current)} → ${num(z.adjusted_target ?? z.target)} ${gsEsc(unit)}</span></div>
      ${bar}<div class="reason">${gsEsc(gsHeatReason(L, z.reason))}</div>${this._etaHtml(z, L)}${next}${this._timelineHtml('z|' + z.entity_id, L)}</div>`;
  }

  /** One chip per sensor group: "zha 5/5 ok" or "zha: 2 of 5 silent" (amber). */
  _healthHtml(groups, L) {
    const keys = Object.keys(groups || {}).sort();
    if (!keys.length) return '';
    const chips = keys.map((key) => {
      const g = groups[key] || {};
      const platform = key === 'unregistered' ? gsT(L, 'h_other') : key.split('/')[0];
      const bad = Number(g.bad) > 0;
      const label = gsT(L, bad ? 'h_group_bad' : 'h_group_ok')
        .replace(/\{p\}/g, platform).replace(/\{t\}/g, String(g.total)).replace(/\{b\}/g, String(g.bad));
      return `<span class="hgroup${bad ? ' bad' : ''}">${gsEsc(label)}</span>`;
    });
    return `<div class="health">${chips.join('')}</div>`;
  }

  /** Quick actions for all zones. */
  _actionsHtml(L) {
    if (this._config.show_actions === false) return '';
    return `<div class="actions">
      <div class="act" role="button" tabindex="0" data-preset="away"><ha-icon icon="mdi:car"></ha-icon>${gsEsc(gsT(L, 'h_all_away'))}</div>
      <div class="act" role="button" tabindex="0" data-preset="eco"><ha-icon icon="mdi:leaf"></ha-icon>${gsEsc(gsT(L, 'h_all_eco'))}</div></div>`;
  }

  /** Set a preset on every zone; every call is made and the zones that failed are named. */
  _setAll(preset) {
    const st = this._hass.states[this._config.entity];
    const zones = (st && st.attributes && st.attributes.zones) || [];
    const hass = this._hass;
    Promise.allSettled(zones.map((z) => Promise.resolve().then(() => hass.callService('climate', 'set_preset_mode', { entity_id: z.entity_id, preset_mode: preset }))))
      .then((results) => {
        const failed = zones.filter((z, i) => results[i].status === 'rejected');
        if (!failed.length) return;
        failed.forEach((z) => console.error('GlowStat: climate.set_preset_mode failed for ' + z.entity_id, results[zones.indexOf(z)].reason));
        gsFire(this, 'hass-notification', {
          message: gsT(gsLangObj(this._hass, this._config), 'h_set_failed') + ' (' + failed.map((z) => z.name).join(', ') + ')',
        });
      });
  }

  /** Boiler header. */
  _boilerHtml(b, L) {
    const lines = [`<div class="bstate">${gsEsc(gsT(L, b.running ? 'h_boiler_on' : 'h_boiler_off'))}</div>`];
    if (b.running && b.since) lines.push(`<div class="bsince">${gsEsc(gsT(L, 'h_since').replace('{t}', gsHeatClock(L, b.since)))}</div>`);
    const held = [...(b.held_by || []), ...(b.afterheat_zones || []).map((n) => `${n} (${gsT(L, 'h_chip_afterheat')})`)];
    if (held.length) lines.push(`<div class="bheld">${gsEsc(gsT(L, 'h_held_by'))}: ${gsEsc(held.join(', '))}</div>`);
    const boilerTl = b.entity ? this._timelineHtml('b|' + b.entity, L) : '';
    lines.push(`<div class="bcount">${gsEsc(`${b.starts_today ?? 0} ${gsT(L, 'h_starts')} · ${gsHeatDuration(b.runtime_today_s)} · ${b.afterheat_joins_today ?? 0} ${gsT(L, 'h_afterheat_joins')}`)}</div>`);
    const cs = new Date(b.counters_since);
    if (!isNaN(cs) && (cs.getHours() || cs.getMinutes() || cs.getSeconds())) {
      lines.push(`<div class="bcsince">${gsEsc(gsT(L, 'h_counters_since').replace('{t}', gsHeatClock(L, b.counters_since)))}</div>`);
    }
    if (b.failed_action) lines.push(`<div class="bfail">⚠ ${gsEsc(gsT(L, 'h_boiler_failed'))}</div>`);
    return `<div class="boiler${b.running ? ' on' : ''}${b.failed_action ? ' fault' : ''}">${lines.join('')}${boilerTl}</div>`;
  }

  _paint() {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const L = gsLangObj(hass, cfg);
    const shell = (inner) => gsSetHtml(this.shadowRoot, `<style>${GS_HEAT_CSS}</style><ha-card>${inner}</ha-card>`);
    const st = hass.states[cfg.entity];
    if (!st) return shell(`<div class="hint">${gsEsc(cfg.entity)}: ${gsEsc(gsT(L, 'no_data'))}</div>`);
    const a = st.attributes || {};
    if (st.state === 'unavailable' || !a.boiler || !Array.isArray(a.zones)) {
      return shell(`<div class="hint">${gsEsc(gsT(L, 'h_unavailable'))}</div>`);
    }
    const unit = hass.config?.unit_system?.temperature || '°C';
    const hint = Number(a.schema) > GS_HEAT_SCHEMA
      ? `<div class="hint">${gsEsc(gsT(L, 'h_schema_new').replace('{n}', String(a.schema)))}</div>` : '';
    shell(`<div class="wrap">${hint}${this._boilerHtml(a.boiler, L)}${a.zones.map((z) => this._zoneHtml(z, L, unit)).join('')}${this._healthHtml(a.health && a.health.groups, L)}${this._actionsHtml(L)}</div>`);
  }

  _onClick(ev) {
    const path = ev.composedPath();
    const action = path.find((n) => n.dataset && n.dataset.preset);
    if (action) {
      this._setAll(action.dataset.preset);
      return;
    }
    const el = path.find((n) => n.dataset && n.dataset.more);
    if (!el) return;
    const row = el.closest('.zone');
    if (row) gsFire(this, 'hass-more-info', { entityId: row.dataset.entity });
  }
}

/** GUI editor for the heating card. */
class GlowStatHeatingCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _schema() {
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'sensor' } } },
      { name: 'history_hours', selector: { number: { min: 1, max: 72, mode: 'box' } } },
      { name: 'show_timeline', selector: { boolean: {} } },
      { name: 'show_eta', selector: { boolean: {} } },
      { name: 'show_actions', selector: { boolean: {} } },
      gsLanguageField(this._hass),
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name === 'entity' ? 'h_entity' : s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const next = { ...this._config, ...ev.detail.value };
        Object.keys(next).forEach((k) => {
          if (next[k] === '' || next[k] === undefined || next[k] === null) delete next[k];
        });
        this._config = next;
        gsFire(this, 'config-changed', { config: next });
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = { language: 'auto', history_hours: 24, show_timeline: true, show_eta: true, show_actions: true, ...this._config };
  }
}

customElements.define('glowstat-heating-card', GlowStatHeatingCard);
customElements.define('glowstat-heating-card-editor', GlowStatHeatingCardEditor);
gsRegisterCard({
  type: 'glowstat-heating-card',
  name: 'GlowStat Heating',
  description: 'Whole-house heating overview from SmartHeatZones: boiler, zones, reasons, timelines and quick actions.',
});
