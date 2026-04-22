const ROWS = 5;
const COLS = 9;
const BOARD_W = 864;
const BOARD_H = 460;
const CELL_W = BOARD_W / COLS;
const CELL_H = BOARD_H / ROWS;
const WIN_SECONDS = 200;
const MAX_LOADOUT = 6;
const MIN_LOADOUT = 3;

const PLANTS = {
  sunflower: {
    label: "\u5411\u65e5\u8475",
    cost: 50,
    hp: 70,
    role: "producer",
    sunMin: 8500,
    sunMax: 11000,
    icon: "assets/plants/sunflower.svg"
  },
  peashooter: {
    label: "\u8c4c\u8c46\u5c04\u624b",
    cost: 100,
    hp: 95,
    role: "shooter",
    cooldown: 1400,
    damage: 20,
    speed: 220,
    icon: "assets/plants/peashooter.svg"
  },
  wallnut: {
    label: "\u575a\u679c\u5899",
    cost: 50,
    hp: 360,
    role: "blocker",
    icon: "assets/plants/wallnut.svg"
  },
  repeater: {
    label: "\u53cc\u53d1\u5c04\u624b",
    cost: 200,
    hp: 100,
    role: "repeater",
    cooldown: 1650,
    damage: 20,
    speed: 230,
    icon: "assets/plants/repeater.svg"
  },
  snowpea: {
    label: "\u5bd2\u51b0\u5c04\u624b",
    cost: 175,
    hp: 95,
    role: "snow",
    cooldown: 1700,
    damage: 20,
    speed: 210,
    slowMs: 3500,
    icon: "assets/plants/snowpea.svg"
  },
  cherrybomb: {
    label: "\u6a31\u6843\u70b8\u5f39",
    cost: 150,
    hp: 999,
    role: "bomb",
    fuseMs: 900,
    explodeRows: 1,
    explodeX: 120,
    damage: 9999,
    icon: "assets/plants/cherrybomb.svg"
  },
  potatomine: {
    label: "\u571f\u8c46\u96f7",
    cost: 25,
    hp: 70,
    role: "mine",
    armMs: 10000,
    explodeX: 56,
    damage: 9999,
    icon: "assets/plants/potatomine.svg"
  }
};

const ZOMBIE_TYPES = {
  basic: {
    label: "\u666e\u901a\u50f5\u5c38",
    icon: "assets/zombies/basic.svg",
    hpMul: 1,
    speedMul: 1,
    reward: 25,
    damage: 18
  },
  flag: {
    label: "\u65d7\u5e1c\u50f5\u5c38",
    icon: "assets/zombies/flag.svg",
    hpMul: 0.95,
    speedMul: 1.28,
    reward: 28,
    damage: 18
  },
  conehead: {
    label: "\u8def\u969c\u50f5\u5c38",
    icon: "assets/zombies/conehead.svg",
    hpMul: 1.75,
    speedMul: 0.93,
    reward: 40,
    damage: 20
  },
  buckethead: {
    label: "\u94c1\u6876\u50f5\u5c38",
    icon: "assets/zombies/buckethead.svg",
    hpMul: 3,
    speedMul: 0.82,
    reward: 70,
    damage: 24
  },
  newspaper: {
    label: "\u8bfb\u62a5\u50f5\u5c38",
    icon: "assets/zombies/newspaper.svg",
    hpMul: 1.45,
    speedMul: 0.94,
    reward: 52,
    damage: 20,
    enragedAt: 0.45,
    enragedSpeedMul: 1.9
  },
  screendoor: {
    label: "\u94c1\u95e8\u50f5\u5c38",
    icon: "assets/zombies/screendoor.svg",
    hpMul: 2.35,
    speedMul: 0.78,
    reward: 66,
    damage: 22
  },
  football: {
    label: "\u6a44\u6984\u7403\u50f5\u5c38",
    icon: "assets/zombies/football.svg",
    hpMul: 2.15,
    speedMul: 1.45,
    reward: 85,
    damage: 30
  }
};

const DEFAULT_LOADOUT = [
  "sunflower",
  "peashooter",
  "wallnut",
  "repeater",
  "snowpea",
  "potatomine"
];

const MOWER_CONFIG = {
  icon: "assets/mower/lawn-mower.svg",
  speed: 360,
  triggerRange: 34,
  killRange: 44
};

const appEl = document.querySelector(".app");
const board = document.getElementById("board");
const mowerLayer = document.getElementById("mower-layer");
const plantLayer = document.getElementById("plant-layer");
const zombieLayer = document.getElementById("zombie-layer");
const projectileLayer = document.getElementById("projectile-layer");
const sunLayer = document.getElementById("sun-layer");
const sunCountEl = document.getElementById("sun-count");
const scoreCountEl = document.getElementById("score-count");
const timeCountEl = document.getElementById("time-count");
const lifeCountEl = document.getElementById("life-count");
const statusLine = document.getElementById("status-line");
const shop = document.querySelector(".shop");
const shopCardsEl = document.getElementById("shop-cards");
const clearBtn = document.getElementById("clear-selection");
const restartBtn = document.getElementById("restart-btn");
const loadoutPanel = document.getElementById("loadout-panel");
const plantPoolEl = document.getElementById("plant-pool");
const loadoutCountEl = document.getElementById("loadout-count");
const startBattleBtn = document.getElementById("start-battle-btn");

let state;
let rafId;
let loadoutDraft = new Set(DEFAULT_LOADOUT);

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function createInitialMowers() {
  return Array.from({ length: ROWS }, (_, row) => ({
    id: `mower-${row}`,
    row,
    x: 26,
    y: rowCenter(row),
    armed: true,
    active: false,
    used: false,
    speed: MOWER_CONFIG.speed
  }));
}

function createInitialState(loadout) {
  return {
    battleStarted: false,
    selectedPlant: null,
    loadout: [...loadout],
    sun: 150,
    score: 0,
    lives: 3,
    startTime: performance.now(),
    lastFrame: performance.now(),
    lastZombieSpawn: 0,
    lastSkySunSpawn: 0,
    entities: {
      plants: [],
      zombies: [],
      projectiles: [],
      suns: [],
      mowers: createInitialMowers()
    },
    plantIndex: new Map(),
    gameOver: false,
    won: false,
    idSeed: 1
  };
}

function nextId() {
  const id = state.idSeed;
  state.idSeed += 1;
  return id;
}

function keyOf(row, col) {
  return `${row}:${col}`;
}

function setStatus(text, bad = false) {
  statusLine.textContent = text;
  statusLine.classList.toggle("bad", bad);
}

function updateHud() {
  const elapsed = state.battleStarted
    ? Math.floor((performance.now() - state.startTime) / 1000)
    : 0;
  sunCountEl.textContent = String(state.sun);
  scoreCountEl.textContent = String(state.score);
  timeCountEl.textContent = String(elapsed);
  lifeCountEl.textContent = String(state.lives);
}

function boardScale() {
  const rect = board.getBoundingClientRect();
  return {
    sx: rect.width / BOARD_W,
    sy: rect.height / BOARD_H
  };
}

function toScreenX(rawX) {
  return rawX * boardScale().sx;
}

function toScreenY(rawY) {
  return rawY * boardScale().sy;
}

function rowCenter(row) {
  return row * CELL_H + CELL_H / 2;
}

function colCenter(col) {
  return col * CELL_W + CELL_W / 2;
}

function weightedPick(table) {
  const total = table.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of table) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.type;
    }
  }
  return table[table.length - 1].type;
}

function pickZombieType(elapsed) {
  if (elapsed < 20) {
    return weightedPick([
      { type: "basic", weight: 72 },
      { type: "flag", weight: 28 }
    ]);
  }
  if (elapsed < 50) {
    return weightedPick([
      { type: "basic", weight: 50 },
      { type: "conehead", weight: 28 },
      { type: "flag", weight: 22 }
    ]);
  }
  if (elapsed < 90) {
    return weightedPick([
      { type: "basic", weight: 30 },
      { type: "conehead", weight: 34 },
      { type: "buckethead", weight: 17 },
      { type: "newspaper", weight: 19 }
    ]);
  }
  if (elapsed < 130) {
    return weightedPick([
      { type: "conehead", weight: 24 },
      { type: "buckethead", weight: 24 },
      { type: "newspaper", weight: 22 },
      { type: "screendoor", weight: 15 },
      { type: "flag", weight: 15 }
    ]);
  }
  return weightedPick([
    { type: "buckethead", weight: 22 },
    { type: "newspaper", weight: 20 },
    { type: "screendoor", weight: 18 },
    { type: "football", weight: 18 },
    { type: "conehead", weight: 12 },
    { type: "flag", weight: 10 }
  ]);
}

function spawnZombie(nowMs) {
  if (!state.battleStarted || state.gameOver) {
    return;
  }

  const elapsed = (nowMs - state.startTime) / 1000;
  const intervalMs = Math.max(980, 3200 - elapsed * 12);
  if (nowMs - state.lastZombieSpawn < intervalMs) {
    return;
  }

  state.lastZombieSpawn = nowMs;
  const row = Math.floor(Math.random() * ROWS);
  const type = pickZombieType(elapsed);
  const cfg = ZOMBIE_TYPES[type];
  const baseHp = 108 + Math.min(230, Math.floor(elapsed / 7) * 9);
  const hp = Math.round(baseHp * cfg.hpMul);
  const baseSpeed = (10.8 + Math.random() * 6.2 + Math.min(12, elapsed / 45)) * cfg.speedMul;

  state.entities.zombies.push({
    id: nextId(),
    type,
    row,
    x: BOARD_W + 40,
    y: rowCenter(row),
    hp,
    maxHp: hp,
    baseSpeed,
    speed: baseSpeed,
    attackDamage: cfg.damage,
    attackCooldown: 0,
    attacking: false,
    slowTimer: 0,
    enraged: false
  });
}

function spawnSkySun(nowMs) {
  if (!state.battleStarted || state.gameOver) {
    return;
  }
  if (nowMs - state.lastSkySunSpawn < 6700) {
    return;
  }

  state.lastSkySunSpawn = nowMs;
  const x = 48 + Math.random() * (BOARD_W - 96);
  const targetY = 42 + Math.random() * (BOARD_H - 96);
  state.entities.suns.push({
    id: nextId(),
    x,
    y: -20,
    targetY,
    vy: 22 + Math.random() * 20,
    ttl: 8800,
    value: 25
  });
}

function hasZombieAhead(plant) {
  return state.entities.zombies.some(
    (zombie) => zombie.row === plant.row && zombie.hp > 0 && zombie.x > plant.x - 18
  );
}

function spawnProjectile(plant, damage, speed, slowMs = 0, xShift = 0) {
  state.entities.projectiles.push({
    id: nextId(),
    row: plant.row,
    x: plant.x + 20 + xShift,
    y: plant.y,
    vx: speed,
    damage,
    slowMs
  });
}

function removePlant(plant) {
  state.plantIndex.delete(keyOf(plant.row, plant.col));
  state.entities.plants = state.entities.plants.filter((p) => p.id !== plant.id);
}

function explodeCherryBomb(plant) {
  for (const zombie of state.entities.zombies) {
    if (zombie.hp <= 0) {
      continue;
    }
    const inRowRange = Math.abs(zombie.row - plant.row) <= PLANTS.cherrybomb.explodeRows;
    const inXRange = Math.abs(zombie.x - plant.x) <= PLANTS.cherrybomb.explodeX;
    if (inRowRange && inXRange) {
      zombie.hp -= PLANTS.cherrybomb.damage;
    }
  }
  removePlant(plant);
  setStatus("\u6a31\u6843\u70b8\u5f39\u7206\u70b8\u3002");
}

function tryPotatoMine(plant, deltaMs) {
  if (!plant.armed) {
    plant.armTimer -= deltaMs;
    if (plant.armTimer <= 0) {
      plant.armed = true;
      setStatus("\u571f\u8c46\u96f7\u5df2\u5c31\u7eea\u3002");
    }
    return;
  }

  let triggered = false;
  for (const zombie of state.entities.zombies) {
    if (zombie.row !== plant.row || zombie.hp <= 0) {
      continue;
    }
    if (Math.abs(zombie.x - plant.x) <= PLANTS.potatomine.explodeX) {
      zombie.hp -= PLANTS.potatomine.damage;
      triggered = true;
    }
  }

  if (triggered) {
    removePlant(plant);
    setStatus("\u571f\u8c46\u96f7\u7206\u70b8\u3002");
  }
}

function updatePlants(deltaMs) {
  for (const plant of [...state.entities.plants]) {
    const cfg = PLANTS[plant.type];
    if (!cfg) {
      continue;
    }

    if (cfg.role === "producer") {
      plant.sunCooldown -= deltaMs;
      if (plant.sunCooldown <= 0) {
        plant.sunCooldown = randomInRange(cfg.sunMin, cfg.sunMax);
        state.entities.suns.push({
          id: nextId(),
          x: plant.x + (Math.random() * 28 - 14),
          y: plant.y - 12,
          targetY: plant.y + 8,
          vy: 28,
          ttl: 7600,
          value: 25
        });
      }
      continue;
    }

    if (cfg.role === "shooter") {
      plant.fireCooldown -= deltaMs;
      if (plant.fireCooldown <= 0 && hasZombieAhead(plant)) {
        plant.fireCooldown = cfg.cooldown;
        spawnProjectile(plant, cfg.damage, cfg.speed);
      }
      continue;
    }

    if (cfg.role === "repeater") {
      plant.fireCooldown -= deltaMs;
      if (plant.fireCooldown <= 0 && hasZombieAhead(plant)) {
        plant.fireCooldown = cfg.cooldown;
        spawnProjectile(plant, cfg.damage, cfg.speed, 0, 0);
        spawnProjectile(plant, cfg.damage, cfg.speed, 0, 10);
      }
      continue;
    }

    if (cfg.role === "snow") {
      plant.fireCooldown -= deltaMs;
      if (plant.fireCooldown <= 0 && hasZombieAhead(plant)) {
        plant.fireCooldown = cfg.cooldown;
        spawnProjectile(plant, cfg.damage, cfg.speed, cfg.slowMs);
      }
      continue;
    }

    if (cfg.role === "bomb") {
      plant.fuse -= deltaMs;
      if (plant.fuse <= 0) {
        explodeCherryBomb(plant);
      }
      continue;
    }

    if (cfg.role === "mine") {
      tryPotatoMine(plant, deltaMs);
      continue;
    }
  }
}

function findBiteTarget(zombie) {
  let best = null;
  for (const plant of state.entities.plants) {
    if (plant.row !== zombie.row) {
      continue;
    }
    const dx = zombie.x - plant.x;
    if (dx < -24 || dx > 44) {
      continue;
    }
    if (!best || plant.x > best.x) {
      best = plant;
    }
  }
  return best;
}

function triggerMowerForRow(row) {
  const mower = state.entities.mowers.find(
    (item) => item.row === row && item.armed && !item.active && !item.used
  );
  if (!mower) {
    return false;
  }
  mower.armed = false;
  mower.active = true;
  setStatus(`\u7b2c ${row + 1} \u884c\u5c0f\u63a8\u8f66\u542f\u52a8\u3002`);
  return true;
}

function updateMowers(deltaMs) {
  for (const mower of state.entities.mowers) {
    if (!mower.active || mower.used) {
      continue;
    }

    mower.x += mower.speed * (deltaMs / 1000);

    for (const zombie of state.entities.zombies) {
      if (zombie.row !== mower.row || zombie.hp <= 0) {
        continue;
      }
      if (Math.abs(zombie.x - mower.x) <= MOWER_CONFIG.killRange) {
        zombie.hp = 0;
      }
    }

    if (mower.x > BOARD_W + 80) {
      mower.active = false;
      mower.used = true;
    }
  }
}

function updateZombies(deltaMs) {
  const zombies = state.entities.zombies;

  for (const zombie of zombies) {
    if (zombie.hp <= 0) {
      continue;
    }

    const cfg = ZOMBIE_TYPES[zombie.type] || ZOMBIE_TYPES.basic;

    if (zombie.type === "newspaper" && !zombie.enraged && zombie.hp <= zombie.maxHp * cfg.enragedAt) {
      zombie.enraged = true;
      zombie.baseSpeed *= cfg.enragedSpeedMul;
      setStatus("\u8bfb\u62a5\u50f5\u5c38\u66b4\u6012\u4e86\u3002", true);
    }

    zombie.slowTimer = Math.max(0, zombie.slowTimer - deltaMs);
    const speedFactor = zombie.slowTimer > 0 ? 0.55 : 1;
    zombie.speed = zombie.baseSpeed * speedFactor;

    const target = findBiteTarget(zombie);
    zombie.attacking = Boolean(target);

    if (!target) {
      zombie.x -= zombie.speed * (deltaMs / 1000);
    } else {
      zombie.attackCooldown -= deltaMs;
      if (zombie.attackCooldown <= 0) {
        zombie.attackCooldown = 900;
        target.hp -= zombie.attackDamage;
        if (target.hp <= 0) {
          removePlant(target);
        }
      }
    }

    const rowMower = state.entities.mowers.find(
      (item) => item.row === zombie.row && item.armed && !item.active && !item.used
    );
    if (rowMower && zombie.x <= rowMower.x + MOWER_CONFIG.triggerRange) {
      triggerMowerForRow(zombie.row);
    }
  }

  for (const zombie of [...zombies]) {
    if (zombie.hp <= 0) {
      const cfg = ZOMBIE_TYPES[zombie.type] || ZOMBIE_TYPES.basic;
      state.score += cfg.reward;
      state.entities.zombies = state.entities.zombies.filter((z) => z.id !== zombie.id);
      continue;
    }

    if (zombie.x < -26) {
      state.lives -= 1;
      state.entities.zombies = state.entities.zombies.filter((z) => z.id !== zombie.id);
      setStatus("\u6709\u50f5\u5c38\u8fdb\u5165\u4e86\u4f60\u7684\u623f\u5b50\u3002", true);
      if (state.lives <= 0) {
        endGame(false);
      }
    }
  }
}

function updateProjectiles(deltaMs) {
  for (const pea of state.entities.projectiles) {
    pea.x += pea.vx * (deltaMs / 1000);

    for (const zombie of state.entities.zombies) {
      if (zombie.row !== pea.row || zombie.hp <= 0) {
        continue;
      }
      if (Math.abs(pea.x - zombie.x) < 20) {
        zombie.hp -= pea.damage;
        if (pea.slowMs > 0) {
          zombie.slowTimer = Math.max(zombie.slowTimer, pea.slowMs);
        }
        pea.hit = true;
        break;
      }
    }
  }

  state.entities.projectiles = state.entities.projectiles.filter(
    (pea) => !pea.hit && pea.x < BOARD_W + 40
  );
}

function updateSuns(deltaMs) {
  for (const sun of state.entities.suns) {
    if (sun.y < sun.targetY) {
      sun.y = Math.min(sun.targetY, sun.y + sun.vy * (deltaMs / 1000));
    }
    sun.ttl -= deltaMs;
  }
  state.entities.suns = state.entities.suns.filter((sun) => sun.ttl > 0);
}

function endGame(won) {
  if (state.gameOver) {
    return;
  }

  state.gameOver = true;
  state.won = won;
  if (won) {
    setStatus("\u80dc\u5229\uff0c\u4f60\u5b88\u4f4f\u4e86\u5168\u90e8\u6ce2\u6b21\u3002");
  } else {
    setStatus("\u6e38\u620f\u7ed3\u675f\uff0c\u50f5\u5c38\u653b\u7834\u4e86\u9632\u7ebf\u3002", true);
  }
}

function gameLoop(nowMs) {
  if (!state) {
    return;
  }

  const deltaMs = Math.min(80, nowMs - state.lastFrame);
  state.lastFrame = nowMs;

  if (state.battleStarted && !state.gameOver) {
    spawnZombie(nowMs);
    spawnSkySun(nowMs);
    updatePlants(deltaMs);
    updateProjectiles(deltaMs);
    updateZombies(deltaMs);
    updateMowers(deltaMs);
    updateSuns(deltaMs);

    const elapsed = Math.floor((nowMs - state.startTime) / 1000);
    if (elapsed >= WIN_SECONDS) {
      endGame(true);
    }
  }

  render();
  updateHud();
  refreshCardStates();
  rafId = requestAnimationFrame(gameLoop);
}

function renderPlantPool() {
  const allPlants = Object.keys(PLANTS);
  const html = allPlants
    .map((type) => {
      const cfg = PLANTS[type];
      const selected = loadoutDraft.has(type);
      const disabled = !selected && loadoutDraft.size >= MAX_LOADOUT;
      const classes = ["card"];
      if (selected) {
        classes.push("active");
      }
      if (disabled) {
        classes.push("disabled");
      }
      return `
        <button type="button" class="${classes.join(" ")}" data-plant="${type}" ${disabled ? "disabled" : ""}>
          <img class="card-icon" src="${cfg.icon}" alt="${cfg.label}">
          <span>${cfg.label}</span>
          <small>${cfg.cost} \u9633\u5149</small>
        </button>
      `;
    })
    .join("");

  plantPoolEl.innerHTML = html;
  loadoutCountEl.textContent = `${loadoutDraft.size} / ${MAX_LOADOUT} \u5df2\u9009`;
  startBattleBtn.disabled = loadoutDraft.size < MIN_LOADOUT;
}

function renderShopCards() {
  const html = state.loadout
    .map((type) => {
      const cfg = PLANTS[type];
      return `
        <button type="button" class="card" data-plant="${type}">
          <img class="card-icon" src="${cfg.icon}" alt="${cfg.label}">
          <span>${cfg.label}</span>
          <small>${cfg.cost} \u9633\u5149</small>
        </button>
      `;
    })
    .join("");

  shopCardsEl.innerHTML = html;
}

function refreshCardStates() {
  const cards = Array.from(shop.querySelectorAll(".card[data-plant]"));
  cards.forEach((card) => {
    const plantType = card.dataset.plant;
    const selected = state.selectedPlant === plantType;
    card.classList.toggle("active", selected);
    const canBuy = state.sun >= PLANTS[plantType].cost;
    card.classList.toggle("disabled", !canBuy);
    card.disabled = !state.battleStarted || state.gameOver;
  });
}

function renderMowers() {
  const html = state.entities.mowers
    .filter((mower) => !mower.used)
    .map((mower) => {
      const x = toScreenX(mower.x);
      const y = toScreenY(mower.y);
      const movingClass = mower.active ? "moving" : "";
      return `
        <div class="mower ${movingClass}" style="left:${x}px; top:${y}px;">
          <img class="mower-icon" src="${MOWER_CONFIG.icon}" alt="\u5c0f\u63a8\u8f66">
        </div>
      `;
    })
    .join("");

  mowerLayer.innerHTML = html;
}

function renderPlants() {
  const html = state.entities.plants
    .map((plant) => {
      const cfg = PLANTS[plant.type];
      const hpPct = Math.max(0, Math.round((plant.hp / plant.maxHp) * 100));
      const x = toScreenX(plant.x);
      const y = toScreenY(plant.y);
      const mineTag = plant.type === "potatomine"
        ? `<span class="entity-name">${plant.armed ? "\u571f\u8c46\u96f7" : "\u6b63\u5728\u51c6\u5907\u4e2d..."}</span>`
        : `<span class="entity-name">${cfg.label}</span>`;
      return `
        <div class="plant ${plant.type}" style="left:${x}px; top:${y}px;">
          <img class="entity-icon" src="${cfg.icon}" alt="${cfg.label}">
          ${mineTag}
          <span class="hp-bar"><i style="width:${hpPct}%"></i></span>
        </div>
      `;
    })
    .join("");

  plantLayer.innerHTML = html;
}

function renderZombies() {
  const html = state.entities.zombies
    .map((zombie) => {
      const cfg = ZOMBIE_TYPES[zombie.type] || ZOMBIE_TYPES.basic;
      const hpPct = Math.max(0, Math.round((zombie.hp / zombie.maxHp) * 100));
      const x = toScreenX(zombie.x);
      const y = toScreenY(zombie.y);
      let cls = `zombie ${zombie.type}`;
      if (zombie.attacking) {
        cls += " attack";
      }
      if (zombie.type === "newspaper" && zombie.enraged) {
        cls += " enraged";
      }
      return `
        <div class="${cls}" style="left:${x}px; top:${y}px;">
          <img class="entity-icon" src="${cfg.icon}" alt="${cfg.label}">
          <span class="entity-name">${cfg.label}</span>
          <span class="hp-bar"><i style="width:${hpPct}%"></i></span>
        </div>
      `;
    })
    .join("");

  zombieLayer.innerHTML = html;
}

function renderProjectiles() {
  const html = state.entities.projectiles
    .map((pea) => {
      const x = toScreenX(pea.x);
      const y = toScreenY(pea.y);
      const className = pea.slowMs > 0 ? "pea snow" : "pea";
      return `<div class="${className}" style="left:${x}px; top:${y}px;"></div>`;
    })
    .join("");

  projectileLayer.innerHTML = html;
}

function renderSuns() {
  const html = state.entities.suns
    .map((sun) => {
      const x = toScreenX(sun.x);
      const y = toScreenY(sun.y);
      return `
        <button type="button" class="sun" data-id="${sun.id}" style="left:${x}px; top:${y}px;">
          <span class="sun-core">\u9633\u5149</span>
          <span class="sun-value">+${sun.value}</span>
        </button>
      `;
    })
    .join("");

  sunLayer.innerHTML = html;
}

function render() {
  renderMowers();
  renderPlants();
  renderProjectiles();
  renderZombies();
  renderSuns();
}

function createTiles() {
  board.innerHTML = "";
  const scale = boardScale();
  const tileW = CELL_W * scale.sx;
  const tileH = CELL_H * scale.sy;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.type = "button";
      tile.dataset.row = String(row);
      tile.dataset.col = String(col);
      tile.style.width = `${tileW}px`;
      tile.style.height = `${tileH}px`;
      tile.style.left = `${col * tileW}px`;
      tile.style.top = `${row * tileH}px`;
      board.appendChild(tile);
    }
  }
}

function placePlant(row, col) {
  if (!state.battleStarted || state.gameOver) {
    return;
  }

  if (!state.selectedPlant) {
    setStatus("\u8bf7\u9009\u62e9\u690d\u7269\u5361\u7247\u540e\u518d\u79cd\u690d\u3002", true);
    return;
  }

  const type = state.selectedPlant;
  const cfg = PLANTS[type];
  const key = keyOf(row, col);

  if (state.plantIndex.has(key)) {
    setStatus("\u8fd9\u4e2a\u683c\u5b50\u5df2\u7ecf\u6709\u690d\u7269\u3002", true);
    return;
  }

  if (state.sun < cfg.cost) {
    setStatus("\u9633\u5149\u4e0d\u8db3\uff0c\u65e0\u6cd5\u79cd\u690d\u8be5\u690d\u7269\u3002", true);
    return;
  }

  state.sun -= cfg.cost;
  const plant = {
    id: nextId(),
    type,
    row,
    col,
    x: colCenter(col),
    y: rowCenter(row),
    hp: cfg.hp,
    maxHp: cfg.hp,
    fireCooldown: cfg.cooldown || 0,
    sunCooldown: cfg.sunMin ? randomInRange(cfg.sunMin, cfg.sunMax) : 0,
    fuse: cfg.fuseMs || 0,
    armTimer: cfg.armMs || 0,
    armed: cfg.role !== "mine"
  };

  state.entities.plants.push(plant);
  state.plantIndex.set(key, plant);
  setStatus(`\u5df2\u79cd\u4e0b\uff1a${cfg.label}\u3002`);
}

function collectSunById(id) {
  if (!state.battleStarted || state.gameOver) {
    return;
  }

  const target = state.entities.suns.find((sun) => sun.id === id);
  if (!target) {
    return;
  }

  state.sun += target.value;
  state.entities.suns = state.entities.suns.filter((sun) => sun.id !== id);
}

function handleSunCollect(event) {
  const sun = event.target.closest(".sun");
  if (!sun) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  collectSunById(Number(sun.dataset.id));
  updateHud();
  refreshCardStates();
  renderSuns();
}

function applyLoadoutAndStart() {
  if (loadoutDraft.size < MIN_LOADOUT) {
    return;
  }

  state = createInitialState([...loadoutDraft]);
  state.battleStarted = true;
  state.startTime = performance.now();
  state.lastFrame = performance.now();

  appEl.classList.add("in-battle");
  renderShopCards();
  createTiles();
  render();
  updateHud();
  refreshCardStates();
  setStatus("\u6218\u6597\u5f00\u59cb\uff0c\u51c6\u5907\u9632\u5b88\u3002");

  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  rafId = requestAnimationFrame(gameLoop);
}

function handlePoolClick(event) {
  const button = event.target.closest(".card[data-plant]");
  if (!button) {
    return;
  }

  const plantType = button.dataset.plant;
  if (loadoutDraft.has(plantType)) {
    loadoutDraft.delete(plantType);
  } else if (loadoutDraft.size < MAX_LOADOUT) {
    loadoutDraft.add(plantType);
  }

  renderPlantPool();
}

function bindEvents() {
  plantPoolEl.addEventListener("click", handlePoolClick);

  startBattleBtn.addEventListener("click", () => {
    applyLoadoutAndStart();
  });

  shop.addEventListener("click", (event) => {
    const btn = event.target.closest(".card[data-plant]");
    if (!btn || !state.battleStarted) {
      return;
    }

    const plantType = btn.dataset.plant;
    state.selectedPlant = state.selectedPlant === plantType ? null : plantType;
    if (state.selectedPlant) {
      setStatus(`\u5df2\u9009\u62e9\uff1a${PLANTS[state.selectedPlant].label}\u3002\u70b9\u51fb\u683c\u5b50\u79cd\u690d\u3002`);
    } else {
      setStatus("\u5df2\u53d6\u6d88\u5f53\u524d\u9009\u62e9\u3002");
    }
    refreshCardStates();
  });

  clearBtn.addEventListener("click", () => {
    state.selectedPlant = null;
    setStatus("\u5df2\u53d6\u6d88\u5f53\u524d\u9009\u62e9\u3002");
    refreshCardStates();
  });

  board.addEventListener("click", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile) {
      return;
    }

    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    placePlant(row, col);
    updateHud();
    refreshCardStates();
  });

  sunLayer.addEventListener("pointerdown", handleSunCollect);
  sunLayer.addEventListener("click", handleSunCollect);

  restartBtn.addEventListener("click", () => {
    if (!state.battleStarted) {
      return;
    }
    loadoutDraft = new Set(state.loadout);
    applyLoadoutAndStart();
  });

  window.addEventListener("resize", () => {
    createTiles();
    render();
  });
}

function initializeLoadoutScreen() {
  state = createInitialState([...loadoutDraft]);
  appEl.classList.remove("in-battle");
  renderPlantPool();
  renderShopCards();
  createTiles();
  render();
  updateHud();
  setStatus("\u8bf7\u9009\u62e9\u5f00\u5c40\u690d\u7269\u5e76\u70b9\u51fb\u201c\u5f00\u59cb\u6218\u6597\u201d\u3002");
}

bindEvents();
initializeLoadoutScreen();
