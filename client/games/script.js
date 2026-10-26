/* Shared arcade-game host. The server injects the selected module into the HTML. */
(function () {
  function startGame() {
    const game = window.__arcadeGame;
    if (!game || typeof game !== "object") {
      document.body.textContent = "Unable to initialize arcade game.";
      return;
    }

    new p5((p) => {
      let canvas;

      p.setup = function () {
        const side = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight)));
        canvas = p.createCanvas(side, side);
        canvas.elt.setAttribute("aria-label", game.title || "Arcade game");
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
  }

  if (window.__arcadeGame) startGame();
  else window.addEventListener("arcade-game-ready", startGame, { once: true });
})();
