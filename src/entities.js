/**
 * Orbital Odyssey: Gravity Well
 * Game Entities, Particle FX System, and Floating Combat/Score Telemetry
 */
(function (root) {
  'use strict';

  class Ship {
    constructor(spawn = { x: 140, y: 450, angle: 0 }, lives = 3) {
      this.spawn = { ...spawn };
      this.radius = 16;
      this.maxHealth = 100;
      this.health = 100;
      this.lives = lives;
      this.maxFuel = 100;
      this.fuel = 100;
      this.resetToSpawn();
    }

    resetToSpawn() {
      this.x = this.spawn.x;
      this.y = this.spawn.y;
      this.vx = 0;
      this.vy = 0;
      this.angle = this.spawn.angle || 0;
      this.angularVelocity = 0;
      this.thrusting = false;
      this.boosting = false;
      this.braking = false;
      this.alive = true;
      this.health = this.maxHealth;
      this.fuel = this.maxFuel;
      this.invulnerableTimer = 1.6;
      this.shieldTimer = 0;
      this.slingshotCooldown = 0;
      this.trail = [];
    }

    updateTrail() {
      this.trail.push({
        x: this.x - Math.cos(this.angle) * 12,
        y: this.y - Math.sin(this.angle) * 12,
        boosting: this.boosting,
        thrusting: this.thrusting
      });
      if (this.trail.length > 28) {
        this.trail.shift();
      }
    }
  }

  class Planet {
    constructor(cfg) {
      this.name = cfg.name || 'Uncharted Planet';
      this.type = cfg.type || 'terran';
      this.x = cfg.x;
      this.y = cfg.y;
      this.radius = cfg.radius || 70;
      this.mass = cfg.mass || 1600;
      this.gravityRadius = cfg.gravityRadius || this.radius * 4.5;
      this.color = cfg.color || '#2dd4bf';
      this.secondaryColor = cfg.secondaryColor || '#0284c7';
      this.atmosphereColor = cfg.atmosphereColor || 'rgba(56, 189, 248, 0.24)';
      this.hasRings = !!cfg.hasRings;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = this.type === 'black_hole' ? 1.8 : 0.14;

      // Precompute deterministic surface features (craters / bands)
      this.features = [];
      const count = this.type === 'moon' ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + 0.4;
        const dist = (0.25 + ((i * 37) % 45) / 100) * this.radius;
        const r = (0.12 + ((i * 19) % 14) / 100) * this.radius;
        this.features.push({ a, dist, r });
      }
    }

    update(dt) {
      this.rotation += this.rotationSpeed * dt;
    }
  }

  class Obstacle {
    constructor(cfg) {
      this.type = cfg.type || 'asteroid';
      this.x = cfg.x;
      this.y = cfg.y;
      this.anchorX = cfg.x;
      this.anchorY = cfg.y;
      this.radius = cfg.radius || 24;
      this.vx = cfg.vx || 0;
      this.vy = cfg.vy || 0;
      this.bounceBounds = !!cfg.bounceBounds;
      this.patrolRadius = cfg.patrolRadius || 50;
      this.speed = cfg.speed || 1.5;
      this.phase = (cfg.x + cfg.y) * 0.01;
      this.angle = cfg.angle || 0;
      this.rotationSpeed =
        cfg.rotationSpeed !== undefined
          ? cfg.rotationSpeed
          : (this.type === 'asteroid' ? 0.65 : 1.2);
      this.beamLength = cfg.beamLength || 180;

      // Procedural jagged vertices for asteroids
      this.vertices = [];
      if (this.type === 'asteroid') {
        const sides = 9;
        for (let i = 0; i < sides; i++) {
          const theta = (i / sides) * Math.PI * 2;
          const jag = 0.78 + (((i * 53 + Math.round(this.x)) % 35) / 100);
          this.vertices.push({
            x: Math.cos(theta) * this.radius * jag,
            y: Math.sin(theta) * this.radius * jag
          });
        }
      }
    }

    update(dt, planets, worldBounds) {
      this.phase += dt * this.speed;
      this.angle += this.rotationSpeed * dt;

      if (this.type === 'asteroid') {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Repel asteroid softly from planets so it orbits/bounces around them
        if (planets) {
          for (let i = 0; i < planets.length; i++) {
            const p = planets[i];
            const dx = this.x - p.x;
            const dy = this.y - p.y;
            const dist = Math.hypot(dx, dy) || 1;
            const minSep = p.radius + this.radius + 18;
            if (dist < minSep) {
              const nx = dx / dist;
              const ny = dy / dist;
              this.x = p.x + nx * minSep;
              this.y = p.y + ny * minSep;
              const dot = this.vx * nx + this.vy * ny;
              if (dot < 0) {
                this.vx -= 2 * dot * nx;
                this.vy -= 2 * dot * ny;
              }
            }
          }
        }

        if (worldBounds) {
          const margin = 120;
          if (this.x < worldBounds.minX + margin) {
            this.x = worldBounds.minX + margin;
            this.vx = Math.abs(this.vx);
          } else if (this.x > worldBounds.maxX - margin) {
            this.x = worldBounds.maxX - margin;
            this.vx = -Math.abs(this.vx);
          }
          if (this.y < worldBounds.minY + margin) {
            this.y = worldBounds.minY + margin;
            this.vy = Math.abs(this.vy);
          } else if (this.y > worldBounds.maxY - margin) {
            this.y = worldBounds.maxY - margin;
            this.vy = -Math.abs(this.vy);
          }
        }
      } else if (this.type === 'mine') {
        this.x = this.anchorX + Math.cos(this.phase) * this.patrolRadius;
        this.y = this.anchorY + Math.sin(this.phase * 1.3) * (this.patrolRadius * 0.7);
      }
    }
  }

  class EnergyParticle {
    constructor(cfg, index = 0) {
      this.id = index;
      this.baseX = cfg.x;
      this.baseY = cfg.y;
      this.x = cfg.x;
      this.y = cfg.y;
      this.radius = 15;
      this.value = cfg.value || 100;
      this.collected = false;
      this.phase = index * 0.9;
    }

    update(dt, ship) {
      if (this.collected) return;
      this.phase += dt * 3.2;

      // Gentle harmonic float
      this.x = this.baseX + Math.cos(this.phase) * 4;
      this.y = this.baseY + Math.sin(this.phase * 1.3) * 4;

      // Magnetic pull toward ship when close
      if (ship && ship.alive) {
        const dx = ship.x - this.x;
        const dy = ship.y - this.y;
        const dist = Math.hypot(dx, dy);
        const magnetRange = 92;
        if (dist < magnetRange && dist > 1) {
          const pull = (1 - dist / magnetRange) * 240 * dt;
          this.baseX += (dx / dist) * pull;
          this.baseY += (dy / dist) * pull;
          this.x = this.baseX;
          this.y = this.baseY;
        }
      }
    }
  }

  class Powerup {
    constructor(cfg) {
      this.type = cfg.type || 'shield'; // 'shield' or 'repair'
      this.x = cfg.x;
      this.y = cfg.y;
      this.radius = 16;
      this.collected = false;
      this.phase = Math.random() * Math.PI * 2;
    }

    update(dt) {
      if (this.collected) return;
      this.phase += dt * 2.6;
    }
  }

  class WormholePortal {
    constructor(cfg) {
      this.x = cfg.x;
      this.y = cfg.y;
      this.radius = cfg.radius || 44;
      this.unlocked = false;
      this.phase = 0;
    }

    update(dt, ship) {
      this.phase += dt * (this.unlocked ? 3.4 : 1.1);

      // Gentle welcoming gravity pull into the wormhole once unlocked
      if (this.unlocked && ship && ship.alive) {
        const dx = this.x - ship.x;
        const dy = this.y - ship.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.radius * 2.4 && dist > 4) {
          const pull = (1 - dist / (this.radius * 2.4)) * 220 * dt;
          ship.vx += (dx / dist) * pull;
          ship.vy += (dy / dist) * pull;
        }
      }
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.floatingTexts = [];
    }

    emit(x, y, count, options = {}) {
      const {
        color = '#38bdf8',
        minSpeed = 30,
        maxSpeed = 140,
        minLife = 0.25,
        maxLife = 0.65,
        minSize = 2,
        maxSize = 5,
        angle = null,
        spread = Math.PI * 2
      } = options;

      for (let i = 0; i < count; i++) {
        const dir =
          angle !== null
            ? angle + (Math.random() - 0.5) * spread
            : Math.random() * Math.PI * 2;
        const spd = minSpeed + Math.random() * (maxSpeed - minSpeed);
        const life = minLife + Math.random() * (maxLife - minLife);
        const size = minSize + Math.random() * (maxSize - minSize);

        this.particles.push({
          x,
          y,
          vx: Math.cos(dir) * spd,
          vy: Math.sin(dir) * spd,
          life,
          maxLife: life,
          size,
          color
        });
      }

      if (this.particles.length > 350) {
        this.particles.splice(0, this.particles.length - 350);
      }
    }

    addFloatingText(x, y, text, color = '#38bdf8') {
      this.floatingTexts.push({
        x,
        y,
        text,
        color,
        life: 1.15,
        maxLife: 1.15
      });
    }

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 32 * dt;
        ft.life -= dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    clear() {
      this.particles.length = 0;
      this.floatingTexts.length = 0;
    }
  }

  const Entities = {
    Ship,
    Planet,
    Obstacle,
    EnergyParticle,
    Powerup,
    WormholePortal,
    ParticleSystem
  };

  root.Orbital = root.Orbital || {};
  root.Orbital.Entities = Entities;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Entities;
  }
})(typeof window !== 'undefined' ? window : globalThis);
