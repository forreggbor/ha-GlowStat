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
      batHtml = `<div class="bat" style="color:${col}"><ha-icon icon="${icon}"></ha-icon>${Math.round(b)} %</div>`;
    }

    // Humidity
    let humHtml = '';
    const hst = cfg.humidity_entity && hass.states[cfg.humidity_entity];
    const h = hst ? parseFloat(hst.state) : NaN;
    if (!isNaN(h)) {
      const col = h >= 40 && h <= 60 ? '#42a5f5' : '#ffa726';
      humHtml = `<div class="hum" style="color:${col}"><ha-icon icon="mdi:water-percent"></ha-icon>${Math.round(h)} %</div>`;
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
    card.addEventListener('click', () => gsFire(this, 'hass-more-info', { entityId: cfg.entity }));
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
