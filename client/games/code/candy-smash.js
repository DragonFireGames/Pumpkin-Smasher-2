/*
 * Candy Smash
 * Standalone p5.js global-mode match-three game for the Pumpkin Smasher arcade.
 * Special candies use the existing candy sprites with animated canvas effects.
 */

const canvasWidth = 400;
const canvasHeight = 400;
const cols = 8;
const rows = 8;
const cellSize = 40;
const boardX = 40;
const boardY = 56;
const backgroundColor = "#123904";
const black = "#0C2504";
const orange = "#ffa500";
const white = "#ffffff";
const clearDelay = 270;
const specialEffectDuration = 520;
const fallDelay = 390;

// Wave-field constants ported from the candy-enchantment demo.
const wavePeriod = 27;
const wavePhaseSpeed = 5.8;
const radialSpacing = 1.0;
const radialSpeed = 1.0;
const starSpacing = 1.0;
const starSpeed = 1.0;
const waveAlpha = 78;
const waveReferenceSize = 232;
const naturalSpecialChance = 0.015;
const frenzyNaturalSpecialChance = 0.10;
const frenzyHotTamaleWeight = 0.2;
const frenzyTamaleGuaranteeInterval = 60;
const shuffleAnimationDuration = 1250;
const peppermintTimeBonus = 0.5;
const hintIdleDuration = 5000;
const hintFlashDuration = 1500;
const hintRepeatDuration = 7000;

const candyTypes = [
  { id: "blue", name: "Blue Candy", path: "/assets/candies/blue-candy.png", weight: 1 },
  { id: "apple", name: "Candied Apple", path: "/assets/candies/candied-apple.png", weight: 1 },
  { id: "corn", name: "Candy Corn", path: "/assets/candies/candy-corn.png", weight: 1 },
  { id: "chocolate", name: "Chocolate", path: "/assets/candies/chocolate.png", weight: 1 },
  { id: "ghost", name: "Ghost Chew", path: "/assets/candies/ghost-chew.png", weight: 1 },
  { id: "smarties", name: "Smarties", path: "/assets/candies/smarties.png", weight: 1 },
  { id: "hot_tamale", name: "Hot Tamale", path: "/assets/candies/hot-tamale.png", weight: 0.10, special: "bomb" },
  { id: "peppermint", name: "Peppermint", path: "/assets/candies/peppermint.png", weight: 1.0, special: "time_bonus" },
  { id: "pumpkin", name: "Pumpkin", path: "/assets/pumpkins/pumpkin.png", weight: 0, special: "pumpkin" }
];

const modes = [
  {
    id: "fast",
    name: "FAST FRENZY",
    description: "60 seconds. Peppermints cannot match; clear them with special abilities for bonus time.",
    candyId: "peppermint",
    moves: null,
    seconds: 60
  },
  {
    id: "classic",
    name: "CLASSIC",
    description: "Play until no legal swaps remain. No time or move limit.",
    candyId: "corn",
    moves: null,
    seconds: null
  },
  {
    id: "puzzle",
    name: "PUZZLE",
    description: "18 moves. Swap pumpkins into position, then destroy them with special abilities.",
    candyId: "smarties",
    moves: 18,
    seconds: null
  }
];

let images = {};
let gameState = "title";
let selectedModeIndex = 0;
let currentMode = modes[0];
let board = [];
let score = 0;
let movesLeft = 0;
let timeLeft = 0;
let startedAt = 0;
let lastTickAt = 0;
let selectedCell = null;
let keyboardFocus = { row: 0, col: 0 };
let keyboardNavigationActive = false;
let pendingMatches = [];
let phaseStartedAt = 0;
let phaseEndsAt = 0;
let combo = 1;
let endReason = "";
let endWon = false;
let resultSummary = "";
let shuffleCount = 0;
let shuffleAnimation = null;
let candiesSinceHotTamale = 0;
let visualSwap = null;
let lastActivityAt = 0;
let lastHintAt = 0;
let hintCells = [];
let hintStartedAt = 0;
let specialEffects = [];
let clearSequence = 0;
let effectCanvas = null;
let effectContext = null;

function preload() {
  for (let i = 0; i < candyTypes.length; i++) {
    const type = candyTypes[i];
    images[type.id] = loadImage(type.path, () => {}, () => {});
  }
}

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  textFont("Arial");
  effectCanvas = document.createElement("canvas");
  effectContext = effectCanvas.getContext("2d");
  resizeCanvasToContainer();
  window.addEventListener("resize", resizeCanvasToContainer);
}

function resizeCanvasToContainer() {
  const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  canvas.style.width = side + "px";
  canvas.style.height = side + "px";
  canvas.style.imageRendering = "pixelated";
}

function draw() {
  background(backgroundColor);

  if (gameState === "title") {
    drawTitleScreen();
    return;
  }

  updateGame();
  drawGame();

  if (gameState === "gameover") drawGameOverScreen();
}

function drawTitleScreen() {
  noStroke();
  fill(backgroundColor);
  rect(0, 0, width, height);
  stroke(orange);
  strokeWeight(2);
  line(0, 91, width, 91);

  noStroke();
  fill(orange);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(28);
  text("CANDY SMASH", width / 2, 34);
  fill(white);
  textStyle(NORMAL);
  textSize(9);
  text("CHOOSE A MODE", width / 2, 68);

  const mode = modes[selectedModeIndex];
  const previous = modes[(selectedModeIndex + modes.length - 1) % modes.length];
  const next = modes[(selectedModeIndex + 1) % modes.length];

  // One carousel row: candy, name, and neighbors. No second row of circles.
  drawModeCandyBubble(previous.candyId, 88, 187, 25, false);
  drawModeCandyBubble(next.candyId, 312, 187, 25, false);
  drawModeCandyBubble(mode.candyId, 200, 184, 48, true);

  noStroke();
  fill(white);
  textStyle(BOLD);
  textSize(24);
  text("‹", 53, 187);
  text("›", 347, 187);

  fill(orange);
  textStyle(BOLD);
  textSize(15);
  text(mode.name, width / 2, 249);
  fill(white);
  textStyle(NORMAL);
  textSize(10);
  text(mode.description, width / 2, 270);

  // A single, clear Play button sits below the carousel.
  const hoveringPlay = mouseX >= 112 && mouseX <= 288 && mouseY >= 302 && mouseY <= 348;
  // Match Pumpkin Smasher's flat brown-and-orange buttons: no rounding or bevel.
  fill(hoveringPlay ? "#381e08" : "#231709");
  stroke(orange);
  strokeWeight(2);
  rect(112, 302, 176, 46);
  noStroke();
  fill(orange);
  textStyle(BOLD);
  textSize(15);
  text("PLAY", width / 2, 325);

  fill("#ffffff");
  textStyle(NORMAL);
  textSize(8);
  text("USE ← / → OR CLICK THE SIDES TO BROWSE", width / 2, 377);
  textStyle(NORMAL);
}

function drawModeCandyBubble(candyId, x, y, radius, selected) {
  // A single simple circle behind the candy; effects can be layered in later.
  fill(selected ? "#1C4E0A" : "#123904");
  stroke(selected ? orange : "#505050");
  strokeWeight(selected ? 3 : 1.5);
  ellipse(x, y, radius * 2, radius * 2);

  const sprite = images[candyId];
  if (sprite && sprite.width > 0 && sprite.height > 0) {
    const displaySize = radius * 1.45;
    const displayHeight = displaySize;
    const displayWidth = displayHeight * sprite.width / sprite.height;
    image(sprite, x, y, Math.min(displayWidth, radius * 1.65), Math.min(displayHeight, radius * 1.65));
  } else {
    fill(candyId === "hot_tamale" ? "#ffa500" : candyId === "peppermint" ? "#ffffff" : "#ffa500");
    noStroke();
    ellipse(x, y, radius, radius);
  }
}
function startGame(modeIndex) {
  selectedModeIndex = Math.max(0, Math.min(modes.length - 1, modeIndex));
  currentMode = modes[selectedModeIndex];
  score = 0;
  movesLeft = currentMode.moves;
  timeLeft = currentMode.seconds || 0;
  startedAt = millis();
  lastTickAt = millis();
  lastActivityAt = millis();
  lastHintAt = 0;
  hintCells = [];
  hintStartedAt = 0;
  keyboardNavigationActive = false;
  selectedCell = null;
  keyboardFocus = { row: 3, col: 3 };
  pendingMatches = [];
  combo = 1;
  endReason = "";
  endWon = false;
  resultSummary = "";
  visualSwap = null;
  shuffleCount = 0;
  shuffleAnimation = null;
  candiesSinceHotTamale = 0;
  clearSequence = 0;
  specialEffects = [];
  board = createInitialBoard();
  if (currentMode.id === "puzzle") {
    placePuzzlePumpkins(board);
    powerPuzzleStartingBoard(board);
  }
  // Initial-board construction doesn't count toward the in-game spawn guarantee.
  candiesSinceHotTamale = 0;
  gameState = "playing";
}

function registerActivity() {
  lastActivityAt = millis();
  lastHintAt = 0;
  hintCells = [];
  hintStartedAt = 0;
}

function createCandy(id) {
  return {
    type: id,
    special: null,
    specialDirection: null,
    fall: null,
    bornAt: millis(),
    // Keep a stable per-candy phase so nearby Hot Tamales never animate in sync.
    energyOffset: Math.random() * Math.PI * 2
  };
}

function placePuzzlePumpkins(board) {
  const targetCount = 8;
  let placed = 0;
  const positions = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) positions.push({ row, col });
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (const cell of positions) {
    if (placed >= targetCount) break;
    const candy = board[cell.row][cell.col];
    if (!candy || candy.special || candy.type === "hot_tamale" ||
        candy.type === "peppermint" || hasAdjacentPumpkin(board, cell.row, cell.col)) continue;
    board[cell.row][cell.col] = createCandy("pumpkin");
    placed++;
  }
}

function powerPuzzleStartingBoard(board) {
  // Puzzle gets a one-time head start; normal refill odds remain unchanged.
  const targetCount = 10;
  let poweredCount = 0;
  const candidates = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      if (!candy || ["pumpkin", "hot_tamale", "peppermint"].includes(candy.type)) continue;
      if (candy.special) poweredCount++;
      else candidates.push({ row, col });
    }
  }

  // Randomize which candies receive guaranteed starting powers.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const cell of candidates) {
    if (poweredCount >= targetCount) break;
    const candy = board[cell.row][cell.col];
    const roll = Math.random();
    if (roll < 0.22) {
      candy.special = "lineH";
      candy.specialDirection = "horizontal";
    } else if (roll < 0.44) {
      candy.special = "lineV";
      candy.specialDirection = "vertical";
    } else if (roll < 0.55) {
      candy.special = "star";
      candy.specialDirection = null;
    } else {
      candy.special = "bomb";
      candy.specialDirection = null;
    }
    candy.bornAt = millis();
    poweredCount++;
  }
}

function hasAdjacentPumpkin(board, row, col) {
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].some(([r, c]) =>
    r >= 0 && r < rows && c >= 0 && c < cols &&
    board[r] && board[r][c] && board[r][c].type === "pumpkin"
  );
}

function countPumpkins() {
  let count = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] && board[row][col].type === "pumpkin") count++;
    }
  }
  return count;
}

function getMostCommonZapType() {
  const counts = new Map();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      if (!candy || ["pumpkin", "hot_tamale", "peppermint"].includes(candy.type)) continue;
      counts.set(candy.type, (counts.get(candy.type) || 0) + 1);
    }
  }
  let best = null, bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) { best = type; bestCount = count; }
  }
  return best || "blue";
}

function randomCandyId() {
  const candidates = candyTypes.filter(type =>
    type.id !== "pumpkin" &&
    (type.id !== "peppermint" || currentMode.id === "fast")
  );
  let totalWeight = 0;
  const weighted = candidates.map(type => {
    let weight = type.weight;
    if (type.id === "hot_tamale") {
      // Random Hot Tamale spawns and the anti-dry-streak guarantee are
      // Frenzy-only. In other modes, Tamales come from actual five-matches.
      weight = currentMode.id === "fast" ? frenzyHotTamaleWeight : 0;
    }
    if (type.id === "smarties" && currentMode.id === "fast") weight = 2;
    if (type.id === "peppermint") weight = 1.25;
    totalWeight += weight;
    return { id: type.id, weight };
  });
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < weighted.length; i++) {
    roll -= weighted[i].weight;
    if (roll <= 0) return weighted[i].id;
  }
  return weighted[0].id;
}

function candyRunMatches(types) {
  // Peppermints, Hot Tamales and pumpkins cannot be ordinary matches.
  return types.length > 0 &&
    !["peppermint", "hot_tamale", "pumpkin"].includes(types[0]) &&
    types.every(typeId => typeId === types[0]);
}

function wouldMakeMatchAt(board, row, col, type) {
  if (col >= 2 && board[row][col - 1] && board[row][col - 2] &&
      candyRunMatches([board[row][col - 2].type, board[row][col - 1].type, type])) return true;
  if (row >= 2 && board[row - 1][col] && board[row - 2][col] &&
      candyRunMatches([board[row - 2][col].type, board[row - 1][col].type, type])) return true;
  return false;
}

function ensureFastPeppermint(board, requireLegalMove) {
  if (currentMode.id !== "fast") return true;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] && board[row][col].type === "peppermint") return true;
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const previous = board[row][col];
      board[row][col] = createCandy("peppermint");
      const noMatches = findMatches(board).length === 0;
      const hasMoves = !requireLegalMove || boardHasLegalMove(board);
      if (noMatches && hasMoves) return true;
      board[row][col] = previous;
    }
  }

  board[0][0] = createCandy("peppermint");
  return false;
}
function applyNaturalSpecial(candy) {
  if (!candy) return candy;
  const candyType = candyTypes.find(type => type.id === candy.type);
  // Hot Tamales and Peppermints already have their own behavior and cannot roll
  // a second special effect.
  if (!candyType || candyType.special) return candy;

  const chance = currentMode.id === "fast"
    ? frenzyNaturalSpecialChance
    : naturalSpecialChance;
  if (Math.random() >= chance) return candy;

  // Bombs are most common naturally, followed by line beams; stars are rarest.
  const roll = Math.random();
  if (roll < 0.22) {
    candy.special = "lineH";
    candy.specialDirection = "horizontal";
  } else if (roll < 0.44) {
    candy.special = "lineV";
    candy.specialDirection = "vertical";
  } else if (roll < 0.55) {
    candy.special = "star";
    candy.specialDirection = null;
  } else {
    candy.special = "bomb";
    candy.specialDirection = null;
  }
  candy.bornAt = millis();
  return candy;
}

function hasAdjacentHotTamale(board, row, col) {
  const neighbors = [
    [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
  ];
  return neighbors.some(([r, c]) =>
    r >= 0 && r < rows && c >= 0 && c < cols &&
    board[r] && board[r][c] && board[r][c].type === "hot_tamale"
  );
}

function ensureFastHotTamale(board) {
  if (currentMode.id !== "fast") return true;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] && board[row][col].type === "hot_tamale") return true;
    }
  }

  // A Frenzy board always begins with at least one Tamale, even on a bad roll.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const previous = board[row][col];
      if (!previous || previous.type === "peppermint" || previous.special) continue;
      board[row][col] = createCandy("hot_tamale");
      if (
          
          findMatches(board).length === 0 && boardHasLegalMove(board)) {
        candiesSinceHotTamale = 0;
        return true;
      }
      board[row][col] = previous;
    }
  }
  return false;
}

function createCandyAt(board, row, col, avoidImmediateMatch, allowGuaranteedSpawn = true) {
  const adjacentHotTamale = hasAdjacentHotTamale(board, row, col);
  const guaranteedTamale = allowGuaranteedSpawn && currentMode.id === "fast" &&
    candiesSinceHotTamale >= frenzyTamaleGuaranteeInterval - 1;
  let type = guaranteedTamale ? "hot_tamale" : randomCandyId();

  if (avoidImmediateMatch && type !== "hot_tamale") {
    let attempts = 0;
    while (wouldMakeMatchAt(board, row, col, type) && attempts < 60) {
      type = randomCandyId();
      attempts++;
    }
    if (wouldMakeMatchAt(board, row, col, type)) {
      const ordinary = candyTypes.filter(item => !item.special).map(item => item.id);
      for (let i = 0; i < ordinary.length; i++) {
        if (!wouldMakeMatchAt(board, row, col, ordinary[i])) {
          type = ordinary[i];
          break;
        }
      }
    }
  }

  const candy = applyNaturalSpecial(createCandy(type));
  // Only actual in-game refills count toward the anti-bad-luck guarantee.
  if (allowGuaranteedSpawn) {
    if (type === "hot_tamale") candiesSinceHotTamale = 0;
    else candiesSinceHotTamale++;
  }
  return candy;
}

function createInitialBoard() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const board = [];
    for (let row = 0; row < rows; row++) {
      board[row] = [];
      for (let col = 0; col < cols; col++) {
        board[row][col] = null;
        board[row][col] = createCandyAt(board, row, col, true, false);
      }
    }
    ensureFastPeppermint(board, true);
    ensureFastHotTamale(board);
    if (findMatches(board).length === 0 &&
           boardHasLegalMove(board)) return board;
  }
  return createFreshPlayableBoard();
}

function createFreshPlayableBoard() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const board = [];
    for (let row = 0; row < rows; row++) {
      board[row] = [];
      for (let col = 0; col < cols; col++) {
        board[row][col] = null;
        board[row][col] = createCandyAt(board, row, col, true, false);
      }
    }
    ensureFastPeppermint(board, true);
    ensureFastHotTamale(board);
    if (findMatches(board).length === 0 &&
           boardHasLegalMove(board)) return board;
  }
  const fallback = [];
  const ordinary = candyTypes.filter(item => !item.special).map(item => item.id);
  for (let row = 0; row < rows; row++) {
    fallback[row] = [];
    for (let col = 0; col < cols; col++) {
      fallback[row][col] = applyNaturalSpecial(
        createCandy(ordinary[(row + col * 2) % ordinary.length])
      );
    }
  }
  fallback[0][0].type = ordinary[0];
  fallback[0][1].type = ordinary[1];
  fallback[1][0].type = ordinary[1];
  fallback[1][1].type = ordinary[0];
  fallback[2][0].type = ordinary[0];
  fallback[2][1].type = ordinary[2];
  ensureFastPeppermint(fallback, true);
  ensureFastHotTamale(fallback);
  return fallback;
}
function findMatches(board) {
  const matches = new Map();

  // Only contiguous runs of three identical candy types can match.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols - 3; col++) {
      const run = [board[row][col], board[row][col + 1], board[row][col + 2]];
      if (run.every(Boolean) && candyRunMatches(run.map(candy => candy.type))) {
        for (let offset = 0; offset < 3; offset++) {
          const key = row + "," + (col + offset);
          matches.set(key, { row, col: col + offset });
        }
      }
    }
  }
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row <= rows - 3; row++) {
      const run = [board[row][col], board[row + 1][col], board[row + 2][col]];
      if (run.every(Boolean) && candyRunMatches(run.map(candy => candy.type))) {
        for (let offset = 0; offset < 3; offset++) {
          const key = (row + offset) + "," + col;
          matches.set(key, { row: row + offset, col });
        }
      }
    }
  }
  return Array.from(matches.values());
}
function findFiveInLine(cells) {
  const matched = new Set(cells.map(cell => cell.row + "," + cell.col));
  const directions = [{ row: 0, col: 1 }, { row: 1, col: 0 }];

  for (let d = 0; d < directions.length; d++) {
    const direction = directions[d];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const candy = board[row][col];
        if (!candy) continue;

        const previousRow = row - direction.row;
        const previousCol = col - direction.col;
        if (previousRow >= 0 && previousCol >= 0 && previousRow < rows && previousCol < cols &&
            board[previousRow][previousCol] && board[previousRow][previousCol].type === candy.type) {
          continue;
        }

        const run = [];
        let nextRow = row;
        let nextCol = col;
        while (nextRow < rows && nextCol < cols &&
               board[nextRow][nextCol] && board[nextRow][nextCol].type === candy.type) {
          run.push({ row: nextRow, col: nextCol });
          nextRow += direction.row;
          nextCol += direction.col;
        }

        if (run.length >= 5 && run.every(cell => matched.has(cell.row + "," + cell.col))) {
          return run;
        }
      }
    }
  }
  return null;
}

function swapBoardCandies(board, a, b) {
  const temp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = temp;
}

function areAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function boardHasLegalMove(board) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const from = { row, col };
      const neighbors = [{ row, col: col + 1 }, { row: row + 1, col }];
      for (let i = 0; i < neighbors.length; i++) {
        const to = neighbors[i];
        if (to.row >= rows || to.col >= cols) continue;
        const first = board[from.row][from.col];
        const second = board[to.row][to.col];
        if (!first || !second) continue;
        // Hot Tamales can always be activated by swapping them. Other specials
        // only count as a legal move when the swap actually makes a match.
        if (first.type === "hot_tamale" || second.type === "hot_tamale") return true;
        swapBoardCandies(board, from, to);
        const hasMatch = findMatches(board).length > 0;
        swapBoardCandies(board, from, to);
        if (hasMatch) return true;
      }
    }
  }
  return false;
}

function findBasicHint() {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const from = { row, col };
      const neighbors = [{ row, col: col + 1 }, { row: row + 1, col }];

      for (let i = 0; i < neighbors.length; i++) {
        const to = neighbors[i];
        if (to.row >= rows || to.col >= cols) continue;

        const first = board[from.row][from.col];
        const second = board[to.row][to.col];
        if (!first || !second) continue;

        const firstInfo = candyTypes.find(item => item.id === first.type);
        const secondInfo = candyTypes.find(item => item.id === second.type);
        if (!firstInfo || !secondInfo || firstInfo.special || secondInfo.special ||
            first.special || second.special) continue;

        swapBoardCandies(board, from, to);
        const matches = findMatches(board);
        let hint = null;

        // Only suggest a clean three-candy line, not a bomb, wildcard, or larger combo.
        if (matches.length === 3) {
          const types = matches.map(cell => board[cell.row][cell.col].type);
          const matchInfo = candyTypes.find(item => item.id === types[0]);
          const includesSwap = matches.some(cell =>
            (cell.row === from.row && cell.col === from.col) ||
            (cell.row === to.row && cell.col === to.col)
          );

          if (matchInfo && !matchInfo.special &&
              types.every(type => type === types[0]) && includesSwap) {
            hint = {
              // Highlight the three matching candy pieces where they currently sit,
              // before the suggested swap moves one into the completed line.
              cells: matches.map(cell => {
                if (cell.row === from.row && cell.col === from.col) {
                  return { row: to.row, col: to.col };
                }
                if (cell.row === to.row && cell.col === to.col) {
                  return { row: from.row, col: from.col };
                }
                return { row: cell.row, col: cell.col };
              }),
              from: { row: from.row, col: from.col },
              to: { row: to.row, col: to.col }
            };
          }
        }

        swapBoardCandies(board, from, to);
        if (hint) return hint;
      }
    }
  }
  return null;
}

function getCellAt(x, y) {
  if (x < boardX || y < boardY ||
      x >= boardX + cols * cellSize || y >= boardY + rows * cellSize) return null;
  return {
    row: Math.floor((y - boardY) / cellSize),
    col: Math.floor((x - boardX) / cellSize)
  };
}

function trySwap(from, to, tryTamaleMatch = false) {
  if (gameState !== "playing" || isShuffleAnimating() || !areAdjacent(from, to)) return false;
  const first = board[from.row][from.col];
  const second = board[to.row][to.col];
  if (!first || !second) return false;
  selectedCell = null;

  // In Puzzle mode, pumpkins can be repositioned directly. This is a real
  // move even when it creates no match; any match the displaced candy makes
  // at the pumpkin's old position still resolves as usual.
  if (currentMode.id === "puzzle" && (first.type === "pumpkin" || second.type === "pumpkin")) {
    swapBoardCandies(board, from, to);
    visualSwap = {
      from: { row: from.row, col: from.col },
      to: { row: to.row, col: to.col },
      startedAt: millis(),
      duration: 130,
      invalid: false
    };
    movesLeft = Math.max(0, movesLeft - 1);
    keyboardFocus = { row: to.row, col: to.col };
    const pumpkinSwapMatches = findMatches(board);
    if (pumpkinSwapMatches.length) {
      beginClear(pumpkinSwapMatches, false, to);
    }
    return true;
  }

  // If a regular candy was selected first, test an actual swap into the Tamale.
  // Keep the Tamale if the swap makes a match; otherwise restore and activate it.
  if (tryTamaleMatch && first.type !== "hot_tamale" && second.type === "hot_tamale") {
    swapBoardCandies(board, from, to);
    const tamaleSwapMatches = findMatches(board);
    if (tamaleSwapMatches.length) {
      visualSwap = { from: {row:from.row,col:from.col}, to: {row:to.row,col:to.col},
        startedAt: millis(), duration: 130, invalid: false };
      movesLeft = currentMode.moves === null ? movesLeft : movesLeft - 1;
      keyboardFocus = { row: to.row, col: to.col };
      beginClear(tamaleSwapMatches, false, to);
      return true;
    }
    swapBoardCandies(board, from, to);
  }

  // Clicking a Tamale first activates it immediately.
  if (first.type === "hot_tamale" || second.type === "hot_tamale") {
    movesLeft = currentMode.moves === null ? movesLeft : movesLeft - 1;
    const requestedType = first.type === "hot_tamale" ? second.type : first.type;
    // A Hot Tamale's color zap cannot target pumpkins. If one is selected beside
    // a Tamale, zap the most common ordinary candy color instead and leave pumpkins alone.
    const targetType = requestedType === "pumpkin" ? getMostCommonZapType() : requestedType;
    const center = first.type === "hot_tamale" ? from : to;
    const bombCells = [];
    if (first.type === "hot_tamale" && second.type === "hot_tamale") {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) bombCells.push({ row, col });
      }
    } else {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (board[row][col] && board[row][col].type !== "pumpkin" &&
              (board[row][col].type === targetType ||
               (row === from.row && col === from.col) || (row === to.row && col === to.col))) {
            bombCells.push({ row, col });
          }
        }
      }
    }
    addSpecialEffect("bomb", center);
    if (targetType && targetType !== "hot_tamale" && targetType !== "pumpkin") {
      addTamaleZapEffect(center, targetType);
    }
    beginClear(bombCells, true);
    return true;
  }

  swapBoardCandies(board, from, to);
  const matches = findMatches(board);
  if (matches.length === 0) {
    swapBoardCandies(board, from, to);
    visualSwap = {
      from: { row: from.row, col: from.col },
      to: { row: to.row, col: to.col },
      startedAt: millis(),
      duration: 260,
      invalid: true
    };
    return false;
  }

  visualSwap = {
    from: { row: from.row, col: from.col },
    to: { row: to.row, col: to.col },
    startedAt: millis(),
    duration: 130,
    invalid: false
  };
  movesLeft = currentMode.moves === null ? movesLeft : movesLeft - 1;
  keyboardFocus = { row: to.row, col: to.col };
  const fromMatched = matches.some(cell => cell.row === from.row && cell.col === from.col);
  const toMatched = matches.some(cell => cell.row === to.row && cell.col === to.col);
  // If both swapped candies complete matches, the bomb always stays at
  // the destination square. Players can choose its position by choosing
  // the swap direction instead of relying on a random placement.
  const comboBombCell = fromMatched && toMatched ? to : null;
  beginClear(matches, false, to, null, comboBombCell);
  return true;
}

function getSpecialClearCells(special, center) {
  const cells = [];
  const add = (row, col) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) cells.push({ row, col });
  };
  if (special === "lineH") {
    for (let col = 0; col < cols; col++) add(center.row, col);
  } else if (special === "lineV") {
    for (let row = 0; row < rows; row++) add(row, center.col);
  } else if (special === "star") {
    for (let col = 0; col < cols; col++) add(center.row, col);
    for (let row = 0; row < rows; row++) add(row, center.col);
  } else if (special === "bomb") {
    for (let row = center.row - 1; row <= center.row + 1; row++) {
      for (let col = center.col - 1; col <= center.col + 1; col++) add(row, col);
    }
  }
  return cells;
}

function addSpecialEffect(type, center) {
  specialEffects.push({
    type,
    row: center.row,
    col: center.col,
    startedAt: millis(),
    duration: type === "bomb" ? 430 : specialEffectDuration
  });
}

function getMatchSpecial(cells, preferredSpawnCell) {
  const matched = new Set(cells.map(cell => cell.row + "," + cell.col));
  const runLength = (row, col, dr, dc, type) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < rows && c >= 0 && c < cols &&
             board[r][c] && board[r][c].type === type && matched.has(r + "," + c)) {
        count++; r += dr * sign; c += dc * sign;
      }
    }
    return count;
  };

  // A five-run crossing a three-run creates a Hot Tamale at the
  // five-run's center and a star one step along the three-run, in the
  // direction of the swap. This replaces the old instant board clear.
  for (const cell of cells) {
    const candy = board[cell.row][cell.col];
    if (!candy) continue;
    const h = runLength(cell.row, cell.col, 0, 1, candy.type);
    const v = runLength(cell.row, cell.col, 1, 0, candy.type);
    if (!((h >= 5 && v >= 3) || (v >= 5 && h >= 3))) continue;

    const horizontalFive = h >= 5;
    const fiveLength = horizontalFive ? h : v;
    const fiveStart = horizontalFive
      ? cell.col - Math.floor((fiveLength - 1) / 2)
      : cell.row - Math.floor((fiveLength - 1) / 2);
    const center = horizontalFive
      ? { row: cell.row, col: fiveStart + Math.floor((fiveLength - 1) / 2) }
      : { row: fiveStart + Math.floor((fiveLength - 1) / 2), col: cell.col };
    const threeIsHorizontal = horizontalFive ? false : true;
    const swapDr = preferredSpawnCell ? preferredSpawnCell.row - cell.row : 0;
    const swapDc = preferredSpawnCell ? preferredSpawnCell.col - cell.col : 0;
    let starCell;
    if (threeIsHorizontal) {
      const direction = Math.sign(swapDc) || 1;
      starCell = { row: center.row, col: center.col + direction };
    } else {
      const direction = Math.sign(swapDr) || 1;
      starCell = { row: center.row + direction, col: center.col };
    }
    if (starCell.row < 0 || starCell.row >= rows || starCell.col < 0 || starCell.col >= cols) {
      starCell = threeIsHorizontal
        ? { row: center.row, col: center.col - Math.sign(swapDc || 1) }
        : { row: center.row - Math.sign(swapDr || 1), col: center.col };
    }
    return { cell: center, special: "hot_tamale", extraStarCell: starCell };
  }

  // A 4-by-3 crossing makes a star at the intersection and a bomb
  // immediately along the shorter arm of the four-candy run.
  for (const cell of cells) {
    const candy = board[cell.row][cell.col];
    if (!candy) continue;
    const h = runLength(cell.row, cell.col, 0, 1, candy.type);
    const v = runLength(cell.row, cell.col, 1, 0, candy.type);
    if (h >= 3 && v >= 3) {
      const creation = { cell, special: "star" };
      if (h >= 4 || v >= 4) {
        const horizontalLong = h >= 4 && (v < 4 || h >= v);
        const dr = horizontalLong ? 0 : 1;
        const dc = horizontalLong ? 1 : 0;
        const countArm = sign => {
          let count = 0;
          let row = cell.row + dr * sign;
          let col = cell.col + dc * sign;
          while (row >= 0 && row < rows && col >= 0 && col < cols &&
                 board[row][col] && board[row][col].type === candy.type &&
                 matched.has(row + "," + col)) {
            count++;
            row += dr;
            col += dc;
          }
          return count;
        };
        const negativeArm = countArm(-1);
        const positiveArm = countArm(1);
        // Put the bomb on the shorter tail of the four-run. In the example
        // xxxx / ..x. / ..x., that is the cell immediately to the right
        // of the intersection, producing xxsb.
        const bombDirection = negativeArm < positiveArm ? -1 : 1;
        const bombCell = {
          row: cell.row + dr * bombDirection,
          col: cell.col + dc * bombDirection
        };
        const bombCandy = board[bombCell.row] && board[bombCell.row][bombCell.col];
        if (bombCandy && matched.has(bombCell.row + "," + bombCell.col) &&
            !bombCandy.special && bombCandy.type !== "hot_tamale") {
          creation.extraBombCell = bombCell;
        }
      }
      return creation;
    }
  }

  // A straight five without a crossing creates a Hot Tamale rather than a star.
  for (const cell of cells) {
    const candy = board[cell.row][cell.col];
    if (!candy) continue;
    if (runLength(cell.row, cell.col, 0, 1, candy.type) >= 5 ||
        runLength(cell.row, cell.col, 1, 0, candy.type) >= 5) {
      return { cell: preferredSpawnCell && matched.has(preferredSpawnCell.row + "," + preferredSpawnCell.col)
        ? preferredSpawnCell : cell, special: "hot_tamale" };
    }
  }

  const directions = [{ dr: 0, dc: 1, special: "lineH" }, { dr: 1, dc: 0, special: "lineV" }];
  for (const direction of directions) {
    for (const cell of cells) {
      const candy = board[cell.row][cell.col];
      if (!candy) continue;
      if (runLength(cell.row, cell.col, direction.dr, direction.dc, candy.type) >= 4) {
        return { cell: preferredSpawnCell && matched.has(preferredSpawnCell.row + "," + preferredSpawnCell.col)
          ? preferredSpawnCell : cell, special: direction.special };
      }
    }
  }
  return null;
}

function getMatchCenterCell(cells, preferredSpawnCell) {
  const matched = new Set(cells.map(cell => cell.row + "," + cell.col));
  if (preferredSpawnCell && matched.has(preferredSpawnCell.row + "," + preferredSpawnCell.col)) {
    return { row: preferredSpawnCell.row, col: preferredSpawnCell.col };
  }
  if (!cells.length) return null;
  const centerRow = cells.reduce((sum, cell) => sum + cell.row, 0) / cells.length;
  const centerCol = cells.reduce((sum, cell) => sum + cell.col, 0) / cells.length;
  return cells.reduce((best, cell) => {
    const distance = Math.pow(cell.row - centerRow, 2) + Math.pow(cell.col - centerCol, 2);
    if (!best || distance < best.distance) return { cell, distance };
    return best;
  }, null).cell;
}

function getCascadeBombCell(cells, creationCell, preferredSpawnCell) {
  const creationKey = creationCell ? creationCell.row + "," + creationCell.col : null;
  // Prefer an ordinary matched candy so we can preserve a beam/star created by
  // this same clear and avoid erasing an existing special before it can activate.
  const matchedCandidates = cells.filter(cell => {
    const key = cell.row + "," + cell.col;
    const candy = board[cell.row] && board[cell.row][cell.col];
    return key !== creationKey && candy && !candy.special;
  });
  if (matchedCandidates.length) {
    return getMatchCenterCell(matchedCandidates, preferredSpawnCell);
  }

  // Rarely, all matched cells are already special candies. Still award the bomb
  // by placing it on the nearest ordinary candy, without overwriting another special.
  const centerRow = cells.length
    ? cells.reduce((sum, cell) => sum + cell.row, 0) / cells.length
    : rows / 2;
  const centerCol = cells.length
    ? cells.reduce((sum, cell) => sum + cell.col, 0) / cells.length
    : cols / 2;
  let best = null;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      if (!candy || candy.special || (creationCell && row === creationCell.row && col === creationCell.col)) continue;
      const distance = Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2);
      if (!best || distance < best.distance) best = { cell: { row, col }, distance };
    }
  }
  return best ? best.cell : null;
}

function addTamaleZapEffect(center, targetType) {
  if (!targetType || targetType === "hot_tamale" || targetType === "pumpkin") return;
  const targets = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      if (candy && candy.type === targetType && candy.type !== "pumpkin") targets.push({ row, col });
    }
  }
  specialEffects.push({
    type: "tamaleZap",
    row: center.row,
    col: center.col,
    targets,
    startedAt: millis(),
    duration: 520
  });
}

function addCandyColorCells(unique, typeId) {
  if (!typeId || typeId === "hot_tamale") return false;
  let addedCells = false;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      const key = row + "," + col;
      if (candy && candy.type === typeId && candy.type !== "pumpkin" && !unique.has(key)) {
        unique.set(key, { row, col });
        addedCells = true;
      }
    }
  }
  return addedCells;
}

function beginClear(cells, fromSpecial, preferredSpawnCell, sourceTypes, comboBombCell) {
  if (!fromSpecial) {
    const matchedTamale = cells.find(cell => {
      const candy = board[cell.row] && board[cell.row][cell.col];
      return candy && candy.type === "hot_tamale";
    });
    if (matchedTamale) {
      const blast = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) blast.push({ row, col });
      }
      addSpecialEffect("bomb", matchedTamale);
      beginClear(blast, true);
      return;
    }
  }
  let clearCells = cells.slice();
  const unique = new Map();
  const addCell = cell => {
    if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) return;
    unique.set(cell.row + "," + cell.col, { row: cell.row, col: cell.col });
  };
  clearCells.forEach(addCell);

  const zapSourceTypes = Array.from(new Set(
    (Array.isArray(sourceTypes) ? sourceTypes : sourceTypes ? [sourceTypes] : [])
      .filter(Boolean)
  ));
  // If a beam/cross/bomb hits a Hot Tamale, clear every candy of the color
  // belonging to the ability that hit it, as well as the ability's normal area.
  const hitsHotTamale = fromSpecial && clearCells.some(cell => {
    const candy = board[cell.row] && board[cell.row][cell.col];
    return candy && candy.type === "hot_tamale";
  });
  if (hitsHotTamale) {
    const tamaleCells = clearCells.filter(cell => {
      const candy = board[cell.row] && board[cell.row][cell.col];
      return candy && candy.type === "hot_tamale";
    });
    for (const tamaleCell of tamaleCells) {
      for (const typeId of zapSourceTypes) {
        addTamaleZapEffect(tamaleCell, typeId);
        addCandyColorCells(unique, typeId);
      }
    }
  }

  // Count the initial match as 1, the first cascade as 2, and the second as 3.
  // Every third clear in a chain spawns exactly one bomb. If that same clear makes
  // a beam/star, keep it and place the bomb on another ordinary candy.
  if (!fromSpecial) {
    let creation = getMatchSpecial(clearCells, preferredSpawnCell);
    const keyOf = cell => cell ? cell.row + "," + cell.col : null;
    const reservedBombKey = keyOf(comboBombCell);

    // Never overwrite a powered candy just because it was the preferred
    // match-spawn location. Let the existing special fire, and put the new
    // match reward on another ordinary candy in the same match instead.
    if (creation && !creation.clearBoard) {
      const creationCandy = board[creation.cell.row] && board[creation.cell.row][creation.cell.col];
      const creationKey = keyOf(creation.cell);
      if (!creationCandy || creationCandy.special || creationKey === reservedBombKey) {
        const alternate = clearCells.find(cell => {
          const key = keyOf(cell);
          const candy = board[cell.row] && board[cell.row][cell.col];
          return key !== creationKey && key !== reservedBombKey && candy && !candy.special &&
            !["hot_tamale", "pumpkin", "peppermint"].includes(candy.type);
        });
        if (alternate) {
          creation.cell = { row: alternate.row, col: alternate.col };
        } else {
          // Protect existing specials if there is no safe cell for the new one.
          creation = null;
        }
      }

      if (creation && creation.extraStarCell) {
        const starKey = keyOf(creation.extraStarCell);
        const starCandy = board[creation.extraStarCell.row] && board[creation.extraStarCell.row][creation.extraStarCell.col];
        if (!starCandy || starCandy.special || starKey === keyOf(creation.cell) || starKey === reservedBombKey) {
          const alternateStar = clearCells.find(cell => {
            const key = keyOf(cell);
            const candy = board[cell.row] && board[cell.row][cell.col];
            return key !== keyOf(creation.cell) && key !== reservedBombKey && candy && !candy.special &&
              !["hot_tamale", "pumpkin", "peppermint"].includes(candy.type);
          });
          if (alternateStar) creation.extraStarCell = { row: alternateStar.row, col: alternateStar.col };
          else delete creation.extraStarCell;
        }
      }

      if (creation && creation.extraBombCell) {
        const extraKey = keyOf(creation.extraBombCell);
        const extra = board[creation.extraBombCell.row] && board[creation.extraBombCell.row][creation.extraBombCell.col];
        const clashes = extraKey === keyOf(creation.cell) || extraKey === reservedBombKey || !extra || extra.special;
        if (clashes) {
          const alternateExtra = clearCells.find(cell => {
            const key = keyOf(cell);
            const candy = board[cell.row] && board[cell.row][cell.col];
            return key !== keyOf(creation.cell) && key !== reservedBombKey && candy && !candy.special &&
              !["hot_tamale", "pumpkin", "peppermint"].includes(candy.type) &&
              Math.abs(cell.row - creation.cell.row) + Math.abs(cell.col - creation.cell.col) === 1;
          });
          if (alternateExtra) creation.extraBombCell = { row: alternateExtra.row, col: alternateExtra.col };
          else delete creation.extraBombCell;
        }
      }
    }

    if (creation && creation.clearBoard) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) addCell({ row, col });
      }
    } else if (creation) {
      const candy = board[creation.cell.row][creation.cell.col];
      if (candy) {
        if (creation.special === "hot_tamale") {
          candy.type = "hot_tamale";
          candy.special = null;
          candy.specialDirection = null;
        } else {
          candy.special = creation.special;
          candy.specialDirection = creation.special === "lineH" ? "horizontal" :
            creation.special === "lineV" ? "vertical" : null;
        }
        candy.bornAt = millis();
        unique.delete(creation.cell.row + "," + creation.cell.col);
      }
      if (creation.extraBombCell) {
        const extra = board[creation.extraBombCell.row][creation.extraBombCell.col];
        if (extra) {
          extra.special = "bomb";
          extra.specialDirection = null;
          extra.bornAt = millis();
          unique.delete(creation.extraBombCell.row + "," + creation.extraBombCell.col);
        }
      }
      if (creation.extraStarCell) {
        const extra = board[creation.extraStarCell.row][creation.extraStarCell.col];
        if (extra) {
          extra.special = "star";
          extra.specialDirection = null;
          extra.bornAt = millis();
          unique.delete(creation.extraStarCell.row + "," + creation.extraStarCell.col);
        }
      }
    }

    // A double-completing swap leaves a bomb on one of its two candies.
    // It is a newly-created power-up, so it remains on the board until used.
    if (comboBombCell && !(creation && creation.clearBoard)) {
      const bombCandy = board[comboBombCell.row] && board[comboBombCell.row][comboBombCell.col];
      if (bombCandy && !bombCandy.special &&
          !["hot_tamale", "pumpkin", "peppermint"].includes(bombCandy.type)) {
        bombCandy.special = "bomb";
        bombCandy.specialDirection = null;
        bombCandy.bornAt = millis();
        unique.delete(keyOf(comboBombCell));
      }
    }

    if ((!creation || !creation.clearBoard) && combo > 1 && combo % 3 === 0) {
      const center = getCascadeBombCell(
        clearCells,
        creation ? creation.cell : null,
        preferredSpawnCell
      );
      if (center) {
        const candy = board[center.row][center.col];
        if (candy && !candy.special) {
          candy.special = "bomb";
          candy.specialDirection = null;
          candy.bornAt = millis();
          unique.delete(center.row + "," + center.col);
        }
      }
    }
  }

  // Any existing special caught in a clear fires too. Repeat for chain reactions,
  // while tracking activations so a special can never trigger twice in one resolution.
  const activated = new Set();
  let expanded = true;
  while (expanded) {
    expanded = false;
    const currentCells = Array.from(unique.values());
    for (const cell of currentCells) {
      const candy = board[cell.row] && board[cell.row][cell.col];
      if (!candy || !candy.special) continue;
      const key = cell.row + "," + cell.col;
      if (activated.has(key)) continue;
      activated.add(key);
      const special = candy.special;
      const effectType = special === "lineH" ? "beamH" : special === "lineV" ? "beamV" :
        special === "star" ? "cross" : "bomb";
      addSpecialEffect(effectType, cell);
      const effectCells = getSpecialClearCells(special, cell);
      const sourceCandyType = candy.type;
      const hitTamaleCells = effectCells.filter(effectCell => {
        const hitCandy = board[effectCell.row] && board[effectCell.row][effectCell.col];
        return hitCandy && hitCandy.type === "hot_tamale";
      });
      for (const effectCell of effectCells) {
        const effectKey = effectCell.row + "," + effectCell.col;
        if (!unique.has(effectKey)) {
          unique.set(effectKey, effectCell);
          expanded = true;
        }
      }
      // Any beam, cross, or bomb that reaches a Hot Tamale triggers its color zap.
      // Newly zapped specials are resolved by this same chain-reaction loop.
      for (const tamaleCell of hitTamaleCells) {
        addTamaleZapEffect(tamaleCell, sourceCandyType);
        if (addCandyColorCells(unique, sourceCandyType)) expanded = true;
      }
    }
  }

  pendingMatches = Array.from(unique.values());
  if (!pendingMatches.length) {
    gameState = "playing";
    return;
  }

  let peppermintsCount = 0;
  for (const cell of pendingMatches) {
    const candy = board[cell.row][cell.col];
    if (candy && candy.type === "peppermint") peppermintsCount++;
  }

  score += pendingMatches.length * 10 * combo;
  if (fromSpecial) score += Math.min(100, pendingMatches.length * 2);
  if (currentMode.id === "fast" && peppermintsCount > 0) {
    timeLeft += peppermintsCount * peppermintTimeBonus;
  }
  combo++;
  clearSequence++;
  gameState = "clearing";
  phaseStartedAt = millis();
  phaseEndsAt = phaseStartedAt + clearDelay;
}

function updateGame() {
  const now = millis();
  if (shuffleAnimation && now - shuffleAnimation.startedAt >= shuffleAnimation.duration) {
    shuffleAnimation = null;
  }

  if (currentMode.id === "fast" && gameState !== "gameover") {
    timeLeft -= Math.max(0, now - lastTickAt) / 1000;
    if (timeLeft <= 0) {
      timeLeft = 0;
      // Don't interrupt an in-progress clear/cascade. Let every special and
      // post-fall match resolve; a peppermint cleared in that chain can still
      // award time before the board finally settles.
      if (gameState === "playing") {
        finishGame(false, "TIME UP");
        return;
      }
    }
  }
  lastTickAt = now;

  if (gameState === "clearing" && now >= phaseEndsAt) {
    for (let i = 0; i < pendingMatches.length; i++) {
      const cell = pendingMatches[i];
      if (board[cell.row] && board[cell.row][cell.col]) board[cell.row][cell.col] = null;
    }
    applyGravityAndRefill();
    gameState = "falling";
    phaseStartedAt = now;
    phaseEndsAt = now + fallDelay;
    pendingMatches = [];
  } else if (gameState === "falling" && now >= phaseEndsAt) {
    const matches = findMatches(board);
    if (matches.length) {
      beginClear(matches, false);
    } else {
      gameState = "playing";
      combo = 1;
      registerActivity();
      if (currentMode.id === "puzzle" && countPumpkins() === 0) {
        finishGame(true, "PUMPKINS SMASHED");
        return;
      }
      if (currentMode.id === "fast" && timeLeft <= 0) {
        finishGame(false, "TIME UP");
        return;
      }
      afterBoardSettles();
    }
  }

  if (gameState === "playing" && currentMode.moves !== null && movesLeft <= 0) {
    finishGame(false, "OUT OF MOVES");
  }
}

function applyGravityAndRefill() {
  const now = millis();
  for (let col = 0; col < cols; col++) {
    let writeRow = rows - 1;
    for (let row = rows - 1; row >= 0; row--) {
      const candy = board[row][col];
      if (!candy) continue;
      if (writeRow !== row) {
        candy.fall = {
          fromY: boardY + row * cellSize + cellSize / 2,
          startedAt: now,
          duration: 190 + Math.min(100, (writeRow - row) * 20)
        };
      } else {
        candy.fall = null;
      }
      board[writeRow][col] = candy;
      writeRow--;
    }
    // Fill from the top down so generated candies can avoid triples above them.
    for (let row = 0; row <= writeRow; row++) {
      const candy = createCandyAt(board, row, col, true);
      candy.fall = {
        fromY: boardY - (writeRow - row + 1) * cellSize - 10,
        startedAt: now,
        duration: 230 + Math.min(110, (writeRow - row) * 25)
      };
      board[row][col] = candy;
    }
  }
  ensureFastPeppermint(board, false);
}

function afterBoardSettles() {
  if (currentMode.moves !== null && movesLeft <= 0) {
    if (currentMode.id === "puzzle" && countPumpkins() === 0) finishGame(true, "PUMPKINS SMASHED");
    else finishGame(false, currentMode.id === "puzzle" ? "PUMPKINS REMAIN" : "OUT OF MOVES");
    return;
  }
  if (!boardHasLegalMove(board)) {
    if (currentMode.id === "classic") finishGame(false, "NO MOVES LEFT");
    else reshuffleBoard();
  }
}
function reshuffleBoard() {
  shuffleCount++;
  const candies = [];
  const originalPositions = new Map();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      candies.push(candy);
      if (candy) originalPositions.set(candy, { row, col });
    }
  }

  for (let attempt = 0; attempt < 140; attempt++) {
    for (let i = candies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = candies[i];
      candies[i] = candies[j];
      candies[j] = temp;
    }
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        board[row][col] = candies[index++];
        if (board[row][col]) board[row][col].fall = null;
      }
    }
    if (findMatches(board).length === 0 &&
        
        boardHasLegalMove(board)) {
      startShuffleAnimation(originalPositions);
      return;
    }
  }

  board = createFreshPlayableBoard();
  startShuffleAnimation(originalPositions);
}

function startShuffleAnimation(originalPositions) {
  const movements = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const candy = board[row][col];
      if (!candy) continue;
      const from = originalPositions.get(candy) || {
        row: Math.floor(Math.random() * rows),
        col: Math.floor(Math.random() * cols)
      };
      movements.push({ candy, fromRow: from.row, fromCol: from.col, toRow: row, toCol: col });
      candy.fall = null;
    }
  }
  if (currentMode.id === "fast") timeLeft += 15;
  shuffleAnimation = { startedAt: millis(), duration: shuffleAnimationDuration, movements };
  selectedCell = null;
  visualSwap = null;
  hintCells = [];
  registerActivity();
}

function isShuffleAnimating() {
  return Boolean(shuffleAnimation && millis() - shuffleAnimation.startedAt < shuffleAnimation.duration);
}

function drawShuffleCandies() {
  if (!isShuffleAnimating()) return;
  const elapsed = millis() - shuffleAnimation.startedAt;
  const progress = Math.min(1, Math.max(0, elapsed / shuffleAnimation.duration));
  const eased = 1 - Math.pow(1 - progress, 2.4);
  const wobbleAmount = Math.sin(Math.PI * progress);
  for (let i = 0; i < shuffleAnimation.movements.length; i++) {
    const move = shuffleAnimation.movements[i];
    const fromX = boardX + move.fromCol * cellSize + cellSize / 2;
    const fromY = boardY + move.fromRow * cellSize + cellSize / 2;
    const toX = boardX + move.toCol * cellSize + cellSize / 2;
    const toY = boardY + move.toRow * cellSize + cellSize / 2;
    const wobbleX = Math.sin(progress * Math.PI * 4 + i * 0.73) * 4.5 * wobbleAmount;
    const wobbleY = Math.cos(progress * Math.PI * 3.5 + i * 0.51) * 3.5 * wobbleAmount;
    drawCandy(move.candy, lerp(fromX, toX, eased) + wobbleX, lerp(fromY, toY, eased) + wobbleY, cellSize);
  }
}

function drawShuffleOverlay() {
  if (!isShuffleAnimating()) return;
  const elapsed = millis() - shuffleAnimation.startedAt;
  const progress = Math.min(1, Math.max(0, elapsed / shuffleAnimation.duration));
  const beamY = boardY + rows * cellSize / 2;

  // Three beats: the sweep darkens the board as it enters, SHUFFLE is
  // announced once the board is dim, then the sweep exits and reveals it.
  const enterEnd = 0.38;
  const holdEnd = 0.68;
  let beamX;
  let shadeAlpha;
  let labelAlpha = 0;

  if (progress < enterEnd) {
    const p = progress / enterEnd;
    const eased = p * p * (3 - 2 * p);
    beamX = -110 + (width + 220) * eased;
    shadeAlpha = 155 * eased;
  } else if (progress < holdEnd) {
    const p = (progress - enterEnd) / (holdEnd - enterEnd);
    beamX = width + 120;
    shadeAlpha = 155;
    labelAlpha = Math.min(1, p * 5, (1 - p) * 5);
  } else {
    const p = (progress - holdEnd) / (1 - holdEnd);
    const eased = p * p * (3 - 2 * p);
    beamX = width + 110 - (width + 220) * eased;
    shadeAlpha = 155 * (1 - eased);
  }

  // During entry, darken the space the sweep has passed. During exit,
  // reveal the board behind it instead of fading the entire screen at once.
  noStroke();
  if (progress < enterEnd) {
    fill(0, 0, 0, shadeAlpha);
    rect(0, 0, Math.max(0, beamX), height);
  } else if (progress < holdEnd) {
    fill(0, 0, 0, shadeAlpha);
    rect(0, 0, width, height);
  } else {
    fill(0, 0, 0, shadeAlpha);
    rect(0, 0, Math.min(width, Math.max(0, beamX)), height);
  }

  // Keep the moving glow visible during entry and exit, but let the label
  // have its own beat while the board is fully dimmed.
  if (progress < enterEnd || progress >= holdEnd) {
    const edgePulse = progress < enterEnd
      ? Math.min(1, progress / 0.08)
      : Math.min(1, (1 - progress) / 0.08);
    const visible = Math.max(0, edgePulse);
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,135,20,0.98)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = `rgba(255,175,58,${0.95 * visible})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(beamX - 105, beamY);
    ctx.lineTo(beamX + 105, beamY);
    ctx.stroke();
    ctx.shadowColor = "rgba(255,245,195,0.98)";
    ctx.shadowBlur = 9;
    ctx.strokeStyle = `rgba(255,255,245,${0.75 * visible})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  if (labelAlpha > 0) {
    push();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(27);
    stroke(255, 175, 58, 210 * labelAlpha);
    strokeWeight(2);
    fill(255, 247, 205, 245 * labelAlpha);
    text("SHUFFLE", width / 2, beamY - 10);
    if (currentMode.id === "fast") {
      textSize(12);
      text("+15 SECONDS", width / 2, beamY + 16);
    }
    pop();
  }
}

function finishGame(won, reason) {
  gameState = "gameover";
  endWon = Boolean(won);
  endReason = reason;
  selectedCell = null;
  pendingMatches = [];
  resultSummary = "SCORE  " + score;
}

function drawGame() {
  updateIdleHint();
  drawHUD();
  drawBoard();

  if (gameState === "clearing") drawClearHighlights();
  drawSpecialEffects();
  drawIdleHint();
  drawShuffleOverlay();
}

function updateIdleHint() {
  const now = millis();
  if (isShuffleAnimating()) {
    hintCells = [];
    return;
  }
  if (gameState !== "playing") {
    hintCells = [];
    return;
  }

  if (visualSwap && now - visualSwap.startedAt < visualSwap.duration) return;
  if (now - lastActivityAt < hintIdleDuration) return;
  if (hintCells.length && now - hintStartedAt < hintFlashDuration) return;

  hintCells = [];
  if (lastHintAt && now - lastHintAt < hintRepeatDuration) return;

  const hint = findBasicHint();
  lastHintAt = now;
  if (hint) {
    hintCells = hint.cells;
    hintStartedAt = now;
  }
}

function drawIdleHint() {
  if (!hintCells.length || gameState !== "playing") return;

  const elapsed = millis() - hintStartedAt;
  if (elapsed >= hintFlashDuration) return;
  const pulse = 0.5 + 0.5 * Math.sin(elapsed / 85);

  noFill();
  stroke(255, 165, 0, 75 + pulse * 180);
  strokeWeight(1.5 + pulse * 1.5);
  for (let i = 0; i < hintCells.length; i++) {
    const cell = hintCells[i];
    const x = boardX + cell.col * cellSize;
    const y = boardY + cell.row * cellSize;
    rect(x + 3, y + 3, cellSize - 6, cellSize - 6);
  }
}

function drawHUD() {
  noStroke();
  fill(black);
  rect(0, 0, width, 45);
  stroke(orange);
  strokeWeight(2);
  line(0, 44, width, 44);
  noStroke();

  fill(orange);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  textSize(11);
  text(currentMode.name, 8, 13);
  fill(white);
  textStyle(NORMAL);
  textSize(9);
  text("SCORE " + score, 8, 31);

  textAlign(RIGHT, CENTER);
  fill(orange);
  textStyle(BOLD);
  textSize(12);
  if (currentMode.id === "fast") text("TIME " + formatTime(timeLeft), width - 8, 14);
  else if (movesLeft !== null) text("MOVES " + movesLeft, width - 8, 14);
  fill(white);
  textStyle(NORMAL);
  textSize(9);
  if (currentMode.id === "fast") text("PEPPERMINTS: ABILITIES ONLY (+0.5 SEC)", width - 8, 31);
  else if (currentMode.id === "puzzle") text("PUMPKINS LEFT " + countPumpkins(), width - 8, 31);
  else text("MATCH 3 OR MORE", width - 8, 31);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}

function drawBoard() {
  const shuffleActive = isShuffleAnimating();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = boardX + col * cellSize;
      const y = boardY + row * cellSize;
      const candy = board[row] && board[row][col];

      fill((row + col) % 2 === 0 ? "#123904" : "#1C4E0A");
      stroke("#1C4E0A");
      strokeWeight(1);
      rect(x, y, cellSize, cellSize);

      const isSwapCell = visualSwap && millis() - visualSwap.startedAt < visualSwap.duration &&
        ((visualSwap.from.row === row && visualSwap.from.col === col) ||
         (visualSwap.to.row === row && visualSwap.to.col === col));
      const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
      const isFocus = keyboardNavigationActive && keyboardFocus &&
        keyboardFocus.row === row && keyboardFocus.col === col && gameState !== "gameover";
      if (candy && !isSwapCell && !shuffleActive) {
        const centerX = x + cellSize / 2;
        let centerY = y + cellSize / 2;
        if (candy.fall) {
          const t = Math.min(1, Math.max(0, (millis() - candy.fall.startedAt) / candy.fall.duration));
          const eased = 1 - Math.pow(1 - t, 3);
          centerY = lerp(candy.fall.fromY, centerY, eased);
          if (t >= 1) candy.fall = null;
        }
        drawCandy(candy, centerX, centerY, cellSize * (isSelected ? 1.12 : 1));
      }

      if (isSelected) {
        drawSelectionCorners(x, y, cellSize);
      } else if (isFocus && gameState === "playing" && !selectedCell) {
        noFill();
        stroke("#ffffff");
        strokeWeight(1);
        rect(x + 4, y + 4, cellSize - 8, cellSize - 8);
      }
    }
  }
  if (shuffleActive) drawShuffleCandies();
  else drawVisualSwap();
}

function drawVisualSwap() {
  if (!visualSwap) return;
  const swap = visualSwap;
  const t = Math.min(1, Math.max(0, (millis() - swap.startedAt) / swap.duration));
  if (t >= 1) {
    visualSwap = null;
    return;
  }

  const ax = boardX + swap.from.col * cellSize + cellSize / 2;
  const ay = boardY + swap.from.row * cellSize + cellSize / 2;
  const bx = boardX + swap.to.col * cellSize + cellSize / 2;
  const by = boardY + swap.to.row * cellSize + cellSize / 2;

  if (swap.invalid) {
    // Move toward the attempted destination, then spring back to the original cells.
    const turnAt = 0.54;
    let progress;
    if (t < turnAt) {
      const outbound = t / turnAt;
      progress = 1 - Math.pow(1 - outbound, 3);
    } else {
      const returning = (t - turnAt) / (1 - turnAt);
      const easedBack = 1 - Math.pow(1 - returning, 3);
      // A tiny damped wobble sells the bounce without making the candies jitter.
      progress = 1 - easedBack + Math.sin(returning * Math.PI * 2) * 0.07 * (1 - returning);
    }

    // The board is already back in its original order during an invalid swap.
    const candyAtFrom = board[swap.from.row][swap.from.col];
    const candyAtTo = board[swap.to.row][swap.to.col];
    if (candyAtFrom) drawCandy(candyAtFrom, lerp(ax, bx, progress), lerp(ay, by, progress), cellSize);
    if (candyAtTo) drawCandy(candyAtTo, lerp(bx, ax, progress), lerp(by, ay, progress), cellSize);
    return;
  }

  const eased = 1 - Math.pow(1 - t, 3);
  // The board values have already swapped; animate each new value from its old location.
  const candyAtFrom = board[swap.from.row][swap.from.col];
  const candyAtTo = board[swap.to.row][swap.to.col];
  if (candyAtFrom) drawCandy(candyAtFrom, lerp(bx, ax, eased), lerp(by, ay, eased), cellSize);
  if (candyAtTo) drawCandy(candyAtTo, lerp(ax, bx, eased), lerp(ay, by, eased), cellSize);
}

function drawSelectionCorners(x, y, cellSize) {
  const inset = 3;
  const length = 9;
  const left = x + inset;
  const right = x + cellSize - inset;
  const top = y + inset;
  const bottom = y + cellSize - inset;

  noFill();
  stroke(orange);
  strokeWeight(3);
  line(left, top, left + length, top);
  line(left, top, left, top + length);
  line(right, top, right - length, top);
  line(right, top, right, top + length);
  line(left, bottom, left + length, bottom);
  line(left, bottom, left, bottom - length);
  line(right, bottom, right - length, bottom);
  line(right, bottom, right, bottom - length);
}

function drawCandy(candy, x, y, cellSize) {
  const type = candyTypes.find(item => item.id === candy.type);
  if (!type) return;

  const sprite = images[candy.type];
  const isHotTamale = candy.type === "hot_tamale";
  const energyPhase = millis() / 1000;
  const energyOffset = candy.energyOffset || 0;
  const hotTamalePulse = isHotTamale
    ? 1 + Math.sin(energyPhase * 14.5 + energyOffset) * 0.045 +
        Math.sin(energyPhase * 23.7 + energyOffset * 1.71) * 0.025 : 1;
  const hotTamaleShakeX = isHotTamale
    ? Math.sin(energyPhase * 37 + energyOffset * 2.13) * 1.65 +
        Math.sin(energyPhase * 53 + energyOffset * 0.73) * 0.65 : 0;
  const hotTamaleShakeY = isHotTamale
    ? Math.cos(energyPhase * 31 + energyOffset * 1.37) * 1.35 +
        Math.sin(energyPhase * 47 + energyOffset * 2.59) * 0.5 : 0;
  const hotTamaleTilt = isHotTamale
    ? Math.sin(energyPhase * 34 + energyOffset * 1.19) * 0.075 +
        Math.sin(energyPhase * 49 + energyOffset * 2.31) * 0.025 : 0;
  const drawX = x + hotTamaleShakeX;
  const drawY = y + hotTamaleShakeY;
  if (sprite && sprite.width > 0 && sprite.height > 0) {
    const displaySize = cellSize * (candy.special || type.special ? 0.72 : 0.78);
    const displayHeight = displaySize;
    const displayWidth = displayHeight * sprite.width / sprite.height;
    const drawW = Math.min(displayWidth, cellSize * 0.9) * hotTamalePulse;
    const drawH = Math.min(displayHeight, cellSize * 0.9) * hotTamalePulse;
    if (candy.special === "bomb") {
      const red = Math.min(1, Math.max(0, (millis() - candy.bornAt) / 900));
      tint(255, Math.round(255 - red * 190), Math.round(255 - red * 205), 255);
    }
    push();
    translate(drawX, drawY);
    rotate(hotTamaleTilt);
    image(sprite, 0, 0, drawW, drawH);
    pop();
    noTint();

    // Keep the familiar small shine on directional candies and the classic
    // star/bomb accents. Standard Hot Tamales do not get an extra overlay.
    if (candy.special === "lineH" || candy.special === "lineV") {
      drawMaskedStripe(sprite, x, y, drawW, drawH, candy.special === "lineH");
    } else if (candy.special === "star") {
      const phase = (millis() - candy.bornAt) / 850;
      const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      const scale = 0.55 + 0.38 * pulse;
      drawStarOverlay(x, y, cellSize * 0.32 * scale, 0.62 + 0.28 * pulse);
    } else if (candy.special === "bomb") {
      const pulse = 0.5 + 0.5 * Math.sin((millis() - candy.bornAt) / 150);
      noFill();
      stroke(255, 75, 35, 85 + pulse * 90);
      strokeWeight(1.5);
      ellipse(x, y, cellSize * 0.66, cellSize * 0.66);
    }
  } else {
    push();
    translate(drawX, drawY);
    rotate(hotTamaleTilt);
    scale(hotTamalePulse);
    noStroke();
    fill(candy.type === "hot_tamale" ? "#ffa500" : candy.type === "peppermint" ? "#1C4E0A" : "#ffa500");
    ellipse(0, 0, cellSize * 0.55, cellSize * 0.55);
    fill(black);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    textSize(8);
    text(type.name.slice(0, 2).toUpperCase(), 0, 0);
    textStyle(NORMAL);
    pop();
  }
}

function drawMaskedStripe(sprite, x, y, drawW, drawH, horizontal) {
  if (!effectCanvas || !effectContext || drawW <= 0 || drawH <= 0) return;
  const source = sprite.canvas || sprite.elt;
  if (!source) return;

  const scale = 3;
  const w = Math.max(1, Math.round(drawW * scale));
  const h = Math.max(1, Math.round(drawH * scale));
  if (effectCanvas.width !== w) effectCanvas.width = w;
  if (effectCanvas.height !== h) effectCanvas.height = h;

  const ctx = effectContext;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  const phase = (millis() % 1250) / 1250;
  const axisLength = horizontal ? w : h;
  const spacing = axisLength * 0.23; // Twice the previous line frequency.
  const bandWidth = Math.max(4.5, axisLength * 0.21); // 1.5x thicker bands.

  // Draw several soft parallel glints at once. Their evenly spaced centers
  // travel together, giving the direction marker a repeating striped shine.
  for (let band = -4; band <= 7; band++) {
    const center = band * spacing + phase * spacing;
    const gradient = horizontal
      ? ctx.createLinearGradient(center - bandWidth, 0, center + bandWidth, 0)
      : ctx.createLinearGradient(0, center - bandWidth, 0, center + bandWidth);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.36, "rgba(255,255,255,0.06)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.78)");
    gradient.addColorStop(0.64, "rgba(255,255,255,0.06)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  // Clip all the stripes together to the candy's actual alpha.
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(source, 0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  drawingContext.save();
  drawingContext.globalAlpha = 0.9;
  drawingContext.globalCompositeOperation = "source-over";
  drawingContext.drawImage(effectCanvas, x - drawW / 2, y - drawH / 2, drawW, drawH);
  drawingContext.restore();
}

function drawStarOverlay(x, y, radius, alpha) {
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,245,175,0.8)";
  ctx.strokeStyle = "rgba(255,255,255,0.98)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(255,245,170,0.9)";
  ctx.shadowBlur = 7;
  ctx.beginPath();
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const a = i / steps * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const denom = Math.sqrt(Math.abs(ca)) + Math.sqrt(Math.abs(sa));
    const px = (denom ? ca / (denom * denom) : 0) * radius * 2.05;
    const py = (denom ? sa / (denom * denom) : 0) * radius * 2.05;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSpecialEffects() {
  const now = millis();
  specialEffects = specialEffects.filter(effect => now - effect.startedAt < effect.duration);

  for (const effect of specialEffects) {
    const progress = Math.min(1, Math.max(0, (now - effect.startedAt) / effect.duration));
    const centerX = boardX + effect.col * cellSize + cellSize / 2;
    const centerY = boardY + effect.row * cellSize + cellSize / 2;

    if (effect.type === "beamH") {
      drawRayBeam(centerX, centerY, true, progress);
    } else if (effect.type === "beamV") {
      drawRayBeam(centerX, centerY, false, progress);
    } else if (effect.type === "cross") {
      // Two crossing rays launch from the special candy at the same time.
      drawRayBeam(centerX, centerY, true, progress);
      drawRayBeam(centerX, centerY, false, progress);
    } else if (effect.type === "bomb") {
      drawBombExplosion(centerX, centerY, progress);
    } else if (effect.type === "tamaleZap") {
      drawTamaleZap(centerX, centerY, progress, effect.targets || []);
    }
  }
}

function drawRayBeam(centerX, centerY, horizontal, progress) {
  const ctx = drawingContext;
  const left = boardX + 2;
  const right = boardX + cols * cellSize - 2;
  const top = boardY + 2;
  const bottom = boardY + rows * cellSize - 2;
  // The fronts ease out from the candy, sending a pair of rays toward each edge.
  const travel = 1 - Math.pow(1 - progress, 2.5);
  const visibility = 1 - 0.24 * progress;
  const heads = horizontal
    ? [
        { x: centerX + (left - centerX) * travel, y: centerY },
        { x: centerX + (right - centerX) * travel, y: centerY }
      ]
    : [
        { x: centerX, y: centerY + (top - centerY) * travel },
        { x: centerX, y: centerY + (bottom - centerY) * travel }
      ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const head of heads) {
    // Warm, soft glow under a crisp near-white core gives the ray a layered look.
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = `rgba(255, 135, 28, ${0.78 * visibility})`;
    ctx.lineWidth = 24;
    ctx.shadowColor = "rgba(255, 160, 45, 0.95)";
    ctx.shadowBlur = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = `rgba(255, 237, 170, ${0.96 * visibility})`;
    ctx.lineWidth = 9.75;
    ctx.shadowColor = "rgba(255, 245, 195, 0.95)";
    ctx.shadowBlur = 7;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(head.x, head.y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.99 * visibility})`;
    ctx.lineWidth = 3.3;
    ctx.shadowBlur = 2;
    ctx.stroke();

    // Two thinner companion tracks make each direction a ribbon of parallel rays.
    for (const offset of [-6, -3, 3, 6]) {
      const ox = horizontal ? 0 : offset;
      const oy = horizontal ? offset : 0;
      ctx.beginPath();
      ctx.moveTo(centerX + ox, centerY + oy);
      ctx.lineTo(head.x + ox, head.y + oy);
      ctx.strokeStyle = `rgba(255, 152, 54, ${0.62 * visibility})`;
      ctx.lineWidth = 9;
      ctx.shadowColor = "rgba(255, 158, 45, 0.85)";
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX + ox, centerY + oy);
      ctx.lineTo(head.x + ox, head.y + oy);
      ctx.strokeStyle = `rgba(255, 243, 203, ${0.76 * visibility})`;
      ctx.lineWidth = 2.25;
      ctx.shadowBlur = 3;
      ctx.stroke();
    }

    // The leading spark marks the current wavefront instead of showing the whole
    // beam across the board from the very first animation frame.
    const headRadius = 5 + 3.5 * Math.sin(Math.PI * progress);
    const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, headRadius * 3.0);
    glow.addColorStop(0, "rgba(255,255,245,0.98)");
    glow.addColorStop(0.3, "rgba(255,224,135,0.82)");
    glow.addColorStop(1, "rgba(255,140,25,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius * 3.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }

  // A short-lived flare at the launch point makes the origin read clearly.
  const originRadius = 3 + 5 * Math.sin(Math.PI * progress);
  const originGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, originRadius * 3);
  originGlow.addColorStop(0, "rgba(255,255,255,0.98)");
  originGlow.addColorStop(0.35, "rgba(255,224,130,0.84)");
  originGlow.addColorStop(1, "rgba(255,150,30,0)");
  ctx.fillStyle = originGlow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, originRadius * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTamaleZap(centerX, centerY, progress, targets) {
  if (!targets.length) return;
  const ctx = drawingContext;
  const travel = Math.min(1, progress * 1.65);
  const fade = Math.min(1, (1 - progress) * 1.8);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = 0; index < targets.length; index++) {
    const target = targets[index];
    const endX = boardX + target.col * cellSize + cellSize / 2;
    const endY = boardY + target.row * cellSize + cellSize / 2;
    const dx = endX - centerX;
    const dy = endY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) continue;
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const segments = Math.max(3, Math.min(7, Math.ceil(distance / 42)));
    const endSegment = Math.max(1, Math.ceil(segments * travel));
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    for (let segment = 1; segment <= endSegment; segment++) {
      const along = Math.min(travel, segment / segments);
      const offset = segment === segments || along >= 1
        ? 0
        : Math.sin(segment * 12.7 + index * 5.1) * (3 + (index % 3));
      ctx.lineTo(centerX + dx * along + perpX * offset, centerY + dy * along + perpY * offset);
    }
    ctx.strokeStyle = `rgba(255,135,25,${0.84 * fade})`;
    ctx.lineWidth = 3.2;
    ctx.shadowColor = "rgba(255,145,25,0.98)";
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,250,205,${0.95 * fade})`;
    ctx.lineWidth = 1.25;
    ctx.shadowBlur = 3;
    ctx.stroke();
  }

  const flash = Math.max(0, 1 - progress * 2.4);
  if (flash > 0) {
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 24 * (1 + progress));
    glow.addColorStop(0, `rgba(255,255,245,${0.95 * flash})`);
    glow.addColorStop(0.35, `rgba(255,195,70,${0.75 * flash})`);
    glow.addColorStop(1, "rgba(255,125,20,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24 * (1 + progress), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBombExplosion(centerX, centerY, progress) {
  const ctx = drawingContext;
  const maxRadius = cellSize * 1.5; // A three-by-three cell footprint.
  const eased = 1 - Math.pow(1 - progress, 2.15);
  const radius = Math.max(0.75, maxRadius * eased);
  const fade = Math.pow(1 - progress, 0.72);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Soft, expanding flash behind the rings.
  const bloom = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  bloom.addColorStop(0, `rgba(255,250,210,${0.28 * fade})`);
  bloom.addColorStop(0.42, `rgba(255,145,38,${0.18 * fade})`);
  bloom.addColorStop(0.78, `rgba(255,75,24,${0.09 * fade})`);
  bloom.addColorStop(1, "rgba(255,60,15,0)");
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Main shockwave and a trailing inner ring, both fading as they expand.
  const rings = [
    { r: radius, alpha: 0.94, width: 4.5 * fade + 1 },
    { r: maxRadius * Math.max(0, eased - 0.2), alpha: 0.58 * fade, width: 2.2 * fade + 0.8 }
  ];
  for (const ring of rings) {
    if (ring.r < 1) continue;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,220,135,${ring.alpha})`;
    ctx.lineWidth = ring.width;
    ctx.shadowColor = "rgba(255,105,25,0.9)";
    ctx.shadowBlur = 12 * fade;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,245,${0.52 * fade})`;
    ctx.lineWidth = Math.max(0.8, ring.width * 0.32);
    ctx.shadowBlur = 2;
    ctx.stroke();
  }

  // Tiny radial sparks add a burst without obscuring the board.
  const sparkRadius = radius * 0.88;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + 0.18;
    const inner = sparkRadius - (4 + 5 * fade);
    const outer = sparkRadius + 2 + 9 * fade;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    ctx.strokeStyle = `rgba(255,244,195,${0.8 * fade})`;
    ctx.lineWidth = 1.6 + fade;
    ctx.shadowColor = "rgba(255,150,35,0.85)";
    ctx.shadowBlur = 6;
    ctx.stroke();
  }

  const coreRadius = Math.max(0, 10 * (1 - progress));
  const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(1, coreRadius * 2));
  core.addColorStop(0, `rgba(255,255,250,${0.9 * fade})`);
  core.addColorStop(0.45, `rgba(255,215,125,${0.56 * fade})`);
  core.addColorStop(1, "rgba(255,130,25,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.max(1, coreRadius * 2), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawClearHighlights() {
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin((millis() - phaseStartedAt) / 55));
  for (let i = 0; i < pendingMatches.length; i++) {
    const cell = pendingMatches[i];
    const x = boardX + cell.col * cellSize;
    const y = boardY + cell.row * cellSize;
    noStroke();
    fill(255, 255, 255, 70 + pulse * 110);
    rect(x + 3, y + 3, cellSize - 6, cellSize - 6);
  }
}

function drawGameOverScreen() {
  noStroke();
  fill(0, 0, 0, 190);
  rect(0, 0, width, height);

  const panelX = 35;
  const panelY = 119;
  const panelW = width - panelX * 2;
  const panelH = 166;
  fill(black);
  stroke(orange);
  strokeWeight(3);
  rect(panelX, panelY, panelW, panelH);

  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(endWon ? "#ffffff" : orange);
  textSize(endWon ? 22 : 24);
  text(endReason || "GAME OVER", width / 2, panelY + 36);
  fill(white);
  textStyle(NORMAL);
  textSize(14);
  text("SCORE  " + score, width / 2, panelY + 73);
  textSize(10);
  if (currentMode.id === "fast") text("PEPPERMINTS ADDED TIME", width / 2, panelY + 96);
  else if (currentMode.id === "puzzle") text("MOVES USED  " + (currentMode.moves - Math.max(0, movesLeft)), width / 2, panelY + 96);
  else text("NO LEGAL SWAPS REMAIN", width / 2, panelY + 96);

  const replayHover = mouseX >= 69 && mouseX <= 195 && mouseY >= 220 && mouseY <= 258;
  const menuHover = mouseX >= 205 && mouseX <= 331 && mouseY >= 220 && mouseY <= 258;
  fill(replayHover ? "#1C4E0A" : "#0C2504");
  stroke(orange);
  strokeWeight(1);
  rect(69, 220, 126, 38);
  fill(menuHover ? "#1C4E0A" : black);
  rect(205, 220, 126, 38);
  noStroke();
  fill(white);
  textStyle(BOLD);
  textSize(11);
  text("PLAY AGAIN", 132, 239);
  text("MODE SELECT", 268, 239);
  textStyle(NORMAL);
  fill(white);
  textSize(8);
  text("ENTER: REPLAY   ·   ESC: MENU", width / 2, 270);
}

function mousePressed(event) {
  if (gameState === "title") {
    if (mouseX >= 112 && mouseX <= 288 && mouseY >= 302 && mouseY <= 348) {
      startGame(selectedModeIndex);
      return false;
    }
    if (mouseY >= 135 && mouseY <= 226 && mouseX < 120) {
      selectedModeIndex = (selectedModeIndex + modes.length - 1) % modes.length;
      return false;
    }
    if (mouseY >= 135 && mouseY <= 226 && mouseX > 280) {
      selectedModeIndex = (selectedModeIndex + 1) % modes.length;
      return false;
    }
    // The central candy also selects Play for convenience.
    if (Math.hypot(mouseX - 200, mouseY - 184) <= 50) {
      startGame(selectedModeIndex);
      return false;
    }
    return false;
  }

  if (gameState === "gameover") {
    if (mouseX >= 69 && mouseX <= 195 && mouseY >= 220 && mouseY <= 258) {
      startGame(selectedModeIndex);
    } else if (mouseX >= 205 && mouseX <= 331 && mouseY >= 220 && mouseY <= 258) {
      gameState = "title";
      selectedCell = null;
    }
    return false;
  }

  if (gameState !== "playing") return false;
  if (isShuffleAnimating()) return false;
  if (visualSwap && millis() - visualSwap.startedAt < visualSwap.duration) return false;
  keyboardNavigationActive = false;
  registerActivity();
  const cell = getCellAt(mouseX, mouseY);
  if (!cell) return false;

  keyboardFocus = { row: cell.row, col: cell.col };
  if (!selectedCell) {
    selectedCell = cell;
  } else if (selectedCell.row === cell.row && selectedCell.col === cell.col) {
    selectedCell = null;
  } else if (areAdjacent(selectedCell, cell)) {
    const from = selectedCell;
    const selectedCandy = board[from.row] && board[from.row][from.col];
    const targetCandy = board[cell.row] && board[cell.row][cell.col];
    const tryTamaleMatch = Boolean(selectedCandy && selectedCandy.type !== "hot_tamale" &&
      targetCandy && targetCandy.type === "hot_tamale");
    const swapped = trySwap(from, cell, tryTamaleMatch);
    if (!swapped) selectedCell = from;
  } else {
    selectedCell = cell;
  }
  return false;
}

function keyPressed(event) {
  const key = event && event.key ? event.key : "";
  if (event && event.repeat) return false;

  if (gameState === "title") {
    if (key === "ArrowLeft") {
      selectedModeIndex = (selectedModeIndex - 1 + modes.length) % modes.length;
      return false;
    }
    if (key === "ArrowRight") {
      selectedModeIndex = (selectedModeIndex + 1) % modes.length;
      return false;
    }
    if (key === "Enter" || key === " ") {
      startGame(selectedModeIndex);
      return false;
    }
    return;
  }

  if (gameState === "gameover") {
    if (key === "Enter" || key === " ") {
      startGame(selectedModeIndex);
      return false;
    }
    if (key === "Escape") {
      gameState = "title";
      return false;
    }
    return;
  }

  if (key === "Escape") {
    gameState = "title";
    selectedCell = null;
    return false;
  }
  if (gameState !== "playing") return;
  if (isShuffleAnimating()) return false;
  if (visualSwap && millis() - visualSwap.startedAt < visualSwap.duration) return false;
  registerActivity();

  const directions = {
    ArrowUp: { row: -1, col: 0 },
    ArrowDown: { row: 1, col: 0 },
    ArrowLeft: { row: 0, col: -1 },
    ArrowRight: { row: 0, col: 1 }
  };
  const direction = directions[key];
  if (direction) {
    keyboardNavigationActive = true;
    if (selectedCell) {
      const to = {
        row: selectedCell.row + direction.row,
        col: selectedCell.col + direction.col
      };
      if (to.row >= 0 && to.row < rows && to.col >= 0 && to.col < cols) {
        const from = selectedCell;
        const tryTamaleMatch = Boolean(board[from.row][from.col] &&
          board[from.row][from.col].type !== "hot_tamale" &&
          board[to.row][to.col] && board[to.row][to.col].type === "hot_tamale");
        if (trySwap(from, to, tryTamaleMatch)) keyboardFocus = to;
      }
    } else {
      keyboardFocus = {
        row: Math.max(0, Math.min(rows - 1, keyboardFocus.row + direction.row)),
        col: Math.max(0, Math.min(cols - 1, keyboardFocus.col + direction.col))
      };
    }
    return false;
  }

  if (key === "Enter" || key === " ") {
    keyboardNavigationActive = true;
    if (selectedCell) {
      if (selectedCell.row === keyboardFocus.row && selectedCell.col === keyboardFocus.col) {
        selectedCell = null;
      } else if (areAdjacent(selectedCell, keyboardFocus)) {
        const from = selectedCell;
        if (!trySwap(from, keyboardFocus)) selectedCell = from;
      } else {
        selectedCell = { row: keyboardFocus.row, col: keyboardFocus.col };
      }
    } else {
      selectedCell = { row: keyboardFocus.row, col: keyboardFocus.col };
    }
    return false;
  }
}

function windowResized() {
  resizeCanvasToContainer();
}
