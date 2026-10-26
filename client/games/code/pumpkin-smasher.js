/* Pumpkin Smasher 1 — faithful p5.js port of the original Code.org game.
   Global-mode script; this game runs in its own iframe. */

const sizeX = 600;
const sizeY = 400;
const ecount = 5;
const pcount = 30;
const desired = pcount * (ecount + 1);
const revealtime = 180;

let started = false;
let ended = false;
let debug = false;
let minutes = 2;
let seconds = 1;
let countdown = 0;
let songlength = 0;
let displays = 0;
let win = 0;
let amount = 0;
let jackchance = 0;
let player;
let displaypumpkin;
let pumpkins = [];
let jacks = [];
let growing_pumpkins = [];
let enemies = [];
let effects = [];
let images = {};
let music = [];
let currentMusic = null;
let lastSecond = 0;
let audioUnlocked = false;
const heldKeys = new Set();

function preload() {
  // These are the matching assets that actually exist in this repository.
  images.pumpkin = loadImage("/assets/pumpkins/pumpkin.png");
  images.growingPumpkin = loadImage("/assets/pumpkins/new_pumpkin.png");
  images.jackLantern = loadImage("/assets/misc/jack_o_lantern.png");
  images.reveal = loadImage("/assets/misc/reveal.png");
  images.skeleton = loadImage("/assets/skeleton/1.png");
  images.enemy1 = loadImage("/assets/skeleton/1.png");
  images.enemy2 = loadImage("/assets/skeleton/2.png");
  images.axe = loadImage("/assets/skeleton/axe.png");
  images.score100 = loadImage("/assets/misc/100_score.png");
  images.score500 = loadImage("/assets/misc/500_score.png");
  images.smash = loadImage("/assets/pumpkins/gut_splat.png");
}

function setup() {
  // The original game shows a 400×400 camera window into a 1200×800 world.
  // CSS/iframe resizing scales that same window; it never reveals more world.
  createCanvas(400, 400);
  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  textFont("Arial");
  player = makeActor(0, 0, false);
  player.width = images.skeleton && images.skeleton.width && images.skeleton.height
    ? images.skeleton.width * 46 / images.skeleton.height : 46;
  player.visible = false;
  displaypumpkin = { x: 0, y: -100, visible: false, scale: 3, animation: "pumpkin" };
  music = [
    { file: "/assets/music/background.mp3", length: 94 },
    { file: "/assets/music/background1.mp3", length: 81 },
    { file: "/assets/music/background2.mp3", length: 136 }
  ].map(track => {
    const audio = new Audio(track.file);
    audio.volume = 0.22;
    return { ...track, audio };
  });
  window.addEventListener("resize", resizeCanvasToContainer);
  // The arcade can be embedded in an iframe that does not retain canvas focus.
  // Listen at window level so keyboard controls still work after clicking the game.
  window.addEventListener("keydown", handleGameKeyDown);
  window.addEventListener("keyup", event => heldKeys.delete(event.code));
  window.addEventListener("blur", () => heldKeys.clear());
  resizeCanvasToContainer();
}

function resizeCanvasToContainer() {
  const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
  // Keep p5's world-coordinate system 400 units square and scale the canvas
  // visually. The visible world span does not change with the iframe size.
  const canvas = document.querySelector("canvas");
  if (canvas) {
    canvas.style.width = side + "px";
    canvas.style.height = side + "px";
  }
}

function makeActor(x, y, isEnemy) {
  return {
    x, y, width: 46, height: 46, enemy: isEnemy, visible: true, depth: 1, score: 0, smashed: 0,
    attracted: false, target: -1, rotate: 0, facing: 1, swing: 0, swingTime: 0,
    animation: isEnemy ? (randomNumber(1, 2) === 1 ? "enemy1" : "enemy2") : "skeleton"
  };
}

function randomNumber(min, max) {
  return Math.floor(random(min, max + 1));
}

function start() {
  enemies = [];
  pumpkins = [];
  jacks = [];
  growing_pumpkins = [];
  effects = [];
  amount = 0;
  countdown = 0;
  songlength = 0;
  player.visible = true;
  for (let i = 0; i < ecount; i++) {
    const enemy = makeActor(randomNumber(-3, 3) * 15, randomNumber(-3, 3) * 15, true);
    const enemyImage = enemy.animation === "enemy2" ? images.enemy2 : images.enemy1;
    enemy.width = enemyImage && enemyImage.width && enemyImage.height
      ? enemyImage.width * 46 / enemyImage.height : 46;
    enemy.score = 0;
    enemy.smashed = 0;
    enemy.attracted = false;
    enemies.push(enemy);
  }
  started = true;
  ended = false;
  timerTick();
}

function resetGame() {
  stopMusic();
  minutes = 2;
  seconds = 1;
  displaypumpkin.visible = false;
  ended = false;
  started = false;
  countdown = 0;
  songlength = 0;
  displays = 0;
  win = 0;
  amount = 0;
  pumpkins = [];
  jacks = [];
  growing_pumpkins = [];
  enemies = [];
  effects = [];
  player.score = 0;
  player.smashed = 0;
  player.x = 0;
  player.y = 0;
  player.visible = false;
}

function timerTick() {
  if (seconds <= 0 && minutes <= 0) {
    win = 0;
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].score > player.score) win++;
    }
    started = false;
    ended = true;
    player.visible = false;
    enemies.forEach(enemy => enemy.visible = false);
    pumpkins.forEach(pumpkin => pumpkin.visible = false);
    stopMusic();
    return;
  }
  if (started && !ended) {
    seconds--;
    countdown--;
    songlength--;
    if (countdown < 0) {
      spawnPumpkin();
      countdown = randomNumber(1, 10);
    }
    if (seconds < 0) {
      minutes--;
      seconds = 59;
    }
    if (songlength < 0) {
      const index = randomNumber(1, 3) - 1;
      playTrack(index);
      songlength = music[index].length;
    }
    window.setTimeout(timerTick, 1000);
  }
}

function playTrack(index) {
  stopMusic();
  currentMusic = music[index];
  const audio = currentMusic.audio;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function stopMusic() {
  music.forEach(track => {
    track.audio.pause();
    track.audio.currentTime = 0;
  });
  currentMusic = null;
}

function spawnPumpkin() {
  // Original behavior replenishes the live pumpkin count after each smash.
  // It does not cap the total ever spawned at 180.
  for (let i = 0; i < desired - amount; i++) {
    const pumpkin = {
      x: randomNumber(-sizeX / 50, sizeX / 50) * 50,
      y: randomNumber(-sizeY / 50, sizeY / 50) * 50,
      width: 46, height: 46,
      jack: randomNumber(1, 5) === 1,
      time: 0,
      scale: 0.1,
      depth: 0,
      target: -1,
      visible: true,
      animation: "growing_pumpkin",
      smashFrame: 0
    };
    pumpkins.push(pumpkin);
    if (pumpkin.jack) jacks.push(pumpkin);
    growing_pumpkins.push(pumpkin);
    amount++;
  }
}

function draw() {
  background(18, 57, 4);

  if (!started && !ended) {
    drawTitleScreen();
    return;
  }

  if (ended) {
    drawEndScreen();
    return;
  }

  updateActors();
  // Camera viewport is exactly 400×400 world units, centered on the player.
  push();
  translate(width / 2 - player.x, height / 2 - player.y);
  drawWorldBoundary();
  pumpkins.forEach(drawPumpkin);
  effects.forEach(drawEffect);
  enemies.forEach(drawSkeleton);
  drawSkeleton(player);
  if (debug) drawDebug();
  pop();

  drawHUD();
}

function drawTitleScreen() {
  textAlign(CENTER, CENTER);
  stroke("orange");
  strokeWeight(10);
  fill("black");
  textSize(40);
  text("Pumpkin Smasher", 200, 100);
  noStroke();
  fill("black");
  rect(162.5, 200, 75, 50);
  fill("white");
  textSize(20);
  text("Start", 200, 225);
  textSize(12);
}

function drawHUD() {
  // The HUD is camera-fixed, so it is drawn after the world transform is restored.
  textAlign(CENTER, CENTER);
  noStroke();
  fill("white");
  textSize(20);
  text(nf(minutes, 2) + ":" + nf(Math.max(0, seconds), 2), 200, 25);

  textAlign(LEFT, CENTER);
  textSize(15);
  text("Score: " + player.score, 15, 25);
  textAlign(RIGHT, CENTER);
  text("Smashed: " + player.smashed, 385, 25);

  textAlign(LEFT, CENTER);
  for (let i = 0; i < enemies.length; i++) {
    text("Enemy " + (i + 1) + ": " + enemies[i].score, 15, 40 + i * 15);
    textAlign(RIGHT, CENTER);
    text("Smashed: " + enemies[i].smashed, 385, 40 + i * 15);
    textAlign(LEFT, CENTER);
  }
}

function drawDebug() {
  noFill();
  stroke("red");
  strokeWeight(1);
  for (const sprite of [...pumpkins, ...enemies, player]) {
    const width = (sprite.width || 46) * (sprite.scale || 1);
    const height = (sprite.height || 46) * (sprite.scale || 1);
    rectMode(CENTER);
    rect(sprite.x, sprite.y, width, height);
  }
  rectMode(CORNER);
}

function drawEndScreen() {
  displaypumpkin.visible = true;
  displaypumpkin.animation = win === 0 ? "pumpkin" : win >= 3 ? "jack_o_lantern" : "reveal";
  const resultImage = displaypumpkin.animation === "pumpkin" ? images.pumpkin :
    displaypumpkin.animation === "jack_o_lantern" ? images.jackLantern : images.reveal;
  CodeOrgCompat.drawImageSprite(displaypumpkin, resultImage);

  textAlign(CENTER, CENTER);
  stroke("orange");
  strokeWeight(10);
  fill("white");
  textSize(40);
  if (win === 0) text("You Won!", 200, 100);
  if (win === 1) text("2nd Place!!", 200, 100);
  if (win === 2) text("3rd Place!!", 200, 100);
  if (win >= 3) text("You Lost", 200, 100);
  noStroke();
  fill("white");
  textSize(15);
  text("Press “U“ to Scroll", 200, 350);
  text("Press “P“ to Play Again", 200, 370);
}

function updateActors() {
  for (const pumpkin of growing_pumpkins.slice()) {
    pumpkin.scale += random(0, 0.025);
    if (pumpkin.scale >= 1) {
      pumpkin.scale = 1;
      pumpkin.animation = "pumpkin";
      growing_pumpkins.splice(growing_pumpkins.indexOf(pumpkin), 1);
    }
  }
  for (const pumpkin of jacks) {
    pumpkin.time++;
    if (pumpkin.time === revealtime) pumpkin.animation = "reveal";
    if (pumpkin.time === revealtime + 25) pumpkin.animation = "jack_o_lantern";
  }

  playercontrol();
  enemies.forEach((enemy, i) => enemymove(enemy, i));
  if (player.swingTime > 0) { player.swingTime--; player.swing = Math.sin((1 - player.swingTime / 12) * Math.PI) * 1.25; } else player.swing = 0;\n  effects = effects.filter(effect => {
    effect.frame++;
    return --effect.lifetime > 0;
  });
}

function playercontrol() {
  const up = heldKeys.has("ArrowUp") || heldKeys.has("KeyW") || keyIsDown(UP_ARROW) || keyIsDown(87);
  const down = heldKeys.has("ArrowDown") || heldKeys.has("KeyS") || keyIsDown(DOWN_ARROW) || keyIsDown(83);
  const left = heldKeys.has("ArrowLeft") || heldKeys.has("KeyA") || keyIsDown(LEFT_ARROW) || keyIsDown(65);
  const right = heldKeys.has("ArrowRight") || heldKeys.has("KeyD") || keyIsDown(RIGHT_ARROW) || keyIsDown(68);
  if (up) player.y = Math.max(-sizeY, player.y - 5);
  if (down) player.y = Math.min(sizeY, player.y + 5);
  if (left) { player.x = Math.max(-sizeX, player.x - 5); player.facing = -1; }
  if (right) { player.x = Math.min(sizeX, player.x + 5); player.facing = 1; }
  if (heldKeys.has("Space") || keyIsDown(32)) detect(player);
}

function enemymove(enemy, i) {
  if (enemy.rotate > 90) enemy.facing = -1;
  if (enemy.rotate < 90) enemy.facing = 1;
  if (!enemy.attracted) {
    if (enemy.lvl = 1) {
      if (pumpkins.length) {
        const target = pumpkins[randomNumber(0, pumpkins.length - 1)];
        enemy.rotate = pointAt(target.x, target.y, enemy);
        target.target = i;
        enemy.target = target;
        enemy.attracted = true;
      }
    }
  }
  // Code.org's sin/cos use degrees; p5's do too.
  enemy.y += sin(enemy.rotate) * 7.5;
  enemy.x += cos(enemy.rotate) * 7.5;
  detect(enemy);
}

function pointAt(x, y, object) {
  const yDelta = y - object.y;
  const xDelta = x - object.x;
  if (!Number.isNaN(xDelta) && !Number.isNaN(yDelta) && (xDelta !== 0 || yDelta !== 0)) {
    return degrees(Math.atan2(yDelta, xDelta));
  }
  return 0;
}

function detect(actor) {
  for (const pumpkin of pumpkins.slice()) {
    if (CodeOrgCompat.overlap(actor, pumpkin)) {
      // Player's original smash action is key-triggered; enemies smash on contact.
      if (actor === player && !heldKeys.has("Space") && !keyIsDown(32)) continue;
      pumpkinhit(pumpkin, actor);
      if (actor.enemy) actor.attracted = false;
    }
  }
}

function pumpkinhit(pumpkin, actor) {
  const jack = jacks.includes(pumpkin);
  const points = jack ? 500 : 100;
  actor.score += points;
  actor.smashed++;
  effects.push({ x: pumpkin.x, y: pumpkin.y, points, jack, lifetime: 20, frame: 0, type: "score" });
  effects.push({ x: pumpkin.x, y: pumpkin.y, lifetime: 15, frame: 0, type: "smash" });
  if (pumpkin.target !== -1 && enemies[pumpkin.target]) enemies[pumpkin.target].attracted = false;
  amount--;
  pumpkins.splice(pumpkins.indexOf(pumpkin), 1);
  const jackIndex = jacks.indexOf(pumpkin);
  if (jackIndex !== -1) jacks.splice(jackIndex, 1);
  const growingIndex = growing_pumpkins.indexOf(pumpkin);
  if (growingIndex !== -1) growing_pumpkins.splice(growingIndex, 1);
}

function drawWorldBoundary() {
  noFill();
  strokeWeight(20);
  stroke("black");
  rectMode(CENTER);
  rect(0, 0, sizeX * 2 + 60, sizeY * 2 + 60);
  rectMode(CORNER);
}

function drawPumpkin(pumpkin) {
  if (!pumpkin.visible) return;
  let img = images.pumpkin;
  if (pumpkin.animation === "growing_pumpkin") img = images.growingPumpkin;
  else if (pumpkin.animation === "reveal") {
    // reveal.png is a four-frame horizontal spritesheet. Advance through its
    // frames at 12 fps rather than scaling the entire sheet (which looks like flashing).
    const sheet = images.reveal;
    if (sheet && sheet.width && sheet.height) {
      const frameWidth = sheet.width / 4;
      const frame = Math.min(3, Math.floor((pumpkin.time - revealtime) / 5));
      const h = 46;
      const w = frameWidth * h / sheet.height;
      image(sheet, pumpkin.x, pumpkin.y, w, h, frame * frameWidth, 0, frameWidth, sheet.height);
    }
    return;
  }
  else if (pumpkin.animation === "jack_o_lantern") img = images.jackLantern;
  CodeOrgCompat.drawImageSprite(pumpkin, img, { height: 46 });
}

function drawSkeleton(actor) {
  if (!actor.visible) return;
  const img = actor.animation === "enemy2" ? images.enemy2 : actor.enemy ? images.enemy1 : images.skeleton;
  if (!img || !img.width || !img.height) return;

  const spriteWidth = img.width * (46 / img.height);
  const axeHeight = 46.5;
  const axeWidth = images.axe && images.axe.width && images.axe.height
    ? images.axe.width * axeHeight / images.axe.height : 0;

  push();
  translate(actor.x, actor.y);
  scale(actor.facing, 1);
  if (images.axe && images.axe.width && images.axe.height) {
    push();
    translate((spriteWidth - axeWidth) / 2, 0);
    rotate(actor.swing || 0);
    image(images.axe, 0, 0, axeWidth, axeHeight);
    pop();
  }
  // Shared Sprite Lab helper handles sprite centering, scale and mirroring.
  CodeOrgCompat.drawImageSprite({ ...actor, x: 0, y: 0, facing: 1 }, img, { height: 46 });
  pop();
}

function drawEffect(effect) {
  if (effect.type === "smash") {
    const sheet = images.smash;
    if (sheet && sheet.width && sheet.height) {
      const frameWidth = sheet.width / 5;
      const frame = Math.min(4, Math.floor(effect.frame / 3));
      // The original gut_splat sprite sheet has five horizontal animation frames.
      image(sheet, effect.x, effect.y, 46, 46, frame * frameWidth, 0, frameWidth, sheet.height);
    }
    return;
  }

  const img = effect.jack ? images.score500 : images.score100;
  if (img && img.width && img.height) {
    const rise = 20 - effect.lifetime;
    const scoreHeight = 14;
    image(img, effect.x, effect.y - rise, img.width * (scoreHeight / img.height), scoreHeight);
  }
}


function handleGameKeyDown(event) {
  heldKeys.add(event.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  const pressedKey = event.key;
  if (event.code === "Space" && started && !ended && player) player.swingTime = 12;
  if (!started && !ended && (event.code === "Enter" || event.code === "Space")) {
    start();
    return;
  }
  if (ended && (pressedKey === "p" || pressedKey === "P" || event.code === "Space")) {
    resetGame();
    return;
  }
  if (ended && (pressedKey === "u" || pressedKey === "U")) {
    displays = (displays + 1) % 2;
    return;
  }
  if (pressedKey === "b" || pressedKey === "B") {
    debug = !debug;
    return;
  }
}

function keyPressed() {
  if (!started && !ended && (keyCode === ENTER || key === " ")) {
    start();
    return false;
  }
  if (ended && (key === "p" || key === "P" || key === " ")) {
    resetGame();
    return false;
  }
  if (ended && (key === "u" || key === "U")) {
    displays = (displays + 1) % 2;
    return false;
  }
  if (key === "b" || key === "B") {
    debug = !debug;
    return false;
  }
}

function mousePressed() {
  if (!started && !ended) {
    const x = mouseX;
    const y = mouseY;
    if (x >= 162.5 && x <= 237.5 && y >= 200 && y <= 250) start();
  }
}
