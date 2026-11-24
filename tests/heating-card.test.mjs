/**
 * Behavior tests for glowstat-heating-card (the whole-house card fed by the SmartHeatZones overview entity).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boot, mkHass, mount, same, text, tick } from './helpers.mjs';

const OV = 'sensor.smartheatzones_overview';

const zone = (over = {}) => ({
  name: 'Living', entity_id: 'climate.living', sensor_entity: 'sensor.living_temp', heating_mode: 'radiator',
  hvac_mode: 'heat', hvac_action: 'idle', preset: 'auto', current: 20.7, target: 21, adjusted_target: 21,
  hysteresis: 0.5, on_below: 20.5, off_above: 21.5, sensor_source: 'primary', sensor_fault: null,
  limp: { active: false, on_min: 10, effective_on_min: null, period_min: 60, next_in_min: null },
  next_change: null, afterheat: false, joined: false, relay_unavailable: [], relay_fault: [],
  reason: { code: 'in_band', on_below: 20.5, target: 21 }, ...over,
});

const localMidnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

const overview = (over = {}, boiler = {}, state = 'on') => ({
  state,
  attributes: {
    schema: 1, updated: new Date().toISOString(),
    boiler: {
      entity: 'switch.boiler', running: true, since: new Date(Date.now() - 600000).toISOString(), held_by: ['Living'],
      afterheat_zones: [], starts_today: 3, runtime_today_s: 5400, afterheat_joins_today: 1, failed_action: null,
      counters_since: localMidnight(), ...boiler,
    },
    zones: [zone()], health: { groups: {} }, ...over,
  },
});

const setup = (ov, cfg = {}, lang = 'en') => {
  const win = boot();
  const m = mkHass({ [OV]: ov });
  m.hass.language = lang;
  m.hass.locale = { language: lang };
  const el = mount(win, 'glowstat-heating-card', { entity: OV, layout: 'list', show_timeline: false, show_eta: false, ...cfg }, m.hass);
  return { win, el, ...m };
};

test('the heating card is registered with its editor', () => {
  const win = boot();
  assert.ok(win.customElements.get('glowstat-heating-card'));
  assert.ok(win.customElements.get('glowstat-heating-card-editor'));
  assert.ok(win.customCards.some((c) => c.type === 'glowstat-heating-card'));
});

test('setConfig without an entity throws', () => {
  const win = boot();
  assert.throws(() => win.document.createElement('glowstat-heating-card').setConfig({}), /entity/);
});

test('the header shows the boiler, the counters and who holds it', () => {
  const { el } = setup(overview({}, { afterheat_zones: ['Kitchen'] }));
  assert.match(text(el, '.bstate'), /Boiler running/);
  assert.match(text(el, '.bsince'), /since \d{1,2}:\d{2}/);
  assert.match(text(el, '.bheld'), /Living/);
  assert.match(text(el, '.bheld'), /Kitchen \(afterheat\)/);
  assert.match(text(el, '.bcount'), /3 starts/);
  assert.match(text(el, '.bcount'), /1 h 30 min/);
  assert.match(text(el, '.bcount'), /1 afterheat/);
});

test('a stopped boiler is shown as off', () => {
  const { el } = setup(overview({}, { running: false, since: null, held_by: [] }, 'off'));
  assert.match(text(el, '.bstate'), /Boiler off/);
  assert.equal(el.shadowRoot.querySelector('.bsince'), null);
});

test('counters that started after midnight say since when', () => {
  const late = new Date(); late.setHours(7, 12, 0, 0);
  const { el } = setup(overview({}, { counters_since: late.toISOString() }));
  assert.match(text(el, '.bcsince'), /since \d{1,2}:\d{2}/);
  const full = setup(overview());
  assert.equal(full.el.shadowRoot.querySelector('.bcsince'), null);
});

test('a failed boiler command is a red marker in the header', () => {
  const { el } = setup(overview({}, { failed_action: 'turn_on' }));
  assert.match(text(el, '.bfail'), /Boiler command failed/);
  assert.ok(el.shadowRoot.querySelector('.boiler.fault'));
});

const REASONS = [
  [{ code: 'needs_heat' }, 'Cold – needs heat', 'Hideg – fűtésre szorul'],
  [{ code: 'holding', off_above: 21.5 }, 'Heating until 21.5°', 'Fűt 21,5°-ig'],
  [{ code: 'afterheat' }, 'Riding along on the running boiler', 'Rátapad a már működő kazánra'],
  [{ code: 'in_band', on_below: 20.5, target: 21 }, 'Idle – heats below 20.5°, target 21°', 'Pihen – 20,5° alatt fűt, cél 21°'],
  [{ code: 'target_reached', target: 21 }, 'Target 21° reached', 'Cél (21°) elérve'],
  [{ code: 'door_open' }, 'Door or window open', 'Ajtó vagy ablak nyitva'],
  [{ code: 'hvac_off' }, 'Switched off', 'Kikapcsolva'],
  [{ code: 'no_reading' }, 'No temperature reading', 'Nincs hőmérséklet-adat'],
  [{ code: 'overheat' }, 'Overheat protection', 'Túlmelegedés-védelem'],
  [{ code: 'limp_heating' }, 'Emergency cycle – heating now', 'Vészüzem – most fűt'],
  [{ code: 'limp_waiting', next_in_min: 12 }, 'Emergency cycle – next heating in 12 min', 'Vészüzem – következő fűtés 12 perc múlva'],
  [{ code: 'limp_waiting', next_in_min: null }, 'Emergency cycle – waiting', 'Vészüzem – várakozik'],
];
for (const [reason, en, hu] of REASONS) {
  test(`reason ${reason.code} ${reason.next_in_min === null ? '(no countdown) ' : ''}is translated (en, hu)`, () => {
    assert.equal(text(setup(overview({ zones: [zone({ reason })] })).el, '.reason'), en);
    assert.equal(text(setup(overview({ zones: [zone({ reason })] }), {}, 'hu').el, '.reason'), hu);
  });
}

test('an unknown reason code is shown as is, not hidden', () => {
  const { el } = setup(overview({ zones: [zone({ reason: { code: 'brand_new' } })] }));
  assert.equal(text(el, '.reason'), 'brand_new');
});

test('one row per zone with name, temperatures and the threshold ticks', () => {
  const { el } = setup(overview({ zones: [zone(), zone({ name: 'Bedroom', current: 19, target: 20, on_below: 19.5, off_above: 20.5 })] }));
  const rows = el.shadowRoot.querySelectorAll('.zone');
  assert.equal(rows.length, 2);
  assert.equal(text(rows[0], '.zname'), 'Living');
  assert.match(text(rows[0], '.ztemp'), /20\.7.*21\.0/);
  assert.ok(rows[0].querySelector('.bar .t-on'));
  assert.ok(rows[0].querySelector('.bar .t-off'));
  assert.ok(rows[0].querySelector('.bar .t-cur'));
});

test('a zone with no reading has a row without a bar position', () => {
  const { el } = setup(overview({ zones: [zone({ current: null, reason: { code: 'no_reading' } })] }));
  assert.equal(el.shadowRoot.querySelector('.bar .t-cur'), null);
  assert.match(text(el, '.ztemp'), /–/);
});

test('next scheduled change line', () => {
  const { el } = setup(overview({ zones: [zone({ next_change: { at: '17:00', in_min: 300, temp: 22, label: 'Evening' } })] }));
  assert.equal(text(el, '.next'), 'Next: 22° at 17:00');
  assert.equal(setup(overview()).el.shadowRoot.querySelector('.next'), null);
});

test('source chips: none for primary, backup and emergency otherwise, afterheat for a joined zone', () => {
  assert.equal(setup(overview()).el.shadowRoot.querySelector('.chip'), null);
  assert.equal(text(setup(overview({ zones: [zone({ sensor_source: 'backup' })] })).el, '.chip'), 'backup sensor');
  assert.equal(text(setup(overview({ zones: [zone({ sensor_source: 'none' })] })).el, '.chip'), 'emergency cycle');
  assert.equal(text(setup(overview({ zones: [zone({ joined: true })] })).el, '.chip'), 'afterheat');
});

test('red only for a relay fault; a backup sensor is amber, not red', () => {
  const red = setup(overview({ zones: [zone({ relay_fault: ['switch.relay'] })] })).el;
  assert.ok(red.shadowRoot.querySelector('.zone.fault'));
  const amber = setup(overview({ zones: [zone({ sensor_source: 'backup' })] })).el;
  assert.equal(amber.shadowRoot.querySelector('.zone.fault'), null);
  assert.ok(amber.shadowRoot.querySelector('.zone.warn'));
});

test('a missing or unavailable overview entity shows a neutral hint and does not throw', () => {
  const win = boot();
  const missing = mkHass({});
  const el = mount(win, 'glowstat-heating-card', { entity: OV }, missing.hass);
  assert.match(text(el, '.hint'), /Smart ?Heat ?Zones|overview|No data/i);
  const gone = setup({ state: 'unavailable', attributes: {} });
  assert.ok(gone.el.shadowRoot.querySelector('.hint'));
});

test('a newer schema shows a hint but the known fields still render', () => {
  const { el } = setup(overview({ schema: 2 }));
  assert.ok(el.shadowRoot.querySelector('.hint'));
  assert.equal(text(el, '.zname'), 'Living');
});

test('a hass update with the same data does not repaint', () => {
  const { el, hass } = setup(overview());
  const first = el.shadowRoot.querySelector('.zone');
  el.hass = { ...hass };
  assert.equal(el.shadowRoot.querySelector('.zone'), first);
});

test('a state update repaints', () => {
  const { el, hass } = setup(overview());
  el.hass = { ...hass, states: { [OV]: overview({ zones: [zone({ current: 20.9 })] }) } };
  assert.match(text(el, '.ztemp'), /20\.9/);
});

test('the stub config picks the overview entity when present', () => {
  const win = boot();
  const cls = win.customElements.get('glowstat-heating-card');
  same(cls.getStubConfig({ states: { [OV]: overview() } }), { entity: OV });
  same(cls.getStubConfig({ states: {} }), { entity: OV });
});

// ---- Task 7: timelines and time to target ----

const MIN = 60000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const zoneHist = (entries) => entries.map(([minAgo, action]) => ({ state: 'heat', attributes: { hvac_action: action }, last_changed: iso(minAgo * MIN) }));
const switchHist = (entries) => entries.map(([minAgo, state]) => ({ state, last_changed: iso(minAgo * MIN) }));
const numHist = (entries) => entries.map(([minAgo, v]) => ({ state: String(v), last_changed: iso(minAgo * MIN) }));

/** History router: climate -> attribute history, switch -> boiler history, sensor -> numbers. */
const router = ({ climate = [], boiler = [], sensor = [] } = {}) => (path) => {
  if (path.includes('filter_entity_id=climate.living')) return [climate];
  if (path.includes('filter_entity_id=switch.boiler')) return [boiler];
  if (path.includes('filter_entity_id=sensor.living_temp')) return [sensor];
  return [[]];
};

function setupHist(ov, history, cfg = {}) {
  const win = boot();
  const m = mkHass({ [OV]: ov }, { history });
  const el = mount(win, 'glowstat-heating-card', { entity: OV, layout: 'list', ...cfg }, m.hass);
  return { win, el, ...m };
}

const widthOf = (node) => parseFloat(node.style.width);
const leftOf = (node) => parseFloat(node.style.left);

test('a timeline bar per zone and one for the boiler, proportional to the history', async () => {
  const hist = router({
    climate: zoneHist([[24 * 60, 'idle'], [12 * 60, 'heating'], [6 * 60, 'idle']]), // on for a quarter of 24 h
    boiler: switchHist([[24 * 60, 'off'], [18 * 60, 'on']]),                         // on for the last 18 h = 75 %
  });
  const { el, api } = setupHist(overview(), hist, { show_eta: false });
  await tick();
  const zoneSeg = el.shadowRoot.querySelector('.zone .tl .seg');
  assert.ok(zoneSeg);
  assert.ok(Math.abs(leftOf(zoneSeg) - 50) < 1.5, 'starts at half of the window');
  assert.ok(Math.abs(widthOf(zoneSeg) - 25) < 1.5, 'a quarter wide');
  const boilerSeg = el.shadowRoot.querySelector('.boiler .tl .seg');
  assert.ok(boilerSeg);
  assert.ok(Math.abs(widthOf(boilerSeg) - 75) < 1.5);
  assert.ok(api.every((p) => !p.includes('minimal_response') || p.includes('switch.boiler') || p.includes('sensor.')), 'the zone request keeps the attributes');
});

test('no history means no bar and no error', async () => {
  const { el } = setupHist(overview(), router(), { show_eta: false });
  await tick();
  assert.equal(el.shadowRoot.querySelector('.tl'), null);
  assert.equal(text(el, '.zname'), 'Living');
});

test('show_timeline false hides the bars and requests nothing for them', async () => {
  const { el, api } = setupHist(overview(), router({ climate: zoneHist([[600, 'heating']]) }), { show_timeline: false, show_eta: false });
  await tick();
  assert.equal(el.shadowRoot.querySelector('.tl'), null);
  assert.equal(api.length, 0);
});

test('history is requested once, not on every hass update', async () => {
  const { el, api, hass } = setupHist(overview(), router({ climate: zoneHist([[600, 'heating']]) }), { show_eta: false });
  await tick();
  const first = api.length;
  assert.ok(first >= 2);
  el.hass = { ...hass, states: { [OV]: overview({ zones: [zone({ current: 20.9 })] }) } };
  el.hass = { ...hass, states: { [OV]: overview({ zones: [zone({ current: 21.0 })] }) } };
  await tick();
  assert.equal(api.length, first);
});

const heatingZone = (over = {}) => zone({ hvac_action: 'heating', current: 21.2, target: 21.7, adjusted_target: 21.7, reason: { code: 'needs_heat' }, ...over });
// 13 points, one every 5 minutes, +1.2 °C/h ending at 21.2: (21.7 - 21.2) / 1.2 h = 25 min
const rising = numHist(Array.from({ length: 13 }, (_, i) => [60 - i * 5, +(20 + i * 0.1).toFixed(2)]));

test('time to target for a clean rise on a heating zone', async () => {
  const { el } = setupHist(overview({ zones: [heatingZone()] }), router({ sensor: rising }), { show_timeline: false });
  await tick();
  assert.match(text(el, '.eta'), /~25 min/);
});

for (const [name, pts, zoneOver] of [
  ['flat', numHist(Array.from({ length: 13 }, (_, i) => [60 - i * 5, 21.2])), {}],
  ['falling', numHist(Array.from({ length: 13 }, (_, i) => [60 - i * 5, +(22 - i * 0.1).toFixed(2)])), {}],
  ['too few points', numHist([[60, 20.0], [30, 20.6], [0, 21.2]]), {}],
  ['too short a span', numHist(Array.from({ length: 8 }, (_, i) => [10 - i, +(21 + i * 0.03).toFixed(2)])), {}],
  ['not heating', rising, { hvac_action: 'idle' }],
]) {
  test(`no time to target when ${name}`, async () => {
    const { el } = setupHist(overview({ zones: [heatingZone(zoneOver)] }), router({ sensor: pts }), { show_timeline: false });
    await tick();
    assert.equal(el.shadowRoot.querySelector('.eta'), null);
  });
}

test('show_eta false hides the estimate and requests no sensor history', async () => {
  const { el, api } = setupHist(overview({ zones: [heatingZone()] }), router({ sensor: rising }), { show_timeline: false, show_eta: false });
  await tick();
  assert.equal(el.shadowRoot.querySelector('.eta'), null);
  assert.equal(api.length, 0);
});

test('a failing history request is logged once and the card still renders', async () => {
  const win = boot();
  const errors = [];
  win.console.error = (...a) => errors.push(a);
  const m = mkHass({ [OV]: overview() }, { history: () => { throw new Error('boom'); } });
  const el = mount(win, 'glowstat-heating-card', { entity: OV, show_eta: false }, m.hass);
  await tick();
  assert.equal(text(el, '.zname'), 'Living');
  assert.ok(errors.length >= 1);
});

// ---- Task 8: health line, quick actions, live flash ----

const twoZones = () => overview({ zones: [zone(), zone({ name: 'Bedroom', entity_id: 'climate.bedroom' })] });

test('health line: all fine and partly silent, with the key split at the first slash', () => {
  const ok = setup(overview({ health: { groups: { 'zha/abc123': { total: 5, bad: 0 } } } }));
  assert.equal(text(ok.el, '.hgroup'), 'zha 5/5 ok');
  assert.ok(!ok.el.shadowRoot.querySelector('.hgroup.bad'));
  const bad = setup(overview({ health: { groups: { 'zha/abc123': { total: 5, bad: 2 } } } }));
  assert.equal(text(bad.el, '.hgroup'), 'zha: 2 of 5 silent');
  assert.ok(bad.el.shadowRoot.querySelector('.hgroup.bad'));
});

test('health line: a key with several slashes keeps only the platform, "unregistered" reads as other sensors', () => {
  const { el } = setup(overview({ health: { groups: { 'mqtt/a/b': { total: 1, bad: 0 }, unregistered: { total: 2, bad: 0 } } } }));
  const texts = [...el.shadowRoot.querySelectorAll('.hgroup')].map((n) => n.textContent.trim());
  assert.deepEqual(texts.sort(), ['mqtt 1/1 ok', 'other sensors 2/2 ok']);
});

test('no groups means no health line', () => {
  assert.equal(setup(overview()).el.shadowRoot.querySelector('.health'), null);
});

const act = (el, preset) => el.shadowRoot.querySelector(`.act[data-preset="${preset}"]`);
const press = (win, node) => node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, composed: true }));

test('"All away" and "All eco" set the preset on every zone', async () => {
  const { win, el, calls } = setup(twoZones(), { show_actions: true });
  press(win, act(el, 'away'));
  press(win, act(el, 'eco'));
  await tick();
  same(calls, [
    ['climate', 'set_preset_mode', { entity_id: 'climate.living', preset_mode: 'away' }],
    ['climate', 'set_preset_mode', { entity_id: 'climate.bedroom', preset_mode: 'away' }],
    ['climate', 'set_preset_mode', { entity_id: 'climate.living', preset_mode: 'eco' }],
    ['climate', 'set_preset_mode', { entity_id: 'climate.bedroom', preset_mode: 'eco' }],
  ]);
});

test('show_actions false hides the buttons', () => {
  const { el } = setup(twoZones(), { show_actions: false });
  assert.equal(el.shadowRoot.querySelector('.act[data-preset]'), null);
});

test('one failing zone does not stop the others and is named in the message', async () => {
  const win = boot();
  const m = mkHass({ [OV]: twoZones() });
  const calls = [];
  m.hass.callService = async (d, s, data) => { calls.push(data.entity_id); if (data.entity_id === 'climate.living') throw new Error('nope'); };
  const el = mount(win, 'glowstat-heating-card', { entity: OV, show_timeline: false, show_eta: false }, m.hass);
  const messages = [];
  win.document.addEventListener('hass-notification', (e) => messages.push(e.detail.message));
  press(win, act(el, 'away'));
  await tick();
  assert.deepEqual(calls, ['climate.living', 'climate.bedroom']);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Could not change the climate setting.*Living/);
  assert.ok(!/Bedroom/.test(messages[0]));
});

/** hass with a fake event connection: records the subscriptions and the unsubscribe calls. */
function withConnection(win, ov, { reject = false, late = false } = {}) {
  const m = mkHass({ [OV]: ov });
  const log = { subs: [], unsubbed: 0, resolve: null };
  m.hass.connection = {
    subscribeEvents: (cb, type) => {
      log.subs.push({ cb, type });
      if (reject) return Promise.reject(new Error('admin only'));
      const unsub = () => { log.unsubbed += 1; };
      if (late) return new Promise((res) => { log.resolve = () => res(unsub); });
      return Promise.resolve(unsub);
    },
  };
  const el = mount(win, 'glowstat-heating-card', { entity: OV, show_timeline: false, show_eta: false }, m.hass);
  return { el, log, ...m };
}

test('a failsafe event flashes the named zone row, removal unsubscribes', async () => {
  const win = boot();
  const { el, log } = withConnection(win, twoZones());
  await tick();
  assert.equal(log.subs.length, 1);
  assert.equal(log.subs[0].type, 'smartheatzones_failsafe');
  log.subs[0].cb({ data: { zone: 'Bedroom', state: 'limp' } });
  const rows = el.shadowRoot.querySelectorAll('.zone');
  assert.ok(!rows[0].classList.contains('flash'));
  assert.ok(rows[1].classList.contains('flash'));
  win.document.body.removeChild(el);
  assert.equal(log.unsubbed, 1);
});

test('a hass without a connection does not throw, a connection that appears later subscribes once', async () => {
  const win = boot();
  const m = mkHass({ [OV]: overview() });
  const el = mount(win, 'glowstat-heating-card', { entity: OV, show_timeline: false, show_eta: false }, m.hass);
  const subs = [];
  const later = { ...m.hass, connection: { subscribeEvents: (cb, type) => { subs.push(type); return Promise.resolve(() => {}); } } };
  el.hass = later;
  el.hass = { ...later };
  await tick();
  assert.deepEqual(subs, ['smartheatzones_failsafe']);
});

test('a subscription that resolves after the card was removed is unsubscribed at once', async () => {
  const win = boot();
  const { el, log } = withConnection(win, overview(), { late: true });
  win.document.body.removeChild(el);
  log.resolve();
  await tick();
  assert.equal(log.unsubbed, 1);
});

test('a rejected subscription warns once and the card keeps working', async () => {
  const win = boot();
  const warnings = [];
  win.console.warn = (...a) => warnings.push(a);
  const { el, hass } = withConnection(win, overview(), { reject: true });
  await tick();
  el.hass = { ...hass };
  el.hass = { ...hass };
  await tick();
  assert.equal(text(el, '.zname'), 'Living');
  assert.equal(warnings.length, 1);
});

test('the row shows the adjusted target the control compares against (radiator thermostat offset)', () => {
  const { el } = setup(overview({ zones: [zone({ current: 22, target: 21, adjusted_target: 24, on_below: 23.5, off_above: 24.5, reason: { code: 'needs_heat' } })] }));
  assert.match(text(el, '.ztemp'), /22\.0.*24\.0/);
});

// ---- Layouts, zone sheet (#4) ----

const tilesCard = (ov, cfg = {}, lang = 'en') => setup(ov, { layout: 'tiles', ...cfg }, lang);
const q = (el, sel) => el.shadowRoot.querySelector(sel);
const sheetOf = (el) => q(el, '.sheet');

test('the default layout is tiles with a ring gauge, one sentence and no row body', () => {
  const win = boot();
  const m = mkHass({ [OV]: overview() });
  const el = mount(win, 'glowstat-heating-card', { entity: OV, show_timeline: false, show_eta: false }, m.hass);
  assert.ok(q(el, '.zones.tiles .zone .gauge'));
  assert.equal(q(el, '.zbody'), null);
  assert.equal(text(el, '.zone .sent b'), 'Idle');
  assert.match(text(el, '.zone .reason'), /Idle – heats below 20\.5°/);
  assert.match(q(el, '.gauge').getAttribute('aria-label'), /20[.,]7/);
});

test('the list layout has a row per zone that opens and stays open across updates', () => {
  const { win, el, hass } = setup(overview());
  assert.ok(q(el, '.zones.list .zone .zbody'));
  const hit = q(el, '.rowhit');
  assert.equal(hit.getAttribute('aria-expanded'), 'false');
  press(win, hit);
  assert.ok(q(el, '.zone').classList.contains('open'));
  assert.equal(q(el, '.rowhit').getAttribute('aria-expanded'), 'true');
  hass.states = { [OV]: overview({ zones: [zone({ current: 20.9 })] }) };
  el.hass = hass;
  assert.ok(q(el, '.zone').classList.contains('open'), 'a repaint keeps the row open');
  press(win, q(el, '.rowhit'));
  assert.ok(!q(el, '.zone').classList.contains('open'));
});

test('the state badge: heating, door open, relay fault and off each get their own color class', () => {
  const badge = (zoneOver) => q(tilesCard(overview({ zones: [zone(zoneOver)] })).el, '.zone .gauge').getAttribute('class');
  assert.match(badge({ hvac_action: 'heating', reason: { code: 'needs_heat' } }), /st-heat/);
  assert.match(badge({ reason: { code: 'door_open' } }), /st-warn/);
  assert.match(badge({ relay_fault: ['switch.r'] }), /st-bad/);
  assert.match(badge({ hvac_mode: 'off', reason: { code: 'hvac_off' } }), /st-off/);
  assert.match(badge({}), /st-idle/);
  assert.equal(text(tilesCard(overview({ zones: [zone({ relay_fault: ['switch.r'] })] })).el, '.zone .sent b'), 'Relay not responding');
  assert.equal(text(tilesCard(overview({ zones: [zone({ reason: { code: 'door_open' } })] }), {}, 'hu').el, '.zone .sent b'), 'Ajtó nyitva');
});

test('a tile opens the zone sheet; the close button, the backdrop and Escape close it', () => {
  const { win, el } = tilesCard(twoZones());
  assert.equal(sheetOf(el), null);
  press(win, q(el, '.zhit'));
  assert.ok(sheetOf(el));
  assert.equal(text(el, '.sheet h2'), 'Living');
  press(win, q(el, '.x'));
  assert.equal(sheetOf(el), null);
  press(win, q(el, '.zhit'));
  press(win, q(el, '.sbg'));
  assert.equal(sheetOf(el), null, 'backdrop closes');
  press(win, q(el, '.zhit'));
  press(win, q(el, '.sheet'));
  assert.ok(sheetOf(el), 'a click inside the sheet keeps it open');
  q(el, '.sheet').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
  assert.equal(sheetOf(el), null, 'Escape closes');
});

test('the sheet stays open across updates and closes when the zone is gone', () => {
  const { win, el, hass } = tilesCard(twoZones());
  press(win, q(el, '.zhit'));
  hass.states = { [OV]: overview({ zones: [zone({ current: 20.9 }), zone({ name: 'Bedroom', entity_id: 'climate.bedroom' })] }) };
  el.hass = hass;
  assert.ok(sheetOf(el));
  hass.states = { [OV]: overview({ zones: [zone({ name: 'Bedroom', entity_id: 'climate.bedroom' })] }) };
  el.hass = hass;
  assert.equal(sheetOf(el), null);
});

test('sheet presets call climate.set_preset_mode for that zone and mark the current one', async () => {
  const { win, el, calls } = tilesCard(twoZones());
  press(win, q(el, '.zhit'));
  assert.ok(q(el, '.pbtn[data-zpreset="auto"]').classList.contains('on'));
  press(win, q(el, '.pbtn[data-zpreset="eco"]'));
  await tick();
  same(calls, [['climate', 'set_preset_mode', { entity_id: 'climate.living', preset_mode: 'eco' }]]);
});

test('the target stepper changes the zone target by half a degree, within 5 to 35', async () => {
  const { win, el, calls } = tilesCard(overview({ zones: [zone({ target: 21 })] }));
  press(win, q(el, '.zhit'));
  press(win, q(el, '[data-step="0.5"]'));
  press(win, q(el, '[data-step="-0.5"]'));
  await tick();
  same(calls, [
    ['climate', 'set_temperature', { entity_id: 'climate.living', temperature: 21.5 }],
    ['climate', 'set_temperature', { entity_id: 'climate.living', temperature: 20.5 }],
  ]);
  const top = tilesCard(overview({ zones: [zone({ target: 35 })] }));
  press(top.win, q(top.el, '.zhit'));
  press(top.win, q(top.el, '[data-step="0.5"]'));
  await tick();
  assert.equal(top.calls[0][2].temperature, 35);
});

test('a failing sheet call is logged and shown as a notification, the sheet stays', async () => {
  const win = boot();
  const errors = [];
  win.console.error = (...a) => errors.push(a);
  const m = mkHass({ [OV]: overview() });
  m.hass.callService = async () => { throw new Error('nope'); };
  const el = mount(win, 'glowstat-heating-card', { entity: OV, show_timeline: false, show_eta: false }, m.hass);
  const messages = [];
  win.document.addEventListener('hass-notification', (e) => messages.push(e.detail.message));
  press(win, q(el, '.zhit'));
  press(win, q(el, '.pbtn[data-zpreset="away"]'));
  await tick();
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Could not change the zone.*climate\.living/);
  assert.ok(errors.length >= 1);
  assert.ok(sheetOf(el));
});

test('"All automatic" sets the auto preset on every zone', async () => {
  const { win, el, calls } = tilesCard(twoZones(), { show_actions: true });
  press(win, act(el, 'auto'));
  await tick();
  same(calls, [
    ['climate', 'set_preset_mode', { entity_id: 'climate.living', preset_mode: 'auto' }],
    ['climate', 'set_preset_mode', { entity_id: 'climate.bedroom', preset_mode: 'auto' }],
  ]);
});

test('the sheet draws the chart from the zone history; without temperature history there is none', async () => {
  const hist = (rows) => rows.map(([minAgo, action, cur, tgt]) => ({ state: 'heat', attributes: { hvac_action: action, current_temperature: cur, temperature: tgt }, last_changed: iso(minAgo * MIN) }));
  const withHist = setupHist(overview(), router({ climate: hist([[600, 'idle', 19.5, 19], [400, 'heating', 19.2, 21], [200, 'heating', 20.4, 21], [30, 'idle', 21, 21]]) }), { layout: 'tiles', show_eta: false });
  await tick();
  press(withHist.win, q(withHist.el, '.zhit'));
  const svg = q(withHist.el, '.sheet svg.chart');
  assert.ok(svg);
  assert.ok(svg.querySelector('path.tc') && svg.querySelector('path.tg') && svg.querySelector('rect.hb'));
  const bare = setupHist(overview(), router(), { layout: 'tiles', show_eta: false });
  await tick();
  press(bare.win, q(bare.el, '.zhit'));
  assert.equal(q(bare.el, '.sheet svg.chart'), null);
  assert.ok(sheetOf(bare.el));
});

test('the editor offers the layout and the card falls back to tiles for an unknown value', () => {
  const win = boot();
  const ed = win.document.createElement('glowstat-heating-card-editor');
  const m = mkHass({});
  ed.setConfig({ entity: OV });
  ed.hass = m.hass;
  const field = ed._form.schema.find((f) => f.name === 'layout');
  same(field.selector.select.options.map((o) => o.value), ['tiles', 'list']);
  const odd = mount(win, 'glowstat-heating-card', { entity: OV, layout: 'weird', show_timeline: false, show_eta: false }, mkHass({ [OV]: overview() }).hass);
  assert.ok(q(odd, '.zones.tiles'));
});

test('adjacent heating samples are drawn as one band in the chart', async () => {
  const rows = [[300, 'idle', 19], [240, 'heating', 19.2], [200, 'heating', 19.8], [160, 'heating', 20.4], [100, 'idle', 21], [10, 'idle', 20.8]]
    .map(([minAgo, action, cur]) => ({ state: 'heat', attributes: { hvac_action: action, current_temperature: cur, temperature: 21 }, last_changed: iso(minAgo * MIN) }));
  const { win, el } = setupHist(overview(), router({ climate: rows }), { layout: 'tiles', show_eta: false });
  await tick();
  press(win, q(el, '.zhit'));
  assert.equal(el.shadowRoot.querySelectorAll('.sheet rect.hb').length, 1);
});
