# GlowStat

Compact, glowing Home Assistant dashboard cards for thermometers, heating and air conditioners. The background
and the accents take the color of the current state, and everything is set up from the dashboard editor, no YAML
needed.

[![Open your Home Assistant instance and open this repository in the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=forreggbor&repository=ha-GlowStat&category=plugin)

| Thermometer | Climate: heating |
|-------------|------------------|
| ![Thermometer card on a warm day](docs/images/thermometer-warm.png) | ![Climate card controlling a heating](docs/images/climate-heating.png) |

| Thermometer, Hungarian texts | Climate: air conditioner |
|------------------------------|--------------------------|
| ![Thermometer card on a cold day, Hungarian](docs/images/thermometer-cold-hu.png) | ![Climate card controlling an air conditioner](docs/images/climate-ac.png) |

## Cards

### `custom:glowstat-thermometer-card`

Temperature with a state-colored glow, humidity, battery, a temperature scale, a history graph, a trend arrow and
an animated emoji in the background that follows the temperature (a penguin below 10 °C, a flame above 30 °C).
Tapping the humidity or battery value opens the history of that sensor, tapping anywhere else opens the temperature.

The trend arrow shows the change over the last hour. Up to 48 hours the graph is drawn from the recorded history,
for longer periods (up to 720 hours) it uses the long-term statistics, so a week or a month stays fast. Humidity at
or above the mold limit turns red and says "Mold risk", and the dew point can be shown instead.

| Option | Description |
|--------|-------------|
| `entity` | Temperature sensor (required) |
| `humidity_entity` | Humidity sensor |
| `battery_entity` | Battery sensor |
| `name` | Card title, defaults to the entity name |
| `show_sparkline` | Show the history graph (default `true`) |
| `history_hours` | Length of the history graph in hours, 1 to 720 (default `24`) |
| `show_trend` | Show the trend arrow (default `true`) |
| `show_dew_point` | Show the dew point under the humidity (default `false`) |
| `mold_humidity` | Humidity in % from which the mold warning appears, `0` turns it off (default `70`) |
| `comfort_min`, `comfort_max` | Comfort range in °C, the green part of the scale (default `20` and `22`) |
| `show_background_emoji` | Show the background emoji (default `true`) |
| `language` | `auto` (Home Assistant language), `hu` or `en` |

### `custom:glowstat-climate-card`

One card for heating and air conditioners: target temperature with `+` / `-`, the current temperature, the
state (heating, cooling, idle, off) and control buttons. The glow follows what the device is doing and pulses
while it is actually heating, cooling or drying.

For zones of [SmartHeatZones](https://github.com/forreggbor/SmartHeatZones) (version 1.10.1 or newer) the card also shows the fail-safe state of the zone: when the zone has switched its heating off because its temperature sensor was lost or went silent (attribute `sensor_fault`), or when a relay does not respond (attribute `relay_fault`), the status line shows a warning in the card language, the glow turns red and the pulsing stops. Climate entities of other integrations are not affected.

The control buttons are read from the entity itself, nothing is hard-coded. In the editor you pick them one by one
from every mode the entity offers: operating modes, presets, fan modes and swing modes, and you can reorder them.

| Option | Description |
|--------|-------------|
| `entity` | Climate entity (required) |
| `name` | Card title, defaults to the entity name |
| `icon` | Icon next to the title |
| `controls` | List of control buttons, see below. Without it the card shows the operating modes (more than two), otherwise the presets |
| `preset_temperatures` | Temperatures shown under preset buttons, e.g. `{comfort: 22, eco: 17}`. If the entity has a `preset_temperatures` attribute with the same shape, it is used and this option overrides single values |
| `language` | `auto` (Home Assistant language), `hu` or `en` |

A button is written as `<type>:<value>` where the type is `hvac_mode`, `preset_mode`, `fan_mode` or `swing_mode`.
To override the label, icon or subtitle of a button, use an object instead of a string:

```yaml
type: custom:glowstat-climate-card
entity: climate.living_room
controls:
  - hvac_mode:off
  - hvac_mode:cool
  - fan_mode:auto
  - type: preset_mode
    value: away
    name: Away
    icon: mdi:walk
    sub: save energy
```

Both cards can be used with the keyboard (Tab, Enter, Space), have labels for screen readers and switch to a compact
layout on narrow screens.

### `custom:glowstat-heating-card`

The whole house in one card, for [SmartHeatZones](https://github.com/forreggbor/SmartHeatZones) 1.14.0 or newer. It reads only the
overview entity `sensor.smartheatzones_overview`, so no zone has to be set up one by one:

- **Boiler:** running or off with the duration, which zones hold it (zones that only joined by afterheat are marked),
  and today's starts, runtime and afterheat joins. After a Home Assistant restart it says when the counting began.
  A boiler command that failed is shown in red.
- **Zones:** current and target temperature, a bar with the on and off thresholds, the reason for the zone's state
  ("Idle - heats below 20.5°, target 21°", "Door or window open", ...), a chip when the zone runs on a backup
  sensor, in the emergency cycle or by afterheat, and the next scheduled change. Red is used only for a relay that
  does not respond.
- **Timelines:** when each zone and the boiler were heating over the last hours (from the recorded history).
- **Time to target:** `~25 min to target` for a heating zone, shown only when the temperature rises clearly; it is an
  estimate from the last hour of the zone sensor.
- **Sensor network:** one chip per integration, for example `zha 5/5 ok` or `zha: 2 of 5 silent`.
- **Quick actions:** "All away" and "All eco" set the preset of every zone.
- **Live flash:** a zone row flashes for a few seconds when SmartHeatZones reports a fail-safe change. This needs a
  Home Assistant **admin** user (events can only be subscribed by admins); other users simply see no flash.

| Option | Description |
|--------|-------------|
| `entity` | The overview sensor (`sensor.smartheatzones_overview`), required. |
| `history_hours` | Length of the timelines, 1 to 72 hours (default 24). |
| `show_timeline` | Show the timelines (default on). |
| `show_eta` | Show the time to target (default on). |
| `show_actions` | Show the quick action buttons (default on). |
| `language` | `auto`, `hu` or `en`. |

## Installation

1. In Home Assistant open **Settings > Marketplace**, add `forreggbor/ha-GlowStat` as a custom repository of type
   dashboard (or use the button above), and download GlowStat.
2. Reload the browser (Ctrl+Shift+R).
3. Add a card and search for "GlowStat".

## Development

```bash
npm install     # once, installs the test dependency
./build.sh      # builds dist/ha-glowstat.js from src/
npm test        # runs the tests against the built bundle
```

Releases are automatic: after bumping the version in `package.json`, adding the matching section to
`CHANGELOG.md` and committing the rebuilt `dist/ha-glowstat.js`, push a tag like `v1.2.3`. The release workflow
checks the bundle and the tests, then publishes the release with the changelog section as its notes.

## Languages

Hungarian and English are built in. By default the card follows the Home Assistant language, the `language`
option overrides it per card.

## License

MIT, see [LICENSE](LICENSE).
