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
const CS_SMARTIES_TIME_BONUS = 5;
const CS_PUZZLE_TARGET = 750;

const CS_CANDY_TYPES = [
  { id: "blue", name: "Blue Candy", path: "/assets/candies/blue-candy.png", weight: 1 },
  { id: "apple", name: "Candied Apple", path: "/assets/candies/candied-apple.png", weight: 1 },
  { id: "corn", name: "Candy Corn", path: "/assets/candies/candy-corn.png", weight: 1 },
  { id: "chocolate", name: "Chocolate", path: "/assets/candies/chocolate.png", weight: 1 },
  { id: "ghost", name: "Ghost Chew", path: "/assets/candies/ghost-chew.png", weight: 1 },
  { id: "hot_tamale", name: "Hot Tamale", path: "/assets/candies/hot-tamale.png", weight: 0.10, special: "bomb" },
  { id: "smarties", name: "Smarties", path: "/assets/candies/smarties.png", weight: 0.72, special: "time" }
];

const CS_MODES = [
  {
    id: "fast",
    name: "FAST FRENZY",
    description: "60 seconds. Smarties add time.",
    moves: null,
    seconds: 60,
    target: null
  },
  {
    id: "classic",
    name: "CLASSIC",
    description: "30 moves. Score as much as you can.",
    moves: 30,
    seconds: null,
    target: null
  },
  {
    id: "puzzle",
    name: "PUZZLE",
    description: "Reach 750 points in 18 moves.",
    moves: 18,
    seconds: null,
    target: CS_PUZZLE_TARGET
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
  rect(0, 0, width, 103);
  stroke(CS_ORANGE);
  strokeWeight(2);
  line(0, 102, width, 102);

  noStroke();
  fill(CS_ORANGE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(27);
  text("CANDY SMASH", width / 2, 35);
  fill(CS_WHITE);
  textStyle(NORMAL);
  textSize(10);
  text("MATCH CANDIES. TRIGGER SPECIALS. CHASE YOUR SCORE.", width / 2, 74);

  for (let i = 0; i < CS_MODES.length; i++) {
    const mode = CS_MODES[i];
    const x = 28;
    const y = 121 + i * 65;
    const w = 344;
    const h = 54;
    const hovered = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
    fill(i === csSelectedMode ? "#243b16" : CS_BLACK);
    stroke(i === csSelectedMode || hovered ? CS_ORANGE : "#49643a");
    strokeWeight(i === csSelectedMode ? 2 : hovered ? 2 : 1);
    rect(x, y, w, h);
    noStroke();
    fill(CS_ORANGE);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(13);
    text(mode.name, x + 13, y + 17);
    fill(CS_WHITE);
    textStyle(NORMAL);
    textSize(9);
    text(mode.description, x + 13, y + 38);
  }

  const playHovered = mouseX >= 117 && mouseX <= 283 && mouseY >= 324 && mouseY <= 365;
  fill(playHovered ? "#365f21" : "#244519");
  stroke(CS_ORANGE);
  strokeWeight(2);
  rect(117, 324, 166, 41);
  noStroke();
  fill(CS_WHITE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(14);
  text("PLAY", width / 2, 345);

  textStyle(NORMAL);
  fill(CS_WHITE);
  textSize(8);
  text("CLICK OR USE ↑ ↓, THEN ENTER", width / 2, 385);
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

function csRandomCandyId() {
  let totalWeight = 0;
  for (let i = 0; i < CS_CANDY_TYPES.length; i++) totalWeight += CS_CANDY_TYPES[i].weight;
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < CS_CANDY_TYPES.length; i++) {
    roll -= CS_CANDY_TYPES[i].weight;
    if (roll <= 0) return CS_CANDY_TYPES[i].id;
  }
  return CS_CANDY_TYPES[0].id;
}

function csWouldMakeMatchAt(board, row, col, type) {
  if (col >= 2 && board[row][col - 1] && board[row][col - 2] &&
      board[row][col - 1].type === type && board[row][col - 2].type === type) return true;
  if (row >= 2 && board[row - 1][col] && board[row - 2][col] &&
      board[row - 1][col].type === type && board[row - 2][col].type === type) return true;
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
  const board = [];
  for (let row = 0; row < CS_ROWS; row++) {
    board[row] = [];
    for (let col = 0; col < CS_COLS; col++) {
      board[row][col] = null;
      board[row][col] = csCreateCandyAt(board, row, col, true);
    }
  }
  if (!csBoardHasLegalMove(board)) return csCreateFreshPlayableBoard();
  return board;
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
  // Make one guaranteed legal swap without creating an initial match.
  fallback[0][0].type = ordinary[0];
  fallback[0][1].type = ordinary[1];
  fallback[1][0].type = ordinary[1];
  fallback[1][1].type = ordinary[0];
  fallback[2][0].type = ordinary[0];
  fallback[2][1].type = ordinary[2];
  return fallback;
}

function csFindMatches(board) {
  const matches = new Map();

  for (let row = 0; row < CS_ROWS; row++) {
    let start = 0;
    while (start < CS_COLS) {
      const candy = board[row][start];
      if (!candy) {
        start++;
        continue;
      }
      let end = start + 1;
      while (end < CS_COLS && board[row][end] && board[row][end].type === candy.type) end++;
      if (end - start >= 3) {
        for (let col = start; col < end; col++) matches.set(row + "," + col, { row, col });
      }
      start = end;
    }
  }

  for (let col = 0; col < CS_COLS; col++) {
    let start = 0;
    while (start < CS_ROWS) {
      const candy = board[start][col];
      if (!candy) {
        start++;
        continue;
      }
      let end = start + 1;
      while (end < CS_ROWS && board[end][col] && board[end][col].type === candy.type) end++;
      if (end - start >= 3) {
        for (let row = start; row < end; row++) matches.set(row + "," + col, { row, col });
      }
      start = end;
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

  let smartiesCount = 0;
  for (let i = 0; i < csPendingMatches.length; i++) {
    const cell = csPendingMatches[i];
    const candy = csBoard[cell.row][cell.col];
    if (candy && candy.type === "smarties") smartiesCount++;
  }

  csScore += csPendingMatches.length * 10 * csCombo;
  if (fromBomb) csScore += Math.min(100, csPendingMatches.length * 2);
  if (csMode.id === "fast" && smartiesCount > 0) {
    csTimeLeft += smartiesCount * CS_SMARTIES_TIME_BONUS;
  }
  csCombo++;
  csState = "clearing";
  csPhaseStartedAt = millis();
  csPhaseEndsAt = csPhaseStartedAt + CS_CLEAR_DELAY;

  if (csMode.id === "puzzle" && csScore >= csMode.target) {
    csEndWon = true;
    csEndReason = "PUZZLE SOLVED!";
  }
}

function csUpdateGame() {
  const now = millis();

  if (csState === "playing" && csMode.id === "fast") {
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
      if (csEndWon && csMode.id === "puzzle") {
        // Keep resolving the winning cascade so the board settles before the result.
        csEndReason = "PUZZLE SOLVED!";
      }
    } else {
      csState = "playing";
      csCombo = 1;
      csAfterBoardSettles();
    }
  }

  if (csState === "playing" && csMode.id === "puzzle" && csEndWon) {
    csFinishGame(true, "PUZZLE SOLVED!");
  } else if (csState === "playing" && csMode.moves !== null && csMovesLeft <= 0) {
    if (csMode.id === "puzzle" && csScore >= csMode.target) csFinishGame(true, "PUZZLE SOLVED!");
    else if (csMode.id === "puzzle") csFinishGame(false, "OUT OF MOVES");
    else csFinishGame(false, "OUT OF MOVES");
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
    for (let row = writeRow; row >= 0; row--) {
      const candy = csCreateCandyAt(csBoard, row, col, true);
      candy.fall = {
        fromY: CS_BOARD_Y - (writeRow - row + 1) * CS_CELL - 10,
        startedAt: now,
        duration: 230 + Math.min(110, (writeRow - row) * 25)
      };
      csBoard[row][col] = candy;
    }
  }
}

function csAfterBoardSettles() {
  if (csMode.id === "puzzle" && csScore >= csMode.target) {
    csFinishGame(true, "PUZZLE SOLVED!");
    return;
  }
  if (csMode.moves !== null && csMovesLeft <= 0) {
    if (csMode.id === "puzzle") csFinishGame(false, "OUT OF MOVES");
    else csFinishGame(false, "OUT OF MOVES");
    return;
  }
  if (!csBoardHasLegalMove(csBoard)) csReshuffleBoard();
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
  if (csMode.id === "puzzle") text("TARGET " + csMode.target, width - 8, 31);
  else if (csMode.id === "fast") text("SMARTIES +5 SEC", width - 8, 31);
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
  } else if (candy.type === "smarties") {
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
    fill(candy.type === "hot_tamale" ? "#e13d36" : candy.type === "smarties" ? "#57e5a2" : "#f5d66c");
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
  if (csMode.id === "puzzle") text("TARGET  " + csMode.target, width / 2, panelY + 96);
  else if (csMode.id === "fast") text("TIME EXTENSIONS  FROM SMARTIES", width / 2, panelY + 96);
  else text("MOVES USED  " + (csMode.moves - Math.max(0, csMovesLeft)), width / 2, panelY + 96);

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
    for (let i = 0; i < CS_MODES.length; i++) {
      const x = 28;
      const y = 121 + i * 65;
      if (mouseX >= x && mouseX <= x + 344 && mouseY >= y && mouseY <= y + 54) {
        csSelectedMode = i;
        return false;
      }
    }
    if (mouseX >= 117 && mouseX <= 283 && mouseY >= 324 && mouseY <= 365) {
      csStartGame(csSelectedMode);
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
    if (key === "ArrowUp" || key === "ArrowLeft") {
      csSelectedMode = (csSelectedMode - 1 + CS_MODES.length) % CS_MODES.length;
      return false;
    }
    if (key === "ArrowDown" || key === "ArrowRight") {
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
