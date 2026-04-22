const ROWS = 5;
const COLS = 9;
const BOARD_W = 864;
const BOARD_H = 460;
const CELL_W = BOARD_W / COLS;
const CELL_H = BOARD_H / ROWS;
const WIN_SECONDS = 180;

const PLANTS = {
  sunflower: { cost: 50, hp: 65, label: "Sunflower" },
  peashooter: { cost: 100, hp: 95, label: "Peashooter" },
  wallnut: { cost: 75, hp: 280, label: "Wallnut" }
};

const board = document.getElementById("board");
const plantLayer = document.getElementById("plant-layer");
const zombieLayer = document.getElementById("zombie-layer");
const projectileLayer = document.getElementById("projectile-layer");
const sunLayer = document.getElementById("sun-layer");
const sunCountEl = document.getElementById("sun-count");
const scoreCountEl = document.getElementById("score-count");
const timeCountEl = document.getElementById("time-count");
const lifeCountEl = document.getElementById("life-count");
const statusLine = document.getElementById("status-line");
const clearBtn = document.getElementById("clear-selection");
const restartBtn = document.getElementById("restart-btn");
const cards = Array.from(document.querySelectorAll(".card[data-plant]"));

let state;
let rafId;

function createInitialState() {
  return {
    selectedPlant: null,
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
      suns: []
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
  const elapsed = Math.floor((performance.now() - state.startTime) / 1000);
  sunCountEl.textContent = String(state.sun);
  scoreCountEl.textContent = String(state.score);
  timeCountEl.textContent = String(elapsed);
  lifeCountEl.textContent = String(state.lives);
}

function refreshCardStates() {
  cards.forEach((card) => {
    const plantType = card.dataset.plant;
    const selected = state.selectedPlant === plantType;
    card.classList.toggle("active", selected);
    const canBuy = state.sun >= PLANTS[plantType].cost;
    card.style.opacity = canBuy ? "1" : "0.55";
  });
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

function spawnZombie(nowMs) {
  const elapsed = (nowMs - state.startTime) / 1000;
  const intervalMs = Math.max(1200, 3200 - elapsed * 10);
  if (nowMs - state.lastZombieSpawn < intervalMs) {
    return;
  }
  state.lastZombieSpawn = nowMs;
  const row = Math.floor(Math.random() * ROWS);
  const hp = 110 + Math.min(180, Math.floor(elapsed / 6) * 8);
  const speed = 11 + Math.random() * 7 + Math.min(10, elapsed / 50);
  state.entities.zombies.push({
    id: nextId(),
    row,
    x: BOARD_W + 36,
    y: rowCenter(row),
    hp,
    maxHp: hp,
    speed,
    attackCooldown: 0,
    attacking: false
  });
}

function spawnSkySun(nowMs) {
  if (nowMs - state.lastSkySunSpawn < 6800) {
    return;
  }
  state.lastSkySunSpawn = nowMs;
  const x = 48 + Math.random() * (BOARD_W - 96);
  const targetY = 44 + Math.random() * (BOARD_H - 100);
  state.entities.suns.push({
    id: nextId(),
    x,
    y: -20,
    targetY,
    vy: 22 + Math.random() * 20,
    ttl: 8500,
    value: 25
  });
}

function spawnPlantSunflowers(deltaMs) {
  for (const plant of state.entities.plants) {
    if (plant.type !== "sunflower") {
      continue;
    }
    plant.sunCooldown -= deltaMs;
    if (plant.sunCooldown <= 0) {
      plant.sunCooldown = 9000 + Math.random() * 2600;
      state.entities.suns.push({
        id: nextId(),
        x: plant.x + (Math.random() * 28 - 14),
        y: plant.y - 12,
        targetY: plant.y + 8,
        vy: 28,
        ttl: 7000,
        value: 25
      });
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

function removePlant(plant) {
  state.plantIndex.delete(keyOf(plant.row, plant.col));
  state.entities.plants = state.entities.plants.filter((p) => p.id !== plant.id);
}

function updatePlants(deltaMs) {
  for (const plant of state.entities.plants) {
    if (plant.type === "peashooter") {
      plant.fireCooldown -= deltaMs;
      const hasZombieAhead = state.entities.zombies.some(
        (z) => z.row === plant.row && z.x > plant.x - 18
      );
      if (hasZombieAhead && plant.fireCooldown <= 0) {
        plant.fireCooldown = 1400;
        state.entities.projectiles.push({
          id: nextId(),
          row: plant.row,
          x: plant.x + 20,
          y: plant.y,
          vx: 220,
          damage: 20
        });
      }
    }
  }
}

function updateZombies(deltaMs) {
  const zombies = state.entities.zombies;
  for (const zombie of zombies) {
    if (zombie.hp <= 0) {
      continue;
    }

    const target = findBiteTarget(zombie);
    zombie.attacking = Boolean(target);
    if (!target) {
      zombie.x -= zombie.speed * (deltaMs / 1000);
    } else {
      zombie.attackCooldown -= deltaMs;
      if (zombie.attackCooldown <= 0) {
        zombie.attackCooldown = 900;
        target.hp -= 18;
        if (target.hp <= 0) {
          removePlant(target);
        }
      }
    }
  }

  for (const zombie of [...zombies]) {
    if (zombie.hp <= 0) {
      state.score += 25;
      state.entities.zombies = state.entities.zombies.filter((z) => z.id !== zombie.id);
      continue;
    }
    if (zombie.x < -26) {
      state.lives -= 1;
      state.entities.zombies = state.entities.zombies.filter((z) => z.id !== zombie.id);
      setStatus("A zombie reached your house!", true);
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
    setStatus("You survived 180 seconds. Victory!");
  } else {
    setStatus("Game over. Zombies took over your house.", true);
  }
}

function gameLoop(nowMs) {
  if (!state) {
    return;
  }

  const deltaMs = Math.min(80, nowMs - state.lastFrame);
  state.lastFrame = nowMs;

  if (!state.gameOver) {
    spawnZombie(nowMs);
    spawnSkySun(nowMs);
    spawnPlantSunflowers(deltaMs);
    updatePlants(deltaMs);
    updateProjectiles(deltaMs);
    updateZombies(deltaMs);
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

function renderPlants() {
  const html = state.entities.plants
    .map((plant) => {
      const hpPct = Math.max(0, Math.round((plant.hp / plant.maxHp) * 100));
      const x = toScreenX(plant.x);
      const y = toScreenY(plant.y);
      return `
        <div class="plant ${plant.type}" style="left:${x}px; top:${y}px;">
          ${PLANTS[plant.type].label}
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
      const x = toScreenX(zombie.x);
      const y = toScreenY(zombie.y);
      const hpPct = Math.max(0, Math.round((zombie.hp / zombie.maxHp) * 100));
      const cls = zombie.attacking ? "zombie attack" : "zombie";
      return `
        <div class="${cls}" style="left:${x}px; top:${y}px;">
          Zombie
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
      return `<div class="pea" style="left:${x}px; top:${y}px;"></div>`;
    })
    .join("");
  projectileLayer.innerHTML = html;
}

function renderSuns() {
  const html = state.entities.suns
    .map((sun) => {
      const x = toScreenX(sun.x);
      const y = toScreenY(sun.y);
      return `<button class="sun" data-id="${sun.id}" style="left:${x}px; top:${y}px;">+${sun.value}</button>`;
    })
    .join("");
  sunLayer.innerHTML = html;
}

function render() {
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
  if (state.gameOver) {
    return;
  }
  if (!state.selectedPlant) {
    setStatus("Please choose a plant card first.", true);
    return;
  }
  const type = state.selectedPlant;
  const config = PLANTS[type];
  const key = keyOf(row, col);
  if (state.plantIndex.has(key)) {
    setStatus("This tile already has a plant.", true);
    return;
  }
  if (state.sun < config.cost) {
    setStatus("Not enough sun to place this plant.", true);
    return;
  }

  state.sun -= config.cost;
  const plant = {
    id: nextId(),
    type,
    row,
    col,
    x: colCenter(col),
    y: rowCenter(row),
    hp: config.hp,
    maxHp: config.hp,
    fireCooldown: 1200,
    sunCooldown: 7000 + Math.random() * 1800
  };
  state.entities.plants.push(plant);
  state.plantIndex.set(key, plant);
  setStatus(`${config.label} planted.`);
}

function collectSunById(id) {
  const target = state.entities.suns.find((sun) => sun.id === id);
  if (!target || state.gameOver) {
    return;
  }
  state.sun += target.value;
  state.entities.suns = state.entities.suns.filter((sun) => sun.id !== id);
}

function bindEvents() {
  document.querySelector(".shop").addEventListener("click", (event) => {
    const btn = event.target.closest(".card[data-plant]");
    if (!btn) {
      return;
    }
    const plantType = btn.dataset.plant;
    state.selectedPlant = state.selectedPlant === plantType ? null : plantType;
    if (state.selectedPlant) {
      setStatus(`Selected ${PLANTS[state.selectedPlant].label}. Click a tile to place.`);
    } else {
      setStatus("Selection cleared.");
    }
    refreshCardStates();
  });

  clearBtn.addEventListener("click", () => {
    state.selectedPlant = null;
    setStatus("Selection cleared.");
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

  sunLayer.addEventListener("click", (event) => {
    const sun = event.target.closest(".sun");
    if (!sun) {
      return;
    }
    collectSunById(Number(sun.dataset.id));
    updateHud();
    refreshCardStates();
    renderSuns();
  });

  restartBtn.addEventListener("click", () => {
    startGame();
  });

  window.addEventListener("resize", () => {
    createTiles();
    render();
  });
}

function startGame() {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  state = createInitialState();
  createTiles();
  updateHud();
  refreshCardStates();
  render();
  setStatus("Choose a plant card, then click a tile to place it.");
  rafId = requestAnimationFrame(gameLoop);
}

bindEvents();
startGame();
