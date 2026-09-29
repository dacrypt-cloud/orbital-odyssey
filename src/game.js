/**
 * Orbital Odyssey: Gravity Well
 * Main Game Engine, State Machine, Collision Handler, Scoring & UI Controller
 */
(function (root) {
  'use strict';

  const { Physics, Levels, Entities, Renderer, InputController, SoundEngine } = root.Orbital;

  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.sound = new SoundEngine();
      this.renderer = new Renderer(this.canvas);
      this.particles = new Entities.ParticleSystem();

      this.mode = 'menu'; // 'menu' | 'playing' | 'paused' | 'level_complete' | 'game_over'
      this.currentLevelNum = 1;
      this.unlockedLevel = 1;
      this.levelStars = {};
      this.score = 0;
      this.levelScore = 0;
      this.highScore = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.levelTime = 0;
      this.lastDamageCause = 'Planetary Impact';

      this.levelConfig = null;
      this.worldBounds = null;
      this.ship = null;
      this.planets = [];
      this.obstacles = [];
      this.energyParticles = [];
      this.powerups = [];
      this.portal = null;
      this.trajectory = null;

      this.collectedEnergy = 0;
      this.totalEnergy = 0;
      this.requiredEnergy = 0;

      this.touchHudMode = 'auto'; // 'auto' | 'on' | 'off'

      this._loadProgress();

      this.input = new InputController({
        onPauseToggle: () => {
          if (this.mode === 'playing') this.pauseGame();
          else if (this.mode === 'paused') this.resumeGame();
        },
        onRestart: () => {
          if (this.mode === 'playing' || this.mode === 'paused' || this.mode === 'game_over') {
            this.restartLevel();
          }
        },
        onMuteToggle: () => this.toggleMute(),
        onTrajectoryToggle: () => this.toggleTrajectory(),
        onZoomToggle: () => this.toggleZoom()
      });

      this._bindUIEvents();
      this._setupMenuBackgroundScene();
      this._updateTouchVisibility();
      this._renderSectorSelectGrid();
      this._syncAllUI();

      window.addEventListener('resize', () => {
        this.renderer.resize();
        this._updateTouchVisibility();
      });

      this.lastFrameTime = performance.now();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    _loadProgress() {
      try {
        const savedHigh = localStorage.getItem('orbital_odyssey_highscore');
        if (savedHigh) this.highScore = parseInt(savedHigh, 10) || 0;

        const savedUnlocked = localStorage.getItem('orbital_odyssey_unlocked');
        if (savedUnlocked) this.unlockedLevel = Math.max(1, parseInt(savedUnlocked, 10) || 1);

        const savedStars = localStorage.getItem('orbital_odyssey_stars');
        if (savedStars) this.levelStars = JSON.parse(savedStars) || {};
      } catch (e) {}
    }

    _saveProgress() {
      try {
        if (this.score > this.highScore) {
          this.highScore = this.score;
        }
        localStorage.setItem('orbital_odyssey_highscore', String(this.highScore));
        localStorage.setItem('orbital_odyssey_unlocked', String(this.unlockedLevel));
        localStorage.setItem('orbital_odyssey_stars', JSON.stringify(this.levelStars));
      } catch (e) {}
    }

    _setupMenuBackgroundScene() {
      // Load Sector 1 as an interactive orbital background preview while on the Start Screen
      this.loadLevel(1, { preserveScore: false, isMenuPreview: true });
    }

    loadLevel(levelNum, options = {}) {
      const { preserveScore = true, isMenuPreview = false } = options;

      this.currentLevelNum = Math.max(1, Math.floor(levelNum));
      this.levelConfig = Levels.getLevelConfig(this.currentLevelNum);
      this.worldBounds = { ...this.levelConfig.worldBounds };

      if (!preserveScore) {
        this.score = 0;
      }
      this.levelScore = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.levelTime = 0;

      const startingLives =
        preserveScore && this.ship && this.ship.lives > 0 ? this.ship.lives : 3;
      this.ship = new Entities.Ship(this.levelConfig.spawn, startingLives);

      this.planets = (this.levelConfig.planets || []).map((p) => new Entities.Planet(p));
      this.obstacles = (this.levelConfig.obstacles || []).map((o) => new Entities.Obstacle(o));
      this.energyParticles = (this.levelConfig.energyParticles || []).map(
        (e, i) => new Entities.EnergyParticle(e, i)
      );
      this.powerups = (this.levelConfig.powerups || []).map((pw) => new Entities.Powerup(pw));
      this.portal = new Entities.WormholePortal(this.levelConfig.portal);

      this.collectedEnergy = 0;
      this.totalEnergy = this.energyParticles.length;
      this.requiredEnergy = Math.min(
        this.totalEnergy,
        this.levelConfig.requiredEnergy || Math.ceil(this.totalEnergy * 0.7)
      );

      this.particles.clear();
      this.input.resetAll();

      // Center camera on ship or sector midpoint
      this.renderer.camera.x = isMenuPreview ? 740 : this.ship.x + 140;
      this.renderer.camera.y = isMenuPreview ? 470 : this.ship.y;
      this.renderer.resize();

      if (!isMenuPreview) {
        this.mode = 'playing';
        this._showBanner(
          `SECTOR 0${this.currentLevelNum}: ${this.levelConfig.name.toUpperCase()}`,
          this.levelConfig.hint || this.levelConfig.subtitle
        );
      }

      this._syncAllUI();
    }

    startNewGame(startLevel = 1) {
      this.sound.init();
      this.sound.playClick();
      this.score = 0;
      if (this.ship) this.ship.lives = 3;
      this.loadLevel(startLevel, { preserveScore: false, isMenuPreview: false });
    }

    restartLevel() {
      this.sound.playClick();
      if (this.ship) {
        this.ship.lives = 3;
      }
      // Revert score to start of this level
      this.score = Math.max(0, this.score - this.levelScore);
      this.loadLevel(this.currentLevelNum, { preserveScore: true, isMenuPreview: false });
    }

    nextLevel() {
      this.sound.playClick();
      const next = this.currentLevelNum + 1;
      this.loadLevel(next, { preserveScore: true, isMenuPreview: false });
    }

    pauseGame() {
      if (this.mode !== 'playing') return;
      this.sound.playClick();
      this.sound.updateThruster(false, false);
      this.mode = 'paused';
      this.input.resetAll();
      this._syncAllUI();
    }

    resumeGame() {
      if (this.mode !== 'paused') return;
      this.sound.playClick();
      this.mode = 'playing';
      this.lastFrameTime = performance.now();
      this._syncAllUI();
    }

    returnToMainMenu() {
      this.sound.playClick();
      this.sound.updateThruster(false, false);
      this.mode = 'menu';
      this._setupMenuBackgroundScene();
      this._renderSectorSelectGrid();
      this._syncAllUI();
    }

    toggleMute() {
      const muted = this.sound.toggleMute();
      this._syncAllUI();
      return muted;
    }

    toggleTrajectory() {
      this.renderer.showTrajectory = !this.renderer.showTrajectory;
      this.sound.playClick();
      this._syncAllUI();
      return this.renderer.showTrajectory;
    }

    toggleZoom() {
      const zoomedOut = this.renderer.toggleZoom();
      this.sound.playClick();
      this._syncAllUI();
      return zoomedOut;
    }

    cycleTouchHudMode() {
      if (this.touchHudMode === 'auto') this.touchHudMode = 'on';
      else if (this.touchHudMode === 'on') this.touchHudMode = 'off';
      else this.touchHudMode = 'auto';
      this.sound.playClick();
      this._updateTouchVisibility();
      this._syncAllUI();
    }

    _updateTouchVisibility() {
      const touchCluster = document.getElementById('touch-controls');
      if (!touchCluster) return;

      const isMobileViewport =
        window.innerWidth <= 960 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;

      let show = true;
      if (this.touchHudMode === 'on') show = true;
      else if (this.touchHudMode === 'off') show = false;
      else show = isMobileViewport || window.innerWidth <= 1100;

      // Always keep touch controls accessible during active gameplay when enabled
      touchCluster.classList.toggle('hidden-touch', !show);
    }

    _showBanner(title, subtitle) {
      const banner = document.getElementById('sector-banner');
      const titleEl = document.getElementById('banner-title');
      const subEl = document.getElementById('banner-subtitle');
      if (!banner || !titleEl || !subEl) return;

      titleEl.textContent = title;
      subEl.textContent = subtitle;
      banner.classList.add('visible');

      if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
      this._bannerTimeout = setTimeout(() => {
        banner.classList.remove('visible');
      }, 3600);
    }

    _loop(now) {
      const rawDt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      if (this.mode === 'playing') {
        this.update(dt);
      } else if (this.mode === 'menu') {
        this._updateMenuDemo(dt);
      }

      this.renderer.render({
        mode: this.mode,
        worldBounds: this.worldBounds,
        ship: this.ship,
        planets: this.planets,
        obstacles: this.obstacles,
        energyParticles: this.energyParticles,
        powerups: this.powerups,
        portal: this.portal,
        trajectory: this.trajectory,
        particles: this.particles,
        collectedEnergy: this.collectedEnergy,
        requiredEnergy: this.requiredEnergy
      });

      requestAnimationFrame(this._loop);
    }

    _updateMenuDemo(dt) {
      // Gently orbit the demo ship around New Terra on the start screen
      for (let i = 0; i < this.planets.length; i++) {
        this.planets[i].update(dt);
      }
      for (let i = 0; i < this.energyParticles.length; i++) {
        this.energyParticles[i].update(dt, null);
      }
      if (this.portal) {
        this.portal.unlocked = true;
        this.portal.update(dt, null);
      }
      if (this.ship && this.planets[0]) {
        const p = this.planets[0];
        const orbitAngle = this.renderer.time * 0.55;
        const r = p.radius + 135;
        this.ship.x = p.x + Math.cos(orbitAngle) * r;
        this.ship.y = p.y + Math.sin(orbitAngle) * r;
        this.ship.angle = orbitAngle + Math.PI / 2;
        this.ship.thrusting = true;
        this.ship.updateTrail();
      }
      this.renderer.updateCamera({ x: 740, y: 470, vx: 0, vy: 0 }, dt, this.worldBounds);
    }

    update(dt) {
      this.levelTime += dt;

      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 1;
          this._syncHUD();
        }
      }

      // 1. Update Planets
      for (let i = 0; i < this.planets.length; i++) {
        this.planets[i].update(dt);
      }

      // 2. Update Obstacles
      for (let i = 0; i < this.obstacles.length; i++) {
        this.obstacles[i].update(dt, this.planets, this.worldBounds);
      }

      // 3. Update Spacecraft Physics
      const controlState = this.input.getState();
      const { gravityInfo } = Physics.integrateShip(
        this.ship,
        this.planets,
        controlState,
        dt,
        this.worldBounds
      );

      this.sound.updateThruster(this.ship.thrusting, this.ship.boosting);

      if (this.ship.alive) {
        this.ship.updateTrail();

        // Emit engine exhaust particles
        if (this.ship.thrusting || this.ship.boosting) {
          const exhaustX = this.ship.x - Math.cos(this.ship.angle) * 16;
          const exhaustY = this.ship.y - Math.sin(this.ship.angle) * 16;
          this.particles.emit(exhaustX, exhaustY, 1, {
            color: this.ship.boosting ? '#facc15' : '#38bdf8',
            minSpeed: 40,
            maxSpeed: 110,
            minLife: 0.15,
            maxLife: 0.32,
            minSize: 2,
            maxSize: 4,
            angle: this.ship.angle + Math.PI,
            spread: 0.45
          });
        }

        // Check for close Gravity Slingshot maneuver bonus
        if (this.ship.slingshotCooldown > 0) {
          this.ship.slingshotCooldown -= dt;
        } else if (
          gravityInfo.strongestPlanet &&
          gravityInfo.nearestSurfaceDist > 8 &&
          gravityInfo.nearestSurfaceDist < 68 &&
          Math.hypot(this.ship.vx, this.ship.vy) > 235
        ) {
          this.ship.slingshotCooldown = 4.5;
          const bonus = 250;
          this.score += bonus;
          this.levelScore += bonus;
          this.sound.playSlingshot();
          this.particles.addFloatingText(
            this.ship.x,
            this.ship.y - 24,
            `+${bonus} GRAVITY SLINGSHOT!`,
            '#facc15'
          );
        }
      }

      // 4. Update & Collect Energy Particles
      for (let i = 0; i < this.energyParticles.length; i++) {
        const orb = this.energyParticles[i];
        if (orb.collected) continue;
        orb.update(dt, this.ship);

        if (this.ship.alive) {
          const col = Physics.checkCircleCollision(this.ship, orb);
          if (col.collided) {
            this.collectEnergyOrb(orb);
          }
        }
      }

      // 5. Update & Collect Powerups
      for (let i = 0; i < this.powerups.length; i++) {
        const pw = this.powerups[i];
        if (pw.collected) continue;
        pw.update(dt);

        if (this.ship.alive) {
          const col = Physics.checkCircleCollision(this.ship, pw);
          if (col.collided) {
            pw.collected = true;
            this.sound.playPowerup();
            if (pw.type === 'shield') {
              this.ship.shieldTimer = 10.0;
              this.particles.addFloatingText(
                pw.x,
                pw.y - 16,
                'DEFLECTOR SHIELD ACTIVE!',
                '#60a5fa'
              );
            } else {
              this.ship.health = Math.min(this.ship.maxHealth, this.ship.health + 45);
              this.particles.addFloatingText(
                pw.x,
                pw.y - 16,
                '+45% HULL REPAIRED!',
                '#4ade80'
              );
            }
            this.particles.emit(pw.x, pw.y, 18, {
              color: pw.type === 'shield' ? '#60a5fa' : '#4ade80',
              minSpeed: 50,
              maxSpeed: 160
            });
          }
        }
      }

      // 6. Check Collisions with Planets & Obstacles
      this._handleHazardCollisions();

      // 7. Update Wormhole Portal & Check Level Completion
      if (this.portal) {
        const wasUnlocked = this.portal.unlocked;
        this.portal.unlocked = this.collectedEnergy >= this.requiredEnergy;
        if (!wasUnlocked && this.portal.unlocked) {
          this.sound.playPortalUnlock();
          this.particles.addFloatingText(
            this.portal.x,
            this.portal.y - 55,
            'WORMHOLE PORTAL UNLOCKED!',
            '#22d3ee'
          );
          this._showBanner(
            'WORMHOLE PORTAL OPEN',
            'Navigate into the swirling Wormhole Exit Gate to complete the sector!'
          );
        }

        this.portal.update(dt, this.ship);

        if (this.portal.unlocked && this.ship.alive) {
          const distToPortal = Math.hypot(
            this.ship.x - this.portal.x,
            this.ship.y - this.portal.y
          );
          if (distToPortal <= this.portal.radius + this.ship.radius * 0.6) {
            this.completeLevel();
            return;
          }
        }
      }

      // 8. Compute Predictive Trajectory Line
      if (this.ship.alive) {
        this.trajectory = Physics.predictTrajectory(
          this.ship,
          this.planets,
          this.portal,
          52,
          0.045
        );
      }

      // 9. Update Particle System & Camera
      this.particles.update(dt);
      this.renderer.updateCamera(this.ship, dt, this.worldBounds);
      this._syncHUD(gravityInfo);
    }

    collectEnergyOrb(orb) {
      orb.collected = true;
      this.collectedEnergy += 1;

      const gained = Math.round(orb.value * this.combo);
      this.score += gained;
      this.levelScore += gained;

      // Refill boost capacitor on energy pickup
      this.ship.fuel = Math.min(this.ship.maxFuel, this.ship.fuel + 28);

      this.sound.playCollect(this.combo);
      this.particles.emit(orb.x, orb.y, 16, {
        color: '#34d399',
        minSpeed: 45,
        maxSpeed: 155
      });

      const comboLabel = this.combo > 1 ? ` (${this.combo}x)` : '';
      this.particles.addFloatingText(orb.x, orb.y - 14, `+${gained}${comboLabel}`, '#34d399');

      this.combo = Math.min(5, this.combo + 1);
      this.comboTimer = 5.5;
      this._syncHUD();
    }

    _handleHazardCollisions() {
      if (!this.ship || !this.ship.alive) return;

      // A. Ship vs Planets
      for (let i = 0; i < this.planets.length; i++) {
        const planet = this.planets[i];
        const bounce = Physics.resolveElasticBounce(this.ship, planet, 0.58, 110);
        if (bounce.collided) {
          let dmg = 28;
          let cause = `Crashed into ${planet.name}`;
          if (planet.type === 'black_hole') {
            dmg = 60;
            cause = `Crushed by ${planet.name} Event Horizon`;
          } else if (planet.type === 'lava') {
            dmg = 42;
            cause = `Incinerated by ${planet.name}`;
          } else {
            dmg = Math.min(45, Math.max(20, Math.round(bounce.impactSpeed * 0.14)));
          }
          this.applyDamage(dmg, cause);
          return;
        }
      }

      // B. Ship vs Obstacles (Asteroids, Mines, Pulsars)
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];

        // Check Pulsar Rotating Laser Beams first
        if (obs.type === 'pulsar') {
          const bx = Math.cos(obs.angle) * obs.beamLength;
          const by = Math.sin(obs.angle) * obs.beamLength;
          const beamDist = Physics.pointToSegmentDistance(
            this.ship.x,
            this.ship.y,
            obs.x - bx,
            obs.y - by,
            obs.x + bx,
            obs.y + by
          );
          if (beamDist <= this.ship.radius + 5) {
            // Knock ship perpendicular to beam
            const perpAngle = obs.angle + Math.PI / 2;
            this.ship.vx += Math.cos(perpAngle) * 140;
            this.ship.vy += Math.sin(perpAngle) * 140;
            this.applyDamage(30, 'Sliced by Pulsar Laser Beam');
            return;
          }
        }

        // Check circular body collision
        const bounce = Physics.resolveElasticBounce(this.ship, obs, 0.72, 125);
        if (bounce.collided) {
          const dmg = obs.type === 'mine' ? 40 : 25;
          const cause =
            obs.type === 'mine'
              ? 'Detonated Proximity Space Mine'
              : 'Hull Breach from Asteroid Impact';
          this.applyDamage(dmg, cause);
          return;
        }
      }
    }

    applyDamage(amount, cause = 'Deep Space Hazard') {
      if (!this.ship || !this.ship.alive) return;

      // If active shield bubble is up, absorb the hit!
      if (this.ship.shieldTimer > 0) {
        this.ship.shieldTimer = Math.max(0, this.ship.shieldTimer - 3.5);
        this.ship.invulnerableTimer = 0.65;
        this.sound.playClick();
        this.renderer.addScreenShake(6);
        this.particles.emit(this.ship.x, this.ship.y, 14, {
          color: '#60a5fa',
          minSpeed: 60,
          maxSpeed: 170
        });
        this.particles.addFloatingText(
          this.ship.x,
          this.ship.y - 20,
          'SHIELD ABSORBED IMPACT!',
          '#60a5fa'
        );
        this._syncHUD();
        return;
      }

      if (this.ship.invulnerableTimer > 0) return;

      this.lastDamageCause = cause;
      this.ship.health = Math.max(0, this.ship.health - amount);
      this.ship.invulnerableTimer = 1.15;
      this.combo = 1;
      this.comboTimer = 0;

      this.renderer.addScreenShake(12);
      this.particles.emit(this.ship.x, this.ship.y, 22, {
        color: '#fb7185',
        minSpeed: 50,
        maxSpeed: 190
      });
      this.particles.addFloatingText(
        this.ship.x,
        this.ship.y - 20,
        `-${amount}% HULL`,
        '#fb7185'
      );

      if (this.ship.health <= 0) {
        this.sound.playExplosion();
        this.ship.lives -= 1;

        this.particles.emit(this.ship.x, this.ship.y, 45, {
          color: '#f97316',
          minSpeed: 60,
          maxSpeed: 240,
          minSize: 3,
          maxSize: 6
        });

        if (this.ship.lives > 0) {
          // Respawn ship at sector entry point with remaining lives
          this.ship.resetToSpawn();
          this.ship.invulnerableTimer = 2.2;
          this.particles.addFloatingText(
            this.ship.x,
            this.ship.y - 28,
            `RESERVE SHIP DEPLOYED (${this.ship.lives} LEFT)`,
            '#38bdf8'
          );
        } else {
          this.triggerGameOver();
        }
      } else {
        this.sound.playDamage();
      }

      this._syncHUD();
    }

    completeLevel() {
      if (this.mode === 'level_complete') return;
      this.mode = 'level_complete';
      this.input.resetAll();
      this.sound.playLevelComplete();

      // Calculate end-of-sector bonuses
      const hullBonus = Math.round(this.ship.health) * 5;
      const par = this.levelConfig.parTime || 50;
      const timeBonus = Math.max(0, Math.round((par - this.levelTime) * 12));
      const allOrbsCollected = this.collectedEnergy >= this.totalEnergy;
      const perfectBonus = allOrbsCollected ? 500 : 0;

      const totalBonus = hullBonus + timeBonus + perfectBonus;
      this.score += totalBonus;
      this.levelScore += totalBonus;

      // Determine Star Rating (1 to 3 stars)
      let stars = 1;
      if (allOrbsCollected && this.ship.health >= 65) {
        stars = 3;
      } else if (allOrbsCollected || this.ship.health >= 50) {
        stars = 2;
      }

      const prevStars = this.levelStars[this.currentLevelNum] || 0;
      this.levelStars[this.currentLevelNum] = Math.max(prevStars, stars);
      this.unlockedLevel = Math.max(this.unlockedLevel, this.currentLevelNum + 1);
      this._saveProgress();

      // Populate Level Complete Modal
      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setEl('complete-sector-name', `Sector 0${this.currentLevelNum}: ${this.levelConfig.name}`);
      setEl('complete-orbs', `${this.collectedEnergy} / ${this.totalEnergy}`);
      setEl('complete-hull-bonus', `+${hullBonus}`);
      setEl('complete-time-bonus', `+${timeBonus}`);
      setEl('complete-perfect-bonus', allOrbsCollected ? '+500 (PERFECT!)' : '+0');
      setEl('complete-total-score', String(this.score));

      const starContainer = document.getElementById('complete-stars');
      if (starContainer) {
        starContainer.innerHTML = [1, 2, 3]
          .map(
            (idx) =>
              `<span class="star-badge ${idx <= stars ? 'earned' : 'empty'}">★</span>`
          )
          .join('');
      }

      this._renderSectorSelectGrid();
      this._syncAllUI();
    }

    triggerGameOver() {
      this.mode = 'game_over';
      this.ship.alive = false;
      this.input.resetAll();
      this.sound.playGameOver();
      this._saveProgress();

      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setEl('gameover-cause', this.lastDamageCause);
      setEl('gameover-sector', `Sector 0${this.currentLevelNum}: ${this.levelConfig.name}`);
      setEl('gameover-score', String(this.score));
      setEl('gameover-highscore', String(this.highScore));
      setEl('gameover-orbs', `${this.collectedEnergy} / ${this.totalEnergy}`);

      this._syncAllUI();
    }

    _renderSectorSelectGrid() {
      const grid = document.getElementById('sector-select-grid');
      if (!grid) return;

      grid.innerHTML = '';
      Levels.CAMPAIGN_LEVELS.forEach((lvl) => {
        const isUnlocked = lvl.id <= this.unlockedLevel;
        const stars = this.levelStars[lvl.id] || 0;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `sector-card ${isUnlocked ? 'unlocked' : 'locked'} ${
          lvl.id === this.currentLevelNum ? 'selected' : ''
        }`;
        card.dataset.level = String(lvl.id);

        const starStr = [1, 2, 3]
          .map((s) => (s <= stars ? '★' : '☆'))
          .join('');

        card.innerHTML = `
          <div class="sector-card-top">
            <span class="sector-num">SECTOR 0${lvl.id}</span>
            <span class="sector-stars">${isUnlocked ? starStr : '☆☆☆'}</span>
          </div>
          <div class="sector-title">${lvl.name}</div>
        `;

        card.addEventListener('click', () => {
          // Allow selecting any campaign sector (or unlocked sector) for immediate playability
          this.startNewGame(lvl.id);
        });

        grid.appendChild(card);
      });
    }

    _bindUIEvents() {
      const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            fn();
          });
        }
      };

      // Start Screen Buttons
      bindClick('btn-play', () => this.startNewGame(1));
      bindClick('btn-continue-sector', () => this.startNewGame(this.unlockedLevel));
      bindClick('btn-how-to-play', () => {
        const modal = document.getElementById('howto-modal');
        if (modal) modal.classList.remove('hidden');
        this.sound.playClick();
      });
      bindClick('btn-close-howto', () => {
        const modal = document.getElementById('howto-modal');
        if (modal) modal.classList.add('hidden');
        this.sound.playClick();
      });

      // Top HUD Buttons
      bindClick('btn-pause', () => {
        if (this.mode === 'playing') this.pauseGame();
        else if (this.mode === 'paused') this.resumeGame();
      });
      bindClick('btn-hud-restart', () => this.restartLevel());
      bindClick('btn-hud-mute', () => this.toggleMute());
      bindClick('btn-hud-trajectory', () => this.toggleTrajectory());
      bindClick('btn-hud-zoom', () => this.toggleZoom());
      bindClick('btn-hud-touch', () => this.cycleTouchHudMode());

      // Pause Modal Buttons
      bindClick('btn-resume', () => this.resumeGame());
      bindClick('btn-pause-restart', () => this.restartLevel());
      bindClick('btn-pause-mute', () => this.toggleMute());
      bindClick('btn-pause-trajectory', () => this.toggleTrajectory());
      bindClick('btn-pause-touch', () => this.cycleTouchHudMode());
      bindClick('btn-pause-menu', () => this.returnToMainMenu());

      // Level Complete Modal Buttons
      bindClick('btn-next-level', () => this.nextLevel());
      bindClick('btn-replay-level', () => this.restartLevel());
      bindClick('btn-complete-menu', () => this.returnToMainMenu());

      // Game Over Modal Buttons
      bindClick('btn-retry', () => this.restartLevel());
      bindClick('btn-gameover-menu', () => this.returnToMainMenu());
    }

    _syncHUD(gravityInfo = null) {
      const setEl = (id, text) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== text) el.textContent = text;
      };

      setEl('hud-score', String(this.score));
      setEl('hud-highscore', String(Math.max(this.score, this.highScore)));
      setEl('hud-level', `0${this.currentLevelNum}`);
      setEl('hud-level-name', this.levelConfig ? this.levelConfig.name : 'Maiden Orbit');
      setEl('hud-energy', `${this.collectedEnergy} / ${this.totalEnergy}`);
      setEl(
        'hud-portal-status',
        this.portal && this.portal.unlocked
          ? 'OPEN — ENTER GATE!'
          : `NEED ${Math.max(0, this.requiredEnergy - this.collectedEnergy)} MORE`
      );

      const portalBadge = document.getElementById('hud-portal-badge');
      if (portalBadge) {
        portalBadge.classList.toggle('unlocked', !!(this.portal && this.portal.unlocked));
      }

      if (this.ship) {
        const hpPct = Math.max(0, Math.min(100, Math.round(this.ship.health)));
        setEl('hud-health-text', `${hpPct}%`);
        const hpBar = document.getElementById('hud-health-bar');
        if (hpBar) {
          hpBar.style.width = `${hpPct}%`;
          hpBar.className = `meter-fill ${
            hpPct > 55 ? 'healthy' : hpPct > 25 ? 'warning' : 'critical'
          }`;
        }

        const fuelPct = Math.max(0, Math.min(100, Math.round(this.ship.fuel)));
        const fuelBar = document.getElementById('hud-fuel-bar');
        if (fuelBar) {
          fuelBar.style.width = `${fuelPct}%`;
        }

        const livesEl = document.getElementById('hud-lives');
        if (livesEl) {
          const ships = '▲'.repeat(Math.max(0, this.ship.lives));
          if (livesEl.textContent !== ships) livesEl.textContent = ships || '0';
        }

        const speed = Math.round(Math.hypot(this.ship.vx, this.ship.vy));
        setEl('hud-speed', `${speed} m/s`);
      }

      if (gravityInfo) {
        const gVal = (gravityInfo.totalG / 40).toFixed(1);
        setEl('hud-gravity', `${gVal} G`);
      }

      const comboBadge = document.getElementById('hud-combo');
      if (comboBadge) {
        comboBadge.textContent = `${this.combo}x COMBO`;
        comboBadge.classList.toggle('active', this.combo > 1);
      }
    }

    _syncAllUI() {
      this._syncHUD();

      const showScreen = (id, visible) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !visible);
      };

      showScreen('start-screen', this.mode === 'menu');
      showScreen('hud-overlay', this.mode !== 'menu');
      showScreen('pause-screen', this.mode === 'paused');
      showScreen('level-complete-screen', this.mode === 'level_complete');
      showScreen('game-over-screen', this.mode === 'game_over');

      const menuHighScore = document.getElementById('menu-highscore');
      if (menuHighScore) menuHighScore.textContent = String(this.highScore);

      const continueBtn = document.getElementById('btn-continue-sector');
      if (continueBtn) {
        continueBtn.textContent = `SECTOR 0${this.unlockedLevel}`;
      }

      // Sync toggle buttons text
      const muteLabel = this.sound.muted ? '✕ Audio: OFF' : '♪ Audio: ON';
      const hudMute = document.getElementById('btn-hud-mute');
      if (hudMute) hudMute.textContent = this.sound.muted ? '✕' : '♪';
      const pauseMute = document.getElementById('btn-pause-mute');
      if (pauseMute) pauseMute.textContent = muteLabel;

      const trajLabel = this.renderer.showTrajectory
        ? 'Trajectory Arc: ON'
        : 'Trajectory Arc: OFF';
      const pauseTraj = document.getElementById('btn-pause-trajectory');
      if (pauseTraj) pauseTraj.textContent = trajLabel;

      const touchLabel = `Touch HUD: ${this.touchHudMode.toUpperCase()}`;
      const pauseTouch = document.getElementById('btn-pause-touch');
      if (pauseTouch) pauseTouch.textContent = touchLabel;
    }
  }

  root.Orbital = root.Orbital || {};
  root.Orbital.Game = Game;

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      window.game = new Game();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
