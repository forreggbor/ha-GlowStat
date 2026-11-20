/**
 * Behavior tests for the GlowStat cards. The built bundle (dist/ha-glowstat.js) is loaded into a
 * fresh jsdom window per test and driven with a mock `hass` object.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { JSDOM } from 'jsdom';

const BUNDLE = new Script(readFileSync(new URL('../dist/ha-glowstat.js', import.meta.url), 'utf8'));
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
/** Objects created inside the jsdom window have another prototype; compare their plain JSON form. */
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

/** A fresh window with the bundle loaded. */
function boot() {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'http://localhost/' });
  BUNDLE.runInContext(dom.getInternalVMContext());
  return dom.window;
}

/** Mock hass; `calls` collects service calls, `api`/`ws` collect history requests. */
function mkHass(states, extra = {}) {
  const calls = [];
  const api = [];
  const ws = [];
  const hass = {
    states,
    language: 'en',
    locale: { language: 'en' },
    config: { unit_system: { temperature: '°C' } },
    callService: async (domain, service, data) => { calls.push([domain, service, data]); },
    callApi: async (method, path) => { api.push(path); return extra.history ? extra.history() : [[]]; },
    callWS: async (msg) => { ws.push(msg); return extra.stats ? extra.stats(msg) : {}; },
  };
  return { hass, calls, api, ws };
}

const tempState = (v, unit = '°C') => ({ state: String(v), attributes: { unit_of_measurement: unit, device_class: 'temperature', friendly_name: 'Living' } });
const plain = (v) => ({ state: String(v), attributes: { friendly_name: 'x' } });

function mount(win, tag, config, hass) {
  const el = win.document.createElement(tag);
  el.setConfig(config);
  el.hass = hass;
  win.document.body.appendChild(el);
  return el;
}

const text = (el, sel) => (sel ? el.shadowRoot?.querySelector(sel) ?? el.querySelector(sel) : el)?.textContent.replace(/\s+/g, ' ').trim();
const click = (win, el, sel) => el.shadowRoot.querySelector(sel).dispatchEvent(new win.MouseEvent('click', { bubbles: true, composed: true }));

const climateState = (over = {}) => ({
  state: 'heat',
  attributes: {
    hvac_modes: ['off', 'heat'], preset_modes: ['auto', 'manual', 'eco'], preset_mode: 'manual',
    temperature: 21, current_temperature: 20, min_temp: 5, max_temp: 28, friendly_name: 'Heating', ...over,
  },
});

test('both cards are registered', () => {
  const win = boot();
  assert.ok(win.customElements.get('glowstat-thermometer-card'));
  assert.ok(win.customElements.get('glowstat-climate-card'));
  same(win.customCards.map((c) => c.type).sort(), ['glowstat-climate-card', 'glowstat-thermometer-card']);
});

test('thermometer shows value, humidity, battery and the comfort word', () => {
  const win = boot();
  const { hass } = mkHass({ 'sensor.t': tempState(21), 'sensor.h': plain(48), 'sensor.b': plain(80) });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', humidity_entity: 'sensor.h', battery_entity: 'sensor.b', show_sparkline: false, show_trend: false }, hass);
  assert.match(text(el, '.temp'), /21\.0 °C/);
  assert.equal(text(el, '.word'), 'Comfortable');
  assert.match(text(el, '.hum'), /48 %/);
  assert.match(text(el, '.bat'), /80 %/);
});

test('thermometer follows the card language, not only the Home Assistant language', () => {
  const win = boot();
  const { hass } = mkHass({ 'sensor.t': tempState(21) });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', language: 'hu', show_sparkline: false, show_trend: false }, hass);
  assert.equal(text(el, '.word'), 'Komfortos');
  assert.match(text(el, '.temp'), /21,0/);
});

test('a custom comfort range moves the words', () => {
  const win = boot();
  const { hass } = mkHass({ 'sensor.t': tempState(21) });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', comfort_min: 24, comfort_max: 26, show_sparkline: false, show_trend: false }, hass);
  assert.equal(text(el, '.word'), 'Cool');
});

test('high humidity shows the mold warning, the dew point appears on request', () => {
  const win = boot();
  const base = { entity: 'sensor.t', humidity_entity: 'sensor.h', show_sparkline: false, show_trend: false };
  const moldy = mkHass({ 'sensor.t': tempState(20), 'sensor.h': plain(75) });
  assert.equal(text(mount(win, 'glowstat-thermometer-card', base, moldy.hass), '.hsub'), 'Mold risk');
  const dry = mkHass({ 'sensor.t': tempState(20), 'sensor.h': plain(50) });
  assert.equal(text(mount(win, 'glowstat-thermometer-card', { ...base, show_dew_point: true }, dry.hass), '.hsub'), 'Dew point 9.3°');
  const off = mount(win, 'glowstat-thermometer-card', base, dry.hass);
  assert.equal(off.shadowRoot.querySelector('.hsub'), null);
});

test('clicking humidity, battery or anything else opens the matching sensor', () => {
  const win = boot();
  const { hass } = mkHass({ 'sensor.t': tempState(21), 'sensor.h': plain(48), 'sensor.b': plain(80) });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', humidity_entity: 'sensor.h', battery_entity: 'sensor.b', show_sparkline: false, show_trend: false }, hass);
  const seen = [];
  win.document.addEventListener('hass-more-info', (e) => seen.push(e.detail.entityId));
  click(win, el, '.hum');
  click(win, el, '.bat');
  click(win, el, '.temp');
  assert.deepEqual(seen, ['sensor.h', 'sensor.b', 'sensor.t']);
});

test('the trend arrow shows the change over the last hour', async () => {
  const win = boot();
  const now = Date.now();
  const iso = (minAgo) => new Date(now - minAgo * 60000).toISOString();
  const history = () => [[
    { state: '20.0', last_changed: iso(180) },
    { state: '20.5', last_changed: iso(90) },
    { state: '21.0', last_changed: iso(20) },
  ]];
  const { hass } = mkHass({ 'sensor.t': tempState(21.5) }, { history });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', show_sparkline: false }, hass);
  await tick();
  assert.match(text(el, '.trend'), /▲ \+1\.0°/);
});

test('without enough change the trend arrow is flat, and it can be switched off', async () => {
  const win = boot();
  const now = Date.now();
  const history = () => [[{ state: '21.0', last_changed: new Date(now - 180 * 60000).toISOString() }]];
  const { hass } = mkHass({ 'sensor.t': tempState(21.1) }, { history });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', show_sparkline: false }, hass);
  await tick();
  assert.equal(text(el, '.trend'), '→');
  const off = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', show_sparkline: false, show_trend: false }, hass);
  await tick();
  assert.equal(off.shadowRoot.querySelector('.trend'), null);
});

test('long histories come from the statistics, short ones from the history', async () => {
  const win = boot();
  const now = Date.now();
  const stats = () => ({ 'sensor.t': Array.from({ length: 30 }, (_, i) => ({ start: now - (30 - i) * 3600000, mean: 20 + (i % 5) })) });
  const m = mkHass({ 'sensor.t': tempState(22) }, { stats });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', history_hours: 168, show_trend: false }, m.hass);
  await tick();
  assert.equal(m.ws.length, 1);
  assert.equal(m.ws[0].type, 'recorder/statistics_during_period');
  assert.equal(m.ws[0].period, 'hour');
  assert.match(text(el, '.legend'), /168 h/);
  assert.equal(m.api.length, 0);

  const win2 = boot();
  const s = mkHass({ 'sensor.t': tempState(22) });
  mount(win2, 'glowstat-thermometer-card', { entity: 'sensor.t', history_hours: 24, show_trend: false }, s.hass);
  await tick();
  assert.equal(s.ws.length, 0);
  assert.equal(s.api.length, 1);
});

test('the statistics fall back to the raw history when they are empty', async () => {
  const win = boot();
  const m = mkHass({ 'sensor.t': tempState(22) }, { stats: () => ({}) });
  mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', history_hours: 100, show_trend: false }, m.hass);
  await tick();
  assert.equal(m.ws.length, 1);
  assert.equal(m.api.length, 1);
});

test('climate buttons come from the entity: presets for a heating', () => {
  const win = boot();
  const { hass } = mkHass({ 'climate.h': climateState() });
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.h' }, hass);
  const values = [...el.shadowRoot.querySelectorAll('.btn')].map((b) => b.dataset.value);
  assert.deepEqual(values, ['auto', 'manual', 'eco']);
  assert.equal(el.shadowRoot.querySelector('.btn.active').dataset.value, 'manual');
});

test('an explicit control list picks buttons one by one and skips values the entity does not have', () => {
  const win = boot();
  const { hass } = mkHass({ 'climate.ac': climateState({ hvac_modes: ['off', 'cool', 'heat'], fan_modes: ['auto', 'high'], fan_mode: 'high' }) });
  const el = mount(win, 'glowstat-climate-card', {
    entity: 'climate.ac',
    controls: ['hvac_mode:cool', 'fan_mode:high', 'fan_mode:nope', { type: 'hvac_mode', value: 'off', name: 'Stop', icon: 'mdi:stop', sub: 'now' }],
  }, hass);
  const btns = [...el.shadowRoot.querySelectorAll('.btn')];
  assert.deepEqual(btns.map((b) => `${b.dataset.kind}:${b.dataset.value}`), ['hvac_mode:cool', 'fan_mode:high', 'hvac_mode:off']);
  assert.equal(btns[2].querySelector('.bl').textContent, 'Stop');
  assert.equal(btns[2].querySelector('.bs').textContent, 'now');
  assert.ok(btns[1].classList.contains('active'));
});

test('an empty control list shows no buttons', () => {
  const win = boot();
  const { hass } = mkHass({ 'climate.h': climateState() });
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.h', controls: [] }, hass);
  assert.equal(el.shadowRoot.querySelectorAll('.btn').length, 0);
});

test('buttons call the matching climate service', () => {
  const win = boot();
  const m = mkHass({ 'climate.ac': climateState({ hvac_modes: ['off', 'cool'], fan_modes: ['auto', 'high'], swing_modes: ['off', 'vertical'], fan_mode: 'auto', swing_mode: 'off' }) });
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.ac', controls: ['hvac_mode:cool', 'preset_mode:eco', 'fan_mode:high', 'swing_mode:vertical'] }, m.hass);
  click(win, el, '.btn[data-kind="hvac_mode"]');
  click(win, el, '.btn[data-kind="fan_mode"]');
  click(win, el, '.btn[data-kind="swing_mode"]');
  same(m.calls.map((c) => [c[1], c[2]]), [
    ['set_hvac_mode', { entity_id: 'climate.ac', hvac_mode: 'cool' }],
    ['set_fan_mode', { entity_id: 'climate.ac', fan_mode: 'high' }],
    ['set_swing_mode', { entity_id: 'climate.ac', swing_mode: 'vertical' }],
  ]);
});

test('preset temperatures come from the entity and the card configuration wins', () => {
  const win = boot();
  const { hass } = mkHass({ 'climate.h': climateState({ preset_temperatures: { eco: 17, manual: 22 } }) });
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.h', preset_temperatures: { eco: 16 } }, hass);
  const sub = (v) => el.shadowRoot.querySelector(`.btn[data-value="${v}"] .bs`).textContent;
  assert.equal(sub('eco'), '16 °C');
  assert.equal(sub('manual'), '22 °C');
});

test('the target temperature steps are sent once, after a short delay', async () => {
  const win = boot();
  const m = mkHass({ 'climate.h': climateState() });
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.h' }, m.hass);
  click(win, el, '.plus');
  click(win, el, '.plus');
  assert.match(text(el, '.temp'), /22\.0/);
  assert.equal(m.calls.length, 0);
  await tick(650);
  assert.equal(m.calls.length, 1);
  same(m.calls[0][2], { entity_id: 'climate.h', temperature: 22 });
});

test('the glow pulses only while the device is actually working', () => {
  const win = boot();
  const on = mkHass({ 'climate.h': climateState({ hvac_action: 'heating' }) });
  const idle = mkHass({ 'climate.h': climateState({ hvac_action: 'idle' }) });
  const a = mount(win, 'glowstat-climate-card', { entity: 'climate.h' }, on.hass);
  const b = mount(win, 'glowstat-climate-card', { entity: 'climate.h' }, idle.hass);
  assert.ok(a.shadowRoot.querySelector('ha-card').classList.contains('live'));
  assert.ok(!b.shadowRoot.querySelector('ha-card').classList.contains('live'));
});

test('the cards can be used with the keyboard', () => {
  const win = boot();
  const m = mkHass({ 'climate.h': climateState() });
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.h' }, m.hass);
  const btn = el.shadowRoot.querySelector('.btn[data-value="eco"]');
  assert.equal(btn.getAttribute('tabindex'), '0');
  btn.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  same(m.calls[0][2], { entity_id: 'climate.h', preset_mode: 'eco' });

  const t = mkHass({ 'sensor.t': tempState(21) });
  const th = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', show_sparkline: false, show_trend: false }, t.hass);
  const seen = [];
  win.document.addEventListener('hass-more-info', (e) => seen.push(e.detail.entityId));
  th.shadowRoot.querySelector('ha-card').dispatchEvent(new win.KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));
  assert.deepEqual(seen, ['sensor.t']);
});

test('a missing entity does not break the climate card', () => {
  const win = boot();
  const { hass } = mkHass({});
  const el = mount(win, 'glowstat-climate-card', { entity: 'climate.gone' }, hass);
  assert.match(text(el, '.name'), /climate\.gone/);
});

test('the card name is escaped', () => {
  const win = boot();
  const { hass } = mkHass({ 'sensor.t': tempState(21) });
  const el = mount(win, 'glowstat-thermometer-card', { entity: 'sensor.t', name: '<img src=x onerror=alert(1)>', show_sparkline: false, show_trend: false }, hass);
  assert.equal(el.shadowRoot.querySelector('img'), null);
  assert.match(text(el, '.name'), /<img src=x/);
});
