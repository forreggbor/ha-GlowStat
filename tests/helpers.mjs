/**
 * Shared test helpers: the built bundle is loaded into a fresh jsdom window per test and driven
 * with a mock `hass` object.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { JSDOM } from 'jsdom';

const BUNDLE = new Script(readFileSync(new URL('../dist/ha-glowstat.js', import.meta.url), 'utf8'));
export const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
/** Objects created inside the jsdom window have another prototype; compare their plain JSON form. */
export const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

/** A fresh window with the bundle loaded. */
export function boot() {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'http://localhost/' });
  BUNDLE.runInContext(dom.getInternalVMContext());
  return dom.window;
}

/** Mock hass; `calls` collects service calls, `api`/`ws` collect history requests. */
export function mkHass(states, extra = {}) {
  const calls = [];
  const api = [];
  const ws = [];
  const hass = {
    states,
    language: 'en',
    locale: { language: 'en' },
    config: { unit_system: { temperature: '°C' } },
    callService: async (domain, service, data) => { calls.push([domain, service, data]); },
    callApi: async (method, path) => { api.push(path); return extra.history ? extra.history(path) : [[]]; },
    callWS: async (msg) => { ws.push(msg); return extra.stats ? extra.stats(msg) : {}; },
  };
  return { hass, calls, api, ws };
}

export const tempState = (v, unit = '°C') => ({ state: String(v), attributes: { unit_of_measurement: unit, device_class: 'temperature', friendly_name: 'Living' } });
export const plain = (v) => ({ state: String(v), attributes: { friendly_name: 'x' } });

export function mount(win, tag, config, hass) {
  const el = win.document.createElement(tag);
  el.setConfig(config);
  el.hass = hass;
  win.document.body.appendChild(el);
  return el;
}

export const text = (el, sel) => (sel ? el.shadowRoot?.querySelector(sel) ?? el.querySelector(sel) : el)?.textContent.replace(/\s+/g, ' ').trim();
export const click = (win, el, sel) => el.shadowRoot.querySelector(sel).dispatchEvent(new win.MouseEvent('click', { bubbles: true, composed: true }));

