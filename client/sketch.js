/* 
  Client Code
  By DragonFire7z

  Textures
  By Insert Source Here

  Sounds
  By Insert Source Here

  Music
  By Insert Source Here

  Maps
  By DragonFire7z

  Dependendcies:
    p5.js
    p5.touchgui.js
    socket.io
    peerjs
*/


// TODO: 
// Better Animations and Graphics
// Mobile Support <---


// Connection
const socket = io();
socket.on("connect", () => {
  console.log("Joined server as Socket (" + socket.id + ")");
  if (room != "" && (display == "game" || display == "pmgame" || display == "lobby")) {
    socket.emit('rejoin', room, player.id, false);
  } else {
    changeUsername();
  }
});
socket.on("disconnect", async () => {
  console.log("Disconnected");
  for (var i = 0; i < 15; i++) {
    socket.connect();
    await wait(1000);
    if (socket.connected) return;
  }
  location.reload();
});
//^^Connects to the socket.io server

const isMobile = /*true;//*/ /Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent);

//
//const DISCORD_LINK = "https://discord.gg/NqnXXy8mNz";
var DiscordWidget = document.getElementById("discordWidget");

// HTML
var homeDis = {};
homeDis.div = document.getElementById("homeDis");
homeDis.username = document.getElementById("username");
var viewDis = {};
viewDis.div = document.getElementById("viewDis");
viewDis.roomCode = document.getElementById("roomCode");
viewDis.enter = document.getElementById("enterBtn");
var instructions = document.getElementById("instructions");
instructions.src = window.origin + "/instructions";

// Variable Setups
var amount = 0;
var windowScale;
var room = "";
var isNext = false;
var timeleft = 0;

const tickRate = 30;
const speed = 1 / tickRate;
setInterval(tick, speed * 1000);

var user = {};
if (localStorage.user != undefined) {
  user = JSON.parse(localStorage.user);
  homeDis.username.value = user.name;
}
var defaultUser = {};
defaultUser.lastSession = {};
defaultUser.name = "";
defaultUser.doneTutorial = false;
/*defaultUser.stats = {
  // Overall
  SkeletonWins: 0,
  SkeletonLosses: 0,
  PumpkinMasterWins: 0,
  PumpkinMasterLosses: 0,
  // Skeleton
  Smashed: 0,
  SmashedGold: 0,
  SmashedDiamond: 0,
  Upgraded: 0,
  Upgrade: {
    health: 0,
    axerange: 0,
    speed: 0
  }
  KilledMonsters: 0,
  Killed: {
    monster: 0,
    ghost: 0,
    speeder: 0,
    rusher: 0,
    wizard: 0,
    projectile: 0,
    brute: 0,
    catapult: 0,
    debuffer: 0,
  },
  Deaths: 0,
  ObjectivesDestroyed: 0,
  // Pumpkin Master
  KilledSkeletons: 0,
  KilledSkeletonsWith: {
    monster: 0,
    ghost: 0,
    nuke: 0,
    speeder: 0,
    rusher: 0,
    wizard: 0,
    brute: 0,
    catapult: 0,
    debuffer: 0,
  },
  SpawnedMonsters: 0,
  Spawned: {
    monster: 0,
    ghost: 0,
    nuke: 0,
    speeder: 0,
    rusher: 0,
    wizard: 0,
    brute: 0,
    catapult: 0,
    debuffer: 0,
  },
  UsedAbilities: 0,
  Used: {
    fog: 0,
    vines: 0,
    swarm: 0,
    shield: 0,
    generators: 0,
  }
}
user.achivements = {
  // Skeleton
  MaxedHealth: false,
  MaxedAxeRange: false,
  MaxedSpeed: false,
  Killed50EnemiesInMatch: false,
  Smashed200PumpkinsInMatch: false,
  Smashed10DiamondPumpkinsInMatch: false,
  NoDeaths: false,
  DestroyedObjective: false,
  DestroyedAllObjectives: false,
  DestroyedShield: false,
  // Pumpkin Master
  Killed10Skeletons: false,
  KilledSkeletonWithSwarm: false,
  Used10AbilitiesInMatch: false
}*/
for (var i in defaultUser) {
  if (!user[i]) user[i] = defaultUser[i];
}


// -------------
// Entity System
// -------------

var entities = [];
// IDs
EntityIDs = {};
EntityIDs[0] = "monster";
EntityIDs[1] = "ghost";
EntityIDs[2] = "nuke";
EntityIDs[3] = "speeder";
EntityIDs[4] = "rusher";
EntityIDs[5] = "wizard";
EntityIDs[6] = "brute";
EntityIDs[7] = "catapult";
EntityIDs[8] = "debuffer";
EntityIDs.length = Object.keys(EntityIDs).length;
// Display
EntityDisplay = {};
EntityDisplay.monster = (function() {
  var tex = {};
  //tex.reveal = new Animation("assets/entities/monster/reveal.png", 4, 12);
  //tex.hide = new Animation("assets/entities/monster/hide.png", 4, 12);
  tex.icon = new FitImage("assets/entities/monster/icon.png");
  tex.attack = new Animation("assets/entities/monster/attack.png", 8, 12);
  return {
    cost: 1,
    pumpkin: true,
    icon: function() {
      tex.icon.show(0, 40);
    },
    display: function(e) {
      tex[e.img].show(38, 0, e.f);
    }
  };
});
EntityDisplay.ghost = (function() {
  var tex = {};
  tex.icon = new FitImage("assets/entities/ghost/icon.png");
  tex.attack = new Animation("assets/entities/ghost/attack.png", 8, 12);
  return {
    cost: 3,
    pumpkin: true,
    icon: function() {
      tint(255, 255, 255, 128);
      tex.icon.show(0, 60);
      tint(255, 255, 255, 255);
    },
    display: function(e) {
      tint(255, 255, 255, 128);
      tex[e.img].show(28, 0, e.f);
      tint(255, 255, 255, 255);
    }
  };
});
EntityDisplay.nuke = (function() {
  var tex = {};
  tex.icon = new FitImage("assets/entities/nuke/icon.png");
  tex.target = new Animation("assets/entities/nuke/target.png", 12, 12);
  return {
    cost: 3,
    pumpkin: false,
    icon: function() {
      tex.icon.show(40, 40);
    },
    display: function(e) {
      tex[e.img].show(72, 72, e.f);
    }
  };
});
EntityDisplay.speeder = (function() {
  var tex = {};
  tex.icon = new FitImage("assets/entities/speeder/icon.png");
  tex.attack = new Animation("assets/entities/speeder/attack.png", 8, 16);
  return {
    cost: 4,
    pumpkin: true,
    icon: function() {
      translate(-5, 0);
      tex.icon.show(0, 40);
      translate(5, 0);
    },
    display: function(e) {
      scale(e.facing, 1);
      translate(-4, 0);
      tex[e.img].show(60, 0, e.f);
      translate(4, 0);
      scale(-e.facing, 1);
    }
  };
});
EntityDisplay.falling_pumpkin = (function() {
  var tex = {};
  tex.falling_pumpkin = new FitImage("assets/entities/nuke/falling_pumpkin.png");
  return {
    display: function(e) {
      tex.falling_pumpkin.show(90, 0);
    }
  };
});
EntityDisplay.rusher = (function() {
  var tex = {};
  tex.idle = new Animation("assets/entities/rusher/idle.png", 14, 12);
  tex.icon = new FitImage("assets/entities/rusher/icon.png");
  tex.attack = new Animation("assets/entities/rusher/attack.png", 28, 12);
  tex.rush = new FitImage("assets/entities/rusher/rush.png");
  return {
    cost: 5,
    pumpkin: true,
    icon: function() {
      tex.icon.show(65, 0);
    },
    display: function(e) {
      tex[e.img].show(78, 0, e.f);
    }
  };
});
EntityDisplay.wizard = (function() {
  var tex = {};
  tex.idle = new Animation("assets/entities/wizard/idle.png", 14, 12);
  tex.icon = new FitImage("assets/entities/wizard/icon.png");
  tex.attack = new Animation("assets/entities/wizard/attack.png", 28, 12);
  return {
    cost: 7,
    pumpkin: true,
    icon: function() {
      tex.icon.show(65, 0);
    },
    display: function(e) {
      tex[e.img].show(78, 0, e.f);
    }
  };
});
EntityDisplay.projectile = (function() {
  var tex = {}
  tex.projectile = new Animation("assets/entities/wizard/projectile.png", 8, 8);
  return {
    display: function(e) {
      tex.projectile.show(20, 0, e.f);
    }
  };
});
EntityDisplay.brute = (function() {
  var tex = {};
  tex.icon = new FitImage("assets/entities/brute/icon.png");
  tex.leap = new FitImage("assets/entities/brute/leap.png");
  tex.attack = new Animation("assets/entities/brute/attack.png", 8, 12);
  return {
    cost: 10,
    pumpkin: true,
    icon: function() {
      tint(255, 128, 128);
      tex.icon.show(0, 40);
      tint(255, 255, 255);
    },
    display: function(e) {
      if (e.img == "icon") {
        tex[e.img].show(38, 0, e.f);
        return;
      }
      tint(255, 128, 128);
      tex[e.img].show(38, 0, e.f);
      tint(255, 255, 255);
    }
  };
});
EntityDisplay.shockwave = (function() {
  var tex = {};
  tex.shockwave = new Animation("assets/entities/brute/shockwave.png", 4, false);
  return {
    display: function(e) {
      tex.shockwave.show(128, 128, e.f);
    }
  };
});
EntityDisplay.catapult = (function() {
  var tex = {};
  tex.icon = new FitImage("assets/entities/catapult/icon.png");
  tex.launch = new Animation("assets/entities/catapult/launch.png", 4);
  return {
    cost: 12,
    pumpkin: false,
    icon: function() {
      translate(0, -5);
      tex.icon.show(45, 0);
      translate(0, 5);
    },
    display: function(e) {
      scale(e.facing, 1);
      translate(0, -5);
      tex[e.img].show(78, 0, e.f);
      translate(0, 5);
      scale(e.facing, -1);
    }
  };
});
EntityDisplay.payload = (function() {
  var tex = {}
  tex.payload = new FitImage("assets/entities/catapult/payload.png");
  return {
    display: function(e) {
      tex.payload.show(20, 0);
    }
  };
});
EntityDisplay.debuffer = (function() {
  var tex = {};
  tex.idle = new Animation("assets/entities/debuffer/idle.png", 14, 12);
  tex.icon = new FitImage("assets/entities/debuffer/icon.png");
  return {
    cost: 15,
    pumpkin: true,
    icon: function() {
      tex.icon.show(65, 0);
    },
    display: function(e) {
      noStroke();
      fill("rgba(0,255,0,0.25)");
      circle(0,0,10*36);
      tex[e.img].show(78, 0, e.f);
    }
  };
});

// --------------
// Ability System
// --------------

var fogs = [];
var vines = [];
var shield = false;
var generators = {};
// IDs
AbilityIDs = {};
AbilityIDs[0] = "fog";
AbilityIDs[1] = "vines";
AbilityIDs[2] = "swarm";
AbilityIDs[3] = "shield";
AbilityIDs[4] = "generators";
AbilityIDs.length = Object.keys(AbilityIDs).length;
// Display
AbilityDisplay = {};
AbilityDisplay.fog = (function() {
  var icon = new FitImage("assets/abilities/fog/icon.png");
  var fogGraphic = createGraphics(540, 540);
  var fog;
  LoadImage("assets/abilities/fog/fog.png", img => fog = img);
  return {
    cost: 5,
    cooldown: 1,
    wait: false,
    icon: function() {
      icon.show(0, 40);
    },
    show: function(f) {
      if (display == "pmgame") {
        tint(255, 255, 255, 78 + f.thick * 26);
        image(fog, -270, -270, 540, 540);
        tint(255, 255, 255, 255);
        return;
      }
      const prx = floor(player.x / (36 * 14));
      const pry = floor(player.y / (36 * 14));
      const infog = (prx - f.rx) <= 1 && (pry - f.ry) <= 1;
      if (!infog) {
        image(fog, -270, -270, 540, 540);
        return;
      }
      fogGraphic.clear();
      fogGraphic.image(fog, 0, 0, 540, 540);
      fogGraphic.push();
      const fx = player.x - f.x + 270;
      const fy = player.y - f.y + 270;
      fogGraphic.translate(fx, fy);
      fogGraphic.erase(128, 0);
      for (var i = 0; i < (5 - f.thick); i++) {
        fogGraphic.circle(0, 0, 36 + 36 * i);
      }
      fogGraphic.noErase();
      fogGraphic.pop();
      image(fogGraphic, -270, -270, 540, 540);
    }
  };
});
AbilityDisplay.vines = (function() {
  var icon = new FitImage("assets/abilities/vines/icon.png");
  var horizVines = new FitImage("assets/abilities/vines/horizontal.png");
  var vertVines = new FitImage("assets/abilities/vines/vertical.png");
  return {
    cost: 7,
    cooldown: 1,
    wait: false,
    icon: function() {
      icon.show(0, 40);
    },
    horiz: function() {
      horizVines.show(0, 36);
    },
    vert: function() {
      vertVines.show(36, 0);
    }
  };
});
AbilityDisplay.swarm = (function() {
  var icon = new FitImage("assets/abilities/swarm/icon.png");
  return {
    cost: 20,
    cooldown: 10 * 1000,
    wait: false,
    icon: function() {
      icon.show(0, 40);
    }
  };
});
AbilityDisplay.shield = (function() {
  var icon = new FitImage("assets/abilities/shield/icon.png");
  var shieldImg = new Animation("assets/abilities/shield/shield.png", 3, 8);
  return {
    cost: 70,
    cooldown: 90 * 1000,
    wait: false,
    icon: function() {
      icon.show(0, 40);
    },
    show: function() {
      shieldImg.show(0, 140);
    }
  };
});
AbilityDisplay.generators = (function() {
  var icon = new FitImage("assets/abilities/generator/icon.png");
  var generatorImg = new FitImage("assets/abilities/generator/generator.png");
  return {
    cost: 8,
    cooldown: 1,
    wait: false,
    icon: function() {
      icon.show(0, 40);
    },
    show: function(g) {
      generatorImg.show(0, 180);
      var seconds = 1000 / g.amount;
      var percent = fract(Date.now() / seconds);
      translate(0, -25 * percent + 10);
      if (percent >= 0.9) {
        if (g.amount >= 0.8) {
          textures.diamondpumpkin.show(percent * 60);
        } else if (g.amount >= 0.4) {
          textures.goldpumpkin.show(percent * 60);
        } else {
          textures.pumpkin.show(percent * 60);
        }
      } else {
        textures.newpumpkin.show(percent * 60);
      }
      translate(0, 25 * percent - 10);
    }
  };
});

// Candies
var CandyDisplay = {};
CandyDisplay.candy_corn = (function() {
  var candy = new FitImage("assets/candies/candy-corn.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(255, 200, 128);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.smarties = (function() {
  var candy = new FitImage("assets/candies/smarties.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(255, 200, 200);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.peppermint = (function() {
  var candy = new FitImage("assets/candies/peppermint.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(255, 128, 128);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.lolipop = (function() {
  var candy = new FitImage("assets/candies/lolipop.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(255, 170, 255);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.hot_tamale = (function() {
  var candy = new FitImage("assets/candies/hot-tamale.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(255, 128, 128);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.ghost_chew = (function() {
  var candy = new FitImage("assets/candies/ghost-chew.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(255, 255, 255, 128);
      f();
      tint(255, 255, 255, 255);
    }
  };
});
CandyDisplay.chocolate = (function() {
  var candy = new FitImage("assets/candies/chocolate.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(160, 120, 100);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.candied_apple = (function() {
  var candy = new FitImage("assets/candies/candied-apple.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(150, 200, 150);
      f();
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.blue_candy = (function() {
  var candy = new FitImage("assets/candies/blue_candy.png");
  return {
    show: function() {
      candy.show(40, 40);
    },
    active: function(p,f) {
      tint(170, 170, 255);
      f();
      tint(255, 255, 255);
    }
  };
});

// Tiles
var tileIDs = {};
class Tile {
  constructor(url, color, id) {
    this.image = LoadImage(url);
    this.color = color;
    this.id = id;
    tileIDs[id] = this;
  }
  render(x, y) {
    // FitImage scale
    var s = 64;
    mapBuf.image(this.image, x, y, 1, 1, 0, 0, s, s);
  }
  miniRender(x, y) {
    miniMapBuf.push();
    miniMapBuf.fill(this.color);
    miniMapBuf.rect(x, y, 1, 1);
    miniMapBuf.pop();
  }
}
class joinTile extends Tile {
  constructor(url, color, id, compatIDs) {
    super(url, color, id);
    this.compatable = compatIDs ?? [this.id];
  }
  render(x, y, map) {
    //Making sure not out of bounds and testing if neighbors are of the same type
    var u = this.compatable.includes(map[y - 1] ? (map[y - 1][x] ?? 0) : 0);
    var d = this.compatable.includes(map[y + 1] ? (map[y + 1][x] ?? 0) : 0);
    var l = this.compatable.includes(map[y][x - 1] ?? 0);
    var r = this.compatable.includes(map[y][x + 1] ?? 0);

    // FitImage scale
    var s = 64;

    var tx;
    var ty;

    //Figuring out current state and getting pixel coords
    if (u + d + r + l == 4) {
      tx = 0; ty = 0;
    }
    else if (u + d + r + l == 3) {
      ty = 1;
      if (!u && d && r && l) {
        tx = 0;
      }
      else if (u && d && !r && l) {
        tx = 1;
      }
      else if (u && !d && r && l) {
        tx = 2;
      }
      else if (u && d && r && !l) {
        tx = 3;
      }
    }
    else if (u + d + r + l == 2) {
      if (!u && !d && r && l) {
        tx = 2; ty = 0;
      }
      else if (u && d && !r && !l) {
        tx = 3; ty = 0;
      }
      else if (!u && d && !r && l) {
        tx = 0; ty = 2;
      }
      else if (u && !d && !r && l) {
        tx = 1; ty = 2;
      }
      else if (u && !d && r && !l) {
        tx = 2; ty = 2;
      }
      else if (!u && d && r && !l) {
        tx = 3; ty = 2;
      }
    }
    else if (u + d + r + l == 1) {
      ty = 3;
      if (!u && d && !r && !l) {
        tx = 0;
      }
      else if (!u && !d && !r && l) {
        tx = 1;
      }
      else if (u && !d && !r && !l) {
        tx = 2;
      }
      else if (!u && !d && r && !l) {
        tx = 3;
      }
    }
    else if (u + d + r + l == 0) {
      tx = 1; ty = 0;
    }
    mapBuf.image(this.image, x, y, 1, 1, tx * s, ty * s, s, s);
  }
}


// ------
// Assets
// ------

// Asset Classes
class Sound {
  constructor(url) {
    var self = this;
    //this.sound = LoadSound(url,(s)=>{
    //  self.length = s.duration();
    //});
    this.sound = new Audio(url);
    toLoad++;
    this.sound.addEventListener("loadeddata", () => {
      if (self.sound.readyState >= 1) {
        loaded++;
        self.length = self.sound.duration;
      }
    });
  }
  async play(amp) {
    //amp = amp ?? 1;
    //this.sound.play(0, 1, amp, 0, this.length);
    this.sound.volume = amp;
    this.sound.play();
    await wait(this.length * 1000);
    return;
  }
  stop() {
    //this.sound.stop();
    this.sound.pause();
    this.sound.currentTime = 0;
  }
}
class FitImage {
  constructor(url) {
    this.img = LoadImage(url, () => {
      this.w = this.img.width;
      this.h = this.img.height;
    });
  }
  show(w, h, buf) {
    var img = (buf && typeof buf != 'number') ? buf.image : image;
    var { w, h } = this.calc(w, h);
    img(this.img, -w / 2, -h / 2, w, h);
  }
  calc(w, h) {
    if (!h) {
      h = round((this.h / this.w) * w);
    }
    if (!w) {
      w = round((this.w / this.h) * h);
    }
    return { w, h };
  }
}
class Animation {
  constructor(url, length, loop) {
    this.amount = length;
    this.img = LoadImage(url, () => {
      this.w = floor(this.img.width / this.amount);
      this.h = this.img.height;
    });
    this.frame = 0;
    if (!loop) return;
    var self = this;
    this.interval = setInterval(() => {
      self.frame++;
      if (self.frame >= self.amount) {
        self.frame = 0;
      }
    }, 1000 / loop);
  }
  show(w, h, f) {
    var { w, h } = this.calc(w, h);
    var f = (f ?? 0) + this.frame;
    f = f % this.amount;
    image(this.img, -w / 2, -h / 2, w, h, this.w * f, 0, this.w, this.h);
  }
  calc(w, h) {
    if (!h) {
      h = round((this.h / this.w) * w);
    }
    if (!w) {
      w = round((this.w / this.h) * h);
    }
    return { w, h };
  }
}
// Objects to contain assets
var textures = {};
var gui = {};
var sounds = {};
// Load all assets
async function loadAssets() {
  soundFormats("mp3", "ogg");
  sounds.smash = [];
  sounds.smash[0] = new Sound("assets/sounds/smash0.mp3");
  sounds.smash[1] = new Sound("assets/sounds/smash1.mp3");
  sounds.smash[2] = new Sound("assets/sounds/smash2.mp3");
  sounds.background = [];
  sounds.background[0] = new Sound("assets/sounds/background0.mp3");
  sounds.background[1] = new Sound("assets/sounds/background1.mp3");
  sounds.background[2] = new Sound("assets/sounds/background2.mp3");

  // Load tiles
  var cobble_wall = new joinTile("assets/tiles/cobble-wall.png", "#303030", 1, [1, 2]);
  var mossy_cobble_wall = new joinTile("assets/tiles/mossy-cobble-wall.png", "#303030", 2, [1, 2]);
  var dark_wall = new joinTile("assets/tiles/dark-wall.png", "#d9d9d9", 3);
  var wood_wall = new joinTile("assets/tiles/wood-wall.png", "#ad6934", 4);
  var grave = new Tile("assets/tiles/grave.png", "#ebcb00", 5);
  var dirt = new Tile("assets/tiles/dirt.png", "#202020", 6);
  var exit = new Tile("assets/tiles/exit.png", "#000000", 7);

  // Lobby Image
  textures.lobby = LoadImage("assets/misc/lobby.png");

  // Skeleton Assets
  textures.skeleton = [];
  textures.skeleton[0] = new FitImage("assets/skeleton/1.png");
  textures.skeleton[1] = new FitImage("assets/skeleton/2.png");
  textures.skeleton[2] = new FitImage("assets/skeleton/3.png");
  textures.skeleton[3] = new FitImage("assets/skeleton/joining.png");
  textures.bone_pile = new FitImage("assets/skeleton/bone_pile.png");
  textures.axe = new FitImage("assets/skeleton/axe.png");

  // Pumpkins
  textures.pumpkin = new FitImage("assets/pumpkins/pumpkin.png");
  textures.newpumpkin = new FitImage("assets/pumpkins/new_pumpkin.png");
  textures.goldpumpkin = new FitImage("assets/pumpkins/gold_pumpkin.png");
  textures.diamondpumpkin = new FitImage("assets/pumpkins/diamond_pumpkin.png");
  textures.gutsplat = new Animation("assets/pumpkins/gut_splat.png", 5);

  textures.objective = new FitImage("assets/pumpkins/objective.png");

  for (var i in EntityDisplay) {
    EntityDisplay[i] = EntityDisplay[i]();
  }
  for (var i in AbilityDisplay) {
    AbilityDisplay[i] = AbilityDisplay[i]();
  }

  // Gui

  gui.logo = LoadImage("assets/gui/logo.png");

  gui.discord_icon = LoadImage("assets/gui/discord_icon.png");

  gui.direction = LoadImage("assets/gui/direction.png");
  gui.shield_direction = LoadImage("assets/gui/shield_direction.png");
  gui.gen_direction = LoadImage("assets/gui/gen_direction.png");

  gui.bone = new FitImage("assets/gui/bone.png");
  gui.bone_damaged = new FitImage("assets/gui/bone_damaged.png");
  gui.bone_broken = new FitImage("assets/gui/bone_broken.png");
  gui.coin = new FitImage("assets/gui/coin.png");

  gui.blur = new FitImage("assets/gui/blur.png");
  gui.blur2 = new FitImage("assets/gui/blur2.png");

  if (isMobile) await loadGUI();
}
// Load Counting
var toLoad = 0;
var loaded = 0;
function LoadImage(url, call) {
  toLoad++;
  return loadImage(url, (img) => {
    loaded++;
    if (call) call(img);
  });
}
function LoadSound(url, call) {
  toLoad++;
  //return createAudio(url,(snd)=>{
  return loadSound(url, (snd) => {
    loaded++;
    if (call) call(snd);
  });
}
async function LoadFile(url, call) {
  toLoad++;
  var response = await fetch(url);
  var data = await response.text();
  loaded++;
  if (call) { call(data); }
  return data;
}


// -----------
// Definitions
// -----------

var screenScale;
// Players
var players = {};
var player = {};
// Upgrades
var upgradeDisplay = false;
var upgrades = {
  speed: 0,
  axelength: 0,
  maxhealth: 0
};
const upgradeNames = {
  speed: "Speed",
  axelength: "Axe Reach",
  maxhealth: "Health"
};
const upgradeMaxes = {
  speed: 4,
  axelength: 4,
  maxhealth: 4
};
// Tilemap
var mapBuf;
//var miniMapBuf;
var minTileX;
var minTileY;
var tilemap = {};
var roomMap = {};
// Pumpkins
var pumpkinBuf;
var pumpkins = {};
// Candies
var candies = {};
// Objectives
var objectives = [];

var confetti = [];

var cam = {
  scroll: 0
};
var timer = 0;
var startTime = 0;

var wWidth;
var wHeight;
var wMouseX;
var wMouseY;

var tileimg;

var roomCodes = [];
var roomSettings = {
  hidden: false,
  start_count: 4,
};


// -------
// Display
// -------

// Animations
var animations = [];
class playAnimation {
  constructor(ani, framerate, w, h, x, y) {
    this.ani = ani;
    this.f = 0;
    this.w = w;
    this.h = h;
    this.x = x;
    this.y = y;
    var self = this;
    var int = setInterval(() => {
      self.f++;
    }, 1000 / framerate);
    setTimeout(() => {
      clearInterval(int);
      animations.splice(animations.indexOf(this), 1);
    }, ani.amount * (1000 / framerate));
    animations.push(this);
  }
  show() {
    push();
    translate(this.x, this.y);
    this.ani.show(this.w, this.h, this.f);
    pop();
  }
}

function setup() {
  frameRate(tickRate);

  var canvas_dom = createCanvas(windowWidth, windowHeight).elt;
  canvas_dom.addEventListener("touchstart", function(event) { event.preventDefault() }, { passive: false });
  canvas_dom.addEventListener("touchmove", function(event) { event.preventDefault() }, { passive: false });
  canvas_dom.addEventListener("touchend", function(event) { event.preventDefault() }, { passive: false });
  canvas_dom.addEventListener("touchcancel", function(event) { event.preventDefault() }, { passive: false });

  windowScale = min(windowWidth, windowHeight) / 400;
  wWidth = windowWidth / windowScale;
  wHeight = windowHeight / windowScale;
  userStartAudio();

  loadAssets();
}

var display = "loading";
var subdisplay = "assets";
function draw() {
  //console.log(deltaTime);
  angleMode(DEGREES);
  background("#123904");
  translate(windowWidth / 2, windowHeight / 2);
  scale(windowScale, windowScale);

  // Disconnect Screen
  if (socket.disconnected && display != "home" && display != "loading" && display != "instructions") {
    format(0, "#ffa500", 10, 40, CENTER);
    text("Disconnected", 0, 0);
    return;
  }
  // Hidden Screen
  if (document.hidden) {
    format(0, "#ffa500", 10, 40, CENTER);
    text("Paused", 0, 0);
    return;
  }

  if ((display == "game" || display == "pmgame" || display == "lobby") && room == "") {
    returnToHome();
    return;
  }

  // MouseX, MouseY, Width and Height
  wMouseX = (mouseX - windowWidth / 2) / windowScale;
  wMouseY = (mouseY - windowHeight / 2) / windowScale;

  //
  homeDis.div.style.visibility = display == "home" ? "visible" : "hidden";
  viewDis.div.style.visibility = display == "view" ? "visible" : "hidden";
  instructions.style.visibility = display == "instructions" ? "visible" : "hidden";

  // Background Blur
  if (display == "home" || display == "view") {
    push();
    if (wWidth / wHeight >= gui.blur.w / gui.blur.h) gui.blur.show(wWidth, 0);
    else gui.blur.show(0, wHeight);
    pop();
  }
  if ((display == "loading" && subdisplay != "assets") || display == "gameover") {
    push();
    if (wWidth / wHeight >= gui.blur2.w / gui.blur2.h) gui.blur2.show(wWidth, 0);
    else gui.blur2.show(0, wHeight);
    pop();
  }

  Displays[display]();

  if (display == "home" || display == "lobby" || display == "view") {
    // Discord link
    push();
    if (display == "lobby") translate(player.x, player.y);
    translate(wWidth / 2 - 23, wHeight / 2 - 23);
    var overdiscordbtn = mouseRect(wWidth / 2 - 36, wHeight / 2 - 36, 26, 26);
    if (overdiscordbtn) scale(1.1, 1.1);
    image(gui.discord_icon, -13, -13, 26, 26);
    pop();
  }
  if (display == "game" || display == "pmgame") {
    // Discord link
    push();
    translate(wWidth / 2 - 23, wHeight / 2 - 33);
    var overdiscordbtn = mouseRect(wWidth / 2 - 36, wHeight / 2 - 46, 26, 26);
    if (overdiscordbtn) scale(1.1, 1.1);
    image(gui.discord_icon, -13, -13, 26, 26);
    pop();
  }
  // Confetti
  if (subdisplay == "animation") {
    for (var i = 0; i < confetti.length; i++) {
      var c = confetti[i];
      c.vel.y += 0.5;
      c.pos.add(c.vel);
      if (c.pos.x < -wWidth / 2) c.vel.x *= -1;
      if (c.pos.x > wWidth / 2) c.vel.x *= -1;
      push();
      translate(c.pos.x, c.pos.y);
      fill(c.color);
      rect(-c.size, -c.size, c.size * 2, c.size * 2);
      pop();
    }
  }

  if (tutorialMsg) {
    push();
    translate(0, -wHeight / 2 + 95);
    format("#231709", "#ffa500", 2);
    rect(-150, -35, 300, 73);
    // Text
    format("#ffa500", false, 1, 16, LEFT);
    for (var i = 0; i < tutorialMsg.length; i++) {
      text(tutorialMsg[i], -103, -12 + 18 * i);
    }
    format("#ffa500", false, 1, 8, RIGHT);
    text("ENTER to continue", 145, 33);
    // Speaker
    if (tutorialPumpkin) {
      translate(-125, 0);
      EntityDisplay.monster.display({ img: "attack", f: 0 });
    } else {
      translate(-120, -4);
      textures.skeleton[0].show(0, 60);
    }
    pop();
    // Continue
    if (keyIsDown(13)) {
      tutorialMsg = false;
      socket.emit("continueTutorial");
    }
  }

  localStorage.user = JSON.stringify(user);

  if (isMobile) drawGUI();
}

var Displays = {};
// Skeleton Display
Displays.game = function() {
  background("#000f00");
  translate(-player.x, -player.y);
  show();
  translate(player.x, player.y);
  if (subdisplay == "") {
    /*
    //Minimap
    push();
    translate(-wWidth/2+20, -wHeight/2+20);
    var minimum = min(miniMapBuf.width,miniMapBuf.height);
    var w = miniMapBuf.width/minimum;
    var h = miniMapBuf.height/minimum;
    image(miniMapBuf,0,0,50*w,50*h);
    scale(1/w,1/h);
    fill("#ff0000");
    rect(player.x/36,player.y/36,1,1);
    pop();
    //*/

    // Fog
    const prx = floor((player.x - 18) / (36 * 14));
    const pry = floor((player.y - 18) / (36 * 14));
    const infog = fogs.some(f => prx == f.rx && pry == f.ry);
    if (!infog) {
      // Generator Arrows
      for (var i in generators) {
        var gen = generators[i];
        var delta = createVector(gen.x - player.x, gen.y - player.y);
        if (delta.magSq() >= 108 * 108) {
          push();
          rotate(delta.heading());
          translate(35, 0);
          image(gui.gen_direction, -4, -4, 8, 8)
          pop();
        }
      }
      // Objective Arrows
      for (var i = 0; i < objectives.length; i++) {
        if (objectives[i].health <= 0) continue;
        var delta = createVector(objectives[i].x - player.x, objectives[i].y - player.y);
        if (delta.magSq() < 108 * 108) continue;
        push();
        rotate(delta.heading());
        translate(35, 0);
        image(gui.direction, -5, -5, 10, 10)
        pop();
      }
      // Shield Arrow
      if (shield) {
        var delta = createVector(shield.x - player.x, shield.y - player.y);
        if (delta.magSq() >= 108 * 108) {
          push();
          rotate(delta.heading());
          translate(35, 0);
          image(gui.shield_direction, -7, -7, 14, 14)
          pop();
        }
      }
    }

    // Seconds Left
    push();
    translate(0, -wHeight / 2 + 35);
    format(255, false, 1, 25, CENTER);
    var mins = floor(timer / 60);
    var secs = timer % 60;
    if (secs < 10) {
      secs = "0" + secs;
    }
    text(mins + ":" + secs, 0, 0);
    pop();

    // Health
    push();
    var hw = (player.maxhealth - 1) * 40;
    translate(-hw / 2, wHeight / 2 - 40);
    var h = player.health;
    for (var i = 0; i < player.maxhealth; i++) {
      gui[h > (i + 0.5) ? "bone" : h > i ? "bone_damaged" : "bone_broken"].show(40);
      translate(40, 0);
    }
    pop();

    // Score & Level
    push();
    translate(-wWidth / 2 + 8, -wHeight / 2 + 23);
    format(255, false, 1, 18, LEFT);
    text("Score: " + player.score, 0, 0);
    text("Level: " + player.level, 0, 23);
    pop();

    // PM name
    var pmName = [];
    for (var i in players) {
      var p = players[i];
      if (!p.pumpkinMaster) continue;
      pmName.push(p.name);
      break;
    }
    pmName = pmName.join(", ");
    if (pmName != "") {
      push();
      translate(wWidth / 2 - 8, wHeight / 2 - 8);
      format(255, false, 1, 12, RIGHT);
      text("Pumpkin Master: " + pmName, 0, 0);
      pop();
    }

    // Upgrades
    if (upgradeDisplay) {
      push();
      translate(-wWidth / 2 - 5, wHeight / 2 - 75);
      var overX = wMouseX > -wWidth / 2 && wMouseX < -wWidth / 2 + 105;
      var c = 0;
      for (var i in upgrades) {
        var over = overX && wMouseY > wHeight / 2 - 75 - 65 * c && wMouseY < wHeight / 2 - 15 - 65 * c && player.upgradePts > 0;
        var color = over ? "#381e08" : "#231709";
        if (upgrades[i] >= upgradeMaxes[i]) color = "#2e2e2e";
        format(color, "#ffa500", 2);
        rect(0, 0, 110, 60);
        format("#ffa500", false, 1, 18, CENTER);
        text(upgradeNames[i], 55, 20);
        textSize(30);
        text(upgrades[i], 55, 50);
        translate(0, -65);
        c++;
      }
      translate(0, 30);
      format("#231709", "#ffa500", 2);
      rect(0, 0, 110, 30);
      format("#ffa500", false, 1, 18, CENTER);
      text("Points: " + player.upgradePts, 55, 20);
      pop();
    }
  }
  else if (subdisplay == "dead") {
    push();
    translate(0, wHeight / 2 - 45);
    format("ffa500", false, 1, 25, CENTER);
    text("Respawning in: " + player.countdown + " seconds", 0, 0);
    pop();
    push();
    format(0, "#ffa500", 10, 40, CENTER);
    text("You Died!", 0, -40);
    pop();
  }
  if (keyIsDown(27)) {
    exit();
    return;
  }
}
// Pumpkin Master Display
Displays.pmgame = function() {
  background("#000f00");
  translate(cam.pos.x, cam.pos.y);
  scale(cam.zoom);
  show();
  if (subdisplay == "") {
    var msx = (wMouseX - cam.pos.x) / cam.zoom;
    var msy = (wMouseY - cam.pos.y) / cam.zoom;
    // View Player Health
    for (var i in players) {
      var p = players[i];
      if (p.pumpkinMaster) continue;
      if ((msx - p.x) ** 2 + (msy - p.y) ** 2 < 625) {
        push();
        var hw = (p.maxhealth - 1) * 20;
        translate(p.x - hw / 2, p.y - 35);
        var h = p.health;
        for (var i = 0; i < p.maxhealth; i++) {
          gui[h >= (i + 1) ? "bone" : h > i ? "bone_damaged" : "bone_broken"].show(20);
          translate(20, 0);
        }
        pop();
      }
    }

    // Ability Select
    if (cam.mode == "ability" && AbilityDisplay[cam.selA].wait == false && AbilityDisplay[cam.selA].cost < cam.coins) {
      var rx = floor(msx / (36 * 14));
      var ry = floor(msy / (36 * 14));
      if (roomMap[rx + "," + ry]) {
        push();
        scale(36, 36);
        fill(255, 255, 255, 128);
        rect(rx * 14, ry * 14, 15, 15);
        pop();
      }
    }

    // Undo Translate & Scale
    scale(1 / cam.zoom);
    translate(-cam.pos.x, -cam.pos.y);

    // Show Coins
    push();
    translate(-wWidth / 2, -wHeight / 2);
    format("#231709", "#ffa500", 2);
    rect(10, 10, 100, 30);
    format("#ffa500", false, 1, 20, LEFT);
    text(floor(cam.coins), 42, 32.5);
    translate(27, 25);
    gui.coin.show(0, 25);
    pop();

    var activeColors = {
      red: "#ff0000",
      green: "#00ff00",
      orange: "#ffa500",
      grey: "#a5a5a5"
    }
    var hideColors = {
      red: "#640000",
      green: "#006400",
      orange: "#644000",
      grey: "#404040"
    }


    // Select Pumpkin Monsters
    push();
    translate(-wWidth / 2 + 35, wHeight / 2 - 45);
    var t = { x: -wWidth / 2 + 35, y: wHeight / 2 - 45 };
    var pStr = String.fromCodePoint(127875) + " ";
    var c = cam.mode == "entity" ? activeColors : hideColors;
    for (var i = 0; i < EntityIDs.length; i++) {
      var m = EntityIDs[i];
      var over = mouseCircle(t.x, t.y, 25) ? "#381e08" : "#231709";
      var sel = cam.selE == m ? c.green : c.orange;
      var data = EntityDisplay[m];
      var txt = (data.pumpkin ? pStr : "") + data.cost;
      var afford = cam.coins >= data.cost ? c.green : c.red;
      if (afford == c.red) sel = c.red;
      format(over, sel, 3);
      circle(0, 0, 50);
      data.icon();
      format("#000000", afford, 2, 15, CENTER);
      text(txt, 0, 40);
      translate(70, 0);
      t.x += 70;
    }
    if (cam.mode == "entity") {
      translate(-20, 0);
      scale(-1, 1);
      image(gui.direction, -10, -10, 20, 20);
    }
    pop();

    // Select Abilities
    push();
    translate(-wWidth / 2 + 35, wHeight / 2 - 115);
    t = { x: -wWidth / 2 + 35, y: wHeight / 2 - 115 };
    c = cam.mode == "ability" ? activeColors : hideColors;
    for (var i = 0; i < AbilityIDs.length; i++) {
      var m = AbilityIDs[i];
      var over = mouseCircle(t.x, t.y, 25) ? "#381e08" : "#231709";
      var sel = cam.selA == m ? c.green : c.orange;
      var data = AbilityDisplay[m];
      var txt = data.cost;
      var afford = cam.coins >= data.cost ? c.green : c.red;
      if (afford == c.red) sel = c.red;
      if (data.wait == true) {
        over = "#202020";
        sel = c.grey;
        afford = c.grey;
      }
      format(over, sel, 3);
      circle(0, 0, 50);
      data.icon();
      format("#000000", afford, 2, 15, CENTER);
      text(txt, 0, 40);
      translate(70, 0);
      t.x += 70;
    }
    if (cam.mode == "ability") {
      translate(-20, 0);
      scale(-1, 1);
      image(gui.direction, -10, -10, 20, 20);
    }
    pop();

    // PM Name
    var pmName = player.name;
    if (pmName != "") {
      push();
      translate(wWidth / 2 - 8, wHeight / 2 - 8);
      format(255, false, 1, 12, RIGHT);
      text("Pumpkin Master: " + pmName, 0, 0);
      pop();
    }

    // Timer
    push();
    translate(0, -wHeight / 2 + 35);
    format(255, false, 1, 25, CENTER);
    var mins = floor(timer / 60);
    var secs = timer % 60;
    if (secs < 10) {
      secs = "0" + secs;
    }
    text(mins + ":" + secs, 0, 0);
    pop();

    // Drag View
    if (mouseIsPressed) {
      cam.pos.x += (mouseX - pmouseX) / windowScale;
      cam.pos.y += (mouseY - pmouseY) / windowScale;
      user.cam = cam;
    }
  }
  else {
    scale(1 / cam.zoom);
    translate(-cam.pos.x, -cam.pos.y);
  }
  if (keyIsDown(27)) {
    exit();
    return;
  }
}
// Lobby
var currentTip;
Displays.lobby = function() {
  translate(-player.x, -player.y);
  image(textures.lobby, -495, -500, 1000, 1000);
  for (var i in players) {
    var p = players[i];
    if (!p) continue;
    push();
    translate(p.x, p.y);
    scale(p.facing, 1);
    // Skeleton
    textures.skeleton[p.skin].show(0, 46);
    pop();
  }
  for (var i in players) {
    var p = players[i];
    if (!p) continue;
    push();
    translate(p.x, p.y);
    // Name
    format("#ffffff", false, 0, 12, CENTER);
    if (p.name == "DragonFire7z") fill("#ff0000");
    text(p.name, -4 * p.facing, -20);
    pop();
  }
  push();
  translate(player.x, player.y);
  format("#ffa500", false, 1, 20, CENTER);
  if (amount < roomSettings.start_count && timeleft == 0) {
    text(amount + "/" + roomSettings.start_count + " to Start!", 0, 150);
  }
  else {
    text("Starting in: " + timeleft, 0, 150);
  }
  if (!isNext) {
    var p = roomSettings.hidden ? "Private" : "Public";
    text("Room Code: " + room + " " + p, 0, 180);
  }
  format("#ffffff", false, 1, 10, LEFT, BOTTOM);
  if (!currentTip) {
    var tips = [
      "The goal of the pumpkin master is to protect the objectives.",
      "To win as skeleton, destroy all of the objectives.",
      "Follow the arrows to get to the objectives.",
      "A purple arrow shows the direction of the shield.",
      "Upgrading axe range allows you to hit enemies from further away.",
      "Upgrading speed allows you to move faster.",
      "You can get more health by uprgrading health.",
      "Invite your friends to start the match!",
      "Join the discord to play with others.",
      "You cannot have more than 1 shield at a time. Placing another relocates it and restores it to full health.",
      "You can stack fogs to make visibility worse.",
      "Fog hides the objective and shield arrows.",
      "To destroy the brute pumpkin, wait until it jumps, move away, and then strike while it's frozen and weak.",
      "You can dodge a rusher's attacks and hit it against a wall.",
      "Destroying entities rewards score too.",
      "Destroying the objectives and shield rewards score.",
      "You can use the number keys to automatically upgrade as skeleton.",
      "You can use the number keys to select an entity or ability as Pumpkin Master.",
      "Press shift to switch between entities and abilities as Pumpkin Master.",
      "Ghost pumpkins can go through walls.",
      "Falling pumpkin tagets don't need to be placed on a pumpkin.",
      "You can copy paste the url while in a room to have people automatically join when they open it.",
      "You can create a custom room code by trying to join a room that doesn't exist.",
      "You can upvote suggestions on the discord to have a chance of seeing them in game.",
      "Use the matchmaking on the discord to invite people to play the game.",
      "Did you know this game started as a code.org project?",
      "Report any bugs you find to the discord.",
      "If you haven't done so already, change your name. It's fun!",
      "Press space to smash as a skeleton!",
      "You can trap skeletons in vines.",
      "Shields last for 2 minutes.",
      "View how to play for the full tutorial!",
      "Join the discord and invite your friends!",
      "You can look at tips to get useful information about the game.",
      "You can your mouse to scroll out and you can drag it around to move as Pumpkin Master.",
      "Click on a pumpkin to spawn an entity.",
      "Click on a room to use an ability.",
      "Doing things as skeleton rewards score. Score can be used to upgrade.",
      "Every time an objective is destroyed, the Pumpkin Master gets an additional half a coin per second.",
      "Shields can win the game when used properly.",
      "Split up and attack all three objectives at once, there is no way to defend from all of you.",
      "Fog the entire map to hide the location of your shield.",
      "Press space in a room you are hosting to switch from public to private.",
      "Press +/- in a room you are hosting to change the player amount required to start.",
      "Private rooms cannot be seen in the join menu.",
      "Press F while in the tutorial to enter freeplay mode!",
      "Placing generators early game is a good way to get more coins.",
      "Made by DragonFireGames!"
    ];
    currentTip = tips[floor(random() * tips.length)];
    setTimeout(() => {
      currentTip = false;
    }, 5 * 1000);
  }
  text("Tip: " + currentTip, -wWidth / 2 + 3, wHeight / 2 - 3);
  pop();

  // Leave
  if (keyIsDown(27)) {
    exit();
    return;
  }
}
// Start Screen
Displays.home = function() {
  push();
  translate(0, -100);
  textures.objective.show(180, 0);
  pop();
  format(0, "#ffa500", 10, 40, CENTER);
  text("Pumpkin Smasher", 0, -70);
  //image(gui.logo,-170,-170,340,150);
}
homeDis.clickStart = function() {
  if (!socket.connected) return;
  socket.emit('joinRoom');
  setDisplay("loading");
  setTimeout(() => {
    setDisplay("lobby");
  }, 1000);
}
homeDis.clickHost = function() {
  if (!socket.connected) return;
  socket.emit('hostRoom');
  setDisplay("loading");
  setTimeout(() => {
    setDisplay("lobby", "host");
  }, 1000);
}
homeDis.clickJoin = function() {
  if (!socket.connected) return;
  socket.emit('viewRooms');
  setDisplay("loading", "view");
}
homeDis.clickTutorial = function() {
  socket.emit('doTutorial');
  setDisplay("loading");
}
homeDis.clickInstructions = function() {
  setDisplay("instructions");
  //cam.scroll = 0;
  //location.href = location.origin+"/instructions";
}
homeDis.clickSettings = function() {
  alert("Coming soon!");
}

Displays.view = function() {
  push()
  const wid = wWidth - 80;
  viewDis.roomCode.style.top = (40 + cam.scroll) * windowScale + "px";
  viewDis.enter.style.top = (40 + cam.scroll) * windowScale + "px";

  const code = viewDis.roomCode.value;
  const codeExists = roomCodes.filter((c) => c.id == code).length == 1;
  viewDis.enter.value = codeExists ? "Join" : "Host";

  var tx = -wWidth / 2 + 40;
  var ty = -wHeight / 2 + 75 + cam.scroll;
  translate(tx, ty);

  var codes = roomCodes.filter((c) => c.settings.hidden == false);
  for (var i = 0; i < codes.length; i++) {
    const over = mouseRect(tx, ty, wid, 40);
    format(0, "#ffa500", 2);
    fill(over ? "#381e08" : "#231709");
    rect(0, 0, wid, 40);
    // Rooms
    format("#ffa500", false, 1, 20, CENTER);
    text((i + 1) + ".", 25, 26);
    textAlign(LEFT);
    if (codes[i].next) text("Public Lobby 🌐", 45, 26)
    else text("Code: " + codes[i].id, 45, 26);
    textAlign(RIGHT);
    text(codes[i].amount + "/" + codes[i].settings.start_count, wid - 15, 26);
    ty += 45; translate(0, 45);
    if (over && mouseIsPressed && socket.connected) {
      socket.emit('joinRoomCode', codes[i].id);
      setDisplay("loading");
      setTimeout(() => {
        setDisplay("lobby");
      }, 1000);
      return;
    }
  }
  if (keyIsDown(27)) {
    socket.emit('stopViewRooms');
    setDisplay("loading");
    setTimeout(() => {
      setDisplay("home");
    }, 1000);
    return;
  }
  pop();
}
viewDis.clickEnter = function() {
  if (!socket.connected) return;
  const code = viewDis.roomCode.value;
  if (viewDis.enter.value == "Join") {
    socket.emit('joinRoomCode', code);
    setDisplay("loading");
    setTimeout(() => {
      setDisplay("lobby");
    }, 1000);
  } else {
    socket.emit('hostRoom', code);
    setDisplay("loading");
    setTimeout(() => {
      setDisplay("lobby", "host");
    }, 1000);
  }
}
// Tutorial
Displays.instructions = function() {
  if (keyIsDown(27)) {
    setDisplay("home");
    return;
  }
}
window.onmessage = function(e) {
  if (e.data == 'esc' && display == "instructions") {
    setDisplay("home");
  }
};
// Win/Lose States
Displays.gameover = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  if (subdisplay == "win") text("You Won!", 0, -40);
  else text("You Lost", 0, -40);
  var overbutton = wMouseX > -37.5 && wMouseX < 37.5 && wMouseY > 0 && wMouseY < 50;
  fill(overbutton ? "#381e08" : "#231709");
  rect(-37.5, 0, 75, 50);
  format("#ffa500", false, 1, 20, CENTER);
  text("Leave", 0, 30);
  if ((keyIsDown(13) || (isMobile && mouseIsPressed) || (overbutton && mouseIsPressed))) {
    exit();
  }
}
// Loading
Displays.loading = function() {
  format("#ffa500", false, 1, 20, LEFT);
  text("Loading", -wWidth / 2 + 10, wHeight / 2 - 12.5);
  var x = -wWidth / 2 + 80;
  var y = wHeight / 2 - 12.5;
  text(".", x, y + min(0, sin(frameCount * 3 + 120) * 3));
  text(".", x + 6, y + min(0, sin(frameCount * 3 + 60) * 3));
  text(".", x + 12, y + min(0, sin(frameCount * 3) * 3));
  if (subdisplay == "game") {
    format(0, "#ffa500", 10, 40, CENTER);
    if (player.pumpkinMaster) {
      text("You are: Pumpkin Master!", 0, -40);
    } else {
      text("You are: Skeleton!", 0, -40);
    }
    format("#ffa500", false, 1, 20, CENTER);
    if (player.pumpkinMaster) {
      text("Spawn monsters to prevent skeletons", 0, 20);
      text("from destroying pumpkins.", 0, 40);
    } else {
      text("Smash/battle pumpkins and attempt", 0, 20);
      text("to destroy the objectives.", 0, 40);
    }
  }
  if (subdisplay == "assets") {
    format("#ffa500", 0, 0, 30, CENTER);
    text((loaded / toLoad * 100).toFixed(0) + "% complete", 0, -30);
    format("#231709", 0, 0);
    rect(-150, -20, 300, 40);
    format("#006400", 0, 0);
    rect(-150, -20, lerp(0, 300, loaded / toLoad), 40);
    format(false, "#ffa500", 2);
    rect(-150, -20, 300, 40);
    if (toLoad == loaded) endAssetLoad();
  }
}

function setDisplay(d, sd) {
  display = d;
  subdisplay = sd ?? "";
  DiscordWidget.style.visibility = "hidden";
  user.lastSession = {};
  history.pushState({}, "", location.origin);
  if (display == "lobby") {
    history.pushState({}, "", location.origin + "?room=" + room);
    if (isNext) history.pushState({}, "", location.origin + "?room=next");
    return;
  }
  if (display == "home" || display == "loading") return;
  user.lastSession.display = display;
  user.lastSession.subdisplay = subdisplay;
  if ((display == "game" || display == "pmgame") && room.length == 8) {
    user.lastSession.room = room;
    user.lastSession.id = player.id;
  }
}
function endAssetLoad() {

  if (!user.doneTutorial) {
    socket.emit('doTutorial');
    setDisplay("loading");
    user.doneTutorial = true;
  }

  // Get params
  var params_str = location.href.split('?')[1];
  if (params_str) {
    var params_arr = params_str.split('&');

    var params = {};
    for (var i = 0; i < params_arr.length; i++) {
      var pair = params_arr[i].split('=');
      params[pair[0]] = pair[1];
    }

    // Join room
    if (params.room) {
      if (params.room == "next") socket.emit('joinRoom');
      else socket.emit('joinRoomCode', params.room);
      setDisplay("loading");
      setTimeout(() => {
        setDisplay("lobby");
      }, 1000);
      return;
    }
  }

  // Displays
  if (!user.lastSession.display) { setDisplay("home"); return; }
  display = user.lastSession.display;
  subdisplay = user.lastSession.subdisplay;
  // Reset
  if ((display == "game" || display == "pmgame") && user.lastSession.room && user.lastSession.id) {
    room = user.lastSession.room;
    player.id = user.lastSession.id;
    socket.emit('rejoin', room, player.id, true);
  }
  if (display == "pmgame" && user.cam) {
    cam = user.cam;
  } else if (display == "pmgame") {
    cam.pos = {
      x: -(15 / 2) * 36,
      y: -(15 / 2) * 36
    };
    cam.zoom = 1;
    cam.coins = 0;
    cam.selE = "monster";
    cam.selA = "fog";
    cam.mode = "entity";
  }
  if (display == "view") {
    socket.emit('viewRooms');
  }
}

function show() {
  if (!mapBuf) return;
  // Show Tilemap Image
  image(mapBuf, minTileX * 36, minTileY * 36, mapBuf.width, mapBuf.height);
  // Show Pumpkin Image
  image(pumpkinBuf, minTileX * 36, minTileY * 36, pumpkinBuf.width, pumpkinBuf.height);

  // Candies
  for (var i in candies) {
    var c = candies[i];
    push();
    translate(c.x, c.y);
    CandyDisplay[c.type].show();
    pop();
  }

  // Abilities
  for (var i = 0; i < vines.length; i++) {
    if (vines[i].health <= 0) continue;
    push();
    translate(vines[i].x, vines[i].y);
    //var alpha = lerp(128,255,vines[i].health/20);
    //tint(255,255,255,floor(alpha));
    AbilityDisplay.vines[vines[i].orient]();
    healthBar(40, 14, vines[i].health / 20);
    pop();
  }
  if (shield) {
    push();
    translate(shield.x, shield.y);
    //var alpha = lerp(128,255,shield.health/50);
    //tint(255,255,255,floor(alpha));
    AbilityDisplay.shield.show();
    translate(0, -75);
    healthBar(60, 20, shield.health / 50);
    pop();
  }
  for (var i in generators) {
    var gen = generators[i];
    push();
    translate(gen.x, gen.y);
    AbilityDisplay.generators.show(gen);
    translate(0, -75);
    healthBar(60, 20, gen.health / gen.maxhealth);
    pop();
  }

  // Show Objectives
  for (var i = 0; i < objectives.length; i++) {
    if (objectives[i].health <= 0) continue;
    push();
    translate(objectives[i].x, objectives[i].y);
    if (shield) tint("#ff00ff");
    textures.objective.show(120, 0);
    translate(0, -72);
    healthBar(60, 20, objectives[i].health / 100, shield ? "#ff00ff" : "#00ff00");
    pop();
  }

  // Show Players & Enemies sorted by y-coord
  //*
  var showing = [];
  for (var i in players) {
    var p = players[i];
    if (p.pumpkinMaster) continue;
    showing.push({
      x: p.x,
      y: p.y,
      depth: 0,
      data: p,
      type: "player",
    });
  }
  var showplayer = function(p) {
    if (p.health <= 0) {
      textures.bone_pile.show(0, 46);
      return;
    }
    scale(p.facing, 1);
    // Axe
    var w = textures.skeleton[p.skin].calc(0, 46).w;
    var aw = textures.axe.calc(0, 46).w;
    var off = p.swing ? 5 : 0;
    translate((w - aw) / 2, off);
    rotate(p.swing);
    textures.axe.show(0, 62 * (p.axelength + 0.2));
    rotate(-p.swing);
    translate(-(w - aw) / 2, -off);
    // Skeleton
    var skele = () => textures.skeleton[p.skin].show(w, 46);
    if (p.activeCandy) {
      var time = p.candyDuration-Date.now();
      if (time < 5000 && time % 500 < 250) skele();
      else CandyDisplay[p.activeCandy].active(p,skele);
    } else skele();
  };
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    showing.push({
      x: e.x,
      y: e.y,
      depth: e.depth,
      data: e,
      type: "entity",
    });
  }
  //*/

  //Filter on screen?
  /*
  var tx = 0;
  var ty = 0;
  console.log(player);
  if (display == "game") {
    tx += player.x;
    ty += player.y;
  } else {
    tx += 1000;
    ty += 1000;
  }
  var min = {x:-wWidth/2+tx,y:-wHeight/2+ty};
  var max = {x:wWidth/2+tx,y:wHeight/2+ty};
  var l = 50;
  showing.filter((v)=>{
    return (v.x + l > min.x &&
            v.x - l < max.x &&
            v.y + l > min.x &&
            v.y - l < max.x);
  });
  //*/

  // Sort
  //*
  showing.sort((a, b) => {
    if (a.depth == b.depth) return a.y - b.y;
    return a.depth - b.depth
  });
  for (var i = 0; i < showing.length; i++) {
    var s = showing[i];
    push();
    translate(s.x, s.y);
    switch (s.type) {
      case "entity":
        EntityDisplay[s.data.type].display(s.data);
        break;
      case "player":
        showplayer(s.data);
        break;
    }
    pop();
  }
  //*/

  // Without sort
  /*
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    push();
    translate(e.x, e.y);
    EntityDisplay[s.data.type].display(e);
    pop();
  }
  for (var i in players) {
    var p = players[i];
    push();
    translate(p.x, p.y);
    showplayer(p);
    pop();
  }
  //*/

  // Names
  for (var i in players) {
    var p = players[i];
    if (!p || p.pumpkinMaster) continue;
    push();
    translate(p.x, p.y);
    format("#ffffff", false, 0, 12, CENTER);
    if (p.name == "DragonFire7z" || p.name == "DragonFireGames") fill("#ff0000");
    text(p.name, -4 * p.facing, -20);
    pop();
  }

  // Show Animations
  for (var i = 0; i < animations.length; i++) {
    animations[i].show();
  }

  // Fog Ability
  for (var i = 0; i < fogs.length; i++) {
    push();
    translate(fogs[i].x, fogs[i].y);
    AbilityDisplay.fog.show(fogs[i]);
    pop();
  }
}
function healthBar(w, h, percent, alive, dead) {
  if (percent == 1) return;
  format(dead ?? "#ff0000", false);
  rect(-w / 2, -h / 2, w, h);
  format(alive ?? "#00ff00", false);
  rect(-w / 2, -h / 2, lerp(0, w, percent), h);
  format(false, "#202020", 2);
  rect(-w / 2, -h / 2, w, h);
}
function smashFX(x, y) {
  var snd = floor(Math.random() * sounds.smash.length);
  sounds.smash[snd].play(1);
  new playAnimation(textures.gutsplat, 12, 50, 50, x, y);
}

// --------
// Keybinds
// --------

// Holding Keybinds
function tick() {
  if (display == "lobby" || (display == "game" && subdisplay == "")) {
    keybinds();
  } else if (display == "pmgame") {
    PMkeybinds();
  }
  if (display == "game" || display == "pmgame") {
    timer = 5 * 60 - floor((Date.now() - startTime) / 1000);
  }
}
function keybinds() {
  var u = false, d = false, l = false, r = false;
  if (keyIsDown(38) || keyIsDown(87)) {
    u = true;
  }
  if (keyIsDown(40) || keyIsDown(83)) {
    d = true
  }
  if (keyIsDown(37) || keyIsDown(65)) {
    l = true
  }
  if (keyIsDown(39) || keyIsDown(68)) {
    r = true;
  }
  if (isMobile) {
    if (mbGUI.joystick.isActive) {
      var dx = wMouseX - mbGUI.joystick.touchpos.x;
      var dy = wMouseY - mbGUI.joystick.touchpos.y;
      var delta = createVector(dx, dy);
      delta.limit(50);
      u = delta.y < 10;
      d = delta.y > -10;
      l = delta.x < -10;
      r = delta.x > 10;
    }
  }
  socket.emit('move', u, d, l, r);
}
function PMkeybinds() {
  if (keyIsDown(27)) {
    exit();
  }
}
// Exit
async function exit() {
  socket.emit('leaveRoom', room);
  console.log("Left room (" + room + ")");
  setDisplay("loading");
  tutorialMsg = false;
  room = "";
  isNext = false;
  tilemap = {};
  roomMap = {};
  pumpkins = {};
  objectives = [];
  entities = [];
  cam = {};
  timer = 0;
  startTime = 0;
  timeleft = 0;
  upgradeDisplay = false;
  upgrades = {
    speed: 0,
    axelength: 0,
    maxhealth: 0
  };
  for (var i = 0; i < sounds.background.length; i++) {
    sounds.background[i].stop();
  }
  await wait(1000);
  player = {};
  for (var i in players) {
    delete players[i];
  }
  setDisplay("home");
}
// Pressed Keybinds
var smashcooldown = true;
function keyPressed() {
  if (display == "game" || display == "pmgame") {
    if (room == player.id) {
      if (keyCode == 80) { socket.emit('swap'); return; }
      if (keyCode == 70) { socket.emit('freeplay'); return; }
    }
  }
  if (display == "home") {
    // Start
    if (keyCode == 13) { homeDis.clickStart(); return; }
    // Host
    if (keyCode == 72 && document.activeElement != homeDis.username) { homeDis.clickHost(); return; }
    // Join
    if (keyCode == 74 && document.activeElement != homeDis.username) { homeDis.clickJoin(); return; }
    // Tutorial
    if (keyCode == 84 && document.activeElement != homeDis.username) { homeDis.clickTutorial(); return; }
  }
  if (display == "lobby" && subdisplay == "host") {
    // Toggle Private/Public
    if (keyCode == 32) {
      roomSettings.hidden = !roomSettings.hidden;
      socket.emit('updateSettings', room, roomSettings);
      return;
    }
    if (keyCode == 189) {
      if (roomSettings.start_count <= max(amount,2)) return; 
      roomSettings.start_count--;
      socket.emit('updateSettings', room, roomSettings);
      return;
    }
    if (keyCode == 187) {
      if (roomSettings.start_count >= 12) return;
      roomSettings.start_count++;
      socket.emit('updateSettings', room, roomSettings);
      return
    }
  }
  if (display == "game" && subdisplay != "dead") {
    // Spacebar Smash
    if (keyCode == 32 && smashcooldown) {
      doSmash();
      return;
    }
    // Upgrade Keybinds
    if (player.upgradePts > 0) {
      const upgradeList = {
        maxhealth: 49,
        axelength: 50,
        speed: 51
      };
      for (var i in upgradeList) {
        if (keyCode != upgradeList[i]) continue;
        if (upgrades[i] >= upgradeMaxes[i]) continue;
        upgrades[i]++;
        socket.emit('upgrade', i);
        player.upgradePts--;
        if (player.upgradePts == 0) {
          setTimeout(() => {
            upgradeDisplay = false;
          }, 1000);
        }
        return;
      }
    }
  }
  else if (display == "pmgame") {
    // Switch Tracks
    if (keyCode == 16) {
      if (cam.mode == "entity") cam.mode = "ability";
      else if (cam.mode == "ability") cam.mode = "entity";
      return;
    }
    // assets/abilities/Entities
    var list = {};
    var sel = cam.mode == "entity" ? "selE" : "selA";
    if (cam.mode == "entity") list = {
      monster: 49,
      ghost: 50,
      nuke: 51,
      speeder: 52,
      rusher: 53,
      wizard: 54,
      brute: 55,
      catapult: 56,
      debuffer: 57,
    };
    else if (cam.mode == "ability") list = {
      fog: 49,
      vines: 50,
      swarm: 51,
      shield: 52,
      generators: 53
    };
    for (var i in list) {
      if (keyCode != list[i]) continue;
      cam[sel] = i;
      return;
    }
  }
}
async function doSmash() {
  smashcooldown = false;
  socket.emit('smash');
  await wait(125);
  smashcooldown = true;
}
function mousePressed() {
  // wMouseX = (mouseX - windowWidth / 2) / windowScale;
  // wMouseY = (mouseY - windowHeight / 2) / windowScale;
  // wWidth = windowWidth / windowScale;
  // wHeight = windowHeight / windowScale;
  if (DiscordWidget.style.visibility == "visible") {
    var ondiscordwidget = mouseRect(wWidth / 2 - 208, wHeight / 2 - 368, 200, 360);
    var ondiscordwidget2 = mouseRect(wWidth / 2 - 576, wHeight / 2 - 368, 360, 360);
    if (!ondiscordwidget && !ondiscordwidget2 && mouseIsPressed) {
      DiscordWidget.style.visibility = "hidden";
      return;
    }
  }
  if (display == "home" || display == "lobby" || display == "view") {
    var overdiscordbtn = mouseRect(wWidth / 2 - 36, wHeight / 2 - 36, 26, 26);
    if (overdiscordbtn && mouseIsPressed) {
      DiscordWidget.style.visibility = "visible";
      return;
    }
  }
  if (display == "game" || display == "pmgame") {
    var overdiscordbtn = mouseRect(wWidth / 2 - 36, wHeight / 2 - 46, 26, 26);
    if (overdiscordbtn && mouseIsPressed) {
      DiscordWidget.style.visibility = "visible";
      return;
    }
  }
  if (display == "game" && subdisplay == "") {
    // Do Upgrades
    var overX = wMouseX > -wWidth / 2 && wMouseX < -wWidth / 2 + 105;
    var c = 0;
    for (var i in upgrades) {
      var over = overX && wMouseY > wHeight / 2 - 75 - 65 * c && wMouseY < wHeight / 2 - 15 - 65 * c && player.upgradePts > 0;
      if (over && upgrades[i] < upgradeMaxes[i]) {
        upgrades[i]++;
        socket.emit('upgrade', i);
        player.upgradePts--;
        if (player.upgradePts == 0) {
          setTimeout(() => {
            upgradeDisplay = false;
          }, 1000);
        }
        return;
      }
      c++;
    }
  }
  else if (display == "pmgame") {
    // Select Entities
    var t = { x: -wWidth / 2 + 35, y: wHeight / 2 - 35 };
    for (var i = 0; i < EntityIDs.length; i++) {
      var over = mouseCircle(t.x, t.y, 25);
      if (over) {
        cam.selE = EntityIDs[i];
        cam.mode = "entity";
        return;
      }
      t.x += 70;
    }
    // Select Abilities
    t = { x: -wWidth / 2 + 35, y: wHeight / 2 - 105 };
    for (var i = 0; i < AbilityIDs.length; i++) {
      var over = mouseCircle(t.x, t.y, 25);
      if (over) {
        cam.selA = AbilityIDs[i];
        cam.mode = "ability";
        return;
      }
      t.x += 70;
    }

    // Spawn Pumpkin Monsters
    var sx = (wMouseX - cam.pos.x) / cam.zoom;
    var sy = (wMouseY - cam.pos.y) / cam.zoom;
    var selAbility = AbilityDisplay[cam.selA];
    if (cam.mode == "entity") {
      sx /= 36;
      sy /= 36;
      socket.emit('spawn', cam.selE, sx, sy);
    }
    // Do Abilities
    else if (cam.mode == "ability" && selAbility.wait == false && selAbility.cost < cam.coins) {
      var rx = floor(sx / (36 * 14));
      var ry = floor(sy / (36 * 14));
      if (roomMap[rx + "," + ry]) {
        socket.emit('ability', cam.selA, rx, ry);
        selAbility.wait = true;
        setTimeout(() => {
          selAbility.wait = false;
        }, selAbility.cooldown);
      }
    }
    user.cam = cam;
  }

  if (isMobile) mousePressGUI();
}
function mouseReleased() {
  if (isMobile) mouseReleaseGUI();
}
// Scroll
document.addEventListener("wheel", function(e) {
  e.preventDefault();
  e.stopPropagation();
  if (display == "view") {
    cam.scroll -= e.deltaY;
    cam.scroll = max(cam.scroll, -roomCodes.length * 45 - 110 + wHeight);
    cam.scroll = min(cam.scroll, 0);
  }
  if (display == "pmgame") {
    applyScale(e.deltaY < 0 ? 1.05 : 0.95);
  }
}, { passive: false });
/*// document.addEventListener("touchmove", function (e) {
//   e.preventDefault();
// },{passive: false});
// document.addEventListener("gesturestart", function (e) {
//   e.preventDefault();
// },{passive: false});*/
function applyScale(s) {
  cam.zoom = cam.zoom * s;
  if (cam.zoom < 0.2 || cam.zoom > 2) {
    cam.zoom = min(max(cam.zoom, 0.2), 2);
    return;
  }
  //wMouseX = (mouseX - windowWidth / 2) / windowScale;
  //wMouseY = (mouseY - windowHeight / 2) / windowScale;
  cam.pos.x = wMouseX * (1 - s) + cam.pos.x * s;
  cam.pos.y = wMouseY * (1 - s) + cam.pos.y * s;
  user.cam = cam;
}
// Window
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  windowScale = min(windowWidth, windowHeight) / 400;
  wWidth = windowWidth / windowScale;
  wHeight = windowHeight / windowScale;
}
// Mobile GUI
var mbGUI = {};

async function loadGUI() {

  mbGUI.joystick = {};
  mbGUI.joystick.tex = LoadImage("assets/mobile/joystick.png");
  mbGUI.joystick.texPress = LoadImage("assets/mobile/joystick_press.png");
  mbGUI.joystick.texCenter = LoadImage("assets/mobile/joystick-center.png");
  mbGUI.joystick.texCenterPress = LoadImage("assets/mobile/joystick-center_press.png");
  mbGUI.joystick.isActive = false;
  mbGUI.joystick.touchpos = { x: 0, y: 0 };

  mbGUI.smash = {};
  mbGUI.smash.tex = LoadImage("assets/mobile/smash.png");
  mbGUI.smash.texPress = LoadImage("assets/mobile/smash_press.png");
}
function drawGUI() {

  if (display == "lobby") {
    translate(player.x, player.y);
  }
  if ((display == "game" && subdisplay == "") || display == "lobby") {
    push();
    tint(255, 255, 255, 138);
    var joystickTex = mbGUI.joystick.isActive ? "texPress" : "tex";
    image(mbGUI.joystick[joystickTex], -wWidth / 2 + 20, wHeight / 2 - 140, 120, 120);

    if (mbGUI.joystick.isActive) {
      var dx = wMouseX - mbGUI.joystick.touchpos.x;
      var dy = wMouseY - mbGUI.joystick.touchpos.y;
      var delta = createVector(dx, dy);
      delta.limit(50);
      delta.add(-wWidth / 2 + 50, wHeight / 2 - 110);
      image(mbGUI.joystick.texCenterPress, delta.x, delta.y, 60, 60);
    }
    else {
      image(mbGUI.joystick.texCenter, -wWidth / 2 + 50, wHeight / 2 - 110, 60, 60);
    }
    pop();


    /*
    push();
    tint(255,255,255,138);
    var joystickTex = mbGUI.joystick.isActive ? "texPress" : "tex";

    if (mbGUI.joystick.isActive) {
      image(mbGUI.joystick[joystickTex], mbGUI.joystick.touchpos.x, mbGUI.joystick.touchpos.y, 120, 120);
      var dx = wMouseX - mbGUI.joystick.touchpos.x;
      var dy = wMouseY - mbGUI.joystick.touchpos.y;
      var delta = createVector(dx,dy);
      delta.limit(50);
      delta.add(mbGUI.joystick.touchpos.x,mbGUI.joystick.touchpos.y);
      image(mbGUI.joystick.texCenterPress, delta.x, delta.y, 60, 60);
    }
    else {
      image(mbGUI.joystick[joystickTex], -wWidth/2+20, wHeight/2-140, 120, 120);
      image(mbGUI.joystick.texCenter, -wWidth/2+50, wHeight/2-110, 60, 60);
    }
    pop();*/
  }

  if (display == "game" && subdisplay == "") {
    push();
    tint(255, 255, 255, 182);
    var smashTex = mouseCircle(wWidth / 2 - 80, wHeight / 2 - 80, 120) && mouseIsPressed ? "texPress" : "tex";
    image(mbGUI.smash[smashTex], wWidth / 2 - 140, wHeight / 2 - 140, 120, 120);
    pop();
  }

  //if (display == "game" || display == "pmgame" || display == "lobby" || display == "host") {
  //exit();
  //}
}
function mousePressGUI() {
  if (display != "game" && display != "lobby") return;
  if (smashcooldown && display == "game" && subdisplay == "" && mouseCircle(wWidth / 2 - 80, wHeight / 2 - 80, 120)) {
    doSmash();
  }
  if (mouseCircle(-wWidth / 2 + 80, wHeight / 2 - 80, 120)) {
    mbGUI.joystick.isActive = true;
    mbGUI.joystick.touchpos.x = wMouseX;
    mbGUI.joystick.touchpos.y = wMouseY;
  }
}
function mouseReleaseGUI() {
  if (display != "game" && display != "lobby" && display != "host") return;
  mbGUI.joystick.isActive = false;
  mbGUI.joystick.touchpos.x = 0;
  mbGUI.joystick.touchpos.y = 0;
}
//
function mouseRect(x, y, w, h) {
  return wMouseX > x && wMouseX < x + w && wMouseY > y && wMouseY < y + h;
}
function mouseCircle(x, y, r) {
  var dx = wMouseX - x;
  var dy = wMouseY - y;
  return dx * dx + dy * dy < r * r;
}

// ------------------
// Socket Connections
// ------------------

// Start Game
socket.on('timer', function(t) {
  timeleft = t;
});
socket.on('start', async function(time, quick) {
  setDisplay("loading", "game");
  console.log("Game started!");
  startTime = time + 5000;
  if (!quick) await wait(5000);
  else await wait(1000);
  setDisplay(player.pumpkinMaster ? "pmgame" : "game");
  var backgroundMusic = async function() {
    if (sounds.background.some(m => m.sound.currentTime != 0)) return;
    var snd = sounds.background[floor(Math.random() * sounds.background.length)];
    await snd.play(0.5);
    await wait(5000);
    if (snd.sound.ended) snd.stop();
    if (display != "pmgame" && display != "game") {
      return;
    }
    backgroundMusic();
  };
  if (!quick) backgroundMusic();
});
socket.on('setTime', async function(time) {
  startTime = time;
});
socket.on('PM', function(isPM) {
  if (isPM) {
    player.pumpkinMaster = true;
    cam.pos = {
      x: -(15 / 2) * 36,
      y: -(15 / 2) * 36
    }
    cam.zoom = 1;
    cam.coins = 0;
    cam.selE = "monster";
    cam.selA = "fog";
    cam.mode = "entity";
    console.log("Selected as Pumpkin Master");
  } else {
    console.log("Stayed a Skeleton");
  }
});
// Joins and Rooms
socket.on('roomCodes', function(codes) {
  if (display == "loading" && subdisplay == "view") {
    setDisplay("view");
    cam.scroll = 0;
  }
  roomCodes = codes.sort((a, b) => b.amount - a.amount);
});
socket.on('room', function(r, n, s) {
  room = r;
  isNext = n;
  roomSettings = s;
  console.log("Joined Room (" + r + ")");
  if (n) console.log("It is global lobby");
});
socket.on('amount', function(a) {
  amount = a;
});
socket.on('rejoinFailed', returnToHome);
function returnToHome() {
  user.lastSession = {};
  localStorage.user = JSON.stringify(user);
  //location.href = location.origin;
  setDisplay("home");
  history.pushState({}, "", location.origin);
}
socket.on('rejoinSuccess', function(id) {
  player.id = id;
  user.lastSession.id = player.id;
});
// Tick Room data
var lastPlayersRecieved = 0;
socket.on('players', function(packedPlayers, id, sentAt) {
  if (document.hidden) return;
  if (sentAt < lastPlayersRecieved) return;
  lastPlayersRecieved = sentAt;
  /*for (var i in players) {
    if (!packedPlayers[i]) delete players[i];
  }
  for (var i in packedPlayers) {
    if (!players[i]) players[i] = {};
    var p = players[i];
    var pp = packedPlayers[i];
    p.x = pp.x * 36;
    p.y = pp.y * 36;
    p.facing = pp.facing;
    p.skin = pp.skin;
    p.health = pp.health;
    p.maxhealth = pp.maxhealth;
    p.swing = pp.swing;
    p.axelength = pp.axelength;
    p.countdown = pp.countdown;
    p.pumpkinMaster = pp.pumpkinMaster;
    p.name = pp.name;

    p.swing = p.swing ?? 0;
    p.swingint = p.swingint ?? false;
  }
  player = players[id];
  player.id = id;
  player.score = packedPlayers[id].score;
  player.level = packedPlayers[id].level;*/

  players = packedPlayers
  for (var i in players) {
    players[i].x *= 36;
    players[i].y *= 36;
  }
  player = players[id];
  player.id = id;

});

var lastEntitiesRecieved = 0;
socket.on('entities', function(packedEntityDisplay, sentAt) {
  if (document.hidden) return;
  if (sentAt < lastEntitiesRecieved) return;
  lastEntitiesRecieved = sentAt;

  entities = packedEntityDisplay;
  for (var i = 0; i < entities.length; i++) {
    entities[i].x *= 36;
    entities[i].y *= 36;
  }
});
var lastAbilitiesRecieved = 0;
socket.on('abilities', function(fogList, vineList, theShield, generatorsMap, sentAt) {
  if (document.hidden) return;
  if (sentAt < lastAbilitiesRecieved) return;
  lastAbilitiesRecieved = sentAt;

  // Fogs
  fogs = fogList;
  for (var i = 0; i < fogs.length; i++) {
    fogs[i].x *= 36;
    fogs[i].y *= 36;
    fogs[i].thick = min(fogs[i].thick, 4);
  }
  // Vines
  vines = vineList;
  for (var i = 0; i < vines.length; i++) {
    vines[i].x *= 36;
    vines[i].y *= 36;
  }
  // Singular Shield
  shield = theShield;
  if (shield) {
    shield.x *= 36;
    shield.y *= 36;
  }
  // Generators
  generators = generatorsMap;
  for (var i in generators) {
    generators[i].x *= 36;
    generators[i].y *= 36;
  }
});
socket.on('coins', function(coins) {
  if (document.hidden) return;
  if (!player.pumpkinMaster) return;
  cam.coins = coins;
});
// Room Data
socket.on('tilemap', function(map, rmap, maxWidth, maxHeight, minX, minY) {
  //Get the random room
  tilemap = map;
  roomMap = rmap;
  minTileX = minX;
  minTileY = minY;

  //for (var i = 0; i < entities.length; i++) {
  //  entities[i].pos.x -= 14*18;
  //  entities[i].pos.y -= 14*18;
  //}

  pumpkinBuf = createGraphics(maxWidth * 36, maxHeight * 36);
  pumpkinBuf.scale(36, 36);
  pumpkinBuf.translate(-minTileX, -minTileY);
  pumpkinBuf.noStroke();

  mapBuf = createGraphics(maxWidth * 36, maxHeight * 36);
  mapBuf.scale(36, 36);
  mapBuf.translate(-minTileX, -minTileY);
  mapBuf.noStroke();

  //miniMapBuf = createGraphics(maxWidth*6,maxHeight*6);
  //miniMapBuf.scale(6,6);
  //miniMapBuf.translate(-minTileX,-minTileY);
  //miniMapBuf.noStroke();
  for (var i in roomMap) {
    var rx = Number(i.match(/(.*?),/)[1]);
    var ry = Number(i.match(/,(.*)/)[1]);
    mapBuf.fill("#123904");
    mapBuf.rect(rx * 14, ry * 14, 15, 15);
    //miniMapBuf.fill("#123904");
    //miniMapBuf.rect(rx*14,ry*14,15,15);
  }
  for (var y in tilemap) {
    y = Number(y);
    for (var x in tilemap[y]) {
      x = Number(x);
      var id = tilemap[y][x];
      if (id == 0) continue;
      tileIDs[id].render(x, y, tilemap);
      //tileIDs[id].miniRender(x,y);
    }
  }
});
socket.on('objective', function(objectiveList) {
  objectives = objectiveList;
  for (var i = 0; i < objectives.length; i++) {
    objectives[i].x *= 36;
    objectives[i].y *= 36;
  }
});
// Events
socket.on('candies', function(candies) {
  alert(JSON.stringify(candies));
  candies = candies;
  for (var i in candies) {
    candies[i].x *= 36;
    candies[i].y *= 36;
  }
});
socket.on('growpumpkin', async function(p) {
  pumpkins[p.x + "," + p.y] = p;
  if (!pumpkinBuf) return;
  if (!document.hidden) {
    var time = 5000;
    var seg = 20;
    for (var i = 0; i <= time; i += time / seg) {
      await wait(time / seg);
      if (!pumpkins[p.x + "," + p.y]) return;
      pumpkinBuf.push();
      pumpkinBuf.translate(p.x + 0.5, p.y + 0.5);
      pumpkinBuf.scale(i / time, i / time);
      textures.newpumpkin.show(5 / 6, 0, pumpkinBuf);
      pumpkinBuf.pop();
    }
    if (!pumpkins[p.x + "," + p.y]) return;
  }
  pumpkinBuf.push();
  pumpkinBuf.translate(p.x + 0.5, p.y + 0.5);
  switch (p.type) {
    case 0:
      textures.pumpkin.show(5 / 6, 0, pumpkinBuf);
      break;
    case 1:
      textures.goldpumpkin.show(5 / 6, 0, pumpkinBuf);
      break;
    case 2:
      textures.diamondpumpkin.show(5 / 6, 0, pumpkinBuf);
      break;
  }
  pumpkinBuf.pop();
});
socket.on('allpumpkins', async function(p) {
  for (var j = 0; j < p.length; j++) {
    pumpkins[p[j].x + "," + p[j].y] = p[j];
  }
  if (!pumpkinBuf) return;
  if (!document.hidden) {
    var time = 5000;
    var seg = 20;
    for (var i = 0; i <= time; i += time / seg) {
      await wait(time / seg);
      for (var j = 0; j < p.length; j++) {
        if (!pumpkins[p[j].x + "," + p[j].y]) continue;
        pumpkinBuf.push();
        pumpkinBuf.translate(p[j].x + 0.5, p[j].y + 0.5);
        pumpkinBuf.scale(i / time, i / time);
        textures.newpumpkin.show(5 / 6, 0, pumpkinBuf);
        pumpkinBuf.pop();
      }
    }
  }
  for (var j = 0; j < p.length; j++) {
    if (!pumpkins[p[j].x + "," + p[j].y]) continue;
    pumpkinBuf.push();
    pumpkinBuf.translate(p[j].x + 0.5, p[j].y + 0.5);
    switch (p[j].type) {
      case 0:
        textures.pumpkin.show(5 / 6, 0, pumpkinBuf);
        break;
      case 1:
        textures.goldpumpkin.show(5 / 6, 0, pumpkinBuf);
        break;
      case 2:
        textures.diamondpumpkin.show(5 / 6, 0, pumpkinBuf);
        break;
    }
    pumpkinBuf.pop();
  }
});
socket.on('destroypumpkin', async function(x, y) {
  var p = pumpkins[x + "," + y];
  delete pumpkins[x + "," + y];
  var tx = (p.x + 0.5) * 36;
  var ty = (p.y + 0.5) * 36;
  if (!document.hidden) smashFX(tx, ty);

  if (!pumpkinBuf) return;
  pumpkinBuf.push();
  pumpkinBuf.erase(255, 0);
  pumpkinBuf.translate(p.x, p.y);
  pumpkinBuf.rect(0, 0, 1, 1);
  pumpkinBuf.noErase();
  pumpkinBuf.pop();
});
socket.on('hit', function(x, y) {
  if (document.hidden) return;
  smashFX(x * 36, y * 36);
});
/*socket.on('swing',function(id) {
  var p = players[id];

  // Swing animation
  p.swing = 0;
  if (p.swingint) {
    clearInterval(p.swingint);
  }
  p.swingint = setInterval(() => {
    p.swing++;
  }, 12);
  setTimeout(() => {
    clearInterval(p.swingint);
    p.swingint = false;
    p.swing = 0;
  }, 125);
});*/
socket.on('dead', function() {
  setDisplay("game", "dead");
});
socket.on('revive', function() {
  setDisplay("game");
});
socket.on('lvlUp', function(lvls) {
  player.upgradePts++;
  upgradeDisplay = true;
  upgrades = lvls;
});
socket.on('objective_destroyed', function(x, y) {
  startTime += 60 * 1000;
  if (document.hidden) return;
  smashFX(x * 36, y * 36);
});
var tutorialMsg = false;
var tutorialPumpkin = false;
socket.on('tutorialMsg', function(msg, p) {
  tutorialMsg = msg;
  tutorialPumpkin = p;
})
// Win Conditions
socket.on('skeleton_win', async function() {
  console.log("Skeletons Win!");
  subdisplay = "animation";
  for (var i in pumpkins) {
    var p = pumpkins[i];
    delete pumpkins[i];
    if (document.hidden) continue;
    var tx = (p.x + 0.5) * 36;
    var ty = (p.y + 0.5) * 36;
    smashFX(tx, ty);
  }
  pumpkinBuf.clear();
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (document.hidden) continue;
    smashFX(e.x, e.y);
  }
  entities = [];
  if (!player.pumpkinMaster) {
    spawnConfetti();
  }
  await wait(5000);
  setDisplay("gameover", player.pumpkinMaster ? "lose" : "win");
  endGame();
});
socket.on('pumpkin_master_win', async function() {
  console.log("Pumpkin Master Wins!")
  subdisplay = "animation";
  for (var i in players) {
    players[i].health = 0;
  }
  if (player.pumpkinMaster) {
    spawnConfetti();
  }
  await wait(5000);
  setDisplay("gameover", player.pumpkinMaster ? "win" : "lose");
  endGame();
});
function spawnConfetti() {
  if (document.hidden) return;
  for (var i = 0; i < 200; i++) {
    c = {};
    c.pos = createVector(random() * 200 - 100, wHeight / 2);
    c.vel = p5.Vector.fromAngle(-HALF_PI + (random() ** 1.2) * (round(random()) * 2 - 1));
    c.vel.mult(15 + random() * 8);
    c.color = color(random() * 255, random() * 255, random() * 255);
    c.size = random() + 0.5;
    confetti.push(c);
  }
}
function endGame() {
  confetti = [];
  for (var i in sounds.background.length) {
    sounds.background[i].stop();
  }
}

function changeUsername() {
  var name = homeDis.username.value;
  name = censor(name);
  socket.emit('changeName', name);
  user.name = homeDis.username.value;
}

function censor(str) {
  const censoredWords = ["(mother|)fuck", "\bass", "bitch", "(bull|)shit", "nigg(er|a)", "cock", "cunt", "clit", "pussy", "penis", "dick", "porn", "satan", "damn", "dyke", "gang[-_\s]*bang", "jizz", "piss", "\btit", "blow[-_\s]*job", "hand[-_\s]*job", "\bcoon", "\bcum", "\bcumm", "slut", "pimp", "\bsex", "tits", "tities"];
  for (var word of censoredWords) {
    str = str.replaceAll(new RegExp(word + "(er|ers|ing|ed|s|es|hole|holes|ical|)", 'ig'), (w) => "*".repeat(w.length));
  }
  return str;
}

// --------------
// Misc Functions
// --------------

function randomString(length) {
  var key = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    key += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return key;
}
function weightedRandom(randomfunct, def, values, weights) {
  var prob = randomfunct();
  for (var i = 0; i < values.length; i++) {
    if (prob < weights[i]) {
      return values[i];
    }
    prob -= weights[i];
  }
  return def;
}
function format(Fill, Stroke, StrokeWidth, TextSize, TextAlign) {
  if (Fill || Fill === 0) fill(Fill);
  else noFill();

  if (Stroke || Stroke === 0) stroke(Stroke);
  else noStroke();

  strokeWeight(StrokeWidth ?? 1);
  textSize(TextSize ?? 10);
  textAlign(TextAlign ?? LEFT);
}
function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
function mod(x, y) {
  return x - floor(x / y) * y;
}

// Hehehe
/*
var counter = 0;
setInterval(()=>{
    document.body.style.filter = "hue-rotate("+counter+"deg)";
    counter += 1;
    counter %= 360;
},10);
*/
//setInterval(()=>{socket.emit('smash');},10);



