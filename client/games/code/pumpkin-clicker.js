/* Pumpkin Clicker. Canvas-only p5 game; hard-edged Pumpkin Smasher style. */

const saveKey = "pumpkin-clicker-save-v1";
const dailyKey = "pumpkin-clicker-daily-v1";

const orange = "#ffa500";
const black = "#10180b";
const backgroundColor = "#123904";
const white = "#f6f2dd";

const generators = [
  {
    id: "green",
    name: "Green Pumpkin",
    cost: 10,
    rate: 0.2,
    growth: 1.4,
    path: "/assets/pumpkins/new_pumpkin.png"
  },
  {
    id: "regular",
    name: "Pumpkin",
    cost: 60,
    rate: 1,
    growth: 1.45,
    path: "/assets/pumpkins/pumpkin.png"
  },
  {
    id: "gold",
    name: "Gold Pumpkin",
    cost: 500,
    rate: 5,
    growth: 1.5,
    path: "/assets/pumpkins/gold_pumpkin.png"
  },
  {
    id: "diamond",
    name: "Diamond Pumpkin",
    cost: 2200,
    rate: 24,
    growth: 1.6,
    path: "/assets/pumpkins/diamond_pumpkin.png"
  }
];

const workers = [
  {
    id: "monster",
    name: "Monster",
    cost: 100,
    desc: "+0.10/sec per gen",
    path: "/assets/entities/monster/attack.png",
    frames: 8,
    fps: 12
  },
  {
    id: "ghost",
    name: "Ghost",
    cost: 400,
    desc: "+5% all production",
    path: "/assets/entities/ghost/attack.png",
    frames: 8,
    fps: 12
  },
  {
    id: "speeder",
    name: "Speeder",
    cost: 700,
    desc: "+10% all production",
    path: "/assets/entities/speeder/attack.png",
    frames: 8,
    fps: 16
  },
  {
    id: "rusher",
    name: "Rusher",
    cost: 1200,
    desc: "Burst every 10 seconds",
    path: "/assets/entities/rusher/idle.png",
    frames: 14,
    fps: 12
  },
  {
    id: "brute",
    name: "Brute",
    cost: 1800,
    desc: "+0.55/sec per gen",
    path: "/assets/entities/brute/attack.png",
    frames: 8,
    fps: 12
  },
  {
    id: "wizard",
    name: "Wizard",
    cost: 3400,
    desc: "+18% all production",
    path: "/assets/entities/wizard/idle.png",
    frames: 14,
    fps: 12
  },
  {
    id: "debuffer",
    name: "Debuffer",
    cost: 6400,
    desc: "+8% worker bonuses",
    path: "/assets/entities/debuffer/idle.png",
    frames: 14,
    fps: 12
  }
];

const buildings = [
  {
    id: "g0",
    name: "Green Pumpkin",
    cost: 10,
    desc: "0.20 pumpkins/sec",
    kind: "generator",
    tier: 0
  },
  {
    id: "g1",
    name: "Pumpkin",
    cost: 60,
    desc: "1 pumpkin/sec",
    kind: "generator",
    tier: 1
  },
  {
    id: "g2",
    name: "Gold Pumpkin",
    cost: 500,
    desc: "5 pumpkins/sec",
    kind: "generator",
    tier: 2
  },
  {
    id: "g3",
    name: "Diamond Pumpkin",
    cost: 2200,
    desc: "24 pumpkins/sec",
    kind: "generator",
    tier: 3
  },
  {
    id: "shield",
    name: "Multiplier",
    cost: 180,
    desc: "Boosts directly adjacent generators",
    kind: "multiplier"
  },
  {
    id: "vault",
    name: "Vault",
    cost: 60,
    desc: "50 base storage; scales per level",
    kind: "vault"
  }
];

const candies = [
  {
    id: "candy_corn",
    name: "Candy Corn",
    path: "/assets/candies/candy-corn.png",
    desc: "3× generator production",
    production: 3
  },
  {
    id: "smarties",
    name: "Smarties",
    path: "/assets/candies/smarties.png",
    desc: "Clicks harvest 3 pumpkins",
    click: 3
  },
  {
    id: "peppermint",
    name: "Peppermint",
    path: "/assets/candies/peppermint.png",
    desc: "Sell pumpkins for 2× cash",
    sell: 2
  },
  {
    id: "lolipop",
    name: "Lollipop",
    path: "/assets/candies/lolipop.png",
    desc: "+50% total production",
    production: 1.5
  },
  {
    id: "hot_tamale",
    name: "Hot Tamale",
    path: "/assets/candies/hot-tamale.png",
    desc: "2× generator production",
    production: 2
  },
  {
    id: "ghost_chew",
    name: "Ghost Chew",
    path: "/assets/candies/ghost-chew.png",
    desc: "+50% pumpkin storage",
    capacity: 1.5
  },
  {
    id: "chocolate",
    name: "Chocolate",
    path: "/assets/candies/chocolate.png",
    desc: "2× click yield",
    clickMultiplier: 2
  },
  {
    id: "candied_apple",
    name: "Candied Apple",
    path: "/assets/candies/candied-apple.png",
    desc: "+25% generator production",
    production: 1.25
  },
  {
    id: "blue_candy",
    name: "Blue Candy",
    path: "/assets/candies/blue-candy.png",
    desc: "Doubles additive worker bonuses",
    workers: 2
  }
];


let images = {};
let game;
let targets = [];
let shopTab = "workers";
let shopScroll = 0;
let gridScroll = 0;
let selectedBuild = null;
let bulkPlaceRemaining = 0;
let shiftHeld = false;
let toastMessage = "";
let toastEnd = 0;
let lastTick = 0;
let saveTicks = 0;
let dailyClaimed = false;
let backgroundSpecks = [];
let candyOpening = null;
let candyQueue = [];
let candyConfetti = [];
let lastConfettiTime = 0;
let clickBuyMode = 1;

let hoverId = "";
let hoverSince = 0;
let hoverTarget = null;
let pumpkinScale = 1;
let pumpkinPressedAt = -10000;
let lastActivity = Date.now();

function newGameState(prestige = 0) {
  return {
    cash: 25,
    pumpkins: 0,
    baseStored: 0,
    globalVaultLevel: 0,
    storageVersion: 2,
    vinesSeeded: false,
    vinesCleared: 0,
    prestige,
    totalClicks: 0,
    totalSold: 0,
    totalHarvested: 0,
    totalWorkers: 0,
    candyPurchases: 0,
    autoSell: false,
    autoSellPurchased: false,
    autoSellProgressMs: 0,
    progress: 0,
    activeCandies: [],
    clickUpgrades: { power: 0, bonus: 0, cash: 0 },
    workers: {
      monster: 0,
      ghost: 0,
      speeder: 0,
      rusher: 0,
      brute: 0,
      wizard: 0,
      debuffer: 0
    },
    farmCols: 6 + prestige,
    farmRows: 4 + prestige,
    farm: [],
    lastSavedAt: Date.now()
  };
}

function preload(){
 generators.forEach(g=>images[g.id]=loadImage(g.path,()=>{},()=>{}));
 workers.forEach(w=>images[w.id]=loadImage(w.path,()=>{},()=>{}));
 candies.forEach(v=>images[v.id]=loadImage(v.path,()=>{},()=>{}));
 images.candyBag=loadImage("/assets/candies/trick-or-treat.png",()=>{},()=>{});
 images.generatorPot=loadImage("/assets/abilities/generator/generator.png",()=>{},()=>{});
 images.multiplier=loadImage("/assets/abilities/shield/shield.png",()=>{},()=>{});
 images.objective=loadImage("/assets/pumpkins/objective.png",()=>{},()=>{});
 images.vinesIcon=loadImage("/assets/abilities/vines/icon.png",()=>{},()=>{});
}
function setup() {
  createCanvas(500, 500);
  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  textFont("Arial");

  resizeCanvasToContainer();

  for (let i = 0; i < 80; i++) {
    backgroundSpecks.push({
      x: random(0, 1400),
      y: random(0, 1000),
      s: random(1, 3),
      a: random(14, 43)
    });
  }

  loadGame();
  applyOfflineProgress();
  lastTick = millis();
  lastActivity = Date.now();

  window.addEventListener("beforeunload", saveGame);
  window.addEventListener("pagehide", saveGame);
  window.addEventListener("pointermove", markActivity, { passive: true });
  window.addEventListener("pointerdown", markActivity, { passive: true });
  window.addEventListener("keydown", markActivity);
  window.addEventListener("touchstart", markActivity, { passive: true });
  window.addEventListener("resize", resizeCanvasToContainer);
}

function resizeCanvasToContainer() {
  const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
  const canvas = document.querySelector("canvas");

  if (canvas) {
    canvas.style.width = side + "px";
    canvas.style.height = side + "px";
    canvas.style.imageRendering = "pixelated";
  }
}

function windowResized() {
  resizeCanvasToContainer();
  shopScroll = 0;
}

function loadGame() {
  let savedGame = null;

  try {
    savedGame = JSON.parse(localStorage.getItem(saveKey) || "null");
  } catch (e) {}

  if (savedGame && Array.isArray(savedGame.farm)) {
    const defaults = newGameState(+savedGame.prestige || 0);
    game = Object.assign(defaults, savedGame);
    game.workers = Object.assign(defaults.workers, savedGame.workers || {});
    game.clickUpgrades = Object.assign(
      { power: 0, bonus: 0, cash: 0 },
      savedGame.clickUpgrades || {}
    );
    game.autoSellPurchased = typeof savedGame.autoSellPurchased === "boolean"
      ? savedGame.autoSellPurchased
      : !!savedGame.autoSell;

    game.farmCols = Math.max(6, +game.farmCols || 6);
    game.farmRows = Math.max(4, +game.farmRows || 4);
    game.farm = game.farm.slice(0, game.farmRows);

    while (game.farm.length < game.farmRows) {
      game.farm.push([]);
    }

    game.farm.forEach(row => {
      while (row.length < game.farmCols) {
        row.push(null);
      }
      row.length = game.farmCols;
    });

    if (!game.vinesSeeded) {
      const hasVines = game.farm.some(row => row.some(building => building && building.kind === "vine"));
      if (!hasVines) {
        seedVines();
      } else {
        game.vinesSeeded = true;
      }
    }

    // JSON duplicates shared generator references, so reconnect large footprints after loading.
    for (let row = 0; row < game.farmRows; row++) {
      for (let col = 0; col < game.farmCols; col++) {
        const building = game.farm[row][col];
        const size = building && building.kind === "generator" ? generatorSize(building) : 1;

        if (size > 1 && building.row === row && building.col === col
          && row + size <= game.farmRows && col + size <= game.farmCols) {
          for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
              game.farm[row + dy][col + dx] = building;
            }
          }
        }
      }
    }
  } else {
    game = newGameState();
    game.farm = Array.from({ length: 4 }, () => Array(6).fill(null));
    seedVines();
  }

  game.globalVaultLevel = Math.max(0, Math.floor(Number(game.globalVaultLevel) || 0));
  game.cash = Math.max(0, +game.cash || 0);
  game.pumpkins = Math.max(0, +game.pumpkins || 0);
  game.progress = Math.max(0, +game.progress || 0);
  game.vinesCleared = Math.max(0, Math.floor(Number(game.vinesCleared) || 0));

  game.activeCandies = Array.isArray(game.activeCandies)
    ? game.activeCandies.filter(candy => candy && candy.expiresAt > Date.now())
    : [];
  game.candyPurchases = Math.max(
    Math.max(0, Math.floor(Number(game.candyPurchases) || 0)),
    game.activeCandies.length
  );

  game.farm.forEach(row => {
    row.forEach(building => {
      if (building && building.kind === "shield") {
        building.kind = "multiplier";
      }
    });
  });
  game.autoSellProgressMs = Math.max(0, Math.min(59999, Number(game.autoSellProgressMs) || 0));

  if (!savedGame || savedGame.storageVersion !== 2 || !Number.isFinite(Number(savedGame.baseStored))) {
    let remaining = Math.max(0, Number(game.pumpkins) || 0);
    game.baseStored = 0;

    const baseTake = Math.min(remaining, baseStorageCapacity());
    game.baseStored = baseTake;
    remaining -= baseTake;

    getVaults().forEach(vault => {
      vault.stored = 0;
      const take = Math.min(remaining, vaultCapacity(vault));
      vault.stored = take;
      remaining -= take;
    });
  } else {
    game.baseStored = Math.max(0, Number(game.baseStored) || 0);
    getVaults().forEach(vault => {
      vault.stored = Math.max(0, Number(vault.stored) || 0);
    });
  }

  game.storageVersion = 2;
  syncStoredPumpkins();

  try {
    dailyClaimed = localStorage.getItem(dailyKey) === todayKey();
  } catch (e) {
    dailyClaimed = false;
  }
}

function seedVines() {
  const cells = [];

  for (let row = 0; row < game.farmRows; row++) {
    for (let col = 0; col < game.farmCols; col++) {
      if (!game.farm[row][col]) cells.push({ row, col });
    }
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const count = Math.min(
    cells.length,
    Math.max(5, Math.round(game.farmRows * game.farmCols * 0.12))
  );

  for (let i = 0; i < count; i++) {
    const { row, col } = cells[i];
    game.farm[row][col] = { kind: "vine", row, col };
  }

  game.vinesSeeded = true;
}

function saveGame() {
  if (!game) return;
  game.lastSavedAt = Date.now();

  try {
    localStorage.setItem(saveKey, JSON.stringify(game));
  } catch (e) {}
}
function todayKey(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
function markActivity() {
  if (typeof document !== "undefined" && document.visibilityState !== "hidden") lastActivity = Date.now();
}
function userIsActive() {
  return typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus();
}
function applyOfflineProgress(){
 const secs=Math.max(0,Math.min(2592000,(Date.now()-(game.lastSavedAt||Date.now()))/1000));if(secs<1)return;
 forEachUniqueBuilding(o=>{if(o.kind==="generator")advanceGenerator(o,generatorRate(o)*secs);});
 syncStoredPumpkins();showToast("Farm grew while you were away");game.lastSavedAt=Date.now();
}
function formatNumber(v){
 v=Number(v)||0;if(Math.abs(v)<1000)return Math.floor(v).toLocaleString("en-US");
 const u=["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
 let i=-1;
 while(Math.abs(v)>=1000&&i<u.length-1){v/=1000;i++;}
 if(Math.abs(v)>=1000)return (v/1000).toExponential(2).replace("e+","e");
 return (Math.abs(v)>=100?v.toFixed(0):Math.abs(v)>=10?v.toFixed(1):v.toFixed(2))+u[i];
}
function forEachUniqueBuilding(callback) {
  const seen = new Set();

  for (let row = 0; row < game.farmRows; row++) {
    for (let col = 0; col < game.farmCols; col++) {
      const building = game.farm[row][col];
      if (!building || seen.has(building)) continue;

      seen.add(building);
      callback(building);
    }
  }
}

function hasCandy(id) {
  return game.activeCandies.some(candy => candy.id === id && candy.expiresAt > Date.now());
}

function candyMultiplier(key) {
  return candies.reduce((multiplier, candy) => {
    return multiplier * (candy[key] && hasCandy(candy.id) ? candy[key] : 1);
  }, 1);
}

function generatorSize(building) {
  if (building && building.hyper) return 5;
  if (building && building.ultra) return 3;
  if (building && building.mega) return 2;
  return 1;
}

function generatorFootprint(building) {
  if (!building) return [];

  const size = generatorSize(building);
  const cells = [];

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      cells.push([building.row + dy, building.col + dx]);
    }
  }

  return cells;
}

function getVaults() {
  const vaults = [];

  forEachUniqueBuilding(building => {
    if (building.kind === "vault") vaults.push(building);
  });

  return vaults.sort((a, b) => (a.row - b.row) || (a.col - b.col));
}

function baseStorageCapacity() {
  const staff = game.workers || {};
  const workerBonus = 1 + (staff.monster || 0) * 0.02 + (staff.brute || 0) * 0.05;
  const level = Math.max(0, Math.floor(Number(game.globalVaultLevel) || 0));
  const base = level < vaultCaps.length ? vaultCaps[level] : vaultCaps[vaultCaps.length - 1] * Math.pow(2, level - (vaultCaps.length - 1));
  return Math.floor(base * workerBonus * candyMultiplier("capacity"));
}

const vaultCaps = [
  50, 125, 250, 500, 1000, 3500, 7500, 15000, 50000, 125000,
  250000, 500000, 1000000, 3500000, 7500000, 15000000,
  50000000, 125000000, 250000000, 500000000
];

const vaultUpgradeCosts = [
  60, 120, 240, 450, 900, 1800, 3500, 7000, 18000, 35000,
  70000, 140000, 280000, 700000, 1400000, 2800000,
  7000000, 17500000, 35000000, 70000000
];

function vaultCapacity(vault) {
  const level = Math.max(0, Math.floor(vault.level || 0));
  const last = vaultCaps[vaultCaps.length - 1];
  const base = level < vaultCaps.length
    ? vaultCaps[level]
    : last * Math.pow(2, level - (vaultCaps.length - 1));

  return Math.ceil(base * candyMultiplier("capacity"));
}

function vaultUpgradeCost(level) {
  level = Math.max(0, Math.floor(level || 0));
  const last = vaultUpgradeCosts[vaultUpgradeCosts.length - 1];
  const cost = level < vaultUpgradeCosts.length
    ? vaultUpgradeCosts[level]
    : last * Math.pow(2, level - (vaultUpgradeCosts.length - 1));

  return Math.ceil(cost);
}

function globalVaultUpgradeCost(level) {
  return Math.ceil(vaultUpgradeCost(level) * 5 * Math.pow(1.05, Math.max(0, level || 0)));
}

function storageCapacity() {
  let capacity = baseStorageCapacity();
  getVaults().forEach(vault => {
    capacity += vaultCapacity(vault);
  });
  return capacity;
}

function availableStorage() {
  let free = Math.max(0, baseStorageCapacity() - (Number(game.baseStored) || 0));

  getVaults().forEach(vault => {
    free += Math.max(0, vaultCapacity(vault) - (Number(vault.stored) || 0));
  });

  return free;
}

function syncStoredPumpkins() {
  game.pumpkins = Math.max(0, Number(game.baseStored) || 0);

  getVaults().forEach(vault => {
    game.pumpkins += Math.max(0, Number(vault.stored) || 0);
  });

  return game.pumpkins;
}

function vaultsForGenerator(building) {
  const cells = generatorFootprint(building);

  return getVaults().filter(vault => {
    return cells.some(([row, col]) => Math.abs(vault.row - row) <= 1 && Math.abs(vault.col - col) <= 1);
  });
}

function generatorDestinations(building) {
  return vaultsForGenerator(building);
}

function depositForGenerator(building, amount) {
  let remaining = Math.max(0, Math.floor(amount));
  const initial = remaining;

  generatorDestinations(building).forEach(vault => {
    if (!remaining) return;

    const available = Math.max(0, Math.floor(vaultCapacity(vault) - (Number(vault.stored) || 0)));
    const stored = Math.min(remaining, available);
    vault.stored = (Number(vault.stored) || 0) + stored;
    remaining -= stored;
  });

  if (remaining > 0) {
    const available = Math.max(0, Math.floor(baseStorageCapacity() - (Number(game.baseStored) || 0)));
    const stored = Math.min(remaining, available);
    game.baseStored = (Number(game.baseStored) || 0) + stored;
    remaining -= stored;
  }

  syncStoredPumpkins();
  return initial - remaining;
}

function depositInStorage(amount) {
  let remaining = Math.max(0, Math.floor(amount));
  const initial = remaining;

  const baseAvailable = Math.max(0, Math.floor(baseStorageCapacity() - (Number(game.baseStored) || 0)));
  const baseStored = Math.min(remaining, baseAvailable);
  game.baseStored = (Number(game.baseStored) || 0) + baseStored;
  remaining -= baseStored;

  getVaults().forEach(vault => {
    if (!remaining) return;

    const available = Math.max(0, Math.floor(vaultCapacity(vault) - (Number(vault.stored) || 0)));
    const stored = Math.min(remaining, available);
    vault.stored = (Number(vault.stored) || 0) + stored;
    remaining -= stored;
  });

  syncStoredPumpkins();
  return initial - remaining;
}

function generatorCanStore(building) {
  const hasVaultSpace = generatorDestinations(building).some(vault => {
    return vaultCapacity(vault) > (Number(vault.stored) || 0);
  });

  return hasVaultSpace || baseStorageCapacity() > (Number(game.baseStored) || 0);
}

function advanceGenerator(building, amount) {
  if (!generatorCanStore(building)) {
    building.clogged = true;
    building.progress = 0;
    return;
  }

  const total = (Number(building.progress) || 0) + Math.max(0, amount);
  const whole = Math.floor(total);

  if (whole > 0) {
    const stored = depositForGenerator(building, whole);
    building.progress = total - whole;

    if (stored < whole) {
      building.clogged = true;
    }
  } else {
    building.progress = total;
  }

  building.clogged = !generatorCanStore(building);
}

function multiplierAdjacencyCount(building) {
  const neighbors = [
    [building.row - 1, building.col],
    [building.row + 1, building.col],
    [building.row, building.col - 1],
    [building.row, building.col + 1]
  ];
  let count = 0;

  neighbors.forEach(([row, col]) => {
    if (row < 0 || col < 0 || row >= game.farmRows || col >= game.farmCols) return;

    const neighbor = game.farm[row] && game.farm[row][col];
    if (neighbor && neighbor !== building && (neighbor.kind === "multiplier" || neighbor.kind === "shield")) {
      count++;
    }
  });

  return count;
}

function shieldMultiplier(building) {
  const adjacentMultipliers = new Set();

  generatorFootprint(building).forEach(([row, col]) => {
    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ];

    neighbors.forEach(([neighborRow, neighborCol]) => {
      if (neighborRow < 0 || neighborCol < 0
        || neighborRow >= game.farmRows || neighborCol >= game.farmCols) {
        return;
      }

      const neighbor = game.farm[neighborRow] && game.farm[neighborRow][neighborCol];
      if (neighbor && (neighbor.kind === "multiplier" || neighbor.kind === "shield")) {
        adjacentMultipliers.add(neighbor);
      }
    });
  });

  let strength = 0;
  adjacentMultipliers.forEach(multiplier => {
    strength += Math.pow(1.6, multiplierAdjacencyCount(multiplier));
  });

  return 1 + 0.28 * strength;
}

function hasVaultBonus(building) {
  return vaultsForGenerator(building).length > 0;
}

function cashMultiplier() {
  return 1 + game.prestige * 0.5;
}

function generatorRate(building) {
  const staff = game.workers;
  const workerBonus = (1 + staff.debuffer * 0.08) * candyMultiplier("workers");
  const globalBonus = (1 + staff.ghost * 0.05 * workerBonus)
    * (1 + staff.speeder * 0.1 * workerBonus)
    * (1 + staff.wizard * 0.18 * workerBonus)
    * (1 + staff.rusher * 0.035 * workerBonus);
  const workerProduction = (staff.monster * 0.1 + staff.brute * 0.55) * workerBonus;

  return (generators[building.tier].rate + workerProduction)
    * shieldMultiplier(building)
    * (hasVaultBonus(building) ? 1.15 : 1)
    * (building.hyper ? 5 : building.ultra ? 3 : building.mega ? 1.5 : 1)
    * globalBonus
    * candyMultiplier("production")
    * (1 + game.prestige * 0.5);
}

function productionRate() {
  let total = 0;

  forEachUniqueBuilding(building => {
    if (building.kind === "generator") {
      total += generatorRate(building);
    }
  });

  return total;
}

function productionRate() {
  let total = 0;

  forEachUniqueBuilding(o => {
    if (o.kind === "generator") total += generatorRate(o);
  });

  return total;
}
function updateGame() {
  const now = millis();
  const dt = Math.max(0, Math.min(0.25, (now - lastTick) / 1000));
  lastTick = now;

  const activeAuto = game.autoSell && userIsActive();

  forEachUniqueBuilding(building => {
    if (building.kind === "generator") {
      advanceGenerator(building, generatorRate(building) * dt);
    }
  });

  if (game.workers.rusher > 0 && frameCount % 600 === 0) {
    depositInStorage(game.workers.rusher * 5);
  }

  if (activeAuto) {
    game.autoSellProgressMs = (Number(game.autoSellProgressMs) || 0) + dt * 1000;

    while (game.autoSellProgressMs >= 60000) {
      game.autoSellProgressMs -= 60000;
      syncStoredPumpkins();

      const sold = Math.floor(game.pumpkins);
      if (sold <= 0) continue;

      game.baseStored = 0;
      getVaults().forEach(vault => vault.stored = 0);
      game.pumpkins = 0;

      const earned = sold * candyMultiplier("sell");
      game.cash += earned;
      game.totalSold += sold;
      showToast("AUTO-SOLD " + formatNumber(sold) + " pumpkins for $" + formatNumber(earned));
    }
  }

  syncStoredPumpkins();

  if (++saveTicks >= 60) {
    saveTicks = 0;
    saveGame();
  }
}

function draw() {
  updateGame();
  targets = [];
  background(backgroundColor);
  noStroke();

  backgroundSpecks.forEach(speck => {
    fill(123, 150, 65, speck.a);
    rect(speck.x % width, speck.y % height, speck.s, speck.s);
  });

  const layout = getLayout();
  drawTopBar(layout);
  drawSidebar(layout);
  drawMainPanel(layout);

  if (toastMessage && millis() < toastEnd) {
    drawToast(layout);
  }
  if (candyOpening) drawCandyReveal();

  finishHover();
}

function getLayout() {
  const W = width;
  const H = height;
  const top = Math.max(68, Math.min(88, H * 0.15));
  const side = Math.max(112, Math.min(205, W * 0.255));
  const mainX = side + 8;
  const mainW = Math.max(120, W - mainX);
  const gridStart = Math.max(top + 146, H * 0.535);
  const gridTop = gridStart + 25;
  const gap = 3;
  const panelInset = 3;
  const gridInnerW = Math.max(1, mainW - panelInset * 2);
  const tile = Math.max(1, Math.min(54,
    Math.floor((gridInnerW - (game.farmCols - 1) * gap) / game.farmCols)
  ));
  const gridW = game.farmCols * tile + (game.farmCols - 1) * gap;
  const gridX = mainX + panelInset + Math.max(0, (gridInnerW - gridW) / 2);
  const content = game.farmRows * (tile + gap) - gap;
  const view = Math.max(0, H - 5 - gridTop);

  gridScroll = constrain(gridScroll, 0, Math.max(0, content - view));

  return {
    W, H, top, side, mainX, mainW, gridStart, gridTop,
    gridBottom: H - 5, tile, gap, gridX, content, view
  };
}
function addTarget(x, y, w, h, fn, modal = false, hover = null) {
  targets.push({
    x, y, w, h, fn, modal, hover,
    id: hover && hover.id ? hover.id : "target:" + targets.length
  });
}
function drawTopBar(L) {
  noStroke();
  fill(black);
  rect(0, 0, L.W, L.top);
  stroke(orange);
  strokeWeight(2);
  line(0, L.top - 1, L.W, L.top - 1);

  const fontSize = Math.max(9, Math.min(14, L.W * 0.031));
  noStroke();
  fill(white);
  textAlign(LEFT, CENTER);
  textSize(fontSize);
  text("PUMPKINS " + formatNumber(game.pumpkins) + "/" + formatNumber(storageCapacity()), 7, L.top * 0.22);
  text("CASH $" + formatNumber(game.cash), 7, L.top * 0.53);

  textAlign(RIGHT, CENTER);
  fill(orange);
  textSize(Math.max(8, fontSize * 0.82));
  text("PRESTIGE " + game.prestige + "  ×" + (1 + game.prestige * 0.5).toFixed(2), L.W - 8, L.top * 0.22);

  fill(white);
  text("FARM " + game.farmCols + "×" + game.farmRows, L.W - 8, L.top * 0.53);

  const activeCandies = game.activeCandies.filter(candy => candy.expiresAt > Date.now());
  let x = 8;
  const y = L.top * 0.84;

  fill("#a9bf94");
  textAlign(LEFT, CENTER);
  textSize(Math.max(7, Math.min(10, fontSize * 0.7)));
  text(activeCandies.length ? "ACTIVE CANDY" : "NO ACTIVE CANDY", x, y);
  x += Math.max(82, fontSize * 5.8);

  activeCandies.slice(0, 5).forEach(active => {
    const candy = candies.find(item => item.id === active.id);
    if (!candy) return;

    const img = images[active.id];
    if (img && img.width) drawSpriteSheet(img, x + 7, y, 14, 1);
    x += 17;

    fill(white);
    textAlign(LEFT, CENTER);
    textSize(Math.max(7, Math.min(9, fontSize * 0.65)));

    const mins = Math.max(0, Math.ceil((active.expiresAt - Date.now()) / 60000));
    const label = candy.name + " " + mins + "m";
    text(label, x, y);

    const labelWidth = textWidth(label);
    addTarget(x - 18, y - 9, labelWidth + 30, 18, () => {}, false, {
      id: "active-candy:" + candy.id,
      title: candy.name,
      kind: "candy",
      summary: candy.desc,
      rules: [
        "Bonus lasts for one hour from activation.",
        "Stacks multiplicatively with other applicable candy bonuses.",
        "Remaining time: " + mins + " minute" + (mins === 1 ? "" : "s") + "."
      ]
    });

    x += labelWidth + 12;
  });

  if (activeCandies.length > 5) {
    fill(orange);
    textAlign(LEFT, CENTER);
    text("+" + (activeCandies.length - 5), x, y);
  }
}
function drawSidebar(L) {
  const x = 4;
  const y = L.top + 4;
  const w = L.side + 4;
  const h = L.H - y - 4;

  fill(black);
  stroke(orange);
  strokeWeight(1.5);
  rect(x, y, w, h);

  const tabs = [["workers", "WORK"], ["build", "BUILD"], ["candy", "MISC"]];
  const th = Math.max(20, Math.min(28, (L.H - L.top) * 0.075));
  const tw = (w - 8) / 3;
  const ty = y + 4;

  tabs.forEach((tab, i) => {
    const tx = x + 4 + i * tw;
    const hovered = mouseX >= tx && mouseX <= tx + tw - 2
      && mouseY >= ty && mouseY <= ty + th;

    fill(shopTab === tab[0]
      ? orange
      : hovered ? (mouseIsPressed ? "#2b2213" : "#3a2b12") : "#17210f");
    stroke(shopTab === tab[0] || hovered ? orange : "#50623f");
    strokeWeight(shopTab === tab[0] || hovered ? 2 : 1);
    rect(tx, ty, tw - 2, th);

    noStroke();
    fill(shopTab === tab[0] ? black : white);
    textAlign(CENTER, CENTER);
    textSize(Math.max(7, Math.min(10, w * 0.075)));
    text(tab[1], tx + (tw - 2) / 2, ty + th / 2);

    addTarget(tx, ty, tw - 2, th, () => {
      shopTab = tab[0];
      shopScroll = 0;
    });
  });

  const listY = ty + th + 5;
  const listHeight = Math.max(0, y + h - listY);
  const items = getShopItems();
  const rowHeight = Math.max(40, Math.min(54, (L.H - L.top) * 0.13));
  const totalHeight = items.length * rowHeight;

  shopScroll = constrain(shopScroll, 0, Math.max(0, totalHeight - listHeight));
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x + 2, listY, w - 4, listHeight);
  drawingContext.clip();

  items.forEach((item, i) => {
    const itemY = listY + i * rowHeight - shopScroll;
    if (itemY + rowHeight > listY && itemY < listY + listHeight) {
      drawShopItem(item, x + 4, itemY, w - 10, rowHeight);
    }
  });

  drawingContext.restore();

  if (totalHeight > listHeight) {
    fill("#35492c");
    noStroke();
    rect(x + w - 4, listY, 2, listHeight);

    fill(orange);
    rect(
      x + w - 4,
      listY + shopScroll / totalHeight * listHeight,
      2,
      Math.max(8, listHeight * listHeight / totalHeight)
    );
  }
}
function getShopItems() {
  if (shopTab === "workers") {
    return workers.map(d => ({ type: "worker", d }));
  }
  if (shopTab === "build") {
    return buildings.map(d => ({ type: "build", d }));
  }

  return [
    { type: "autosell", d: { id: "autosell", name: "Auto-Sell", cost: 650, desc: "Sell stored pumpkins every 60s", kind: "upgrade" } },
    { type: "daily", d: { name: "Daily Candy", desc: "Free one-hour candy" } },
    { type: "buyCandy", d: { name: "Buy Random Candy", desc: "One-hour random bonus" } },
    { type: "sell", d: { name: "Sell Pumpkins", desc: "Trade stored harvest" } },
    { type: "globalVault", d: { id: "global-vault", name: "Global Vault", desc: "Raises default storage cap", kind: "globalVault" } },
    { type: "delete", d: { name: "Delete / Sell", desc: "Clear tile • 25% refund" } },
    { type: "info", d: { name: "Farm Guide", desc: "Build → click an empty tile" } }
  ];
}
function drawShopItem(item, x, y, w, h) {
  const d = item.d;
  const isBuildItem = item.type === "build" || item.type === "autosell";
  const selected = (
    isBuildItem && d.kind !== "upgrade" && selectedBuild === d.id
  ) || (item.type === "delete" && selectedBuild === "__sell");

  const hovered = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  let itemCost = 0;
  let hasCost = false;

  if (item.type === "worker") {
    itemCost = workerCost(d.id);
    hasCost = true;
  } else if (item.type === "build" && d.kind !== "upgrade") {
    itemCost = buildCost(d);
    hasCost = true;
  } else if (item.type === "autosell" || (item.type === "build" && d.kind === "upgrade" && !game.autoSellPurchased)) {
    itemCost = 650;
    hasCost = true;
  } else if (item.type === "buyCandy") {
    itemCost = candyPrice();
    hasCost = true;
  } else if (item.type === "globalVault") {
    itemCost = globalVaultUpgradeCost(game.globalVaultLevel);
    hasCost = true;
  }

  const unaffordable = hovered && hasCost
    && (!Number.isFinite(itemCost) || game.cash < itemCost);
  const shopHover = hovered && !unaffordable;

  fill(unaffordable ? "#451b16" : shopHover ? "#3a2b12" : selected ? "#263d16" : "#172414");

  // Keep the orange hover border; no glow.
  // if (shopHover) {
  //   drawingContext.shadowColor = "rgba(255,165,0,0.95)";
  //   drawingContext.shadowBlur = 8;
  // }

  stroke(unaffordable ? "#ff3030" : shopHover || selected ? orange : "#50623f");
  strokeWeight(unaffordable ? 2.5 : shopHover || selected ? 2 : 1);
  rect(x, y + 1, w, h - 3);
  drawingContext.shadowBlur = 0;
  drawingContext.shadowColor = "transparent";

  const size = Math.min(34, h * 0.62);
  const iconX = x + size / 2 + 4;
  const iconY = y + size / 2 + 5;

  if (item.type === "worker") {
    drawSprite(d.id, iconX, iconY, size, d.frames, d.fps);
  } else if (isBuildItem && d.kind === "generator") {
    drawGrowingGenerator(d.tier, iconX + size * 0.06, iconY + size * 0.08, size * 1.18, false, true);
  } else if (isBuildItem && d.kind === "multiplier") {
    const img = images.multiplier;
    if (img && img.width) {
      drawSpriteSheet(img, iconX, iconY, size, 3, Math.floor(frameCount / 7) % 3);
    } else {
      drawShieldFallback(iconX, iconY, size);
    }
  } else if (isBuildItem && d.kind === "vault") {
    const pumpkin = images.objective || images.regular;
    if (pumpkin && pumpkin.width) {
      drawSpriteSheet(pumpkin, iconX, iconY, size, 1);
    } else {
      drawGeneratorSprite(1, iconX, iconY, size);
    }
  } else if (item.type === "delete") {
    drawTrashIcon(iconX, iconY, size);
  } else if (item.type === "daily" || item.type === "buyCandy") {
    const img = images.candyBag;
    if (img && img.width) {
      drawSpriteSheet(img, iconX, iconY, size, 1);
    } else {
      noStroke();
      fill(orange);
      rect(iconX - 5, iconY - 8, 10, 16);
    }
  } else {
    noStroke();
    fill(orange);
    textAlign(CENTER, CENTER);
    textSize(Math.max(11, size * 0.75));
    text(isBuildItem
      ? d.kind === "shield" ? "S" : d.kind === "vault" ? "V" : "$"
      : item.type === "sell" ? "$" : item.type === "globalVault" ? "G" : "i", iconX, iconY);
  }

  const textX = x + size + 12;
  const textW = Math.max(26, w - size - 22 - w * 0.28);

  noStroke();
  fill(white);
  textAlign(LEFT, TOP);
  textSize(Math.max(8, Math.min(11, w * 0.082)));
  text(d.name, textX, y + 4, textW, h * 0.40);

  fill("#bdc9a9");
  textSize(Math.max(7, Math.min(9, w * 0.073)));

  let subtitle = d.desc;
  if (item.type === "worker") {
    subtitle = d.desc;
  } else if (isBuildItem && d.kind === "upgrade") {
    if (!game.autoSellPurchased) {
      subtitle = "BUY AUTO-SELL";
    } else if (!game.autoSell) {
      subtitle = "OWNED • OFF";
    } else {
      subtitle = userIsActive()
        ? "SELL IN " + Math.ceil((60000 - (Number(game.autoSellProgressMs) || 0)) / 1000) + "s"
        : "AUTO-SELL PAUSED";
    }
  } else if (item.type === "delete" && selected) {
    subtitle = "SELECT A TILE";
  } else if (isBuildItem && selected) {
    subtitle = "SELECTED";
  } else if (item.type === "daily") {
    subtitle = dailyClaimed ? "CLAIMED TODAY" : "READY TO OPEN";
  } else if (item.type === "buyCandy") {
    subtitle = "ONE-HOUR RANDOM BONUS";
  } else if (item.type === "globalVault") {
    subtitle = "LVL " + (game.globalVaultLevel + 1) + " • " + formatNumber(baseStorageCapacity()) + " CAP";
  }

  if (item.type === "globalVault") textSize(Math.max(6, Math.min(8, w * 0.065)));
  text(subtitle, textX, y + h * 0.43, textW, h * 0.29);

  if (item.type === "globalVault") {
    const capacity = baseStorageCapacity();
    const stored = Math.min(capacity, Math.max(0, Number(game.baseStored) || 0));
    const progress = capacity > 0 ? stored / capacity : 0;
    const barX = x + 4;
    const barY = y + h - 5;
    const barW = w - 8;

    noStroke();
    fill("#263b1b");
    rect(barX, barY, barW, 2);
    fill(orange);
    rect(barX, barY, barW * progress, 2);
  }

  if (item.type === "autosell" && game.autoSellPurchased && game.autoSell) {
    const progress = constrain((Number(game.autoSellProgressMs) || 0) / 60000, 0, 1);
    const barX = x + 4;
    const barY = y + h - 5;
    const barW = w - 8;

    noStroke();
    fill("#263b1b");
    rect(barX, barY, barW, 2);
    fill(orange);
    rect(barX, barY, barW * progress, 2);
  }

  if (item.type === "worker") {
    fill("#8fa27a");
    textSize(Math.max(6, Math.min(8, w * 0.065)));
    text("OWNED " + (game.workers[d.id] || 0), textX, y + h * 0.77);
  }

  textAlign(RIGHT, CENTER);
  fill(orange);
  textSize(Math.max(8, Math.min(11, w * 0.09)));

  if (item.type === "worker") {
    text("$" + formatNumber(workerCost(d.id)), x + w - 5, y + h * 0.5);
  } else if (isBuildItem) {
    text(d.kind === "upgrade"
      ? game.autoSellPurchased ? (game.autoSell ? "ON" : "OFF") : "$" + formatNumber(d.cost)
      : "$" + formatNumber(buildCost(d)), x + w - 5, y + h * 0.5);
  } else if (item.type === "daily") {
    text(dailyClaimed ? "DONE" : "OPEN", x + w - 5, y + h * 0.5);
  } else if (item.type === "buyCandy") {
    text("$" + candyPriceLabel(), x + w - 5, y + h * 0.5);
  } else if (item.type === "globalVault") {
    text("$" + formatNumber(globalVaultUpgradeCost(game.globalVaultLevel)), x + w - 5, y + h * 0.5);
  } else if (item.type === "sell") {
    text("$" + formatNumber(Math.floor(game.pumpkins)), x + w - 5, y + h * 0.5);
  }

  if (item.type === "worker") {
    addTarget(x, y, w, h, () => buyWorker(d.id, purchaseLimit()), false, getItemHoverInfo(item));
  }

  if (isBuildItem) {
    addTarget(x, y, w, h, () => {
      if (d.kind === "upgrade") {
        toggleAutoSell();
        return;
      }

      if (d.kind === "generator" || d.kind === "multiplier" || d.kind === "vault") {
        const cost = buildCost(d);
        if (game.cash < cost) {
          selectedBuild = null;
          bulkPlaceRemaining = 0;
          showToast(d.name + " costs $" + formatNumber(cost));
          return;
        }
      }

      const next = selectedBuild === d.id ? null : d.id;
      if (!next) {
        selectedBuild = null;
        bulkPlaceRemaining = 0;
        showToast("Build selection cleared");
        return;
      }

      selectedBuild = next;

      if (d.kind === "generator" || d.kind === "multiplier" || d.kind === "vault") {
        const limit = purchaseLimit();

        if (limit > 1) {
          const cost = buildCost(d);
          if (game.cash < cost) {
            showToast(d.name + " costs $" + formatNumber(cost));
            selectedBuild = null;
            bulkPlaceRemaining = 0;
            return;
          }

          bulkPlaceRemaining = limit;
          showToast("Bulk placement armed for " + d.name + " — "
            + (limit === Infinity ? "place as many as you can afford" : "up to " + limit + " empty farm tiles"));
        } else {
          bulkPlaceRemaining = 0;
          showToast("Click an empty farm tile");
        }
      } else {
        bulkPlaceRemaining = 0;
        showToast("Click an empty farm tile");
      }
    }, false, getItemHoverInfo(item));
  }

  if (item.type === "globalVault") {
    addTarget(x, y, w, h, () => {
      let bought = 0;
      const limit = purchaseLimit();
      while (bought < limit) {
        const cost = globalVaultUpgradeCost(game.globalVaultLevel);
        if (game.cash < cost) break;
        game.cash -= cost;
        game.globalVaultLevel++;
        bought++;
      }
      if (!bought) {
        showToast("Global Vault upgrade costs $" + formatNumber(globalVaultUpgradeCost(game.globalVaultLevel)));
        return;
      }
      syncStoredPumpkins();
      showToast("Global Vault upgraded: " + formatNumber(baseStorageCapacity()) + " base capacity");
      saveGame();
    }, false, {
      id: "global-vault",
      title: "Global Vault",
      kind: "build",
      summary: "Increases default storage for generators outside normal Vault zones.",
      rules: ["Level " + (game.globalVaultLevel + 1) + " • " + formatNumber(baseStorageCapacity()) + " total capacity.", "Currently storing " + formatNumber(game.baseStored || 0) + " / " + formatNumber(baseStorageCapacity()) + " pumpkins.", "Raises the default 50 storage cap.", "Unpaired generators deposit into this shared storage.", "Costs 5× as much as a normal Vault upgrade, with an additional 5% compounding cost increase per level.", "Monster, Brute and Ghost Chew bonuses still apply."]
    });
  }

  if (item.type === "daily") {
    addTarget(x, y, w, h, claimDailyCandy, false, {
      id: "daily-candy",
      title: "Daily Candy",
      kind: "candy",
      summary: "Claim a free random candy once each local day.",
      rules: [
        "Opens with a shake and pop animation.",
        "Also grants a cash reward and up to 10 pumpkins.",
        "The candy bonus lasts one hour.",
        "A new claim is available after the local date changes."
      ]
    });
  }

  if (item.type === "buyCandy") {
    addTarget(x, y, w, h, () => buyCandy(purchaseLimit()), false, {
      id: "buy-candy",
      title: "Buy Random Candy",
      kind: "candy",
      summary: "Spend $" + candyPriceLabel() + " for a random one-hour bonus.",
      rules: [
        "Uses the global ×1, ×10 or MAX purchase mode; Shift-click forces ×10. Purchases stop when cash runs out or the next candy is unaffordable.",
        "Each candy has its own reveal; press Continue to advance through the queue.",
        "Multiple different candies can be active at once.",
        "Duplicate candy refreshes that candy’s timer."
      ]
    });
  }

  if (item.type === "sell") {
    addTarget(x, y, w, h, sellPumpkins);
  }

  if (item.type === "delete") {
    addTarget(x, y, w, h, () => {
      selectedBuild = selectedBuild === "__sell" ? null : "__sell";
      showToast(selectedBuild === "__sell"
        ? "Click a farm tile to delete it for a 25% refund"
        : "Delete / Sell cancelled");
    }, false, {
      id: "delete-tool",
      title: "Delete / Sell",
      kind: "action",
      summary: "Clear a building and recover 25% of its value.",
      rules: [
        "Select this tool, then click a placed building.",
        "The building is removed and 25% of its value is refunded.",
        "Vault contents must fit in other storage before deleting the vault.",
        "Vines cost $" + formatNumber(vineClearCost()) + " to remove and do not give a refund; each removal makes the next one 10× more expensive."
      ]
    });
  }

  if (item.type === "info") {
    addTarget(x, y, w, h, () => {
      showToast("Click BUILD, choose a building, then click an empty tile.");
    });
  }
}
function drawMainPanel(L) {
  const x = L.mainX;
  const w = L.mainW;
  const upgradeW = Math.min(110, Math.max(64, w * 0.30));
  const leftW = Math.max(70, w - upgradeW - 12);
  const pumpkinX = x + 4 + leftW / 2;
  const pumpkinY = L.top + Math.max(44, (L.gridStart - L.top) * 0.42);
  const size = Math.min(leftW * 0.70, (L.gridStart - L.top) * 0.54, 118);

  fill("#0d190b");
  noStroke();
  rect(x + 3, L.top + 3, w - 6, L.gridStart - L.top - 4);
  stroke(orange);
  strokeWeight(1.5);
  noFill();
  rect(x + 3, L.top + 3, w - 6, L.gridStart - L.top - 4);

  const hovered = mouseX >= pumpkinX - size * 0.65 && mouseX <= pumpkinX + size * 0.65
    && mouseY >= pumpkinY - size * 0.65 && mouseY <= pumpkinY + size * 0.65;
  pumpkinScale += ((hovered ? 1.075 : 1) - pumpkinScale) * 0.24;

  const pressAge = millis() - pumpkinPressedAt;
  const press = pressAge < 430 ? Math.exp(-pressAge / 105) * Math.cos(pressAge / 34) : 0;

  push();
  translate(pumpkinX, pumpkinY);
  scale(pumpkinScale - 0.13 * press, pumpkinScale - 0.08 * press);

  const img = images.regular;
  if (img?.width) {
    drawSpriteSheet(img, 0, 0, size, 1);
  } else {
    noStroke();
    fill("#ed8d20");
    ellipse(0, 0, size * 0.78, size * 0.82);
    fill("#bd5c11");
    ellipse(-size * 0.18, 0, size * 0.23, size * 0.8);
    ellipse(size * 0.18, 0, size * 0.23, size * 0.8);
    fill("#4d7b20");
    rect(-size * 0.05, -size * 0.52, size * 0.1, size * 0.22);
  }
  pop();

  textAlign(CENTER, CENTER);
  noStroke();
  fill(white);

  const harvestText = "PUMPKIN HARVEST";
  const harvestY = pumpkinY - size * 0.58;
  const harvestSize = Math.max(12, Math.min(18, w * 0.055));

  textSize(harvestSize);
  text(harvestText, pumpkinX, harvestY);

  const harvestW = textWidth(harvestText);
  fill("#b8caa4");
  textSize(Math.max(9, Math.min(12, w * 0.038)));
  text("CLICK TO COLLECT", pumpkinX, pumpkinY + size * 0.70);

  addTarget(pumpkinX - harvestW / 2 - 3, harvestY - 10, harvestW + 6, 20, () => {}, false, {
    id: "main-pumpkin-label",
    title: "Pumpkin Harvest",
    kind: "button",
    summary: "Click the pumpkin to harvest.",
    rules: [
      "Click upgrades are arranged around the pumpkin.",
      "Pumpkins collect in storage until it fills.",
      "Sell stored pumpkins for cash.",
      "Active candy may improve clicks or cash rewards."
    ]
  });
  addTarget(pumpkinX - size * 0.55, pumpkinY - size * 0.55, size * 1.1, size * 1.1, clickPumpkin);

  drawClickUpgrades(L, x, w);

  const buttonY = L.gridStart - 29;
  const buttonInset = 6;
  const buttonGap = 3;
  const buttonW = Math.max(1, (w - buttonInset * 2 - buttonGap) / 2);
  const sellX = x + buttonInset;
  const prestigeX = sellX + buttonW + buttonGap;
  const sellHovered = mouseX >= sellX && mouseX <= sellX + buttonW
    && mouseY >= buttonY && mouseY <= buttonY + 23;
  const sellColor = mouseIsPressed && sellHovered ? "#8f5300" : sellHovered ? "#d18400" : orange;

  drawButton(sellX, buttonY, buttonW, 23, "SELL HARVEST", sellColor, black);
  addTarget(sellX, buttonY, buttonW, 23, sellPumpkins);

  const cost = prestigeCost();
  const ready = game.cash >= cost;
  const prestigeHovered = mouseX >= prestigeX && mouseX <= prestigeX + buttonW
    && mouseY >= buttonY && mouseY <= buttonY + 23;
  const prestigeColor = !ready ? "#4a553e"
    : mouseIsPressed && prestigeHovered ? "#8f5300"
      : prestigeHovered ? "#d18400" : orange;
  const prestigeBorder = ready ? orange : "#707a68";

  drawButton(prestigeX, buttonY, buttonW, 23, "PRESTIGE $" + formatNumber(cost),
    prestigeColor, ready ? black : "#9aa38e", prestigeBorder);
  addTarget(prestigeX, buttonY, buttonW, 23, performPrestige);

  fill("#0d190b");
  noStroke();
  rect(x + 3, L.gridStart + 2, w - 6, L.H - L.gridStart - 5);
  stroke(orange);
  strokeWeight(1);
  noFill();
  rect(x + 3, L.gridStart + 2, w - 6, L.H - L.gridStart - 5);

  noStroke();
  fill(orange);
  textAlign(LEFT, CENTER);
  textSize(Math.max(9, Math.min(12, w * 0.038)));
  text("FARM GRID • CLICK TO PLACE", x + 5, L.gridStart + 12);

  if (selectedBuild) {
    const building = buildings.find(item => item.id === selectedBuild);
    fill(white);
    textAlign(RIGHT, CENTER);
    textSize(Math.max(8, Math.min(10, w * 0.032)));
    text(selectedBuild === "__sell" ? "DELETE / SELL" : building ? building.name : "", x + w - 4, L.gridStart + 12);
  }

  drawFarmGrid(L);
}
function clickPumpkinYield(){
  const u=game.clickUpgrades||{power:0,bonus:0,cash:0},power=Math.max(0,Math.floor(Number(u.power)||0)),bonus=Math.max(0,Math.floor(Number(u.bonus)||0));
  return Math.max(1,Math.ceil((1+Math.pow(power,1.35))*Math.pow(1.08,bonus)*candyMultiplier("click")));
  }
function clickCashBonus(){
  const level=Math.max(0,Math.floor(Number((game.clickUpgrades||{}).cash)||0));
  return Math.max(0,Math.floor(Math.pow(level,1.25)));
  }
function clickUpgradeCost(id){
  const u=game.clickUpgrades||{power:0,bonus:0,cash:0},level=u[id]||0;
  return Math.ceil(({power:20,bonus:60,cash:30}[id]||30)*Math.pow(({power:1.10,bonus:1.12,cash:1.10}[id]||1.10),level));
  }
function buyClickUpgrade(id,quantity=1){
  const data={power:{name:"Click Power"},bonus:{name:"Click Boost"},cash:{name:"Click Cash"}}[id];
  if(!data)return;
  let level=Math.max(0,Math.floor(Number(game.clickUpgrades[id])||0)),bought=0,lastCost=0;
  const limit=quantity==="MAX"||quantity===Infinity?Infinity:Math.max(1,Math.floor(Number(quantity)||1));
  while(bought<limit){const cost=clickUpgradeCost(id);
    if(!Number.isFinite(cost)||game.cash<cost){lastCost=cost;
      break;
      }game.cash-=cost;
    level++;
    bought++;
    game.clickUpgrades[id]=level;
    }if(!bought){showToast(data.name+" costs $"+formatNumber(Number.isFinite(lastCost)?lastCost:clickUpgradeCost(id)));
    return;
    }showToast(bought>1?data.name+" bought "+bought+" levels (Lv. "+level+")":data.name+" upgraded to Lv. "+level);
  saveGame();
  }
function drawClickUpgrades(L,panelX,panelW){
 const bw=Math.min(108,Math.max(58,panelW*.30)),x=panelX+panelW-bw-6,top=L.top+25,gap=6,avail=L.gridStart-top-8,bh=Math.max(25,Math.min(38,(avail-gap*2)/3));
 const effectiveClickBuyMode=isShiftClick()?10:clickBuyMode,modeLabel=effectiveClickBuyMode==="MAX"?"BUY MAX":"BUY ×"+effectiveClickBuyMode,modeY=L.top+8,modeH=15;
 drawButton(x,modeY,bw,modeH,modeLabel,orange,black);
 addTarget(x,modeY,bw,modeH,()=>{const modes=[1,10,"MAX"],at=modes.indexOf(clickBuyMode);
   clickBuyMode=modes[(at+1)%modes.length];
   bulkPlaceRemaining=0;
   showToast("Global purchase mode: "+(clickBuyMode==="MAX"?"MAX":"×"+clickBuyMode));
   },false,{id:"click-upgrade-buy-mode",title:"Global purchase mode",kind:"setting",summary:"Choose the quantity for purchases and bulk farm placements across the menu.",rules:["Click to cycle through ×1, ×10 and MAX.","This global mode applies to click upgrades, workers, candy purchases, generator/vault upgrades, and bulk farm placements.","Shift-click forces ×10 for that action. Purchases stop when you cannot afford the next item."]});
 const positions=["power","bonus","cash"].map((id,i)=>({id,x,y:top+i*(bh+gap)}));
 const names={power:"CLICK +1",bonus:"CLICK BOOST",cash:"CLICK CASH"};
 positions.forEach(p=>{const level=Math.max(0,Math.floor(Number(game.clickUpgrades[p.id])||0)),cost=clickUpgradeCost(p.id),hover=mouseX>=p.x&&mouseX<=p.x+bw&&mouseY>=p.y&&mouseY<=p.y+bh;
   fill(hover&&game.cash<cost?"#451b16":hover?"#3d3518":"#172414");
   stroke(hover&&game.cash<cost?"#ff3030":orange);
   strokeWeight(hover?2:1);
   rect(p.x,p.y,bw,bh);
   noStroke();
   fill(white);
   textAlign(CENTER,CENTER);
   textSize(Math.max(7,Math.min(9,bw*.105)));
   text(names[p.id],p.x+bw/2,p.y+bh*.32);
   fill(orange);
   textSize(Math.max(7,Math.min(9,bw*.105)));
   text("Lv."+level+"  $"+formatNumber(cost),p.x+bw/2,p.y+bh*.72);
   const rules={power:["Click yield scales as 1 + level^1.35; growth is slower than before.","Each level increases the pumpkins harvested per manual click."],bonus:["Each level multiplies click yield by another 1.08×.","Stacks with Click Power and active click candies. No level cap."],cash:["Cash bonus per click scales as level^1.25.","Applies to manual clicks both with normal harvesting and while Auto-Sell is active. No level cap."]};
   addTarget(p.x,p.y,bw,bh,()=>buyClickUpgrade(p.id,purchaseLimit()),false,{id:"click-upgrade:"+p.id,title:names[p.id],kind:"upgrade",summary:"Next upgrade costs $"+formatNumber(cost)+".",rules:[...rules[p.id],"Purchase mode: "+(clickBuyMode==="MAX"?"MAX":"×"+clickBuyMode)+".","Shift-click forces a ×10 purchase, regardless of the global mode."]});
   });
}
function drawButton(x,y,w,h,label,col,tc,border=orange){
  fill(col);
  stroke(border);
  strokeWeight(1);
  rect(x,y,w,h);
  noStroke();
  fill(tc);
  textAlign(CENTER,CENTER);
  textSize(Math.max(8,Math.min(11,h*.48)));
  text(label,x+w/2,y+h/2);
  }
function drawFarmGrid(L){
 const t=L.tile,g=L.gap,clipY=L.gridTop;
   drawingContext.save();
   drawingContext.beginPath();
   drawingContext.rect(L.mainX+4,clipY,L.mainW-8,L.view);
   drawingContext.clip();
 for(let r=0;r<game.farmRows;r++)for(let c=0;c<game.farmCols;c++){
  const x=L.gridX+c*(t+g),y=clipY+r*(t+g)-gridScroll;if(y+t<clipY||y>clipY+L.view)continue;
  fill((r+c)%2?"#1b3b13":"#214318");stroke("#65813a");strokeWeight(1);rect(x,y,t,t);
  const o=game.farm[r][c];
  if(!o){if(selectedBuild){noStroke();
      fill("#8aa96a");
      textAlign(CENTER,CENTER);
      textSize(Math.max(9,t*.25));
      text("+",x+t/2,y+t/2);
      }addTarget(x,y,t,t,()=>handleTileClick(r,c),false,getFarmHoverInfo(null,r,c));
    continue;
    }
  if(o.kind==="generator"){
   if(generatorSize(o)===1){drawGrowingGenerator(o.tier,x+t/2,y+t/2,t*.78,false,false,!!o.clogged);
     fill(white);
     noStroke();
     textAlign(CENTER,BOTTOM);
     textSize(Math.max(7,t*.17));
     text(formatNumber(generators[o.tier].rate)+"/s",x+t/2,y+t-1);
     }
  }else if(o.kind==="multiplier"||o.kind==="shield"){const si=images.multiplier;
    if(si&&si.width)drawSpriteSheet(si,x+t/2,y+t/2,t*.92,3,Math.floor(frameCount/7)%3);
    else drawShieldFallback(x+t/2,y+t/2,t);
    }
  else if(o.kind==="vine"){const vi=images.vinesIcon;
    if(vi&&vi.width)drawSpriteSheet(vi,x+t/2,y+t*.41,t*.70,1);
    else{noStroke();
      fill("#5c8b36");
      textAlign(CENTER,CENTER);
      textSize(t*.45);
      text("V",x+t/2,y+t*.41);
      }fill(orange);
    noStroke();
    textAlign(CENTER,BOTTOM);
    textSize(Math.max(6,t*.14));
    text("$"+formatNumber(vineClearCost()),x+t/2,y+t-1);
    }
  else if(o.kind==="vault"){const pumpkin=images.objective||images.regular;
    if(pumpkin&&pumpkin.width)drawSpriteSheet(pumpkin,x+t/2,y+t*.41,t*.65,1);
    else drawGeneratorSprite(1,x+t/2,y+t*.41,t*.65);
    if(o.level>0){fill(orange);
      noStroke();
      textAlign(CENTER,TOP);
      textSize(Math.max(7,t*.14));
      text("L"+(o.level+1),x+t/2,y+1);
      }const cap=vaultCapacity(o),stored=Number(o.stored)||0,ratio=constrain(stored/Math.max(1,cap),0,1),bw=t*.86,bh=Math.max(3,t*.09),bx=x+t*.07,by=y+t-bh-2;
    noStroke();
    fill("#091006");
    rect(bx,by,bw,bh);
    fill(ratio>=1?"#ffa500":"#78b84a");
    rect(bx,by,bw*ratio,bh);
    fill(white);
    textAlign(CENTER,BOTTOM);
    textSize(Math.max(6,Math.min(8,t*.13)));
    text(formatNumber(stored)+"/"+formatNumber(cap),x+t/2,by-1);
    }
  addTarget(x,y,t,t,()=>handleTileClick(r,c),false,getFarmHoverInfo(o,r,c));
 }
 // Draw multi-tile generators after all cell backgrounds so their sprites stay visible.
 const largeGenerators=new Set();
   for(let r=0;r<game.farmRows;r++)for(let c=0;c<game.farmCols;c++){const o=game.farm[r]&&game.farm[r][c];
   if(!o||o.kind!=="generator"||(generatorSize(o)===1)||o.row!==r||o.col!==c||largeGenerators.has(o))continue;
   largeGenerators.add(o);
   const x=L.gridX+c*(t+g),y=clipY+r*(t+g)-gridScroll,size=generatorSize(o),foot=size*t+(size-1)*g;
   if(y+foot<clipY||y>clipY+L.view)continue;
   drawGrowingGenerator(o.tier,x+foot/2,y+foot/2,t*(size-.1),false,false,!!o.clogged);
   noFill();
   stroke(orange);
   strokeWeight(2);
   rect(x,y,foot,foot);
   noStroke();
   fill(black);
   rect(x+t*.08,y+t*.08,t*(o.hyper?1.7:o.ultra?1.05:.65),t*.3);
   fill(orange);
   textAlign(CENTER,CENTER);
   textSize(Math.max(8,t*(o.hyper?.14:o.ultra?.17:.2)));
   text(o.hyper?"HYPER":o.ultra?"ULTRA":"MEGA",x+t*(o.hyper?.93:o.ultra?.55:.4),y+t*.23);
   }
 drawGridEffectPreview(L);
 // Draw affordability on the tile edge after all preview fills, replacing (not insetting) the base border.
 const hoverCell=getGridCell(L);
 if(hoverCell){
  const {r,c}=hoverCell,o=game.farm[r]&&game.farm[r][c];
  let cost=null,checkAffordability=false;
  if(o&&o.kind==="vine"){
   cost=vineClearCost();checkAffordability=true;
  }else if(!o&&selectedBuild&&selectedBuild!=="__sell"){
   const selectedItem=buildings.find(v=>v.id===selectedBuild);
   if(selectedItem&&selectedItem.kind!=="upgrade"){cost=buildCost(selectedItem);checkAffordability=true;}
  }else if(!selectedBuild&&o&&o.kind==="vault"){
   cost=vaultUpgradeCost(Math.max(0,o.level||0));checkAffordability=true;
  }else if(!selectedBuild&&o&&o.kind==="generator"&&generatorSize(o)===1&&o.tier<generators.length-1){
   cost=generatorCost(o.tier+1);checkAffordability=true;
  }
  if(checkAffordability){
   const outline=Number.isFinite(cost)&&game.cash>=cost?orange:"#ff3030";
   const x=L.gridX+c*(t+g),y=clipY+r*(t+g)-gridScroll;
   noFill();stroke(outline);strokeWeight(2);rect(x,y,t,t);noStroke();
  }
 }


  drawGeneratorMergeButtons(L);
  drawingContext.restore();
 if(L.content>L.view){fill("#35492c");
   noStroke();
   rect(L.mainX+L.mainW-5,clipY,2,L.view);
   fill(orange);
   rect(L.mainX+L.mainW-5,clipY+gridScroll/Math.max(1,L.content)*L.view,2,Math.max(8,L.view*L.view/L.content));
   }
}
// Render the complete farm into an off-screen graphics buffer and download it as a PNG.
// The live canvas only draws the visible, clipped rows for scrolling; it is not a full-grid buffer.
function drawExportSheet(pg,img,x,y,size,frames=1,frame=0){
 if(!img||!img.width||!img.height)return;
 const horizontal=img.width>img.height*1.4,fw=horizontal?img.width/frames:img.width,fi=horizontal?((frame%frames)+frames)%frames:0;
 pg.image(img,x,y,fw*size/img.height,size,fi*fw,0,fw,img.height);
}
function drawExportGrowingGenerator(pg,t,x,y,s,fullyGrown=false,clogged=false){
 const pot=images.generatorPot,fruit=images[fullyGrown&&t===0?"green":t>=3?"diamond":t>=2?"gold":"regular"],rate=generators[t].rate,cycle=Math.max(1300,1000/Math.max(.01,rate));
 const phase=(fullyGrown||clogged)?1:((Date.now()+Math.round(x*13+y*7))%cycle)/cycle,growth=(fullyGrown||clogged)?1:(phase<.84?Math.max(.12,phase/.84):1);
 if(pot&&pot.width&&pot.height)pg.image(pot,x,y+s*.10,pot.width*(s*1.18/pot.height),s*1.18);
 else{pg.noStroke();pg.fill("#79502c");pg.stroke("#b87a35");pg.rect(x-s*.36,y,s*.72,s*.46);}
 const img=phase<.84?images.green:fruit;
 if(img&&img.width&&img.height){const fy=y+s*.10-(s*.10*phase),h=s*.46*growth;
   drawExportSheet(pg,img,x,fy,h,img.width>img.height*1.4?8:1,Math.floor(frameCount/8)%8);
   }
}
function exportGrid(){
 if(!game||!Array.isArray(game.farm)){showToast("Farm grid is not ready to export");return;}
 const L=getLayout(),t=L.tile,g=L.gap,cols=game.farmCols,rows=game.farmRows;
 const exportW=cols*t+(cols-1)*g,exportH=rows*t+(rows-1)*g;
 if(exportW<1||exportH<1||exportW>16384||exportH>16384||exportW*exportH>64000000){showToast("Farm grid is too large to export at native tile size");
   return;
   }
 let pg=null;
 try{
  pg=createGraphics(exportW,exportH);
    pg.pixelDensity(1);
    pg.imageMode(CENTER);
    pg.rectMode(CORNER);
    pg.textFont("Arial");
    pg.background(backgroundColor);
  // Draw every tile, including rows outside the current scroll viewport.
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const x=c*(t+g),y=r*(t+g),o=game.farm[r]&&game.farm[r][c];
   pg.fill((r+c)%2?"#1b3b13":"#214318");pg.stroke("#65813a");pg.strokeWeight(1);pg.rect(x,y,t,t);
   if(!o)continue;
   if(o.kind==="generator"){
    if(generatorSize(o)===1){drawExportGrowingGenerator(pg,o.tier,x+t/2,y+t/2,t*.78,false,!!o.clogged);
      pg.fill(white);
      pg.noStroke();
      pg.textAlign(CENTER,BOTTOM);
      pg.textSize(Math.max(7,t*.17));
      pg.text(formatNumber(generators[o.tier].rate)+"/s",x+t/2,y+t-1);
      }
   }else if(o.kind==="multiplier"||o.kind==="shield"){
    const img=images.multiplier;
    if(img&&img.width)drawExportSheet(pg,img,x+t/2,y+t/2,t*.92,3,Math.floor(frameCount/7)%3);
    else{pg.noStroke();
      pg.fill("#9ed8f0");
      pg.stroke("#e6f5ff");
      pg.beginShape();
      pg.vertex(x+t/2,y+t*.1);
      pg.vertex(x+t*.82,y+t*.3);
      pg.vertex(x+t*.75,y+t*.73);
      pg.vertex(x+t/2,y+t*.9);
      pg.vertex(x+t*.25,y+t*.73);
      pg.vertex(x+t*.18,y+t*.3);
      pg.endShape(CLOSE);
      }
   }else if(o.kind==="vine"){
    const img=images.vinesIcon;
    if(img&&img.width)drawExportSheet(pg,img,x+t/2,y+t*.41,t*.70,1);
    else{pg.noStroke();pg.fill("#5c8b36");pg.textAlign(CENTER,CENTER);pg.textSize(t*.45);pg.text("V",x+t/2,y+t*.41);}
    pg.fill(orange);
      pg.noStroke();
      pg.textAlign(CENTER,BOTTOM);
      pg.textSize(Math.max(6,t*.14));
      pg.text("$"+formatNumber(vineClearCost()),x+t/2,y+t-1);
   }else if(o.kind==="vault"){
    const pumpkin=images.objective||images.regular;
    if(pumpkin&&pumpkin.width)drawExportSheet(pg,pumpkin,x+t/2,y+t*.41,t*.65,1);
    else{pg.noStroke();pg.fill("#ed8d20");pg.ellipse(x+t/2,y+t*.41,t*.48,t*.42);}
    if(o.level>0){pg.fill(orange);pg.noStroke();pg.textAlign(CENTER,TOP);pg.textSize(Math.max(7,t*.14));pg.text("L"+(o.level+1),x+t/2,y+1);}
    const cap=vaultCapacity(o),stored=Number(o.stored)||0,ratio=constrain(stored/Math.max(1,cap),0,1),bw=t*.86,bh=Math.max(3,t*.09),bx=x+t*.07,by=y+t-bh-2;
    pg.noStroke();
      pg.fill("#091006");
      pg.rect(bx,by,bw,bh);
      pg.fill(ratio>=1?"#ffa500":"#78b84a");
      pg.rect(bx,by,bw*ratio,bh);
      pg.fill(white);
      pg.textAlign(CENTER,BOTTOM);
      pg.textSize(Math.max(6,Math.min(8,t*.13)));
      pg.text(formatNumber(stored)+"/"+formatNumber(cap),x+t/2,by-1);
   }
  }
  // Draw Mega, Ultra and Hyper generators after tile sprites so their footprints remain intact.
  const largeGenerators=new Set();
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const o=game.farm[r]&&game.farm[r][c];
   if(!o||o.kind!=="generator"||(generatorSize(o)===1)||o.row!==r||o.col!==c||largeGenerators.has(o))continue;
   largeGenerators.add(o);const x=c*(t+g),y=r*(t+g),size=generatorSize(o),foot=size*t+(size-1)*g;
   drawExportGrowingGenerator(pg,o.tier,x+foot/2,y+foot/2,t*(size-.1),false,!!o.clogged);
   pg.noFill();pg.stroke(orange);pg.strokeWeight(2);pg.rect(x,y,foot,foot);
   pg.noStroke();pg.fill(black);pg.rect(x+t*.08,y+t*.08,t*(o.hyper?1.7:o.ultra?1.05:.65),t*.3);
   pg.fill(orange);
     pg.textAlign(CENTER,CENTER);
     pg.textSize(Math.max(8,t*(o.hyper?.14:o.ultra?.17:.2)));
     pg.text(o.hyper?"HYPER":o.ultra?"ULTRA":"MEGA",x+t*(o.hyper?.93:o.ultra?.55:.4),y+t*.23);
  }
  const canvas=pg.elt||pg.canvas||(pg._renderer&&pg._renderer.elt);
  if(!canvas||typeof canvas.toDataURL!=="function")throw new Error("Off-screen canvas export is unavailable");
  const link=document.createElement("a");
  link.href=canvas.toDataURL("image/png");
  link.download="pumpkin-clicker-farm-grid"+(game.prestige?"-prestige-"+game.prestige:"")+".png";
  link.style.display="none";document.body.appendChild(link);link.click();link.remove();
  pg.remove();pg=null;showToast("Exported full farm grid as PNG");
 }catch(err){
  if(pg)pg.remove();
  console.error("Could not export Pumpkin Clicker farm grid",err);
  showToast("Could not export grid — see console for details");
 }
}
function getGridCell(L){
 if(mouseX<L.gridX||mouseX>=L.gridX+game.farmCols*(L.tile+L.gap)-L.gap||mouseY<L.gridTop||mouseY>=L.gridTop+L.view)return null;
 const ux=mouseX-L.gridX,uy=mouseY-L.gridTop+gridScroll;
 const step=L.tile+L.gap,c=Math.floor(ux/step),r=Math.floor(uy/step);
 if(c<0||c>=game.farmCols||r<0||r>=game.farmRows||ux%step>=L.tile||uy%step>=L.tile)return null;
 return {r,c};
}
function multiplierBlobEdgeCells(startRow,startCol){
 const key=(r,c)=>r+","+c,isMult=o=>!!o&&(o.kind==="multiplier"||o.kind==="shield"),queue=[[startRow,startCol]],cluster=new Set(),edge=new Map(),dirs=[[-1,0],[1,0],[0,-1],[0,1]];
 while(queue.length){const [r,c]=queue.pop(),k=key(r,c);
   if(cluster.has(k)||r<0||c<0||r>=game.farmRows||c>=game.farmCols||!isMult(game.farm[r]&&game.farm[r][c]))continue;
   cluster.add(k);
   dirs.forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;
     if(nr>=0&&nc>=0&&nr<game.farmRows&&nc<game.farmCols&&isMult(game.farm[nr]&&game.farm[nr][nc])&&!cluster.has(key(nr,nc)))queue.push([nr,nc]);
     });
   }
 cluster.forEach(k=>{const [r,c]=k.split(",").map(Number);
   dirs.forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;
     if(nr<0||nc<0||nr>=game.farmRows||nc>=game.farmCols)return;
     if(isMult(game.farm[nr]&&game.farm[nr][nc]))return;
     edge.set(key(nr,nc),{r:nr,c:nc,center:false});
     });
   });
 return [...edge.values()];
}
function drawGridEffectPreview(L){
 const cell=getGridCell(L);if(!cell)return;
 const hovered=game.farm[cell.r]&&game.farm[cell.r][cell.c],hoveredMultiplier=!!hovered&&(hovered.kind==="multiplier"||hovered.kind==="shield"),selected=selectedBuild&&buildings.find(v=>v.id===selectedBuild);
 let kind=null,ar=cell.r,ac=cell.c;
 if(hoveredMultiplier){kind="multiplier";
   ar=Number.isFinite(hovered.row)?hovered.row:cell.r;
   ac=Number.isFinite(hovered.col)?hovered.col:cell.c;
   }
 else if(selected&&(selected.kind==="multiplier"||selected.kind==="vault"))kind=selected.kind;
 else if(hovered&&hovered.kind==="vault"){kind="vault";
   ar=Number.isFinite(hovered.row)?hovered.row:cell.r;
   ac=Number.isFinite(hovered.col)?hovered.col:cell.c;
   }
 if(!kind)return;
 const isMultiplier=kind==="multiplier"||kind==="shield",border=isMultiplier?"#c58aff":"#54e8cf",cells=[];
 if(isMultiplier){if(hoveredMultiplier)cells.push(...multiplierBlobEdgeCells(ar,ac));
   else [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>{const r=ar+dr,c=ac+dc;
     if(r>=0&&r<game.farmRows&&c>=0&&c<game.farmCols){const o=game.farm[r]&&game.farm[r][c];
       if(!o||(o.kind!=="multiplier"&&o.kind!=="shield"))cells.push({r,c,center:false});
       }});
   }
 else for(let r=Math.max(0,ar-1);r<=Math.min(game.farmRows-1,ar+1);r++)for(let c=Math.max(0,ac-1);c<=Math.min(game.farmCols-1,ac+1);c++)cells.push({r,c,center:r===ar&&c===ac});
 noStroke();
   cells.forEach(({r,c,center})=>{const x=L.gridX+c*(L.tile+L.gap),y=L.gridTop+r*(L.tile+L.gap)-gridScroll;
   if(y+L.tile<L.gridTop||y>L.gridTop+L.view)return;
   if(isMultiplier)fill(174,90,255,76);
   else if(center)fill(35,220,190,35);
   else fill(35,220,190,78);
   rect(x,y,L.tile,L.tile);
   noFill();
   stroke(border);
   strokeWeight(center?2:1);
   rect(x+1,y+1,L.tile-2,L.tile-2);
   noStroke();
   });
}
function drawSpriteSheet(img,x,y,size,frames,frame=0){
  if(!img||!img.width||!img.height)return;
  const horizontal=img.width>img.height*1.4,fw=horizontal?img.width/frames:img.width,fi=horizontal?((frame%frames)+frames)%frames:0;
  image(img,x,y,fw*size/img.height,size,fi*fw,0,fw,img.height);
  }
function drawGeneratorSprite(t,x,y,s){
  const img=images[generators[t].id];
  if(img?.width)drawSpriteSheet(img,x,y,s,1);
  else{noStroke();
    fill(t===0?"#85b54a":t===2?"#e9c33e":t===3?"#74e4e8":"#ed8d20");
    ellipse(x,y,s*.82,s*.68);
    fill("#4d7b20");
    rect(x-s*.04,y-s*.42,s*.08,s*.2);
    }}
function drawGrowingGenerator(t,x,y,s,isVault=false,fullyGrown=false,clogged=false){
 const pot=images.generatorPot,fruit=images[fullyGrown&&t===0?"green":t>=3?"diamond":t>=2?"gold":"regular"],rate=generators[t].rate,cycle=Math.max(1300,1000/Math.max(.01,rate));
 const phase=(fullyGrown||clogged)?1:((Date.now()+Math.round(x*13+y*7))%cycle)/cycle,growth=(fullyGrown||clogged)?1:(phase<.84?Math.max(.12,phase/.84):1);
 if(pot&&pot.width&&pot.height)image(pot,x,y+s*.10,pot.width*(s*1.18/pot.height),s*1.18);
   else{noStroke();
   fill("#79502c");
   stroke("#b87a35");
   rect(x-s*.36,y,s*.72,s*.46);
   }
 const img=phase<.84?images.green:fruit;
 if(img&&img.width&&img.height){const fw=img.width>img.height*1.4?img.width/8:img.width,fy=y+s*.10-(s*.10*phase),h=(isVault?s*.40:s*.46)*growth;
   drawSpriteSheet(img,x,fy,h,img.width>img.height*1.4?8:1,Math.floor(frameCount/8)%8);
   }
 
}
function drawTrashIcon(x,y,s){
  push();
  translate(x,y);
  const sw=Math.max(1,s*.055);
  stroke(orange);
  strokeWeight(sw);
  strokeJoin(MITER);
  noFill();
  line(-s*.34,-s*.27,s*.34,-s*.27);
  line(-s*.14,-s*.38,s*.14,-s*.38);
  line(-s*.07,-s*.45,s*.07,-s*.45);
  beginShape();
  vertex(-s*.25,-s*.18);
  vertex(-s*.21,s*.34);
  vertex(s*.21,s*.34);
  vertex(s*.25,-s*.18);
  endShape();
  line(-s*.08,-s*.12,-s*.06,s*.24);
  line(s*.08,-s*.12,s*.06,s*.24);
  pop();
  }
function drawShieldFallback(x,y,s){
  noStroke();
  fill("#9ed8f0");
  stroke("#e6f5ff");
  beginShape();
  vertex(x,y-s*.4);
  vertex(x+s*.32,y-s*.2);
  vertex(x+s*.25,y+s*.23);
  vertex(x,y+s*.4);
  vertex(x-s*.25,y+s*.23);
  vertex(x-s*.32,y-s*.2);
  endShape(CLOSE);
  }
function drawSprite(id,x,y,s,frames=8,fps=12){
  const img=images[id];
  if(img?.width){push();
    if(id==="brute")tint(255,145,145);
    drawSpriteSheet(img,x,y,s,frames,Math.floor(frameCount/(60/fps))%frames);
    pop();
    }else{noStroke();
    fill(id==="ghost"?"#b6cce0":id==="brute"?"#9d5b45":id==="wizard"?"#6a65bd":orange);
    ellipse(x,y,s*.65,s*.75);
    }}
function vineClearCost() {
  return Math.ceil(50 * Math.pow(10, Math.max(0, Math.floor(Number(game.vinesCleared) || 0))));
}
function placedCount(kind){
  const seen=new Set();
  (game.farm||[]).forEach(row=>(row||[]).forEach(o=>{if(o&&o.kind===kind)seen.add(o);
    }));
  return seen.size;
  }
function ownedGeneratorCount(tier){
  const seen=new Set();
  let count=0;
  (game.farm||[]).forEach(row=>(row||[]).forEach(o=>{if(!o||o.kind!=="generator"||o.tier<tier||seen.has(o))return;
    seen.add(o);
    count+=generatorSize(o)**2;
    }));
  return count;
  }
function generatorCost(tier){
  const g=generators[tier];
  if(!g)return Infinity;
  const scaledBase=Math.ceil(g.cost*Math.pow(g.growth,ownedGeneratorCount(tier)));
  if(tier<=0)return scaledBase;
  const previous=generatorCost(tier-1);
  return Math.max(scaledBase,previous+scaledBase);
  }
function buildCost(d){
  if(!d)return Infinity;
  const kind=d.kind==="shield"?"multiplier":d.kind;
  if(kind==="generator")return generatorCost(d.tier);
  if(kind==="multiplier")return Math.ceil(d.cost*Math.pow(1.35,placedCount(kind)));
  if(kind==="vault")return Math.ceil(d.cost*Math.pow(1.15,placedCount(kind)));
  return d.cost;
  }
function handleTileClick(row, col) {
  let building = game.farm[row] && game.farm[row][col];

  if (building && building.kind === "vine") {
    const cost = vineClearCost();

    if (game.cash < cost) {
      showToast("Removing vines costs $" + formatNumber(cost));
      return;
    }

    game.cash -= cost;
    game.vinesCleared = Math.max(0, Math.floor(Number(game.vinesCleared) || 0)) + 1;
    game.farm[row][col] = null;

    showToast("Vines removed for $" + formatNumber(cost) + " — next clear costs $" + formatNumber(vineClearCost()));
    saveGame();
    return;
  }

  if (selectedBuild === "__sell") {
    if (!building) {
      showToast("No building on this tile");
      return;
    }

    removeTile(row, col, building);
    return;
  }

  if (!selectedBuild && building && (building.kind === "multiplier" || building.kind === "shield")) {
    showToast("Multipliers boost only directly adjacent generators");
    return;
  }

  if (!selectedBuild) {
    if (building && building.kind === "vault") {
      let bought = 0;
      let lastCost = 0;
      const limit = purchaseLimit();

      while (bought < limit) {
        const cost = vaultUpgradeCost(Math.max(0, building.level || 0));
        if (game.cash < cost) {
          lastCost = cost;
          break;
        }

        game.cash -= cost;
        building.level = (building.level || 0) + 1;
        bought++;
      }

      if (!bought) {
        showToast("Vault upgrade costs $" + formatNumber(lastCost || vaultUpgradeCost(Math.max(0, building.level || 0))));
        return;
      }

      showToast("Vault upgraded " + bought + " level" + (bought === 1 ? "" : "s") + ": " + formatNumber(vaultCapacity(building)) + " capacity");
      saveGame();
      return;
    }

    if (building && building.kind === "generator") {
      if (generatorSize(building) > 1) {
        const pieces = fragmentGenerator(building);
        showToast((building.hyper ? "Hyper" : building.ultra ? "Ultra" : "Mega") + " generator fragmented into " + pieces + " generators");
        saveGame();
        return;
      }

      let bought = 0;
      let lastCost = 0;
      const limit = purchaseLimit();

      while (bought < limit) {
        building = game.farm[row] && game.farm[row][col];

        if (!building || building.kind !== "generator" || generatorSize(building) > 1 || building.tier >= 3) {
          break;
        }

        const cost = Math.max(0, generatorCost(building.tier + 1) - generatorCost(building.tier));
        if (game.cash < cost) {
          lastCost = cost;
          break;
        }

        game.cash -= cost;
        game.farm[row][col] = {
          kind: "generator",
          tier: building.tier + 1,
          row,
          col,
          mega: false,
          ultra: false,
          hyper: false,
          progress: 0,
          clogged: false
        };
        bought++;
      }

      if (!bought) {
        if (building && building.tier >= 3) {
          showToast("Diamond pumpkins are max tier");
        } else if (building && generatorSize(building) > 1) {
          showToast("Fragment the large generator before upgrading");
        } else {
          const tier = building && building.tier < 3 ? building.tier + 1 : 0;
          showToast("Generator upgrade costs $" + formatNumber(lastCost || generatorCost(tier)));
        }
        return;
      }

      showToast("Generator upgraded " + bought + " tier" + (bought === 1 ? "" : "s"));
      saveGame();
    } else {
      showToast(building && building.kind === "vault" ? "Vaults increase storage" : "Choose a building from BUILD first");
    }

    return;
  }

  const selected = buildings.find(item => item.id === selectedBuild);
  if (!selected) return;

  if (building) {
    showToast("That tile is occupied");
    return;
  }

  const price = buildCost(selected);
  if (game.cash < price) {
    showToast(selected.name + " costs $" + formatNumber(price));
    selectedBuild = null;
    bulkPlaceRemaining = 0;
    return;
  }

  if (selected.kind === "upgrade") {
    toggleAutoSell();
    return;
  }

  const bulk = bulkPlaceRemaining > 0 || purchaseLimit() > 1;
  if (bulk && bulkPlaceRemaining === 0) {
    bulkPlaceRemaining = purchaseLimit();
  }

  game.cash -= price;

  let placed;
  if (selected.kind === "generator") {
    placed = {
      kind: "generator",
      tier: selected.tier,
      row,
      col,
      mega: false,
      ultra: false,
      hyper: false,
      progress: 0,
      clogged: false
    };
  } else if (selected.kind === "vault") {
    placed = { kind: "vault", row, col, level: 0, stored: 0 };
  } else {
    placed = { kind: selected.kind, row, col };
  }

  game.farm[row][col] = placed;

  if (bulk) {
    bulkPlaceRemaining = Math.max(0, bulkPlaceRemaining - 1);
    const nextCost = buildCost(selected);

    if (bulkPlaceRemaining > 0 && game.cash >= nextCost) {
      selectedBuild = selected.id;
      showToast(selected.name + " placed — " + bulkPlaceRemaining + " bulk placements remaining");
    } else {
      selectedBuild = null;
      const reason = bulkPlaceRemaining > 0 && game.cash < nextCost
        ? "Next costs $" + formatNumber(nextCost) + "; bulk placement stopped"
        : "Bulk placement complete";

      bulkPlaceRemaining = 0;
      showToast(selected.name + " placed. " + reason);
    }
  } else {
    selectedBuild = null;
    bulkPlaceRemaining = 0;
    showToast(selected.name + " placed");
  }

  saveGame();
}

function tileValue(o){
  if(!o)return 0;
  if(o.kind==="generator")return generators[o.tier].cost*generatorSize(o)**2;
  if(o.kind==="multiplier"||o.kind==="shield")return 180;
  if(o.kind==="vault"){let value=100;
    for(let i=0;i<Math.max(0,o.level||0);i++)value+=vaultUpgradeCost(i);
    return value;
    }return 0;
  }
function removeTile(row, col, building) {
  if (building && building.kind === "generator" && generatorSize(building) > 1) {
    const pieces = fragmentGenerator(building);
    showToast((building.hyper ? "Hyper" : building.ultra ? "Ultra" : "Mega") + " fragmented into " + pieces + " individual generators");
    saveGame();
    return;
  }

  const value = tileValue(building);
  const refund = Math.floor(value * 0.25);
  const stored = building.kind === "vault" ? Number(building.stored) || 0 : 0;
  const size = building.kind === "generator" ? generatorSize(building) : 1;
  const cells = [];

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      cells.push([
        building.kind === "generator" ? building.row + dy : row,
        building.kind === "generator" ? building.col + dx : col
      ]);
    }
  }

  const oldCells = cells.map(([y, x]) => ({
    y,
    x,
    value: game.farm[y] && game.farm[y][x]
  }));

  cells.forEach(([y, x]) => {
    if (game.farm[y]) game.farm[y][x] = null;
  });

  syncStoredPumpkins();

  if (stored > 0) {
    if (availableStorage() < stored) {
      oldCells.forEach(cell => {
        if (game.farm[cell.y]) game.farm[cell.y][cell.x] = cell.value;
      });
      syncStoredPumpkins();
      showToast("Sell the vault contents or free storage before deleting it");
      return;
    }

    depositInStorage(stored);
  }

  game.cash += refund;
  selectedBuild = "__sell";
  showToast("Tile removed • refunded $" + formatNumber(refund));
  saveGame();
}

function fragmentGenerator(building) {
  const size = generatorSize(building);
  if (size === 1) return 1;

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const row = building.row + dy;
      const col = building.col + dx;

      if (game.farm[row]) {
        game.farm[row][col] = {
          kind: "generator",
          tier: building.tier,
          row,
          col,
          mega: false,
          ultra: false,
          hyper: false,
          progress: 0,
          clogged: false
        };
      }
    }
  }

  return size * size;
}


function isBasicMergeGenerator(building, tier) {
  return Boolean(building &&
    building.kind === "generator" &&
    generatorSize(building) === 1 &&
    !building.mega && !building.ultra && !building.hyper &&
    building.tier === tier);
}

function getBasicMergeCandidates() {
  const candidates = [];
  const reserved = new Set();
  // Offer the largest possible merge first, using basic generators only.
  const sizes = [
    { size: 5, flag: "hyper" },
    { size: 3, flag: "ultra" },
    { size: 2, flag: "mega" }
  ];

  for (const entry of sizes) {
    const size = entry.size;
    for (let row = 0; row <= game.farmRows - size; row++) {
      for (let col = 0; col <= game.farmCols - size; col++) {
        const first = game.farm[row] && game.farm[row][col];
        if (!first || first.kind !== "generator" ||
            !isBasicMergeGenerator(first, first.tier)) continue;

        const cells = [];
        let matches = true;
        for (let dy = 0; dy < size && matches; dy++) {
          for (let dx = 0; dx < size; dx++) {
            const r = row + dy, c = col + dx;
            const key = r + "," + c;
            const building = game.farm[r] && game.farm[r][c];
            if (reserved.has(key) || !isBasicMergeGenerator(building, first.tier)) {
              matches = false;
              break;
            }
            cells.push({ row: r, col: c });
          }
        }
        if (!matches) continue;
        cells.forEach(cell => reserved.add(cell.row + "," + cell.col));
        candidates.push({ row, col, size, tier: first.tier, flag: entry.flag });
      }
    }
  }
  return candidates;
}

function mergeBasicGeneratorBlock(row, col, size, tier) {
  const flag = size === 2 ? "mega" : size === 3 ? "ultra" : size === 5 ? "hyper" : null;
  if (!flag || row < 0 || col < 0 ||
      row + size > game.farmRows || col + size > game.farmCols) return false;

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const building = game.farm[row + dy] && game.farm[row + dy][col + dx];
      if (!isBasicMergeGenerator(building, tier)) return false;
    }
  }

  const merged = {
    kind: "generator",
    tier,
    row,
    col,
    mega: flag === "mega",
    ultra: flag === "ultra",
    hyper: flag === "hyper"
  };
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      game.farm[row + dy][col + dx] = merged;
    }
  }

  showToast(size * size + " pumpkins became a " + flag.toUpperCase() + " generator!");
  saveGame();
  return true;
}

function drawGeneratorMergeButtons(L) {
  const candidates = getBasicMergeCandidates();
  if (!candidates.length) return;
  const t = L.tile, g = L.gap, clipY = L.gridTop;

  for (const candidate of candidates) {
    const { row, col, size, tier } = candidate;
    const x = L.gridX + col * (t + g);
    const y = clipY + row * (t + g) - gridScroll;
    const foot = size * t + (size - 1) * g;
    if (y + foot < clipY || y > clipY + L.view) continue;

    const hovered = mouseX >= x && mouseX <= x + foot &&
      mouseY >= y && mouseY <= y + foot;
    noFill();
    stroke(hovered ? "#c8ff71" : "#94db51");
    strokeWeight(hovered ? 3 : 2);
    rect(x + 1, y + 1, foot - 2, foot - 2);

    const buttonH = Math.max(14, Math.min(24, t * 0.56));
    const kind = size === 5 ? "HYPER" : size === 3 ? "ULTRA" : "MEGA";
    const buttonW = size === 2 ? foot * 0.88 : foot * 0.78;
    const buttonX = x + (foot - buttonW) / 2;
    const buttonY = y + (foot - buttonH) / 2;
    const label = "MERGE " + kind;
    const buttonColor = mouseIsPressed && hovered ? "#6b9b31" : hovered ? "#b6ed62" : "#8fc748";

    if (size === 2) {
      // Give the short Mega button extra room so its label doesn't touch the edge.
      fill(buttonColor);
      stroke(hovered ? "#e0ffae" : "#d0ef9f");
      strokeWeight(1);
      rect(buttonX, buttonY, buttonW, buttonH);
      noStroke();
      fill("#10200a");
      textAlign(CENTER, CENTER);
      textSize(Math.max(6, Math.min(10, buttonH * 0.42)));
      text(label, buttonX + buttonW / 2, buttonY + buttonH / 2);
    } else {
      // Preserve the existing Ultra and Hyper button sizing and typography.
      drawButton(buttonX, buttonY, buttonW, buttonH, label, buttonColor, "#10200a",
        hovered ? "#e0ffae" : "#d0ef9f");
    }
    addTarget(buttonX, buttonY, buttonW, buttonH, () => {
      if (!mergeBasicGeneratorBlock(row, col, size, tier)) {
        showToast("Merge requires only matching basic generators");
      }
    }, false, {
      id: "merge-generator:" + row + ":" + col + ":" + size,
      title: "Merge " + kind + " generator",
      kind: "button",
      summary: "Combine " + (size * size) + " matching basic generators into one " + kind + " generator.",
      rules: ["Every tile in the highlighted area must contain a basic, unmerged generator of the same tier.",
        "Merged generators cannot be used as ingredients for another merge."]
    });
  }
}

function workerCost(id){
  const w=workers.find(v=>v.id===id);
  if(!w)return Infinity;
  return Math.ceil(w.cost*Math.pow(1.4,Math.max(0,game.workers[id]||0)));
  }
function buyWorker(id,quantity=1){
  const w=workers.find(v=>v.id===id);
  if(!w)return;
  let bought=0,total=0,lastCost=0;
  const limit=quantity===Infinity?Infinity:Math.max(1,Math.floor(Number(quantity)||1));
  while(bought<limit){const cost=workerCost(id);
    if(game.cash<cost){lastCost=cost;
      break;
      }game.cash-=cost;
    game.workers[id]=(game.workers[id]||0)+1;
    game.totalWorkers++;
    bought++;
    total+=cost;
    }if(!bought){showToast(w.name+" costs $"+formatNumber(lastCost||workerCost(id)));
    return;
    }showToast(w.name+" hired "+bought+" for $"+formatNumber(total));
  saveGame();
  }
function toggleAutoSell(){
  if(!game.autoSellPurchased){if(game.cash<650){showToast("Auto-Sell costs $650");
      return;
      }game.cash-=650;
    game.autoSellPurchased=true;
    game.autoSell=true;
    game.autoSellProgressMs=0;
    selectedBuild=null;
    showToast("Auto-Sell purchased and enabled — sells every minute of active play");
    saveGame();
    return;
    }game.autoSell=!game.autoSell;
  game.autoSellProgressMs=0;
  showToast(game.autoSell?"Auto-Sell activated":"Auto-Sell paused");
  saveGame();
  }
function clickPumpkin(){
  pumpkinPressedAt=millis();
  const lucky=Math.random()<.001;
  syncStoredPumpkins();
  if(!game.autoSell&&availableStorage()<=0){if(lucky)openCandy("drop",randomCandy());
    else showToast("Storage full — sell pumpkins or add a vault");
    saveGame();
    return;
    }game.totalClicks++;
  game.totalHarvested++;
  if(game.autoSell){const earned=(1+clickCashBonus()*cashMultiplier())*(hasCandy("chocolate")?2:1);
    game.cash+=earned;
    showToast("+$"+earned);
    }else{const n=clickPumpkinYield()*(hasCandy("chocolate")?2:1);
    const added=depositInStorage(n);
    showToast("+"+added+" pumpkins");
    const cashBonus=clickCashBonus();
    if(cashBonus>0){game.cash+=cashBonus*cashMultiplier()*(hasCandy("chocolate")?2:1);
      showToast("+$"+cashBonus+" click bonus");
      }}if(lucky)openCandy("drop",randomCandy());
  saveGame();
  }
function sellPumpkins(){
  syncStoredPumpkins();
  const n=Math.floor(game.pumpkins);
  if(n<=0){showToast("No pumpkins to sell");
    return;
    }game.baseStored=0;
  getVaults().forEach(v=>v.stored=0);
  game.pumpkins=0;
  const earned=n*candyMultiplier("sell");
  game.cash+=earned;
  game.totalSold+=n;
  showToast("Sold "+formatNumber(n)+" pumpkins for $"+formatNumber(earned));
  saveGame();
  }
function candyPurchaseTier() {
  return (game.activeCandies || []).filter(v => v && v.expiresAt > Date.now()).length;
}
function candyPrice(tier = candyPurchaseTier()) {
  tier = Math.max(0, Math.floor(Number(tier) || 0));
  return Math.pow(10, 3 * Math.pow(2, tier));
}
function candyPriceLabel(){
  const tier=candyPurchaseTier(),price=candyPrice(tier),exponent=3*Math.pow(2,tier);
  return exponent<=12?formatNumber(price):"1e"+exponent;
  }
function randomCandy() {
  return candies[Math.floor(Math.random() * candies.length)];
}
function openCandy(source, candy) {
  candyOpening = { source, candy: candy || randomCandy(), started: millis(), activated: false };
  toastMessage = "";
}
function claimDailyCandy(){
  if(candyOpening)return;
  if(dailyClaimed){showToast("Daily candy already claimed");
    return;
    }dailyClaimed=true;
  try{localStorage.setItem(dailyKey,todayKey());
    }catch(e){}const reward=50+Math.min(100,game.prestige*10);
  game.cash+=reward;
  depositInStorage(10);
  openCandy("daily");
  saveGame();
  }
function buyCandy(quantity=1){
  if(candyOpening)return;
  const limit=quantity===Infinity?Infinity:Math.max(1,Math.floor(Number(quantity)||1)),queue=[],projectedActive=new Set((game.activeCandies||[]).filter(v=>v&&v.expiresAt>Date.now()).map(v=>v.id));
  let bought=0,total=0;
  while(bought<limit){const price=candyPrice(projectedActive.size);
    if(!Number.isFinite(price)||game.cash<price)break;
    const candy=randomCandy();
    game.cash-=price;
    game.candyPurchases=Math.max(0,Math.floor(Number(game.candyPurchases)||0))+1;
    queue.push(candy);
    projectedActive.add(candy.id);
    bought++;
    total+=price;
    }if(!bought){showToast("Random candy costs $"+candyPriceLabel());
    return;
    }candyQueue=queue.slice(1);
  openCandy("shop",queue[0]);
  showToast("Bought "+bought+" "+(bought===1?"candy":"candies")+" for $"+formatNumber(total)+(bought===limit?"":"; stopped at the affordability limit"));
  saveGame();
  }
function activateCandy(candy){
  const expiry=Date.now()+60*60*1000,existing=game.activeCandies.find(v=>v.id===candy.id);
  if(existing)existing.expiresAt=expiry;
  else game.activeCandies.push({id:candy.id,expiresAt:expiry});
  saveGame();
  }
function drawWrappedCentered(value,cx,cy,maxWidth,lineHeight,maxLines=3){
 const words=String(value||"").split(/\s+/).filter(Boolean),lines=[];let line="";
 for(const word of words){const test=line?line+" "+word:word;if(line&&textWidth(test)>maxWidth){lines.push(line);line=word;}else line=test;}
 if(line)lines.push(line);
 if(lines.length>maxLines){lines.length=maxLines;
   let last=lines[maxLines-1];
   while(last.length&&textWidth(last+"…")>maxWidth)last=last.slice(0,-1);
   lines[maxLines-1]=last.replace(/\s+$/,"")+"…";
   }
 const startY=cy-((lines.length-1)*lineHeight)/2;lines.forEach((s,i)=>text(s,cx,startY+i*lineHeight));
}
function spawnCandyConfetti(cx,cy){
 const count=160;
 for(let i=0;i<count;i++){
  const angle=-HALF_PI+Math.pow(Math.random(),1.2)*(Math.random()<.5?-1:1)*1.25;
  const speed=3.5+Math.random()*4.5;
  candyConfetti.push({
   x:cx+(Math.random()-.5)*18,y:cy+(Math.random()-.5)*10,
   vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
   size:2.5+Math.random()*3.5,
   r:Math.floor(Math.random()*256),g:Math.floor(Math.random()*256),b:Math.floor(Math.random()*256),
   angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.18,
   age:0,life:1800+Math.random()*900
  });
 }
 lastConfettiTime=millis();
}
function drawCandyConfetti(){
 if(!candyConfetti.length)return;
 const now=millis(),dt=lastConfettiTime?Math.max(0,Math.min(2.5,(now-lastConfettiTime)/16.667)):1;
 lastConfettiTime=now;
 for(let i=candyConfetti.length-1;i>=0;i--){
  const p=candyConfetti[i];p.age+=dt*16.667;p.vy+=.22*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
  if(p.x<0){p.x=0;p.vx=Math.abs(p.vx);}else if(p.x>width){p.x=width;p.vx=-Math.abs(p.vx);}
  if(p.age>=p.life||p.y>height+16){candyConfetti.splice(i,1);continue;}
  const alpha=255*Math.min(1,(p.life-p.age)/420);
  push();translate(p.x,p.y);rotate(p.angle);noStroke();fill(p.r,p.g,p.b,alpha);rectMode(CENTER);rect(0,0,p.size*1.45,p.size);pop();
 }
}
function drawCandyReveal(){
 if(!candyOpening)return;
 const o=candyOpening,elapsed=millis()-o.started,L=getLayout(),w=Math.min(width*.78,420),h=Math.min(height*.66,390),x=(width-w)/2,y=(height-h)/2,cx=x+w/2,bagY=y+h*.47;
 if(elapsed>=1050&&!o.activated){activateCandy(o.candy);o.activated=true;spawnCandyConfetti(cx,y+h*.40);}
 noStroke();fill(0,0,0,175);rect(0,0,width,height);
 fill("#14230e");stroke(orange);strokeWeight(3);rect(x,y,w,h);
 fill(white);noStroke();textAlign(CENTER,CENTER);textSize(Math.max(16,Math.min(24,w*.065)));
 text(elapsed<1050?(o.source==="daily"?"OPENING DAILY CANDY":o.source==="drop"?"RARE CANDY DROP!":"OPENING RANDOM CANDY"):"CANDY BONUS UNLOCKED",cx,y+h*.16);
 if(elapsed<1050){
  const shake=elapsed<800?Math.sin(elapsed*.065)*Math.max(1,12-elapsed*.012):0;
  const fade=elapsed<850?255:Math.max(0,255*(1050-elapsed)/200);
  const img=images.candyBag,bagSize=Math.min(w*.34,h*.3);
  if(img&&img.width){push();tint(255,fade);drawSpriteSheet(img,cx+shake,bagY,bagSize,1);noTint();pop();}
  else{fill(orange,fade);rect(cx+shake-w*.08,bagY-h*.10,w*.16,h*.2);}
  fill("#c8d6b9");textSize(12);text(elapsed<800?"SHAKING...":"OPENING...",cx,y+h*.76);
  drawCandyConfetti();
  return;
 }
 const d=o.candy,img=images[d.id],icon=Math.min(w*.28,h*.25);
 if(img&&img.width)drawSpriteSheet(img,cx,y+h*.40,icon,1);
 fill(orange);textSize(Math.max(15,Math.min(22,w*.06)));text(d.name,cx,y+h*.62);
 fill(white);textSize(Math.max(11,Math.min(15,w*.042)));drawWrappedCentered(d.desc,cx,y+h*.71,w-30,Math.max(12,Math.min(15,w*.042)),3);
 fill("#9fb58a");textSize(11);text("ACTIVE FOR 1 HOUR",cx,y+h*.83);
 drawButton(x+w*.25,y+h*.88,w*.5,28,"CONTINUE",orange,black);
 addTarget(x+w*.25,y+h*.88,w*.5,28,()=>{if(candyQueue.length){openCandy("shop",candyQueue.shift());
     }else candyOpening=null;
   saveGame();
   },true);
 drawCandyConfetti();
}
function prestigeCost() {
  return Math.floor(1000000000 * Math.pow(5, game.prestige));
}
function performPrestige(){
  const cost=prestigeCost();
  if(game.cash<cost){showToast("Need $"+formatNumber(cost)+" to prestige");
    return;
    }const p=game.prestige+1,buffs=game.activeCandies.filter(v=>v.expiresAt>Date.now());
  game=newGameState(p);
  game.activeCandies=buffs;
  game.farmCols=6+p;
  game.farmRows=4+p;
  game.farm=Array.from({length:game.farmRows},()=>Array(game.farmCols).fill(null));
  seedVines();
  gridScroll=0;
  shopScroll=0;
  selectedBuild=null;
  showToast("Prestige "+p+"! Farm expanded; permanent production increased.");
  saveGame();
  }

function getItemHoverInfo(it){
 const d=it.d;
 if(it.type==="worker"){
  const count=game.workers[d.id]||0;
  const rules={
   monster:["Adds 0.10 base pumpkins/sec to every generator per Monster.","Additive bonuses apply before the generator and multiplier bonuses."],
   ghost:["Each Ghost adds 5% total production.","Bonuses stack multiplicatively with other global workers."],
   speeder:["Each Speeder adds 10% total production.","Bonuses stack multiplicatively with other global workers."],
   rusher:["Each Rusher grants a burst of 5 pumpkins every 10 seconds.","Bursts respect the storage cap; Auto-Sell converts bursts into cash."],
   brute:["Adds 0.55 base pumpkins/sec to every generator per Brute.","This is an additive bonus before generator/multiplier bonuses."],
   wizard:["Each Wizard adds 18% total production.","Bonuses stack multiplicatively with other global workers."],
   debuffer:["Each Debuffer increases other worker bonuses by 8%.","This strengthens additive Monster/Brute bonuses and other worker multipliers."]
  };
  return {id:"worker:"+d.id,title:d.name,kind:"worker",summary:d.desc,rules:["Next hire: $"+formatNumber(workerCost(d.id))+". Owned: "+count+".","Each additional worker of this type costs 40% more than the previous price.","Uses the global ×1, ×10 or MAX purchase mode; Shift-click forces ×10. Hiring stops when you cannot afford the next worker.",...(rules[d.id]||[]),"Workers never occupy farm tiles and have no recurring wages."]};
 }
 if(it.type==="build"||it.type==="autosell"){
  if(d.kind==="generator")return {id:"build:"+d.id,title:d.name,kind:"build",summary:"Produces "+d.desc+".",rules:["Next cost: $"+formatNumber(buildCost(d))+". Each owned "+d.name+" or higher-tier generator increases this tier’s base-price component by "+generators[d.tier].growth.toFixed(2)+"×. Removing a generator lowers relevant prices. Choose this, then click an empty farm tile.","Click an existing generator to upgrade it for the difference between this tier’s price and the current tier’s price.","Use the highlighted MERGE buttons to combine matching basic generators: 4 in a 2×2 square for a Mega, 9 in a 3×3 square for an Ultra, or 25 in a 5×5 square for a Hyper. Existing merged generators cannot be merged again."]};
  if(d.kind==="multiplier")return {id:"build:"+d.id,title:"Multiplier",kind:"build",summary:"Boosts adjacent generators; neighboring multipliers amplify one another.",rules:["Next cost: $"+formatNumber(buildCost(d))+". Each multiplier costs 35% more per multiplier currently placed, and removing one lowers the next price.","Only the four orthogonally adjacent tiles count; diagonals do not.","Each neighboring multiplier boosts the other multiplier’s strength by 1.6×."]};
  if(d.kind==="vault")return {id:"build:"+d.id,title:"Vault",kind:"build",summary:"Dedicated storage grows nonlinearly with each level.",rules:["Next cost: $"+formatNumber(buildCost(d))+". Each vault costs 15% more per vault currently placed, and removing one lowers the next price.","Its storage zone is a 3×3 area centered on the vault.","Generators in overlapping vault zones fill vaults top-to-bottom, then left-to-right, and finally base storage.","Click a placed vault to upgrade it; capacity grows by 1.5× per level; upgrade prices rise with each level.","Monster and Brute workers increase the base storage capacity, which starts at 50."]};
  return {id:"build:"+d.id,title:d.name,kind:"build",summary:"Automatically sells generated pumpkins for cash.",rules:["One-time purchase: $650.","After purchase, click the Auto-Sell card in Misc to switch it on or off without paying again.","Auto-Sell empties stored pumpkins every 60 seconds of active play. Its on/off setting is saved, but prestige resets the purchase. While inactive, production accumulates as pumpkins instead of cash."]};
 }
 if(it.type==="daily")return {id:"daily-candy",title:"Daily Candy",kind:"candy",summary:"Claim a free random candy once per local day.",rules:["Opens with a shake and pop animation.","Also grants a cash reward and up to 10 pumpkins.","The candy bonus lasts one hour.","A new claim becomes available when the local date changes."]};
 if(it.type==="buyCandy")return {id:"buy-candy",title:"Buy Random Candy",kind:"candy",summary:"Spend $"+candyPriceLabel()+" for a random one-hour bonus.",rules:["Each purchase reveals a random candy.","The effect starts after the reveal animation.","Different candies can be active together.","Getting the same candy again refreshes its timer."]};
 if(it.type==="sell")return {id:"sell-pumpkins",title:"Sell Pumpkins",kind:"action",summary:"Convert stored pumpkins into cash.",rules:["Standard price is $1 per pumpkin.","Peppermint doubles sale value while active.","Selling creates room for more production."]};
 return {id:"farm-guide",title:"Farm Guide",kind:"help",summary:d.desc,rules:["Choose a building from the Build tab.","Then click an empty farm tile to place it.","Hover a tile for its specific rules."]};
}
function getFarmHoverInfo(o,r,c){
 if(!o){
  const selected=selectedBuild&&buildings.find(v=>v.id===selectedBuild);
  return {id:"tile:"+r+":"+c,title:"Empty farm tile",kind:"tile",summary:selected?"Ready to place "+selected.name+".":"Nothing planted here yet.",rules:selected?["Placement cost: $"+formatNumber(buildCost(selected))+".","Click this tile to place the selected building.","Press Escape or reselect the item to cancel."]:["Choose a building from the Build tab to place it.","Farm size expands with each prestige.","The farm grid scrolls vertically when it outgrows the screen."]};
 }
 if(o.kind==="vine"){const cost=vineClearCost();
   return {id:"tile-vine:"+r+":"+c,title:"Vines • Blocked Tile",kind:"tile",summary:"Pay $"+formatNumber(cost)+" to clear this tile.",rules:["Vines block building placement.","Click this tile and pay $"+formatNumber(cost)+" to remove it.","Each vine removed permanently increases the next removal cost by 10×.","Delete / Sell also removes vines at the same current price, without a refund."]};
   }
 if(o.kind==="generator"){
  const g=generators[o.tier],rate=generatorRate(o),vaults=generatorDestinations(o),dest=vaults.map(v=>"Vault ("+(v.row+1)+","+(v.col+1)+")").concat(["Base storage"]),size=generatorSize(o);
  return {id:"tile-object:"+o.row+":"+o.col,title:(o.hyper?"Hyper ":o.ultra?"Ultra ":o.mega?"Mega ":"")+g.name,kind:"tile",summary:"Output: "+formatNumber(rate)+" pumpkins/sec."+(o.clogged?" STALLED — storage is full.":""),rules:[size>1?"Occupies a "+size+"×"+size+" area and can be fragmented back into individual generators.":"Occupies one tile and grows a pumpkin on its generator pot.","Storage priority: "+dest.join(" → ")+".","Vault zones are 3×3; overlapping vaults are ordered top-to-bottom, then left-to-right.","When every assigned vault and base storage are full, this generator stalls at full growth.","Use the highlighted MERGE buttons to combine matching basic generators: 4 in a 2×2 square for a Mega, 9 in a 3×3 square for an Ultra, or 25 in a 5×5 square for a Hyper. Existing merged generators cannot be merged again."]};
 }
 if(o.kind==="multiplier"||o.kind==="shield")return {id:"tile-object:"+o.row+":"+o.col,title:"Multiplier",kind:"tile",summary:"Boosts directly adjacent pumpkin generators.",rules:["Only up, down, left and right adjacent tiles are affected.","Diagonal generators receive no bonus.","Adjacent multipliers stack with diminishing returns."]};
 if(o.kind==="vault"){const level=Math.max(0,o.level||0),cost=vaultUpgradeCost(level),stored=Number(o.stored)||0,cap=vaultCapacity(o);
   return {id:"tile-object:"+o.row+":"+o.col,title:"Vault • Level "+(level+1),kind:"tile",summary:formatNumber(stored)+" / "+formatNumber(cap)+" pumpkins stored.",rules:["Click the vault to upgrade it for $"+formatNumber(cost)+".","Capacity follows the storage curve: 50, 125, 250, 500, 1,000, 3,500, then 7.5M through 500M at higher levels.","Its zone is a 3×3 area centered on this vault.","Generators in multiple zones fill vaults in row-major order, then base storage.","Base storage capacity (50 by default) is increased by Monster and Brute workers."]};
   }
 return {id:"tile:"+r+":"+c,title:"Farm tile",kind:"tile",summary:"A farm building.",rules:["Click for its interaction.","Place new buildings only on empty tiles."]};
}
function finishHover(){
 let found=null;
 if(!candyOpening){
  for(let i=targets.length-1;i>=0;i--){const t=targets[i];if(mouseX>=t.x&&mouseX<=t.x+t.w&&mouseY>=t.y&&mouseY<=t.y+t.h){found=t;break;}}
 }
 if(!found||!found.hover){hoverId="";hoverTarget=null;return;}
 if(hoverId!==found.id){hoverId=found.id;hoverSince=millis();}
 hoverTarget=found;
 const isShopItem=found.x<width*.45&&found.hover.kind!=="tile";
   if(found.hover.id!=="main-pumpkin"&&!isShopItem){noStroke();
   fill(255,165,0,22);
   rect(found.x,found.y,found.w,found.h);
   if(found.hover.kind==="tile"){stroke(orange);
     strokeWeight(2);
     noFill();
     rect(found.x,found.y,found.w,found.h);
     }}
 if(millis()-hoverSince>=480)drawHoverPanel(found.hover);
}
function drawHoverPanel(info){
 const panelW=Math.min(270,width-20),pad=9,innerW=panelW-pad*2,maxH=Math.max(40,height-20);
 const wrap=(value,size,maxWidth=innerW)=>{
  const words=String(value||"").split(/\s+/).filter(Boolean),out=[];let line="";
  textSize(size);
  for(const word of words){const next=line?line+" "+word:word;if(line&&textWidth(next)>maxWidth){out.push(line);line=word;}else line=next;}
  if(line)out.push(line);
  return out;
 };
 const titleLines=wrap(info.title||"Details",13);
 const summaryLines=wrap(info.summary||"",10);
 let ruleLines=[];
 (info.rules||[]).forEach(rule=>{const wrapped=wrap(rule,9,Math.max(1,innerW-textWidth("• ")));
   wrapped.forEach((line,i)=>ruleLines.push((i===0?"• ":"  ")+line));
   });
 const titleLineH=16,summaryLineH=13,ruleLineH=12;
 const fixedH=8+titleLines.length*titleLineH+4+summaryLines.length*summaryLineH+7+8;
 const maxRuleLines=Math.max(0,Math.floor((maxH-fixedH)/ruleLineH));
 if(ruleLines.length>maxRuleLines){
  ruleLines=ruleLines.slice(0,maxRuleLines);
  if(ruleLines.length){let last=ruleLines[ruleLines.length-1].replace(/…+$/,"");
    textSize(9);
    while(last.length&&textWidth(last+"…")>innerW)last=last.slice(0,-1);
    ruleLines[ruleLines.length-1]=last+"…";
    }
 }
 const panelH=Math.min(maxH,fixedH+ruleLines.length*ruleLineH);
 let x=mouseX+20,y=mouseY+18;if(x+panelW>width-6)x=mouseX-panelW-18;if(x<6)x=6;
 if(y+panelH>height-6)y=mouseY-panelH-16;if(y<6)y=6;
 fill("#172414");stroke(orange);strokeWeight(2);rect(x,y,panelW,panelH);
 noStroke();fill(orange);textAlign(LEFT,TOP);textSize(13);let ly=y+8;
 titleLines.forEach(line=>{text(line,x+pad,ly);ly+=titleLineH;});
 fill(white);textSize(10);ly+=4;summaryLines.forEach(line=>{text(line,x+pad,ly);ly+=summaryLineH;});
 const dividerY=ly+3;stroke("#526843");strokeWeight(1);line(x+pad,dividerY,x+panelW-pad,dividerY);
 noStroke();fill("#bdc9a9");textSize(9);ly=dividerY+5;
 ruleLines.forEach(line=>{text(line,x+pad,ly);ly+=ruleLineH;});
}

function showToast(s) {
  toastMessage = s;
  toastEnd = millis() + 2500;
}
function drawToast(L){
  const y=L.H-23,w=Math.min(L.W-20,Math.max(150,toastMessage.length*6.5+26)),x=(L.W-w)/2;
  fill(black);
  stroke(orange);
  strokeWeight(1.5);
  rect(x,y,w,19);
  noStroke();
  fill(white);
  textAlign(CENTER,CENTER);
  textSize(10);
  text(toastMessage,x+w/2,y+9.5);
  }
function isShiftClick() {
  return shiftHeld || keyIsDown(16);
}
function purchaseLimit() {
  return isShiftClick() ? 10 : clickBuyMode === "MAX" ? Infinity : Math.max(1, Math.floor(Number(clickBuyMode) || 1));
}
function mousePressed(event){
  shiftHeld=!!(event&&event.shiftKey)||keyIsDown(16);
  for(let i=targets.length-1;i>=0;i--){const t=targets[i];
    if(candyOpening&&!t.modal)continue;
    if(mouseX>=t.x&&mouseX<=t.x+t.w&&mouseY>=t.y&&mouseY<=t.y+t.h){t.fn();
      return false;
      }}return false;
  }
function mouseWheel(e){
  if(!game||!Array.isArray(game.farm))return false;
  const L=getLayout();
  if(mouseX<L.side&&mouseY>L.top)shopScroll+=e.delta;
  else if(mouseX>=L.mainX&&mouseY>=L.gridTop)gridScroll+=e.delta;
  return false;
  }
function keyPressed(event){
  const pressedKey=String(event&&event.key||key||"").toLowerCase();
  if((event&&(event.ctrlKey||event.metaKey)||keyIsDown(17)||keyIsDown(91)||keyIsDown(93))&&pressedKey==="e"){if(!event||!event.repeat)exportGrid();
    return false;
    }if(key==="Escape"){selectedBuild=null;
    bulkPlaceRemaining=0;
    showToast("Build selection cleared");
    return false;
    }if(key==="1"){shopTab="workers";
    shopScroll=0;
    return false;
    }if(key==="2"){shopTab="build";
    shopScroll=0;
    return false;
    }if(key==="3"){shopTab="candy";
    shopScroll=0;
    return false;
    }return true;
  }
