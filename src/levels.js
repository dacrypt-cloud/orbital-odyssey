/**
 * Orbital Odyssey: Gravity Well
 * Campaign Sectors (Levels 1-8) + Procedural Deep Space Sector Generator (Level 9+)
 */
(function (root) {
  'use strict';

  const CAMPAIGN_LEVELS = [
    // =========================================================================
    // SECTOR 1: MAIDEN ORBIT (Introduces Thrust, Gravity Slingshot & Energy Orbs)
    // =========================================================================
    {
      id: 1,
      name: 'Maiden Orbit',
      subtitle: 'Learn orbital slingshot navigation around New Terra',
      hint: 'Collect at least 4 Quantum Energy Orbs to unlock the Wormhole Exit Gate!',
      worldBounds: { minX: -200, maxX: 1650, minY: -180, maxY: 1080 },
      parTime: 35,
      requiredEnergy: 4,
      spawn: { x: 140, y: 450, angle: -0.22 },
      portal: { x: 1340, y: 440, radius: 44 },
      planets: [
        {
          name: 'New Terra',
          type: 'terran',
          x: 740,
          y: 470,
          radius: 78,
          mass: 1650,
          gravityRadius: 370,
          color: '#2dd4bf',
          secondaryColor: '#0284c7',
          atmosphereColor: 'rgba(56, 189, 248, 0.25)'
        }
      ],
      energyParticles: [
        { x: 350, y: 360, value: 100 },
        { x: 540, y: 250, value: 100 },
        { x: 740, y: 210, value: 150 },
        { x: 940, y: 255, value: 100 },
        { x: 1120, y: 360, value: 100 },
        { x: 740, y: 720, value: 200 } // Bonus lower-orbit crystal
      ],
      powerups: [
        { type: 'shield', x: 520, y: 650 }
      ],
      obstacles: [
        { type: 'asteroid', x: 460, y: 590, radius: 22, vx: 8, vy: -6 },
        { type: 'asteroid', x: 1020, y: 580, radius: 24, vx: -10, vy: 5 }
      ]
    },

    // =========================================================================
    // SECTOR 2: BINARY SLINGSHOT (Two interacting gravity wells, Figure-8 path)
    // =========================================================================
    {
      id: 2,
      name: 'Binary Slingshot',
      subtitle: 'Thread the Lagrange point between twin planetary bodies',
      hint: 'Use the first planet’s gravity to curve smoothly into the upper or lower arc.',
      worldBounds: { minX: -220, maxX: 1850, minY: -200, maxY: 1150 },
      parTime: 45,
      requiredEnergy: 5,
      spawn: { x: 130, y: 520, angle: -0.3 },
      portal: { x: 1540, y: 460, radius: 44 },
      planets: [
        {
          name: 'Calypso Prime',
          type: 'ice',
          x: 560,
          y: 390,
          radius: 72,
          mass: 1750,
          gravityRadius: 360,
          color: '#38bdf8',
          secondaryColor: '#bae6fd',
          atmosphereColor: 'rgba(125, 211, 252, 0.24)'
        },
        {
          name: 'Calypso Minor',
          type: 'moon',
          x: 1080,
          y: 590,
          radius: 64,
          mass: 1500,
          gravityRadius: 330,
          color: '#a8a29e',
          secondaryColor: '#57534e',
          atmosphereColor: 'rgba(214, 211, 209, 0.16)'
        }
      ],
      energyParticles: [
        { x: 340, y: 310, value: 100 },
        { x: 560, y: 175, value: 150 },
        { x: 820, y: 485, value: 200 }, // Lagrange point crystal
        { x: 1080, y: 800, value: 150 },
        { x: 1080, y: 350, value: 100 },
        { x: 1330, y: 430, value: 100 },
        { x: 560, y: 630, value: 150 }
      ],
      powerups: [
        { type: 'repair', x: 820, y: 260 }
      ],
      obstacles: [
        { type: 'asteroid', x: 350, y: 620, radius: 26, vx: 12, vy: -14 },
        { type: 'asteroid', x: 820, y: 700, radius: 24, vx: -15, vy: -8 },
        { type: 'asteroid', x: 1310, y: 660, radius: 28, vx: -10, vy: 12 },
        { type: 'mine', x: 820, y: 360, radius: 18, patrolRadius: 45, speed: 1.4 }
      ]
    },

    // =========================================================================
    // SECTOR 3: KUIPER BELT RUN (Gas Giant with Rings + Moving Asteroid Field)
    // =========================================================================
    {
      id: 3,
      name: 'Kuiper Belt Run',
      subtitle: 'Navigate a dense asteroid drift around a ringed Gas Giant',
      hint: 'Watch the trajectory predictor line — red means planetary impact!',
      worldBounds: { minX: -250, maxX: 1950, minY: -220, maxY: 1200 },
      parTime: 50,
      requiredEnergy: 6,
      spawn: { x: 140, y: 500, angle: 0.15 },
      portal: { x: 1660, y: 500, radius: 44 },
      planets: [
        {
          name: 'Hyperion V',
          type: 'gas_giant',
          x: 900,
          y: 500,
          radius: 102,
          mass: 2650,
          gravityRadius: 470,
          hasRings: true,
          color: '#f59e0b',
          secondaryColor: '#b45309',
          atmosphereColor: 'rgba(251, 191, 36, 0.25)'
        }
      ],
      energyParticles: [
        { x: 380, y: 580, value: 100 },
        { x: 610, y: 730, value: 120 },
        { x: 900, y: 790, value: 150 },
        { x: 1190, y: 730, value: 120 },
        { x: 610, y: 270, value: 120 },
        { x: 900, y: 210, value: 150 },
        { x: 1190, y: 270, value: 120 },
        { x: 1430, y: 500, value: 150 }
      ],
      powerups: [
        { type: 'shield', x: 460, y: 340 },
        { type: 'repair', x: 1320, y: 680 }
      ],
      obstacles: [
        { type: 'asteroid', x: 520, y: 490, radius: 28, vx: 0, vy: 34, bounceBounds: true },
        { type: 'asteroid', x: 720, y: 170, radius: 24, vx: 26, vy: 14, bounceBounds: true },
        { type: 'asteroid', x: 740, y: 830, radius: 25, vx: 28, vy: -12, bounceBounds: true },
        { type: 'asteroid', x: 1120, y: 190, radius: 26, vx: -22, vy: 18, bounceBounds: true },
        { type: 'asteroid', x: 1280, y: 480, radius: 30, vx: 0, vy: -38, bounceBounds: true },
        { type: 'mine', x: 900, y: 110, radius: 18, patrolRadius: 50, speed: 1.6 },
        { type: 'mine', x: 900, y: 890, radius: 18, patrolRadius: 50, speed: 1.6 }
      ]
    },

    // =========================================================================
    // SECTOR 4: PULSAR CITADEL (Rotating Laser Satellites & Twin Worlds)
    // =========================================================================
    {
      id: 4,
      name: 'Pulsar Citadel',
      subtitle: 'Time your orbital burn past sweeping pulsar security beams',
      hint: 'Use Retro-Brake (S / Down / Brake button) to wait for laser sweeps to pass!',
      worldBounds: { minX: -250, maxX: 2050, minY: -240, maxY: 1260 },
      parTime: 55,
      requiredEnergy: 6,
      spawn: { x: 150, y: 540, angle: 0 },
      portal: { x: 1760, y: 520, radius: 44 },
      planets: [
        {
          name: 'Vega Borealis',
          type: 'ice',
          x: 640,
          y: 520,
          radius: 76,
          mass: 1850,
          gravityRadius: 370,
          color: '#06b6d4',
          secondaryColor: '#164e63',
          atmosphereColor: 'rgba(34, 211, 238, 0.22)'
        },
        {
          name: 'Vega Australis',
          type: 'terran',
          x: 1260,
          y: 520,
          radius: 80,
          mass: 1950,
          gravityRadius: 380,
          color: '#10b981',
          secondaryColor: '#065f46',
          atmosphereColor: 'rgba(52, 211, 153, 0.22)'
        }
      ],
      energyParticles: [
        { x: 380, y: 360, value: 120 },
        { x: 640, y: 260, value: 150 },
        { x: 640, y: 780, value: 150 },
        { x: 950, y: 520, value: 220 },
        { x: 1260, y: 250, value: 150 },
        { x: 1260, y: 790, value: 150 },
        { x: 1530, y: 390, value: 120 },
        { x: 1530, y: 650, value: 120 }
      ],
      powerups: [
        { type: 'shield', x: 950, y: 290 },
        { type: 'repair', x: 950, y: 750 }
      ],
      obstacles: [
        {
          type: 'pulsar',
          x: 950,
          y: 520,
          radius: 20,
          beamLength: 210,
          angle: 0,
          rotationSpeed: 1.15
        },
        { type: 'mine', x: 420, y: 670, radius: 18, patrolRadius: 60, speed: 1.5 },
        { type: 'mine', x: 1510, y: 520, radius: 18, patrolRadius: 70, speed: 1.7 },
        { type: 'asteroid', x: 640, y: 130, radius: 26, vx: 28, vy: 0, bounceBounds: true },
        { type: 'asteroid', x: 1260, y: 900, radius: 26, vx: -28, vy: 0, bounceBounds: true }
      ]
    },

    // =========================================================================
    // SECTOR 5: SOLAR FLARE GAUNTLET (Central Lava Star + Outer Slingshot Moons)
    // =========================================================================
    {
      id: 5,
      name: 'Solar Flare Gauntlet',
      subtitle: 'Slingshot around outer moons to avoid the blazing Helios dwarf star',
      hint: 'Helios has massive gravity — use outer moons and Afterburner Boost (Space) to stay in high orbit!',
      worldBounds: { minX: -260, maxX: 2100, minY: -260, maxY: 1320 },
      parTime: 60,
      requiredEnergy: 7,
      spawn: { x: 140, y: 560, angle: -0.45 },
      portal: { x: 1820, y: 560, radius: 46 },
      planets: [
        {
          name: 'Helios Dwarf',
          type: 'lava',
          x: 980,
          y: 560,
          radius: 112,
          mass: 3200,
          gravityRadius: 510,
          color: '#ef4444',
          secondaryColor: '#f97316',
          atmosphereColor: 'rgba(249, 115, 22, 0.32)'
        },
        {
          name: 'Cinder Alpha',
          type: 'moon',
          x: 520,
          y: 230,
          radius: 52,
          mass: 1150,
          gravityRadius: 270,
          color: '#94a3b8',
          secondaryColor: '#475569',
          atmosphereColor: 'rgba(148, 163, 184, 0.18)'
        },
        {
          name: 'Cinder Beta',
          type: 'moon',
          x: 1440,
          y: 880,
          radius: 56,
          mass: 1250,
          gravityRadius: 280,
          color: '#94a3b8',
          secondaryColor: '#475569',
          atmosphereColor: 'rgba(148, 163, 184, 0.18)'
        }
      ],
      energyParticles: [
        { x: 340, y: 340, value: 120 },
        { x: 520, y: 90, value: 180 },
        { x: 760, y: 220, value: 150 },
        { x: 980, y: 220, value: 200 },
        { x: 1240, y: 260, value: 150 },
        { x: 740, y: 880, value: 150 },
        { x: 980, y: 900, value: 200 },
        { x: 1440, y: 1030, value: 180 },
        { x: 1620, y: 680, value: 120 }
      ],
      powerups: [
        { type: 'shield', x: 520, y: 400 },
        { type: 'repair', x: 1440, y: 690 }
      ],
      obstacles: [
        { type: 'mine', x: 740, y: 420, radius: 19, patrolRadius: 55, speed: 1.8 },
        { type: 'mine', x: 1220, y: 700, radius: 19, patrolRadius: 55, speed: 1.8 },
        { type: 'asteroid', x: 980, y: 120, radius: 28, vx: 42, vy: 8, bounceBounds: true },
        { type: 'asteroid', x: 980, y: 1000, radius: 28, vx: -42, vy: -8, bounceBounds: true },
        { type: 'asteroid', x: 420, y: 740, radius: 25, vx: 24, vy: -26, bounceBounds: true },
        { type: 'asteroid', x: 1540, y: 340, radius: 25, vx: -24, vy: 26, bounceBounds: true }
      ]
    },

    // =========================================================================
    // SECTOR 6: SINGULARITY FRINGE (Introduces Miniature Black Hole)
    // =========================================================================
    {
      id: 6,
      name: 'Singularity Fringe',
      subtitle: 'Harness the gravitational lensing of Cygnus Micro-Singularity',
      hint: 'Black Holes have compact cores but intense gravitational pull — keep your speed high!',
      worldBounds: { minX: -280, maxX: 2150, minY: -260, maxY: 1340 },
      parTime: 65,
      requiredEnergy: 8,
      spawn: { x: 140, y: 600, angle: -0.25 },
      portal: { x: 1880, y: 540, radius: 46 },
      planets: [
        {
          name: 'Cygnus X-9',
          type: 'black_hole',
          x: 980,
          y: 550,
          radius: 56,
          mass: 3600,
          gravityRadius: 520,
          color: '#090d16',
          secondaryColor: '#a855f7',
          atmosphereColor: 'rgba(168, 85, 247, 0.34)'
        },
        {
          name: 'Aegis Outpost',
          type: 'terran',
          x: 480,
          y: 760,
          radius: 65,
          mass: 1450,
          gravityRadius: 310,
          color: '#14b8a6',
          secondaryColor: '#0f766e',
          atmosphereColor: 'rgba(45, 212, 191, 0.2)'
        },
        {
          name: 'Boreas Station',
          type: 'ice',
          x: 1480,
          y: 340,
          radius: 68,
          mass: 1500,
          gravityRadius: 320,
          color: '#38bdf8',
          secondaryColor: '#0369a1',
          atmosphereColor: 'rgba(56, 189, 248, 0.2)'
        }
      ],
      energyParticles: [
        { x: 350, y: 450, value: 120 },
        { x: 480, y: 560, value: 150 },
        { x: 740, y: 330, value: 180 },
        { x: 980, y: 270, value: 220 },
        { x: 1220, y: 330, value: 180 },
        { x: 740, y: 770, value: 180 },
        { x: 980, y: 830, value: 220 },
        { x: 1220, y: 770, value: 180 },
        { x: 1480, y: 560, value: 150 },
        { x: 1680, y: 440, value: 150 }
      ],
      powerups: [
        { type: 'shield', x: 680, y: 550 },
        { type: 'repair', x: 1280, y: 550 }
      ],
      obstacles: [
        {
          type: 'pulsar',
          x: 640,
          y: 240,
          radius: 19,
          beamLength: 180,
          angle: 0.7,
          rotationSpeed: 1.35
        },
        {
          type: 'pulsar',
          x: 1320,
          y: 860,
          radius: 19,
          beamLength: 180,
          angle: 2.1,
          rotationSpeed: -1.35
        },
        { type: 'mine', x: 980, y: 140, radius: 18, patrolRadius: 65, speed: 2.0 },
        { type: 'mine', x: 980, y: 960, radius: 18, patrolRadius: 65, speed: 2.0 },
        { type: 'asteroid', x: 820, y: 550, radius: 22, vx: 0, vy: -52, bounceBounds: true },
        { type: 'asteroid', x: 1140, y: 550, radius: 22, vx: 0, vy: 52, bounceBounds: true }
      ]
    },

    // =========================================================================
    // SECTOR 7: TRI-STAR LABYRINTH (Three Overlapping Planetary Gravity Wells)
    // =========================================================================
    {
      id: 7,
      name: 'Tri-Star Labyrinth',
      subtitle: 'Weave through a three-body gravitational triangle',
      hint: 'Collect energy in the outer or inner triangle — shield orbs protect against mine blasts!',
      worldBounds: { minX: -300, maxX: 2250, minY: -280, maxY: 1400 },
      parTime: 75,
      requiredEnergy: 9,
      spawn: { x: 140, y: 580, angle: 0 },
      portal: { x: 1960, y: 580, radius: 46 },
      planets: [
        {
          name: 'Kronos Alpha',
          type: 'gas_giant',
          x: 660,
          y: 330,
          radius: 84,
          mass: 2150,
          gravityRadius: 400,
          hasRings: true,
          color: '#eab308',
          secondaryColor: '#a16207',
          atmosphereColor: 'rgba(250, 204, 21, 0.24)'
        },
        {
          name: 'Kronos Beta',
          type: 'lava',
          x: 1050,
          y: 850,
          radius: 82,
          mass: 2200,
          gravityRadius: 400,
          color: '#f97316',
          secondaryColor: '#b91c1c',
          atmosphereColor: 'rgba(249, 115, 22, 0.25)'
        },
        {
          name: 'Kronos Gamma',
          type: 'ice',
          x: 1440,
          y: 330,
          radius: 80,
          mass: 2050,
          gravityRadius: 390,
          color: '#38bdf8',
          secondaryColor: '#1d4ed8',
          atmosphereColor: 'rgba(56, 189, 248, 0.24)'
        }
      ],
      energyParticles: [
        { x: 380, y: 420, value: 120 },
        { x: 660, y: 120, value: 180 },
        { x: 660, y: 560, value: 160 },
        { x: 860, y: 580, value: 180 },
        { x: 1050, y: 330, value: 220 },
        { x: 1050, y: 580, value: 250 }, // Center of the 3-body triangle
        { x: 1050, y: 1070, value: 180 },
        { x: 1240, y: 580, value: 180 },
        { x: 1440, y: 560, value: 160 },
        { x: 1440, y: 120, value: 180 },
        { x: 1720, y: 450, value: 150 }
      ],
      powerups: [
        { type: 'shield', x: 660, y: 760 },
        { type: 'repair', x: 1050, y: 160 },
        { type: 'shield', x: 1440, y: 760 }
      ],
      obstacles: [
        {
          type: 'pulsar',
          x: 1050,
          y: 500,
          radius: 20,
          beamLength: 195,
          angle: 0,
          rotationSpeed: 1.45
        },
        { type: 'mine', x: 840, y: 280, radius: 19, patrolRadius: 55, speed: 1.9 },
        { type: 'mine', x: 1260, y: 280, radius: 19, patrolRadius: 55, speed: 1.9 },
        { type: 'mine', x: 760, y: 860, radius: 19, patrolRadius: 65, speed: 2.0 },
        { type: 'mine', x: 1340, y: 860, radius: 19, patrolRadius: 65, speed: 2.0 },
        { type: 'asteroid', x: 480, y: 880, radius: 27, vx: 34, vy: -22, bounceBounds: true },
        { type: 'asteroid', x: 1680, y: 880, radius: 27, vx: -34, vy: -22, bounceBounds: true }
      ]
    },

    // =========================================================================
    // SECTOR 8: OMEGA CORE (Final Campaign Sector — Binary Singularity & Giant)
    // =========================================================================
    {
      id: 8,
      name: 'Omega Core',
      subtitle: 'Master the ultimate gravitational gauntlet at the heart of the sector',
      hint: 'Final Campaign Sector! Combine Boost, Retro-Brake, and Slingshot arcs to conquer Omega Core.',
      worldBounds: { minX: -320, maxX: 2400, minY: -300, maxY: 1460 },
      parTime: 85,
      requiredEnergy: 10,
      spawn: { x: 140, y: 600, angle: -0.2 },
      portal: { x: 2100, y: 600, radius: 48 },
      planets: [
        {
          name: 'Omega Singularity I',
          type: 'black_hole',
          x: 700,
          y: 420,
          radius: 54,
          mass: 3200,
          gravityRadius: 470,
          color: '#090d16',
          secondaryColor: '#ec4899',
          atmosphereColor: 'rgba(236, 72, 153, 0.32)'
        },
        {
          name: 'Titan Sovereign',
          type: 'gas_giant',
          x: 1160,
          y: 620,
          radius: 98,
          mass: 2750,
          gravityRadius: 460,
          hasRings: true,
          color: '#8b5cf6',
          secondaryColor: '#4c1d95',
          atmosphereColor: 'rgba(139, 92, 246, 0.26)'
        },
        {
          name: 'Omega Singularity II',
          type: 'black_hole',
          x: 1620,
          y: 420,
          radius: 54,
          mass: 3200,
          gravityRadius: 470,
          color: '#090d16',
          secondaryColor: '#06b6d4',
          atmosphereColor: 'rgba(6, 182, 212, 0.32)'
        }
      ],
      energyParticles: [
        { x: 380, y: 440, value: 150 },
        { x: 520, y: 240, value: 180 },
        { x: 700, y: 180, value: 220 },
        { x: 700, y: 680, value: 200 },
        { x: 930, y: 490, value: 250 },
        { x: 1160, y: 310, value: 220 },
        { x: 1160, y: 920, value: 220 },
        { x: 1390, y: 490, value: 250 },
        { x: 1620, y: 180, value: 220 },
        { x: 1620, y: 680, value: 200 },
        { x: 1820, y: 320, value: 180 },
        { x: 1880, y: 600, value: 200 }
      ],
      powerups: [
        { type: 'shield', x: 460, y: 720 },
        { type: 'repair', x: 1160, y: 160 },
        { type: 'shield', x: 1460, y: 820 }
      ],
      obstacles: [
        {
          type: 'pulsar',
          x: 930,
          y: 780,
          radius: 20,
          beamLength: 190,
          angle: 0.4,
          rotationSpeed: 1.55
        },
        {
          type: 'pulsar',
          x: 1390,
          y: 260,
          radius: 20,
          beamLength: 190,
          angle: 1.9,
          rotationSpeed: -1.55
        },
        { type: 'mine', x: 700, y: 880, radius: 19, patrolRadius: 70, speed: 2.1 },
        { type: 'mine', x: 1620, y: 880, radius: 19, patrolRadius: 70, speed: 2.1 },
        { type: 'asteroid', x: 540, y: 940, radius: 28, vx: 42, vy: -28, bounceBounds: true },
        { type: 'asteroid', x: 1160, y: 1080, radius: 30, vx: -48, vy: -18, bounceBounds: true },
        { type: 'asteroid', x: 1820, y: 920, radius: 28, vx: -38, vy: 32, bounceBounds: true }
      ]
    }
  ];

  /**
   * Deterministic pseudo-random helper for procedural endless levels (Sector 9+)
   */
  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /**
   * Generate a procedural Deep Space sector for Level 9+
   */
  function generateProceduralLevel(levelNum) {
    const rng = seededRandom(levelNum * 7919 + 1337);
    const numPlanets = Math.min(4, 2 + Math.floor((levelNum - 7) / 2));
    const width = 1900 + numPlanets * 180;
    const height = 1240;

    const planetTypes = [
      { type: 'terran', color: '#2dd4bf', secondaryColor: '#0284c7', atmosphereColor: 'rgba(56, 189, 248, 0.24)' },
      { type: 'gas_giant', color: '#f59e0b', secondaryColor: '#b45309', atmosphereColor: 'rgba(251, 191, 36, 0.25)', hasRings: true },
      { type: 'ice', color: '#38bdf8', secondaryColor: '#0369a1', atmosphereColor: 'rgba(56, 189, 248, 0.24)' },
      { type: 'lava', color: '#ef4444', secondaryColor: '#f97316', atmosphereColor: 'rgba(249, 115, 22, 0.3)' },
      { type: 'black_hole', color: '#090d16', secondaryColor: '#a855f7', atmosphereColor: 'rgba(168, 85, 247, 0.34)' }
    ];

    const planets = [];
    const usableSpan = width - 700;
    const stepX = usableSpan / numPlanets;

    for (let i = 0; i < numPlanets; i++) {
      const pTemplate = planetTypes[Math.floor(rng() * planetTypes.length)];
      const isBH = pTemplate.type === 'black_hole';
      const radius = isBH ? 52 + rng() * 12 : 68 + rng() * 28;
      const mass = isBH ? 3000 + rng() * 700 : 1650 + radius * 14;
      const px = 440 + i * stepX + (rng() - 0.5) * 110;
      const py = 320 + rng() * (height - 640);

      planets.push({
        name: `Sector-${levelNum} Body ${String.fromCharCode(65 + i)}`,
        type: pTemplate.type,
        x: Math.round(px),
        y: Math.round(py),
        radius: Math.round(radius),
        mass: Math.round(mass),
        gravityRadius: Math.round(radius * (isBH ? 8.5 : 4.7)),
        hasRings: !!pTemplate.hasRings,
        color: pTemplate.color,
        secondaryColor: pTemplate.secondaryColor,
        atmosphereColor: pTemplate.atmosphereColor
      });
    }

    const energyParticles = [];
    const totalOrbs = Math.min(14, 8 + Math.floor(levelNum / 2));
    for (let i = 0; i < totalOrbs; i++) {
      const refPlanet = planets[i % planets.length];
      const angle = (i / totalOrbs) * Math.PI * 2 + rng() * 0.6;
      const orbitDist = refPlanet.radius + 95 + rng() * 115;
      const ex = Math.max(260, Math.min(width - 260, refPlanet.x + Math.cos(angle) * orbitDist));
      const ey = Math.max(140, Math.min(height - 140, refPlanet.y + Math.sin(angle) * orbitDist));
      energyParticles.push({
        x: Math.round(ex),
        y: Math.round(ey),
        value: 150 + (i % 3) * 50
      });
    }

    const obstacles = [];
    const numObstacles = Math.min(12, 4 + Math.floor(levelNum * 0.75));
    for (let i = 0; i < numObstacles; i++) {
      const ox = 380 + rng() * (width - 720);
      const oy = 140 + rng() * (height - 280);
      // Ensure obstacle is not inside a planet
      const tooClose = planets.some((p) => Math.hypot(ox - p.x, oy - p.y) < p.radius + 75);
      if (tooClose) continue;

      const roll = rng();
      if (roll < 0.5) {
        obstacles.push({
          type: 'asteroid',
          x: Math.round(ox),
          y: Math.round(oy),
          radius: Math.round(22 + rng() * 10),
          vx: Math.round((rng() - 0.5) * (55 + levelNum * 3)),
          vy: Math.round((rng() - 0.5) * (55 + levelNum * 3)),
          bounceBounds: true
        });
      } else if (roll < 0.82) {
        obstacles.push({
          type: 'mine',
          x: Math.round(ox),
          y: Math.round(oy),
          radius: 19,
          patrolRadius: Math.round(50 + rng() * 35),
          speed: Number((1.6 + rng() * 0.8).toFixed(2))
        });
      } else {
        obstacles.push({
          type: 'pulsar',
          x: Math.round(ox),
          y: Math.round(oy),
          radius: 20,
          beamLength: 185,
          angle: Number((rng() * Math.PI * 2).toFixed(2)),
          rotationSpeed: Number(((rng() > 0.5 ? 1 : -1) * (1.2 + rng() * 0.5)).toFixed(2))
        });
      }
    }

    return {
      id: levelNum,
      name: `Deep Space Sector ${levelNum}`,
      subtitle: `Procedural Uncharted System • Threat Level ${levelNum - 7}`,
      hint: 'Endless Deep Space Mode! Navigate extreme multi-body gravity fields for maximum score.',
      worldBounds: { minX: -300, maxX: width + 250, minY: -280, maxY: height + 250 },
      parTime: 65 + numPlanets * 10,
      requiredEnergy: Math.max(5, Math.ceil(energyParticles.length * 0.75)),
      spawn: { x: 140, y: Math.round(height / 2), angle: 0 },
      portal: { x: width - 160, y: Math.round(height / 2), radius: 48 },
      planets,
      energyParticles,
      powerups: [
        { type: 'shield', x: Math.round(width * 0.36), y: Math.round(height * 0.22) },
        { type: 'repair', x: Math.round(width * 0.66), y: Math.round(height * 0.78) }
      ],
      obstacles
    };
  }

  function getLevelConfig(levelNumber) {
    const idx = Math.max(1, Math.floor(levelNumber)) - 1;
    if (idx < CAMPAIGN_LEVELS.length) {
      return JSON.parse(JSON.stringify(CAMPAIGN_LEVELS[idx]));
    }
    return generateProceduralLevel(levelNumber);
  }

  const Levels = {
    CAMPAIGN_LEVELS,
    getLevelConfig,
    generateProceduralLevel
  };

  root.Orbital = root.Orbital || {};
  root.Orbital.Levels = Levels;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Levels;
  }
})(typeof window !== 'undefined' ? window : globalThis);
