/* GlowStat v0.2.1 - MIT - https://github.com/forreggbor/ha-GlowStat */
(() => {
const GS_VERSION = '0.2.1';
/**
 * Shared helpers for all GlowStat cards: temperature color scale,
 * translations, escaping and small DOM utilities.
 */

/** Temperature color stops in °C: [temperature, [r, g, b]]. */
const GS_STOPS = [
  [-10, [92, 146, 255]],
  [8, [0, 213, 255]],
  [20, [0, 168, 28]],
  [22, [0, 168, 28]],
  [30, [255, 174, 0]],
  [38, [255, 0, 0]],
];

/**
 * Interpolated RGB color for a temperature in °C.
 * @param {number} celsius Temperature in °C (NaN gives neutral gray).
 * @returns {number[]} [r, g, b]
 */
function gsColor(celsius) {
  if (isNaN(celsius)) return [150, 150, 150];
  const S = GS_STOPS;
  if (celsius <= S[0][0]) return S[0][1];
  if (celsius >= S[S.length - 1][0]) return S[S.length - 1][1];
  for (let i = 0; i < S.length - 1; i++) {
    if (celsius >= S[i][0] && celsius <= S[i + 1][0]) {
      const f = (celsius - S[i][0]) / (S[i + 1][0] - S[i][0]);
      return S[i][1].map((x, k) => Math.round(x + (S[i + 1][1][k] - x) * f));
    }
  }
  return [150, 150, 150];
}

/** Translations. Add a language by adding a block; English is the fallback. */
const GS_I18N = {
  en: {
    hot: 'Hot',
    warm: 'Warm',
    pleasant: 'Pleasantly warm',
    comfortable: 'Comfortable',
    cool: 'Cool',
    cold: 'Cold',
    freezing: 'Freezing',
    no_data: 'No data',
    loading: 'loading…',
    not_enough: 'not enough data',
    hours: 'h',
    entity: 'Temperature sensor',
    name: 'Name',
    humidity_entity: 'Humidity sensor (optional)',
    battery_entity: 'Battery sensor (optional)',
    show_sparkline: 'Show history graph',
    history_hours: 'History length (hours)',
    show_background_emoji: 'Show background emoji',
    language: 'Language',
    language_auto: 'Automatic (Home Assistant)',
    language_hu: 'Magyar',
    language_en: 'English',
  },
  hu: {
    hot: 'Forró',
    warm: 'Meleg',
    pleasant: 'Kellemesen meleg',
    comfortable: 'Komfortos',
    cool: 'Hűvös',
    cold: 'Hideg',
    freezing: 'Fagyos',
    no_data: 'Nincs adat',
    loading: 'betöltés…',
    not_enough: 'nincs elég adat',
    hours: 'óra',
    entity: 'Hőmérséklet szenzor',
    name: 'Név',
    humidity_entity: 'Páratartalom szenzor (opcionális)',
    battery_entity: 'Elem szenzor (opcionális)',
    show_sparkline: 'Előzmény grafikon megjelenítése',
    history_hours: 'Előzmény hossza (óra)',
    show_background_emoji: 'Háttér emoji megjelenítése',
    language: 'Nyelv',
    language_auto: 'Automatikus (Home Assistant)',
    language_hu: 'Magyar',
    language_en: 'English',
  },
};

/**
 * Language object for a card: the card's own `language` setting wins over the
 * Home Assistant UI language. The result can be passed to gsT() and gsNum().
 * @param {object} hass Home Assistant object (may be undefined early on).
 * @param {object} cfg Card configuration (may be undefined early on).
 * @returns {{language: string, locale: {language: string}}}
 */
function gsLangObj(hass, cfg) {
  const own = cfg && cfg.language && cfg.language !== 'auto' ? cfg.language : null;
  const lang = own || (hass && hass.language) || 'en';
  return { language: lang, locale: { language: lang } };
}

/**
 * Translate a key using the Home Assistant UI language.
 * @param {object} hass Home Assistant object.
 * @param {string} key Translation key.
 * @returns {string}
 */
function gsT(hass, key) {
  const lang = ((hass && hass.language) || 'en').split('-')[0];
  return (GS_I18N[lang] && GS_I18N[lang][key]) || GS_I18N.en[key] || key;
}

/**
 * Escape a string for safe use inside HTML text or attribute values.
 * @param {*} value Any value.
 * @returns {string}
 */
function gsEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

/**
 * Replace the content of a node with parsed markup. Parsing goes through
 * DOMParser, so no script can run; every dynamic value passed in by the cards
 * is escaped with gsEsc() or is a number.
 * @param {ParentNode} root Target node (e.g. a shadow root).
 * @param {string} html Markup to render.
 */
function gsSetHtml(root, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  root.replaceChildren(...doc.head.childNodes, ...doc.body.childNodes);
}

/**
 * Dispatch a Home Assistant style custom event.
 * @param {HTMLElement} node Event source.
 * @param {string} type Event type.
 * @param {object} detail Event detail.
 */
function gsFire(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/**
 * Format a number with the user's locale and fixed decimals.
 * @param {object} hass Home Assistant object.
 * @param {number} value Number to format.
 * @param {number} decimals Fraction digits.
 * @returns {string}
 */
function gsNum(hass, value, decimals) {
  const lang = (hass && ((hass.locale && hass.locale.language) || hass.language)) || 'en';
  return value.toLocaleString(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Register a card in the Home Assistant card picker. */
function gsRegisterCard(info) {
  window.customCards = window.customCards || [];
  window.customCards.push({ preview: true, ...info });
}

/** Schema entry and helper for the shared language selector in the editors. */
function gsLanguageField(hass) {
  return {
    name: 'language',
    selector: {
      select: {
        mode: 'dropdown',
        options: ['auto', 'hu', 'en'].map((v) => ({ value: v, label: gsT(hass, 'language_' + v) })),
      },
    },
  };
}
/**
 * glowstat-thermometer-card: temperature card with state-colored glow,
 * humidity, battery, scale bar, 24 h sparkline and an animated background emoji.
 */

/** History cache shared by all card instances, keyed by entity + hours. */
const GS_HIST = {};
const GS_LS_PREFIX = 'glowstat:hist:';
const GS_LS_MAX_AGE_MS = 6 * 3600 * 1000;
const GS_REFRESH_MS = 5 * 60 * 1000;
const GS_BUSY_TIMEOUT_MS = 30 * 1000;

const GS_THERMO_CSS = `
  :host { display: block; }
  ha-card { display: block; height: 100%; overflow: hidden; position: relative; cursor: pointer; }
  .card {
    position: relative; box-sizing: border-box; height: 100%; min-height: 176px; padding: 10px;
    display: grid; gap: 8px; align-items: center; align-content: space-between;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'head head bat' 'temp spark hum' 'bar bar bar';
  }
  .card > * { position: relative; z-index: 1; }
  .card > .bgicon {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 0; overflow: hidden;
  }
  .bgicon > div { font-size: 120px; line-height: 1; opacity: 0.15; }
  .head { grid-area: head; justify-self: start; text-align: left; }
  .name { font-weight: 600; font-size: 14px; }
  .word { font-size: 12px; }
  .bat { grid-area: bat; justify-self: end; align-self: start; display: flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 500; }
  .temp { grid-area: temp; justify-self: start; font-size: 22px; font-weight: 400; line-height: 1; }
  .temp small { font-size: 18px; }
  .hum { grid-area: hum; justify-self: end; display: flex; align-items: center; gap: 2px; font-size: 22px; font-weight: 400; }
  ha-icon { --mdc-icon-size: 18px; }
  .hum ha-icon { --mdc-icon-size: 22px; }
  .spark { grid-area: spark; width: 100%; min-width: 0; justify-self: stretch; }
  .spark .msg { font-size: 10px; text-align: center; color: var(--secondary-text-color); }
  .spark .err { font-size: 10px; text-align: center; color: var(--error-color, #ef5350); }
  .spark .plot { position: relative; height: 40px; }
  .spark svg { width: 100%; height: 40px; display: block; overflow: visible; }
  .spark .dot { position: absolute; right: 0; width: 8px; height: 8px; border-radius: 50%; transform: translate(50%, -50%); }
  .spark .legend { display: flex; justify-content: space-between; margin-top: 2px; font-size: 10px; color: var(--secondary-text-color); }
  .bar { grid-area: bar; width: 100%; padding: 8px 8px 0 8px; box-sizing: border-box; }
  .bar .track { position: relative; height: 8px; border-radius: 4px; }
  .bar .marker {
    position: absolute; top: 50%; width: 14px; height: 14px; box-sizing: border-box;
    transform: translate(-50%, -50%); border-radius: 50%; background: #fff; border-width: 3px; border-style: solid;
  }
  .bar .scale { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: var(--secondary-text-color); }
  @keyframes shiver { 0%,100% { transform: translateX(0) rotate(0) } 20% { transform: translateX(-4px) rotate(-5deg) } 40% { transform: translateX(4px) rotate(5deg) } 60% { transform: translateX(-4px) rotate(-4deg) } 80% { transform: translateX(4px) rotate(4deg) } }
  @keyframes waddle { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(7deg) } }
  @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
  @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.1) } }
  @media (prefers-reduced-motion: reduce) { .bgicon > div { animation: none !important; } }
`;

class GlowStatThermometerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._uid = 'gs' + Math.random().toString(36).slice(2, 8);
    this._sig = '';
    this._histKey = null;
  }

  static getConfigElement() {
    return document.createElement('glowstat-thermometer-card-editor');
  }

  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const entity = Object.keys(states).find((id) => (
      id.startsWith('sensor.') && states[id].attributes.device_class === 'temperature'
    ));
    return { entity: entity || 'sensor.temperature' };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('GlowStat: "entity" is required');
    }
    this._config = {
      show_sparkline: true,
      show_background_emoji: true,
      history_hours: 24,
      ...config,
    };
    this._sig = '';
    this._unsubscribeHistory();
    this._paint();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._paint();
    }
    this._ensureHistory();
  }

  connectedCallback() {
    this._ensureHistory();
  }

  disconnectedCallback() {
    this._unsubscribeHistory();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 4 };
  }

  /** Signature of everything that affects the rendering except history. */
  _signature() {
    if (!this._hass || !this._config) return '';
    const c = this._config;
    const ids = [c.entity, c.humidity_entity, c.battery_entity].filter(Boolean);
    const parts = ids.map((id) => {
      const s = this._hass.states[id];
      return s ? s.state + '/' + (s.attributes.unit_of_measurement || '') : '∅';
    });
    return parts.join('|') + '|' + gsLangObj(this._hass, this._config).language;
  }

  _unsubscribeHistory() {
    if (this._histKey && GS_HIST[this._histKey]) {
      GS_HIST[this._histKey].subs.delete(this);
    }
    this._histKey = null;
  }

  /** Load the history for the sparkline if missing or stale; shared across cards. */
  _ensureHistory() {
    const c = this._config;
    const hass = this._hass;
    if (!c || !hass || !c.show_sparkline) return;

    const hours = Math.max(1, Number(c.history_hours) || 24);
    const key = c.entity + '@' + hours;
    if (this._histKey !== key) {
      this._unsubscribeHistory();
      this._histKey = key;
    }
    const cache = (GS_HIST[key] = GS_HIST[key] || { subs: new Set(), init: false });
    cache.subs.add(this);

    if (!cache.init) {
      cache.init = true;
      try {
        const saved = JSON.parse(localStorage.getItem(GS_LS_PREFIX + key) || 'null');
        if (saved && saved.pts && Date.now() - saved.t < GS_LS_MAX_AGE_MS) {
          Object.assign(cache, { pts: saved.pts, start: saved.start, end: saved.end, t: saved.t });
          this._paint();
        }
      } catch (e) {
        console.error('GlowStat: cannot read the local history cache', e);
      }
    }

    const stale = !cache.t || Date.now() - cache.t > GS_REFRESH_MS;
    const idle = !cache.busy || Date.now() - cache.busyAt > GS_BUSY_TIMEOUT_MS;
    if (!stale || !idle) return;
    if (typeof hass.callApi !== 'function') {
      cache.err = 'hass.callApi is not available';
      console.error('GlowStat: hass.callApi is not available, cannot load history for ' + c.entity);
      this._paint();
      return;
    }

    cache.busy = true;
    cache.busyAt = Date.now();
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    const path = 'history/period/' + start.toISOString()
      + '?filter_entity_id=' + encodeURIComponent(c.entity)
      + '&end_time=' + encodeURIComponent(end.toISOString())
      + '&minimal_response&no_attributes&significant_changes_only=0';

    const finish = () => {
      cache.busy = false;
      cache.t = Date.now();
      cache.subs.forEach((card) => {
        try {
          card._paint();
        } catch (e) {
          console.error('GlowStat: repaint failed', e);
        }
      });
    };

    try {
      hass.callApi('GET', path).then((r) => {
        const rows = (r && r[0]) || [];
        cache.pts = rows
          .map((p) => [Date.parse(p.last_changed || p.last_updated) / 1000, parseFloat(p.state)])
          .filter((p) => !isNaN(p[0]) && !isNaN(p[1]));
        cache.start = start.getTime() / 1000;
        cache.end = end.getTime() / 1000;
        cache.err = null;
        try {
          localStorage.setItem(GS_LS_PREFIX + key, JSON.stringify({
            t: Date.now(), start: cache.start, end: cache.end, pts: cache.pts,
          }));
        } catch (e) {
          console.error('GlowStat: cannot save the local history cache', e);
        }
      }).catch((e) => {
        cache.err = (e && (e.message || e.error)) || String(e);
        console.error('GlowStat: history request failed for ' + c.entity, e);
      }).finally(finish);
    } catch (e) {
      cache.err = (e && e.message) || String(e);
      console.error('GlowStat: history request could not start for ' + c.entity, e);
      cache.busy = false;
      cache.t = Date.now() - GS_REFRESH_MS + 60000; // retry in about a minute
    }
  }

  /** Build the sparkline markup from the cached history. */
  _sparkHtml(rgb) {
    const hass = gsLangObj(this._hass, this._config);
    const cache = GS_HIST[this._histKey] || {};
    const pts = cache.pts || [];
    if (pts.length < 2) {
      if (cache.err) return `<div class="err">⚠ ${gsEsc(cache.err)}</div>`;
      return `<div class="msg">${gsEsc(gsT(hass, (cache.busy || !cache.t) ? 'loading' : 'not_enough'))}</div>`;
    }
    const c = rgb.join(',');
    const N = 72;
    const span = cache.end - cache.start;
    const arr = new Array(N).fill(null);
    pts.forEach((p) => {
      const i = Math.min(N - 1, Math.max(0, Math.floor((p[0] - cache.start) / span * N)));
      arr[i] = p[1];
    });
    let last = pts[0][1];
    for (let i = 0; i < N; i++) {
      if (arr[i] === null) arr[i] = last; else last = arr[i];
    }
    const mn = Math.min(...arr);
    const mx = Math.max(...arr);
    const lo = mn - 0.4;
    const hi = mx + 0.4;
    const W = 120;
    const H = 40;
    const X = (i) => (i / (N - 1) * W).toFixed(1);
    const Y = (val) => (H - (val - lo) / (hi - lo) * H).toFixed(1);
    const line = arr.map((val, i) => (i === 0 ? 'M' : 'L') + X(i) + ',' + Y(val)).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    const ey = (H - (arr[N - 1] - lo) / (hi - lo) * H) / H * 100;
    const hours = Math.max(1, Number(this._config.history_hours) || 24);
    return `<div class="plot">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs><linearGradient id="${this._uid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgb(${c})" stop-opacity="0.35"></stop>
            <stop offset="1" stop-color="rgb(${c})" stop-opacity="0"></stop>
          </linearGradient></defs>
          <path d="${area}" fill="url(#${this._uid})" stroke="none"></path>
          <path d="${line}" fill="none" stroke="rgb(${c})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
        </svg>
        <div class="dot" style="top:${ey}%;background:rgb(${c});box-shadow:0 0 6px rgba(${c},0.9)"></div>
      </div>
      <div class="legend"><span>▼ ${gsNum(hass, mn, 1)}°</span><span>${hours} ${gsEsc(gsT(hass, 'hours'))}</span><span>▲ ${gsNum(hass, mx, 1)}°</span></div>`;
  }

  _paint() {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const L = gsLangObj(hass, cfg);

    const st = hass.states[cfg.entity];
    const raw = st ? parseFloat(st.state) : NaN;
    const ok = !isNaN(raw);
    const unit = (st && st.attributes.unit_of_measurement) || '°C';
    const isF = unit === '°F';
    const celsius = ok ? (isF ? (raw - 32) * 5 / 9 : raw) : NaN;
    const toDisp = (cv) => Math.round(isF ? cv * 9 / 5 + 32 : cv);

    const rgb = gsColor(celsius);
    const c = rgb.join(',');
    const name = cfg.name || (st && st.attributes.friendly_name) || cfg.entity;

    let word = 'no_data';
    if (ok) {
      word = celsius >= 30 ? 'hot' : celsius >= 26 ? 'warm' : celsius >= 23 ? 'pleasant'
        : celsius >= 20 ? 'comfortable' : celsius >= 16 ? 'cool' : celsius >= 0 ? 'cold' : 'freezing';
    }

    // Battery
    let batHtml = '';
    const bst = cfg.battery_entity && hass.states[cfg.battery_entity];
    const b = bst ? parseFloat(bst.state) : NaN;
    if (!isNaN(b)) {
      const icon = b >= 95 ? 'mdi:battery' : 'mdi:battery-' + Math.max(10, Math.round(b / 10) * 10);
      const col = b < 20 ? '#ef5350' : b < 40 ? '#ffa726' : 'var(--secondary-text-color)';
      batHtml = `<div class="bat" data-entity="${gsEsc(cfg.battery_entity)}" style="color:${col}"><ha-icon icon="${icon}"></ha-icon>${Math.round(b)} %</div>`;
    }

    // Humidity
    let humHtml = '';
    const hst = cfg.humidity_entity && hass.states[cfg.humidity_entity];
    const h = hst ? parseFloat(hst.state) : NaN;
    if (!isNaN(h)) {
      const col = h >= 40 && h <= 60 ? '#42a5f5' : '#ffa726';
      humHtml = `<div class="hum" data-entity="${gsEsc(cfg.humidity_entity)}" style="color:${col}"><ha-icon icon="mdi:water-percent"></ha-icon>${Math.round(h)} %</div>`;
    }

    // Scale bar (dynamic range around the value)
    const lo = ok ? Math.min(10, Math.floor((celsius - 2) / 2) * 2) : 10;
    const hi = ok ? Math.max(32, Math.ceil((celsius + 2) / 2) * 2) : 32;
    const spanC = hi - lo;
    const pos = (t) => ((t - lo) / spanC * 100).toFixed(1);
    const pct = ok ? Math.min(100, Math.max(0, (celsius - lo) / spanC * 100)) : 0;
    const grad = 'linear-gradient(90deg, '
      + GS_STOPS.map((s) => 'rgb(' + s[1].join(',') + ') ' + pos(s[0]) + '%').join(', ') + ')';

    // Background emoji
    let bgHtml = '';
    if (cfg.show_background_emoji !== false) {
      const E = !ok ? ['❔', ''] : celsius < 0 ? ['🧊', 'shiver'] : celsius < 10 ? ['🐧', 'waddle']
        : celsius < 16 ? ['🧣', 'bob'] : celsius < 20 ? ['🧥', 'bob'] : celsius < 23 ? ['😎', 'bob']
          : celsius < 26 ? ['🌤️', 'bob'] : celsius < 30 ? ['🥵', 'pulse'] : ['🔥', 'pulse'];
      const dur = { shiver: '0.5s', waddle: '1.4s', bob: '2.8s', pulse: '1.1s' }[E[1]] || '2s';
      const anim = E[1] ? `animation:${E[1]} ${dur} ease-in-out infinite` : '';
      bgHtml = `<div class="bgicon"><div style="${anim}">${E[0]}</div></div>`;
    }

    const sparkHtml = cfg.show_sparkline
      ? `<div class="spark">${this._sparkHtml(rgb)}</div>` : '';

    const bg = ok
      ? `radial-gradient(circle at 30% 45%, rgba(${c},0.20) 0%, rgba(${c},0.06) 60%, var(--ha-card-background, var(--card-background-color)) 100%)`
      : 'var(--ha-card-background, var(--card-background-color))';
    const border = ok ? `1px solid rgba(${c},0.35)` : '1px solid var(--ha-card-border-color, var(--divider-color))';

    gsSetHtml(this.shadowRoot, `
      <style>${GS_THERMO_CSS}</style>
      <ha-card style="background:${bg};border:${border}">
        <div class="card">
          ${bgHtml}
          <div class="head"><div class="name">${gsEsc(name)}</div><div class="word" style="color:rgb(${c})">${gsEsc(gsT(L, word))}</div></div>
          ${batHtml}
          <div class="temp" style="color:rgb(${c})">${ok ? gsNum(L, raw, 1) : '–'}<small> ${gsEsc(unit)}</small></div>
          ${sparkHtml}
          ${humHtml}
          <div class="bar">
            <div class="track" style="background:${grad}">
              <div class="marker" style="left:${pct}%;border-color:rgb(${c});box-shadow:0 0 6px rgba(${c},0.8)"></div>
            </div>
            <div class="scale"><span>${toDisp(lo)}°</span><span>${toDisp(hi)}°</span></div>
          </div>
        </div>
      </ha-card>`);

    const card = this.shadowRoot.querySelector('ha-card');
    // The more-info dialog opens for the element that was clicked: battery, humidity or (default) temperature.
    card.addEventListener('click', (ev) => {
      const el = ev.composedPath().find((n) => n.dataset && n.dataset.entity);
      gsFire(this, 'hass-more-info', { entityId: el ? el.dataset.entity : cfg.entity });
    });
  }
}

/** GUI editor for the thermometer card. */
class GlowStatThermometerCardEditor extends HTMLElement {
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
      { name: 'entity', required: true, selector: { entity: { domain: 'sensor', device_class: 'temperature' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'humidity_entity', selector: { entity: { domain: 'sensor', device_class: 'humidity' } } },
      { name: 'battery_entity', selector: { entity: { domain: 'sensor', device_class: 'battery' } } },
      { name: 'show_sparkline', selector: { boolean: {} } },
      { name: 'history_hours', selector: { number: { min: 1, max: 168, step: 1, mode: 'box' } } },
      { name: 'show_background_emoji', selector: { boolean: {} } },
      gsLanguageField(this._hass),
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name);
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
    this._form.data = {
      show_sparkline: true,
      show_background_emoji: true,
      history_hours: 24,
      language: 'auto',
      ...this._config,
    };
  }
}

customElements.define('glowstat-thermometer-card', GlowStatThermometerCard);
customElements.define('glowstat-thermometer-card-editor', GlowStatThermometerCardEditor);
gsRegisterCard({
  type: 'glowstat-thermometer-card',
  name: 'GlowStat Thermometer',
  description: 'Glowing temperature card with humidity, battery, scale and 24 h history.',
});
/**
 * glowstat-climate-card: compact climate card (heating or air conditioner) with a
 * state-colored glow, target temperature +/- buttons and control buttons that are
 * built from the modes the entity reports (HVAC, preset, fan, swing) and picked one by one.
 */

Object.assign(GS_I18N.en, {
  c_heating: 'Heating', c_cooling: 'Cooling', c_drying: 'Drying', c_fan: 'Fan',
  c_idle: 'Idle', c_off: 'Off', c_defrosting: 'Defrosting', c_preheating: 'Preheating',
  m_off: 'Off', m_auto: 'Auto', m_heat_cool: 'Heat/Cool', m_heat: 'Heat', m_cool: 'Cool', m_dry: 'Dry', m_fan_only: 'Fan',
  s_off: 'Off', s_auto: 'Automatic', s_heat_cool: 'Heat/Cool', s_heat: 'Heating', s_cool: 'Cooling', s_dry: 'Drying', s_fan_only: 'Fan',
  p_auto: 'Auto', p_manual: 'Manual', p_comfort: 'Comfort', p_eco: 'Eco', p_away: 'Away', p_home: 'Home',
  p_sleep: 'Sleep', p_boost: 'Boost', p_none: 'None', p_activity: 'Activity',
  controls: 'Control buttons', k_hvac_mode: 'Mode', k_preset_mode: 'Preset', k_fan_mode: 'Fan', k_swing_mode: 'Swing',
  icon: 'Icon', climate_entity: 'Climate entity', set_failed: 'Could not change the climate setting',
  ms_off: 'off', ms_auto: 'automatic', ms_heat_cool: 'switch', ms_heat: 'warm', ms_cool: 'cold', ms_dry: 'dehumidify', ms_fan_only: 'fan',
  ps_auto: 'schedule', ps_manual: 'manual', preset_temperatures: 'Preset temperatures',
});
Object.assign(GS_I18N.hu, {
  c_heating: 'Fűt', c_cooling: 'Hűt', c_drying: 'Szárít', c_fan: 'Ventilál',
  c_idle: 'Pihen', c_off: 'Kikapcsolva', c_defrosting: 'Leolvasztás', c_preheating: 'Előfűtés',
  m_off: 'Ki', m_auto: 'Auto', m_heat_cool: 'Fűt/hűt', m_heat: 'Fűtés', m_cool: 'Hűtés', m_dry: 'Szárít', m_fan_only: 'Ventil.',
  s_off: 'Kikapcsolva', s_auto: 'Automata', s_heat_cool: 'Fűtés/hűtés', s_heat: 'Fűtés', s_cool: 'Hűtés', s_dry: 'Szárítás', s_fan_only: 'Ventilátor',
  p_auto: 'Auto', p_manual: 'Manual', p_comfort: 'Komfort', p_eco: 'Eco', p_away: 'Távol', p_home: 'Otthon',
  p_sleep: 'Alvás', p_boost: 'Boost', p_none: 'Nincs', p_activity: 'Aktív',
  controls: 'Vezérlő gombok', k_hvac_mode: 'Üzemmód', k_preset_mode: 'Előbeállítás', k_fan_mode: 'Ventilátor', k_swing_mode: 'Lengés',
  icon: 'Ikon', climate_entity: 'Klíma entitás', set_failed: 'A beállítás módosítása nem sikerült',
  ms_off: 'kikapcs.', ms_auto: 'automata', ms_heat_cool: 'váltó', ms_heat: 'meleg', ms_cool: 'hideg', ms_dry: 'párátlan', ms_fan_only: 'ventilátor',
  ps_auto: 'program', ps_manual: 'kézi', preset_temperatures: 'Előbeállítás hőfokok',
});

const GS_MODE_RGB = {
  cool: '66,165,245', heat: '255,112,67', dry: '38,166,154',
  auto: '102,187,106', heat_cool: '102,187,106', fan_only: '144,164,174',
};
const GS_ACTION_MODE = { heating: 'heat', preheating: 'heat', cooling: 'cool', drying: 'dry', fan: 'fan_only' };
const GS_MODE_ICON = {
  off: 'mdi:power', auto: 'mdi:thermostat-auto', heat_cool: 'mdi:sun-snowflake-variant',
  heat: 'mdi:fire', cool: 'mdi:snowflake', dry: 'mdi:water-percent', fan_only: 'mdi:fan',
};
const GS_PRESET_ICON = {
  auto: 'mdi:calendar-clock', manual: 'mdi:hand-back-right', comfort: 'mdi:sofa', eco: 'mdi:leaf',
  away: 'mdi:car', home: 'mdi:home', sleep: 'mdi:sleep', boost: 'mdi:rocket-launch',
  none: 'mdi:cancel', activity: 'mdi:run',
};

/**
 * Button kinds a climate entity can offer. `list` is the entity attribute that lists the
 * available values, `service` the climate service that sets one, `active` reads the current
 * value. A button is addressed as "<kind>:<value>"; the service field is named like the kind.
 */
const GS_BUTTON_KINDS = {
  hvac_mode: { list: 'hvac_modes', service: 'set_hvac_mode', icon: 'mdi:thermostat', active: (st) => st.state },
  preset_mode: { list: 'preset_modes', service: 'set_preset_mode', icon: 'mdi:tune', active: (st) => st.attributes.preset_mode },
  fan_mode: { list: 'fan_modes', service: 'set_fan_mode', icon: 'mdi:fan', active: (st) => st.attributes.fan_mode },
  swing_mode: { list: 'swing_modes', service: 'set_swing_mode', icon: 'mdi:arrow-oscillating', active: (st) => st.attributes.swing_mode },
};

/** Key of a configured button: "<kind>:<value>" (a string, or an object with type and value). */
function gsControlKey(item) {
  return typeof item === 'string' ? item : item.type + ':' + item.value;
}

/** Normalize a configured button to {kind, value, name?, icon?, sub?}. */
function gsParseControl(item) {
  if (typeof item === 'string') {
    const i = item.indexOf(':');
    return { kind: item.slice(0, i), value: item.slice(i + 1) };
  }
  return { ...item, kind: item.type };
}

/**
 * Buttons shown when `controls` is not an explicit list (also the legacy string values
 * 'auto', 'presets', 'hvac_modes', 'none'). Everything comes from the entity's own lists.
 */
function gsDefaultControls(st, mode) {
  const modes = st.attributes.hvac_modes || [];
  const hvac = [...modes.filter((m) => m === 'off'), ...modes.filter((m) => m !== 'off')].map((m) => 'hvac_mode:' + m);
  const presets = (st.attributes.preset_modes || []).map((p) => 'preset_mode:' + p);
  if (mode === 'none') return [];
  if (mode === 'presets') return presets;
  if (mode === 'hvac_modes') return hvac;
  return modes.length > 2 ? hvac : (presets.length ? presets : hvac);
}

/** Label of a button value: own translation first, then Home Assistant's formatter, then the raw value. */
function gsButtonLabel(hass, L, st, kind, value) {
  const prefix = { hvac_mode: 'm_', preset_mode: 'p_' }[kind];
  if (prefix) {
    const own = gsT(L, prefix + value);
    if (own !== prefix + value) return own;
  }
  try {
    if (kind === 'hvac_mode' && typeof hass.formatEntityState === 'function') return hass.formatEntityState(st, value);
    if (typeof hass.formatEntityAttributeValue === 'function') return hass.formatEntityAttributeValue(st, kind, value);
  } catch (e) {
    console.error('GlowStat: cannot format ' + kind + ' ' + value, e);
  }
  return value;
}

const GS_CLIMATE_CSS = `
  :host { display: block; }
  ha-card { display: block; height: 100%; overflow: hidden; position: relative; }
  .card {
    box-sizing: border-box; height: 100%; min-height: 176px; padding: 10px;
    display: grid; gap: 8px; align-items: center; align-content: space-between;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'head head cur' 'minus temp plus' 'btns btns btns';
  }
  .more { cursor: pointer; }
  .head { grid-area: head; justify-self: start; display: flex; align-items: center; gap: 10px; text-align: left; }
  .head ha-icon { --mdc-icon-size: 26px; }
  .name { font-weight: 600; font-size: 14px; }
  .status { font-size: 12px; }
  .cur { grid-area: cur; justify-self: end; align-self: start; display: flex; align-items: center; gap: 2px; font-size: 16px; font-weight: 600; }
  .cur ha-icon { --mdc-icon-size: 18px; }
  .temp { grid-area: temp; justify-self: center; font-size: 24px; font-weight: 300; line-height: 1; }
  .rb {
    width: 44px; height: 44px; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; border: 1px solid var(--divider-color); cursor: pointer; user-select: none;
  }
  .rb ha-icon { --mdc-icon-size: 22px; }
  .rb.disabled { opacity: 0.35; pointer-events: none; }
  .rb:active { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .minus { grid-area: minus; justify-self: start; }
  .plus { grid-area: plus; justify-self: end; }
  .btns { grid-area: btns; width: 100%; display: grid; gap: 2px; grid-template-columns: repeat(auto-fit, minmax(46px, 1fr)); }
  .btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    padding: 5px 2px; border-radius: 14px; cursor: pointer; user-select: none; min-width: 0;
    color: var(--primary-text-color); font-size: 11px; font-weight: 500; text-align: center;
  }
  .btn span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .btn .bs { font-size: 10px; font-weight: 400; opacity: 0.7; }
  .btn ha-icon { --mdc-icon-size: 22px; color: var(--secondary-text-color); }
  .btn.active { background: color-mix(in srgb, var(--primary-color) 22%, transparent); color: var(--primary-color); }
  .btn.active ha-icon { color: var(--primary-color); }
`;

class GlowStatClimateCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = '';
    this._pending = null;
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
  }

  static getConfigElement() {
    return document.createElement('glowstat-climate-card-editor');
  }

  static getStubConfig(hass) {
    const entity = Object.keys((hass && hass.states) || {}).find((id) => id.startsWith('climate.'));
    return { entity: entity || 'climate.thermostat' };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('GlowStat: "entity" is required');
    }
    this._config = { ...config };
    this._sig = '';
    this._paint();
  }

  set hass(hass) {
    this._hass = hass;
    const st = hass.states[this._config && this._config.entity];
    if (this._pending !== null && st && Math.abs(Number(st.attributes.temperature) - this._pending) < 1e-6) {
      this._pending = null;
    }
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._paint();
    }
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 4 };
  }

  _signature() {
    if (!this._hass || !this._config) return '';
    const st = this._hass.states[this._config.entity];
    if (!st) return '∅|' + gsLangObj(this._hass, this._config).language;
    const a = st.attributes;
    return [st.state, a.hvac_action, a.preset_mode, a.temperature, a.current_temperature, a.min_temp, a.max_temp,
      this._pending, gsLangObj(this._hass, this._config).language, JSON.stringify(this._config.preset_temperatures || {})].join('|');
  }

  _stepOf(a) {
    if (a.target_temp_step) return Number(a.target_temp_step);
    return 0.5;
  }

  /** Mode key that decides the glow color, or null for a neutral card. */
  _colorMode(st) {
    const a = st.attributes;
    if (a.hvac_action !== undefined && a.hvac_action !== null) {
      return GS_ACTION_MODE[a.hvac_action] || null;
    }
    return st.state !== 'off' && GS_MODE_RGB[st.state] ? st.state : null;
  }

  _statusText(st) {
    const hass = gsLangObj(this._hass, this._config);
    const a = st.attributes;
    if (st.state === 'off') return gsT(hass, 's_off');
    if (a.hvac_action !== undefined && a.hvac_action !== null) {
      const key = 'c_' + (a.hvac_action === 'fan' ? 'fan' : a.hvac_action);
      const txt = gsT(hass, key);
      return txt === key ? String(a.hvac_action) : txt;
    }
    const key = 's_' + st.state;
    const txt = gsT(hass, key);
    return txt === key ? st.state : txt;
  }

  /** Control buttons to show: [{kind, value, icon, label, sub, active}], built from the entity's own lists. */
  _buttons(st) {
    const L = gsLangObj(this._hass, this._config);
    const hass = this._hass;
    const cfg = this._config;
    const items = Array.isArray(cfg.controls) ? cfg.controls : gsDefaultControls(st, cfg.controls);
    const temps = cfg.preset_temperatures || {};
    const out = [];
    items.forEach((item) => {
      const o = gsParseControl(item);
      const def = GS_BUTTON_KINDS[o.kind];
      if (!def || !(st.attributes[def.list] || []).includes(o.value)) return;
      let sub = o.sub;
      if (sub === undefined) {
        sub = '';
        if (o.kind === 'hvac_mode' && gsT(L, 'ms_' + o.value) !== 'ms_' + o.value) sub = gsT(L, 'ms_' + o.value);
        if (o.kind === 'preset_mode') {
          if (temps[o.value] !== undefined) {
            sub = gsNum(L, Number(temps[o.value]), Number(temps[o.value]) % 1 ? 1 : 0) + ' °C';
          } else if (gsT(L, 'ps_' + o.value) !== 'ps_' + o.value) {
            sub = gsT(L, 'ps_' + o.value);
          }
        }
      }
      const icon = o.icon || (o.kind === 'hvac_mode' ? GS_MODE_ICON[o.value] : o.kind === 'preset_mode' ? GS_PRESET_ICON[o.value] : '') || def.icon;
      out.push({
        kind: o.kind, value: o.value, icon, sub,
        label: o.name || gsButtonLabel(hass, L, st, o.kind, o.value),
        active: def.active(st) === o.value,
      });
    });
    return out;
  }

  _paint() {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const L = gsLangObj(hass, cfg);
    const st = hass.states[cfg.entity];
    if (!st) {
      gsSetHtml(this.shadowRoot, `<style>${GS_CLIMATE_CSS}</style><ha-card><div class="card"><div class="name">${gsEsc(cfg.entity)}: ${gsEsc(gsT(L, 'no_data'))}</div></div></ha-card>`);
      return;
    }
    const a = st.attributes;
    const mode = this._colorMode(st);
    const rgb = mode ? GS_MODE_RGB[mode] : null;
    const col = rgb ? `rgb(${rgb})` : 'var(--secondary-text-color)';
    const valCol = rgb ? `rgb(${rgb})` : 'var(--primary-text-color)';
    const name = cfg.name || a.friendly_name || cfg.entity;
    const icon = cfg.icon || a.icon || 'mdi:thermostat';

    const step = this._stepOf(a);
    const decimals = step < 1 ? 1 : 0;
    const target = this._pending !== null ? this._pending : (a.temperature === undefined || a.temperature === null ? null : Number(a.temperature));
    const targetTxt = target === null || isNaN(target) ? '–' : gsNum(L, target, decimals);
    const unit = a.temperature_unit || hass.config?.unit_system?.temperature || '°C';
    const dis = target === null || isNaN(target) ? ' disabled' : '';
    const rbRgb = GS_MODE_RGB[st.state];
    const rbStyle = rbRgb ? `color:rgb(${rbRgb});border-color:rgba(${rbRgb},0.8)` : 'color:var(--primary-color)';
    const curTxt = a.current_temperature === undefined || a.current_temperature === null
      ? '' : `<div class="cur more" style="color:${valCol}"><ha-icon icon="mdi:thermometer"></ha-icon>${gsNum(L, Number(a.current_temperature), 1)} ${gsEsc(unit)}</div>`;

    const btns = this._buttons(st);
    const btnHtml = btns.length
      ? `<div class="btns">${btns.map((b) => `
          <div class="btn${b.active ? ' active' : ''}" role="button" data-kind="${b.kind}" data-value="${gsEsc(b.value)}">
            <ha-icon icon="${gsEsc(b.icon)}"></ha-icon><span class="bl">${gsEsc(b.label)}</span>${b.sub ? `<span class="bs">${gsEsc(b.sub)}</span>` : ''}
          </div>`).join('')}</div>` : '';

    const bg = rgb
      ? `radial-gradient(circle at 50% 45%, rgba(${rgb},0.28) 0%, rgba(${rgb},0.08) 60%, var(--ha-card-background, var(--card-background-color)) 100%)`
      : 'var(--ha-card-background, var(--card-background-color))';
    const border = rgb ? `1px solid rgba(${rgb},0.45)` : '1px solid var(--ha-card-border-color, var(--divider-color))';

    gsSetHtml(this.shadowRoot, `
      <style>${GS_CLIMATE_CSS}</style>
      <ha-card style="background:${bg};border:${border}">
        <div class="card">
          <div class="head more"><ha-icon icon="${gsEsc(icon)}" style="color:${col}"></ha-icon>
            <div><div class="name">${gsEsc(name)}</div><div class="status" style="color:${col}">${gsEsc(this._statusText(st))}</div></div></div>
          ${curTxt}
          <div class="rb minus${dis}" style="${rbStyle}" role="button" data-kind="step" data-value="-1"><ha-icon icon="mdi:minus"></ha-icon></div>
          <div class="temp more" style="color:${valCol}">${targetTxt} ${gsEsc(unit)}</div>
          <div class="rb plus${dis}" style="${rbStyle}" role="button" data-kind="step" data-value="1"><ha-icon icon="mdi:plus"></ha-icon></div>
          ${btnHtml}
        </div>
      </ha-card>`);
  }

  _onClick(ev) {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const path = ev.composedPath();
    const el = path.find((n) => n.dataset && n.dataset.kind);
    if (!el) {
      if (path.some((n) => n.classList && n.classList.contains('more'))) {
        gsFire(this, 'hass-more-info', { entityId: cfg.entity });
      }
      return;
    }
    const kind = el.dataset.kind;
    const value = el.dataset.value;
    if (kind === 'step') {
      this._step(Number(value));
    } else if (GS_BUTTON_KINDS[kind]) {
      this._call(GS_BUTTON_KINDS[kind].service, { [kind]: value });
    }
  }

  _step(dir) {
    const st = this._hass.states[this._config.entity];
    if (!st) return;
    const a = st.attributes;
    const step = this._stepOf(a);
    const base = this._pending !== null ? this._pending : Number(a.temperature);
    if (isNaN(base)) return;
    const min = a.min_temp !== undefined ? Number(a.min_temp) : 5;
    const max = a.max_temp !== undefined ? Number(a.max_temp) : 35;
    const next = parseFloat((Math.round((base + dir * step) / step) * step).toFixed(2));
    this._pending = Math.min(max, Math.max(min, next));
    this._sig = '';
    this._paint();
    clearTimeout(this._sendTimer);
    clearTimeout(this._clearTimer);
    const wanted = this._pending;
    this._sendTimer = setTimeout(() => this._call('set_temperature', { temperature: wanted }), 500);
    this._clearTimer = setTimeout(() => {
      this._pending = null;
      this._sig = '';
      this._paint();
    }, 6000);
  }

  _call(service, data) {
    const cfg = this._config;
    let promise;
    try {
      promise = this._hass.callService('climate', service, { entity_id: cfg.entity, ...data });
    } catch (e) {
      this._callFailed(service, e);
      return;
    }
    if (promise && typeof promise.catch === 'function') {
      promise.catch((e) => this._callFailed(service, e));
    }
  }

  _callFailed(service, e) {
    console.error('GlowStat: climate.' + service + ' failed for ' + this._config.entity, e);
    this._pending = null;
    this._sig = '';
    this._paint();
    gsFire(this, 'hass-notification', {
      message: gsT(gsLangObj(this._hass, this._config), 'set_failed') + ' (' + ((e && e.message) || service) + ')',
    });
  }
}

/** GUI editor for the climate card. */
class GlowStatClimateCardEditor extends HTMLElement {
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
    const h = this._hass;
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'climate' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
      gsLanguageField(h),
      { name: 'controls', selector: { select: { multiple: true, reorder: true, mode: 'dropdown', options: this._options() } } },
    ];
  }

  /** Every button the selected entity offers, read from its own attribute lists. */
  _options() {
    const h = this._hass;
    const st = h.states[this._config.entity];
    if (!st) return [];
    const L = gsLangObj(h, this._config);
    const out = [];
    Object.entries(GS_BUTTON_KINDS).forEach(([kind, def]) => {
      (st.attributes[def.list] || []).forEach((v) => {
        out.push({ value: kind + ':' + v, label: gsT(L, 'k_' + kind) + ': ' + gsButtonLabel(h, L, st, kind, v) });
      });
    });
    return out;
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name === 'entity' ? 'climate_entity' : s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const value = ev.detail.value;
        const next = { ...this._config, ...value };
        if (value.entity !== this._config.entity) {
          delete next.controls; // buttons of the previous entity do not apply to the new one
        } else if (Array.isArray(value.controls)) {
          // keep per-button overrides (name, icon, sub) that were set in YAML
          const old = new Map((Array.isArray(this._config.controls) ? this._config.controls : []).map((i) => [gsControlKey(i), i]));
          next.controls = value.controls.map((k) => old.get(k) || k);
        }
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
    const st = this._hass.states[this._config.entity];
    const c = this._config.controls;
    const controls = Array.isArray(c) ? c.map(gsControlKey) : (st ? gsDefaultControls(st, c) : []);
    this._form.data = { language: 'auto', ...this._config, controls };
  }
}

customElements.define('glowstat-climate-card', GlowStatClimateCard);
customElements.define('glowstat-climate-card-editor', GlowStatClimateCardEditor);
gsRegisterCard({
  type: 'glowstat-climate-card',
  name: 'GlowStat Climate',
  description: 'Compact heating / air conditioner card with glow, target temperature and mode buttons.',
});
console.info('%c GlowStat %c v' + GS_VERSION + ' ', 'background:#00a81c;color:#fff;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
