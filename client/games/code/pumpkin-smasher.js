/* Pumpkin Smasher 1: Code.org Sprite Lab port for the Pumpkin Smasher 2 arcade. */
export function createGame() {
  const WORLD_W = 1200;
  const WORLD_H = 800;
  const GAME_SECONDS = 121;
  const REVEAL_FRAMES = 180;
  const PLAYER_SPEED = 300;
  const ENEMY_SPEED = 450;
  const PUMPKIN_COUNT = 180;
  const ENEMY_COUNT = 5;

  let pumpkinImage;
  let skeletonImage;
  let music = [];
  let musicIndex = -1;
  let musicStarted = false;
  let player;
  let enemies = [];
  let pumpkins = [];
  let effects = [];
  let state = "title";
  let elapsed = 0;
  let remaining = GAME_SECONDS;
  let spawnClock = 0;
  let totalSpawned = 0;
  let lastFrame = 0;
  let winnerPlace = 0;

  function resetRound(p) {
    player = makeSkeleton(0, 0, false);
    enemies = [];
    pumpkins = [];
    effects = [];
    elapsed = 0;
    remaining = GAME_SECONDS;
    spawnClock = 0;
    totalSpawned = 0;
    winnerPlace = 0;
    for (let i = 0; i < ENEMY_COUNT; i++) {
      enemies.push(makeSkeleton(p.random(-45, 45), p.random(-45, 45), true));
    }
    for (let i = 0; i < 30; i++) spawnPumpkin(p);
    state = "playing";
    startMusic();
  }

  function makeSkeleton(x, y, enemy) {
    return { x, y, score: 0, smashed: 0, enemy, target: null, face: 1 };
  }

  function spawnPumpkin(p) {
    if (totalSpawned >= PUMPKIN_COUNT) return;
    pumpkins.push({
      x: p.random(-WORLD_W / 2 + 45, WORLD_W / 2 - 45),
      y: p.random(-WORLD_H / 2 + 45, WORLD_H / 2 - 45),
      jack: p.random() < 0.2,
      age: 0,
      scale: 0.1,
      target: null
    });
    totalSpawned++;
  }

  function startMusic() {
    if (musicStarted || !music.length) return;
    musicStarted = true;
    playNextTrack();
  }

  function playNextTrack() {
    if (!music.length || !musicStarted) return;
    musicIndex = (musicIndex + 1) % music.length;
    const track = music[musicIndex];
    track.onended = playNextTrack;
    track.play().catch(() => {});
  }

  function stopMusic() {
    musicStarted = false;
    music.forEach(track => {
      track.pause();
      track.currentTime = 0;
    });
  }

  function smash(skeleton, pumpkin) {
    const points = pumpkin.jack ? 500 : 100;
    skeleton.score += points;
    skeleton.smashed++;
    effects.push({ x: pumpkin.x, y: pumpkin.y, text: "+" + points, age: 0, life: 0.8, color: pumpkin.jack ? "#ffa500" : "#ffffff" });
    pumpkins.splice(pumpkins.indexOf(pumpkin), 1);
    enemies.forEach(enemy => {
      if (enemy.target === pumpkin) enemy.target = null;
    });
  }

  function moveToward(actor, target, speed, dt) {
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;
    const step = Math.min(dist, speed * dt);
    actor.x += dx / dist * step;
    actor.y += dy / dist * step;
    if (dx !== 0) actor.face = dx < 0 ? -1 : 1;
  }

  function updateGame(p, dt) {
    elapsed += dt;
    remaining = Math.max(0, GAME_SECONDS - Math.floor(elapsed));
    spawnClock += dt;
    if (spawnClock >= 2 && totalSpawned < PUMPKIN_COUNT) {
      spawnClock = 0;
      for (let i = 0; i < 4 && totalSpawned < PUMPKIN_COUNT; i++) spawnPumpkin(p);
    }
    pumpkins.forEach(pumpkin => {
      pumpkin.age += dt * 60;
      pumpkin.scale = Math.min(1, pumpkin.scale + dt * 0.6);
    });

    const down = p.keyIsDown;
    const dx = (down(p.RIGHT_ARROW) || down(68) ? 1 : 0) - (down(p.LEFT_ARROW) || down(65) ? 1 : 0);
    const dy = (down(p.DOWN_ARROW) || down(83) ? 1 : 0) - (down(p.UP_ARROW) || down(87) ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;
    player.x = p.constrain(player.x + dx / length * PLAYER_SPEED * dt, -WORLD_W / 2 + 20, WORLD_W / 2 - 20);
    player.y = p.constrain(player.y + dy / length * PLAYER_SPEED * dt, -WORLD_H / 2 + 20, WORLD_H / 2 - 20);
    if (dx) player.face = dx < 0 ? -1 : 1;

    if (down(32)) {
      for (const pumpkin of [...pumpkins]) {
        if (Math.hypot(pumpkin.x - player.x, pumpkin.y - player.y) < 55) smash(player, pumpkin);
      }
    }

    enemies.forEach(enemy => {
      if (!pumpkins.length) return;
      if (!enemy.target || !pumpkins.includes(enemy.target)) {
        enemy.target = pumpkins.reduce((best, pumpkin) =>
          !best || Math.hypot(pumpkin.x - enemy.x, pumpkin.y - enemy.y) < Math.hypot(best.x - enemy.x, best.y - enemy.y) ? pumpkin : best, null);
      }
      if (enemy.target) {
        moveToward(enemy, enemy.target, ENEMY_SPEED, dt);
        if (Math.hypot(enemy.x - enemy.target.x, enemy.y - enemy.target.y) < 28) smash(enemy, enemy.target);
      }
    });

    effects = effects.filter(effect => {
      effect.age += dt;
      return effect.age < effect.life;
    });
    if (remaining <= 0) {
      winnerPlace = 1 + enemies.filter(enemy => enemy.score > player.score).length;
      state = "ended";
      stopMusic();
    }
  }

  function drawPumpkin(p, pumpkin) {
    p.push();
    p.translate(pumpkin.x, pumpkin.y);
    p.scale(pumpkin.scale);
    if (pumpkinImage && pumpkinImage.width) {
      p.imageMode(p.CENTER);
      p.image(pumpkinImage, 0, 0, 48, 48);
    } else {
      p.noStroke();
      p.fill("#f58220");
      p.ellipse(0, 0, 42, 38);
      p.fill("#234d12");
      p.rect(-3, -24, 6, 9);
      if (pumpkin.jack && pumpkin.age > REVEAL_FRAMES) {
        p.fill("#251709");
        p.triangle(-12, -3, -3, -9, -4, 1);
        p.triangle(4, -9, 13, -3, 4, 1);
        p.triangle(-8, 8, 0, 15, 8, 8);
      }
    }
    p.pop();
  }

  function drawSkeleton(p, actor) {
    p.push();
    p.translate(actor.x, actor.y);
    p.scale(actor.face, 1);
    if (skeletonImage && skeletonImage.width) {
      p.imageMode(p.CENTER);
      p.image(skeletonImage, 0, 0, 42, 54);
    } else {
      p.noStroke();
      p.fill("#f4f4e9");
      p.ellipse(0, -13, 18, 18);
      p.rect(-8, -4, 16, 21, 2);
      p.stroke("#d8d8d0");
      p.strokeWeight(4);
      p.line(-4, 13, -8, 25);
      p.line(4, 13, 8, 25);
      p.line(-7, 1, -16, 8);
      p.line(7, 1, 16, 8);
      p.noStroke();
      p.fill("#1a210f");
      p.ellipse(-3, -14, 3, 4);
      p.ellipse(3, -14, 3, 4);
    }
    p.pop();
  }

  function drawHUD(p) {
    p.push();
    p.noStroke();
    p.fill("#123904");
    p.rect(0, 0, p.width, Math.max(42, p.height * 0.09));
    p.fill("#ffffff");
    p.textSize(Math.max(11, p.width * 0.025));
    p.textAlign(p.LEFT, p.CENTER);
    p.text("Your Score: " + player.score, 12, 16);
    p.text("Smashed: " + player.smashed, 12, 34);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0"), p.width / 2, 18);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text("Best enemy: " + Math.max(0, ...enemies.map(enemy => enemy.score)), p.width - 12, 18);
    p.pop();
  }

  function drawOverlay(p, title, subtitle, hint) {
    p.push();
    p.fill(0, 0, 0, 190);
    p.rect(0, 0, p.width, p.height);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.fill("#ffa500");
    p.textStyle(p.BOLD);
    p.textSize(p.width * 0.075);
    p.text(title, p.width / 2, p.height * 0.36);
    p.fill("#ffffff");
    p.textStyle(p.NORMAL);
    p.textSize(p.width * 0.035);
    p.text(subtitle, p.width / 2, p.height * 0.47, p.width * 0.84, p.height * 0.16);
    p.fill("#ffa500");
    p.textSize(p.width * 0.03);
    p.text(hint, p.width / 2, p.height * 0.65, p.width * 0.85, p.height * 0.12);
    p.pop();
  }

  return {
    title: "Pumpkin Smasher",
    setup(p) {
      p.frameRate(60);
      pumpkinImage = p.loadImage("/assets/pumpkins/pumpkin.png", () => {}, () => { pumpkinImage = null; });
      skeletonImage = p.loadImage("/assets/skeleton/1.png", () => {}, () => { skeletonImage = null; });
      music = ["background.mp3", "background1.mp3", "background2.mp3"].map(name => {
        const track = new Audio("/assets/music/" + name);
        track.volume = 0.22;
        return track;
      });
      player = makeSkeleton(0, 0, false);
    },
    draw(p) {
      const now = p.millis();
      const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000));
      lastFrame = now;
      p.background("#123904");
      if (state === "title") {
        drawOverlay(p, "PUMPKIN SMASHER", "Smash pumpkins before the enemies beat your score.", "Press ENTER or SPACE to start");
      } else if (state === "playing") {
        updateGame(p, dt);
        const scale = Math.min(p.width / WORLD_W, p.height / WORLD_H);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(scale);
        p.translate(-player.x, -player.y);
        p.noFill();
        p.stroke("#050805");
        p.strokeWeight(20);
        p.rectMode(p.CENTER);
        p.rect(0, 0, WORLD_W, WORLD_H);
        p.rectMode(p.CORNER);
        pumpkins.forEach(pumpkin => drawPumpkin(p, pumpkin));
        enemies.forEach(enemy => drawSkeleton(p, enemy));
        drawSkeleton(p, player);
        effects.forEach(effect => {
          p.noStroke();
          p.fill(effect.color);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(25);
          p.text(effect.text, effect.x, effect.y - effect.age * 35);
        });
        p.pop();
        drawHUD(p);
        p.push();
        p.fill("#ffffff");
        p.noStroke();
        p.textAlign(p.CENTER, p.BOTTOM);
        p.textSize(Math.max(10, p.width * 0.022));
        p.text("Move: WASD / Arrows     Smash: SPACE", p.width / 2, p.height - 8);
        p.pop();
      } else if (state === "ended") {
        const scale = Math.min(p.width / WORLD_W, p.height / WORLD_H);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(scale);
        p.translate(-player.x, -player.y);
        p.rectMode(p.CENTER);
        p.noFill();
        p.stroke("#050805");
        p.strokeWeight(20);
        p.rect(0, 0, WORLD_W, WORLD_H);
        p.rectMode(p.CORNER);
        pumpkins.forEach(pumpkin => drawPumpkin(p, pumpkin));
        enemies.forEach(enemy => drawSkeleton(p, enemy));
        drawSkeleton(p, player);
        p.pop();
        drawHUD(p);
        const title = winnerPlace === 1 ? "YOU WON!" : winnerPlace === 2 ? "2ND PLACE!" : winnerPlace === 3 ? "3RD PLACE!" : "YOU LOST";
        drawOverlay(p, title, "Score: " + player.score + "   •   Pumpkins smashed: " + player.smashed, "Press P, ENTER, or SPACE to play again");
      }
    },
    keyPressed(p) {
      if (state === "title" && (p.keyCode === p.ENTER || p.key === " ")) resetRound(p);
      else if (state === "ended" && (["p", "P", " "].includes(p.key) || p.keyCode === p.ENTER)) resetRound(p);
    }
  };
}
