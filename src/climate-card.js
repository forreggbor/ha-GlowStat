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
  temp_down: 'Lower the target temperature', temp_up: 'Raise the target temperature',
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
  temp_down: 'Alacsonyabb célhőmérséklet', temp_up: 'Magasabb célhőmérséklet',
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
  ha-card { display: block; height: 100%; overflow: hidden; position: relative; container-type: inline-size; }
  [tabindex]:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 6px; }
  ha-card.live { animation: glowpulse 2.4s ease-in-out infinite; }
  @keyframes glowpulse {
    0%, 100% { box-shadow: inset 0 0 0 0 rgba(var(--g), 0); }
    50% { box-shadow: inset 0 0 18px 0 rgba(var(--g), 0.35); }
  }
  @media (prefers-reduced-motion: reduce) { ha-card.live { animation: none; } }
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
  @container (max-width: 300px) {
    .card { min-height: 150px; padding: 8px; gap: 6px; }
    .btn .bs { display: none; }
    .temp { font-size: 20px; }
    .rb { width: 38px; height: 38px; }
  }
`;

class GlowStatClimateCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = '';
    this._pending = null;
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      this._onClick(ev);
    });
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
    const temps = { ...(st.attributes.preset_temperatures || {}), ...(cfg.preset_temperatures || {}) };
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
      ? '' : `<div class="cur more" role="button" tabindex="0" aria-label="${gsEsc(name)}" style="color:${valCol}"><ha-icon icon="mdi:thermometer"></ha-icon>${gsNum(L, Number(a.current_temperature), 1)} ${gsEsc(unit)}</div>`;

    const live = Boolean(rgb) && a.hvac_action !== undefined && a.hvac_action !== null && Boolean(GS_ACTION_MODE[a.hvac_action]);
    const btns = this._buttons(st);
    const btnHtml = btns.length
      ? `<div class="btns">${btns.map((b) => `
          <div class="btn${b.active ? ' active' : ''}" role="button" tabindex="0" aria-pressed="${b.active}" aria-label="${gsEsc(b.label)}" data-kind="${b.kind}" data-value="${gsEsc(b.value)}">
            <ha-icon icon="${gsEsc(b.icon)}"></ha-icon><span class="bl">${gsEsc(b.label)}</span>${b.sub ? `<span class="bs">${gsEsc(b.sub)}</span>` : ''}
          </div>`).join('')}</div>` : '';

    const bg = rgb
      ? `radial-gradient(circle at 50% 45%, rgba(${rgb},0.28) 0%, rgba(${rgb},0.08) 60%, var(--ha-card-background, var(--card-background-color)) 100%)`
      : 'var(--ha-card-background, var(--card-background-color))';
    const border = rgb ? `1px solid rgba(${rgb},0.45)` : '1px solid var(--ha-card-border-color, var(--divider-color))';

    gsSetHtml(this.shadowRoot, `
      <style>${GS_CLIMATE_CSS}</style>
      <ha-card class="${live ? 'live' : ''}" style="--g:${rgb || '0,0,0'};background:${bg};border:${border}">
        <div class="card">
          <div class="head more" role="button" tabindex="0" aria-label="${gsEsc(name)}"><ha-icon icon="${gsEsc(icon)}" style="color:${col}"></ha-icon>
            <div><div class="name">${gsEsc(name)}</div><div class="status" style="color:${col}">${gsEsc(this._statusText(st))}</div></div></div>
          ${curTxt}
          <div class="rb minus${dis}" style="${rbStyle}" role="button" tabindex="0" aria-label="${gsEsc(gsT(L, 'temp_down'))}" data-kind="step" data-value="-1"><ha-icon icon="mdi:minus"></ha-icon></div>
          <div class="temp more" role="button" tabindex="0" aria-label="${gsEsc(name)}" style="color:${valCol}">${targetTxt} ${gsEsc(unit)}</div>
          <div class="rb plus${dis}" style="${rbStyle}" role="button" tabindex="0" aria-label="${gsEsc(gsT(L, 'temp_up'))}" data-kind="step" data-value="1"><ha-icon icon="mdi:plus"></ha-icon></div>
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
