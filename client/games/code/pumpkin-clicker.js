/*
 * Pumpkin Clicker
 * Canvas-only p5.js global-mode game for the existing /games/:game host.
 *
 * The page host supplies p5.js and injects this classic script. Every visible
 * control is drawn on the canvas and hit-tested here; no HTML UI is created.
 */
(() => {
  "use strict";

  const SAVE_KEY = "pumpkin-clicker-save-v1";
  const START_SIZE = 3;
  const MAX_SIZE = 12;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HEADER_H = 68;
  const FOOTER_H = 96;
  const PANEL_PAD = 12;
  const TIER_DATA = [
    { id: "green", name: "Green Pumpkin", short: "Green", sprite: "/assets/pumpkins/new_pumpkin.png", cost: 10, rate: 0.25, color: "#8fbd56" },
    { id: "regular", name: "Pumpkin", short: "Pumpkin", sprite: "/assets/pumpkins/pumpkin.png", cost: 60, rate: 1.1, color: "#ed8b32" },
    { id: "gold", name: "Gold Pumpkin", short: "Gold", sprite: "/assets/pumpkins/gold_pumpkin.png", cost: 350, rate: 5, color: "#e6bc3e" },
    { id: "diamond", name: "Diamond Pumpkin", short: "Diamond", sprite: "/assets/pumpkins/diamond_pumpkin.png", cost: 2200, rate: 24, color: "#62d5d0" }
  ];
  const WORKER_DATA = [
    { id: "monster", name: "Monster", sprite: "/assets/entities/monster/attack.png", cost: 120, description: "+0.35 base output per generator/sec", effect: "flat", value: 0.35, color: "#93bd65" },
    { id: "ghost", name: "Ghost", sprite: "/assets/entities/ghost/attack.png", cost: 450, description: "+1% output per generator owned", effect: "perGenerator", value: 0.01, color: "#b4d7ed" },
    { id: "speeder", name: "Speeder", sprite: "/assets/entities/speeder/attack.png", cost: 1200, description: "+5% production speed", effect: "speed", value: 0.05, color: "#e5d17a" },
    { id: "rusher", name: "Rusher", sprite: "/assets/entities/rusher/idle.png", cost: 3000, description: "Every 10s, bursts extra harvest", effect: "burst", value: 2, color: "#f1a36c" },
    { id: "brute", name: "Brute", sprite: "/assets/entities/brute/attack.png", cost: 7000, description: "+2 base output per generator/sec", effect: "flat", value: 2, color: "#cc8d79" },
    { id: "wizard", name: "Wizard", sprite: "/assets/entities/wizard/idle.png", cost: 18000, description: "+8% total output", effect: "mult", value: 0.08, color: "#ab91df" },
    { id: "debuffer", name: "Debuffer", sprite: "/assets/entities/debuffer/idle.png", cost: 60000, description: "Strengthens other workers by 12%", effect: "support", value: 0.12, color: "#b7a1df" }
  ];
  const UPGRADE_DATA = [
    { id: "click", name: "Stronger Clicks", description: "+1 pumpkin per objective click", baseCost: 75, max: 10, color: "#ed8b32" },
    { id: "capacity", name: "Bigger Baskets", description: "+100 pumpkin storage", baseCost: 100, max: 10, color: "#93bd65" },
    { id: "sell", name: "Better Market", description: "+10% selling price", baseCost: 250, max: 10, color: "#e6bc3e" },
    { id: "shield", name: "Shield Tuning", description: "+5% per shield before stacking falloff", baseCost: 400, max: 10, color: "#aaa0e5" }
  ];
  const ACHIEVEMENTS = [
    { id: "first_harvest", title: "First Harvest", description: "Harvest your first pumpkin", reward: 10, test: s => s.lifetimePumpkins >= 1 },
    { id: "first_generator", title: "Farmhand", description: "Plant your first generator", reward: 25, test: s => pcGeneratorCount(s) >= 1 },
    { id: "first_vault", title: "Keep It Safe", description: "Place your first vault", reward: 50, test: s => pcCountType(s, "vault") >= 1 },
    { id: "hundred_harvest", title: "Pumpkin Pile", description: "Harvest 100 pumpkins", reward: 50, test: s => s.lifetimePumpkins >= 100 },
    { id: "first_staff", title: "Help Wanted", description: "Hire your first worker", reward: 100, test: s => pcWorkerTotal(s) >= 1 },
    { id: "market_day", title: "Market Day", description: "Sell 100 pumpkins", reward: 100, test: s => s.totalSold >= 100 },
    { id: "thousand_harvest", title: "Pumpkin Patch", description: "Harvest 1,000 pumpkins", reward: 250, test: s => s.lifetimePumpkins >= 1000 },
    { id: "mega", title: "Going Mega", description: "Evolve four generators into a mega-generator", reward: 500, test: s => pcCountType(s, "mega") >= 1 },
    { id: "ten_thousand", title: "Pumpkin Empire", description: "Harvest 10,000 pumpkins", reward: 1000, test: s => s.lifetimePumpkins >= 10000 },
    { id: "prestige", title: "A New Season", description: "Prestige for the first time", reward: 2500, test: s => s.prestige >= 1 }
  ];

  let pcState = null;
  let pcImages = {};
  let pcLayout = null;
  let pcHits = [];
  let pcSelected = { x: 0, y: 0 };
  let pcBuildMode = null;
  let pcActiveTab = "build";
  let pcShopScroll = { build: 0, workers: 0, upgrades: 0, stats: 0 };
  let pcNotice = "";
  let pcNoticeUntil = 0;
  let pcClickPulseUntil = 0;
  let pcLastTick = 0;
  let pcLastSave = 0;
  let pcLastRusher = 0;
  let pcLastUiRefresh = 0;
  let pcModal = null;
  let pcLastPointer = { x: -1000, y: -1000 };
  let pcSessionStart = Date.now();
  let pcLastAutoSell = 0;

  const pcEmptyTile = () => ({ type: "empty" });
  const pcFreshState = () => ({
    version: 2,
    cash: 250,
    pumpkins: 0,
    lifetimePumpkins: 0,
    lifetimeCash: 0,
    totalSold: 0,
    clicks: 0,
    size: START_SIZE,
    tiles: Array(START_SIZE * START_SIZE).fill(null).map(pcEmptyTile),
    workers: {},
    upgrades: {},
    achievements: {},
    prestige: 0,
    prestigeBonus: 0,
    autoSell: false,
    lastSeen: Date.now(),
    lastDailyDay: "",
    boostUntil: 0,
    totalPlaySeconds: 0
  });

  function pcGetDayKey(timestamp) {
    const d = new Date(timestamp || Date.now());
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function pcLoadState() {
    const base = pcFreshState();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return base;
      const s = Object.assign(base, saved);
      s.size = Math.max(START_SIZE, Math.min(MAX_SIZE, Math.floor(Number(s.size) || START_SIZE)));
      if (!Array.isArray(s.tiles)) s.tiles = [];
      while (s.tiles.length < s.size * s.size) s.tiles.push(pcEmptyTile());
      s.tiles = s.tiles.slice(0, s.size * s.size).map(t => t && typeof t === "object" && typeof t.type === "string" ? t : pcEmptyTile());
      s.workers = s.workers && typeof s.workers === "object" ? s.workers : {};
      s.upgrades = s.upgrades && typeof s.upgrades === "object" ? s.upgrades : {};
      s.achievements = s.achievements && typeof s.achievements === "object" ? s.achievements : {};
      s.cash = Math.max(0, Number(s.cash) || 0);
      s.pumpkins = Math.max(0, Number(s.pumpkins) || 0);
      s.lifetimePumpkins = Math.max(s.pumpkins, Number(s.lifetimePumpkins) || 0);
      s.lifetimeCash = Math.max(0, Number(s.lifetimeCash) || 0);
      s.totalSold = Math.max(0, Number(s.totalSold) || 0);
      s.prestige = Math.max(0, Math.floor(Number(s.prestige) || 0));
      s.prestigeBonus = Math.max(Number(s.prestigeBonus) || 0, s.prestige * 0.25);
      s.lastSeen = Number(s.lastSeen) || Date.now();
      s.boostUntil = Number(s.boostUntil) || 0;
      const elapsed = Math.max(0, (Date.now() - s.lastSeen) / 1000);
      s.pumpkins = Math.min(pcStorageCapacity(s), s.pumpkins + pcDeliveredRate(s) * elapsed);
      s.lifetimePumpkins += Math.max(0, s.pumpkins - Number(saved.pumpkins || 0));
      s.lastSeen = Date.now();
      return s;
    } catch (error) {
      console.warn("Could not load Pumpkin Clicker save; starting a new farm.", error);
      return base;
    }
  }

  function pcSaveState() {
    if (!pcState) return;
    pcState.lastSeen = Date.now();
    pcState.autoSell = !!pcState.autoSell;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(pcState));
    } catch (error) {
      pcNoticeNow("Save failed. Browser storage may be full or unavailable.");
      console.warn("Pumpkin Clicker save failed", error);
    }
  }

  function pcFormat(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n < 1000) return n < 10 ? String(Math.round(n * 10) / 10) : Math.floor(n).toLocaleString();
    const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];
    let scaled = n;
    let index = -1;
    while (scaled >= 1000 && index < units.length - 1) {
      scaled /= 1000;
      index++;
    }
    return scaled >= 1000 ? n.toExponential(2) : scaled.toFixed(scaled < 10 ? 2 : 1) + units[index];
  }

  function pcMoney(value) {
    return "$" + pcFormat(value);
  }

  function pcNoticeNow(message) {
    pcNotice = String(message || "");
    pcNoticeUntil = Date.now() + 5200;
  }

  function pcCountType(s, type) {
    return s.tiles.reduce((n, tile) => n + (tile && tile.type === type ? 1 : 0), 0);
  }

  function pcGeneratorCount(s) {
    return s.tiles.reduce((n, tile) => n + (tile && tile.type === "generator" ? 1 : tile && tile.type === "mega" ? Math.pow(Number(tile.size) || 2, 2) : 0), 0);
  }

  function pcWorkerCount(s, id) {
    return Math.max(0, Math.floor(Number(s.workers[id]) || 0));
  }

  function pcWorkerTotal(s) {
    return Object.keys(s.workers || {}).reduce((n, id) => n + pcWorkerCount(s, id), 0);
  }

  function pcUpgradeLevel(s, id) {
    return Math.max(0, Math.min(100, Math.floor(Number(s.upgrades[id]) || 0)));
  }

  function pcStorageCapacity(s) {
    return 100 + pcUpgradeLevel(s, "capacity") * 100 + pcCountType(s, "vault") * 250;
  }

  function pcTier(id) {
    return TIER_DATA.find(t => t.id === id) || TIER_DATA[0];
  }

  function pcTileCost(s, id) {
    if (id === "shield" || id === "vault") {
      const count = pcCountType(s, id);
      return Math.floor((id === "shield" ? 90 : 140) * Math.pow(1.28, count));
    }
    const tier = pcTier(id);
    const scaling = Math.pow(1.17, pcGeneratorCount(s) * 0.65 + pcCountType(s, "mega") * 1.3);
    return Math.floor(tier.cost * scaling);
  }

  function pcWorkerCost(s, id) {
    const worker = WORKER_DATA.find(w => w.id === id);
    return worker ? Math.floor(worker.cost * Math.pow(1.55, pcWorkerCount(s, id))) : Infinity;
  }

  function pcUpgradeCost(s, upgrade) {
    const level = pcUpgradeLevel(s, upgrade.id);
    return level >= upgrade.max ? Infinity : Math.floor(upgrade.baseCost * Math.pow(1.65, level));
  }

  function pcWorkerSupport(s) {
    return 1 + pcWorkerCount(s, "debuffer") * 0.12;
  }

  function pcShieldCountAt(s, x, y) {
    let count = 0;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(s.size - 1, y + 1); yy++) {
      for (let xx = Math.max(0, x - 1); xx <= Math.min(s.size - 1, x + 1); xx++) {
        if (s.tiles[yy * s.size + xx].type === "shield") count++;
      }
    }
    return count;
  }

  function pcShieldMultiplier(s, x, y) {
    const count = pcShieldCountAt(s, x, y);
    if (!count) return 1;
    const perShield = 0.15 + pcUpgradeLevel(s, "shield") * 0.05;
    const bonus = count * perShield / (1 + Math.max(0, count - 1) * 0.6);
    return 1 + bonus;
  }

  function pcMegaBasePerSlot(tile) {
    const slots = Math.pow(Number(tile.size) || 2, 2);
    if (Number(tile.rate) > 0) return Number(tile.rate) / slots;
    return pcTier(tile.tier).rate * 1.35;
  }

  function pcGeneratorRecords(s) {
    const generatorSlots = pcGeneratorCount(s);
    const support = pcWorkerSupport(s);
    const flatPerSlot = (pcWorkerCount(s, "monster") * 0.35 + pcWorkerCount(s, "brute") * 2) * support;
    const speedMultiplier = 1 + pcWorkerCount(s, "speeder") * 0.05 * support;
    const ghostMultiplier = 1 + pcWorkerCount(s, "ghost") * 0.01 * generatorSlots * support;
    const wizardMultiplier = 1 + pcWorkerCount(s, "wizard") * 0.08 * support;
    const globalMultiplier = speedMultiplier * ghostMultiplier * wizardMultiplier * (1 + Math.max(0, Number(s.prestigeBonus) || 0)) * (Date.now() < Number(s.boostUntil || 0) ? 1.5 : 1);
    const records = [];
    for (let i = 0; i < s.tiles.length; i++) {
      const tile = s.tiles[i];
      if (!tile || (tile.type !== "generator" && tile.type !== "mega")) continue;
      const x = i % s.size;
      const y = Math.floor(i / s.size);
      const slots = tile.type === "mega" ? Math.max(1, Math.pow(Number(tile.size) || 2, 2)) : 1;
      const perSlotBase = tile.type === "mega" ? pcMegaBasePerSlot(tile) : pcTier(tile.tier).rate * Math.max(1, Number(tile.level) || 1);
      let shieldedBase = 0;
      for (let sy = y; sy < Math.min(s.size, y + (tile.type === "mega" ? 2 : 1)); sy++) {
        for (let sx = x; sx < Math.min(s.size, x + (tile.type === "mega" ? 2 : 1)); sx++) {
          const base = perSlotBase + flatPerSlot;
          shieldedBase += base * pcShieldMultiplier(s, sx, sy);
        }
      }
      let connected = false;
      const span = tile.type === "mega" ? 2 : 1;
      for (let vy = 0; vy < s.size && !connected; vy++) {
        for (let vx = 0; vx < s.size && !connected; vx++) {
          if (s.tiles[vy * s.size + vx].type !== "vault") continue;
          for (let gy = y; gy < Math.min(s.size, y + span) && !connected; gy++) {
            for (let gx = x; gx < Math.min(s.size, x + span); gx++) {
              if (Math.abs(vx - gx) + Math.abs(vy - gy) === 1) { connected = true; break; }
            }
          }
        }
      }
      records.push({
        index: i, x, y, tile, slots, connected,
        baseRate: shieldedBase,
        rate: Math.max(0, shieldedBase * globalMultiplier)
      });
    }
    return records;
  }

  function pcDeliveredRate(s) {
    return pcGeneratorRecords(s).reduce((sum, record) => sum + (record.connected ? record.rate : 0), 0);
  }

  function pcPotentialRate(s) {
    return pcGeneratorRecords(s).reduce((sum, record) => sum + record.rate, 0);
  }

  function pcSellPrice(s) {
    return 1 + pcUpgradeLevel(s, "sell") * 0.1;
  }

  function pcSellAll(showMessage) {
    if (pcState.pumpkins <= 0.000001) {
      if (showMessage !== false) pcNoticeNow("There are no pumpkins to sell yet.");
      return false;
    }
    const quantity = pcState.pumpkins;
    const earned = quantity * pcSellPrice(pcState);
    pcState.pumpkins = 0;
    pcState.cash += earned;
    pcState.lifetimeCash += earned;
    pcState.totalSold += quantity;
    if (showMessage !== false) pcNoticeNow("Sold " + pcFormat(quantity) + " pumpkins for " + pcMoney(earned) + ".");
    pcSaveState();
    return true;
  }

  function pcHarvestClick() {
    const requested = 1 + pcUpgradeLevel(pcState, "click");
    const available = Math.max(0, pcStorageCapacity(pcState) - pcState.pumpkins);
    const gained = Math.min(requested, available);
    if (gained <= 0) {
      pcNoticeNow("Storage is full. Sell pumpkins or add vaults/upgrades.");
      return;
    }
    pcState.pumpkins += gained;
    pcState.lifetimePumpkins += gained;
    pcState.clicks++;
    pcClickPulseUntil = Date.now() + 650;
    pcCheckAchievements();
    pcSaveState();
  }

  function pcSelectBuild(id) {
    if (pcBuildMode === id) {
      pcBuildMode = null;
      pcNoticeNow("Building selection cleared.");
      return;
    }
    const cost = pcTileCost(pcState, id);
    if (pcState.cash < cost) {
      pcNoticeNow("Not enough cash for " + (TIER_DATA.find(t => t.id === id) || { name: id }).name + ".");
      return;
    }
    pcBuildMode = id;
    pcNoticeNow("Selected " + pcBuildName(id) + ". Tap an empty farm tile to place it.");
  }

  function pcBuildName(id) {
    const tier = TIER_DATA.find(t => t.id === id);
    if (tier) return tier.name;
    return id === "shield" ? "Shield" : id === "vault" ? "Vault" : "building";
  }

  function pcPlaceAt(x, y) {
    if (x < 0 || y < 0 || x >= pcState.size || y >= pcState.size) return;
    const index = y * pcState.size + x;
    const tile = pcState.tiles[index];
    if (tile.type === "occupied") {
      const anchor = Number(tile.anchor);
      pcSelected = { x: anchor % pcState.size, y: Math.floor(anchor / pcState.size) };
      pcNoticeNow("That tile belongs to a mega-generator. Its top-left tile is selected.");
      return;
    }
    if (tile.type !== "empty") {
      pcSelected = { x, y };
      if (tile.type === "generator") pcNoticeNow(pcTier(tile.tier).name + " · " + pcFormat(pcTier(tile.tier).rate) + " base/sec.");
      else if (tile.type === "mega") pcNoticeNow("Mega-" + pcTier(tile.tier).name + " · " + pcFormat(tile.rate || 0) + " base/sec across four tiles.");
      else if (tile.type === "vault") pcNoticeNow("Vault · +250 storage. It collects only from orthogonally adjacent generators.");
      else if (tile.type === "shield") pcNoticeNow("Shield · boosts generators in its 3×3 area, diagonals included.");
      return;
    }
    if (!pcBuildMode) {
      pcSelected = { x, y };
      pcNoticeNow("Choose a building from the Build tab first.");
      return;
    }
    const cost = pcTileCost(pcState, pcBuildMode);
    if (pcState.cash < cost) {
      pcNoticeNow("Not enough cash. You need " + pcMoney(cost) + ".");
      return;
    }
    pcState.cash -= cost;
    if (TIER_DATA.some(t => t.id === pcBuildMode)) {
      pcState.tiles[index] = { type: "generator", tier: pcBuildMode, level: 1 };
    } else if (pcBuildMode === "shield") {
      pcState.tiles[index] = { type: "shield" };
    } else if (pcBuildMode === "vault") {
      pcState.tiles[index] = { type: "vault", capacity: 250 };
    }
    pcSelected = { x, y };
    pcNoticeNow(pcBuildName(pcBuildMode) + " placed for " + pcMoney(cost) + ".");
    pcCheckAchievements();
    pcSaveState();
  }

  function pcCanEvolve(x, y) {
    if (x < 0 || y < 0 || x + 1 >= pcState.size || y + 1 >= pcState.size) return null;
    const indexes = [y * pcState.size + x, y * pcState.size + x + 1, (y + 1) * pcState.size + x, (y + 1) * pcState.size + x + 1];
    const tiles = indexes.map(i => pcState.tiles[i]);
    if (!tiles.every(t => t && t.type === "generator" && t.tier === tiles[0].tier)) return null;
    return { indexes, tiles, tier: tiles[0].tier, x, y };
  }

  function pcEvolveSelected() {
    const candidate = pcCanEvolve(pcSelected.x, pcSelected.y);
    if (!candidate) {
      pcNoticeNow("Select the top-left tile of a 2×2 square of four same-tier generators.");
      return;
    }
    const tier = pcTier(candidate.tier);
    const anchor = candidate.indexes[0];
    pcState.tiles[anchor] = { type: "mega", tier: tier.id, size: 2, rate: candidate.tiles.reduce((sum, tile) => sum + tier.rate * Math.max(1, Number(tile.level) || 1), 0) * 1.35, level: 1 };
    for (const idx of candidate.indexes.slice(1)) pcState.tiles[idx] = { type: "occupied", anchor };
    pcNoticeNow("Mega-generator evolved! Four " + tier.short.toLowerCase() + " generators now produce 1.35× their combined base output.");
    pcCheckAchievements();
    pcSaveState();
  }

  function pcWorkerHire(id) {
    const worker = WORKER_DATA.find(w => w.id === id);
    if (!worker) return;
    const cost = pcWorkerCost(pcState, id);
    if (pcState.cash < cost) {
      pcNoticeNow("Not enough cash to hire " + worker.name + ".");
      return;
    }
    pcState.cash -= cost;
    pcState.workers[id] = pcWorkerCount(pcState, id) + 1;
    pcNoticeNow(worker.name + " hired. It is a one-time purchase; workers have no wages.");
    pcCheckAchievements();
    pcSaveState();
  }

  function pcBuyUpgrade(id) {
    const upgrade = UPGRADE_DATA.find(u => u.id === id);
    if (!upgrade) return;
    const level = pcUpgradeLevel(pcState, id);
    if (level >= upgrade.max) {
      pcNoticeNow(upgrade.name + " is already maxed.");
      return;
    }
    const cost = pcUpgradeCost(pcState, upgrade);
    if (pcState.cash < cost) {
      pcNoticeNow("Not enough cash for " + upgrade.name + ".");
      return;
    }
    pcState.cash -= cost;
    pcState.upgrades[id] = level + 1;
    pcNoticeNow(upgrade.name + " upgraded to level " + (level + 1) + ".");
    pcSaveState();
  }

  function pcClaimDaily() {
    const today = pcGetDayKey(Date.now());
    if (pcState.lastDailyDay === today) {
      pcNoticeNow("Today's Candy Bag is already claimed. Come back after the daily reset.");
      return;
    }
    pcState.lastDailyDay = today;
    const rewards = [
      { name: "$500 cash", apply: () => { pcState.cash += 500; pcState.lifetimeCash += 500; } },
      { name: "+50% output for 10 minutes", apply: () => { pcState.boostUntil = Date.now() + 10 * 60 * 1000; } },
      { name: "bonus pumpkins", apply: () => { pcState.pumpkins = Math.min(pcStorageCapacity(pcState), pcState.pumpkins + Math.min(1000, pcStorageCapacity(pcState) - pcState.pumpkins)); } },
      { name: "$2,500 cash", apply: () => { pcState.cash += 2500; pcState.lifetimeCash += 2500; } },
      { name: "+50% output for 30 minutes", apply: () => { pcState.boostUntil = Date.now() + 30 * 60 * 1000; } }
    ];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    reward.apply();
    pcNoticeNow("Daily Candy Bag: " + reward.name + "!");
    pcSaveState();
  }

  function pcDoPrestige() {
    const threshold = 1000000 * Math.pow(5, pcState.prestige);
    if (pcState.lifetimePumpkins < threshold) {
      pcNoticeNow("Prestige unlocks at " + pcFormat(threshold) + " lifetime pumpkins harvested.");
      return;
    }
    pcModal = "prestige";
  }

  function pcConfirmPrestige() {
    const nextPrestige = pcState.prestige + 1;
    const nextBonus = pcState.prestigeBonus + 0.25;
    const nextSize = Math.min(MAX_SIZE, START_SIZE + nextPrestige);
    const lifetimePumpkins = pcState.lifetimePumpkins;
    const lifetimeCash = pcState.lifetimeCash;
    const totalSold = pcState.totalSold;
    const clicks = pcState.clicks;
    const achievements = pcState.achievements;
    const totalPlaySeconds = pcState.totalPlaySeconds;
    pcState = pcFreshState();
    pcState.prestige = nextPrestige;
    pcState.prestigeBonus = nextBonus;
    pcState.size = nextSize;
    pcState.tiles = Array(nextSize * nextSize).fill(null).map(pcEmptyTile);
    pcState.lifetimePumpkins = lifetimePumpkins;
    pcState.lifetimeCash = lifetimeCash;
    pcState.totalSold = totalSold;
    pcState.clicks = clicks;
    pcState.achievements = achievements;
    pcState.totalPlaySeconds = totalPlaySeconds;
    pcBuildMode = null;
    pcSelected = { x: 0, y: 0 };
    pcShopScroll = { build: 0, workers: 0, upgrades: 0, stats: 0 };
    pcModal = null;
    pcNoticeNow("Prestige " + nextPrestige + "! Permanent +25% production and a larger farm.");
    pcSaveState();
  }

  function pcDemolishSelected() {
    const x = pcSelected.x, y = pcSelected.y;
    const index = y * pcState.size + x;
    const tile = pcState.tiles[index];
    if (!tile || tile.type === "empty" || tile.type === "occupied") {
      pcNoticeNow("Select a building to demolish.");
      return;
    }
    pcModal = "demolish";
  }

  function pcConfirmDemolish() {
    const x = pcSelected.x, y = pcSelected.y;
    const index = y * pcState.size + x;
    const tile = pcState.tiles[index];
    if (!tile || tile.type === "empty" || tile.type === "occupied") { pcModal = null; return; }
    let refund = 0;
    if (tile.type === "generator") refund = pcTier(tile.tier).cost * 0.35;
    if (tile.type === "shield") refund = 90 * 0.35;
    if (tile.type === "vault") refund = 140 * 0.35;
    if (tile.type === "mega") {
      const span = Math.max(1, Number(tile.size) || 2);
      for (let yy = y; yy < Math.min(pcState.size, y + span); yy++) {
        for (let xx = x; xx < Math.min(pcState.size, x + span); xx++) pcState.tiles[yy * pcState.size + xx] = pcEmptyTile();
      }
    } else pcState.tiles[index] = pcEmptyTile();
    pcState.cash += refund;
    pcState.lifetimeCash += refund;
    pcBuildMode = null;
    pcModal = null;
    pcNoticeNow("Building removed. Refund: " + pcMoney(refund) + ".");
    pcSaveState();
  }

  function pcCheckAchievements() {
    for (const achievement of ACHIEVEMENTS) {
      if (pcState.achievements[achievement.id]) continue;
      let complete = false;
      try { complete = !!achievement.test(pcState); } catch (_) {}
      if (!complete) continue;
      pcState.achievements[achievement.id] = Date.now();
      pcState.cash += achievement.reward;
      pcState.lifetimeCash += achievement.reward;
      pcNoticeNow("Achievement: " + achievement.title + " · reward " + pcMoney(achievement.reward) + "!");
    }
  }

  function pcFormatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + sec + "s";
    return sec + "s";
  }

  function pcRegisterHit(id, x, y, w, h, action, options) {
    pcHits.push({ id, x, y, w, h, action, options: options || {} });
  }

  function pcInside(x, y, box) {
    return !!box && x >= box.x && y >= box.y && x <= box.x + box.w && y <= box.y + box.h;
  }

  function pcButton(x, y, w, h, label, action, options) {
    const opts = options || {};
    const hovered = pcLastPointer.x >= x && pcLastPointer.x <= x + w && pcLastPointer.y >= y && pcLastPointer.y <= y + h;
    const disabled = !!opts.disabled;
    noStroke();
    fill(disabled ? "#344239" : opts.active ? "#627f47" : hovered ? "#617d4b" : "#344d38");
    rect(x, y, w, h, Math.min(9, h / 4));
    stroke(disabled ? "#4a5a4e" : opts.active ? "#e9ce77" : hovered ? "#b5cd88" : "#637b5b");
    strokeWeight(opts.active ? 2.5 : 1);
    noFill();
    rect(x + 1, y + 1, w - 2, h - 2, Math.min(8, h / 4));
    noStroke();
    fill(disabled ? "#839184" : "#f6f0d8");
    textAlign(CENTER, CENTER);
    textStyle(opts.bold === false ? NORMAL : BOLD);
    textSize(Math.max(9, Math.min(opts.textSize || 13, h * 0.34, w / Math.max(5, label.length * 0.56))));
    text(label, x + w / 2, y + h / 2, Math.max(8, w - 8), h - 4);
    textStyle(NORMAL);
    if (action) pcRegisterHit(opts.id || label, x, y, w, h, action, { disabled });
  }

  function pcPanel(box, title, subtitle) {
    noStroke();
    fill("#1c2b20");
    rect(box.x, box.y, box.w, box.h, 12);
    stroke("#4c6944");
    strokeWeight(1);
    noFill();
    rect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1, 12);
    noStroke();
    fill("#f6edcd");
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(16);
    text(title, box.x + PANEL_PAD, box.y + 20);
    textStyle(NORMAL);
    if (subtitle) {
      fill("#b7c3a9");
      textSize(10);
      text(subtitle, box.x + PANEL_PAD, box.y + 39);
    }
  }

  function pcDrawHeader() {
    noStroke();
    fill("#17251b");
    rect(0, 0, width, HEADER_H);
    fill("#f5e8bd");
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(width < 520 ? 17 : 21);
    text("PUMPKIN CLICKER", 16, 20);
    textStyle(NORMAL);
    fill("#b7c5ad");
    textSize(10);
    text("Grow · harvest · sell · prestige", 17, 43);

    const stats = [
      { label: "CASH", value: pcMoney(pcState.cash) },
      { label: "PUMPKINS", value: pcFormat(pcState.pumpkins) + " / " + pcFormat(pcStorageCapacity(pcState)) },
      { label: "OUTPUT", value: pcFormat(pcDeliveredRate(pcState)) + "/s" },
      { label: "PRESTIGE", value: String(pcState.prestige) + " · +" + Math.round(pcState.prestigeBonus * 100) + "%" }
    ];
    const rightMargin = 14;
    const left = Math.min(width * 0.31, width < 700 ? width * 0.32 : 340);
    const x0 = left;
    const gap = 7;
    const statW = Math.max(58, (width - x0 - rightMargin - gap * 3) / 4);
    for (let i = 0; i < stats.length; i++) {
      const x = x0 + i * (statW + gap);
      const boxW = Math.min(statW, width - x - rightMargin);
      if (boxW < 45) continue;
      fill("#283b2b");
      rect(x, 12, boxW, 44, 8);
      fill("#aabb9a");
      textAlign(LEFT, CENTER);
      textSize(9);
      text(stats[i].label, x + 8, 23);
      fill("#fff0c5");
      textStyle(BOLD);
      textSize(Math.min(13, Math.max(9, boxW / Math.max(6, stats[i].value.length * 0.55))));
      text(stats[i].value, x + 8, 42);
      textStyle(NORMAL);
    }
    const capacity = pcStorageCapacity(pcState);
    fill("#435743");
    rect(0, HEADER_H - 3, width, 3);
    fill("#edb55d");
    rect(0, HEADER_H - 3, width * Math.min(1, pcState.pumpkins / Math.max(1, capacity)), 3);
  }

  function pcCalculateLayout() {
    const footer = Math.min(FOOTER_H, Math.max(78, height * 0.17));
    const body = { x: 12, y: HEADER_H + 8, w: Math.max(100, width - 24), h: Math.max(110, height - HEADER_H - footer - 20) };
    let farm, shop;
    if (width >= 900) {
      const shopW = Math.min(390, Math.max(320, body.w * 0.34));
      farm = { x: body.x, y: body.y, w: body.w - shopW - 10, h: body.h };
      shop = { x: farm.x + farm.w + 10, y: body.y, w: shopW, h: body.h };
    } else {
      const farmH = Math.max(180, Math.min(body.h * 0.54, body.w * 0.78));
      farm = { x: body.x, y: body.y, w: body.w, h: Math.min(farmH, body.h) };
      shop = { x: body.x, y: farm.y + farm.h + 8, w: body.w, h: Math.max(75, body.y + body.h - farm.y - farm.h - 8) };
    }
    const boardTop = farm.y + 48;
    const boardBottom = farm.y + farm.h - 52;
    const boardW = Math.max(40, farm.w - 28);
    const boardH = Math.max(40, boardBottom - boardTop);
    const cell = Math.max(14, Math.min(boardW / pcState.size, boardH / pcState.size));
    const gridW = cell * pcState.size;
    const gridH = cell * pcState.size;
    pcLayout = {
      body, farm, shop, footer,
      board: { x: farm.x + (farm.w - gridW) / 2, y: boardTop + (boardH - gridH) / 2, w: gridW, h: gridH, cell },
      shopContent: { x: shop.x + 10, y: shop.y + 76, w: shop.w - 20, h: Math.max(20, shop.h - 86) },
      footerY: height - footer + 3
    };
  }

  function pcDrawFarm() {
    const box = pcLayout.farm;
    pcPanel(box, "YOUR FARM", pcState.size + " × " + pcState.size + " plot · " + pcFormat(pcGeneratorCount(pcState)) + " generator slots · " + pcCountType(pcState, "mega") + " mega");
    const board = pcLayout.board;
    const cell = board.cell;
    const records = pcGeneratorRecords(pcState);
    for (let y = 0; y < pcState.size; y++) {
      for (let x = 0; x < pcState.size; x++) {
        const index = y * pcState.size + x;
        const tile = pcState.tiles[index];
        const tx = board.x + x * cell;
        const ty = board.y + y * cell;
        const selected = pcSelected.x === x && pcSelected.y === y;
        const hovered = pcLastPointer.x >= tx && pcLastPointer.x <= tx + cell && pcLastPointer.y >= ty && pcLastPointer.y <= ty + cell;
        noStroke();
        fill((x + y) % 2 === 0 ? "#527746" : "#46663c");
        rect(tx + 1, ty + 1, cell - 2, cell - 2, Math.min(5, cell * 0.12));
        if (tile.type === "generator") pcDrawGeneratorSprite(tile.tier, tx + cell / 2, ty + cell / 2, cell * 0.67);
        else if (tile.type === "shield") pcDrawShield(tx + cell / 2, ty + cell / 2, cell * 0.62);
        else if (tile.type === "vault") pcDrawVault(tx + cell / 2, ty + cell / 2, cell * 0.76);
        else if (tile.type === "mega") {
          // The 2×2 structure is drawn once, after tile backgrounds are rendered.
        } else if (tile.type === "occupied") {
          noStroke();
          fill("#30472d");
          rect(tx + cell * 0.25, ty + cell * 0.25, cell * 0.5, cell * 0.5, 3);
        } else {
          stroke("#6f8c5d");
          strokeWeight(1);
          noFill();
          rect(tx + cell * 0.34, ty + cell * 0.34, cell * 0.32, cell * 0.32, 3);
        }
        if (selected) {
          noFill();
          stroke("#ffe7a0");
          strokeWeight(Math.max(2, cell * 0.045));
          rect(tx + 2, ty + 2, cell - 4, cell - 4, Math.min(5, cell * 0.12));
        } else if (hovered) {
          noFill();
          stroke("#c9dfa2");
          strokeWeight(1.5);
          rect(tx + 2, ty + 2, cell - 4, cell - 4, Math.min(5, cell * 0.12));
        }
        pcRegisterHit("tile-" + index, tx, ty, cell, cell, () => pcPlaceAt(x, y));
      }
    }
    for (let i = 0; i < pcState.tiles.length; i++) {
      const tile = pcState.tiles[i];
      if (tile.type !== "mega") continue;
      const x = i % pcState.size, y = Math.floor(i / pcState.size);
      const tx = board.x + x * cell, ty = board.y + y * cell;
      const span = Math.min(2, pcState.size - x, pcState.size - y);
      noStroke();
      fill("#7a542b");
      rect(tx + 3, ty + 3, cell * span - 6, cell * span - 6, Math.min(9, cell * 0.15));
      stroke("#efcb6a");
      strokeWeight(Math.max(2, cell * 0.045));
      noFill();
      rect(tx + 4, ty + 4, cell * span - 8, cell * span - 8, Math.min(9, cell * 0.15));
      pcDrawGeneratorSprite(tile.tier, tx + cell, ty + cell, cell * Math.min(1.2, 0.82 * span));
      noStroke();
      fill("#fff0bd");
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(Math.max(8, Math.min(12, cell * 0.2)));
      text("MEGA", tx + cell, ty + cell * 1.65);
      textStyle(NORMAL);
      pcRegisterHit("mega-" + i, tx, ty, cell * span, cell * span, () => pcPlaceAt(x, y));
    }

    const actionY = box.y + box.h - 36;
    const selectedTile = pcState.tiles[pcSelected.y * pcState.size + pcSelected.x];
    const selectedLabel = selectedTile && selectedTile.type !== "empty" && selectedTile.type !== "occupied"
      ? (selectedTile.type === "generator" ? pcTier(selectedTile.tier).short : selectedTile.type === "mega" ? "Mega " + pcTier(selectedTile.tier).short : selectedTile.type.charAt(0).toUpperCase() + selectedTile.type.slice(1))
      : "Empty tile";
    fill("#c2d0b3");
    textAlign(LEFT, CENTER);
    textSize(10);
    const modeLabel = pcBuildMode ? "PLACING: " + pcBuildName(pcBuildMode) + " · tap an empty tile" : "SELECTED: " + selectedLabel;
    text(modeLabel, box.x + 13, actionY, Math.max(70, box.w - 170), 18);
    const canEvolve = !!pcCanEvolve(pcSelected.x, pcSelected.y);
    const evolveW = Math.min(112, Math.max(78, box.w * 0.22));
    pcButton(box.x + box.w - evolveW - 12, actionY - 14, evolveW, 28, "Evolve 2×2", pcEvolveSelected, { disabled: !canEvolve, id: "evolve", textSize: 11 });
    const hasBuilding = selectedTile && ["generator", "mega", "shield", "vault"].includes(selectedTile.type);
    const removeW = Math.min(74, Math.max(52, box.w * 0.15));
    pcButton(box.x + box.w - evolveW - removeW - 17, actionY - 14, removeW, 28, "Remove", pcDemolishSelected, { disabled: !hasBuilding, id: "demolish", textSize: 10 });
    if (pcBuildMode) {
      const cancelW = Math.min(62, Math.max(48, box.w * 0.12));
      pcButton(box.x + box.w - evolveW - removeW - cancelW - 22, actionY - 14, cancelW, 28, "Cancel", () => { pcBuildMode = null; pcNoticeNow("Building selection cleared."); }, { id: "cancel-build", textSize: 10 });
    }
  }

  function pcDrawGeneratorSprite(id, x, y, size) {
    const imageAsset = pcImages[id];
    if (imageAsset && imageAsset.width > 0) {
      imageMode(CENTER);
      image(imageAsset, x, y, size, size);
      return;
    }
    pcDrawPumpkinShape(x, y, size, id);
  }

  function pcDrawPumpkinShape(x, y, size, id) {
    const color = pcTier(id).color;
    push();
    translate(x, y);
    noStroke();
    fill(color);
    ellipse(-size * 0.22, 0, size * 0.43, size * 0.65);
    ellipse(size * 0.22, 0, size * 0.43, size * 0.65);
    ellipse(0, 0, size * 0.56, size * 0.75);
    fill("#486637");
    rect(-size * 0.055, -size * 0.47, size * 0.11, size * 0.2, 2);
    if (id === "diamond") {
      stroke("#d5ffff");
      strokeWeight(Math.max(1, size * 0.035));
      noFill();
      quad(0, -size * 0.22, size * 0.18, 0, 0, size * 0.22, -size * 0.18, 0);
    }
    pop();
  }

  function pcDrawShield(x, y, size) {
    const imageAsset = pcImages.shield;
    if (imageAsset && imageAsset.width > 0) {
      imageMode(CENTER);
      image(imageAsset, x, y, size, size);
      return;
    }
    push();
    translate(x, y);
    stroke("#e6ddff");
    strokeWeight(2);
    fill("#8279ba");
    beginShape();
    vertex(0, -size * 0.5);
    vertex(size * 0.4, -size * 0.32);
    vertex(size * 0.34, size * 0.17);
    vertex(0, size * 0.5);
    vertex(-size * 0.34, size * 0.17);
    vertex(-size * 0.4, -size * 0.32);
    endShape(CLOSE);
    pop();
  }

  function pcDrawVault(x, y, size) {
    const imageAsset = pcImages.vault;
    if (imageAsset && imageAsset.width > 0) {
      imageMode(CENTER);
      image(imageAsset, x, y, size, size);
      if (size > 34) {
        image(imageAsset, x - size * 0.17, y + size * 0.14, size * 0.52, size * 0.52);
        image(imageAsset, x + size * 0.17, y + size * 0.14, size * 0.52, size * 0.52);
      }
      return;
    }
    pcDrawPumpkinShape(x, y, size * 0.8, "gold");
    noStroke();
    fill("#fff0bd");
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(Math.max(8, size * 0.25));
    text("VAULT", x, y + size * 0.2);
    textStyle(NORMAL);
  }

  function pcShopRows() {
    const s = pcState;
    if (pcActiveTab === "build") {
      const items = [];
      for (const tier of TIER_DATA) {
        const cost = pcTileCost(s, tier.id);
        const owned = s.tiles.filter(t => t.type === "generator" && t.tier === tier.id).length;
        items.push({
          id: tier.id, title: tier.name, description: pcFormat(tier.rate) + " base/sec · " + owned + " small · " + (pcBuildMode === tier.id ? "selected" : "tap to place"),
          price: pcMoney(cost), color: tier.color, active: pcBuildMode === tier.id, affordable: s.cash >= cost,
          action: () => pcSelectBuild(tier.id), sprite: tier.id
        });
      }
      for (const id of ["shield", "vault"]) {
        const cost = pcTileCost(s, id);
        const isShield = id === "shield";
        items.push({
          id, title: isShield ? "Shield" : "Vault",
          description: isShield ? "3×3 boost zone · diagonals count" : "+250 storage · collects orthogonally",
          price: pcMoney(cost), color: isShield ? "#aaa0e5" : "#e6bc3e", active: pcBuildMode === id,
          affordable: s.cash >= cost, action: () => pcSelectBuild(id), special: id
        });
      }
      return items;
    }
    if (pcActiveTab === "workers") {
      return WORKER_DATA.map(worker => ({
        id: worker.id, title: worker.name + " · " + pcWorkerCount(s, worker.id),
        description: worker.description + (worker.id === "debuffer" ? " · doesn't buff itself" : ""),
        price: pcMoney(pcWorkerCost(s, worker.id)), color: worker.color, affordable: s.cash >= pcWorkerCost(s, worker.id),
        action: () => pcWorkerHire(worker.id), sprite: "worker:" + worker.id
      }));
    }
    if (pcActiveTab === "upgrades") {
      return UPGRADE_DATA.map(upgrade => {
        const level = pcUpgradeLevel(s, upgrade.id);
        const cost = pcUpgradeCost(s, upgrade);
        const maxed = level >= upgrade.max;
        return {
          id: upgrade.id, title: upgrade.name + " · Lv " + level + "/" + upgrade.max,
          description: upgrade.description, price: maxed ? "MAX" : pcMoney(cost), color: upgrade.color,
          affordable: maxed || s.cash >= cost, active: false, maxed,
          action: () => pcBuyUpgrade(upgrade.id), special: "upgrade"
        };
      });
    }
    return [];
  }

  function pcDrawShop() {
    const box = pcLayout.shop;
    const activeName = pcActiveTab === "build" ? "BUILD" : pcActiveTab === "workers" ? "STAFF" : pcActiveTab === "upgrades" ? "UPGRADES" : "STATS";
    pcPanel(box, "FARM MANAGEMENT", pcActiveTab === "stats" ? "Lifetime progress and achievements" : "Select an item, then tap the farm");
    const tabs = [
      { id: "build", label: "BUILD" },
      { id: "workers", label: "STAFF" },
      { id: "upgrades", label: "UPGRADES" },
      { id: "stats", label: "STATS" }
    ];
    const tabY = box.y + 49;
    const tabGap = 4;
    const tabW = (box.w - 20 - tabGap * 3) / 4;
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      pcButton(box.x + 10 + i * (tabW + tabGap), tabY, tabW, 25, tab.label, () => {
        pcActiveTab = tab.id;
        pcBuildMode = null;
      }, { active: pcActiveTab === tab.id, id: "tab-" + tab.id, textSize: 10 });
    }
    const content = pcLayout.shopContent;
    if (pcActiveTab === "stats") {
      pcDrawStats(content);
      return;
    }
    const rows = pcShopRows();
    const rowH = 54;
    const maxScroll = Math.max(0, rows.length * rowH - content.h);
    pcShopScroll[pcActiveTab] = Math.max(0, Math.min(maxScroll, pcShopScroll[pcActiveTab] || 0));
    noStroke();
    fill("#17251b");
    rect(content.x, content.y, content.w, content.h, 8);
    const first = Math.max(0, Math.floor(pcShopScroll[pcActiveTab] / rowH));
    const last = Math.min(rows.length, Math.ceil((pcShopScroll[pcActiveTab] + content.h) / rowH));
    for (let i = first; i < last; i++) {
      const item = rows[i];
      const y = content.y + i * rowH - pcShopScroll[pcActiveTab];
      if (y + rowH < content.y || y > content.y + content.h) continue;
      const hovered = pcLastPointer.x >= content.x && pcLastPointer.x <= content.x + content.w && pcLastPointer.y >= y && pcLastPointer.y <= y + rowH;
      noStroke();
      fill(item.active ? "#435b38" : hovered ? "#2e4631" : i % 2 ? "#233829" : "#203426");
      rect(content.x + 2, y + 2, content.w - 4, rowH - 4, 7);
      fill(item.color);
      rect(content.x + 6, y + 7, 4, rowH - 14, 2);
      pcDrawShopIcon(item, content.x + 25, y + rowH / 2, 28);
      const priceW = Math.min(98, content.w * 0.29);
      const textX = content.x + 45;
      const textW = Math.max(50, content.w - 52 - priceW);
      fill(item.affordable ? "#f2ebce" : "#9aa696");
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(Math.max(10, Math.min(12, textW / 13)));
      text(item.title, textX, y + 15, textW, 18);
      textStyle(NORMAL);
      fill("#b7c6ad");
      textSize(Math.max(8, Math.min(9.5, textW / 17)));
      text(item.description, textX, y + 36, textW, 22);
      fill(item.maxed ? "#c8d4b9" : item.affordable ? "#f5d88b" : "#a08d78");
      textAlign(RIGHT, CENTER);
      textStyle(BOLD);
      textSize(Math.max(9, Math.min(11, priceW / 7.3)));
      text(item.price, content.x + content.w - 8, y + rowH / 2, priceW, rowH - 8);
      textStyle(NORMAL);
      pcRegisterHit("shop-" + item.id, content.x + 2, Math.max(content.y, y), content.w - 4, Math.min(rowH - 4, content.y + content.h - Math.max(content.y, y)), item.action);
    }
    if (rows.length * rowH > content.h) {
      pcButton(box.x + box.w - 74, box.y + box.h - 29, 28, 19, "▲", () => {
        pcShopScroll[pcActiveTab] = Math.max(0, pcShopScroll[pcActiveTab] - rowH);
      }, { id: "shop-up", textSize: 10 });
      pcButton(box.x + box.w - 40, box.y + box.h - 29, 28, 19, "▼", () => {
        pcShopScroll[pcActiveTab] = Math.min(maxScroll, pcShopScroll[pcActiveTab] + rowH);
      }, { id: "shop-down", textSize: 10 });
    }
  }

  function pcDrawShopIcon(item, x, y, size) {
    if (item.sprite && item.sprite.startsWith("worker:")) {
      const imageAsset = pcImages[item.sprite.slice(7)];
      if (imageAsset && imageAsset.width > 0) {
        imageMode(CENTER);
        image(imageAsset, x, y, size, size);
        return;
      }
    }
    if (item.sprite && TIER_DATA.some(t => t.id === item.sprite)) {
      pcDrawGeneratorSprite(item.sprite, x, y, size);
      return;
    }
    if (item.special === "shield") { pcDrawShield(x, y, size); return; }
    if (item.special === "vault") { pcDrawVault(x, y, size); return; }
    if (item.special === "upgrade") {
      noStroke();
      fill(item.color);
      circle(x, y, size * 0.8);
      fill("#203025");
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(12);
      text(item.id === "click" ? "+" : item.id === "capacity" ? "B" : item.id === "sell" ? "$" : "S", x, y + 1);
      textStyle(NORMAL);
      return;
    }
    noStroke();
    fill(item.color);
    circle(x, y, size * 0.8);
  }

  function pcDrawStats(content) {
    noStroke();
    fill("#17251b");
    rect(content.x, content.y, content.w, content.h, 8);
    const stats = [
      ["Lifetime harvested", pcFormat(pcState.lifetimePumpkins)],
      ["Lifetime sold", pcFormat(pcState.totalSold)],
      ["Lifetime cash earned", pcMoney(pcState.lifetimeCash)],
      ["Potential output", pcFormat(pcPotentialRate(pcState)) + "/sec"],
      ["Connected output", pcFormat(pcDeliveredRate(pcState)) + "/sec"],
      ["Workers hired", String(pcWorkerTotal(pcState))],
      ["Buildings", String(pcState.tiles.filter(t => ["generator", "shield", "vault", "mega"].includes(t.type)).length)],
      ["Generators owned", String(pcGeneratorCount(pcState))],
      ["Objective clicks", pcFormat(pcState.clicks)],
      ["Time played", pcFormat(pcState.totalPlaySeconds / 60) + " min"],
      ["Achievements", Object.keys(pcState.achievements).filter(id => pcState.achievements[id]).length + " / " + ACHIEVEMENTS.length]
    ];
    const lineH = 29;
    const achievementH = 48;
    const totalH = stats.length * lineH + achievementH + ACHIEVEMENTS.length * 39 + 50;
    const maxScroll = Math.max(0, totalH - content.h);
    pcShopScroll.stats = Math.max(0, Math.min(maxScroll, pcShopScroll.stats || 0));
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(content.x, content.y, content.w, content.h);
    drawingContext.clip();
    let y = content.y + 14 - pcShopScroll.stats;
    for (const stat of stats) {
      fill("#aebeaa");
      textAlign(LEFT, CENTER);
      textSize(10);
      text(stat[0], content.x + 9, y + 8);
      fill("#fff0c8");
      textAlign(RIGHT, CENTER);
      textStyle(BOLD);
      textSize(11);
      text(stat[1], content.x + content.w - 9, y + 8);
      textStyle(NORMAL);
      stroke("#344b35");
      line(content.x + 8, y + 20, content.x + content.w - 8, y + 20);
      noStroke();
      y += lineH;
    }
    fill("#f4e8c5");
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(13);
    text("ACHIEVEMENTS", content.x + 9, y + 11);
    textStyle(NORMAL);
    y += 30;
    for (const achievement of ACHIEVEMENTS) {
      const earned = !!pcState.achievements[achievement.id];
      fill(earned ? "#435c38" : "#233629");
      rect(content.x + 6, y, content.w - 12, 34, 6);
      fill(earned ? "#e7d18b" : "#aeb9a6");
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(10);
      text(achievement.title + (earned ? "  ✓" : ""), content.x + 12, y + 10, content.w - 24, 14);
      textStyle(NORMAL);
      fill("#b4c2ad");
      textSize(8.5);
      text(achievement.description + " · reward " + pcMoney(achievement.reward), content.x + 12, y + 24, content.w - 24, 14);
      y += 39;
    }
    drawingContext.restore();
    pop();
    pcButton(content.x + 8, content.y + content.h - 29, Math.min(110, content.w * 0.32), 22, "Save Farm", () => {
      pcSaveState();
      pcNoticeNow("Farm saved.");
    }, { id: "save", textSize: 10 });
    pcButton(content.x + Math.min(126, content.w * 0.36), content.y + content.h - 29, Math.min(120, content.w * 0.34), 22, "Reset Save", () => { pcModal = "reset"; }, { id: "reset", textSize: 10 });
    if (maxScroll > 0) {
      pcButton(content.x + content.w - 62, content.y + content.h - 29, 24, 22, "▲", () => { pcShopScroll.stats = Math.max(0, pcShopScroll.stats - 70); }, { id: "stats-up", textSize: 10 });
      pcButton(content.x + content.w - 32, content.y + content.h - 29, 24, 22, "▼", () => { pcShopScroll.stats = Math.min(maxScroll, pcShopScroll.stats + 70); }, { id: "stats-down", textSize: 10 });
    }
  }

  function pcDrawFooter() {
    const y = pcLayout.footerY;
    noStroke();
    fill("#17251b");
    rect(0, y, width, height - y);
    fill("#40583e");
    rect(0, y, width, 2);
    const narrow = width < 760;
    const actions = [
      { id: "harvest", label: "Harvest Objective", short: "Harvest", action: pcHarvestClick, color: "#8d6d32" },
      { id: "sell", label: "Sell Pumpkins", short: "Sell", action: () => pcSellAll(true), color: "#7a6234" },
      { id: "autosell", label: pcState.autoSell ? "Auto-Sell ON" : "Auto-Sell OFF", short: pcState.autoSell ? "Auto ON" : "Auto-Sell", action: () => { pcState.autoSell = !pcState.autoSell; pcNoticeNow("Auto-sell " + (pcState.autoSell ? "enabled" : "disabled") + "."); pcSaveState(); }, color: "#3c6743" },
      { id: "daily", label: pcState.lastDailyDay === pcGetDayKey(Date.now()) ? "Candy Bag Claimed" : "Daily Candy Bag", short: "Candy Bag", action: pcClaimDaily, color: "#734b75" },
      { id: "save", label: "Save Farm", short: "Save", action: () => { pcSaveState(); pcNoticeNow("Farm saved."); }, color: "#3e5c65" },
      { id: "prestige", label: "Prestige", short: "Prestige", action: pcDoPrestige, color: "#6e593b" }
    ];
    const gap = 7;
    if (narrow) {
      const rowGap = 5;
      const buttonH = Math.max(25, (height - y - 12 - rowGap) / 2);
      const buttonW = (width - 24 - gap * 2) / 3;
      for (let i = 0; i < actions.length; i++) {
        const row = i < 3 ? 0 : 1;
        const col = i % 3;
        const x = 12 + col * (buttonW + gap);
        const by = y + 5 + row * (buttonH + rowGap);
        pcButton(x, by, buttonW, buttonH, actions[i].short, actions[i].action, {
          id: "footer-" + actions[i].id,
          active: actions[i].id === "autosell" && pcState.autoSell,
          textSize: 11
        });
        const hit = pcHits[pcHits.length - 1];
        if (hit) { hit.options.color = actions[i].color; }
      }
    } else {
      const buttonW = (width - 24 - gap * (actions.length - 1)) / actions.length;
      const buttonH = Math.min(52, height - y - 14);
      for (let i = 0; i < actions.length; i++) {
        const x = 12 + i * (buttonW + gap);
        pcButton(x, y + 8, buttonW, buttonH, actions[i].label, actions[i].action, {
          id: "footer-" + actions[i].id,
          active: actions[i].id === "autosell" && pcState.autoSell,
          textSize: 12
        });
      }
    }
  }

  function pcDrawNotice() {
    if (!pcNotice || Date.now() > pcNoticeUntil) return;
    const y = Math.max(HEADER_H + 6, pcLayout.footerY - 29);
    const w = Math.min(width - 24, Math.max(230, pcNotice.length * 6.2 + 30));
    const x = (width - w) / 2;
    noStroke();
    fill("#121d16");
    rect(x, y, w, 24, 7);
    stroke("#8da875");
    strokeWeight(1);
    noFill();
    rect(x + 0.5, y + 0.5, w - 1, 23, 7);
    noStroke();
    fill("#fff0c6");
    textAlign(CENTER, CENTER);
    textSize(10);
    text(pcNotice, x + 7, y + 12, w - 14, 21);
  }

  function pcDrawModal() {
    if (!pcModal) return;
    noStroke();
    fill(5, 10, 6, 190);
    rect(0, 0, width, height);
    const boxW = Math.min(width - 32, 430);
    const boxH = 210;
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    noStroke();
    fill("#203326");
    rect(x, y, boxW, boxH, 14);
    stroke("#b59c5c");
    strokeWeight(2);
    noFill();
    rect(x + 1, y + 1, boxW - 2, boxH - 2, 14);
    noStroke();
    fill("#fff0c7");
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(19);
    const title = pcModal === "prestige" ? "Start a New Season?" : pcModal === "reset" ? "Reset This Save?" : "Remove This Building?";
    text(title, x + 18, y + 32, boxW - 36, 28);
    textStyle(NORMAL);
    fill("#c5d0bc");
    textSize(12);
    let message;
    if (pcModal === "prestige") {
      message = "This resets cash, stored pumpkins, the farm, workers and upgrades. Lifetime stats and achievements stay. You gain +25% permanent output and a larger grid.";
    } else if (pcModal === "reset") {
      message = "This permanently deletes this farm save, including prestige, lifetime stats and achievements. This cannot be undone.";
    } else {
      message = "Remove the selected building for a 35% base-cost refund? A mega-generator removal clears all four occupied tiles.";
    }
    text(message, x + 24, y + 91, boxW - 48, 75);
    const buttonW = Math.min(140, (boxW - 50) / 2);
    pcButton(x + boxW / 2 - buttonW - 6, y + boxH - 48, buttonW, 32, "Cancel", () => { pcModal = null; }, { id: "modal-cancel" });
    pcButton(x + boxW / 2 + 6, y + boxH - 48, buttonW, 32, pcModal === "prestige" ? "Prestige" : pcModal === "reset" ? "Reset Save" : "Remove", () => {
      const modal = pcModal;
      if (modal === "prestige") pcConfirmPrestige();
      else if (modal === "reset") {
        try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
        pcState = pcFreshState();
        pcBuildMode = null;
        pcSelected = { x: 0, y: 0 };
        pcShopScroll = { build: 0, workers: 0, upgrades: 0, stats: 0 };
        pcActiveTab = "build";
        pcModal = null;
        pcNoticeNow("New farm created.");
        pcSaveState();
      } else if (modal === "demolish") pcConfirmDemolish();
    }, { id: "modal-confirm", active: true });
  }

  function pcTick() {
    if (!pcState) return;
    const now = Date.now();
    if (!pcLastTick) pcLastTick = now;
    const delta = Math.min(2, Math.max(0, (now - pcLastTick) / 1000));
    pcLastTick = now;
    pcState.totalPlaySeconds += delta;
    const capacity = pcStorageCapacity(pcState);
    const space = Math.max(0, capacity - pcState.pumpkins);
    const delivered = pcDeliveredRate(pcState);
    const gain = Math.min(space, delivered * delta);
    if (gain > 0) {
      pcState.pumpkins += gain;
      pcState.lifetimePumpkins += gain;
    }
    if (pcWorkerCount(pcState, "rusher") > 0 && now - pcLastRusher >= 10000) {
      pcLastRusher = now;
      const burst = Math.min(Math.max(0, capacity - pcState.pumpkins), delivered * pcWorkerCount(pcState, "rusher") * 2 * pcWorkerSupport(pcState));
      if (burst > 0) {
        pcState.pumpkins += burst;
        pcState.lifetimePumpkins += burst;
        pcNoticeNow("Rusher burst! +" + pcFormat(burst) + " pumpkins.");
      }
    }
    if (pcState.autoSell && pcState.pumpkins >= capacity * 0.9 && now - pcLastAutoSell > 700) {
      if (pcSellAll(false)) {
        pcLastAutoSell = now;
        pcNoticeNow("Auto-sold a full basket for " + pcMoney(pcState.cash) + " total cash.");
      }
    }
    if (now - pcLastSave > 15000) {
      pcSaveState();
      pcLastSave = now;
    }
    if (now - pcLastUiRefresh > 500) {
      pcCheckAchievements();
      pcLastUiRefresh = now;
    }
  }

  function pcPreload() {
    for (const tier of TIER_DATA) pcImages[tier.id] = loadImage(tier.sprite, () => {}, () => {});
    for (const worker of WORKER_DATA) pcImages[worker.id] = loadImage(worker.sprite, () => {}, () => {});
    pcImages.vault = loadImage("/assets/pumpkins/objective.png", () => {}, () => {});
    pcImages.shield = loadImage("/assets/abilities/shield/icon.png", () => {}, () => {});
    pcImages.objective = loadImage("/assets/pumpkins/objective.png", () => {}, () => {});
    pcImages.candy = loadImage("/assets/candies/trick-or-treat.png", () => {}, () => {});
  }

  function pcSetup() {
    pixelDensity(1);
    const canvas = createCanvas(Math.max(320, windowWidth), Math.max(360, windowHeight));
    canvas.elt.setAttribute("aria-label", "Pumpkin Clicker game canvas");
    canvas.elt.style.touchAction = "none";
    canvas.elt.style.imageRendering = "auto";
    frameRate(30);
    textFont("Arial");
    pcState = pcLoadState();
    pcLastTick = Date.now();
    pcLastRusher = Date.now();
    pcLastSave = Date.now();
    pcLastUiRefresh = Date.now();
    pcCheckAchievements();
    pcSaveState();
  }

  function pcDraw() {
    if (!pcState) return;
    pcHits = [];
    pcLastPointer = { x: mouseX, y: mouseY };
    pcCalculateLayout();
    background("#203725");
    pcDrawBackgroundTexture();
    pcDrawHeader();
    pcDrawFarm();
    pcDrawShop();
    pcDrawFooter();
    pcDrawNotice();
    pcDrawModal();
    pcTick();
  }

  function pcDrawBackgroundTexture() {
    noStroke();
    for (let i = 0; i < 85; i++) {
      fill(i % 3 === 0 ? "#29452d" : "#263f2a");
      circle((i * 97 + 23) % width, (i * 53 + 17) % height, i % 5 === 0 ? 2.5 : 1.5);
    }
    if (Date.now() < pcClickPulseUntil) {
      noStroke();
      fill("#ffdf7c");
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(17);
      text("+" + (1 + pcUpgradeLevel(pcState, "click")) + " pumpkin" + (pcUpgradeLevel(pcState, "click") ? "s" : ""), width / 2, HEADER_H + 10);
      textStyle(NORMAL);
    }
  }

  function pcWindowResized() {
    resizeCanvas(Math.max(320, windowWidth), Math.max(360, windowHeight));
  }

  function pcMousePressed() {
    pcLastPointer = { x: mouseX, y: mouseY };
    if (pcModal) {
      for (let i = pcHits.length - 1; i >= 0; i--) {
        const hit = pcHits[i];
        if (hit.options && hit.options.disabled) continue;
        if (pcLastPointer.x >= hit.x && pcLastPointer.x <= hit.x + hit.w && pcLastPointer.y >= hit.y && pcLastPointer.y <= hit.y + hit.h) {
          if (hit.action) hit.action();
          return false;
        }
      }
      return false;
    }
    for (let i = pcHits.length - 1; i >= 0; i--) {
      const hit = pcHits[i];
      if (hit.options && hit.options.disabled) continue;
      if (pcLastPointer.x >= hit.x && pcLastPointer.x <= hit.x + hit.w && pcLastPointer.y >= hit.y && pcLastPointer.y <= hit.y + hit.h) {
        if (hit.action) hit.action();
        return false;
      }
    }
    return false;
  }

  function pcMouseWheel(event) {
    if (pcModal) return false;
    if (!pcLayout || !pcInside(mouseX, mouseY, pcLayout.shopContent)) return true;
    if (pcActiveTab === "stats") pcShopScroll.stats = Math.max(0, pcShopScroll.stats + event.delta);
    else pcShopScroll[pcActiveTab] = Math.max(0, (pcShopScroll[pcActiveTab] || 0) + event.delta);
    return false;
  }

  function pcKeyPressed() {
    if (pcModal) {
      if (keyCode === ESCAPE) pcModal = null;
      return false;
    }
    const k = String(key || "").toLowerCase();
    if (k === "h") pcHarvestClick();
    else if (k === "s") pcSellAll(true);
    else if (k === "e") pcEvolveSelected();
    else if (k === "1") { pcActiveTab = "build"; pcBuildMode = null; }
    else if (k === "2") { pcActiveTab = "workers"; pcBuildMode = null; }
    else if (k === "3") { pcActiveTab = "upgrades"; pcBuildMode = null; }
    else if (k === "4") { pcActiveTab = "stats"; pcBuildMode = null; }
    else if (keyCode === ESCAPE) pcBuildMode = null;
    return false;
  }

  window.addEventListener("beforeunload", pcSaveState);
  window.addEventListener("pagehide", pcSaveState);
  window.addEventListener("keydown", event => {
    if (event.code === "Escape" && pcModal) {
      pcModal = null;
      event.preventDefault();
    }
  });

  // Expose only the lifecycle callbacks required by p5's existing global-mode
  // host. No second p5 instance and no HTML buttons/overlays are created.
  window.preload = pcPreload;
  window.setup = pcSetup;
  window.draw = pcDraw;
  window.windowResized = pcWindowResized;
  window.mousePressed = pcMousePressed;
  window.mouseWheel = pcMouseWheel;
  window.keyPressed = pcKeyPressed;
})();