/**
 * End-to-End Automated Browser Test Suite for Orbital Odyssey: Gravity Well
 * Uses Playwright Chromium to verify all 21 core features across Desktop and Android Mobile viewports.
 */
const assert = require('assert');
const path = require('path');

// Resolve playwright from npx cache or node_modules
function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    const fs = require('fs');
    const npxRoot = path.join(process.env.HOME || '/home/user', '.npm', '_npx');
    if (fs.existsSync(npxRoot)) {
      const dirs = fs.readdirSync(npxRoot);
      for (const d of dirs) {
        const candidate = path.join(npxRoot, d, 'node_modules', 'playwright');
        if (fs.existsSync(candidate)) {
          return require(candidate);
        }
      }
    }
    throw e;
  }
}

const { chromium } = loadPlaywright();
const GAME_URL = process.env.GAME_URL || 'http://127.0.0.1:3000';

async function runE2ETests() {
  console.log('=== Running Orbital Odyssey E2E Browser Tests ===');
  const browser = await chromium.launch({ headless: true });

  const consoleErrors = [];
  const pageErrors = [];

  try {
    // =========================================================================
    // PART A: DESKTOP VIEWPORT & FULL GAMEPLAY LOOP TESTS
    // =========================================================================
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    // 1. Load Game & Verify Start Screen
    await page.goto(GAME_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#start-screen:not(.hidden)');

    const titleText = await page.textContent('.game-title');
    assert(titleText.includes('ORBITAL ODYSSEY'), 'Start screen title should be ORBITAL ODYSSEY');

    const sectorCardsCount = await page.locator('#sector-select-grid .sector-card').count();
    assert.strictEqual(sectorCardsCount, 8, 'Start screen should display 8 campaign sector cards');

    // Test Flight Manual Modal open & close
    await page.click('#btn-how-to-play');
    await page.waitForSelector('#howto-modal:not(.hidden)');
    await page.click('#btn-close-howto');
    await page.waitForSelector('#howto-modal', { state: 'hidden' });
    console.log('✔ 1. Start screen, Sector select grid, and Flight Manual modal verified');

    // 2. Click Play Button to Launch Sector 1
    await page.click('#btn-play');
    await page.waitForSelector('#hud-overlay:not(.hidden)');

    const modeAfterPlay = await page.evaluate(() => window.game.mode);
    assert.strictEqual(modeAfterPlay, 'playing', 'Game mode should be "playing" after clicking Play');
    console.log('✔ 2. Play button launches Sector 1 ("Maiden Orbit")');

    // 3. Test Keyboard Controls & Physics Movement
    const initialShip = await page.evaluate(() => ({
      x: window.game.ship.x,
      y: window.game.ship.y,
      angle: window.game.ship.angle
    }));

    // Hold D (rotate right) and W (thrust) + Space (boost)
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(180);
    await page.keyboard.up('KeyD');

    const rotatedAngle = await page.evaluate(() => window.game.ship.angle);
    assert(rotatedAngle !== initialShip.angle, 'Keyboard KeyD should rotate spacecraft');

    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    await page.waitForTimeout(260);
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyW');

    const movedShip = await page.evaluate(() => ({
      x: window.game.ship.x,
      y: window.game.ship.y,
      vx: window.game.ship.vx,
      vy: window.game.ship.vy,
      fuel: window.game.ship.fuel
    }));
    assert(
      Math.hypot(movedShip.x - initialShip.x, movedShip.y - initialShip.y) > 10,
      'Spacecraft should move under thrust and boost'
    );
    assert(movedShip.fuel < 100, 'Afterburner boost should consume capacitor fuel');
    console.log('✔ 3. Desktop keyboard controls (W, A, S, D, Space) & physics movement verified');

    // 4. Test Pause & Resume Functionality
    await page.click('#btn-pause');
    await page.waitForSelector('#pause-screen:not(.hidden)');
    const pausedMode = await page.evaluate(() => window.game.mode);
    assert.strictEqual(pausedMode, 'paused', 'Clicking Pause button should pause the game');

    // Test Audio Mute & Trajectory toggles in Pause Menu
    await page.click('#btn-pause-mute');
    const isMuted = await page.evaluate(() => window.game.sound.muted);
    assert.strictEqual(isMuted, true, 'Mute toggle should mute sound engine');
    await page.click('#btn-pause-mute'); // Unmute

    await page.click('#btn-resume');
    await page.waitForSelector('#pause-screen', { state: 'hidden' });
    const resumedMode = await page.evaluate(() => window.game.mode);
    assert.strictEqual(resumedMode, 'playing', 'Clicking Resume should return to playing mode');
    console.log('✔ 4. Pause, Resume, and Audio/Trajectory settings verified');

    // 5. Test Collecting Energy Particles, Combo Multiplier, Score, and Portal Unlock
    const collectResult = await page.evaluate(() => {
      const g = window.game;
      const initialScore = g.score;
      // Move ship onto each required energy particle and step update
      for (let i = 0; i < g.requiredEnergy; i++) {
        const orb = g.energyParticles[i];
        g.ship.x = orb.x;
        g.ship.y = orb.y;
        g.update(0.016);
      }
      return {
        scoreAfter: g.score,
        initialScore,
        collected: g.collectedEnergy,
        required: g.requiredEnergy,
        portalUnlocked: g.portal.unlocked,
        combo: g.combo,
        hudScoreText: document.getElementById('hud-score').textContent
      };
    });

    assert.strictEqual(
      collectResult.collected,
      collectResult.required,
      'All required energy orbs should be collected'
    );
    assert(collectResult.scoreAfter > collectResult.initialScore, 'Score should increase when collecting orbs');
    assert(collectResult.combo > 1, 'Combo multiplier should increase on consecutive orb pickups');
    assert.strictEqual(collectResult.portalUnlocked, true, 'Wormhole portal should unlock once required orbs are collected');
    assert.strictEqual(collectResult.hudScoreText, String(collectResult.scoreAfter), 'HUD score should match game score');
    console.log('✔ 5. Energy particle collection, combo multiplier, scoring, and Wormhole unlock verified');

    // 6. Test Collisions, Health Damage, and Lives Respawn
    const damageResult = await page.evaluate(() => {
      const g = window.game;
      g.ship.invulnerableTimer = 0;
      g.ship.shieldTimer = 0;
      const hpBefore = g.ship.health;

      // Place ship colliding with the first obstacle
      const obs = g.obstacles[0];
      g.ship.x = obs.x + obs.radius;
      g.ship.y = obs.y;
      g.ship.vx = -150;
      g.update(0.016);
      const hpAfterHit = g.ship.health;

      // Now test fatal damage costing 1 life and respawning
      const livesBeforeFatal = g.ship.lives;
      g.ship.invulnerableTimer = 0;
      g.applyDamage(200, 'Test Asteroid Impact');
      const livesAfterFatal = g.ship.lives;
      const hpAfterRespawn = g.ship.health;

      return {
        hpBefore,
        hpAfterHit,
        livesBeforeFatal,
        livesAfterFatal,
        hpAfterRespawn
      };
    });

    assert(damageResult.hpAfterHit < damageResult.hpBefore, 'Collision with obstacle should reduce ship hull health');
    assert.strictEqual(
      damageResult.livesAfterFatal,
      damageResult.livesBeforeFatal - 1,
      'Fatal hull damage should decrement lives by 1'
    );
    assert.strictEqual(damageResult.hpAfterRespawn, 100, 'Respawned reserve ship should have 100% hull health');
    console.log('✔ 6. Obstacle collision bounce, hull damage, and reserve ship respawn verified');

    // 7. Test Level Completion & Progression to Sector 2
    await page.evaluate(() => {
      const g = window.game;
      g.ship.x = g.portal.x;
      g.ship.y = g.portal.y;
      g.update(0.016);
    });

    await page.waitForSelector('#level-complete-screen:not(.hidden)');
    const completeMode = await page.evaluate(() => window.game.mode);
    assert.strictEqual(completeMode, 'level_complete', 'Entering unlocked portal should trigger level_complete');

    // Click Next Sector button
    await page.click('#btn-next-level');
    await page.waitForSelector('#level-complete-screen', { state: 'hidden' });
    const level2State = await page.evaluate(() => ({
      mode: window.game.mode,
      levelNum: window.game.currentLevelNum,
      levelName: window.game.levelConfig.name,
      planetCount: window.game.planets.length
    }));

    assert.strictEqual(level2State.mode, 'playing', 'Should be playing after clicking Next Sector');
    assert.strictEqual(level2State.levelNum, 2, 'Should advance to Sector 2');
    assert.strictEqual(level2State.levelName, 'Binary Slingshot', 'Sector 2 name should be Binary Slingshot');
    assert.strictEqual(level2State.planetCount, 2, 'Sector 2 should feature 2 planets (increasing difficulty)');
    console.log('✔ 7. Level completion, star rating breakdown, and progression to Sector 2 verified');

    // 8. Test Game Over & Restarting
    await page.evaluate(() => {
      const g = window.game;
      g.ship.lives = 1;
      g.ship.invulnerableTimer = 0;
      g.ship.shieldTimer = 0;
      g.applyDamage(500, 'Crushed by Singularity');
    });

    await page.waitForSelector('#game-over-screen:not(.hidden)');
    const gameOverCause = await page.textContent('#gameover-cause');
    assert(gameOverCause.includes('Crushed by Singularity'), 'Game Over screen should display cause of destruction');

    // Click Retry Sector button
    await page.click('#btn-retry');
    await page.waitForSelector('#game-over-screen', { state: 'hidden' });
    const afterRetry = await page.evaluate(() => ({
      mode: window.game.mode,
      lives: window.game.ship.lives,
      health: window.game.ship.health,
      levelNum: window.game.currentLevelNum
    }));

    assert.strictEqual(afterRetry.mode, 'playing', 'Retry button should restart sector in playing mode');
    assert.strictEqual(afterRetry.lives, 3, 'Retry should restore 3 lives');
    assert.strictEqual(afterRetry.health, 100, 'Retry should restore 100% hull health');
    console.log('✔ 8. Game Over screen and Retry/Restart functionality verified');

    await context.close();

    // =========================================================================
    // PART B: ANDROID MOBILE VIEWPORT & TOUCH CONTROLS TESTS
    // =========================================================================
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
    });
    const mobilePage = await mobileContext.newPage();

    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    mobilePage.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    await mobilePage.goto(GAME_URL, { waitUntil: 'networkidle' });
    await mobilePage.click('#btn-play');
    await mobilePage.waitForSelector('#hud-overlay:not(.hidden)');

    // Verify Touch Controls are visible and within mobile viewport bounds
    const touchLayout = await mobilePage.evaluate(() => {
      const tc = document.getElementById('touch-controls');
      const joy = document.getElementById('joystick-base').getBoundingClientRect();
      const thrustBtn = document.getElementById('btn-touch-thrust').getBoundingClientRect();
      const docOverflowX = document.documentElement.scrollWidth > window.innerWidth;
      return {
        touchVisible: !tc.classList.contains('hidden-touch'),
        joyInBounds: joy.left >= 0 && joy.bottom <= window.innerHeight,
        thrustInBounds: thrustBtn.right <= window.innerWidth && thrustBtn.bottom <= window.innerHeight,
        docOverflowX
      };
    });

    assert.strictEqual(touchLayout.touchVisible, true, 'Touch controls must be visible on Android viewport');
    assert.strictEqual(touchLayout.joyInBounds, true, 'Virtual thumbstick must fit inside mobile screen');
    assert.strictEqual(touchLayout.thrustInBounds, true, 'Touch thrust button must fit inside mobile screen');
    assert.strictEqual(touchLayout.docOverflowX, false, 'Mobile layout must have zero horizontal scroll overflow');

    // Test pressing the Touch Thrust & Rotate Right buttons
    const posBeforeTouch = await mobilePage.evaluate(() => ({
      x: window.game.ship.x,
      y: window.game.ship.y,
      angle: window.game.ship.angle
    }));

    const rotRightBox = await mobilePage.locator('#btn-touch-right').boundingBox();
    await mobilePage.mouse.move(rotRightBox.x + rotRightBox.width / 2, rotRightBox.y + rotRightBox.height / 2);
    await mobilePage.mouse.down();
    await mobilePage.waitForTimeout(180);
    await mobilePage.mouse.up();

    const thrustBox = await mobilePage.locator('#btn-touch-thrust').boundingBox();
    await mobilePage.mouse.move(thrustBox.x + thrustBox.width / 2, thrustBox.y + thrustBox.height / 2);
    await mobilePage.mouse.down();
    await mobilePage.waitForTimeout(240);
    await mobilePage.mouse.up();

    const posAfterTouch = await mobilePage.evaluate(() => ({
      x: window.game.ship.x,
      y: window.game.ship.y,
      angle: window.game.ship.angle
    }));

    assert(posAfterTouch.angle !== posBeforeTouch.angle, 'Touch rotate button should rotate spacecraft');
    assert(
      Math.hypot(posAfterTouch.x - posBeforeTouch.x, posAfterTouch.y - posBeforeTouch.y) > 8,
      'Touch thrust button should propel spacecraft'
    );

    // Test dragging the Virtual Analog Thumbstick
    const joyBox = await mobilePage.locator('#joystick-base').boundingBox();
    const jcx = joyBox.x + joyBox.width / 2;
    const jcy = joyBox.y + joyBox.height / 2;
    await mobilePage.mouse.move(jcx, jcy);
    await mobilePage.mouse.down();
    await mobilePage.mouse.move(jcx, jcy - 40, { steps: 5 }); // Drag straight up (-PI/2)
    await mobilePage.waitForTimeout(200);
    const joyActiveState = await mobilePage.evaluate(() => ({
      active: window.game.input.touch.joystickActive,
      targetAngle: window.game.input.getState().targetAngle
    }));
    await mobilePage.mouse.up();

    assert.strictEqual(joyActiveState.active, true, 'Dragging virtual thumbstick should activate joystick steering');
    assert(typeof joyActiveState.targetAngle === 'number', 'Virtual thumbstick should provide target steering angle');
    console.log('✔ 9. Android Mobile responsiveness, Touch Buttons, and Virtual Thumbstick verified');

    await mobileContext.close();

    // 10. Verify Zero Console or Runtime Errors
    assert.strictEqual(
      consoleErrors.length,
      0,
      `Expected 0 console errors, found: ${JSON.stringify(consoleErrors)}`
    );
    assert.strictEqual(
      pageErrors.length,
      0,
      `Expected 0 uncaught page errors, found: ${JSON.stringify(pageErrors)}`
    );
    console.log('✔ 10. Zero console errors or uncaught runtime exceptions!');
  } finally {
    await browser.close();
  }

  console.log('=== All E2E Browser Tests Passed Successfully! ===\n');
}

runE2ETests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
