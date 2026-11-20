/**
 * glowstat-climate-card: compact climate card (heating or air conditioner) with a
 * state-colored glow, target temperature +/- buttons and automatically detected
 * preset or HVAC mode buttons.
 */

Object.assign(GS_I18N.en, {
  c_heating: 'Heating', c_cooling: 'Cooling', c_drying: 'Drying', c_fan: 'Fan',
  c_idle: 'Idle', c_off: 'Off', c_defrosting: 'Defrosting', c_preheating: 'Preheating',
  m_off: 'Off', m_auto: 'Auto', m_heat_cool: 'Heat/Cool', m_heat: 'Heat', m_cool: 'Cool', m_dry: 'Dry', m_fan_only: 'Fan',
  s_off: 'Off', s_auto: 'Automatic', s_heat_cool: 'Heat/Cool', s_heat: 'Heating', s_cool: 'Cooling', s_dry: 'Drying', s_fan_only: 'Fan',
  p_auto: 'Auto', p_manual: 'Manual', p_comfort: 'Comfort', p_eco: 'Eco', p_away: 'Away', p_home: 'Home',
  p_sleep: 'Sleep', p_boost: 'Boost', p_none: 'None', p_activity: 'Activity',
  controls: 'Control buttons', controls_auto: 'Automatic', controls_presets: 'Presets', controls_hvac_modes: 'HVAC modes', controls_none: 'None',
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
  controls: 'Vezérlő gombok', controls_auto: 'Automatikus', controls_presets: 'Előbeállítások', controls_hvac_modes: 'Üzemmódok', controls_none: 'Nincs',
  icon: 'Ikon', climate_entity: 'Klíma entitás', set_failed: 'A beállítás módosítása nem sikerült',
  ms_off: 'kikapcs.', ms_auto: 'automata', ms_heat_cool: 'váltó', ms_heat: 'meleg', ms_cool: 'hideg', ms_dry: 'párátlan', ms_fan_only: 'ventilátor',
  ps_auto: 'program', ps_manual: 'kézi', preset_temperatures: 'Előbeállítás hőfokok',
});

const GS_MODE_RGB = {
  cool: '66,165,245', heat: '255,112,67', dry: '38,166,154',
  auto: '102,187,106', heat_cool: '102,187,106', fan_only: '144,164,174',
};
const GS_ACTION_MODE = { heating: 'heat', preheating: 'heat', cooling: 'cool', drying: 'dry', fan: 'fan_only' };
const GS_MODE_ORDER = ['off', 'auto', 'heat_cool', 'heat', 'cool', 'dry', 'fan_only'];
const GS_MODE_ICON = {
  off: 'mdi:power', auto: 'mdi:thermostat-auto', heat_cool: 'mdi:sun-snowflake-variant',
  heat: 'mdi:fire', cool: 'mdi:snowflake', dry: 'mdi:water-percent', fan_only: 'mdi:fan',
};
const GS_PRESET_ICON = {
  auto: 'mdi:calendar-clock', manual: 'mdi:hand-back-right', comfort: 'mdi:sofa', eco: 'mdi:leaf',
  away: 'mdi:car', home: 'mdi:home', sleep: 'mdi:sleep', boost: 'mdi:rocket-launch',
  none: 'mdi:cancel', activity: 'mdi:run',
};

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
  .btns { grid-area: btns; width: 100%; display: grid; gap: 2px; }
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
    this._config = { controls: 'auto', ...config };
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

  /** Decide which control buttons to show: [{kind, value, icon, label, active}]. */
  _buttons(st) {
    const L = gsLangObj(this._hass, this._config);
    const hass = this._hass;
    const a = st.attributes;
    const modes = (a.hvac_modes || []).filter((m) => GS_MODE_ORDER.includes(m));
    const presets = a.preset_modes || [];
    let kind = this._config.controls;
    if (kind === 'auto') {
      kind = modes.length > 2 ? 'hvac_modes' : presets.length ? 'presets' : modes.length ? 'hvac_modes' : 'none';
    }
    if (kind === 'hvac_modes') {
      return GS_MODE_ORDER.filter((m) => modes.includes(m)).map((m) => ({
        kind: 'hvac', value: m, icon: GS_MODE_ICON[m], label: gsT(L, 'm_' + m), sub: gsT(L, 'ms_' + m), active: st.state === m,
      }));
    }
    if (kind === 'presets') {
      return presets.map((p) => {
        const key = 'p_' + p;
        let label = gsT(L, key);
        if (label === key) {
          label = typeof hass.formatEntityAttributeValue === 'function'
            ? hass.formatEntityAttributeValue(st, 'preset_mode', p) : p;
        }
        const temps = this._config.preset_temperatures || {};
        const subKey = 'ps_' + p;
        let sub = temps[p] !== undefined ? gsNum(L, Number(temps[p]), Number(temps[p]) % 1 ? 1 : 0) + ' °C' : gsT(L, subKey);
        if (sub === subKey) sub = '';
        return { kind: 'preset', value: p, icon: GS_PRESET_ICON[p] || 'mdi:tune', label, sub, active: a.preset_mode === p };
      });
    }
    return [];
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
      ? `<div class="btns" style="grid-template-columns:repeat(${btns.length},1fr)">${btns.map((b) => `
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
    } else if (kind === 'preset') {
      this._call('set_preset_mode', { preset_mode: value });
    } else if (kind === 'hvac') {
      this._call('set_hvac_mode', { hvac_mode: value });
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
      {
        name: 'controls',
        selector: {
          select: {
            mode: 'dropdown',
            options: ['auto', 'presets', 'hvac_modes', 'none'].map((v) => ({ value: v, label: gsT(h, 'controls_' + v) })),
          },
        },
      },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name === 'entity' ? 'climate_entity' : s.name);
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
    this._form.data = { controls: 'auto', language: 'auto', ...this._config };
  }
}

customElements.define('glowstat-climate-card', GlowStatClimateCard);
customElements.define('glowstat-climate-card-editor', GlowStatClimateCardEditor);
gsRegisterCard({
  type: 'glowstat-climate-card',
  name: 'GlowStat Climate',
  description: 'Compact heating / air conditioner card with glow, target temperature and mode buttons.',
});
