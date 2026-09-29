/**
 * Orbital Odyssey: Gravity Well
 * High-DPI HTML5 Canvas Renderer, Camera System, Parallax Starfield & Tactical Radar
 */
(function (root) {
  'use strict';

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = 1280;
      this.height = 720;
      this.dpr = 1;

      this.camera = {
        x: 640,
        y: 450,
        zoom: 1,
        targetZoom: 1,
        userZoomOut: false,
        shake: 0
      };

      this.showTrajectory = true;
      this.stars = [];
      this.nebulae = [];
      this.time = 0;

      this._initStarfield();
      this.resize();
    }

    _initStarfield() {
      this.stars = [];
      const colors = ['#ffffff', '#bae6fd', '#fde68a', '#ddd6fe', '#93c5fd'];
      for (let i = 0; i < 220; i++) {
        this.stars.push({
          x: Math.random() * 2600 - 400,
          y: Math.random() * 1800 - 300,
          size: Math.random() * 1.9 + 0.5,
          depth: 0.12 + Math.random() * 0.55,
          twinkleSpeed: 1.5 + Math.random() * 3,
          twinkleOffset: Math.random() * Math.PI * 2,
          color: colors[i % colors.length]
        });
      }

      this.nebulae = [
        { x: 450, y: 350, radius: 520, color: 'rgba(14, 165, 233, 0.07)' },
        { x: 1150, y: 620, radius: 600, color: 'rgba(139, 92, 246, 0.07)' },
        { x: 1650, y: 380, radius: 480, color: 'rgba(20, 184, 166, 0.06)' }
      ];
    }

    resize() {
      if (!this.canvas) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(300, rect.width || window.innerWidth);
      this.height = Math.max(240, rect.height || window.innerHeight);

      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // Automatically scale base zoom for mobile screens so the player sees plenty of space
      const minDim = Math.min(this.width, this.height);
      let baseZoom = 1.0;
      if (minDim < 500) {
        baseZoom = 0.62;
      } else if (minDim < 760) {
        baseZoom = 0.78;
      }
      this.camera.targetZoom = this.camera.userZoomOut ? baseZoom * 0.74 : baseZoom;
    }

    toggleZoom() {
      this.camera.userZoomOut = !this.camera.userZoomOut;
      this.resize();
      return this.camera.userZoomOut;
    }

    addScreenShake(amount) {
      this.camera.shake = Math.min(24, this.camera.shake + amount);
    }

    updateCamera(ship, dt, worldBounds) {
      this.time += dt;

      if (ship) {
        // Velocity look-ahead
        const lookAheadX = ship.x + ship.vx * 0.28;
        const lookAheadY = ship.y + ship.vy * 0.28;
        const lerp = Math.min(1, dt * 6.5);
        this.camera.x += (lookAheadX - this.camera.x) * lerp;
        this.camera.y += (lookAheadY - this.camera.y) * lerp;
      }

      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * Math.min(1, dt * 6);

      if (worldBounds) {
        const halfW = (this.width * 0.35) / this.camera.zoom;
        const halfH = (this.height * 0.35) / this.camera.zoom;
        this.camera.x = Math.max(
          worldBounds.minX + halfW * 0.5,
          Math.min(worldBounds.maxX - halfW * 0.5, this.camera.x)
        );
        this.camera.y = Math.max(
          worldBounds.minY + halfH * 0.5,
          Math.min(worldBounds.maxY - halfH * 0.5, this.camera.y)
        );
      }

      if (this.camera.shake > 0) {
        this.camera.shake = Math.max(0, this.camera.shake - dt * 38);
      }
    }

    render(state) {
      const ctx = this.ctx;
      ctx.save();

      // 1. Deep space background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#071022');
      bgGrad.addColorStop(1, '#040814');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // 2. Parallax Starfield & Nebulae
      this._drawStarfield(ctx);

      // 3. Apply Camera Transform
      ctx.save();
      const shakeX = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;
      const shakeY = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;

      ctx.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.x, -this.camera.y);

      // 4. World Coordinate Grid & Sector Bounds
      if (state.worldBounds) {
        this._drawWorldGridAndBounds(ctx, state.worldBounds);
      }

      // 5. Planetary Gravity Wells (drawn beneath entities)
      if (state.planets) {
        for (let i = 0; i < state.planets.length; i++) {
          this._drawGravityWell(ctx, state.planets[i]);
        }
      }

      // 6. Predictive Orbital Trajectory Arc
      if (this.showTrajectory && state.trajectory && state.ship && state.ship.alive) {
        this._drawTrajectory(ctx, state.ship, state.trajectory);
      }

      // 7. Wormhole Exit Portal
      if (state.portal) {
        this._drawPortal(
          ctx,
          state.portal,
          state.collectedEnergy || 0,
          state.requiredEnergy || 0
        );
      }

      // 8. Planets
      if (state.planets) {
        for (let i = 0; i < state.planets.length; i++) {
          this._drawPlanet(ctx, state.planets[i]);
        }
      }

      // 9. Powerups
      if (state.powerups) {
        for (let i = 0; i < state.powerups.length; i++) {
          if (!state.powerups[i].collected) {
            this._drawPowerup(ctx, state.powerups[i]);
          }
        }
      }

      // 10. Energy Particles
      if (state.energyParticles) {
        for (let i = 0; i < state.energyParticles.length; i++) {
          if (!state.energyParticles[i].collected) {
            this._drawEnergyParticle(ctx, state.energyParticles[i]);
          }
        }
      }

      // 11. Obstacles (Asteroids, Mines, Pulsars)
      if (state.obstacles) {
        for (let i = 0; i < state.obstacles.length; i++) {
          this._drawObstacle(ctx, state.obstacles[i]);
        }
      }

      // 12. Player Spacecraft
      if (state.ship && state.ship.alive) {
        this._drawShip(ctx, state.ship);
      }

      // 13. Particle FX & Floating Score Texts
      if (state.particles) {
        this._drawParticles(ctx, state.particles);
      }

      ctx.restore(); // End world space

      // 14. Screen-space Off-screen Waypoint Indicators & Mini-Radar
      if (state.mode === 'playing' || state.mode === 'paused') {
        this._drawOffscreenIndicators(ctx, state);
        this._drawMiniRadar(ctx, state);
      }

      ctx.restore();
    }

    _drawStarfield(ctx) {
      // Nebula clouds
      for (let i = 0; i < this.nebulae.length; i++) {
        const neb = this.nebulae[i];
        const sx =
          ((neb.x - this.camera.x * 0.18) % (this.width + 800) + (this.width + 800)) %
            (this.width + 800) -
          400;
        const sy =
          ((neb.y - this.camera.y * 0.18) % (this.height + 600) + (this.height + 600)) %
            (this.height + 600) -
          300;
        const grad = ctx.createRadialGradient(sx, sy, 10, sx, sy, neb.radius);
        grad.addColorStop(0, neb.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, neb.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Parallax stars
      const spanW = this.width + 200;
      const spanH = this.height + 200;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const sx = (((s.x - this.camera.x * s.depth) % spanW) + spanW) % spanW - 100;
        const sy = (((s.y - this.camera.y * s.depth) % spanH) + spanH) % spanH - 100;
        if (sx < -4 || sx > this.width + 4 || sy < -4 || sy > this.height + 4) continue;

        const alpha = 0.45 + 0.5 * Math.sin(this.time * s.twinkleSpeed + s.twinkleOffset);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    _drawWorldGridAndBounds(ctx, bounds) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.045)';
      ctx.lineWidth = 1;
      const step = 160;

      const startX = Math.floor(bounds.minX / step) * step;
      const endX = Math.ceil(bounds.maxX / step) * step;
      const startY = Math.floor(bounds.minY / step) * step;
      const endY = Math.ceil(bounds.maxY / step) * step;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += step) {
        ctx.moveTo(x, bounds.minY);
        ctx.lineTo(x, bounds.maxY);
      }
      for (let y = startY; y <= endY; y += step) {
        ctx.moveTo(bounds.minX, y);
        ctx.lineTo(bounds.maxX, y);
      }
      ctx.stroke();

      // Sector boundary energy perimeter
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 10]);
      ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
      ctx.setLineDash([]);
      ctx.restore();
    }

    _drawGravityWell(ctx, planet) {
      ctx.save();
      const gRad = planet.gravityRadius;
      const isBH = planet.type === 'black_hole';

      // Soft radial gravity field
      const grad = ctx.createRadialGradient(
        planet.x,
        planet.y,
        planet.radius,
        planet.x,
        planet.y,
        gRad
      );
      grad.addColorStop(0, planet.atmosphereColor);
      grad.addColorStop(0.55, isBH ? 'rgba(168, 85, 247, 0.09)' : 'rgba(56, 189, 248, 0.05)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, gRad, 0, Math.PI * 2);
      ctx.fill();

      // Outer gravity well boundary ring
      ctx.strokeStyle = isBH ? 'rgba(192, 132, 252, 0.25)' : 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, gRad, 0, Math.PI * 2);
      ctx.stroke();

      // Animated inward-contracting graviton pulse rings
      const pulseCount = 3;
      ctx.setLineDash([]);
      for (let i = 0; i < pulseCount; i++) {
        const progress = ((this.time * 0.32 + i / pulseCount) % 1);
        const r = gRad - progress * (gRad - planet.radius);
        const alpha = Math.sin(progress * Math.PI) * (isBH ? 0.24 : 0.13);
        ctx.strokeStyle = isBH
          ? `rgba(216, 180, 254, ${alpha.toFixed(3)})`
          : `rgba(125, 211, 252, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawTrajectory(ctx, ship, trajectory) {
      const pts = trajectory.points;
      if (!pts || pts.length < 2) return;

      ctx.save();
      const baseColor = trajectory.willImpactPlanet
        ? '#f43f5e'
        : trajectory.willEnterPortal
        ? '#facc15'
        : '#38bdf8';

      for (let i = 1; i < pts.length; i += 2) {
        const p = pts[i];
        const ratio = 1 - i / pts.length;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = ratio * 0.72;
        ctx.beginPath();
        ctx.arc(p.x, p.y, trajectory.willImpactPlanet ? 2.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      if (trajectory.willImpactPlanet && trajectory.impactPoint) {
        const ip = trajectory.impactPoint;
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        const s = 8;
        ctx.beginPath();
        ctx.moveTo(ip.x - s, ip.y - s);
        ctx.lineTo(ip.x + s, ip.y + s);
        ctx.moveTo(ip.x + s, ip.y - s);
        ctx.lineTo(ip.x - s, ip.y + s);
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawPlanet(ctx, planet) {
      ctx.save();
      ctx.translate(planet.x, planet.y);

      if (planet.type === 'black_hole') {
        // Relativistic accretion disk
        for (let i = 3; i >= 1; i--) {
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius + i * 11, 0, Math.PI * 2);
          ctx.strokeStyle =
            i === 1
              ? 'rgba(244, 114, 182, 0.85)'
              : i === 2
              ? 'rgba(168, 85, 247, 0.45)'
              : 'rgba(56, 189, 248, 0.22)';
          ctx.lineWidth = i === 1 ? 4 : 7;
          ctx.stroke();
        }

        // Rotating accretion streamers
        ctx.save();
        ctx.rotate(planet.rotation);
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.65)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius + 14, a, a + 0.9);
          ctx.stroke();
        }
        ctx.restore();

        // Event Horizon Core
        ctx.fillStyle = '#030712';
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        // Back half of planetary rings if gas giant
        if (planet.hasRings) {
          ctx.save();
          ctx.rotate(-0.35);
          ctx.scale(1, 0.34);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.38)';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius * 1.55, Math.PI, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Planet Sphere Gradient
        const grad = ctx.createRadialGradient(
          -planet.radius * 0.32,
          -planet.radius * 0.32,
          planet.radius * 0.1,
          0,
          0,
          planet.radius
        );
        grad.addColorStop(0, planet.color);
        grad.addColorStop(0.72, planet.secondaryColor);
        grad.addColorStop(1, '#090d16');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
        ctx.fill();

        // Surface Details clipped inside planet circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.rotate(planet.rotation);

        if (planet.type === 'gas_giant') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          for (let y = -planet.radius + 16; y < planet.radius; y += 24) {
            ctx.fillRect(-planet.radius, y, planet.radius * 2, 9);
          }
        } else {
          ctx.fillStyle =
            planet.type === 'lava'
              ? 'rgba(254, 240, 138, 0.28)'
              : planet.type === 'terran'
              ? 'rgba(52, 211, 153, 0.28)'
              : 'rgba(255, 255, 255, 0.14)';
          for (let i = 0; i < planet.features.length; i++) {
            const f = planet.features[i];
            const fx = Math.cos(f.a) * f.dist;
            const fy = Math.sin(f.a) * f.dist;
            ctx.beginPath();
            ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // Atmospheric rim glow
        ctx.strokeStyle = planet.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Front half of planetary rings
        if (planet.hasRings) {
          ctx.save();
          ctx.rotate(-0.35);
          ctx.scale(1, 0.34);
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius * 1.55, 0, Math.PI);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Planet Name Label
      ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      ctx.font = '600 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name.toUpperCase(), 0, planet.radius + 22);

      ctx.restore();
    }

    _drawPortal(ctx, portal, collected, required) {
      ctx.save();
      ctx.translate(portal.x, portal.y);

      const unlocked = portal.unlocked;
      const primaryColor = unlocked ? '#22d3ee' : '#64748b';
      const accentColor = unlocked ? '#a855f7' : '#475569';

      // Outer aura
      const auraGrad = ctx.createRadialGradient(
        0,
        0,
        portal.radius * 0.2,
        0,
        0,
        portal.radius * 1.75
      );
      auraGrad.addColorStop(
        0,
        unlocked ? 'rgba(34, 211, 238, 0.45)' : 'rgba(100, 116, 139, 0.2)'
      );
      auraGrad.addColorStop(
        0.6,
        unlocked ? 'rgba(168, 85, 247, 0.24)' : 'rgba(71, 85, 105, 0.08)'
      );
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius * 1.75, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Gate Rings
      for (let ring = 0; ring < 3; ring++) {
        ctx.save();
        ctx.rotate(portal.phase * (ring % 2 === 0 ? 1 : -1) + ring * 1.1);
        ctx.strokeStyle = ring === 0 ? primaryColor : accentColor;
        ctx.lineWidth = ring === 0 ? 4 : 2.5;
        ctx.setLineDash(unlocked ? [18, 10] : [10, 14]);
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius - ring * 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Inner Warp Core
      ctx.fillStyle = unlocked ? '#e0f2fe' : '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, unlocked ? 12 + Math.sin(portal.phase * 2) * 3 : 9, 0, Math.PI * 2);
      ctx.fill();

      // Status Telemetry Label
      ctx.font = '700 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = unlocked ? '#67e8f9' : '#94a3b8';
      const label = unlocked
        ? 'WORMHOLE OPEN • ENTER GATE'
        : `GATE LOCKED (${collected}/${required} ORBS)`;
      ctx.fillText(label, 0, -portal.radius - 16);

      ctx.restore();
    }

    _drawEnergyParticle(ctx, orb) {
      ctx.save();
      ctx.translate(orb.x, orb.y);

      const pulse = 1 + Math.sin(orb.phase * 2) * 0.14;

      // Glow halo
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, orb.radius * 2.1);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.32)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, orb.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Rotating outer ring
      ctx.save();
      ctx.rotate(orb.phase);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, orb.radius * 0.88 * pulse, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();

      // Inner crystal diamond
      ctx.rotate(-orb.phase * 0.8);
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      const s = 7.5 * pulse;
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.78, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.78, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    _drawPowerup(ctx, item) {
      ctx.save();
      ctx.translate(item.x, item.y);
      const isShield = item.type === 'shield';
      const color = isShield ? '#60a5fa' : '#4ade80';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius + Math.sin(item.phase * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, item.radius - 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isShield ? 'S' : '+', 0, 1);

      ctx.restore();
    }

    _drawObstacle(ctx, obs) {
      ctx.save();
      ctx.translate(obs.x, obs.y);

      if (obs.type === 'asteroid') {
        ctx.rotate(obs.angle);
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const verts = obs.vertices;
        if (verts && verts.length > 0) {
          ctx.moveTo(verts[0].x, verts[0].y);
          for (let i = 1; i < verts.length; i++) {
            ctx.lineTo(verts[i].x, verts[i].y);
          }
          ctx.closePath();
        } else {
          ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Crater detail
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-obs.radius * 0.25, -obs.radius * 0.2, obs.radius * 0.24, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'mine') {
        // Proximity warning ring
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius * 2.2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(obs.angle);
        // Spikes
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (obs.radius + 6), Math.sin(a) * (obs.radius + 6));
          ctx.stroke();
        }

        // Mine hull
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Blinking core
        const blink = Math.sin(this.time * 9 + obs.phase) > 0;
        ctx.fillStyle = blink ? '#fb7185' : '#881337';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'pulsar') {
        // Sweeping Laser Beams
        const bx = Math.cos(obs.angle) * obs.beamLength;
        const by = Math.sin(obs.angle) * obs.beamLength;

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.32)';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-bx, -by);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-bx, -by);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Emitter Satellite Core
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawShip(ctx, ship) {
      // Ion Ribbon Trail
      if (ship.trail && ship.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < ship.trail.length; i++) {
          const p0 = ship.trail[i - 1];
          const p1 = ship.trail[i];
          const ratio = i / ship.trail.length;
          ctx.strokeStyle = p1.boosting
            ? `rgba(250, 204, 21, ${ratio * 0.75})`
            : `rgba(56, 189, 248, ${ratio * 0.55})`;
          ctx.lineWidth = ratio * (p1.boosting ? 7 : 4.5);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Blinking effect during post-damage invulnerability
      if (ship.invulnerableTimer > 0 && Math.floor(ship.invulnerableTimer * 14) % 2 === 0) {
        ctx.globalAlpha = 0.48;
      }

      // Thruster Flame Plume
      if (ship.thrusting || ship.boosting) {
        const flameLen = (ship.boosting ? 36 : 22) + Math.random() * 8;
        const grad = ctx.createLinearGradient(-12, 0, -12 - flameLen, 0);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, ship.boosting ? '#facc15' : '#38bdf8');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-12, -6);
        ctx.lineTo(-12 - flameLen, 0);
        ctx.lineTo(-12, 6);
        ctx.closePath();
        ctx.fill();
      }

      // Retro-brake reverse nozzles
      if (ship.braking) {
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8, -10);
        ctx.lineTo(18, -15);
        ctx.moveTo(8, 10);
        ctx.lineTo(18, 15);
        ctx.stroke();
      }

      // Spacecraft Delta Hull
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 0);       // Nose cone
      ctx.lineTo(-13, -13);    // Left wingtip
      ctx.lineTo(-8, -4);
      ctx.lineTo(-14, 0);      // Rear engine nozzle
      ctx.lineTo(-8, 4);
      ctx.lineTo(-13, 13);     // Right wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit Canopy
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(3, 0, 6.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Active Shield Bubble
      if (ship.shieldTimer > 0) {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.85)';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, ship.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawParticles(ctx, particleSys) {
      for (let i = 0; i < particleSys.particles.length; i++) {
        const p = particleSys.particles[i];
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < particleSys.floatingTexts.length; i++) {
        const ft = particleSys.floatingTexts[i];
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '700 14px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }

    _drawOffscreenIndicators(ctx, state) {
      if (!state.ship) return;
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const pad = 36;

      const targets = [];

      // Always point to the Wormhole Portal
      if (state.portal) {
        targets.push({
          x: state.portal.x,
          y: state.portal.y,
          color: state.portal.unlocked ? '#22d3ee' : '#94a3b8',
          label: state.portal.unlocked ? 'GATE' : 'LOCKED',
          priority: true
        });
      }

      // Point to uncollected Energy Particles
      if (state.energyParticles) {
        for (let i = 0; i < state.energyParticles.length; i++) {
          const orb = state.energyParticles[i];
          if (!orb.collected) {
            targets.push({
              x: orb.x,
              y: orb.y,
              color: '#34d399',
              label: 'ORB',
              priority: false
            });
          }
        }
      }

      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const screenX = (t.x - this.camera.x) * this.camera.zoom + halfW;
        const screenY = (t.y - this.camera.y) * this.camera.zoom + halfH;

        // Skip if visible inside screen
        if (
          screenX >= pad &&
          screenX <= this.width - pad &&
          screenY >= pad &&
          screenY <= this.height - pad
        ) {
          continue;
        }

        const dx = screenX - halfW;
        const dy = screenY - halfH;
        const angle = Math.atan2(dy, dx);

        const maxRx = halfW - pad;
        const maxRy = halfH - pad;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const scale = Math.min(
          Math.abs(cos) > 0.001 ? maxRx / Math.abs(cos) : Infinity,
          Math.abs(sin) > 0.001 ? maxRy / Math.abs(sin) : Infinity
        );

        const ix = halfW + cos * scale;
        const iy = halfH + sin * scale;

        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(angle);

        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-7, -6);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    _drawMiniRadar(ctx, state) {
      if (!state.worldBounds || this.width < 340) return;
      const bounds = state.worldBounds;
      const isCompact = this.width <= 720;
      const radarW = isCompact ? 96 : 138;
      const radarH = Math.round(
        radarW * ((bounds.maxY - bounds.minY) / (bounds.maxX - bounds.minX))
      );
      const rx = this.width - radarW - (isCompact ? 8 : 14);
      const ry = isCompact ? 106 : 70;

      ctx.save();
      ctx.fillStyle = 'rgba(9, 15, 32, 0.72)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, radarW, radarH, 8);
      } else {
        ctx.rect(rx, ry, radarW, radarH);
      }
      ctx.fill();
      ctx.stroke();

      const mapX = (wx) =>
        rx + ((wx - bounds.minX) / (bounds.maxX - bounds.minX)) * radarW;
      const mapY = (wy) =>
        ry + ((wy - bounds.minY) / (bounds.maxY - bounds.minY)) * radarH;

      // Planets
      if (state.planets) {
        for (let i = 0; i < state.planets.length; i++) {
          const p = state.planets[i];
          ctx.fillStyle = p.type === 'black_hole' ? '#c084fc' : p.color;
          ctx.beginPath();
          ctx.arc(mapX(p.x), mapY(p.y), Math.max(3, p.radius * 0.045), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Energy Orbs
      if (state.energyParticles) {
        ctx.fillStyle = '#34d399';
        for (let i = 0; i < state.energyParticles.length; i++) {
          const orb = state.energyParticles[i];
          if (!orb.collected) {
            ctx.beginPath();
            ctx.arc(mapX(orb.x), mapY(orb.y), 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Portal
      if (state.portal) {
        ctx.strokeStyle = state.portal.unlocked ? '#22d3ee' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mapX(state.portal.x), mapY(state.portal.y), 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Player Ship
      if (state.ship && state.ship.alive) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mapX(state.ship.x), mapY(state.ship.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  root.Orbital = root.Orbital || {};
  root.Orbital.Renderer = Renderer;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
  }
})(typeof window !== 'undefined' ? window : globalThis);
