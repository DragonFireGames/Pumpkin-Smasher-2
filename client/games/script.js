/* Shared p5.js global-mode host.
   The server injects the selected game's classic script after p5.js loads. */

/*
 * Code.org Sprite Lab compatibility helpers for games ported away from p5play.
 * Keep this small and explicit: game scripts retain their own update logic;
 * these helpers cover sprite bounds, groups, animation selection and drawing.
 */
window.CodeOrgCompat = (() => {
  class SpriteGroup extends Array {
    add(sprite) {
      if (!this.includes(sprite)) this.push(sprite);
      return sprite;
    }

    remove(sprite) {
      const index = this.indexOf(sprite);
      if (index !== -1) this.splice(index, 1);
    }

    overlap(other, callback) {
      let collided = false;
      const targets = other instanceof SpriteGroup ? other : [other];
      for (const sprite of this.slice()) {
        for (const target of targets) {
          if (!target || target === sprite || !overlap(sprite, target)) continue;
          collided = true;
          if (callback) callback(sprite, target);
        }
      }
      return collided;
    }
  }

  function dimensions(sprite) {
    const scale = sprite.scale === undefined ? 1 : sprite.scale;
    return {
      width: Math.abs((sprite.width || 46) * scale),
      height: Math.abs((sprite.height || 46) * scale)
    };
  }

  // Sprite Lab's default overlap is axis-aligned sprite-bound overlap.
  function overlap(a, b) {
    const ad = dimensions(a);
    const bd = dimensions(b);
    return Math.abs(a.x - b.x) * 2 < ad.width + bd.width &&
      Math.abs(a.y - b.y) * 2 < ad.height + bd.height;
  }

  function drawImageSprite(sprite, image, options = {}) {
    if (!sprite || sprite.visible === false || !image || !image.width || !image.height) return;
    const size = dimensions(sprite);
    const width = options.width === undefined ? image.width * size.height / image.height : options.width * (sprite.scale ?? 1);
    const height = options.height === undefined ? size.height : options.height * (sprite.scale ?? 1);
    push();
    translate(sprite.x, sprite.y);
    scale(sprite.mirrorX === -1 || sprite.facing === -1 ? -1 : 1, 1);
    if (sprite.rotation) rotate(sprite.rotation);
    imageMode(CENTER);
    image(image, 0, 0, width, height);
    pop();
  }

  return { SpriteGroup, overlap, drawImageSprite };
})();
