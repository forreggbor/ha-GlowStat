# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-11-24

| Category | Description |
|----------|-------------|
| Added    | The heating card has two layouts to choose from: tiles with ring gauges, and a list with expandable rows |
| Added    | Every zone says in one short sentence what it is doing, with a color for the state |
| Added    | Tapping a zone opens a sheet with a large gauge, preset buttons, a target stepper and a 24 hour chart |
| Added    | A new "All automatic" button sets every zone back to its schedule |
| Changed  | The heating card is easier to read at a glance: ring gauge instead of a bar, a flame icon for the boiler |

### Added

- **Two layouts.** Choose `tiles` (a grid of ring gauges, the default) or `list` (one row per zone that opens to the switch-on and switch-off limits, the next change and the timeline) in the card options or in the dashboard editor (closes #4).
- **Plain-language zones.** Each zone shows a short state such as "Heating", "Idle", "Door open" or "Relay not responding", the reason below it, and a color: orange heating, blue idle, amber needs attention, red a relay that does not respond.
- **Zone sheet.** Tap a tile, or "Details" in a list row, to open a sheet with a large gauge, the Auto, Comfort, Eco and Away buttons, a target stepper in half-degree steps and a chart of the temperature, the target and the heating periods. The stepper puts the zone in manual mode.
- **All automatic.** A third quick action next to "All away" and "All eco".

### Changed

- **Easier to read.** The ring gauge shows how close the zone is to its target: the filled arc is the current temperature, the white dot the target, the pale band the switch-on and switch-off limits.

## [0.5.1] - 2026-11-24

| Category | Description |
|----------|-------------|
| Fixed    | The climate card no longer says "heating off" while the zone keeps heating on its backup sensor |
| Fixed    | The climate card no longer turns red and stops pulsing in the emergency cycle |
| Added    | The climate card shows a short neutral hint for the backup sensor and the emergency cycle |

### Fixed

- **Wrong "heating off" warning.** Since SmartHeatZones 1.12.0 a zone keeps heating on a backup sensor, or in an emergency cycle, when its own sensor is lost. The climate card still showed "Sensor lost – heating off", turned red and stopped pulsing. It now keeps its normal look. Red is used only for a relay that does not respond (closes #2).

### Added

- **Backup sensor and emergency cycle hints.** The status line adds "Backup sensor", or "Emergency cycle: 10 of 30 min" with the current cycle, next to the normal status such as "Heating". With a SmartHeatZones older than 1.12.0 the card behaves as before.

## [0.5.0] - 2026-11-23

| Category | Description |
|----------|-------------|
| Added    | New heating card for the whole house, fed by the SmartHeatZones overview |
| Added    | The heating card shows the boiler with today's starts, runtime and afterheat |
| Added    | The heating card shows why each zone is heating or idle |
| Added    | The heating card draws a timeline of the heating periods for each zone and the boiler |
| Added    | The heating card estimates the time to reach the target while a zone is heating |
| Added    | The heating card shows the health of the sensor network |
| Added    | The heating card has "All away" and "All eco" buttons |
| Added    | The heating card flashes the zone row when SmartHeatZones reports a safety change |

### Added

- **Heating card.** `glowstat-heating-card` shows the whole heating system in one card, for SmartHeatZones 1.14.0 or newer. It needs only the overview sensor. It has a dashboard editor and Hungarian and English texts (closes #3).
- **Boiler and zones.** The boiler is shown as running or off with the duration, who holds it, and today's counters. Each zone shows its temperature, a bar with the switch-on and switch-off limits, the reason for its state and the next scheduled change. A zone running on a backup sensor, in the emergency cycle or by afterheat gets a label; red is used only for a relay that does not respond, and for a failed boiler command.
- **Timelines and time to target.** Shows when each zone and the boiler were heating over the last hours, and an estimate such as "~25 min to target" when the temperature clearly rises.
- **Sensor network and quick actions.** One label per integration, for example "zha 2 of 5 silent", and buttons that set the preset of every zone at once. A failed zone is named.
- **Live flash.** A zone row flashes for a few seconds when SmartHeatZones reports a safety change. This works for Home Assistant admin users only.

## [0.4.0] - 2026-11-20

| Category | Description |
|----------|-------------|
| Added    | The climate card shows when a SmartHeatZones zone has switched its heating off for safety |

### Added

- For zones of SmartHeatZones (version 1.10.1 or newer) the climate card now shows the safety state of the zone. When the zone has switched its heating off because its temperature sensor was lost or went silent, or when a relay does not respond, the status line shows a short warning in the card language, the glow turns red and the pulsing stops. Before, such a zone looked like a zone that was simply idle. Climate entities of other integrations are not affected (closes #1).

## [0.3.0] - 2026-11-20

| Category | Description |
|----------|-------------|
| Added    | Trend arrow on the thermometer card showing the change over the last hour |
| Added    | The climate card glows and pulses while the device is heating, cooling or drying |
| Added    | History graph for up to 30 days, drawn from the long-term statistics |
| Added    | Adjustable comfort range for the colors and words of the thermometer card |
| Added    | Mold warning for high humidity and an optional dew point |
| Added    | Preset temperatures can be taken from the climate entity |
| Added    | Cards can be used with the keyboard and a screen reader, and adapt to narrow screens |
| Added    | Automatic tests and automatic releases |

### Added

- The thermometer card shows an arrow with the change of the last hour under the temperature: up, down, or flat when the change is small. It can be switched off.
- While a heating or an air conditioner is actually working, the glow of the climate card pulses softly. It stays still when the device is idle or off, and for people who prefer less motion.
- The history graph can cover up to 30 days. Longer periods are read from the long-term statistics of Home Assistant, so a week or a month loads quickly. If no statistics exist, the recorded history is used instead.
- The green comfort range of the thermometer card can be set, and the colors and the words (comfortable, cool, warm, ...) follow it.
- Humidity above a limit (70% by default, adjustable) turns red and shows a mold warning. The dew point can be shown instead on request.
- The temperatures under the preset buttons of the climate card are read from the entity when it provides them. A value set in the card still wins.
- Every button of both cards works with the keyboard and has a label for screen readers. On narrow screens the cards switch to a more compact layout.
- The project is now tested automatically on every change, and a new release is published automatically when a version tag is pushed.

## [0.2.1] - 2026-11-20

| Category | Description |
|----------|-------------|
| Added    | The repository is checked automatically against the Marketplace rules |
| Changed  | The README now has screenshots, option tables and an install button |

### Added

- Every change, and once a day, the repository is checked automatically against the rules of the Home Assistant Marketplace, so problems that would block a listing are found early.

### Changed

- The README now shows screenshots of both cards, lists every option of each card, gives a YAML example for the control buttons and has a button that opens the repository in the Home Assistant Marketplace.

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
