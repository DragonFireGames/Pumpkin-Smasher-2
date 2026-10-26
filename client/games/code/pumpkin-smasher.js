/* Pumpkin Smasher 1 — p5.js global mode port.
   This file is loaded as a classic script inside the game's iframe.
   It deliberately defines global setup()/draw() instead of exporting a module. */

const WORLD_W = 1200, WORLD_H = 800;
const GAME_SECONDS = 121, REVEAL_FRAMES = 180;
const ENEMY_COUNT = 5, PUMPKIN_TARGET = 180;
let pumpkinImage, skeletonImage, enemySkeletonImage, jackImage, revealImage, smashImage, score100Image, score500Image;
let musicTracks = [], musicIndex = -1, musicActive = false;
let gameState = "title", player, enemies = [], pumpkins = [], effects = [];
let elapsed = 0, remaining = GAME_SECONDS, spawnCountdown = 0, totalSpawned = 0, lastFrameTime = 0, winnerPlace = 0;
let resultPage = 0, debugMode = false;

function setup() {
  const side = Math.max(1, Math.floor(Math.min(windowWidth, windowHeight)));
  createCanvas(side, side);
  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  pumpkinImage = loadImage("/assets/pumpkins/pumpkin.png", undefined, () => pumpkinImage = null);
  skeletonImage = loadImage("/assets/skeleton/1.png", undefined, () => skeletonImage = null);
  enemySkeletonImage = loadImage("/assets/skeleton/2.png", undefined, () => enemySkeletonImage = null);
  jackImage = loadImage("/assets/pumpkins/jack_o_lantern.png", undefined, () => jackImage = null);
  revealImage = loadImage("/assets/pumpkins/reveal.png", undefined, () => revealImage = null);
  smashImage = loadImage("/assets/pumpkins/pumpkin_smash.png", undefined, () => smashImage = null);
  score100Image = loadImage("/assets/pumpkins/100_score.png", undefined, () => score100Image = null);
  score500Image = loadImage("/assets/pumpkins/500_score.png", undefined, () => score500Image = null);
  musicTracks = ["background.mp3", "background1.mp3", "background2.mp3"].map(file => {
    const audio = new Audio("/assets/music/" + file);
    audio.volume = 0.22;
    audio.addEventListener("ended", playNextTrack);
    return audio;
  });
  player = makeActor(0, 0, false);
  lastFrameTime = millis();
}

function windowResized() {
  const side = Math.max(1, Math.floor(Math.min(windowWidth, windowHeight)));
  resizeCanvas(side, side);
}

function makeActor(x, y, enemy) {
  return { x, y, score: 0, smashed: 0, enemy, target: -1, facing: 1, angle: 0, imageIndex: random([1, 2]) };
}

function resetRound() {
  stopMusic();
  player = makeActor(0, 0, false);
  enemies = [];
  pumpkins = [];
  effects = [];
  elapsed = 0;
  remaining = GAME_SECONDS;
  spawnCountdown = 0;
  totalSpawned = 0;
  winnerPlace = 0;
  resultPage = 0;
  for (let i = 0; i < ENEMY_COUNT; i++) enemies.push(makeActor(random(-45, 45), random(-45, 45), true));
  // Code.org version begins with the field filled by growing pumpkins.
  spawnPumpkinBatch(PUMPKIN_TARGET);
  gameState = "playing";
  startMusic();
}

function spawnPumpkinBatch(count) {
  for (let i = 0; i < count && totalSpawned < PUMPKIN_TARGET; i++) {
    const pumpkin = {
      x: randomNumber(-WORLD_W / 2, WORLD_W / 2, 50),
      y: randomNumber(-WORLD_H / 2, WORLD_H / 2, 50),
      jack: randomNumber(1, 5) === 1,
      age: 0,
      scale: 0.1,
      target: -1
    };
    pumpkins.push(pumpkin);
    totalSpawned++;
  }
}

function randomNumber(min, max, step) {
  const value = Math.floor(random(min, max + 1));
  return step ? Math.round(value / step) * step : value;
}

function startMusic() {
  if (musicActive || !musicTracks.length) return;
  musicActive = true;
  playNextTrack();
}
function playNextTrack() {
  if (!musicActive || !musicTracks.length) return;
  musicIndex = (musicIndex + 1) % musicTracks.length;
  const audio = musicTracks[musicIndex];
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function stopMusic() {
  musicActive = false;
  musicTracks.forEach(audio => { audio.pause(); audio.currentTime = 0; });
}

function smash(actor, pumpkin) {
  const points = pumpkin.jack ? 500 : 100;
  actor.score += points;
  actor.smashed++;
  effects.push({ x: pumpkin.x, y: pumpkin.y, points, jack: pumpkin.jack, age: 0, life: 20 });
  pumpkins.splice(pumpkins.indexOf(pumpkin), 1);
  enemies.forEach(enemy => { if (enemy.target === pumpkin) enemy.target = -1; });
}

function draw() {
  const now = millis();
  const dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  background("#123904");

  if (gameState === "title") {
    drawOverlay("Pumpkin Smasher", "Press ENTER or SPACE to start", "F for the full version");
    return;
  }

  if (gameState === "playing") {
    updateRound(dt);
    push();
    const s = Math.min(width / WORLD_W, height / WORLD_H);
    translate(width / 2, height / 2);
    scale(s);
    translate(-player.x, -player.y);
    noFill(); stroke("#050805"); strokeWeight(20); rectMode(CENTER); rect(0, 0, WORLD_W, WORLD_H); rectMode(CORNER);
    pumpkins.forEach(drawPumpkin);
    enemies.forEach(drawSkeleton);
    drawSkeleton(player);
    effects.forEach(drawEffect);
    if (debugMode) {
      noFill(); stroke("#ff00ff"); strokeWeight(2);
      pumpkins.forEach(q => ellipse(q.x, q.y, 55, 55));
      enemies.concat([player]).forEach(a => rect(a.x - 20, a.y - 27, 40, 54));
    }
    pop();
    drawHUD();
    return;
  }

  if (gameState === "ended") {
    push();
    const s = Math.min(width / WORLD_W, height / WORLD_H);
    translate(width / 2, height / 2); scale(s); translate(-player.x, -player.y);
    noFill(); stroke("#050805"); strokeWeight(20); rectMode(CENTER); rect(0, 0, WORLD_W, WORLD_H); rectMode(CORNER);
    pumpkins.forEach(drawPumpkin); enemies.forEach(drawSkeleton); drawSkeleton(player);
    pop();
    if (winnerPlace === 1) drawOverlay("You Won!", "Your Score: " + player.score, "Press U to scroll • P to play again");
    else if (winnerPlace === 2) drawOverlay("2nd Place!!", "Your Score: " + player.score, "Press U to scroll • P to play again");
    else if (winnerPlace === 3) drawOverlay("3rd Place!!", "Your Score: " + player.score, "Press U to scroll • P to play again");
    else drawOverlay("You Lost", "Your Score: " + player.score, "Press U to scroll • P to play again");
    if (resultPage === 1) drawOverlay("Your Results", "Smashed: " + player.smashed + " • Score: " + player.score, "Press U to return • P to play again");
  }
}

function updateRound(dt) {
  elapsed += dt;
  remaining = Math.max(0, GAME_SECONDS - Math.floor(elapsed));
  spawnCountdown += dt;
  if (spawnCountdown >= random(1, 10) && totalSpawned < PUMPKIN_TARGET) {
    spawnCountdown = 0;
    spawnPumpkinBatch(PUMPKIN_TARGET - totalSpawned);
  }

  pumpkins.forEach(q => {
    q.age += dt * 60;
    q.scale = Math.min(1, q.scale + random(0, 0.025));
  });

  const right = keyIsDown(RIGHT_ARROW) || keyIsDown(68);
  const left = keyIsDown(LEFT_ARROW) || keyIsDown(65);
  const down = keyIsDown(DOWN_ARROW) || keyIsDown(83);
  const up = keyIsDown(UP_ARROW) || keyIsDown(87);
  const dx = (right ? 1 : 0) - (left ? 1 : 0);
  const dy = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  player.x = constrain(player.x + dx / len * 300 * dt, -WORLD_W / 2, WORLD_W / 2);
  player.y = constrain(player.y + dy / len * 300 * dt, -WORLD_H / 2, WORLD_H / 2);
  if (dx) player.facing = dx < 0 ? -1 : 1;

  if (keyIsDown(32)) {
    [...pumpkins].forEach(q => { if (dist(q.x, q.y, player.x, player.y) < 55) smash(player, q); });
  }

  enemies.forEach((enemy, i) => {
    if (enemy.target < 0 || !pumpkins.includes(enemy.target)) {
      if (!pumpkins.length) return;
      enemy.target = pumpkins.reduce((best, q) => !best || dist(enemy.x, enemy.y, q.x, q.y) < dist(enemy.x, enemy.y, best.x, best.y) ? q : best, null);
    }
    const target = enemy.target;
    if (!target || !pumpkins.includes(target)) { enemy.target = -1; return; }
    enemy.angle = atan2(target.y - enemy.y, target.x - enemy.x);
    enemy.x += Math.cos(enemy.angle) * 450 * dt;
    enemy.y += Math.sin(enemy.angle) * 450 * dt;
    if (Math.cos(enemy.angle)) enemy.facing = Math.cos(enemy.angle) < 0 ? -1 : 1;
    if (dist(enemy.x, enemy.y, target.x, target.y) < 28) smash(enemy, target);
  });

  effects = effects.filter(e => (e.age += dt * 60) < e.life);
  if (remaining <= 0) {
    winnerPlace = 1 + enemies.filter(enemy => enemy.score > player.score).length;
    gameState = "ended";
    stopMusic();
  }
}

function drawPumpkin(q) {
  push(); translate(q.x, q.y); scale(q.scale);
  if (q.jack && q.age >= REVEAL_FRAMES + 25 && jackImage && jackImage.width) image(jackImage, 0, 0, 48, 48);
  else if (q.jack && q.age >= REVEAL_FRAMES && revealImage && revealImage.width) image(revealImage, 0, 0, 48, 48);
  else if (pumpkinImage && pumpkinImage.width) image(pumpkinImage, 0, 0, 48, 48);
  else {
    noStroke(); fill("#f58220"); ellipse(0, 0, 42, 38); fill("#234d12"); rect(-3, -24, 6, 9);
    if (q.jack && q.age >= REVEAL_FRAMES) {
      fill("#251709"); triangle(-12, -3, -3, -9, -4, 1); triangle(4, -9, 13, -3, 4, 1); triangle(-8, 8, 0, 15, 8, 8);
    }
  }
  pop();
}

function drawSkeleton(actor) {
  push(); translate(actor.x, actor.y); scale(actor.facing, 1);
  const img = actor.enemy && actor.imageIndex === 2 ? enemySkeletonImage : skeletonImage;
  if (img && img.width) image(img, 0, 0, 42, 54);
  else {
    noStroke(); fill("#f4f4e9"); ellipse(0, -13, 18, 18); rect(-8, -4, 16, 21, 2);
    stroke("#d8d8d0"); strokeWeight(4); line(-4, 13, -8, 25); line(4, 13, 8, 25); line(-7, 1, -16, 8); line(7, 1, 16, 8);
    noStroke(); fill("#1a210f"); ellipse(-3, -14, 3, 4); ellipse(3, -14, 3, 4);
  }
  pop();
}

function drawEffect(e) {
  push();
  if (e.jack && score500Image && score500Image.width) image(score500Image, e.x, e.y - e.age, 42, 28);
  else if (!e.jack && score100Image && score100Image.width) image(score100Image, e.x, e.y - e.age, 42, 28);
  else { noStroke(); fill(e.jack ? "#ffa500" : "#ffffff"); textAlign(CENTER, CENTER); textSize(25); text(e.points, e.x, e.y - e.age); }
  pop();
}

function drawHUD() {
  noStroke(); fill("#123904"); rect(0, 0, width, Math.max(42, height * 0.09)); fill("#ffffff");
  textSize(Math.max(11, width * 0.025)); textAlign(LEFT, CENTER);
  text("Your Score: " + player.score, 12, 16); text("Your Smashed: " + player.smashed, 12, 34);
  textAlign(CENTER, CENTER); text(floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0"), width / 2, 18);
  textAlign(RIGHT, CENTER); text("Enemy Score: " + Math.max(0, ...enemies.map(e => e.score)), width - 12, 18);
}

function drawOverlay(title, subtitle, hint) {
  push(); noStroke(); fill(0, 0, 0, 190); rect(0, 0, width, height);
  textAlign(CENTER, CENTER); fill("#ffa500"); textStyle(BOLD); textSize(width * 0.075); text(title, width / 2, height * 0.36);
  fill("#ffffff"); textStyle(NORMAL); textSize(width * 0.035); text(subtitle, width / 2, height * 0.47);
  fill("#ffa500"); textSize(width * 0.03); text(hint, width / 2, height * 0.65);
  pop();
}

function keyPressed() {
  if (key === "b" || key === "B") debugMode = !debugMode;
  if (gameState === "title" && (keyCode === ENTER || key === " ")) resetRound();
  else if (gameState === "ended" && (key === "u" || key === "U")) resultPage = (resultPage + 1) % 2;
  else if (gameState === "ended" && (key === "p" || key === "P" || key === " " || keyCode === ENTER)) resetRound();
  if (key === "f" || key === "F") window.open("https://pumpkin-smasher-2.dragonfiregames.repl.co", "_blank");
  return false;
}
