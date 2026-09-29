/**
 * Orbital Odyssey: Gravity Well
 * Newtonian Orbital Physics, Collision Detection, and Trajectory Prediction Engine
 */
(function (root) {
  'use strict';

  const PHYSICS_CONSTANTS = {
    G: 115,                 // Universal gravitational constant scaled for responsive 2D gameplay
    THRUST_ACCEL: 310,      // Main thruster acceleration (px/s^2)
    BOOST_ACCEL: 560,       // Afterburner boost acceleration (px/s^2)
    BRAKE_ACCEL: 210,       // Retro-thruster braking acceleration (px/s^2)
    ROTATION_SPEED: 3.9,    // Radians per second
    MAX_SPEED: 440,         // Normal max cruise speed (px/s)
    MAX_BOOST_SPEED: 640,   // Max speed while boosting or slingshotting (px/s)
    SPACE_DRAG: 0.996,      // Subtle inertial damping per 60Hz frame
    BRAKE_DRAG: 0.94,       // Active retro-brake damping
    FUEL_REGEN_RATE: 14,    // Boost capacitor regen per second
    FUEL_BOOST_COST: 34,    // Boost capacitor consumption per second
    SOFTENING: 900          // Gravity softening squared to prevent infinite singularity spikes
  };

  /**
   * Normalize an angle into [-PI, PI]
   */
  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  /**
   * Compute net gravitational acceleration at point (x, y) from all planets
   */
  function computeGravityAtPoint(x, y, planets, G = PHYSICS_CONSTANTS.G) {
    let ax = 0;
    let ay = 0;
    let strongestPlanet = null;
    let maxPull = 0;
    let nearestSurfaceDist = Infinity;

    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq) || 0.0001;
      const surfaceDist = dist - p.radius;

      if (surfaceDist < nearestSurfaceDist) {
        nearestSurfaceDist = surfaceDist;
      }

      const gravRadius = p.gravityRadius || p.radius * 4.2;
      if (dist < gravRadius) {
        // Smooth transition near outer edge of gravity well
        const edgeRatio = 1 - Math.pow(dist / gravRadius, 3);
        const pullMag =
          ((G * p.mass) / (distSq + PHYSICS_CONSTANTS.SOFTENING)) *
          Math.max(0.15, edgeRatio);

        ax += (dx / dist) * pullMag;
        ay += (dy / dist) * pullMag;

        if (pullMag > maxPull) {
          maxPull = pullMag;
          strongestPlanet = p;
        }
      }
    }

    return {
      ax,
      ay,
      totalG: Math.sqrt(ax * ax + ay * ay),
      strongestPlanet,
      nearestSurfaceDist
    };
  }

  /**
   * Integrate spacecraft physics over timestep dt (seconds)
   */
  function integrateShip(ship, planets, input, dt, worldBounds) {
    if (!ship || !ship.alive) return { gravityInfo: { ax: 0, ay: 0, totalG: 0 } };

    // Clamp dt for stability
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);

    // 1. Rotation / Heading update
    if (typeof input.targetAngle === 'number' && !Number.isNaN(input.targetAngle)) {
      const diff = normalizeAngle(input.targetAngle - ship.angle);
      const maxTurn = PHYSICS_CONSTANTS.ROTATION_SPEED * 1.35 * clampedDt;
      if (Math.abs(diff) <= maxTurn) {
        ship.angle = input.targetAngle;
        ship.angularVelocity = 0;
      } else {
        ship.angle = normalizeAngle(ship.angle + Math.sign(diff) * maxTurn);
        ship.angularVelocity = Math.sign(diff) * PHYSICS_CONSTANTS.ROTATION_SPEED;
      }
    } else {
      let turnDir = 0;
      if (input.left) turnDir -= 1;
      if (input.right) turnDir += 1;
      ship.angularVelocity = turnDir * PHYSICS_CONSTANTS.ROTATION_SPEED;
      ship.angle = normalizeAngle(ship.angle + ship.angularVelocity * clampedDt);
    }

    // 2. Thruster & Boost calculation
    const wantsBoost = !!input.boost && ship.fuel > 2;
    const isThrusting = !!input.thrust || wantsBoost;
    const isBraking = !!input.brake;

    ship.thrusting = isThrusting;
    ship.boosting = wantsBoost;
    ship.braking = isBraking;

    let thrustAccel = 0;
    if (wantsBoost) {
      thrustAccel = PHYSICS_CONSTANTS.BOOST_ACCEL;
      ship.fuel = Math.max(0, ship.fuel - PHYSICS_CONSTANTS.FUEL_BOOST_COST * clampedDt);
    } else if (isThrusting) {
      thrustAccel = PHYSICS_CONSTANTS.THRUST_ACCEL;
      ship.fuel = Math.min(
        ship.maxFuel,
        ship.fuel + PHYSICS_CONSTANTS.FUEL_REGEN_RATE * 0.45 * clampedDt
      );
    } else {
      ship.fuel = Math.min(
        ship.maxFuel,
        ship.fuel + PHYSICS_CONSTANTS.FUEL_REGEN_RATE * clampedDt
      );
    }

    // Apply forward thrust
    if (thrustAccel > 0) {
      ship.vx += Math.cos(ship.angle) * thrustAccel * clampedDt;
      ship.vy += Math.sin(ship.angle) * thrustAccel * clampedDt;
    }

    // Apply retro-brake
    if (isBraking) {
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > 18) {
        const brakeFactor = Math.pow(PHYSICS_CONSTANTS.BRAKE_DRAG, clampedDt * 60);
        ship.vx *= brakeFactor;
        ship.vy *= brakeFactor;
      } else {
        // Gentle reverse thrust when nearly stopped
        ship.vx -= Math.cos(ship.angle) * (PHYSICS_CONSTANTS.BRAKE_ACCEL * 0.65) * clampedDt;
        ship.vy -= Math.sin(ship.angle) * (PHYSICS_CONSTANTS.BRAKE_ACCEL * 0.65) * clampedDt;
      }
    }

    // 3. Planetary Gravity acceleration
    const gravityInfo = computeGravityAtPoint(ship.x, ship.y, planets);
    ship.vx += gravityInfo.ax * clampedDt;
    ship.vy += gravityInfo.ay * clampedDt;

    // 4. Subtle inertial space drag & speed cap
    const dragFactor = Math.pow(PHYSICS_CONSTANTS.SPACE_DRAG, clampedDt * 60);
    ship.vx *= dragFactor;
    ship.vy *= dragFactor;

    const currentMaxSpeed = wantsBoost || gravityInfo.totalG > 140
      ? PHYSICS_CONSTANTS.MAX_BOOST_SPEED
      : PHYSICS_CONSTANTS.MAX_SPEED;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > currentMaxSpeed) {
      const scale = currentMaxSpeed / speed;
      ship.vx *= scale;
      ship.vy *= scale;
    }

    // 5. Update Position
    ship.x += ship.vx * clampedDt;
    ship.y += ship.vy * clampedDt;

    // 6. Soft Sector Boundary Containment
    if (worldBounds) {
      const pad = ship.radius + 16;
      const minX = worldBounds.minX + pad;
      const maxX = worldBounds.maxX - pad;
      const minY = worldBounds.minY + pad;
      const maxY = worldBounds.maxY - pad;

      if (ship.x < minX) {
        ship.x = minX;
        ship.vx = Math.abs(ship.vx) * 0.65;
      } else if (ship.x > maxX) {
        ship.x = maxX;
        ship.vx = -Math.abs(ship.vx) * 0.65;
      }

      if (ship.y < minY) {
        ship.y = minY;
        ship.vy = Math.abs(ship.vy) * 0.65;
      } else if (ship.y > maxY) {
        ship.y = maxY;
        ship.vy = -Math.abs(ship.vy) * 0.65;
      }
    }

    // Decrement invulnerability & shield timers
    if (ship.invulnerableTimer > 0) {
      ship.invulnerableTimer = Math.max(0, ship.invulnerableTimer - clampedDt);
    }
    if (ship.shieldTimer > 0) {
      ship.shieldTimer = Math.max(0, ship.shieldTimer - clampedDt);
    }

    return { gravityInfo };
  }

  /**
   * Predict future orbital trajectory points under planetary gravity
   */
  function predictTrajectory(ship, planets, portal, steps = 55, stepDt = 0.045) {
    const points = [];
    let simX = ship.x;
    let simY = ship.y;
    let simVx = ship.vx;
    let simVy = ship.vy;
    let willImpactPlanet = false;
    let willEnterPortal = false;
    let impactPoint = null;

    // Include slight forward thrust preview if currently thrusting
    const thrustPreview = ship.thrusting ? PHYSICS_CONSTANTS.THRUST_ACCEL * 0.25 : 0;

    for (let i = 0; i < steps; i++) {
      const g = computeGravityAtPoint(simX, simY, planets);
      const decay = i < 12 ? 1 : 0;
      simVx += (g.ax + Math.cos(ship.angle) * thrustPreview * decay) * stepDt;
      simVy += (g.ay + Math.sin(ship.angle) * thrustPreview * decay) * stepDt;

      const drag = Math.pow(PHYSICS_CONSTANTS.SPACE_DRAG, stepDt * 60);
      simVx *= drag;
      simVy *= drag;

      simX += simVx * stepDt;
      simY += simVy * stepDt;

      points.push({ x: simX, y: simY });

      // Check planet impact along predicted path
      for (let p = 0; p < planets.length; p++) {
        const planet = planets[p];
        const d = Math.hypot(simX - planet.x, simY - planet.y);
        if (d <= planet.radius + ship.radius) {
          willImpactPlanet = true;
          impactPoint = { x: simX, y: simY, planet };
          return { points, willImpactPlanet, willEnterPortal, impactPoint };
        }
      }

      // Check portal intersection
      if (portal) {
        const dp = Math.hypot(simX - portal.x, simY - portal.y);
        if (dp <= portal.radius + ship.radius) {
          willEnterPortal = true;
          return { points, willImpactPlanet, willEnterPortal, impactPoint: { x: simX, y: simY } };
        }
      }
    }

    return { points, willImpactPlanet, willEnterPortal, impactPoint };
  }

  /**
   * Circle vs Circle collision check
   */
  function checkCircleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const radSum = (a.radius || 0) + (b.radius || 0);
    const distSq = dx * dx + dy * dy;

    if (distSq > radSum * radSum) {
      return { collided: false, dist: Math.sqrt(distSq), overlap: 0, nx: 0, ny: 0 };
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = radSum - dist;

    return {
      collided: true,
      dist,
      overlap,
      nx,
      ny
    };
  }

  /**
   * Resolve physical bounce of ship against a solid circular body (planet or obstacle)
   */
  function resolveElasticBounce(ship, body, restitution = 0.62, minBounceSpeed = 95) {
    const col = checkCircleCollision(ship, body);
    if (!col.collided) return { collided: false, impactSpeed: 0 };

    // Push ship out of overlap
    ship.x += col.nx * (col.overlap + 2);
    ship.y += col.ny * (col.overlap + 2);

    // Relative velocity along collision normal
    const bvx = body.vx || 0;
    const bvy = body.vy || 0;
    const rvx = ship.vx - bvx;
    const rvy = ship.vy - bvy;
    const velAlongNormal = rvx * col.nx + rvy * col.ny;
    const impactSpeed = Math.max(0, -velAlongNormal);

    if (velAlongNormal < 0) {
      const j = -(1 + restitution) * velAlongNormal;
      ship.vx += j * col.nx;
      ship.vy += j * col.ny;
    }

    // Ensure minimum separation velocity so ship doesn't get pinned by strong gravity
    const outwardSpeed = ship.vx * col.nx + ship.vy * col.ny;
    if (outwardSpeed < minBounceSpeed) {
      ship.vx += col.nx * (minBounceSpeed - outwardSpeed);
      ship.vy += col.ny * (minBounceSpeed - outwardSpeed);
    }

    return {
      collided: true,
      impactSpeed: Math.max(impactSpeed, 60),
      nx: col.nx,
      ny: col.ny
    };
  }

  /**
   * Shortest distance from point (px, py) to line segment (x1, y1)-(x2, y2)
   * Used for rotating pulsar hazard beams
   */
  function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = px - x1;
    const wy = py - y1;
    const c1 = wx * vx + wy * vy;
    if (c1 <= 0) return Math.hypot(px - x1, py - y1);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - x2, py - y2);
    const b = c1 / c2;
    const bx = x1 + b * vx;
    const by = y1 + b * vy;
    return Math.hypot(px - bx, py - by);
  }

  const Physics = {
    PHYSICS_CONSTANTS,
    normalizeAngle,
    computeGravityAtPoint,
    integrateShip,
    predictTrajectory,
    checkCircleCollision,
    resolveElasticBounce,
    pointToSegmentDistance
  };

  root.Orbital = root.Orbital || {};
  root.Orbital.Physics = Physics;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Physics;
  }
})(typeof window !== 'undefined' ? window : globalThis);
