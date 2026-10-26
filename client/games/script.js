/* Shared arcade-game host. Game modules export createGame(p). */
(async function () {
  const gameId = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] || "pumpkin-smasher");
  const moduleUrl = "/client/games/code/" + encodeURIComponent(gameId) + ".js";
  let gameModule;

  try {
    gameModule = await import(moduleUrl);
  } catch (error) {
    console.error("Unable to load arcade game:", gameId, error);
    document.body.textContent = "Unable to load game: " + gameId;
    return;
  }

  const game = gameModule.createGame();
  new p5((p) => {
    let canvas;

    p.setup = function () {
      const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
      canvas = p.createCanvas(side, side);
      canvas.elt.setAttribute("aria-label", game.title || gameId);
      p.pixelDensity(1);
      game.setup?.(p);
    };

    p.draw = function () {
      game.draw?.(p);
    };

    p.keyPressed = function () {
      if (game.keyPressed) game.keyPressed(p);
    };

    p.keyReleased = function () {
      if (game.keyReleased) game.keyReleased(p);
    };

    p.mousePressed = function () {
      if (game.mousePressed) game.mousePressed(p);
    };

    p.windowResized = function () {
      const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
      p.resizeCanvas(side, side);
      game.resized?.(p);
    };
  });
})();
