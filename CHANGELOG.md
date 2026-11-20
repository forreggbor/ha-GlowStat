# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-20

| Category | Description |
|----------|-------------|
| Added    | Climate card control buttons can be picked one by one in the card editor |
| Added    | Fan and swing modes are available as control buttons |
| Added    | Individual buttons can get their own name, icon and subtitle |
| Changed  | Tapping the humidity or battery value on the thermometer card opens that sensor's history |
| Changed  | Without a chosen button list, the climate card now follows the order of the modes the entity reports |

### Added

- The control buttons of the climate card are no longer fixed: the editor lists every mode the selected entity offers (operating modes, presets, fan and swing modes), and each button can be turned on or off and reordered.
- Fan and swing modes of an entity can be shown as buttons next to the operating modes and presets.
- A button can be given its own name, icon and subtitle in the card's YAML.

### Changed

- Tapping the humidity or the battery value on the thermometer card now opens the history of that sensor instead of the temperature. Tapping anywhere else still opens the temperature.
- When no buttons are chosen, the climate card shows the modes in the order the entity reports them, with "off" first. Cards that relied on the previous fixed order should pick their buttons explicitly.

## [0.1.0] - 2026-11-20

| Category | Description |
|----------|-------------|
| Added    | Thermometer card with temperature, humidity, battery, scale and history graph |
| Added    | Climate card for heating and air conditioners with target temperature and mode buttons |
| Added    | Dashboard editor for both cards |
| Added    | Hungarian and English texts with a per-card language setting |

### Added

- The thermometer card shows temperature, humidity and battery on a glowing, state-colored background, with a temperature scale, a history graph and an animated emoji.
- The climate card controls heating and air conditioners: target temperature, preset buttons and operating mode buttons, with a state-colored glow.
- Both cards can be set up from the dashboard editor without writing YAML.
- Texts are available in Hungarian and English, and each card can be set to its own language.
