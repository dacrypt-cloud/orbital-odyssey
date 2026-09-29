/**
 * Unit Tests for Orbital Odyssey Physics, Entities, and Level Configurations
 */
const assert = require('assert');
const Physics = require('../src/physics.js');
const Levels = require('../src/levels.js');
const Entities = require('../src/entities.js');

console.log('=== Running Orbital Odyssey Unit Tests ===');

// 1. Test Gravity Calculation
{
  const planets = [
    new Entities.Planet({
      name: 'TestPlanet',
      x: 500,
      y: 500,
      radius: 70,
      mass: 2000,
      gravityRadius: 400
    })
  ];

  // Ship to the left of planet should experience positive ax (pulled right toward x=500)
  const gNear = Physics.computeGravityAtPoint(300, 500, planets);
  assert(gNear.ax > 0, 'Gravity should pull ship toward planet center (+X)');
  assert(Math.abs(gNear.ay) < 0.001, 'Gravity Y component should be 0 when aligned on Y');
  assert(gNear.totalG > 0, 'Total G should be positive inside gravity radius');

  // Closer point should experience stronger gravity (inverse-square law)
  const gCloser = Physics.computeGravityAtPoint(400, 500, planets);
  assert(
    gCloser.totalG > gNear.totalG,
    `Inverse-square law: closer point (${gCloser.totalG}) must have stronger pull than farther point (${gNear.totalG})`
  );

  // Outside gravityRadius should experience zero gravity
  const gOutside = Physics.computeGravityAtPoint(0, 500, planets);
  assert.strictEqual(gOutside.totalG, 0, 'Gravity outside gravityRadius should be 0');
  console.log('✔ Gravity inverse-square & field radius calculations passed');
}

// 2. Test Spacecraft Thrust, Rotation, Boost & Retro-Brake Integration
{
  const ship = new Entities.Ship({ x: 200, y: 200, angle: 0 });
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };

  // Thrust forward along angle=0
  Physics.integrateShip(ship, [], { thrust: true, left: false, right: false }, 0.04, bounds);
  assert(ship.vx > 0, 'Ship vx should increase when thrusting at angle 0');
  assert(ship.x > 200, 'Ship x should advance when thrusting');

  // Rotate right
  const initialAngle = ship.angle;
  Physics.integrateShip(ship, [], { thrust: false, left: false, right: true }, 0.04, bounds);
  assert(ship.angle > initialAngle, 'Ship angle should increase when rotating right');

  // Boost consumes fuel and accelerates faster
  const fuelBefore = ship.fuel;
  Physics.integrateShip(ship, [], { boost: true }, 0.04, bounds);
  assert(ship.fuel < fuelBefore, 'Boost should consume boost capacitor fuel');

  // Retro-brake slows high velocity down
  ship.vx = 250;
  ship.vy = 0;
  Physics.integrateShip(ship, [], { brake: true }, 0.04, bounds);
  assert(ship.vx < 250, 'Retro-brake should reduce ship speed');
  console.log('✔ Spacecraft thrust, rotation, boost, and retro-brake integration passed');
}

// 3. Test Collision Detection & Elastic Bounce
{
  const ship = new Entities.Ship({ x: 100, y: 100, angle: 0 });
  ship.vx = 120;
  ship.vy = 0;
  const asteroid = new Entities.Obstacle({ type: 'asteroid', x: 120, y: 100, radius: 20 });

  const col = Physics.checkCircleCollision(ship, asteroid);
  assert(col.collided, 'Ship at x=100 (r=16) and Asteroid at x=120 (r=20) should collide');

  const bounce = Physics.resolveElasticBounce(ship, asteroid, 0.7, 90);
  assert(bounce.collided, 'Bounce resolution should report collision');
  assert(ship.vx < 0, 'Ship moving right into obstacle on right should bounce left (vx < 0)');
  const distAfter = Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y);
  assert(
    distAfter >= ship.radius + asteroid.radius,
    'Ship should be pushed out of overlap after bounce'
  );
  console.log('✔ Circle collision detection and elastic bounce impulse passed');
}

// 4. Test Trajectory Prediction
{
  const ship = new Entities.Ship({ x: 200, y: 400, angle: 0 });
  ship.vx = 200;
  ship.vy = 0;
  const planets = [
    new Entities.Planet({ x: 350, y: 400, radius: 60, mass: 2000, gravityRadius: 350 })
  ];
  const pred = Physics.predictTrajectory(ship, planets, null, 60, 0.045);
  assert(pred.willImpactPlanet, 'Trajectory aimed directly at planet should predict impact');
  assert(pred.impactPoint !== null, 'Impact point should be returned');
  console.log('✔ Predictive orbital trajectory computer passed');
}

// 5. Test All Campaign Levels + Procedural Level Generation
{
  assert(Levels.CAMPAIGN_LEVELS.length >= 8, 'Should have at least 8 campaign sectors');
  for (let i = 1; i <= 12; i++) {
    const cfg = Levels.getLevelConfig(i);
    assert(cfg.planets && cfg.planets.length >= 1, `Level ${i} must have planets`);
    assert(
      cfg.energyParticles && cfg.energyParticles.length >= cfg.requiredEnergy,
      `Level ${i} must have at least requiredEnergy particles`
    );
    assert(cfg.portal && typeof cfg.portal.x === 'number', `Level ${i} must have a portal`);
  }
  console.log('✔ Campaign levels (1-8) and Procedural Endless levels (9-12) verified');
}

console.log('=== All Unit Tests Passed Successfully! ===\n');
