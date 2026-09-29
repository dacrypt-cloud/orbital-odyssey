# Orbital Odyssey: Gravity Well

A mobile-friendly, physics-based 2D space navigation and orbital slingshot game built from scratch using HTML5 Canvas, modular ES6 JavaScript, responsive CSS3, and a procedural Web Audio API sound synthesizer.

## Features

- **Real Newtonian Orbital Physics**: Planets and singularities exert inverse-square gravitational pull ($F = G \cdot \frac{M \cdot m}{r^2}$). Harness planetary gravity wells to execute high-speed **Gravity Slingshots** for bonus points.
- **Predictive Trajectory Computer**: Real-time lookahead dotted orbital arc shows how planetary gravity will bend your spacecraft's path and warns of imminent planetary impacts.
- **8 Campaign Sectors + Endless Deep Space Mode**:
  1. **Sector 01: Maiden Orbit** — Terran gravity slingshot & Quantum Energy Orbs introduction
  2. **Sector 02: Binary Slingshot** — Twin-body Lagrange corridor & proximity space mines
  3. **Sector 03: Kuiper Belt Run** — Ringed Gas Giant (`Hyperion V`) & moving asteroid drift belt
  4. **Sector 04: Pulsar Citadel** — Sweeping pulsar security laser beams & dual worlds
  5. **Sector 05: Solar Flare Gauntlet** — High-gravity Lava Dwarf star (`Helios`) & outer moons
  6. **Sector 06: Singularity Fringe** — Miniature Black Hole (`Cygnus X-9`) with relativistic accretion disk
  7. **Sector 07: Tri-Star Labyrinth** — Three-body overlapping gravitational triangle
  8. **Sector 08: Omega Core** — Binary Singularity + Ringed Sovereign Giant gauntlet
  9. **Sector 09+**: Procedural Deep Space Endless Sectors with scaling difficulty
- **Dual Android Touch & Desktop Keyboard Controls**:
  - **Mobile / Android**: Multi-touch Virtual Analog Steering Thumbstick, dedicated Rotate Left/Right buttons, and ergonomic Thrust, Afterburner Boost, and Retro-Brake buttons (`touch-action: none`).
  - **Desktop Keyboard**: `W`/`Up` (Thrust), `A`/`D` or `Left`/`Right` (Rotate), `S`/`Down` (Retro-Brake), `Space`/`Shift` (Afterburner Boost), `P`/`Esc` (Pause), `R` (Restart), `M` (Mute), `T` (Trajectory Arc), `Z` (Camera Zoom).
- **Procedural Web Audio API Synthesizer**: 9 synthesized sound effects (modulated thruster roar, ascending harmonic orb collection chimes, portal unlock chord, gravity slingshot Doppler whoosh, shield/hull repair arpeggio, impact crunch, explosion, level complete fanfare, and game over sequence) with zero external audio dependencies.

## Project Structure

```text
orbital-odyssey/
├── index.html            # Self-contained production build (runs directly in any browser)
├── dev.html              # Multi-file development entry point
├── package.json          # Scripts for build, local HTTP server, and automated tests
├── styles/
│   └── main.css          # Responsive tactical cockpit HUD & mobile touch controls
├── src/
│   ├── template.html     # HTML layout template for HUD, canvas, and modals
│   ├── audio.js          # Web Audio API procedural sound synthesizer
│   ├── physics.js        # Newtonian gravity, spacecraft integration, collisions & trajectory
│   ├── levels.js         # 8 campaign sectors + procedural endless sector generator
│   ├── entities.js       # Ship, Planet, Obstacle, EnergyParticle, Powerup, Portal & Particles
│   ├── renderer.js       # High-DPI Canvas renderer, parallax starfield, mini-radar & waypoints
│   ├── controls.js       # Desktop keyboard & Android multi-touch input controller
│   └── game.js           # Game loop, state machine, scoring, HUD & persistence
├── scripts/
│   ├── build.js          # Bundles src/ and styles/ into standalone index.html
│   └── server.js         # Zero-dependency static HTTP server (0.0.0.0:3000)
└── tests/
    ├── physics.test.js   # Unit tests for gravity, physics integration, collisions & levels
    └── e2e.test.js       # Playwright E2E browser tests (Desktop + Android Mobile viewports)
```

## Running the Game

### Option 1: Local HTTP Server (Recommended)
```bash
npm start
# Open http://localhost:3000 in any desktop or mobile browser
```

### Option 2: Direct Browser Open (Zero Server Needed)
Open `index.html` directly in any modern browser (`file://` or static host).

## Running Automated Tests

```bash
npm test
```
