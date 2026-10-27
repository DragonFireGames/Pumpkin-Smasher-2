/* Pumpkin Minesweeper. Canvas-only p5.js global-mode lobby minigame. */
const backgroundColor = "#123904";
const orange = "#ffa500";
const black = "#10180b";
const white = "#f6f2dd";
const coveredColor = "#173f0c";
const revealedColor = "#2b5f1b";
const revealedBorder = "#1b4b10";
const mineColor = "#451b16";
const explosionFrameCount = 24;
const explosionFrameDuration = 40;
const targetFrameRate = 10;
const spinDuration = 520;
const difficulties = [
  { id: "small", label: "SMALL", cols: 9, rows: 9, mines: 10 },
  { id: "medium", label: "MEDIUM", cols: 12, rows: 12, mines: 22 },
  { id: "large", label: "LARGE", cols: 16, rows: 16, mines: 40 }
];

let images = {};
let gameState = "title";
let selectedDifficultyIndex = 1;
let currentDifficulty = difficulties[selectedDifficultyIndex];
let board = [];
let boardCols = 0;
let boardRows = 0;
let mineCount = 0;
let marksPlaced = 0;
let minesPlaced = false;
let gameStartedAt = 0;
let gameEndedAt = null;
let explodedCell = null;
let explosionStartedAt = 0;
let boardLayout = { x: 0, y: 0, cellSize: 0 };

function preload() {
  images.pumpkin = loadImage("/assets/pumpkins/pumpkin.png", () => {}, () => {});
  images.target = loadImage("/assets/entities/nuke/target.png", () => {}, () => {});
  images.explosion = loadImage("/assets/entities/mine/explode.png", () => {}, () => {});
}

function setup() {
  createCanvas(400, 400);
  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  textFont("Arial");
  resizeCanvasToContainer();
  window.addEventListener("resize", resizeCanvasToContainer);
  window.addEventListener("keydown", handleGameKeyDown);
  window.addEventListener("contextmenu", event => event.preventDefault());
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

function draw() {
  background(backgroundColor);
  if (gameState === "title") {
    drawTitleScreen();
    return;
  }
  if (gameState === "exploding" && millis() - explosionStartedAt >= spinDuration + explosionFrameCount * explosionFrameDuration) {
    finishGameOver();
  }
  drawBoard();
  drawHUD();
  if (gameState === "exploding") drawExplosionAnimation(millis() - explosionStartedAt);
  if (gameState === "gameover" || gameState === "victory") drawResultOverlay();
}

function drawTitleScreen() {
  noStroke();
  fill(black);
  rect(0, 0, width, 104);
  stroke(orange);
  strokeWeight(2);
  line(0, 103, width, 103);
  noStroke();
  fill(orange);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(24);
  text("PUMPKIN MINESWEEPER", width / 2, 39);
  fill(white);
  textStyle(NORMAL);
  textSize(10);
  text("FIND THE PATCH WITHOUT HITTING A MINE", width / 2, 74);
  fill(orange);
  textStyle(BOLD);
  textSize(12);
  text("CHOOSE YOUR PATCH", width / 2, 132);
  for (let i = 0; i < difficulties.length; i++) {
    const difficulty = difficulties[i];
    const x = 52;
    const y = 158 + i * 61;
    const w = 296;
    const h = 47;
    const hovered = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
    fill(i === selectedDifficultyIndex ? "#243b16" : black);
    stroke(hovered || i === selectedDifficultyIndex ? orange : "#49643a");
    strokeWeight(hovered ? 3 : i === selectedDifficultyIndex ? 2 : 1);
    rect(x, y, w, h);
    noStroke();
    fill(orange);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(14);
    text(difficulty.label, x + 14, y + h / 2);
    fill(white);
    textAlign(RIGHT, CENTER);
    textStyle(NORMAL);
    textSize(10);
    text(difficulty.cols + " × " + difficulty.rows + "    " + difficulty.mines + " MINES", x + w - 14, y + h / 2);
  }
  noStroke();
  fill(white);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  textSize(9);
  text("ARROWS TO SELECT  ·  ENTER TO PLAY", width / 2, 359);
  text("OR CLICK A PATCH", width / 2, 377);
}

function startGame(difficultyIndex) {
  selectedDifficultyIndex = difficultyIndex;
  currentDifficulty = difficulties[selectedDifficultyIndex];
  boardCols = currentDifficulty.cols;
  boardRows = currentDifficulty.rows;
  mineCount = currentDifficulty.mines;
  marksPlaced = 0;
  minesPlaced = false;
  gameStartedAt = millis();
  gameEndedAt = null;
  explodedCell = null;
  explosionStartedAt = 0;
  board = [];
  for (let row = 0; row < boardRows; row++) {
    const cells = [];
    for (let col = 0; col < boardCols; col++) {
      cells.push({ row, col, mine: false, revealed: false, marked: false, adjacent: 0 });
    }
    board.push(cells);
  }
  gameState = "playing";
}

function getBoardLayout() {
  const top = 51;
  const bottom = height - 26;
  const availableWidth = width - 20;
  const availableHeight = bottom - top;
  const cellSize = Math.max(1, Math.floor(Math.min(availableWidth / boardCols, availableHeight / boardRows)));
  const gridWidth = cellSize * boardCols;
  const gridHeight = cellSize * boardRows;
  return {
    x: Math.floor((width - gridWidth) / 2),
    y: top + Math.floor((availableHeight - gridHeight) / 2),
    cellSize,
    width: gridWidth,
    height: gridHeight
  };
}

function drawBoard() {
  boardLayout = getBoardLayout();
  for (let row = 0; row < boardRows; row++) {
    for (let col = 0; col < boardCols; col++) {
      drawCell(board[row][col]);
    }
  }
}

function drawCell(cell) {
  const layout = boardLayout;
  const x = layout.x + cell.col * layout.cellSize;
  const y = layout.y + cell.row * layout.cellSize;
  const size = layout.cellSize;
  const hovered = gameState === "playing" && mouseX >= x && mouseX < x + size && mouseY >= y && mouseY < y + size;
  if (cell.revealed && cell.mine) {
    fill(mineColor);
    stroke(revealedBorder);
    strokeWeight(1);
    rect(x, y, size, size);
    drawMineMarker(x + size / 2, y + size / 2, size);
    return;
  }
  if (cell.revealed) {
    fill(revealedColor);
    stroke(hovered ? orange : revealedBorder);
    strokeWeight(hovered ? 1.5 : 1);
    rect(x, y, size, size);
    if (cell.adjacent > 0) {
      const numberColors = ["", "#b9ddff", "#91e37a", orange, "#d6c5ff", "#ffb09a", "#8ce6de", white, "#d2d2d2"];
      noStroke();
      fill(numberColors[cell.adjacent] || white);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(Math.max(9, size * 0.58));
      text(cell.adjacent, x + size / 2, y + size / 2 + 0.5);
      textStyle(NORMAL);
    }
    return;
  }
  fill(coveredColor);
  stroke(hovered ? orange : "#28541b");
  strokeWeight(hovered ? 1.5 : 1);
  rect(x, y, size, size);
  const isExplodingCell = gameState === "exploding" && explodedCell && explodedCell.row === cell.row && explodedCell.col === cell.col;
  if (!isExplodingCell && images.pumpkin && images.pumpkin.width > 0) {
    noStroke();
    image(images.pumpkin, x + size / 2, y + size / 2, size * 0.96, size * 0.96);
  }
  if (cell.marked) drawTargetMarker(x, y, size);
}

function drawTargetMarker(x, y, size) {
  const sheet = images.target;
  if (!sheet || !sheet.width || !sheet.height) {
    noFill();
    stroke(orange);
    strokeWeight(Math.max(1, size * 0.06));
    ellipse(x + size / 2, y + size / 2, size * 0.72, size * 0.72);
    line(x + size * 0.5, y + size * 0.12, x + size * 0.5, y + size * 0.31);
    line(x + size * 0.5, y + size * 0.69, x + size * 0.5, y + size * 0.88);
    line(x + size * 0.12, y + size * 0.5, x + size * 0.31, y + size * 0.5);
    line(x + size * 0.69, y + size * 0.5, x + size * 0.88, y + size * 0.5);
    return;
  }
  const frameCount = 12;
  const frameWidth = sheet.width / frameCount;
  const scaleFactor = Math.min(size * 0.92 / frameWidth, size * 0.92 / sheet.height);
  const displayWidth = frameWidth * scaleFactor;
  const displayHeight = sheet.height * scaleFactor;
  const frame = Math.floor(millis() * targetFrameRate / 1000) % frameCount;
  image(sheet, x + size / 2, y + size / 2, displayWidth, displayHeight, frame * frameWidth, 0, frameWidth, sheet.height);
}

function drawMineMarker(cx, cy, size) {
  const radius = size * 0.2;
  stroke(black);
  strokeWeight(Math.max(1, size * 0.075));
  line(cx + radius * 0.45, cy - radius * 0.55, cx + radius * 1.05, cy - radius * 1.1);
  noStroke();
  fill(orange);
  ellipse(cx, cy, size * 0.43, size * 0.43);
  fill(black);
  ellipse(cx, cy, size * 0.16, size * 0.16);
  fill(orange);
  ellipse(cx + radius * 1.12, cy - radius * 1.15, Math.max(2, size * 0.09), Math.max(2, size * 0.09));
}

function drawHUD() {
  noStroke();
  fill(black);
  rect(0, 0, width, 46);
  stroke(orange);
  strokeWeight(2);
  line(0, 45, width, 45);
  noStroke();
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  fill(orange);
  textSize(12);
  text("MINES " + formatMineCounter(), 8, 14);
  textStyle(NORMAL);
  textSize(8);
  fill(white);
  text(currentDifficulty.label + " PATCH  ·  " + boardCols + " × " + boardRows, 8, 32);
  textAlign(RIGHT, CENTER);
  textSize(12);
  textStyle(BOLD);
  fill(orange);
  text("TIME " + formatElapsedTime(), width - 8, 14);
  textStyle(NORMAL);
  textSize(8);
  fill(white);
  text("LEFT CLICK: REVEAL  ·  RIGHT CLICK: MARK", width - 8, 32);
}

function formatMineCounter() {
  const remaining = mineCount - marksPlaced;
  return remaining < 0 ? String(remaining) : String(remaining).padStart(2, "0");
}

function formatElapsedTime() {
  const end = gameEndedAt === null ? millis() : gameEndedAt;
  const totalSeconds = Math.max(0, Math.floor((end - gameStartedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function getCellAt(x, y) {
  const layout = getBoardLayout();
  if (x < layout.x || y < layout.y || x >= layout.x + layout.width || y >= layout.y + layout.height) return null;
  const col = Math.floor((x - layout.x) / layout.cellSize);
  const row = Math.floor((y - layout.y) / layout.cellSize);
  return { cell: board[row][col], row, col };
}

function getNeighbors(row, col) {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const neighborRow = row + dy;
      const neighborCol = col + dx;
      if (neighborRow < 0 || neighborRow >= boardRows || neighborCol < 0 || neighborCol >= boardCols) continue;
      neighbors.push(board[neighborRow][neighborCol]);
    }
  }
  return neighbors;
}

function placeMines(safeRow, safeCol) {
  const available = [];
  for (let row = 0; row < boardRows; row++) {
    for (let col = 0; col < boardCols; col++) {
      if (row === safeRow && col === safeCol) continue;
      available.push(board[row][col]);
    }
  }
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  for (let i = 0; i < mineCount; i++) available[i].mine = true;
  minesPlaced = true;
  for (let row = 0; row < boardRows; row++) {
    for (let col = 0; col < boardCols; col++) {
      const cell = board[row][col];
      cell.adjacent = getNeighbors(row, col).filter(neighbor => neighbor.mine).length;
    }
  }
}

function revealCell(row, col) {
  const cell = board[row][col];
  if (gameState !== "playing" || cell.revealed || cell.marked) return;
  if (!minesPlaced) placeMines(row, col);
  if (cell.mine) {
    explodedCell = cell;
    explosionStartedAt = millis();
    gameState = "exploding";
    return;
  }
  const stack = [cell];
  while (stack.length) {
    const current = stack.pop();
    if (current.revealed || current.marked || current.mine) continue;
    current.revealed = true;
    if (current.adjacent !== 0) continue;
    const neighbors = getNeighbors(current.row, current.col);
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (!neighbor.revealed && !neighbor.marked && !neighbor.mine) stack.push(neighbor);
    }
  }
  checkVictory();
}

function toggleMark(row, col) {
  const cell = board[row][col];
  if (gameState !== "playing" || cell.revealed) return;
  cell.marked = !cell.marked;
  marksPlaced += cell.marked ? 1 : -1;
}

function checkVictory() {
  let safeCellsRevealed = 0;
  for (let row = 0; row < boardRows; row++) {
    for (let col = 0; col < boardCols; col++) {
      const cell = board[row][col];
      if (!cell.mine && cell.revealed) safeCellsRevealed++;
    }
  }
  if (safeCellsRevealed === boardRows * boardCols - mineCount) finishVictory();
}

function revealAllMines() {
  for (let row = 0; row < boardRows; row++) {
    for (let col = 0; col < boardCols; col++) {
      if (board[row][col].mine) board[row][col].revealed = true;
    }
  }
}

function finishGameOver() {
  gameEndedAt = millis();
  revealAllMines();
  gameState = "gameover";
}

function finishVictory() {
  gameEndedAt = millis();
  revealAllMines();
  gameState = "victory";
}

function drawExplosionAnimation(elapsed) {
  const cellSize = boardLayout.cellSize;
  const centerX = boardLayout.x + explodedCell.col * cellSize + cellSize / 2;
  const centerY = boardLayout.y + explodedCell.row * cellSize + cellSize / 2;
  if (elapsed < spinDuration) {
    const progress = constrain(elapsed / spinDuration, 0, 1);
    const size = cellSize * (1 + Math.sin(progress * PI) * 0.22);
    push();
    translate(centerX, centerY);
    rotate(progress * TWO_PI * 3.5);
    if (images.pumpkin && images.pumpkin.width > 0) image(images.pumpkin, 0, 0, size, size);
    pop();
    return;
  }
  const sheet = images.explosion;
  if (!sheet || sheet.width <= 0 || sheet.height <= 0) return;
  const frameWidth = sheet.width / explosionFrameCount;
  const frame = Math.min(explosionFrameCount - 1, Math.floor((elapsed - spinDuration) / explosionFrameDuration));
  const displayWidth = Math.max(36, Math.min(66, cellSize * 2.4));
  const displayHeight = displayWidth * sheet.height / frameWidth;
  image(sheet, centerX, centerY, displayWidth, displayHeight, frame * frameWidth, 0, frameWidth, sheet.height);
}

function drawResultOverlay() {
  fill(0, 0, 0, 175);
  noStroke();
  rect(0, 0, width, height);
  const panelX = 36;
  const panelY = 126;
  const panelW = width - panelX * 2;
  const panelH = 148;
  fill(black);
  stroke(orange);
  strokeWeight(3);
  rect(panelX, panelY, panelW, panelH);
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(orange);
  textSize(gameState === "victory" ? 24 : 27);
  text(gameState === "victory" ? "PATCH CLEARED!" : "GAME OVER", width / 2, panelY + 39);
  textStyle(NORMAL);
  fill(white);
  textSize(12);
  text(gameState === "victory" ? "The patch is clear!" : "You hit a mine.", width / 2, panelY + 73);
  fill(orange);
  textStyle(BOLD);
  textSize(10);
  text("PRESS ENTER TO CONTINUE", width / 2, panelY + 113);
  textStyle(NORMAL);
}

function handleGameKeyDown(event) {
  if (event.repeat) return;
  if (gameState === "title" && ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.code)) {
    const direction = event.code === "ArrowLeft" || event.code === "ArrowUp" ? -1 : 1;
    selectedDifficultyIndex = (selectedDifficultyIndex + direction + difficulties.length) % difficulties.length;
    event.preventDefault();
    return;
  }
  if (event.code === "Enter" || event.code === "Space") {
    if (gameState === "title") {
      startGame(selectedDifficultyIndex);
      event.preventDefault();
      return;
    }
    if (gameState === "gameover" || gameState === "victory") {
      gameState = "title";
      event.preventDefault();
      return;
    }
  }
  if (event.code === "Escape" && gameState === "playing") {
    gameState = "title";
    event.preventDefault();
  }
}

function mousePressed(event) {
  if (gameState === "title") {
    for (let i = 0; i < difficulties.length; i++) {
      const x = 52;
      const y = 158 + i * 61;
      const w = 296;
      const h = 47;
      if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) continue;
      startGame(i);
      return false;
    }
    return false;
  }
  if (gameState !== "playing") return false;
  const selected = getCellAt(mouseX, mouseY);
  if (!selected) return false;
  if (mouseButton === RIGHT || (event && event.shiftKey)) toggleMark(selected.row, selected.col);
  else revealCell(selected.row, selected.col);
  return false;
}
