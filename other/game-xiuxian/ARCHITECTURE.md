# Architecture

`src/main.js` is the only top-level source entry. Everything else lives behind feature folders.

## Folders

- `src/app/` starts the app and wires browser bootstrapping.
- `src/core/` owns shared runtime state, save/load, event bus, Phaser config, scene-level helpers, and generated textures.
- `src/data/` contains static game definitions such as realms, skills, equipment tables, zones, enemies, achievements, and shop items.
- `src/effects/` owns reusable visual effects for skills, projectiles, hits, buffs, and shields.
- `src/input/` owns browser input adapters such as the virtual joystick.
- `src/systems/` owns Phaser gameplay systems. New gameplay loops should be installed through `src/systems/index.js`.
- `src/ui/` owns DOM UI rendering, top navigation, and browser action bindings.

## Extension Points

- Add a new gameplay system by creating it in `src/systems/` and registering it in `installSceneSystems`.
- Entity movement, idle, attack, and hit reactions are handled by `src/systems/entity-animation-system.js`.
- Add or tune skill visuals in `src/effects/skill-effects.js`; combat systems should call the effect layer instead of building tweens inline.
- Add new UI commands to `src/ui/actions.js`; only that file should bridge legacy inline HTML handlers to modules.
- Add runtime references to `src/core/runtime.js` instead of reading or writing ad hoc `window.*` globals.
- Add Phaser boot options in `src/core/game-config.js` instead of editing `main.js`.
