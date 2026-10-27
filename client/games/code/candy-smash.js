/*
 * Candy Smash
 * Standalone p5.js global-mode match-three game for the Pumpkin Smasher arcade.
 *
 * This file deliberately keeps special-candy visuals simple: their indicators are
 * geometric shapes drawn behind the existing sprites, so custom effects can replace
 * them later without changing the gameplay code.
 */

const CS_WIDTH = 400;
const CS_HEIGHT = 400;
const CS_COLS = 8;
const CS_ROWS = 8;
const CS_CELL = 40;
const CS_BOARD_X = 40;
const CS_BOARD_Y = 56;
const CS_BG = "#123904";
const CS_BLACK = "#10180b";
const CS_GREEN = "#1d4a13";
const CS_GREEN_LIGHT = "#2b5f1b";
const CS_ORANGE = "#ffa500";
const CS_WHITE = "#f6f2dd";
const CS_CLEAR_DELAY = 170;
const CS_FALL_DELAY = 390;
const CS_PEPPERMINT_TIME_BONUS = 5;

const CS_CANDY_TYPES = [
  { id: "blue", name: "Blue Candy", path: "/assets/candies/blue-candy.png", weight: 1 },
  { id: "apple", name: "Candied Apple", path: "/assets/candies/candied-apple.png", weight: 1 },
  { id: "corn", name: "Candy Corn", path: "/assets/candies/candy-corn.png", weight: 1 },
  { id: "chocolate", name: "Chocolate", path: "/assets/candies/chocolate.png", weight: 1 },
  { id: "ghost", name: "Ghost Chew", path: "/assets/candies/ghost-chew.png", weight: 1 },
  { id: "smarties", name: "Smarties", path: "/assets/candies/smarties.png", weight: 1 },
  { id: "hot_tamale", name: "Hot Tamale", path: "/assets/candies/hot-tamale.png", weight: 0.10, special: "bomb" },
  { id: "peppermint", name: "Peppermint", path: "/assets/candies/peppermint.png", weight: 1.0, special: "wildcard" }
];

const CS_MODES = [
  {
    id: "fast",
    name: "FAST FRENZY",
    description: "60 seconds. Peppermints match anything and add time.",
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
    description: "18 moves. Use Hot Tamales to maximize your score.",
    candyId: "hot_tamale",
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
let csPendingMatches = [];
let csPhaseStartedAt = 0;
let csPhaseEndsAt = 0;
let csCombo = 1;
let csEndReason = "";
let csEndWon = false;
let csLastInvalidSwap = null;
let csLastInvalidAt = 0;
let csResultSummary = "";
let csShuffleCount = 0;
let csVisualSwap = null;

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
  fill(CS_BLACK);
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
  csDrawModeCandyBubble(previous.candyId, 62, 187, 25, false);
  csDrawModeCandyBubble(next.candyId, 338, 187, 25, false);
  csDrawModeCandyBubble(mode.candyId, 200, 184, 48, true);

  noStroke();
  fill(CS_WHITE);
  textStyle(BOLD);
  textSize(24);
  text("‹", 23, 187);
  text("›", 377, 187);

  fill(CS_ORANGE);
  textStyle(BOLD);
  textSize(15);
  text(mode.name, width / 2, 249);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(8);
  text(mode.description, width / 2, 270);

  // A single, clear Play button sits below the carousel.
  const hoveringPlay = mouseX >= 112 && mouseX <= 288 && mouseY >= 302 && mouseY <= 348;
  fill(hoveringPlay ? "#f5a54b" : CS_ORANGE);
  noStroke();
  rect(112, 302, 176, 46, 9);
  fill(CS_BLACK);
  textStyle(BOLD);
  textSize(15);
  text("PLAY", width / 2, 325);

  fill("#b9d4ad");
  textStyle(NORMAL);
  textSize(8);
  text("USE ← / → OR CLICK THE SIDES TO BROWSE", width / 2, 377);
  textStyle(NORMAL);
}

function csDrawModeCandyBubble(candyId, x, y, radius, selected) {
  // A single simple circle behind the candy; effects can be layered in later.
  noStroke();
  fill(CS_BLACK);
  ellipse(x, y + 2, radius * 2 + 4, radius * 2 + 4);
  fill(selected ? "#355d20" : "#1d4314");
  stroke(selected ? CS_ORANGE : "#68875a");
  strokeWeight(selected ? 3 : 1.5);
  ellipse(x, y, radius * 2, radius * 2);

  const sprite = csImages[candyId];
  if (sprite && sprite.width > 0 && sprite.height > 0) {
    const displaySize = radius * 1.45;
    const displayHeight = displaySize;
    const displayWidth = displayHeight * sprite.width / sprite.height;
    image(sprite, x, y, Math.min(displayWidth, radius * 1.65), Math.min(displayHeight, radius * 1.65));
  } else {
    fill(candyId === "hot_tamale" ? "#e13d36" : candyId === "peppermint" ? "#f3f0e7" : "#f4d56f");
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
  csSelected = null;
  csKeyboardFocus = { row: 3, col: 3 };
  csPendingMatches = [];
  csCombo = 1;
  csEndReason = "";
  csEndWon = false;
  csResultSummary = "";
  csLastInvalidSwap = null;
  csVisualSwap = null;
  csShuffleCount = 0;
  csBoard = csCreateInitialBoard();
  csState = "playing";
}

function csCreateCandy(id) {
  return {
    type: id,
    fall: null,
    bornAt: millis()
  };
}

function csIsWildcardType(typeId) {
  return csMode && csMode.id === "fast" && typeId === "peppermint";
}

function csRandomCandyId() {
  const candidates = CS_CANDY_TYPES.filter(type => type.id !== "peppermint" || csMode.id === "fast");
  let totalWeight = 0;
  const weighted = candidates.map(type => {
    let weight = type.weight;
    if (type.id === "hot_tamale") {
      if (csMode.id === "puzzle") weight = 0.85;
      else if (csMode.id === "fast") weight = 0.045;
      else weight = 0.06;
    }
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
  let targetType = null;
  for (let i = 0; i < types.length; i++) {
    const typeId = types[i];
    if (csIsWildcardType(typeId)) continue;
    if (targetType === null) targetType = typeId;
    else if (targetType !== typeId) return false;
  }
  return true;
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
function csCreateCandyAt(board, row, col, avoidImmediateMatch) {
  let type = csRandomCandyId();
  if (avoidImmediateMatch) {
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
  return csCreateCandy(type);
}

function csCreateInitialBoard() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const board = [];
    for (let row = 0; row < CS_ROWS; row++) {
      board[row] = [];
      for (let col = 0; col < CS_COLS; col++) {
        board[row][col] = null;
        board[row][col] = csCreateCandyAt(board, row, col, true);
      }
    }
    csEnsureFastPeppermint(board, true);
    if (csFindMatches(board).length === 0 && csBoardHasLegalMove(board)) return board;
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
        board[row][col] = csCreateCandyAt(board, row, col, true);
      }
    }
    csEnsureFastPeppermint(board, true);
    if (csFindMatches(board).length === 0 && csBoardHasLegalMove(board)) return board;
  }
  const fallback = [];
  const ordinary = CS_CANDY_TYPES.filter(item => !item.special).map(item => item.id);
  for (let row = 0; row < CS_ROWS; row++) {
    fallback[row] = [];
    for (let col = 0; col < CS_COLS; col++) {
      fallback[row][col] = csCreateCandy(ordinary[(row + col * 2) % ordinary.length]);
    }
  }
  fallback[0][0].type = ordinary[0];
  fallback[0][1].type = ordinary[1];
  fallback[1][0].type = ordinary[1];
  fallback[1][1].type = ordinary[0];
  fallback[2][0].type = ordinary[0];
  fallback[2][1].type = ordinary[2];
  csEnsureFastPeppermint(fallback, true);
  return fallback;
}
function csFindMatches(board) {
  const matches = new Map();

  // Peppermint is a wildcard only in Fast Frenzy.
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

function csGetCellAt(x, y) {
  if (x < CS_BOARD_X || y < CS_BOARD_Y ||
      x >= CS_BOARD_X + CS_COLS * CS_CELL || y >= CS_BOARD_Y + CS_ROWS * CS_CELL) return null;
  return {
    row: Math.floor((y - CS_BOARD_Y) / CS_CELL),
    col: Math.floor((x - CS_BOARD_X) / CS_CELL)
  };
}

function csTrySwap(from, to) {
  if (csState !== "playing" || !csAreAdjacent(from, to)) return false;
  const first = csBoard[from.row][from.col];
  const second = csBoard[to.row][to.col];
  if (!first || !second) return false;

  csSelected = null;
  csLastInvalidSwap = null;

  // Hot Tamale is a swap-triggered universal bomb. Two bombs clear the whole board;
  // otherwise the bomb clears every candy matching the other candy's type.
  if (first.type === "hot_tamale" || second.type === "hot_tamale") {
    csMovesLeft = csMode.moves === null ? csMovesLeft : csMovesLeft - 1;
    const targetType = first.type === "hot_tamale" ? second.type : first.type;
    const bombCells = [];
    if (first.type === "hot_tamale" && second.type === "hot_tamale") {
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) bombCells.push({ row, col });
      }
    } else {
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) {
          if (csBoard[row][col] && (csBoard[row][col].type === targetType ||
              (row === from.row && col === from.col) || (row === to.row && col === to.col))) {
            bombCells.push({ row, col });
          }
        }
      }
    }
    csBeginClear(bombCells, true);
    return true;
  }

  csSwapBoardCandies(csBoard, from, to);
  const matches = csFindMatches(csBoard);
  if (matches.length === 0) {
    csSwapBoardCandies(csBoard, from, to);
    csLastInvalidSwap = { from: { row: from.row, col: from.col }, to: { row: to.row, col: to.col } };
    csLastInvalidAt = millis();
    return false;
  }

  csVisualSwap = {
    from: { row: from.row, col: from.col },
    to: { row: to.row, col: to.col },
    startedAt: millis(),
    duration: 130
  };
  csMovesLeft = csMode.moves === null ? csMovesLeft : csMovesLeft - 1;
  csKeyboardFocus = { row: to.row, col: to.col };
  csBeginClear(matches, false);
  return true;
}

function csBeginClear(cells, fromBomb) {
  // A Hot Tamale matched by a cascade still behaves like a bomb.
  if (!fromBomb) {
    let foundTamale = false;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const candy = csBoard[cell.row] && csBoard[cell.row][cell.col];
      if (candy && candy.type === "hot_tamale") foundTamale = true;
    }
    if (foundTamale) {
      const blast = [];
      for (let row = 0; row < CS_ROWS; row++) {
        for (let col = 0; col < CS_COLS; col++) blast.push({ row, col });
      }
      csBeginClear(blast, true);
      return;
    }
  }
  const unique = new Map();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.row < 0 || cell.row >= CS_ROWS || cell.col < 0 || cell.col >= CS_COLS) continue;
    unique.set(cell.row + "," + cell.col, cell);
  }
  csPendingMatches = Array.from(unique.values());
  if (!csPendingMatches.length) {
    csState = "playing";
    return;
  }

  let peppermintsCount = 0;
  for (let i = 0; i < csPendingMatches.length; i++) {
    const cell = csPendingMatches[i];
    const candy = csBoard[cell.row][cell.col];
    if (candy && candy.type === "peppermint") peppermintsCount++;
  }

  csScore += csPendingMatches.length * 10 * csCombo;
  if (fromBomb) csScore += Math.min(100, csPendingMatches.length * 2);
  if (csMode.id === "fast" && peppermintsCount > 0) {
    csTimeLeft += peppermintsCount * CS_PEPPERMINT_TIME_BONUS;
  }
  csCombo++;
  csState = "clearing";
  csPhaseStartedAt = millis();
  csPhaseEndsAt = csPhaseStartedAt + CS_CLEAR_DELAY;

}

function csUpdateGame() {
  const now = millis();

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
    csFinishGame(false, "OUT OF MOVES");
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
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) candies.push(csBoard[row][col]);
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
    if (csFindMatches(csBoard).length === 0 && csBoardHasLegalMove(csBoard)) return;
  }

  csBoard = csCreateFreshPlayableBoard();
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
  csDrawHud();
  csDrawBoard();

  if (csState === "clearing") csDrawClearHighlights();
  if (csLastInvalidSwap && millis() - csLastInvalidAt < 180) {
    noFill();
    stroke("#ff514d");
    strokeWeight(2);
    const a = csLastInvalidSwap.from;
    const b = csLastInvalidSwap.to;
    rect(CS_BOARD_X + a.col * CS_CELL + 2, CS_BOARD_Y + a.row * CS_CELL + 2, CS_CELL - 4, CS_CELL - 4);
    rect(CS_BOARD_X + b.col * CS_CELL + 2, CS_BOARD_Y + b.row * CS_CELL + 2, CS_CELL - 4, CS_CELL - 4);
  } else if (csLastInvalidSwap) {
    csLastInvalidSwap = null;
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
  if (csMode.id === "fast") text("PEPPERMINT +5 SEC EACH", width - 8, 31);
  else if (csMode.id === "puzzle") text("HOT TAMALES ARE COMMON", width - 8, 31);
  else text("MATCH 3 OR MORE", width - 8, 31);
}

function csFormatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}

function csDrawBoard() {
  for (let row = 0; row < CS_ROWS; row++) {
    for (let col = 0; col < CS_COLS; col++) {
      const x = CS_BOARD_X + col * CS_CELL;
      const y = CS_BOARD_Y + row * CS_CELL;
      const candy = csBoard[row] && csBoard[row][col];

      fill((row + col) % 2 === 0 ? "#173f0c" : "#19450f");
      stroke("#28541b");
      strokeWeight(1);
      rect(x, y, CS_CELL, CS_CELL);

      const isSwapCell = csVisualSwap && millis() - csVisualSwap.startedAt < csVisualSwap.duration &&
        ((csVisualSwap.from.row === row && csVisualSwap.from.col === col) ||
         (csVisualSwap.to.row === row && csVisualSwap.to.col === col));
      if (candy && !isSwapCell) {
        const centerX = x + CS_CELL / 2;
        let centerY = y + CS_CELL / 2;
        if (candy.fall) {
          const t = Math.min(1, Math.max(0, (millis() - candy.fall.startedAt) / candy.fall.duration));
          const eased = 1 - Math.pow(1 - t, 3);
          centerY = lerp(candy.fall.fromY, centerY, eased);
          if (t >= 1) candy.fall = null;
        }
        csDrawCandy(candy, centerX, centerY, CS_CELL);
      }

      const isSelected = csSelected && csSelected.row === row && csSelected.col === col;
      const isFocus = csKeyboardFocus && csKeyboardFocus.row === row && csKeyboardFocus.col === col &&
        csState !== "gameover";
      if (isSelected) {
        noFill();
        stroke(CS_ORANGE);
        strokeWeight(3);
        rect(x + 2, y + 2, CS_CELL - 4, CS_CELL - 4);
      } else if (isFocus && csState === "playing" && !csSelected) {
        noFill();
        stroke("#f6f2dd");
        strokeWeight(1);
        rect(x + 4, y + 4, CS_CELL - 8, CS_CELL - 8);
      }
    }
  }
  csDrawVisualSwap();
}

function csDrawVisualSwap() {
  if (!csVisualSwap) return;
  const swap = csVisualSwap;
  const t = Math.min(1, Math.max(0, (millis() - swap.startedAt) / swap.duration));
  if (t >= 1) {
    csVisualSwap = null;
    return;
  }
  const eased = 1 - Math.pow(1 - t, 3);
  const ax = CS_BOARD_X + swap.from.col * CS_CELL + CS_CELL / 2;
  const ay = CS_BOARD_Y + swap.from.row * CS_CELL + CS_CELL / 2;
  const bx = CS_BOARD_X + swap.to.col * CS_CELL + CS_CELL / 2;
  const by = CS_BOARD_Y + swap.to.row * CS_CELL + CS_CELL / 2;
  // Board values have already swapped; animate each new value from its old location.
  const candyAtFrom = csBoard[swap.from.row][swap.from.col];
  const candyAtTo = csBoard[swap.to.row][swap.to.col];
  if (candyAtFrom) csDrawCandy(candyAtFrom, lerp(bx, ax, eased), lerp(by, ay, eased), CS_CELL);
  if (candyAtTo) csDrawCandy(candyAtTo, lerp(ax, bx, eased), lerp(ay, by, eased), CS_CELL);
}

function csDrawCandy(candy, x, y, cellSize) {
  const type = CS_CANDY_TYPES.find(item => item.id === candy.type);
  if (!type) return;

  // Placeholder special-candy markers live behind the artwork on purpose.
  if (candy.type === "hot_tamale") {
    csDrawStarburst(x, y, cellSize * 0.86, "#e13d36");
  } else if (candy.type === "peppermint") {
    noFill();
    stroke("#57e5a2");
    strokeWeight(3);
    ellipse(x, y, cellSize * 0.82, cellSize * 0.82);
    stroke("#b8ffe0");
    strokeWeight(1);
    ellipse(x, y, cellSize * 0.67, cellSize * 0.67);
  }

  const sprite = csImages[candy.type];
  if (sprite && sprite.width > 0 && sprite.height > 0) {
    const displaySize = cellSize * (type.special ? 0.72 : 0.78);
    const displayHeight = displaySize;
    const displayWidth = displayHeight * sprite.width / sprite.height;
    image(sprite, x, y, Math.min(displayWidth, cellSize * 0.9), Math.min(displayHeight, cellSize * 0.9));
  } else {
    noStroke();
    fill(candy.type === "hot_tamale" ? "#e13d36" : candy.type === "peppermint" ? "#57e5a2" : "#f5d66c");
    ellipse(x, y, cellSize * 0.55, cellSize * 0.55);
    fill(CS_BLACK);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    textSize(8);
    text(type.name.slice(0, 2).toUpperCase(), x, y);
    textStyle(NORMAL);
  }
}

function csDrawStarburst(x, y, size, colorValue) {
  push();
  translate(x, y);
  rotate(-HALF_PI);
  noStroke();
  fill(colorValue);
  beginShape();
  const points = 10;
  for (let i = 0; i < points * 2; i++) {
    const angle = i * PI / points;
    const radius = i % 2 === 0 ? size / 2 : size * 0.34;
    vertex(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  endShape(CLOSE);
  pop();
}

function csDrawClearHighlights() {
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin((millis() - csPhaseStartedAt) / 55));
  for (let i = 0; i < csPendingMatches.length; i++) {
    const cell = csPendingMatches[i];
    const x = CS_BOARD_X + cell.col * CS_CELL;
    const y = CS_BOARD_Y + cell.row * CS_CELL;
    noStroke();
    fill(255, 246, 220, 70 + pulse * 110);
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
  fill(csEndWon ? "#8fe388" : CS_ORANGE);
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
  fill(replayHover ? "#365f21" : "#244519");
  stroke(CS_ORANGE);
  strokeWeight(1);
  rect(69, 220, 126, 38);
  fill(menuHover ? "#365f21" : CS_BLACK);
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
  const cell = csGetCellAt(mouseX, mouseY);
  if (!cell) return false;

  csKeyboardFocus = { row: cell.row, col: cell.col };
  if (!csSelected) {
    csSelected = cell;
  } else if (csSelected.row === cell.row && csSelected.col === cell.col) {
    csSelected = null;
  } else if (csAreAdjacent(csSelected, cell)) {
    const from = csSelected;
    const swapped = csTrySwap(from, cell);
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

  const directions = {
    ArrowUp: { row: -1, col: 0 },
    ArrowDown: { row: 1, col: 0 },
    ArrowLeft: { row: 0, col: -1 },
    ArrowRight: { row: 0, col: 1 }
  };
  const direction = directions[key];
  if (direction) {
    if (csSelected) {
      const to = {
        row: csSelected.row + direction.row,
        col: csSelected.col + direction.col
      };
      if (to.row >= 0 && to.row < CS_ROWS && to.col >= 0 && to.col < CS_COLS) {
        const from = csSelected;
        if (csTrySwap(from, to)) csKeyboardFocus = to;
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
