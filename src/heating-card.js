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
  h_sensors_ok: 'Sensors: {a} / {t} alive', h_backup_zones: '{n} on backup sensor', h_relay_faults: '{n} relay fault',
  show_timeline: 'Show timelines', show_eta: 'Show time to target', show_actions: 'Show quick actions',
  r_needs_heat: 'Cold – needs heat', r_holding: 'Heating until {off_above}°',
  r_afterheat: 'Riding along on the running boiler', r_in_band: 'Idle – heats below {on_below}°, target {target}°',
  r_target_reached: 'Target {target}° reached', r_door_open: 'Door or window open', r_hvac_off: 'Switched off',
  r_no_reading: 'No temperature reading', r_overheat: 'Overheat protection',
  r_limp_heating: 'Emergency cycle – heating now', r_limp_waiting: 'Emergency cycle – next heating in {next_in_min} min',
  r_limp_waiting_none: 'Emergency cycle – waiting',
  h_eta: '~{n} min to target', h_timeline: 'heating periods',
  h_all_away: 'All away', h_all_eco: 'All eco',
  h_set_failed: 'Could not change the climate setting',
  layout: 'Layout', layout_tiles: 'Tiles with ring gauges', layout_list: 'List with expandable rows',
  h_all_auto: 'All automatic', h_target: 'target {t}°', h_now: 'now', h_close: 'Close',
  st_heating: 'Heating', st_idle: 'Idle', st_off: 'Off', st_door: 'Door open', st_relay: 'Relay not responding',
  st_noreading: 'No reading', st_overheat: 'Overheat protection', st_limp: 'Emergency cycle',
  h_on_below: 'Switches on below', h_off_above: 'Switches off above', h_target_label: 'Target', h_current: 'Now',
  h_set_target: 'Target temperature', h_lower: 'Lower', h_higher: 'Higher', h_history: 'Last {h} hours',
  h_chart_temp: 'Temperature', h_chart_target: 'Target', h_chart_heat: 'Heating', h_details: 'Details',
  h_today_heated: 'Heated {d}', h_sheet_failed: 'Could not change the zone',
});
Object.assign(GS_I18N.hu, {
  h_title: 'Fűtés', h_entity: 'Áttekintő szenzor (SmartHeatZones)',
  h_boiler_on: 'A kazán megy', h_boiler_off: 'A kazán áll', h_since: '{t} óta', h_held_by: 'tartja',
  h_starts: 'indítás', h_runtime: 'üzemidő', h_afterheat_joins: 'utánfűtés', h_counters_since: 'számlálás kezdete: {t}',
  h_boiler_failed: 'A kazánparancs nem sikerült', h_chip_afterheat: 'utánfűtés',
  h_src_backup: 'tartalék érzékelő', h_src_limp: 'vészüzem',
  h_next: 'Következő: {temp}° ekkor: {at}', h_unavailable: 'Az áttekintés nem elérhető', h_schema_new: 'A SmartHeatZones adat (séma: {n}) újabb, mint a kártya: frissítsd a GlowStatot.',
  h_sensors_ok: 'Érzékelők: {a} / {t} él', h_backup_zones: '{n} tartalék érzékelőn', h_relay_faults: '{n} relé hiba',
  show_timeline: 'Idővonalak megjelenítése', show_eta: 'Cél eléréséig hátralévő idő', show_actions: 'Gyorsműveletek megjelenítése',
  r_needs_heat: 'Hideg – fűtésre szorul', r_holding: 'Fűt {off_above}°-ig',
  r_afterheat: 'Rátapad a már működő kazánra', r_in_band: 'Pihen – {on_below}° alatt fűt, cél {target}°',
  r_target_reached: 'Cél ({target}°) elérve', r_door_open: 'Ajtó vagy ablak nyitva', r_hvac_off: 'Kikapcsolva',
  r_no_reading: 'Nincs hőmérséklet-adat', r_overheat: 'Túlmelegedés-védelem',
  r_limp_heating: 'Vészüzem – most fűt', r_limp_waiting: 'Vészüzem – következő fűtés {next_in_min} perc múlva',
  r_limp_waiting_none: 'Vészüzem – várakozik',
  h_eta: '~{n} perc a célig', h_timeline: 'fűtési időszakok',
  h_all_away: 'Mind távol', h_all_eco: 'Mind eco',
  h_set_failed: 'A beállítás módosítása nem sikerült',
  layout: 'Elrendezés', layout_tiles: 'Csempék gyűrűs hőmérővel', layout_list: 'Lista kinyitható sorokkal',
  h_all_auto: 'Mind automata', h_target: 'cél {t}°', h_now: 'most', h_close: 'Bezár',
  st_heating: 'Fűt', st_idle: 'Pihen', st_off: 'Kikapcsolva', st_door: 'Ajtó nyitva', st_relay: 'A relé nem válaszol',
  st_noreading: 'Nincs adat', st_overheat: 'Túlmelegedés-védelem', st_limp: 'Vészüzem',
  h_on_below: 'Bekapcsol ez alatt', h_off_above: 'Kikapcsol ez felett', h_target_label: 'Cél', h_current: 'Most',
  h_set_target: 'Célhőmérséklet', h_lower: 'Alacsonyabb', h_higher: 'Magasabb', h_history: 'Az utolsó {h} óra',
  h_chart_temp: 'Hőmérséklet', h_chart_target: 'Cél', h_chart_heat: 'Fűtés', h_details: 'Részletek',
  h_today_heated: 'Fűtött: {d}', h_sheet_failed: 'A zóna módosítása nem sikerült',
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

/**
 * Visual state of a zone: `bad` (relay fault), `warn` (door open, no reading, overheat), `heat`
 * (heating now), `off` (switched off) or `idle`; `title` is the translation key of its short name.
 */
function gsHeatState(z) {
  const code = z.reason && z.reason.code;
  if (Array.isArray(z.relay_fault) && z.relay_fault.length) return { cls: 'bad', title: 'st_relay' };
  if (code === 'door_open') return { cls: 'warn', title: 'st_door' };
  if (code === 'no_reading') return { cls: 'warn', title: 'st_noreading' };
  if (code === 'overheat') return { cls: 'warn', title: 'st_overheat' };
  if (z.hvac_action === 'heating') return { cls: 'heat', title: code === 'limp_heating' ? 'st_limp' : 'st_heating' };
  if (z.hvac_mode === 'off' || code === 'hvac_off') return { cls: 'off', title: 'st_off' };
  return { cls: 'idle', title: 'st_idle' };
}

/**
 * Ring gauge (270 degree arc): the filled arc is the current temperature, the pale band the
 * switch-on/off limits, the white dot the target. `unit` picks the scale (10..30 C or 50..86 F).
 * @param {object} z Overview zone.
 * @param {string} cls Status class (heat, idle, warn, bad, off) that colors the arc.
 */
function gsHeatGauge(L, z, cls, unit, size, mini) {
  const f = unit === '°F';
  const min = f ? 50 : 10;
  const max = f ? 86 : 30;
  const start = 135;
  const sweep = 270;
  const ang = (t) => start + (sweep * (Math.max(min, Math.min(max, Number(t))) - min)) / (max - min);
  const pt = (deg) => [60 + 48 * Math.cos((deg * Math.PI) / 180), 60 + 48 * Math.sin((deg * Math.PI) / 180)];
  const arc = (d0, d1) => {
    const a = pt(d0); const b = pt(d1);
    return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A48 48 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  };
  const has = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
  const target = z.adjusted_target ?? z.target;
  let svg = `<path d="${arc(start, start + sweep)}" fill="none" stroke="var(--divider-color)" stroke-width="9" stroke-linecap="round"/>`;
  if (has(z.on_below) && has(z.off_above)) svg += `<path class="band" d="${arc(ang(z.on_below), ang(z.off_above))}" fill="none" stroke-width="9" stroke-opacity="0.3"/>`;
  if (has(z.current)) svg += `<path class="fill" d="${arc(start, ang(z.current))}" fill="none" stroke-width="9" stroke-linecap="round"/>`;
  if (has(target)) { const p = pt(ang(target)); svg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6.5" fill="var(--card-background-color, #fff)" stroke="var(--primary-text-color)" stroke-width="2.5"/>`; }
  const cur = has(z.current) ? gsNum(L, Number(z.current), 1) : '–';
  svg += `<text class="gv" x="60" y="${mini ? 70 : 66}" text-anchor="middle" font-size="${mini ? 30 : 25}">${gsEsc(cur)}</text>`;
  if (!mini && has(target)) svg += `<text class="gs" x="60" y="83" text-anchor="middle" font-size="10.5">${gsEsc(gsT(L, 'h_target').replace('{t}', gsNum(L, Number(target), 1)))}</text>`;
  return `<svg class="gauge st-${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${gsEsc(cur + ' ' + unit)}">${svg}</svg>`;
}

/**
 * 24 hour chart of a zone: temperature line (filled), target steps and heating bands on one scale.
 * @param {Array<{state: string, last_changed: string, cur: ?number, tgt: ?number}>} data Zone history.
 * @returns {string} SVG markup, or '' when there are fewer than two temperature points.
 */
function gsHeatChart(L, data, from, to) {
  const rows = (data || []).map((p) => ({ t: Date.parse(p.last_changed), cur: Number(p.cur), tgt: Number(p.tgt), on: p.state === 'on', hc: p.cur !== null && p.cur !== undefined, ht: p.tgt !== null && p.tgt !== undefined }))
    .filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  const cur = rows.filter((p) => p.hc && Number.isFinite(p.cur));
  if (cur.length < 2 || !(to > from)) return '';
  const tgt = rows.filter((p) => p.ht && Number.isFinite(p.tgt));
  const all = cur.map((p) => p.cur).concat(tgt.map((p) => p.tgt));
  const lo = Math.floor(Math.min(...all) / 2) * 2 - 2;
  const hi = Math.ceil(Math.max(...all) / 2) * 2 + 2;
  const W = 560; const H = 230; const l = 34; const r = 10; const top = 12; const b = 44;
  const pw = W - l - r; const ph = H - top - b;
  const X = (t) => (l + (pw * (Math.max(from, Math.min(to, t)) - from)) / (to - from)).toFixed(1);
  const Y = (v) => (top + ph * (1 - (v - lo) / (hi - lo))).toFixed(1);
  let out = '';
  for (let v = lo; v <= hi; v += 2) out += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--divider-color)"/><text x="${l - 6}" y="${(Number(Y(v)) + 3.5).toFixed(1)}" text-anchor="end">${v}°</text>`;
  const hours = Math.round((to - from) / 3600000);
  const step = hours > 36 ? 12 : hours > 12 ? 6 : 3;
  for (let h = 0; h <= hours; h += step) {
    const t = from + h * 3600000;
    out += `<text x="${X(t)}" y="${H - 6}" text-anchor="${h === 0 ? 'start' : h + step > hours ? 'end' : 'middle'}">${gsEsc(new Date(t).toLocaleTimeString(L.language, { hour: '2-digit', minute: '2-digit' }))}</text>`;
  }
  const bands = [];
  gsHeatSegments(rows.map((p) => ({ state: p.on ? 'on' : 'off', last_changed: new Date(p.t).toISOString() })), from, to).filter((g) => g.on).forEach((g) => {
    const last = bands[bands.length - 1];
    if (last && g.start <= last.end) last.end = Math.max(last.end, g.end);
    else bands.push({ start: g.start, end: g.end });
  });
  bands.forEach((g) => {
    out += `<rect class="hb" x="${X(g.start)}" y="${H - b + 8}" width="${Math.max(2, Number(X(g.end)) - Number(X(g.start))).toFixed(1)}" height="10" rx="2"/>`;
  });
  let line = `M${X(cur[0].t)} ${Y(cur[0].cur)}`;
  cur.forEach((p) => { line += `L${X(p.t)} ${Y(p.cur)}`; });
  out += `<path class="area" d="${line}L${X(cur[cur.length - 1].t)} ${top + ph}L${X(cur[0].t)} ${top + ph}Z"/>`;
  if (tgt.length) {
    let d = `M${X(tgt[0].t)} ${Y(tgt[0].tgt)}`;
    tgt.forEach((p, i) => { if (i) d += `H${X(p.t)}V${Y(p.tgt)}`; });
    d += `H${X(to)}`;
    out += `<path class="tg" d="${d}" fill="none" stroke-width="2" stroke-dasharray="5 4"/>`;
  }
  out += `<path class="tc" d="${line}" fill="none" stroke-width="2.5" stroke-linejoin="round"/>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${gsEsc(gsT(L, 'h_chart_temp'))}">${out}</svg>`;
}

const GS_HEAT_CSS = `
  :host { display: block; --h-heat: 255,112,67; --h-idle: 66,165,245; --h-warn: 255,174,0; --h-bad: 239,83,80; --h-off: 140,150,165; --h-ok: 67,160,71; }
  ha-card { display: block; overflow: hidden; }
  .wrap { padding: 12px; display: grid; gap: 10px; }
  button { font: inherit; color: inherit; }
  .boiler { display: grid; gap: 2px; padding: 12px; border-radius: 14px; border: 1px solid var(--divider-color); position: relative; padding-left: 68px; min-height: 68px; align-content: center; }
  .boiler::before { content: ''; position: absolute; left: 12px; top: 50%; width: 44px; height: 44px; margin-top: -22px; border-radius: 50%; background: rgb(var(--h-off)); opacity: 0.35; }
  .boiler.on::before { background: rgb(var(--h-heat)); opacity: 1; }
  .bicon { position: absolute; left: 12px; top: 50%; width: 44px; height: 44px; margin-top: -22px; display: grid; place-items: center; color: var(--secondary-text-color); --mdc-icon-size: 24px; }
  .boiler.on .bicon { color: #fff; }
  .boiler.on { border-color: rgba(var(--h-heat), 0.6); background: rgba(var(--h-heat), 0.08); }
  .boiler.fault { border-color: rgb(var(--h-bad)); background: rgba(var(--h-bad), 0.12); }
  .bstate { font-weight: 600; font-size: 16px; }
  .bsince, .bheld, .bcount, .bcsince { font-size: 12.5px; color: var(--secondary-text-color); }
  .bfail { font-size: 12.5px; font-weight: 600; color: rgb(var(--h-bad)); }
  .boiler .tl { margin-top: 6px; }
  .zones.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .zones.list { display: grid; gap: 8px; }
  .zone { border-radius: 16px; border: 1px solid var(--divider-color); background: var(--card-background-color); min-width: 0; }
  .zone.warn { border-color: rgba(var(--h-warn), 0.8); }
  .zone.fault { border-color: rgb(var(--h-bad)); background: rgba(var(--h-bad), 0.08); }
  .zone.flash { animation: heatflash 1s ease-in-out 6; }
  @keyframes heatflash { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 12px 2px rgba(var(--h-bad), 0.7); } }
  @media (prefers-reduced-motion: reduce) { .zone.flash { animation: none; box-shadow: 0 0 0 2px rgb(var(--h-bad)); } }
  .zhit { display: grid; gap: 6px; padding: 12px; width: 100%; background: none; border: 0; cursor: pointer; text-align: left; border-radius: 16px; }
  .zhit:focus-visible, .act:focus-visible, .x:focus-visible, .pbtn:focus-visible, .rowhit:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .zones.tiles .zhit { justify-items: center; text-align: center; }
  .ztop { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; }
  .zname { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gauge .fill { stroke: rgb(var(--h-idle)); } .gauge .band { stroke: rgb(var(--h-idle)); }
  .gauge.st-heat .fill, .gauge.st-heat .band { stroke: rgb(var(--h-heat)); }
  .gauge.st-warn .fill, .gauge.st-warn .band { stroke: rgb(var(--h-warn)); }
  .gauge.st-bad .fill, .gauge.st-bad .band { stroke: rgb(var(--h-bad)); }
  .gauge.st-off .fill, .gauge.st-off .band { stroke: rgb(var(--h-off)); }
  .gauge .gv { fill: var(--primary-text-color); font-weight: 700; font-variant-numeric: tabular-nums; }
  .gauge .gs { fill: var(--secondary-text-color); }
  .sent { font-size: 12.5px; line-height: 1.35; color: var(--secondary-text-color); }
  .sent b { display: block; color: var(--primary-text-color); font-weight: 600; font-size: 13px; }
  .reason { display: block; }
  .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
  .badge::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .badge.heat { background: rgba(var(--h-heat), 0.16); color: rgb(var(--h-heat)); }
  .badge.idle { background: rgba(var(--h-idle), 0.16); color: rgb(var(--h-idle)); }
  .badge.warn { background: rgba(var(--h-warn), 0.2); color: rgb(var(--h-warn)); }
  .badge.bad { background: rgba(var(--h-bad), 0.16); color: rgb(var(--h-bad)); }
  .badge.ok { background: rgba(var(--h-ok), 0.16); color: rgb(var(--h-ok)); }
  .badge.off { background: rgba(var(--h-off), 0.2); color: var(--secondary-text-color); }
  .chip { font-size: 11px; padding: 1px 8px; border-radius: 10px; background: color-mix(in srgb, var(--primary-color) 20%, transparent); }
  .zone.warn .chip { background: rgba(var(--h-warn), 0.25); }
  .pset { font-size: 11.5px; color: var(--secondary-text-color); }
  .ztemp { font-size: 12.5px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .rowhit { display: flex; align-items: center; gap: 12px; padding: 10px 12px; width: 100%; background: none; border: 0; cursor: pointer; text-align: left; border-radius: 16px; }
  .rowhit .mid { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .rowhit .nm { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .chev { color: var(--secondary-text-color); transition: transform .15s; flex: none; }
  .zone.open .chev { transform: rotate(90deg); }
  .zbody { display: none; padding: 2px 14px 14px; border-top: 1px solid var(--divider-color); gap: 10px; }
  .zone.open .zbody { display: grid; }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 10px; }
  .fact { background: var(--secondary-background-color); border-radius: 10px; padding: 8px 10px; }
  .fact span { display: block; font-size: 11.5px; color: var(--secondary-text-color); }
  .fact b { font-weight: 600; font-size: 14px; font-variant-numeric: tabular-nums; }
  .bar { position: relative; height: 8px; border-radius: 4px; background: var(--divider-color); margin: 4px 0; }
  .bar .band { position: absolute; top: 0; bottom: 0; background: rgba(0,168,28,0.35); border-radius: 4px; }
  .bar .t-on, .bar .t-off { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--secondary-text-color); }
  .bar .t-cur { position: absolute; top: -3px; width: 10px; height: 14px; margin-left: -5px; border-radius: 5px; background: var(--primary-color); }
  .tl { position: relative; height: 12px; border-radius: 6px; background: var(--divider-color); overflow: hidden; }
  .tl .seg { position: absolute; top: 0; bottom: 0; background: rgb(var(--h-heat)); }
  .eta { font-size: 12.5px; font-weight: 500; }
  .next { font-size: 12.5px; color: var(--secondary-text-color); }
  .health { display: flex; flex-wrap: wrap; gap: 6px; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .act, .pbtn { flex: 1; min-width: 90px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 14px; cursor: pointer; user-select: none; font-size: 13px; border: 1px solid var(--divider-color); background: var(--secondary-background-color); }
  .act:active, .pbtn:active { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .pbtn.on { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .act ha-icon { --mdc-icon-size: 20px; }
  .hint { padding: 10px; font-size: 13px; color: var(--secondary-text-color); }
  .sbg { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 9; }
  @media (min-width: 700px) { .sbg { align-items: center; } }
  .sheet { background: var(--card-background-color); color: var(--primary-text-color); width: 100%; max-width: 640px; max-height: 92vh; overflow: auto; border-radius: 20px 20px 0 0; padding: 16px; display: grid; gap: 14px; }
  @media (min-width: 700px) { .sheet { border-radius: 20px; } }
  .sh { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .sh h2 { margin: 0; font-size: 20px; }
  .x { width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--secondary-background-color); cursor: pointer; font-size: 18px; }
  .big { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .big .txt { flex: 1; min-width: 170px; display: grid; gap: 8px; }
  .stepper { display: inline-flex; align-items: center; gap: 12px; background: var(--secondary-background-color); border-radius: 12px; padding: 6px; justify-self: start; }
  .stepper button { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--card-background-color); cursor: pointer; font-size: 20px; }
  .stepper b { min-width: 64px; text-align: center; font-size: 20px; font-variant-numeric: tabular-nums; }
  .lbl { font-size: 11.5px; color: var(--secondary-text-color); margin-bottom: 4px; }
  .chart { width: 100%; height: auto; display: block; }
  .chart text { fill: var(--secondary-text-color); font-size: 10.5px; }
  .chart .tc { stroke: rgb(var(--h-idle)); } .chart .tg { stroke: rgb(var(--h-warn)); }
  .chart .area { fill: rgba(var(--h-idle), 0.12); } .chart .hb { fill: rgb(var(--h-heat)); opacity: 0.85; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--secondary-text-color); margin-top: 6px; }
  .legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
`;

class GlowStatHeatingCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = '';
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && this._open) this._closeSheet();
    });
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
    this._open = null;
    this._expanded = {};
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
        if (w.kind === 'zone') mine.data = rows.map((p) => ({ state: p.attributes && p.attributes.hvac_action === 'heating' ? 'on' : 'off', last_changed: when(p), cur: p.attributes ? p.attributes.current_temperature : null, tgt: p.attributes ? p.attributes.temperature : null }));
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

  /** Minutes to the target for a heating zone with a clear rising trend, else null. */
  _etaMinutes(z) {
    if (this._config.show_eta === false || z.hvac_action !== 'heating' || z.adjusted_target === null || z.adjusted_target === undefined) return null;
    const entry = this._hist && this._hist['s|' + z.sensor_entity];
    return entry && entry.data ? gsEta(entry.data, Number(z.adjusted_target), Date.now()) : null;
  }

  /** "~25 min to target" for a heating zone with a clear rising trend, else ''. */
  _etaHtml(z, L) {
    const minutes = this._etaMinutes(z);
    return minutes === null ? '' : `<div class="eta">${gsEsc(gsT(L, 'h_eta').replace('{n}', String(minutes)))}</div>`;
  }

  /** Shared parts of a zone: state, classes, source chip, sentence, and the next change line. */
  _zoneParts(z, L) {
    const state = gsHeatState(z);
    const cls = ['zone'];
    if (this._flash === z.name) cls.push('flash');
    if (Array.isArray(z.relay_fault) && z.relay_fault.length) cls.push('fault');
    else if (z.sensor_source === 'backup' || z.sensor_source === 'none' || z.sensor_fault) cls.push('warn');
    let chip = '';
    if (z.joined) chip = gsT(L, 'h_chip_afterheat');
    else if (z.sensor_source === 'backup') chip = gsT(L, 'h_src_backup');
    else if (z.sensor_source === 'none') chip = gsT(L, 'h_src_limp');
    const pk = 'p_' + z.preset;
    const pt = z.preset ? gsT(L, pk) : '';
    return {
      state, cls, chip,
      preset: pt === pk ? String(z.preset || '') : pt,
      title: gsT(L, state.title),
      reason: gsHeatReason(L, z.reason),
      next: z.next_change
        ? `<div class="next">${gsEsc(gsT(L, 'h_next').replace('{temp}', gsHeatDeg(L, z.next_change.temp)).replace('{at}', z.next_change.at))}</div>` : '',
    };
  }

  /** Attribute string that identifies a zone element. */
  _zoneAttrs(z, parts) {
    return `class="${parts.cls.join(' ')}${this._expanded[z.entity_id] ? ' open' : ''}" data-name="${gsEsc(z.name)}" data-entity="${gsEsc(z.entity_id)}"`;
  }

  /** A zone as a tile: name, ring gauge, one sentence and the preset. Opens the zone sheet. */
  _tileHtml(z, L, unit) {
    const parts = this._zoneParts(z, L);
    return `<div ${this._zoneAttrs(z, parts)}>
      <button class="zhit" data-open="${gsEsc(z.entity_id)}" aria-label="${gsEsc(z.name + ': ' + parts.title)}">
        <div class="ztop"><span class="zname">${gsEsc(z.name)}</span>${parts.chip ? `<span class="chip">${gsEsc(parts.chip)}</span>` : ''}</div>
        ${gsHeatGauge(L, z, parts.state.cls, unit, 118, false)}
        <div class="sent"><b>${gsEsc(parts.title)}</b><span class="reason">${gsEsc(parts.reason)}</span></div>
        ${this._etaHtml(z, L)}
        <div><span class="badge ${parts.state.cls}">${gsEsc(parts.preset || parts.title)}</span></div>
      </button></div>`;
  }

  /** A zone as a row: mini gauge and sentence; the row opens to limits, next change, timeline and the sheet button. */
  _rowHtml(z, L, unit) {
    const parts = this._zoneParts(z, L);
    const num = (v) => (v === null || v === undefined ? '–' : gsNum(L, Number(v), 1));
    const target = z.adjusted_target ?? z.target;
    const values = [z.on_below, z.off_above, z.target, z.current].filter((v) => v !== null && v !== undefined).map(Number);
    const lo = Math.min(...values) - 1.5;
    const hi = Math.max(...values) + 1.5;
    const pos = (v) => Math.max(0, Math.min(100, ((Number(v) - lo) / (hi - lo)) * 100)).toFixed(1);
    const hasBand = z.on_below !== null && z.on_below !== undefined && z.off_above !== null && z.off_above !== undefined;
    const bar = `<div class="bar">${hasBand ? `<div class="band" style="left:${pos(z.on_below)}%;width:${(pos(z.off_above) - pos(z.on_below)).toFixed(1)}%"></div><div class="t-on" style="left:${pos(z.on_below)}%"></div><div class="t-off" style="left:${pos(z.off_above)}%"></div>` : ''}${z.current !== null && z.current !== undefined ? `<div class="t-cur" style="left:${pos(z.current)}%"></div>` : ''}</div>`;
    const fact = (label, value) => `<div class="fact"><span>${gsEsc(label)}</span><b>${gsEsc(value)}</b></div>`;
    const facts = [fact(gsT(L, 'h_current'), `${num(z.current)} ${unit}`), fact(gsT(L, 'h_target_label') + (parts.preset ? ` (${parts.preset})` : ''), `${num(target)} ${unit}`)];
    if (hasBand) facts.push(fact(gsT(L, 'h_on_below'), `${num(z.on_below)} ${unit}`), fact(gsT(L, 'h_off_above'), `${num(z.off_above)} ${unit}`));
    return `<div ${this._zoneAttrs(z, parts)}>
      <button class="rowhit" data-toggle="${gsEsc(z.entity_id)}" aria-expanded="${this._expanded[z.entity_id] ? 'true' : 'false'}">
        ${gsHeatGauge(L, z, parts.state.cls, unit, 58, true)}
        <div class="mid"><div class="nm"><span class="zname">${gsEsc(z.name)}</span><span class="badge ${parts.state.cls}">${gsEsc(parts.title)}</span>${parts.chip ? `<span class="chip">${gsEsc(parts.chip)}</span>` : ''}</div>
          <div class="sent"><span class="reason">${gsEsc(parts.reason)}</span></div>
          <span class="ztemp">${num(z.current)} → ${num(target)} ${gsEsc(unit)}</span></div>
        <span class="chev"><ha-icon icon="mdi:chevron-right"></ha-icon></span></button>
      <div class="zbody"><div class="facts">${facts.join('')}</div>${bar}${this._etaHtml(z, L)}${parts.next}${this._timelineHtml('z|' + z.entity_id, L)}
        <div class="actions"><button class="act" data-open="${gsEsc(z.entity_id)}">${gsEsc(gsT(L, 'h_details'))}</button></div></div></div>`;
  }

  _zoneHtml(z, L, unit) {
    return this._config.layout === 'list' ? this._rowHtml(z, L, unit) : this._tileHtml(z, L, unit);
  }

  /** The zone sheet: big gauge, presets, target stepper, 24 h chart and the heating timeline. */
  _sheetHtml(z, L, unit) {
    const parts = this._zoneParts(z, L);
    const target = z.target === null || z.target === undefined ? null : Number(z.target);
    const presets = ['auto', 'comfort', 'eco', 'away'].map((p) => (
      `<button class="pbtn${z.preset === p ? ' on' : ''}" data-zpreset="${p}" data-entity="${gsEsc(z.entity_id)}">${gsEsc(gsT(L, 'p_' + p))}</button>`)).join('');
    const stepper = target === null ? '' : `<div><div class="lbl">${gsEsc(gsT(L, 'h_set_target'))}</div><div class="stepper">
      <button data-step="-0.5" data-entity="${gsEsc(z.entity_id)}" aria-label="${gsEsc(gsT(L, 'h_lower'))}">−</button><b>${gsEsc(gsNum(L, target, 1))} ${gsEsc(unit)}</b>
      <button data-step="0.5" data-entity="${gsEsc(z.entity_id)}" aria-label="${gsEsc(gsT(L, 'h_higher'))}">+</button></div></div>`;
    const entry = this._hist && this._hist['z|' + z.entity_id];
    const svg = entry && entry.data ? gsHeatChart(L, entry.data, entry.from, entry.to) : '';
    const hours = entry ? Math.round((entry.to - entry.from) / 3600000) : 0;
    const chart = svg ? `<div><div class="lbl">${gsEsc(gsT(L, 'h_history').replace('{h}', String(hours)))}</div>${svg}
      <div class="legend"><span><i style="background:rgb(var(--h-idle))"></i>${gsEsc(gsT(L, 'h_chart_temp'))}</span><span><i style="background:rgb(var(--h-warn))"></i>${gsEsc(gsT(L, 'h_chart_target'))}</span><span><i style="background:rgb(var(--h-heat))"></i>${gsEsc(gsT(L, 'h_chart_heat'))}</span></div></div>` : '';
    const tl = this._timelineHtml('z|' + z.entity_id, L);
    return `<div class="sbg" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="${gsEsc(z.name)}">
      <div class="sh"><h2>${gsEsc(z.name)}</h2><button class="x" data-close="1" aria-label="${gsEsc(gsT(L, 'h_close'))}">×</button></div>
      <div class="big">${gsHeatGauge(L, z, parts.state.cls, unit, 150, false)}<div class="txt">
        <div class="sent"><b>${gsEsc(parts.title)}</b><span class="reason">${gsEsc(parts.reason)}</span></div>${this._etaHtml(z, L)}${parts.next}
        <div class="health"><span class="badge ${parts.state.cls}">${gsEsc(parts.title)}</span>${parts.chip ? `<span class="chip">${gsEsc(parts.chip)}</span>` : ''}</div></div></div>
      <div class="actions">${presets}</div>${stepper}${chart}${tl}
      <div class="actions"><button class="act" data-more="${gsEsc(z.entity_id)}">${gsEsc(gsT(L, 'h_details'))}</button></div></div></div>`;
  }

  /** Summary badges: sensors alive (green, amber if some are silent), zones on a backup sensor, relay faults. */
  _healthHtml(groups, zones, L) {
    const gs = Object.values(groups || {});
    const badges = [];
    const total = gs.reduce((n, g) => n + (Number(g && g.total) || 0), 0);
    if (total > 0) {
      const bad = gs.reduce((n, g) => n + (Number(g && g.bad) || 0), 0);
      const label = gsT(L, 'h_sensors_ok').replace(/\{a\}/g, String(total - bad)).replace(/\{t\}/g, String(total));
      badges.push(`<span class="badge ${bad > 0 ? 'warn' : 'ok'}">${gsEsc(label)}</span>`);
    }
    const zs = zones || [];
    const backup = zs.filter((z) => z.sensor_source === 'backup').length;
    if (backup > 0) badges.push(`<span class="badge warn">${gsEsc(gsT(L, 'h_backup_zones').replace(/\{n\}/g, String(backup)))}</span>`);
    const faults = zs.filter((z) => Array.isArray(z.relay_fault) && z.relay_fault.length).length;
    if (faults > 0) badges.push(`<span class="badge bad">${gsEsc(gsT(L, 'h_relay_faults').replace(/\{n\}/g, String(faults)))}</span>`);
    return badges.length ? `<div class="health">${badges.join('')}</div>` : '';
  }

  /** Quick actions for all zones. */
  _actionsHtml(L) {
    if (this._config.show_actions === false) return '';
    return `<div class="actions">
      <div class="act" role="button" tabindex="0" data-preset="away"><ha-icon icon="mdi:car"></ha-icon>${gsEsc(gsT(L, 'h_all_away'))}</div>
      <div class="act" role="button" tabindex="0" data-preset="eco"><ha-icon icon="mdi:leaf"></ha-icon>${gsEsc(gsT(L, 'h_all_eco'))}</div>
      <div class="act" role="button" tabindex="0" data-preset="auto"><ha-icon icon="mdi:calendar-clock"></ha-icon>${gsEsc(gsT(L, 'h_all_auto'))}</div></div>`;
  }

  /** Tell the user a service call failed (and log it for the traces). */
  _failed(message, names, err, what) {
    console.error('GlowStat: ' + what, err);
    gsFire(this, 'hass-notification', { message: message + (names ? ' (' + names + ')' : '') });
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

  /** Change one zone from its sheet: a preset or a new target temperature. */
  _setZone(entity, service, data) {
    const hass = this._hass;
    const L = gsLangObj(hass, this._config);
    Promise.resolve().then(() => hass.callService('climate', service, { entity_id: entity, ...data }))
      .catch((e) => this._failed(gsT(L, 'h_sheet_failed'), entity, e, 'climate.' + service + ' failed for ' + entity));
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
    return `<div class="boiler${b.running ? ' on' : ''}${b.failed_action ? ' fault' : ''}"><ha-icon class="bicon" icon="mdi:fire"></ha-icon>${lines.join('')}${boilerTl}</div>`;
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
    const layout = cfg.layout === 'list' ? 'list' : 'tiles';
    const open = this._open && a.zones.find((z) => z.entity_id === this._open);
    shell(`<div class="wrap">${hint}${this._boilerHtml(a.boiler, L)}${this._healthHtml(a.health && a.health.groups, a.zones, L)}${this._actionsHtml(L)}<div class="zones ${layout}">${a.zones.map((z) => this._zoneHtml(z, L, unit)).join('')}</div></div>${open ? this._sheetHtml(open, L, unit) : ''}`);
  }

  _openSheet(entity) {
    this._open = entity;
    this._sig = '';
    this._paint();
    const close = this.shadowRoot.querySelector('.x');
    if (close) close.focus();
  }

  _closeSheet() {
    this._open = null;
    this._sig = '';
    this._paint();
  }

  _onClick(ev) {
    const path = ev.composedPath();
    const find = (key) => path.find((n) => n.dataset && n.dataset[key] !== undefined);
    const action = find('preset');
    if (action) { this._setAll(action.dataset.preset); return; }
    const sheetBtn = find('zpreset');
    if (sheetBtn) { this._setZone(sheetBtn.dataset.entity, 'set_preset_mode', { preset_mode: sheetBtn.dataset.zpreset }); return; }
    const step = find('step');
    if (step) {
      const st = this._hass.states[this._config.entity];
      const z = st && st.attributes && (st.attributes.zones || []).find((q) => q.entity_id === step.dataset.entity);
      if (z && z.target !== null && z.target !== undefined) {
        const next = Math.round((Number(z.target) + Number(step.dataset.step)) * 2) / 2;
        this._setZone(z.entity_id, 'set_temperature', { temperature: Math.max(5, Math.min(35, next)) });
      }
      return;
    }
    const more = find('more');
    if (more) { gsFire(this, 'hass-more-info', { entityId: more.dataset.more }); return; }
    const opener = find('open');
    if (opener) { this._openSheet(opener.dataset.open); return; }
    const toggle = find('toggle');
    if (toggle) {
      const id = toggle.dataset.toggle;
      this._expanded[id] = !this._expanded[id];
      const row = toggle.closest('.zone');
      if (row) row.classList.toggle('open', this._expanded[id]);
      toggle.setAttribute('aria-expanded', String(Boolean(this._expanded[id])));
      return;
    }
    const closer = find('close');
    if (closer && (closer.classList.contains('x') || path[0] === closer)) this._closeSheet();
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
      { name: 'layout', selector: { select: { mode: 'dropdown', options: ['tiles', 'list'].map((v) => ({ value: v, label: gsT(this._hass, 'layout_' + v) })) } } },
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
    this._form.data = { language: 'auto', layout: 'tiles', history_hours: 24, show_timeline: true, show_eta: true, show_actions: true, ...this._config };
  }
}

customElements.define('glowstat-heating-card', GlowStatHeatingCard);
customElements.define('glowstat-heating-card-editor', GlowStatHeatingCardEditor);
gsRegisterCard({
  type: 'glowstat-heating-card',
  name: 'GlowStat Heating',
  description: 'Whole-house heating overview from SmartHeatZones: boiler, zones, reasons, timelines and quick actions.',
});
