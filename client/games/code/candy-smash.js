/*
 * Candy Smash
 * Standalone p5.js global-mode match-three game for the Pumpkin Smasher arcade.
 * Special candies use the existing candy sprites with animated canvas effects.
 */

const CS_WIDTH = 400;
const CS_HEIGHT = 400;
const CS_COLS = 8;
const CS_ROWS = 8;
const CS_CELL = 40;
const CS_BOARD_X = 40;
const CS_BOARD_Y = 56;
const CS_BG = "#123904";
const CS_BLACK = "#0C2504";
const CS_ORANGE = "#ffa500";
const CS_WHITE = "#ffffff";
const CS_CLEAR_DELAY = 270;
const CS_SPECIAL_EFFECT_MS = 520;
const CS_FALL_DELAY = 390;

// Wave-field constants ported from the candy-enchantment demo.
const CS_WAVE_PERIOD = 27;
const CS_WAVE_PHASE_SPEED = 5.8;
const CS_RADIAL_SPACING = 1.0;
const CS_RADIAL_SPEED = 1.0;
const CS_STAR_SPACING = 1.0;
const CS_STAR_SPEED = 1.0;
const CS_WAVE_ALPHA = 78;
const CS_WAVE_REFERENCE_SIZE = 232;
const CS_NATURAL_SPECIAL_CHANCE = 0.015;
const CS_FRENZY_NATURAL_SPECIAL_CHANCE = 0.10;
const CS_FRENZY_HOT_TAMALE_WEIGHT = 0.3;
const CS_FRENZY_TAMALE_GUARANTEE_INTERVAL = 60;
const CS_SHUFFLE_ANIMATION_MS = 780;
const CS_PEPPERMINT_TIME_BONUS = 1;
const CS_HINT_IDLE_MS = 5000;
const CS_HINT_FLASH_MS = 1500;
const CS_HINT_REPEAT_MS = 7000;

const CS_CANDY_TYPES = [
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

const CS_MODES = [
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
    description: "18 moves. Destroy every pumpkin using special abilities.",
    candyId: "smarties",
    moves: 18,
    seconds: null
  }
];

let csImages = {};
let csState = "title";
let csSelectedMode = 0;
let csMode = CS_MODES[0];
let csBoard = [];
let csScore = 0;
let csMovesLeft = 0;
let csTimeLeft = 0;
let csStartedAt = 0;
let csLastTickAt = 0;
let csSelected = null;
let csKeyboardFocus = { row: 0, col: 0 };
let csKeyboardNavigationActive = false;
let csPendingMatches = [];
let csPhaseStartedAt = 0;
let csPhaseEndsAt = 0;
let csCombo = 1;
let csEndReason = "";
let csEndWon = false;
let csResultSummary = "";
let csShuffleCount = 0;
let csShuffleAnimation = null;
let csCandiesSinceHotTamale = 0;
let csVisualSwap = null;
let csLastActivityAt = 0;
let csLastHintAt = 0;
let csHintCells = [];
let csHintStartedAt = 0;
let csSpecialEffects = [];
let csClearSequence = 0;
let csEffectCanvas = null;
let csEffectContext = null;

function preload() {
  for (let i = 0; i < CS_CANDY_TYPES.length; i++) {
    const type = CS_CANDY_TYPES[i];
    csImages[type.id] = loadImage(type.path, () => {}, () => {});
  }
}

function setup() {
  createCanvas(CS_WIDTH, CS_HEIGHT);
  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  textFont("Arial");
  csEffectCanvas = document.createElement("canvas");
  csEffectContext = csEffectCanvas.getContext("2d");
  csResizeCanvasToContainer();
  window.addEventListener("resize", csResizeCanvasToContainer);
}

function csResizeCanvasToContainer() {
  const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  canvas.style.width = side + "px";
  canvas.style.height = side + "px";
  canvas.style.imageRendering = "pixelated";
}

function draw() {
  background(CS_BG);

  if (csState === "title") {
    csDrawTitle();
    return;
  }

  csUpdateGame();
  csDrawGame();

  if (csState === "gameover") csDrawGameOver();
}

function csDrawTitle() {
  noStroke();
  fill(CS_BG);
  rect(0, 0, width, height);
  stroke(CS_ORANGE);
  strokeWeight(2);
  line(0, 91, width, 91);

  noStroke();
  fill(CS_ORANGE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(28);
  text("CANDY SMASH", width / 2, 34);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(9);
  text("CHOOSE A MODE", width / 2, 68);

  const mode = CS_MODES[csSelectedMode];
  const previous = CS_MODES[(csSelectedMode + CS_MODES.length - 1) % CS_MODES.length];
  const next = CS_MODES[(csSelectedMode + 1) % CS_MODES.length];

  // One carousel row: candy, name, and neighbors. No second row of circles.
  csDrawModeCandyBubble(previous.candyId, 88, 187, 25, false);
  csDrawModeCandyBubble(next.candyId, 312, 187, 25, false);
  csDrawModeCandyBubble(mode.candyId, 200, 184, 48, true);

  noStroke();
  fill(CS_WHITE);
  textStyle(BOLD);
  textSize(24);
  text("‹", 53, 187);
  text("›", 347, 187);

  fill(CS_ORANGE);
  textStyle(BOLD);
  textSize(15);
  text(mode.name, width / 2, 249);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(10);
  text(mode.description, width / 2, 270);

  // A single, clear Play button sits below the carousel.
  const hoveringPlay = mouseX >= 112 && mouseX <= 288 && mouseY >= 302 && mouseY <= 348;
  // Match Pumpkin Smasher's flat brown-and-orange buttons: no rounding or bevel.
  fill(hoveringPlay ? "#381e08" : "#231709");
  stroke(CS_ORANGE);
  strokeWeight(2);
  rect(112, 302, 176, 46);
  noStroke();
  fill(CS_ORANGE);
  textStyle(BOLD);
  textSize(15);
  text("PLAY", width / 2, 325);

  fill("#ffffff");
  textStyle(NORMAL);
  textSize(8);
  text("USE ← / → OR CLICK THE SIDES TO BROWSE", width / 2, 377);
  textStyle(NORMAL);
}

function csDrawModeCandyBubble(candyId, x, y, radius, selected) {
  // A single simple circle behind the candy; effects can be layered in later.
  fill(selected ? "#1C4E0A" : "#123904");
  stroke(selected ? CS_ORANGE : "#505050");
  strokeWeight(selected ? 3 : 1.5);
  ellipse(x, y, radius * 2, radius * 2);

  const sprite = csImages[candyId];
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
function csStartGame(modeIndex) {
  csSelectedMode = Math.max(0, Math.min(CS_MODES.length - 1, modeIndex));
  csMode = CS_MODES[csSelectedMode];
  csScore = 0;
  csMovesLeft = csMode.moves;
  csTimeLeft = csMode.seconds || 0;
  csStartedAt = millis();
  csLastTickAt = millis();
  csLastActivityAt = millis();
  csLastHintAt = 0;
  csHintCells = [];
  csHintStartedAt = 0;
  csKeyboardNavigationActive = false;
  csSelected = null;
  csKeyboardFocus = { row: 3, col: 3 };
  csPendingMatches = [];
  csCombo = 1;
  csEndReason = "";
  csEndWon = false;
  csResultSummary = "";
  csVisualSwap = null;
  csShuffleCount = 0;
  csShuffleAnimation = null;
  csCandiesSinceHotTamale = 0;
  csClearSequence = 0;
  csSpecialEffects = [];
  csBoard = csCreateInitialBoard();
  if (csMode.id === "puzzle") {
    csPlacePuzzlePumpkins(csBoard);
    csPowerPuzzleStartingBoard(csBoard);
  }
  // Initial-board construction doesn't count toward the in-game spawn guarantee.
  csCandiesSinceHotTamale = 0;
  csState = "playing";
}

function csRegisterActivity() {
  csLastActivityAt = millis();
  csLastHintAt = 0;
  csHintCells = [];
  csHintStartedAt = 0;
}

function csCreateCandy(id) {
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

function csPlacePuzzlePumpkins(board) {
  const targetCount = 5;
  let placed = 0;
  const positions = [];
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) positions.push({ row, col });
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (const cell of positions) {
    if (placed >= targetCount) break;
    const candy = board[cell.row][cell.col];
    if (!candy || candy.special || candy.type === "hot_tamale" ||
        candy.type === "peppermint" || csHasAdjacentPumpkin(board, cell.row, cell.col)) continue;
    board[cell.row][cell.col] = csCreateCandy("pumpkin");
    placed++;
  }
}

function csPowerPuzzleStartingBoard(board) {
  // Puzzle gets a one-time head start; normal refill odds remain unchanged.
  const targetCount = 10;
  let poweredCount = 0;
  const candidates = [];

  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
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

function csHasAdjacentPumpkin(board, row, col) {
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].some(([r, c]) =>
    r >= 0 && r < CS_ROWS && c >= 0 && c < CS_COLS &&
    board[r] && board[r][c] && board[r][c].type === "pumpkin"
  );
}

function csCountPumpkins() {
  let count = 0;
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      if (csBoard[row][col] && csBoard[row][col].type === "pumpkin") count++;
    }
  }
  return count;
}

function csGetMostCommonZapType() {
  const counts = new Map();
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const candy = csBoard[row][col];
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

function csRandomCandyId() {
  const candidates = CS_CANDY_TYPES.filter(type =>
    type.id !== "pumpkin" &&
    (type.id !== "peppermint" || csMode.id === "fast")
  );
  let totalWeight = 0;
  const weighted = candidates.map(type => {
    let weight = type.weight;
    if (type.id === "hot_tamale") {
      // Frenzy is much more generous; a separate spawn guarantee prevents long dry streaks.
      if (csMode.id === "fast") weight = CS_FRENZY_HOT_TAMALE_WEIGHT;
      else weight = 0.06;
    }
    if (type.id === "smarties" && csMode.id === "fast") weight = 2;
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

function csCandyRunMatches(types) {
  // Peppermints, Hot Tamales and pumpkins cannot be ordinary matches.
  return types.length > 0 &&
    !["peppermint", "hot_tamale", "pumpkin"].includes(types[0]) &&
    types.every(typeId => typeId === types[0]);
}

function csWouldMakeMatchAt(board, row, col, type) {
  if (col >= 2 && board[row][col - 1] && board[row][col - 2] &&
      csCandyRunMatches([board[row][col - 2].type, board[row][col - 1].type, type])) return true;
  if (row >= 2 && board[row - 1][col] && board[row - 2][col] &&
      csCandyRunMatches([board[row - 2][col].type, board[row - 1][col].type, type])) return true;
  return false;
}

function csEnsureFastPeppermint(board, requireLegalMove) {
  if (csMode.id !== "fast") return true;
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      if (board[row][col] && board[row][col].type === "peppermint") return true;
    }
  }

  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const previous = board[row][col];
      board[row][col] = csCreateCandy("peppermint");
      const noMatches = csFindMatches(board).length === 0;
      const hasMoves = !requireLegalMove || csBoardHasLegalMove(board);
      if (noMatches && hasMoves) return true;
      board[row][col] = previous;
    }
  }

  board[0][0] = csCreateCandy("peppermint");
  return false;
}
function csApplyNaturalSpecial(candy) {
  if (!candy) return candy;
  const candyType = CS_CANDY_TYPES.find(type => type.id === candy.type);
  // Hot Tamales and Peppermints already have their own behavior and cannot roll
  // a second special effect.
  if (!candyType || candyType.special) return candy;

  const chance = csMode.id === "fast"
    ? CS_FRENZY_NATURAL_SPECIAL_CHANCE
    : CS_NATURAL_SPECIAL_CHANCE;
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

function csHasAdjacentHotTamale(board, row, col) {
  const neighbors = [
    [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
  ];
  return neighbors.some(([r, c]) =>
    r >= 0 && r < CS_ROWS && c >= 0 && c < CS_COLS &&
    board[r] && board[r][c] && board[r][c].type === "hot_tamale"
  );
}

function csEnsureFastHotTamale(board) {
  if (csMode.id !== "fast") return true;
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      if (board[row][col] && board[row][col].type === "hot_tamale") return true;
    }
  }

  // A Frenzy board always begins with at least one Tamale, even on a bad roll.
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const previous = board[row][col];
      if (!previous || previous.type === "peppermint" || previous.special) continue;
      board[row][col] = csCreateCandy("hot_tamale");
      if (
          
          csFindMatches(board).length === 0 && csBoardHasLegalMove(board)) {
        csCandiesSinceHotTamale = 0;
        return true;
      }
      board[row][col] = previous;
    }
  }
  return false;
}

function csCreateCandyAt(board, row, col, avoidImmediateMatch, allowGuaranteedSpawn = true) {
  const adjacentHotTamale = csHasAdjacentHotTamale(board, row, col);
  const guaranteedTamale = allowGuaranteedSpawn && csMode.id === "fast" &&
    csCandiesSinceHotTamale >= CS_FRENZY_TAMALE_GUARANTEE_INTERVAL - 1;
  let type = guaranteedTamale ? "hot_tamale" : csRandomCandyId();

  if (avoidImmediateMatch && type !== "hot_tamale") {
    let attempts = 0;
    while (csWouldMakeMatchAt(board, row, col, type) && attempts < 60) {
      type = csRandomCandyId();
      attempts++;
    }
    if (csWouldMakeMatchAt(board, row, col, type)) {
      const ordinary = CS_CANDY_TYPES.filter(item => !item.special).map(item => item.id);
      for (let i = 0; i < ordinary.length; i++) {
        if (!csWouldMakeMatchAt(board, row, col, ordinary[i])) {
          type = ordinary[i];
          break;
        }
      }
    }
  }

  const candy = csApplyNaturalSpecial(csCreateCandy(type));
  // Only actual in-game refills count toward the anti-bad-luck guarantee.
  if (allowGuaranteedSpawn) {
    if (type === "hot_tamale") csCandiesSinceHotTamale = 0;
    else csCandiesSinceHotTamale++;
  }
  return candy;
}

function csCreateInitialBoard() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const board = [];
    for (let row = 0; row < CS_ROWS; row++) {
      board[row] = [];
      for (let col = 0; col < CS_COLS; col++) {
        board[row][col] = null;
        board[row][col] = csCreateCandyAt(board, row, col, true, false);
      }
    }
    csEnsureFastPeppermint(board, true);
    csEnsureFastHotTamale(board);
    if (csFindMatches(board).length === 0 &&
           csBoardHasLegalMove(board)) return board;
  }
  return csCreateFreshPlayableBoard();
}

function csCreateFreshPlayableBoard() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const board = [];
    for (let row = 0; row < CS_ROWS; row++) {
      board[row] = [];
      for (let col = 0; col < CS_COLS; col++) {
        board[row][col] = null;
        board[row][col] = csCreateCandyAt(board, row, col, true, false);
      }
    }
    csEnsureFastPeppermint(board, true);
    csEnsureFastHotTamale(board);
    if (csFindMatches(board).length === 0 &&
           csBoardHasLegalMove(board)) return board;
  }
  const fallback = [];
  const ordinary = CS_CANDY_TYPES.filter(item => !item.special).map(item => item.id);
  for (let row = 0; row < CS_ROWS; row++) {
    fallback[row] = [];
    for (let col = 0; col < CS_COLS; col++) {
      fallback[row][col] = csApplyNaturalSpecial(
        csCreateCandy(ordinary[(row + col * 2) % ordinary.length])
      );
    }
  }
  fallback[0][0].type = ordinary[0];
  fallback[0][1].type = ordinary[1];
  fallback[1][0].type = ordinary[1];
  fallback[1][1].type = ordinary[0];
  fallback[2][0].type = ordinary[0];
  fallback[2][1].type = ordinary[2];
  csEnsureFastPeppermint(fallback, true);
  csEnsureFastHotTamale(fallback);
  return fallback;
}
function csFindMatches(board) {
  const matches = new Map();

  // Only contiguous runs of three identical candy types can match.
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col <= CS_COLS - 3; col++) {
      const run = [board[row][col], board[row][col + 1], board[row][col + 2]];
      if (run.every(Boolean) && csCandyRunMatches(run.map(candy => candy.type))) {
        for (let offset = 0; offset < 3; offset++) {
          const key = row + "," + (col + offset);
          matches.set(key, { row, col: col + offset });
        }
      }
    }
  }
  for (let col = 0; col < CS_COLS; col++) {
    for (let row = 0; row <= CS_ROWS - 3; row++) {
      const run = [board[row][col], board[row + 1][col], board[row + 2][col]];
      if (run.every(Boolean) && csCandyRunMatches(run.map(candy => candy.type))) {
        for (let offset = 0; offset < 3; offset++) {
          const key = (row + offset) + "," + col;
          matches.set(key, { row: row + offset, col });
        }
      }
    }
  }
  return Array.from(matches.values());
}
function csFindFiveInLine(cells) {
  const matched = new Set(cells.map(cell => cell.row + "," + cell.col));
  const directions = [{ row: 0, col: 1 }, { row: 1, col: 0 }];

  for (let d = 0; d < directions.length; d++) {
    const direction = directions[d];
    for (let row = 0; row < CS_ROWS; row++) {
      for (let col = 0; col < CS_COLS; col++) {
        const candy = csBoard[row][col];
        if (!candy) continue;

        const previousRow = row - direction.row;
        const previousCol = col - direction.col;
        if (previousRow >= 0 && previousCol >= 0 && previousRow < CS_ROWS && previousCol < CS_COLS &&
            csBoard[previousRow][previousCol] && csBoard[previousRow][previousCol].type === candy.type) {
          continue;
        }

        const run = [];
        let nextRow = row;
        let nextCol = col;
        while (nextRow < CS_ROWS && nextCol < CS_COLS &&
               csBoard[nextRow][nextCol] && csBoard[nextRow][nextCol].type === candy.type) {
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

function csSwapBoardCandies(board, a, b) {
  const temp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = temp;
}

function csAreAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function csBoardHasLegalMove(board) {
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const from = { row, col };
      const neighbors = [{ row, col: col + 1 }, { row: row + 1, col }];
      for (let i = 0; i < neighbors.length; i++) {
        const to = neighbors[i];
        if (to.row >= CS_ROWS || to.col >= CS_COLS) continue;
        const first = board[from.row][from.col];
        const second = board[to.row][to.col];
        if (!first || !second) continue;
        // Hot Tamales can always be activated by swapping them. Other specials
        // only count as a legal move when the swap actually makes a match.
        if (first.type === "hot_tamale" || second.type === "hot_tamale") return true;
        csSwapBoardCandies(board, from, to);
        const hasMatch = csFindMatches(board).length > 0;
        csSwapBoardCandies(board, from, to);
        if (hasMatch) return true;
      }
    }
  }
  return false;
}

function csFindBasicHint() {
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const from = { row, col };
      const neighbors = [{ row, col: col + 1 }, { row: row + 1, col }];

      for (let i = 0; i < neighbors.length; i++) {
        const to = neighbors[i];
        if (to.row >= CS_ROWS || to.col >= CS_COLS) continue;

        const first = csBoard[from.row][from.col];
        const second = csBoard[to.row][to.col];
        if (!first || !second) continue;

        const firstInfo = CS_CANDY_TYPES.find(item => item.id === first.type);
        const secondInfo = CS_CANDY_TYPES.find(item => item.id === second.type);
        if (!firstInfo || !secondInfo || firstInfo.special || secondInfo.special ||
            first.special || second.special) continue;

        csSwapBoardCandies(csBoard, from, to);
        const matches = csFindMatches(csBoard);
        let hint = null;

        // Only suggest a clean three-candy line, not a bomb, wildcard, or larger combo.
        if (matches.length === 3) {
          const types = matches.map(cell => csBoard[cell.row][cell.col].type);
          const matchInfo = CS_CANDY_TYPES.find(item => item.id === types[0]);
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

        csSwapBoardCandies(csBoard, from, to);
        if (hint) return hint;
      }
    }
  }
  return null;
}

function csGetCellAt(x, y) {
  if (x < CS_BOARD_X || y < CS_BOARD_Y ||
      x >= CS_BOARD_X + CS_COLS * CS_CELL || y >= CS_BOARD_Y + CS_ROWS * CS_CELL) return null;
  return {
    row: Math.floor((y - CS_BOARD_Y) / CS_CELL),
    col: Math.floor((x - CS_BOARD_X) / CS_CELL)
  };
}

function csTrySwap(from, to, tryTamaleMatch = false) {
  if (csState !== "playing" || csIsShuffleAnimating() || !csAreAdjacent(from, to)) return false;
  const first = csBoard[from.row][from.col];
  const second = csBoard[to.row][to.col];
  if (!first || !second) return false;
  csSelected = null;

  // If a regular candy was selected first, test an actual swap into the Tamale.
  // Keep the Tamale if the swap makes a match; otherwise restore and activate it.
  if (tryTamaleMatch && first.type !== "hot_tamale" && second.type === "hot_tamale") {
    csSwapBoardCandies(csBoard, from, to);
    const tamaleSwapMatches = csFindMatches(csBoard);
    if (tamaleSwapMatches.length) {
      csVisualSwap = { from: {row:from.row,col:from.col}, to: {row:to.row,col:to.col},
        startedAt: millis(), duration: 130, invalid: false };
      csMovesLeft = csMode.moves === null ? csMovesLeft : csMovesLeft - 1;
      csKeyboardFocus = { row: to.row, col: to.col };
      csBeginClear(tamaleSwapMatches, false, to);
      return true;
    }
    csSwapBoardCandies(csBoard, from, to);
  }

  // Clicking a Tamale first activates it immediately.
  if (first.type === "hot_tamale" || second.type === "hot_tamale") {
    csMovesLeft = csMode.moves === null ? csMovesLeft : csMovesLeft - 1;
    const requestedType = first.type === "hot_tamale" ? second.type : first.type;
    // A Hot Tamale's color zap cannot target pumpkins. If one is selected beside
    // a Tamale, zap the most common ordinary candy color instead and leave pumpkins alone.
    const targetType = requestedType === "pumpkin" ? csGetMostCommonZapType() : requestedType;
    const center = first.type === "hot_tamale" ? from : to;
    const bombCells = [];
    if (first.type === "hot_tamale" && second.type === "hot_tamale") {
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) bombCells.push({ row, col });
      }
    } else {
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) {
          if (csBoard[row][col] && csBoard[row][col].type !== "pumpkin" &&
              (csBoard[row][col].type === targetType ||
               (row === from.row && col === from.col) || (row === to.row && col === to.col))) {
            bombCells.push({ row, col });
          }
        }
      }
    }
    csAddSpecialEffect("bomb", center);
    if (targetType && targetType !== "hot_tamale" && targetType !== "pumpkin") {
      csAddTamaleZapEffect(center, targetType);
    }
    csBeginClear(bombCells, true);
    return true;
  }

  csSwapBoardCandies(csBoard, from, to);
  const matches = csFindMatches(csBoard);
  if (matches.length === 0) {
    csSwapBoardCandies(csBoard, from, to);
    csVisualSwap = {
      from: { row: from.row, col: from.col },
      to: { row: to.row, col: to.col },
      startedAt: millis(),
      duration: 260,
      invalid: true
    };
    return false;
  }

  csVisualSwap = {
    from: { row: from.row, col: from.col },
    to: { row: to.row, col: to.col },
    startedAt: millis(),
    duration: 130,
    invalid: false
  };
  csMovesLeft = csMode.moves === null ? csMovesLeft : csMovesLeft - 1;
  csKeyboardFocus = { row: to.row, col: to.col };
  csBeginClear(matches, false, to);
  return true;
}

function csGetSpecialClearCells(special, center) {
  const cells = [];
  const add = (row, col) => {
    if (row >= 0 && row < CS_ROWS && col >= 0 && col < CS_COLS) cells.push({ row, col });
  };
  if (special === "lineH") {
    for (let col = 0; col < CS_COLS; col++) add(center.row, col);
  } else if (special === "lineV") {
    for (let row = 0; row < CS_ROWS; row++) add(row, center.col);
  } else if (special === "star") {
    for (let col = 0; col < CS_COLS; col++) add(center.row, col);
    for (let row = 0; row < CS_ROWS; row++) add(row, center.col);
  } else if (special === "bomb") {
    for (let row = center.row - 1; row <= center.row + 1; row++) {
      for (let col = center.col - 1; col <= center.col + 1; col++) add(row, col);
    }
  }
  return cells;
}

function csAddSpecialEffect(type, center) {
  csSpecialEffects.push({
    type,
    row: center.row,
    col: center.col,
    startedAt: millis(),
    duration: type === "bomb" ? 430 : CS_SPECIAL_EFFECT_MS
  });
}

function csGetMatchSpecial(cells, preferredSpawnCell) {
  const matched = new Set(cells.map(cell => cell.row + "," + cell.col));
  const runLength = (row, col, dr, dc, type) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < CS_ROWS && c >= 0 && c < CS_COLS &&
             csBoard[r][c] && csBoard[r][c].type === type && matched.has(r + "," + c)) {
        count++; r += dr * sign; c += dc * sign;
      }
    }
    return count;
  };

  for (const cell of cells) {
    const candy = csBoard[cell.row][cell.col];
    if (!candy) continue;
    const h = runLength(cell.row, cell.col, 0, 1, candy.type);
    const v = runLength(cell.row, cell.col, 1, 0, candy.type);
    // Five-plus-three crossing is the board-clearing combo.
    if ((h >= 5 && v >= 3) || (v >= 5 && h >= 3)) return { clearBoard: true };
  }

  // A 4-by-3 crossing makes a star at the junction and a bomb beside it.
  for (const cell of cells) {
    const candy = csBoard[cell.row][cell.col];
    if (!candy) continue;
    const h = runLength(cell.row, cell.col, 0, 1, candy.type);
    const v = runLength(cell.row, cell.col, 1, 0, candy.type);
    if (h >= 3 && v >= 3) {
      const creation = { cell, special: "star" };
      if (h >= 4 || v >= 4) {
        const adjacent = cells.find(other =>
          !(other.row === cell.row && other.col === cell.col) &&
          Math.abs(other.row - cell.row) + Math.abs(other.col - cell.col) === 1 &&
          csBoard[other.row][other.col] &&
          !csBoard[other.row][other.col].special &&
          csBoard[other.row][other.col].type !== "hot_tamale"
        );
        if (adjacent) creation.extraBombCell = adjacent;
      }
      return creation;
    }
  }

  // A straight five without a crossing creates a Hot Tamale rather than a star.
  for (const cell of cells) {
    const candy = csBoard[cell.row][cell.col];
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
      const candy = csBoard[cell.row][cell.col];
      if (!candy) continue;
      if (runLength(cell.row, cell.col, direction.dr, direction.dc, candy.type) >= 4) {
        return { cell: preferredSpawnCell && matched.has(preferredSpawnCell.row + "," + preferredSpawnCell.col)
          ? preferredSpawnCell : cell, special: direction.special };
      }
    }
  }
  return null;
}

function csGetMatchCenterCell(cells, preferredSpawnCell) {
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

function csGetCascadeBombCell(cells, creationCell, preferredSpawnCell) {
  const creationKey = creationCell ? creationCell.row + "," + creationCell.col : null;
  // Prefer an ordinary matched candy so we can preserve a beam/star created by
  // this same clear and avoid erasing an existing special before it can activate.
  const matchedCandidates = cells.filter(cell => {
    const key = cell.row + "," + cell.col;
    const candy = csBoard[cell.row] && csBoard[cell.row][cell.col];
    return key !== creationKey && candy && !candy.special;
  });
  if (matchedCandidates.length) {
    return csGetMatchCenterCell(matchedCandidates, preferredSpawnCell);
  }

  // Rarely, all matched cells are already special candies. Still award the bomb
  // by placing it on the nearest ordinary candy, without overwriting another special.
  const centerRow = cells.length
    ? cells.reduce((sum, cell) => sum + cell.row, 0) / cells.length
    : CS_ROWS / 2;
  const centerCol = cells.length
    ? cells.reduce((sum, cell) => sum + cell.col, 0) / cells.length
    : CS_COLS / 2;
  let best = null;
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const candy = csBoard[row][col];
      if (!candy || candy.special || (creationCell && row === creationCell.row && col === creationCell.col)) continue;
      const distance = Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2);
      if (!best || distance < best.distance) best = { cell: { row, col }, distance };
    }
  }
  return best ? best.cell : null;
}

function csAddTamaleZapEffect(center, targetType) {
  if (!targetType || targetType === "hot_tamale" || targetType === "pumpkin") return;
  const targets = [];
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const candy = csBoard[row][col];
      if (candy && candy.type === targetType && candy.type !== "pumpkin") targets.push({ row, col });
    }
  }
  csSpecialEffects.push({
    type: "tamaleZap",
    row: center.row,
    col: center.col,
    targets,
    startedAt: millis(),
    duration: 520
  });
}

function csAddCandyColorCells(unique, typeId) {
  if (!typeId || typeId === "hot_tamale") return false;
  let addedCells = false;
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const candy = csBoard[row][col];
      const key = row + "," + col;
      if (candy && candy.type === typeId && candy.type !== "pumpkin" && !unique.has(key)) {
        unique.set(key, { row, col });
        addedCells = true;
      }
    }
  }
  return addedCells;
}

function csBeginClear(cells, fromSpecial, preferredSpawnCell, sourceTypes) {
  if (!fromSpecial) {
    const matchedTamale = cells.find(cell => {
      const candy = csBoard[cell.row] && csBoard[cell.row][cell.col];
      return candy && candy.type === "hot_tamale";
    });
    if (matchedTamale) {
      const blast = [];
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) blast.push({ row, col });
      }
      csAddSpecialEffect("bomb", matchedTamale);
      csBeginClear(blast, true);
      return;
    }
  }
  let clearCells = cells.slice();
  const unique = new Map();
  const addCell = cell => {
    if (cell.row < 0 || cell.row >= CS_ROWS || cell.col < 0 || cell.col >= CS_COLS) return;
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
    const candy = csBoard[cell.row] && csBoard[cell.row][cell.col];
    return candy && candy.type === "hot_tamale";
  });
  if (hitsHotTamale) {
    const tamaleCells = clearCells.filter(cell => {
      const candy = csBoard[cell.row] && csBoard[cell.row][cell.col];
      return candy && candy.type === "hot_tamale";
    });
    for (const tamaleCell of tamaleCells) {
      for (const typeId of zapSourceTypes) {
        csAddTamaleZapEffect(tamaleCell, typeId);
        csAddCandyColorCells(unique, typeId);
      }
    }
  }

  // Count the initial match as 1, the first cascade as 2, and the second as 3.
  // Every third clear in a chain spawns exactly one bomb. If that same clear makes
  // a beam/star, keep it and place the bomb on another ordinary candy.
  if (!fromSpecial) {
    const creation = csGetMatchSpecial(clearCells, preferredSpawnCell);
    if (creation && creation.clearBoard) {
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) addCell({ row, col });
      }
    } else if (creation) {
      const candy = csBoard[creation.cell.row][creation.cell.col];
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
        const extra = csBoard[creation.extraBombCell.row][creation.extraBombCell.col];
        if (extra) {
          extra.special = "bomb";
          extra.specialDirection = null;
          extra.bornAt = millis();
          unique.delete(creation.extraBombCell.row + "," + creation.extraBombCell.col);
        }
      }
    }

    if ((!creation || !creation.clearBoard) && csCombo > 1 && csCombo % 3 === 0) {
      const center = csGetCascadeBombCell(
        clearCells,
        creation ? creation.cell : null,
        preferredSpawnCell
      );
      if (center) {
        const candy = csBoard[center.row][center.col];
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
      const candy = csBoard[cell.row] && csBoard[cell.row][cell.col];
      if (!candy || !candy.special) continue;
      const key = cell.row + "," + cell.col;
      if (activated.has(key)) continue;
      activated.add(key);
      const special = candy.special;
      const effectType = special === "lineH" ? "beamH" : special === "lineV" ? "beamV" :
        special === "star" ? "cross" : "bomb";
      csAddSpecialEffect(effectType, cell);
      const effectCells = csGetSpecialClearCells(special, cell);
      const sourceCandyType = candy.type;
      const hitTamaleCells = effectCells.filter(effectCell => {
        const hitCandy = csBoard[effectCell.row] && csBoard[effectCell.row][effectCell.col];
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
        csAddTamaleZapEffect(tamaleCell, sourceCandyType);
        if (csAddCandyColorCells(unique, sourceCandyType)) expanded = true;
      }
    }
  }

  csPendingMatches = Array.from(unique.values());
  if (!csPendingMatches.length) {
    csState = "playing";
    return;
  }

  let peppermintsCount = 0;
  for (const cell of csPendingMatches) {
    const candy = csBoard[cell.row][cell.col];
    if (candy && candy.type === "peppermint") peppermintsCount++;
  }

  csScore += csPendingMatches.length * 10 * csCombo;
  if (fromSpecial) csScore += Math.min(100, csPendingMatches.length * 2);
  if (csMode.id === "fast" && peppermintsCount > 0) {
    csTimeLeft += peppermintsCount * CS_PEPPERMINT_TIME_BONUS;
  }
  csCombo++;
  csClearSequence++;
  csState = "clearing";
  csPhaseStartedAt = millis();
  csPhaseEndsAt = csPhaseStartedAt + CS_CLEAR_DELAY;
}

function csUpdateGame() {
  const now = millis();
  if (csShuffleAnimation && now - csShuffleAnimation.startedAt >= csShuffleAnimation.duration) {
    csShuffleAnimation = null;
  }

  if (csMode.id === "fast" && csState !== "gameover") {
    csTimeLeft -= Math.max(0, now - csLastTickAt) / 1000;
    if (csTimeLeft <= 0) {
      csTimeLeft = 0;
      csFinishGame(false, "TIME UP");
      return;
    }
  }
  csLastTickAt = now;

  if (csState === "clearing" && now >= csPhaseEndsAt) {
    for (let i = 0; i < csPendingMatches.length; i++) {
      const cell = csPendingMatches[i];
      if (csBoard[cell.row] && csBoard[cell.row][cell.col]) csBoard[cell.row][cell.col] = null;
    }
    csApplyGravityAndRefill();
    csState = "falling";
    csPhaseStartedAt = now;
    csPhaseEndsAt = now + CS_FALL_DELAY;
    csPendingMatches = [];
  } else if (csState === "falling" && now >= csPhaseEndsAt) {
    const matches = csFindMatches(csBoard);
    if (matches.length) {
      csBeginClear(matches, false);
    } else {
      csState = "playing";
      csCombo = 1;
      csRegisterActivity();
      if (csMode.id === "puzzle" && csCountPumpkins() === 0) {
        csFinishGame(true, "PUMPKINS SMASHED");
        return;
      }
      csAfterBoardSettles();
    }
  }

  if (csState === "playing" && csMode.moves !== null && csMovesLeft <= 0) {
    csFinishGame(false, "OUT OF MOVES");
  }
}

function csApplyGravityAndRefill() {
  const now = millis();
  for (let col = 0; col < CS_COLS; col++) {
    let writeRow = CS_ROWS - 1;
    for (let row = CS_ROWS - 1; row >= 0; row--) {
      const candy = csBoard[row][col];
      if (!candy) continue;
      if (writeRow !== row) {
        candy.fall = {
          fromY: CS_BOARD_Y + row * CS_CELL + CS_CELL / 2,
          startedAt: now,
          duration: 190 + Math.min(100, (writeRow - row) * 20)
        };
      } else {
        candy.fall = null;
      }
      csBoard[writeRow][col] = candy;
      writeRow--;
    }
    // Fill from the top down so generated candies can avoid triples above them.
    for (let row = 0; row <= writeRow; row++) {
      const candy = csCreateCandyAt(csBoard, row, col, true);
      candy.fall = {
        fromY: CS_BOARD_Y - (writeRow - row + 1) * CS_CELL - 10,
        startedAt: now,
        duration: 230 + Math.min(110, (writeRow - row) * 25)
      };
      csBoard[row][col] = candy;
    }
  }
  csEnsureFastPeppermint(csBoard, false);
}

function csAfterBoardSettles() {
  if (csMode.moves !== null && csMovesLeft <= 0) {
    if (csMode.id === "puzzle" && csCountPumpkins() === 0) csFinishGame(true, "PUMPKINS SMASHED");
    else csFinishGame(false, csMode.id === "puzzle" ? "PUMPKINS REMAIN" : "OUT OF MOVES");
    return;
  }
  if (!csBoardHasLegalMove(csBoard)) {
    if (csMode.id === "classic") csFinishGame(false, "NO MOVES LEFT");
    else csReshuffleBoard();
  }
}
function csReshuffleBoard() {
  csShuffleCount++;
  const candies = [];
  const originalPositions = new Map();
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const candy = csBoard[row][col];
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
    for (let row = 0; row < CS_ROWS; row++) {
      for (let col = 0; col < CS_COLS; col++) {
        csBoard[row][col] = candies[index++];
        if (csBoard[row][col]) csBoard[row][col].fall = null;
      }
    }
    if (csFindMatches(csBoard).length === 0 &&
        
        csBoardHasLegalMove(csBoard)) {
      csStartShuffleAnimation(originalPositions);
      return;
    }
  }

  csBoard = csCreateFreshPlayableBoard();
  csStartShuffleAnimation(originalPositions);
}

function csStartShuffleAnimation(originalPositions) {
  const movements = [];
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const candy = csBoard[row][col];
      if (!candy) continue;
      const from = originalPositions.get(candy) || {
        row: Math.floor(Math.random() * CS_ROWS),
        col: Math.floor(Math.random() * CS_COLS)
      };
      movements.push({ candy, fromRow: from.row, fromCol: from.col, toRow: row, toCol: col });
      candy.fall = null;
    }
  }
  if (csMode.id === "fast") csTimeLeft += 15;
  csShuffleAnimation = { startedAt: millis(), duration: CS_SHUFFLE_ANIMATION_MS, movements };
  csSelected = null;
  csVisualSwap = null;
  csHintCells = [];
  csRegisterActivity();
}

function csIsShuffleAnimating() {
  return Boolean(csShuffleAnimation && millis() - csShuffleAnimation.startedAt < csShuffleAnimation.duration);
}

function csDrawShuffleCandies() {
  if (!csIsShuffleAnimating()) return;
  const elapsed = millis() - csShuffleAnimation.startedAt;
  const progress = Math.min(1, Math.max(0, elapsed / csShuffleAnimation.duration));
  const eased = 1 - Math.pow(1 - progress, 2.4);
  const wobbleAmount = Math.sin(Math.PI * progress);
  for (let i = 0; i < csShuffleAnimation.movements.length; i++) {
    const move = csShuffleAnimation.movements[i];
    const fromX = CS_BOARD_X + move.fromCol * CS_CELL + CS_CELL / 2;
    const fromY = CS_BOARD_Y + move.fromRow * CS_CELL + CS_CELL / 2;
    const toX = CS_BOARD_X + move.toCol * CS_CELL + CS_CELL / 2;
    const toY = CS_BOARD_Y + move.toRow * CS_CELL + CS_CELL / 2;
    const wobbleX = Math.sin(progress * Math.PI * 4 + i * 0.73) * 4.5 * wobbleAmount;
    const wobbleY = Math.cos(progress * Math.PI * 3.5 + i * 0.51) * 3.5 * wobbleAmount;
    csDrawCandy(move.candy, lerp(fromX, toX, eased) + wobbleX, lerp(fromY, toY, eased) + wobbleY, CS_CELL);
  }
}

function csDrawShuffleOverlay() {
  if (!csIsShuffleAnimating()) return;
  const elapsed = millis() - csShuffleAnimation.startedAt;
  const progress = Math.min(1, Math.max(0, elapsed / csShuffleAnimation.duration));
  const eased = 1 - Math.pow(1 - progress, 2);
  const pulse = Math.sin(progress * Math.PI);
  const beamX = -100 + (width + 200) * eased;
  const beamY = CS_BOARD_Y + CS_ROWS * CS_CELL / 2;

  noStroke();
  fill(0, 0, 0, 145 * pulse);
  rect(0, 0, width, height);

  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255,135,20,0.98)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = `rgba(255,175,58,${0.95 * pulse})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(beamX - 105, beamY);
  ctx.lineTo(beamX + 105, beamY);
  ctx.stroke();
  ctx.shadowColor = "rgba(255,245,195,0.98)";
  ctx.shadowBlur = 9;
  ctx.strokeStyle = `rgba(255,255,245,${0.75 * pulse})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(27);
  stroke(255, 175, 58, 210 * pulse);
  strokeWeight(2);
  fill(255, 247, 205, 245 * pulse);
  text("SHUFFLE", beamX, beamY - 10);
  if (csMode.id === "fast") {
    textSize(12);
    text("+15 SECONDS", beamX, beamY + 16);
  }
  pop();
}

function csFinishGame(won, reason) {
  csState = "gameover";
  csEndWon = Boolean(won);
  csEndReason = reason;
  csSelected = null;
  csPendingMatches = [];
  csResultSummary = "SCORE  " + csScore;
}

function csDrawGame() {
  csUpdateIdleHint();
  csDrawHud();
  csDrawBoard();

  if (csState === "clearing") csDrawClearHighlights();
  csDrawSpecialEffects();
  csDrawIdleHint();
  csDrawShuffleOverlay();
}

function csUpdateIdleHint() {
  const now = millis();
  if (csIsShuffleAnimating()) {
    csHintCells = [];
    return;
  }
  if (csState !== "playing") {
    csHintCells = [];
    return;
  }

  if (csVisualSwap && now - csVisualSwap.startedAt < csVisualSwap.duration) return;
  if (now - csLastActivityAt < CS_HINT_IDLE_MS) return;
  if (csHintCells.length && now - csHintStartedAt < CS_HINT_FLASH_MS) return;

  csHintCells = [];
  if (csLastHintAt && now - csLastHintAt < CS_HINT_REPEAT_MS) return;

  const hint = csFindBasicHint();
  csLastHintAt = now;
  if (hint) {
    csHintCells = hint.cells;
    csHintStartedAt = now;
  }
}

function csDrawIdleHint() {
  if (!csHintCells.length || csState !== "playing") return;

  const elapsed = millis() - csHintStartedAt;
  if (elapsed >= CS_HINT_FLASH_MS) return;
  const pulse = 0.5 + 0.5 * Math.sin(elapsed / 85);

  noFill();
  stroke(255, 165, 0, 75 + pulse * 180);
  strokeWeight(1.5 + pulse * 1.5);
  for (let i = 0; i < csHintCells.length; i++) {
    const cell = csHintCells[i];
    const x = CS_BOARD_X + cell.col * CS_CELL;
    const y = CS_BOARD_Y + cell.row * CS_CELL;
    rect(x + 3, y + 3, CS_CELL - 6, CS_CELL - 6);
  }
}

function csDrawHud() {
  noStroke();
  fill(CS_BLACK);
  rect(0, 0, width, 45);
  stroke(CS_ORANGE);
  strokeWeight(2);
  line(0, 44, width, 44);
  noStroke();

  fill(CS_ORANGE);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  textSize(11);
  text(csMode.name, 8, 13);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(9);
  text("SCORE " + csScore, 8, 31);

  textAlign(RIGHT, CENTER);
  fill(CS_ORANGE);
  textStyle(BOLD);
  textSize(12);
  if (csMode.id === "fast") text("TIME " + csFormatTime(csTimeLeft), width - 8, 14);
  else if (csMovesLeft !== null) text("MOVES " + csMovesLeft, width - 8, 14);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(9);
  if (csMode.id === "fast") text("PEPPERMINTS: ABILITIES ONLY (+1 SEC)", width - 8, 31);
  else if (csMode.id === "puzzle") text("PUMPKINS LEFT " + csCountPumpkins(), width - 8, 31);
  else text("MATCH 3 OR MORE", width - 8, 31);
}

function csFormatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}

function csDrawBoard() {
  const shuffleActive = csIsShuffleAnimating();
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const x = CS_BOARD_X + col * CS_CELL;
      const y = CS_BOARD_Y + row * CS_CELL;
      const candy = csBoard[row] && csBoard[row][col];

      fill((row + col) % 2 === 0 ? "#123904" : "#1C4E0A");
      stroke("#1C4E0A");
      strokeWeight(1);
      rect(x, y, CS_CELL, CS_CELL);

      const isSwapCell = csVisualSwap && millis() - csVisualSwap.startedAt < csVisualSwap.duration &&
        ((csVisualSwap.from.row === row && csVisualSwap.from.col === col) ||
         (csVisualSwap.to.row === row && csVisualSwap.to.col === col));
      const isSelected = csSelected && csSelected.row === row && csSelected.col === col;
      const isFocus = csKeyboardNavigationActive && csKeyboardFocus &&
        csKeyboardFocus.row === row && csKeyboardFocus.col === col && csState !== "gameover";
      if (candy && !isSwapCell && !shuffleActive) {
        const centerX = x + CS_CELL / 2;
        let centerY = y + CS_CELL / 2;
        if (candy.fall) {
          const t = Math.min(1, Math.max(0, (millis() - candy.fall.startedAt) / candy.fall.duration));
          const eased = 1 - Math.pow(1 - t, 3);
          centerY = lerp(candy.fall.fromY, centerY, eased);
          if (t >= 1) candy.fall = null;
        }
        csDrawCandy(candy, centerX, centerY, CS_CELL * (isSelected ? 1.12 : 1));
      }

      if (isSelected) {
        csDrawSelectionCorners(x, y, CS_CELL);
      } else if (isFocus && csState === "playing" && !csSelected) {
        noFill();
        stroke("#ffffff");
        strokeWeight(1);
        rect(x + 4, y + 4, CS_CELL - 8, CS_CELL - 8);
      }
    }
  }
  if (shuffleActive) csDrawShuffleCandies();
  else csDrawVisualSwap();
}

function csDrawVisualSwap() {
  if (!csVisualSwap) return;
  const swap = csVisualSwap;
  const t = Math.min(1, Math.max(0, (millis() - swap.startedAt) / swap.duration));
  if (t >= 1) {
    csVisualSwap = null;
    return;
  }

  const ax = CS_BOARD_X + swap.from.col * CS_CELL + CS_CELL / 2;
  const ay = CS_BOARD_Y + swap.from.row * CS_CELL + CS_CELL / 2;
  const bx = CS_BOARD_X + swap.to.col * CS_CELL + CS_CELL / 2;
  const by = CS_BOARD_Y + swap.to.row * CS_CELL + CS_CELL / 2;

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
    const candyAtFrom = csBoard[swap.from.row][swap.from.col];
    const candyAtTo = csBoard[swap.to.row][swap.to.col];
    if (candyAtFrom) csDrawCandy(candyAtFrom, lerp(ax, bx, progress), lerp(ay, by, progress), CS_CELL);
    if (candyAtTo) csDrawCandy(candyAtTo, lerp(bx, ax, progress), lerp(by, ay, progress), CS_CELL);
    return;
  }

  const eased = 1 - Math.pow(1 - t, 3);
  // The board values have already swapped; animate each new value from its old location.
  const candyAtFrom = csBoard[swap.from.row][swap.from.col];
  const candyAtTo = csBoard[swap.to.row][swap.to.col];
  if (candyAtFrom) csDrawCandy(candyAtFrom, lerp(bx, ax, eased), lerp(by, ay, eased), CS_CELL);
  if (candyAtTo) csDrawCandy(candyAtTo, lerp(ax, bx, eased), lerp(ay, by, eased), CS_CELL);
}

function csDrawSelectionCorners(x, y, cellSize) {
  const inset = 3;
  const length = 9;
  const left = x + inset;
  const right = x + cellSize - inset;
  const top = y + inset;
  const bottom = y + cellSize - inset;

  noFill();
  stroke(CS_ORANGE);
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

function csDrawCandy(candy, x, y, cellSize) {
  const type = CS_CANDY_TYPES.find(item => item.id === candy.type);
  if (!type) return;

  const sprite = csImages[candy.type];
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
      csDrawMaskedStripe(sprite, x, y, drawW, drawH, candy.special === "lineH");
    } else if (candy.special === "star") {
      const phase = (millis() - candy.bornAt) / 850;
      const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      const scale = 0.55 + 0.38 * pulse;
      csDrawStarOverlay(x, y, cellSize * 0.32 * scale, 0.62 + 0.28 * pulse);
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
    fill(CS_BLACK);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    textSize(8);
    text(type.name.slice(0, 2).toUpperCase(), 0, 0);
    textStyle(NORMAL);
    pop();
  }
}

function csDrawMaskedStripe(sprite, x, y, drawW, drawH, horizontal) {
  if (!csEffectCanvas || !csEffectContext || drawW <= 0 || drawH <= 0) return;
  const source = sprite.canvas || sprite.elt;
  if (!source) return;

  const scale = 3;
  const w = Math.max(1, Math.round(drawW * scale));
  const h = Math.max(1, Math.round(drawH * scale));
  if (csEffectCanvas.width !== w) csEffectCanvas.width = w;
  if (csEffectCanvas.height !== h) csEffectCanvas.height = h;

  const ctx = csEffectContext;
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
  drawingContext.drawImage(csEffectCanvas, x - drawW / 2, y - drawH / 2, drawW, drawH);
  drawingContext.restore();
}

function csDrawStarOverlay(x, y, radius, alpha) {
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

function csDrawSpecialEffects() {
  const now = millis();
  csSpecialEffects = csSpecialEffects.filter(effect => now - effect.startedAt < effect.duration);

  for (const effect of csSpecialEffects) {
    const progress = Math.min(1, Math.max(0, (now - effect.startedAt) / effect.duration));
    const centerX = CS_BOARD_X + effect.col * CS_CELL + CS_CELL / 2;
    const centerY = CS_BOARD_Y + effect.row * CS_CELL + CS_CELL / 2;

    if (effect.type === "beamH") {
      csDrawRayBeam(centerX, centerY, true, progress);
    } else if (effect.type === "beamV") {
      csDrawRayBeam(centerX, centerY, false, progress);
    } else if (effect.type === "cross") {
      // Two crossing rays launch from the special candy at the same time.
      csDrawRayBeam(centerX, centerY, true, progress);
      csDrawRayBeam(centerX, centerY, false, progress);
    } else if (effect.type === "bomb") {
      csDrawBombExplosion(centerX, centerY, progress);
    } else if (effect.type === "tamaleZap") {
      csDrawTamaleZap(centerX, centerY, progress, effect.targets || []);
    }
  }
}

function csDrawRayBeam(centerX, centerY, horizontal, progress) {
  const ctx = drawingContext;
  const left = CS_BOARD_X + 2;
  const right = CS_BOARD_X + CS_COLS * CS_CELL - 2;
  const top = CS_BOARD_Y + 2;
  const bottom = CS_BOARD_Y + CS_ROWS * CS_CELL - 2;
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

function csDrawTamaleZap(centerX, centerY, progress, targets) {
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
    const endX = CS_BOARD_X + target.col * CS_CELL + CS_CELL / 2;
    const endY = CS_BOARD_Y + target.row * CS_CELL + CS_CELL / 2;
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

function csDrawBombExplosion(centerX, centerY, progress) {
  const ctx = drawingContext;
  const maxRadius = CS_CELL * 1.5; // A three-by-three cell footprint.
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

function csDrawClearHighlights() {
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin((millis() - csPhaseStartedAt) / 55));
  for (let i = 0; i < csPendingMatches.length; i++) {
    const cell = csPendingMatches[i];
    const x = CS_BOARD_X + cell.col * CS_CELL;
    const y = CS_BOARD_Y + cell.row * CS_CELL;
    noStroke();
    fill(255, 255, 255, 70 + pulse * 110);
    rect(x + 3, y + 3, CS_CELL - 6, CS_CELL - 6);
  }
}

function csDrawGameOver() {
  noStroke();
  fill(0, 0, 0, 190);
  rect(0, 0, width, height);

  const panelX = 35;
  const panelY = 119;
  const panelW = width - panelX * 2;
  const panelH = 166;
  fill(CS_BLACK);
  stroke(CS_ORANGE);
  strokeWeight(3);
  rect(panelX, panelY, panelW, panelH);

  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(csEndWon ? "#ffffff" : CS_ORANGE);
  textSize(csEndWon ? 22 : 24);
  text(csEndReason || "GAME OVER", width / 2, panelY + 36);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(14);
  text("SCORE  " + csScore, width / 2, panelY + 73);
  textSize(10);
  if (csMode.id === "fast") text("PEPPERMINTS ADDED TIME", width / 2, panelY + 96);
  else if (csMode.id === "puzzle") text("MOVES USED  " + (csMode.moves - Math.max(0, csMovesLeft)), width / 2, panelY + 96);
  else text("NO LEGAL SWAPS REMAIN", width / 2, panelY + 96);

  const replayHover = mouseX >= 69 && mouseX <= 195 && mouseY >= 220 && mouseY <= 258;
  const menuHover = mouseX >= 205 && mouseX <= 331 && mouseY >= 220 && mouseY <= 258;
  fill(replayHover ? "#1C4E0A" : "#0C2504");
  stroke(CS_ORANGE);
  strokeWeight(1);
  rect(69, 220, 126, 38);
  fill(menuHover ? "#1C4E0A" : CS_BLACK);
  rect(205, 220, 126, 38);
  noStroke();
  fill(CS_WHITE);
  textStyle(BOLD);
  textSize(11);
  text("PLAY AGAIN", 132, 239);
  text("MODE SELECT", 268, 239);
  textStyle(NORMAL);
  fill(CS_WHITE);
  textSize(8);
  text("ENTER: REPLAY   ·   ESC: MENU", width / 2, 270);
}

function mousePressed(event) {
  if (csState === "title") {
    if (mouseX >= 112 && mouseX <= 288 && mouseY >= 302 && mouseY <= 348) {
      csStartGame(csSelectedMode);
      return false;
    }
    if (mouseY >= 135 && mouseY <= 226 && mouseX < 120) {
      csSelectedMode = (csSelectedMode + CS_MODES.length - 1) % CS_MODES.length;
      return false;
    }
    if (mouseY >= 135 && mouseY <= 226 && mouseX > 280) {
      csSelectedMode = (csSelectedMode + 1) % CS_MODES.length;
      return false;
    }
    // The central candy also selects Play for convenience.
    if (Math.hypot(mouseX - 200, mouseY - 184) <= 50) {
      csStartGame(csSelectedMode);
      return false;
    }
    return false;
  }

  if (csState === "gameover") {
    if (mouseX >= 69 && mouseX <= 195 && mouseY >= 220 && mouseY <= 258) {
      csStartGame(csSelectedMode);
    } else if (mouseX >= 205 && mouseX <= 331 && mouseY >= 220 && mouseY <= 258) {
      csState = "title";
      csSelected = null;
    }
    return false;
  }

  if (csState !== "playing") return false;
  if (csIsShuffleAnimating()) return false;
  if (csVisualSwap && millis() - csVisualSwap.startedAt < csVisualSwap.duration) return false;
  csKeyboardNavigationActive = false;
  csRegisterActivity();
  const cell = csGetCellAt(mouseX, mouseY);
  if (!cell) return false;

  csKeyboardFocus = { row: cell.row, col: cell.col };
  if (!csSelected) {
    csSelected = cell;
  } else if (csSelected.row === cell.row && csSelected.col === cell.col) {
    csSelected = null;
  } else if (csAreAdjacent(csSelected, cell)) {
    const from = csSelected;
    const selectedCandy = csBoard[from.row] && csBoard[from.row][from.col];
    const targetCandy = csBoard[cell.row] && csBoard[cell.row][cell.col];
    const tryTamaleMatch = Boolean(selectedCandy && selectedCandy.type !== "hot_tamale" &&
      targetCandy && targetCandy.type === "hot_tamale");
    const swapped = csTrySwap(from, cell, tryTamaleMatch);
    if (!swapped) csSelected = from;
  } else {
    csSelected = cell;
  }
  return false;
}

function keyPressed(event) {
  const key = event && event.key ? event.key : "";
  if (event && event.repeat) return false;

  if (csState === "title") {
    if (key === "ArrowLeft") {
      csSelectedMode = (csSelectedMode - 1 + CS_MODES.length) % CS_MODES.length;
      return false;
    }
    if (key === "ArrowRight") {
      csSelectedMode = (csSelectedMode + 1) % CS_MODES.length;
      return false;
    }
    if (key === "Enter" || key === " ") {
      csStartGame(csSelectedMode);
      return false;
    }
    return;
  }

  if (csState === "gameover") {
    if (key === "Enter" || key === " ") {
      csStartGame(csSelectedMode);
      return false;
    }
    if (key === "Escape") {
      csState = "title";
      return false;
    }
    return;
  }

  if (key === "Escape") {
    csState = "title";
    csSelected = null;
    return false;
  }
  if (csState !== "playing") return;
  if (csIsShuffleAnimating()) return false;
  if (csVisualSwap && millis() - csVisualSwap.startedAt < csVisualSwap.duration) return false;
  csRegisterActivity();

  const directions = {
    ArrowUp: { row: -1, col: 0 },
    ArrowDown: { row: 1, col: 0 },
    ArrowLeft: { row: 0, col: -1 },
    ArrowRight: { row: 0, col: 1 }
  };
  const direction = directions[key];
  if (direction) {
    csKeyboardNavigationActive = true;
    if (csSelected) {
      const to = {
        row: csSelected.row + direction.row,
        col: csSelected.col + direction.col
      };
      if (to.row >= 0 && to.row < CS_ROWS && to.col >= 0 && to.col < CS_COLS) {
        const from = csSelected;
        const tryTamaleMatch = Boolean(csBoard[from.row][from.col] &&
          csBoard[from.row][from.col].type !== "hot_tamale" &&
          csBoard[to.row][to.col] && csBoard[to.row][to.col].type === "hot_tamale");
        if (csTrySwap(from, to, tryTamaleMatch)) csKeyboardFocus = to;
      }
    } else {
      csKeyboardFocus = {
        row: Math.max(0, Math.min(CS_ROWS - 1, csKeyboardFocus.row + direction.row)),
        col: Math.max(0, Math.min(CS_COLS - 1, csKeyboardFocus.col + direction.col))
      };
    }
    return false;
  }

  if (key === "Enter" || key === " ") {
    csKeyboardNavigationActive = true;
    if (csSelected) {
      if (csSelected.row === csKeyboardFocus.row && csSelected.col === csKeyboardFocus.col) {
        csSelected = null;
      } else if (csAreAdjacent(csSelected, csKeyboardFocus)) {
        const from = csSelected;
        if (!csTrySwap(from, csKeyboardFocus)) csSelected = from;
      } else {
        csSelected = { row: csKeyboardFocus.row, col: csKeyboardFocus.col };
      }
    } else {
      csSelected = { row: csKeyboardFocus.row, col: csKeyboardFocus.col };
    }
    return false;
  }
}

function windowResized() {
  csResizeCanvasToContainer();
}
