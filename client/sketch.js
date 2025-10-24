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

//var io=window.io||function(){return {on:()=>{},emit:()=>{}}};
//setTimeout(()=>{loaded = toLoad},5000);
var __cpLocation = window["\x6cocation"];

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
    changeHat();
  }
});
socket.on("disconnect", async () => {
  console.log("Disconnected");
  for (var i = 0; i < 15; i++) {
    socket.connect();
    await wait(1000);
    if (socket.connected) return;
  }
  __cpLocation.reload();
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
  //__cpLocation.href = __cpLocation.origin+"/instructions";
}
homeDis.clickSettings = function() {
  setDisplay("settings");
};
var settingsDis = {};
settingsDis.div = document.getElementById("settingsDis");
settingsDis.clickWardrobe = function() {
  setDisplay("wardrobe");
  wardrobeDis.selectedHat = user.hat || "";
  var hats = document.getElementsByClassName("hat");
  outer: for (var i = 0; i < hats.length; i++) {
    var h = hats[i];
    var n = h.id.slice(4);
    h.classList.remove("disabled");
    h.classList.remove("selected");
    if (n == wardrobeDis.selectedHat) h.classList.add("selected");
    if (!n) continue;
    for (var a in AchievementData) {
      if (AchievementData[a].hat != n) continue;
      if (user.achievements[a]) continue;
      h.classList.add("disabled");
      continue outer;
    }
  }
};
settingsDis.clickAchievements = function() {
  setDisplay("achievements");
  var achs = document.getElementsByClassName("achievement");
  for (var i = 0; i < achs.length; i++) {
    achs[i].classList.remove("earned");
    var n = achs[i].id.slice(4);
    var a = AchievementData[n];
    var p = (a.progress(user.stats) * 100).toFixed(1);
    achs[i].children[a.hat?1:0].innerText = a.name+" ("+p+"%)";
  }
  for (var i in user.achievements) {
    var ach = document.getElementById("ach_"+i);
    ach.classList.add("earned");
    var a = AchievementData[i];
    ach.children[1].innerText = a.name+" (100.0%)";
  }
};
settingsDis.clickStats = function() {
  statDis.updateStats(user.stats);
  setDisplay("stats");
};
settingsDis.clickKeybinds = function() {
  keybindDis.update();
  setDisplay("keybinds");
};
settingsDis.clickDisplay = function() {
  keybindDis.update();
  setDisplay("display");
};
settingsDis.clickMisc = function() {
  keybindDis.update();
  setDisplay("misc");
};
settingsDis.clickReturn = function() {
  setDisplay("home");
};
var wardrobeDis = {};
wardrobeDis.div = document.getElementById("wardrobeDis");
wardrobeDis.wardrobe = document.getElementById("wardrobe");
wardrobeDis.clickReturn = function() {
  setDisplay("settings");
  user.hat = wardrobeDis.selectedHat;
  changeHat();
};
wardrobeDis.selectedHat = "";
wardrobeDis.selectHat = function(hat) {
  var oldhat = document.getElementById("hat_"+wardrobeDis.selectedHat);
  var newhat = document.getElementById("hat_"+hat);
  if (newhat.classList.contains("disabled")) return;
  oldhat.classList.remove("selected");
  wardrobeDis.selectedHat = hat;
  newhat.classList.add("selected");
}
var statDis = {};
statDis.div = document.getElementById("statDis");
statDis.stats = document.getElementById("stats");
statDis.clickReturn = function() {
  setDisplay("settings");
};
statDis.updateStats = function(stats) {
  var serialize = function(obj,depth) {
    var txt = "";
    var start = "";
    for (var i = 0; i < depth; i++) start += " - ";
    for (var i in obj) {
      txt += start+i+": "
      if (obj[i] instanceof Object) {
        txt += "\n"+serialize(obj[i],depth+1);
        continue;
      }
      txt += obj[i]+"\n";
    }
    return txt;
  };
  statDis.stats.innerText = serialize(stats,0);
};
var achievementDis = {};
achievementDis.div = document.getElementById("achievementDis");
achievementDis.list = document.getElementById("achievementList");
achievementDis.clickReturn = function() {
  setDisplay("settings");
};
var keybindDis = {};
keybindDis.div = document.getElementById("keybindDis");
keybindDis.panel = document.getElementById("keybindPanel");
keybindDis.update = function() {
  importSettings(user.settings||{},settingsIdMap);
}
keybindDis.clickReturn = function() {
  exportSettings(settingsIdMap,user.settings);
  setDisplay("settings");
};
var displayDis = {};
displayDis.div = document.getElementById("displayDis");
displayDis.panel = document.getElementById("displayPanel");
displayDis.update = function() {
  importSettings(user.settings||{},settingsIdMap);
}
displayDis.clickReturn = function() {
  exportSettings(settingsIdMap,user.settings);
  setDisplay("settings");
};
var miscDis = {};
miscDis.div = document.getElementById("miscDis");
miscDis.panel = document.getElementById("miscPanel");
miscDis.update = function() {
  importSettings(user.settings||{},settingsIdMap);
};
miscDis.clickReturn = function() {
  exportSettings(settingsIdMap,user.settings);
  setDisplay("settings");
};
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
defaultUser.hat = "";
defaultUser.doneTutorial = false;
defaultUser.settings = {};
defaultUser.stats = {};
defaultUser.achievements = {};
var AchievementData = {
  "new_recruit": {
    name: "New Recruit",
    description: "Complete the entire tutorial",
    hat: false,
    test: function(match, cumulative) {
      return cumulative.TutorialComplete;
    },
    progress: function(cumulative) {
      return 0;
    }
  },
  "full_party": {
    name: "Full Party",
    description: "Play a full game with 4 or more players",
    hat: "party_hat",
    test: function(match, cumulative) {
      return match.PlayerCount >= 4;
    },
    progress: function(cumulative) {
      return 0;
    }
  },
  "gentleman": {
    name: "Gentleman",
    description: "Max out one of your upgrades as skeleton",
    hat: "tophat",
    test: function(match, cumulative) {
      for (var i in match.Upgrades) if (match.Upgrades[i] >= 4) return true;
      return false;
    },
    progress: function(cumulative) {
      return 0;
    }
  },
  "no_deaths": {
    name: "No Deaths",
    description: "No deaths as skeleton in a single match",
    hat: "pumpkin",
    test: function(match, cumulative) {
      if (!match.PlayedAsSkeleton) return;
      return match.Deaths == 0;
    },
    progress: function(cumulative) {
      return 0;
    }
  },
  "rusher_killer": {
    name: "Rusher Killer",
    description: "Kill 40 rushers",
    hat: "red_beanie",
    test: function(match, cumulative) {
      return cumulative.EntitiesKilled?.rusher >= 40;
    },
    progress: function(cumulative) {
      return cumulative.EntitiesKilled?.rusher / 40;
    }
  },
  "wizard_killer": {
    name: "Wizard Killer",
    description: "Kill 40 wizards",
    hat: "blue_beanie",
    test: function(match, cumulative) {
      return cumulative.EntitiesKilled?.wizard >= 40;
    },
    progress: function(cumulative) {
      return cumulative.EntitiesKilled?.wizard / 40;
    }
  },
  "debuffer_killer": {
    name: "Debuffer Killer",
    description: "Kill 20 debuffers",
    hat: "green_beanie",
    test: function(match, cumulative) {
      return cumulative.EntitiesKilled?.debuffer >= 20;
    },
    progress: function(cumulative) {
      return cumulative.EntitiesKilled?.debuffer / 20;
    }
  },
  "ghost_infighting": {
    name: "Ghost Infighting",
    description: "Kill 5 ghosts with ghost candy",
    hat: false,
    test: function(match, cumulative) {
      return cumulative.GhostsKilledWithGhost >= 5;
    },
    progress: function(cumulative) {
      return 0;
    }
  },
  /*"witch_lover": {
    name: "Witch Lover",
    description: "Spawn 100 wizards, rushers, or debuffers",
    hat: "witch_hat",
    test: function(match, cumulative) {
      //return cumulative.EntitiesKilled?.wizard >= 40;
    },
    progress: function(cumulative) {
      //return cumulative.EntitiesKilled?.wizard / 40;
    }
  },*/
};
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
EntityIDs[7] = "mine";
EntityIDs[8] = "catapult";
EntityIDs[9] = "debuffer";
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
EntityDisplay.mine = (function() {
  var tex = {};
  tex.armed = new FitImage("assets/entities/mine/armed.png");
  tex.inactive = new FitImage("assets/entities/mine/inactive.png");
  tex.ticking = new Animation("assets/entities/mine/ticking.png", 2, 8);
  tex.explode = new Animation("assets/entities/mine/explode.png", 24);
  return {
    cost: 10,
    pumpkin: true,
    icon: function() {
      tex.armed.show(0, 40);
    },
    display: function(e) {
      if (e.img == "exploding") {
        var frame = Math.floor((Date.now()-e.f_start)/75) + (e.f || 0);
        if (frame < 24) tex.explode.show(0, 36 * tex.explode.h / tex.armed.h, frame);
      } else tex[e.img].show(0, 36, e.f);
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
    wait: 0,
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
  var grow = function(v) {
    var t = (Date.now()-v.spawnedAt)/1000;
    if (t > 1) return 36;
    return 36*Math.sqrt(t);
  };
  return {
    cost: 8,
    cooldown: 1,
    wait: 0,
    icon: function() {
      icon.show(0, 40);
    },
    horiz: function(v) {
      horizVines.show(0, grow(v));
    },
    vert: function(v) {
      vertVines.show(grow(v), 0);
    }
  };
});
AbilityDisplay.swarm = (function() {
  var icon = new FitImage("assets/abilities/swarm/icon.png");
  return {
    cost: 22,
    cooldown: 10 * 1000,
    wait: 0,
    icon: function() {
      icon.show(0, 40);
    }
  };
});
AbilityDisplay.shield = (function() {
  var icon = new FitImage("assets/abilities/shield/icon.png");
  var shieldImg = new Animation("assets/abilities/shield/shield.png", 3, 8);
  return {
    cost: 75,
    cooldown: 180 * 1000,
    wait: 0,
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
    cost: 18,
    cooldown: 1,
    wait: 0,
    icon: function() {
      icon.show(0, 40);
    },
    show: function(g) {
      generatorImg.show(0, 180);
      var seconds = 1000 / g.amount;
      var percent = fract(Date.now() / seconds);
      translate(0, -25 * percent + 10);
      if (percent >= 0.85) {
        if (g.amount >= 1) {
          textures.diamondpumpkin.show(percent * 60);
        } else if (g.amount >= 0.7) {
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
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(255, 200, 128);
      f(s);
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.smarties = (function() {
  var candy = new FitImage("assets/candies/smarties.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      f(3);
    }
  };
});
CandyDisplay.peppermint = (function() {
  var candy = new FitImage("assets/candies/peppermint.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      f(s);
    }
  };
});
CandyDisplay.lolipop = (function() {
  var candy = new FitImage("assets/candies/lolipop.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(255, 170, 255);
      f(s);
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.hot_tamale = (function() {
  var candy = new FitImage("assets/candies/hot-tamale.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(255, 128, 128);
      f(s);
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.ghost_chew = (function() {
  var candy = new FitImage("assets/candies/ghost-chew.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(255, 255, 255, 128);
      f(s);
      tint(255, 255, 255, 255);
    }
  };
});
CandyDisplay.chocolate = (function() {
  var candy = new FitImage("assets/candies/chocolate.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(160, 120, 100);
      f(s);
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.candied_apple = (function() {
  var candy = new FitImage("assets/candies/candied-apple.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(150, 200, 150);
      f(s);
      tint(255, 255, 255);
    }
  };
});
CandyDisplay.blue_candy = (function() {
  var candy = new FitImage("assets/candies/blue-candy.png");
  return {
    show: function() {
      candy.show(36, 36);
    },
    active: function(p,f,s) {
      tint(170, 170, 255);
      f(s);
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
    this.url = url;
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
class HatDisplay {
  constructor(url,x,y) {
    this.hat = new FitImage(url);
    this.x = x;
    this.y = y;
  }
  show(w,h,sel) {
    var tex = textures.skeleton[sel];
    var hat = this.hat;
    var hw = w * this.hat.w / tex.w;
    var hh = h * this.hat.h / tex.h;
    var dx = (this.x + tex.hatdx) / tex.w * w + (hw-w)/2;
    var dy = (this.y + tex.hatdy) / tex.w * w + (hh-h)/2;
    translate(dx,dy);
    hat.show(hw, hh);
    translate(-dx,-dy);
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


  var SkeletonImg = function(url,dx,dy,) {
    var img = new FitImage(url);
    img.hatdx = dx;
    img.hatdy = dy;
    return img;
  }

  // Skeleton Assets
  textures.skeleton = [];
  textures.skeleton[0] = new SkeletonImg("assets/skeleton/1.png",-2,-4);
  textures.skeleton[1] = new SkeletonImg("assets/skeleton/2.png",2,-2);
  textures.skeleton[2] = new SkeletonImg("assets/skeleton/3.png",0,0);
  textures.skeleton[3] = new SkeletonImg("assets/skeleton/joining.png",0,0);
  textures.bone_pile = new FitImage("assets/skeleton/bone_pile.png");
  textures.axe = new FitImage("assets/skeleton/axe.png");

  // Pumpkins
  textures.pumpkin = new FitImage("assets/pumpkins/pumpkin.png");
  textures.newpumpkin = new FitImage("assets/pumpkins/new_pumpkin.png");
  textures.goldpumpkin = new FitImage("assets/pumpkins/gold_pumpkin.png");
  textures.diamondpumpkin = new FitImage("assets/pumpkins/diamond_pumpkin.png");
  textures.gutsplat = new Animation("assets/pumpkins/gut_splat.png", 5);

  textures.objective = new FitImage("assets/pumpkins/objective.png");

  // Hats
  textures.hats = {};
  textures.hats.tophat = new HatDisplay("assets/hats/tophat.png",8,2);
  textures.hats.black_red_tophat = new HatDisplay("assets/hats/black_red_tophat.png",8,2);
  textures.hats.mad_hatter = new HatDisplay("assets/hats/mad_hatter.png",8,2);
  textures.hats.purple_tophat = new HatDisplay("assets/hats/purple_tophat.png",8,2);
  textures.hats.brown_tophat = new HatDisplay("assets/hats/brown_tophat.png",8,2);
  textures.hats.white_tophat = new HatDisplay("assets/hats/white_tophat.png",8,2);
  textures.hats.sombrero = new HatDisplay("assets/hats/sombrero.png",0,16);
  textures.hats.fedora = new HatDisplay("assets/hats/fedora.png",8,16);
  textures.hats.white_fedora = new HatDisplay("assets/hats/white_fedora.png",8,16);
  textures.hats.beach_sunhat = new HatDisplay("assets/hats/beach_sunhat.png",2,14);
  textures.hats.sunhat = new HatDisplay("assets/hats/sunhat.png",4,14);
  textures.hats.cowboy = new HatDisplay("assets/hats/cowboy.png",8,10);
  textures.hats.dark_cowboy = new HatDisplay("assets/hats/dark_cowboy.png",8,10);
  textures.hats.sheriff = new HatDisplay("assets/hats/sheriff.png",8,10);
  textures.hats.witch_hat = new HatDisplay("assets/hats/witch_hat.png",4,4);
  textures.hats.purple_witch_hat = new HatDisplay("assets/hats/purple_witch_hat.png",4,6);
  textures.hats.green_witch_hat = new HatDisplay("assets/hats/green_witch_hat.png",6,0);
  textures.hats.orange_witch_hat = new HatDisplay("assets/hats/orange_witch_hat.png",6,0);
  textures.hats.pirate = new HatDisplay("assets/hats/pirate.png",6,6);
  textures.hats.demon_horns = new HatDisplay("assets/hats/demon_horns.png",14,20);
  textures.hats.halo = new HatDisplay("assets/hats/halo.png",14,10);
  textures.hats.bow = new HatDisplay("assets/hats/bow.png",8,20);
  textures.hats.doctor = new HatDisplay("assets/hats/doctor.png",14,28);
  textures.hats.shades = new HatDisplay("assets/hats/shades.png",14,38);
  textures.hats.durag = new HatDisplay("assets/hats/durag.png",8,24);
  textures.hats.chef = new HatDisplay("assets/hats/chef.png",8,2);
  textures.hats.party_hat = new HatDisplay("assets/hats/party_hat.png",14,4);
  textures.hats.crown = new HatDisplay("assets/hats/crown.png",12,20);
  textures.hats.pumpkin = new HatDisplay("assets/hats/pumpkin.png",14,20);
  textures.hats.santa = new HatDisplay("assets/hats/santa.png",0,12);
  textures.hats.red_beanie = new HatDisplay("assets/hats/red_beanie.png",12,12);
  textures.hats.orange_beanie = new HatDisplay("assets/hats/orange_beanie.png",12,12);
  textures.hats.yellow_beanie = new HatDisplay("assets/hats/yellow_beanie.png",12,12);
  textures.hats.green_beanie = new HatDisplay("assets/hats/green_beanie.png",12,12);
  textures.hats.blue_beanie = new HatDisplay("assets/hats/blue_beanie.png",12,12);
  textures.hats.magenta_beanie = new HatDisplay("assets/hats/magenta_beanie.png",12,12);
  textures.hats.red_cap = new HatDisplay("assets/hats/red_cap.png",12,12);
  textures.hats.blue_cap = new HatDisplay("assets/hats/blue_cap.png",12,12);
  textures.hats.purple_cap = new HatDisplay("assets/hats/purple_cap.png",12,12);
  textures.hats.pokemon_hat = new HatDisplay("assets/hats/pokemon_hat.png",12,12);
  textures.hats.propeller_cap = new HatDisplay("assets/hats/propeller_cap.png",10,0);
  textures.hats.red_bandana = new HatDisplay("assets/hats/red_bandana.png",8,22);
  textures.hats.black_bandana = new HatDisplay("assets/hats/black_bandana.png",8,22);
  textures.hats.among_us = new HatDisplay("assets/hats/among_us.png",16,6);
  textures.hats.viking_helmet = new HatDisplay("assets/hats/viking_helmet.png",10,12);
  textures.hats.paper_bag = new HatDisplay("assets/hats/paper_bag.png",8,6);
  textures.hats.paper_hat = new HatDisplay("assets/hats/paper_hat.png",12,12);
  textures.hats.iron_man = new HatDisplay("assets/hats/iron_man.png",14,26);
  textures.hats.jason_mask = new HatDisplay("assets/hats/jason_mask.png",14,24);
  textures.hats.scream_mask = new HatDisplay("assets/hats/scream_mask.png",10,20);
  
  for (var i in textures.hats) {
    var h = textures.hats[i].hat.url;
    var html = `
      <div class="hat" id="hat_${i}" onclick="wardrobeDis.selectHat('${i}')">
        <img class="hat-image" src="${h}">
      </div>
    `;
    wardrobeDis.wardrobe.innerHTML += html;
  }
  for (var a in AchievementData) {
    var ach = AchievementData[a];
    var h = textures.hats[ach.hat];
    var html = `
      <div class="achievement" id="ach_${a}">
        ${h?`<img class="achievement-hat-image" src="${h.hat.url}">`:''}
        <h3 class="achievement-name">${ach.name}</h3>
        <p class="achievement-desc">${ach.description}</p>
      </div>
    `;
    achievementDis.list.innerHTML += html;
  }

  // Load Displays
  for (var i in EntityDisplay) {
    EntityDisplay[i] = EntityDisplay[i]();
  }
  for (var i in AbilityDisplay) {
    AbilityDisplay[i] = AbilityDisplay[i]();
  }
  for (var i in CandyDisplay) {
    CandyDisplay[i] = CandyDisplay[i]();
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

  gui.trick_or_treat = new FitImage("assets/candies/trick-or-treat.png");

  if (isMobile) await loadGUI();
}
// Load Counting
var toLoad = 0;
var loaded = 0;
var failures = [];
function LoadImage(url, call) {
  toLoad++;
  return loadImage(url, (img) => {
    loaded++;
    if (call) call(img);
  },()=>{
    loaded++;
    failures.push(url);
  });
}
function LoadSound(url, call) {
  toLoad++;
  //return createAudio(url,(snd)=>{
  return loadSound(url, (snd) => {
    loaded++;
    if (call) call(snd);
  },()=>{
    loaded++;
    failures.push(url);
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
  document.getElementById("loading").style.visibility = "hidden";
  
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
  setupSettings();
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
  settingsDis.div.style.visibility = display == "settings" ? "visible" : "hidden";
  wardrobeDis.div.style.visibility = display == "wardrobe" ? "visible" : "hidden";
  statDis.div.style.visibility = display == "stats" ? "visible" : "hidden";
  achievementDis.div.style.visibility = display == "achievements" ? "visible" : "hidden";
  keybindDis.div.style.visibility = display == "keybinds" ? "visible" : "hidden";
  displayDis.div.style.visibility = display == "display" ? "visible" : "hidden";
  miscDis.div.style.visibility = display == "misc" ? "visible" : "hidden";

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
    if (Date.now()-tutorialDate > 1000) {
      format("#ffa500", false, 1, 8, RIGHT);
      text("ENTER to continue", 145, 33);
    }
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
    if (keyIsDown(13) && Date.now()-tutorialDate > 1000) {
      tutorialDate = Date.now();
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
    var hmax = Math.max(player.maxhealth,Math.ceil(player.health));
    var hw = (hmax - 1) * 40;
    translate(-hw / 2, wHeight / 2 - 40);
    var h = player.health;
    for (var i = 0; i < hmax; i++) {
      if (i >= player.maxhealth) tint(128,255,176);
      gui[h > (i + 0.5) ? "bone" : h > i ? "bone_damaged" : "bone_broken"].show(40);
      if (i >= player.maxhealth) tint(255,255,255);
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

    // Trick or Treat
    var time = Date.now()-TrickOrTreatDate;
    if (time < 5000) {
      push();
      format(255, false, 1, 12, CENTER);
      if (time > 3000) {
        var opacity = Math.floor((time-3000)/2000*255);
        fill(255,opacity);
        tint(255,opacity);
      }
      text("Trick or Treat!", 0, wHeight / 2 - 50);
      //translate(-100, wHeight / 2 - 50);
      //gui.trick_or_treat.show(30,0);
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
    var selAbility = AbilityDisplay[cam.selA];
    if (cam.mode == "ability" && Date.now() >= selAbility.wait && selAbility.cost < cam.coins) {
      var rx = floor(msx / (36 * 14));
      var ry = floor(msy / (36 * 14));
      if (roomMap[rx + "," + ry]) {
        push();
        scale(36, 36);
        fill(255, 255, 255, 128);
        var oldgen = generators[(rx*14)+","+(ry*14)];
        if (cam.selA == "generators" && oldgen && (oldgen.amount >= 1.2 || player.id != oldgen.spawnedBy)) {
          fill(255, 128, 128, 128);
        }
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
      grey: "#a5a5a5",
      white: "#ffffff"
    }
    var hideColors = {
      red: "#640000",
      green: "#006400",
      orange: "#644000",
      grey: "#404040",
      white: "#808080"
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
      if (Date.now() < data.wait) {
        over = "#202020";
        sel = c.grey;
        afford = c.grey;
      }
      format(over, sel, 3);
      circle(0, 0, 50);
      data.icon();
      format("#000000", afford, 2, 15, CENTER, BASELINE);
      text(txt, 0, 40);
      if (Date.now() < data.wait) {
        var time = Math.floor((data.wait-Date.now())/1000);
        format(c.white, false, 0, 20, CENTER, CENTER);
        text(time, 0, 0);
      }
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
    var w = textures.skeleton[p.skin].calc(0, 46).w;
    textures.skeleton[p.skin].show(w, 46);
    if (p.hat) textures.hats[p.hat].show(w, 46, p.skin);
    pop();
  }
  for (var i in players) {
    var p = players[i];
    if (!p) continue;
    push();
    translate(p.x, p.y);
    // Name
    format("#ffffff", false, 0, 12, CENTER);
    if (p.name == "DragonFire7z" || p.name == "DragonFireGames") fill("#ff0000");
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
      "Fog the entire map to hide the position of your shield.",
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
Displays.settings = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Settings", 0, -100);
}
Displays.wardrobe = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Wardrobe", 0, -140);
  push();
  translate(20+wWidth/4,0);
  scale(5);
  var hat = wardrobeDis.selectedHat;
  var sel = Math.floor(frameCount / 30) % 3;
  var w = textures.skeleton[sel].calc(0, 46).w;
  var aw = textures.axe.calc(0, 46).w;
  translate((w - aw) / 2, 0);
  textures.axe.show(0, 62 * (0.55 + 0.2));
  translate(-(w - aw) / 2, -0);
  // Skeleton
  textures.skeleton[sel].show(w, 46);
  if (hat) textures.hats[hat].show(w, 46, sel);
  pop();
}
Displays.stats = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Statistics", 0, -wHeight/2 + 50);
}
Displays.achievements = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Achievements", 0, -wHeight/2 + 50);
}
Displays.keybinds = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Keybinds", 0, -wHeight/2 + 50);
}
Displays.display = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Display Settings", 0, -wHeight/2 + 50);
}
Displays.misc = function() {
  format(0, "#ffa500", 10, 40, CENTER);
  text("Mischellaneous", 0, -wHeight/2 + 50);
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
    if (codes[i].next) text("Public Lobby ðŸŒ", 45, 26)
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
  // Display code
  push();
  format("#ffa500", false, 1, 20, LEFT);
  textAlign(LEFT, BOTTOM);
  if (player.pumpkinMaster) {
    text(`Skeleton Kills: ${MatchStats.SkeletonKills}`,20-wWidth/2,20-wHeight/2);
  } else {
    text(`Pumpkins Smashed: ${MatchStats.Smashed}`,20-wWidth/2,20-wHeight/2);
  }
  pop();
  //
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
  history.pushState({}, "", __cpLocation.origin);
  if (display == "lobby") {
    history.pushState({}, "", __cpLocation.origin + "?room=" + room);
    if (isNext) history.pushState({}, "", __cpLocation.origin + "?room=next");
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
  var params_str = __cpLocation.href.split('?')[1];
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
    //var alpha = lerp(128,255,vines[i].health/25);
    //tint(255,255,255,floor(alpha));
    AbilityDisplay.vines[vines[i].orient](vines[i]);
    healthBar(40, 14, vines[i].health / 25);
    pop();
  }
  if (shield) {
    push();
    translate(shield.x, shield.y);
    //var alpha = lerp(128,255,shield.health/50);
    //tint(255,255,255,floor(alpha));
    AbilityDisplay.shield.show(shield);
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
    var skele = function(sel) {
      textures.skeleton[sel].show(w, 46);
      if (p.hat) textures.hats[p.hat].show(w, 46, sel);
    }
    if (p.activeCandy) {
      var time = p.candyDuration-Date.now();
      if (time < 5000 && time % 500 < 250) skele(p.skin);
      else CandyDisplay[p.activeCandy].active(p,skele,p.skin);
    } else skele(p.skin);
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
  if (settingsIdMap.sortByDepth?.value) showing.sort((a, b) => {
    if (a.depth == b.depth) return a.y - b.y;
    return a.depth - b.depth;
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
  if (!settingsIdMap.showSmashFX?.value) return;
  var snd = floor(Math.random() * sounds.smash.length);
  sounds.smash[snd].play(1);
  new playAnimation(textures.gutsplat, 12, 50, 50, x, y);
}

// --------
// Settings
// --------

var keybindContent = [
  {
    type: "category",
    header: "Skeleton",
    content: [ // optional
      {
        type: "keybind",
        name: "Swing Axe: ",
        id: "swingAxe",
        usemouse: true,
        value: "Space"
      },
      //
      {
        type: "keybind",
        name: "Move Up: ",
        id: "moveUp",
        value: "W"
      },
      {
        type: "keybind",
        name: "Move Left: ",
        id: "moveLeft",
        value: "A"
      },
      {
        type: "keybind",
        name: "Move Down: ",
        id: "moveDown",
        value: "S"
      },
      {
        type: "keybind",
        name: "Move Right: ",
        id: "moveRight",
        value: "D"
      },
      //
      {
        type: "dropdown",
        name: "Facing Mode: ",
        id: "facingMode",
        value: "Movement",
        options: [
          { 
            name: "Movement", 
            content: [
              {
                type: "keybind",
                name: "Reverse: ",
                id: "faceReverse",
                value: "R"
              },
            ],
          },
          { 
            name: "Mouse", 
            content: []
          },
          { 
            name: "Keybind", 
            content: [
              {
                type: "keybind",
                name: "Face Left: ",
                id: "faceLeft",
                value: "Q"
              },
              {
                type: "keybind",
                name: "Face Right: ",
                id: "faceRight",
                value: "E"
              },
            ]
          },
        ],
      },
      //
      {
        type: "keybind",
        name: "Upgrade Max Health: ",
        id: "upgrademaxhealth",
        usemodifier: true,
        value: "1"
      },
      {
        type: "keybind",
        name: "Upgrade Axe Reach: ",
        id: "upgradeaxelength",
        usemodifier: true,
        value: "2"
      },
      {
        type: "keybind",
        name: "Upgrade Speed: ",
        id: "upgradespeed",
        usemodifier: true,
        value: "3"
      },
    ]
  },
  {
    type: "category",
    header: "Pumpkin Master",
    content: [
      {
        type: "keybind",
        usemouse:true,
        name: "Use Selection: ",
        id: "useSelection",
        value: "Left Click"
      },
      {
        type: "dropdown",
        name: "Keybind Mode: ",
        id: "usageMode",
        value: "Hotbar",
        options: [
          { 
            name: "Hotbar", 
            content: [ // optional
              {
                type: "keybind",
                name: "Switch Tracks: ",
                id: "switchTracks",
                value: "Shift"
              },
            ].concat(new Array(Math.max(EntityIDs.length,AbilityIDs.length)).fill(0).map((_,v)=>{
              v++;
              return {
                type: "keybind",
                name: "Slot "+v+": ",
                id: "slot"+v,
                value: (v % 10).toString()
              };
            }))
          },
          { 
            name: "Item", 
            content: [ // optional
              {
                type: "keybind",
                name: "Select Monster: ",
                id: "selectmonster",
                value: "1"
              },
              {
                type: "keybind",
                name: "Select Ghost: ",
                id: "selectghost",
                value: "2"
              },
              {
                type: "keybind",
                name: "Select Nuke: ",
                id: "selectnuke",
                value: "3"
              },
              {
                type: "keybind",
                name: "Select Speeder: ",
                id: "selectspeeder",
                value: "4"
              },
              {
                type: "keybind",
                name: "Select Rusher: ",
                id: "selectrusher",
                value: "5"
              },
              {
                type: "keybind",
                name: "Select Wizard: ",
                id: "selectwizard",
                value: "6"
              },
              {
                type: "keybind",
                name: "Select Brute: ",
                id: "selectbrute",
                value: "7"
              },
              {
                type: "keybind",
                name: "Select Mine: ",
                id: "selectmine",
                value: "8"
              },
              {
                type: "keybind",
                name: "Select Catapult: ",
                id: "selectcatapult",
                value: "9"
              },
              {
                type: "keybind",
                name: "Select Debuffer: ",
                id: "selectdebuffer",
                value: "0"
              },
              //
              {
                type: "keybind",
                name: "Select Fog: ",
                id: "selectfog",
                value: "Q"
              },
              {
                type: "keybind",
                name: "Select Vines: ",
                id: "selectvines",
                value: "W"
              },
              {
                type: "keybind",
                name: "Select Swarm: ",
                id: "selectswarm",
                value: "E"
              },
              {
                type: "keybind",
                name: "Select Shield: ",
                id: "selectshield",
                value: "R"
              },
              {
                type: "keybind",
                name: "Select Generator: ",
                id: "selectgenerator",
                value: "T"
              },
            ]
          },
        ],
      },
    ]
  },
  {
    type: "category",
    header: "Tutorial",
    content: [ // optional
      {
        type: "keybind",
        name: "Enter Freeplay: ",
        id: "enterFreeplay",
        usemodifier: true,
        value: "F"
      },
      {
        type: "keybind",
        name: "Swap Freeplay: ",
        id: "swapFreeplay",
        usemodifier: true,
        value: "P"
      },
    ]
  },
  {
    type: "category",
    header: "Lobby",
    content: [ // optional
      {
        type: "keybind",
        name: "Toggle Publicity: ",
        id: "togglePublicity",
        usemodifier: true,
        value: "Space"
      },
      {
        type: "keybind",
        name: "Decrease Start Count: ",
        id: "decreaseStartCount",
        usemodifier: true,
        value: "-"
      },
      {
        type: "keybind",
        name: "Increase Start Count: ",
        id: "increaseStartCount",
        usemodifier: true,
        value: "+"
      },
    ]
  },
  {
    type: "category",
    header: "Start Screen",
    content: [ // optional
      {
        type: "keybind",
        name: "Click Start: ",
        id: "clickStart",
        value: "Enter"
      },
      {
        type: "keybind",
        name: "Click Host: ",
        id: "clickHost",
        value: "H"
      },
      {
        type: "keybind",
        name: "Click Join: ",
        id: "clickJoin",
        value: "J"
      },
      {
        type: "keybind",
        name: "Click Tutorial: ",
        id: "clickTutorial",
        value: "T"
      }
    ]
  },
  {
    type: "category",
    header: "Mobile",
    content: [{
      type: "checkbox",
      name: "Show Mobile Controls: ",
      id: "showMobileControls",
      value: false,
      truecontent: [
        {
          type: "dropdown",
          name: "Mobile Mode: ",
          id: "mobileMode",
          value: "joystick",
          options: [
            { 
              name: "joystick", 
              content: []
            },
            { 
              name: "buttons", 
              content: []
            },
          ],
        }
      ], // optional
      falsecontent: [] // optional
    }],
  }
];
var displayContent = [
  {
    type: "category",
    header: "Performance",
    content: [{
      type: "checkbox",
      name: "Sort By Depth: ",
      id: "sortByDepth",
      value: true,
      truecontent: [],
      falsecontent: []
    },{
      type: "checkbox",
      name: "Show Smash FX: ",
      id: "showSmashFX",
      value: true,
      truecontent: [],
      falsecontent: []
    },{
      type: "checkbox",
      name: "Show Confetti: ",
      id: "showConfetti",
      value: true,
      truecontent: [],
      falsecontent: []
    }],
  }
];
var miscContent = [
  {
    type: "checkbox",
    name: "Take LSD: ",
    id: "takeLSD",
    value: false,
    truecontent: [],
    falsecontent: []
  }
];

var settingsIdMap = {};
var selectedKeybind = null;

function setupSettings() {
  settingsIdMap = {};
  renderSettings(keybindContent,settingsIdMap,keybindDis.panel);
  renderSettings(displayContent,settingsIdMap,displayDis.panel); 
  renderSettings(miscContent,settingsIdMap,miscDis.panel);
  importSettings(user.settings||{},settingsIdMap);
  Keybinds.loadKeybinds(settingsIdMap);
}
function mousePressed() {
  if (selectedKeybind) {
    const item = settingsIdMap[selectedKeybind];
    if (item.usemouse) {
      let mouseButtonName = mouseButton === LEFT ? "Left Click" :
                            mouseButton === RIGHT ? "Right Click" :
                            mouseButton === CENTER ? "Middle Click" : "Mouse Button";
      updateKeybindValue(item, mouseButtonName);
      selectedKeybind = null;
      return false;
    }
  }
  Keybinds.mousePressed();
  mousePressed2();
  if (isMobile) mousePressGUI();
}
function keyPressed() {
  if (display == "home" && document.activeElement == homeDis.username) return;
  if (selectedKeybind) {
    const item = settingsIdMap[selectedKeybind];
    let modifiers = [];
    if (item.usemodifier) {
      if (keyIsDown(SHIFT)) modifiers.push("Shift");
      if (keyIsDown(CONTROL)) modifiers.push("Ctrl");
      if (keyIsDown(ALT)) modifiers.push("Alt");
      if (keyIsDown(91)) modifiers.push("Meta");
    }

    if (!item.usemodifier || (key != "Shift" && key != "Control" && key != "Alt" && key != "Meta")) {
      var baseKey = key.length > 1 ? key : key.toUpperCase();
      if (baseKey == " ") baseKey = "Space";
      const fullKey = modifiers.length > 0 ? `${modifiers.join("+")}+${baseKey}` : baseKey;

      updateKeybindValue(item, fullKey);
      selectedKeybind = null;
      return false;
    }
  }
  Keybinds.keyPressed();
}
function keyReleased() {
  Keybinds.keyReleased();
}
function mouseReleased() {
  Keybinds.mouseReleased();
  if (isMobile) mouseReleaseGUI();
}
function renderSettings(contentArray, idMap, container) {
  contentArray.forEach(item => {
    if (item.type === "category") {
      const section = document.createElement("div");
      section.className = "section";
      section.innerHTML = `<h2>${item.header}</h2>`;
      renderContentList(item.content, idMap, section);
      container.appendChild(section);
    } else {
      renderContentList([item], idMap, container);
    }
  });
}
function renderContentList(list, idMap, parent, insertAfter = null) {
  list.forEach(item => {
    if (item.id) idMap[item.id] = item;
    let target = parent;
    if (item.type === "keybind") {
      const div = document.createElement("div");
      div.className = "keybind";
      div.setAttribute("data-id", item.id);
      div.innerHTML = `${item.name}<span class="key">${item.value}</span>`;
      div.addEventListener("click", () => {
        selectedKeybind = item.id;
        div.querySelector(".key").textContent = "Press a key...";
      });
      item.setValue = val => {
        div.querySelector(".key").textContent = val;
      };
      target.insertBefore(div, insertAfter);
    }
    else if (item.type === "checkbox") {
      const wrapper = document.createElement("div");
      wrapper.className = "checkbox-group";

      const label = document.createElement("label");
      label.textContent = item.name;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.value;
      checkbox.className = "checkbox";

      checkbox.addEventListener("change", () => {
        idMap[item.id].value = checkbox.checked;
        renderConditionalContent(item, idMap, wrapper);
      });

      item.setValue = val => {
        checkbox.checked = val;
        renderConditionalContent(item, idMap, wrapper);
      };

      wrapper.appendChild(label);
      wrapper.appendChild(checkbox);
      target.insertBefore(wrapper, insertAfter);

      renderConditionalContent(item, idMap, wrapper);
    }
    else if (item.type === "dropdown") {
      const wrapper = document.createElement("div");
      wrapper.className = "dropdown-group";

      const label = document.createElement("label");
      label.textContent = item.name;

      const select = document.createElement("select");
      select.className = "dropdown";

      item.wrapper = wrapper;
      item.options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.name;
        option.textContent = opt.name;
        select.appendChild(option);
      });

      item.setValue = val => {
        select.value = val;
        renderDropdownContent(item, idMap, wrapper);
      };

      select.value = item.value;
      select.addEventListener("change", () => {
        item.value = select.value;
        renderDropdownContent(item, idMap, wrapper);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);
      target.insertBefore(wrapper, insertAfter);

      renderDropdownContent(item, idMap, wrapper);
    }
    else if (item.type === "text") {
      const label = document.createElement("label");
      label.textContent = item.name;

      const input = document.createElement("input");
      input.type = "text";
      input.value = item.value;
      input.addEventListener("input", () => {
        item.value = input.value;
      });
      input.className = "textbox";

      item.setValue = val => {
        select.value = val;
        input.value = val;
      };

      target.insertBefore(label, insertAfter);
      target.insertBefore(input, insertAfter);
    }
  });
}
function renderConditionalContent(item, idMap, wrapper) {
  // Remove previous conditional content
  wrapper.querySelectorAll(`[data-cond="${item.id}"]`).forEach(el => el.remove());

  const content = item[idMap[item.id].value ? "truecontent" : "falsecontent"];
  if (content && content.length > 0) {
    const container = document.createElement("div");
    container.setAttribute("data-cond", item.id);
    renderContentList(content, idMap, container);
    wrapper.appendChild(container);
  }
}
function renderDropdownContent(item, idMap, parent) {
  const existing = parent.querySelectorAll(`[data-dropdown="${item.id}"]`);
  existing.forEach(el => el.remove());

  const selected = item.options.find(opt => opt.name === idMap[item.id].value);
  if (selected?.content) {
    selected.content.forEach(sub => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-dropdown", item.id);
      renderContentList([sub], idMap, wrapper);
      parent.appendChild(wrapper);
    });
  }
}
function exportSettings(idMap,result) {
  result = result || {};
  for (var i in idMap) {
    var item = idMap[i];
    result[item.id] = item.value;
  }
  return result;
}
function importSettings(settings, idMap) {
  for (var i in idMap) {
    var item = idMap[i];
    if (settings[i] !== undefined) {
      item.value = settings[i];
      if (item.setValue) item.setValue(settings[i]);
    }
  }
}
function updateKeybindValue(item, newKey) {
  var id = item.id;
  const el = document.querySelector(`[data-id="${id}"] .key`);
  if (el) el.textContent = newKey;
  item.value = newKey;
}

// --------
// Keybinds
// --------
const Keybinds = (() => {
  const keyMap = {}; // id -> keybind value (e.g. "Ctrl+A", "Right Click")
  const callbacks = {}; // id -> callback function
  const activeKeys = new Set(); // currently held keys
  const mouseButtons = new Set(); // currently held mouse buttons

  // Initialize keyMap from keybindContent
  function loadKeybinds(idMap) {
    for (var i in idMap) {
      if (idMap[i].type != "keybind") continue;
      keyMap[i] = idMap[i];
    }
  }

  // Register a callback
  function onpress(id, fn) {
    if (!callbacks[id]) callbacks[id] = [];
    callbacks[id].push(fn);
  }

  // Check if keybind is active
  function test(id) {
    const bind = keyMap[id]?.value;
    if (!bind) return false;

    const parts = bind.split("+");
    var last = parts[parts.length - 1];
    if (last == "Space") last = " ";

    const modifiers = parts.slice(0, -1);
    const hasModifiers =
      (!modifiers.includes("Ctrl") || keyIsDown(CONTROL)) &&
      (!modifiers.includes("Shift") || keyIsDown(SHIFT)) &&
      (!modifiers.includes("Alt") || keyIsDown(ALT)) &&
      (!modifiers.includes("Meta") || keyIsDown(91));

    if (!hasModifiers) return false;

    if (["Left Click", "Right Click", "Middle Click"].includes(last)) {
      return mouseButtons.has(last);
    }

    return activeKeys.has(last.toUpperCase());
  }

  // Internal event hooks
  function keyPressed() {
    activeKeys.add(key.toUpperCase());
    triggerCallbacks();
  }

  function keyReleased() {
    activeKeys.delete(key.toUpperCase());
  }

  function mousePressed() {
    const btn = mouseButton === LEFT ? "Left Click" :
                mouseButton === RIGHT ? "Right Click" :
                mouseButton === CENTER ? "Middle Click" : "Mouse Button";
    mouseButtons.add(btn);
    triggerCallbacks();
  }

  function mouseReleased() {
    mouseButtons.clear();
  }

  function triggerCallbacks() {
    for (const id in callbacks) {
      if (test(id)) {
        if (callbacks[id]) {
          for (var i = 0; i < callbacks[id].length; i++) {
            callbacks[id][i]();
          }
        }
      }
    }
  }

  function setKeybind(id, newValue) {
    keyMap[id] = newValue;
  }

  return {
    loadKeybinds,
    onpress,
    setKeybind,
    test,
    keyPressed,
    keyReleased,
    mousePressed,
    mouseReleased
  };
})();
Keybinds.onpress("clickStart",function(){
  if (display != "home") return;
  homeDis.clickStart();
});
Keybinds.onpress("clickHost",function(){
  if (display != "home") return;
  homeDis.clickHost();
});
Keybinds.onpress("clickJoin",function(){
  if (display != "home") return;
  homeDis.clickJoin();
});
Keybinds.onpress("clickTutorial",function(){
  if (display != "home") return;
  homeDis.clickTutorial();
});
Keybinds.onpress("enterFreeplay",function(){
  if (display != "game" && display != "pmgame") return;
  if (room != player.id) return;
  socket.emit('freeplay');
});
Keybinds.onpress("swapFreeplay",function(){
  if (display != "game" && display != "pmgame") return;
  if (room != player.id) return;
  socket.emit('swap');
});
Keybinds.onpress("togglePublicity",function(){
  if (display != "lobby" || subdisplay != "host") return;
  roomSettings.hidden = !roomSettings.hidden;
  socket.emit('updateSettings', room, roomSettings);
});
Keybinds.onpress("decreaseStartCount",function(){
  if (display != "lobby" || subdisplay != "host") return;
  if (roomSettings.start_count <= max(amount,2)) return; 
  roomSettings.start_count--;
  socket.emit('updateSettings', room, roomSettings);
});
Keybinds.onpress("increaseStartCount",function(){
  if (display != "lobby" || subdisplay != "host") return;
  if (roomSettings.start_count >= 12) return;
  roomSettings.start_count++;
  socket.emit('updateSettings', room, roomSettings);
});
Keybinds.onpress("swingAxe",function(){
  if (display != "game" || subdisplay == "dead") return;
  if (!smashcooldown) return;
  doSmash();
});
Object.keys(upgradeMaxes).forEach((v)=>{
  Keybinds.onpress("upgrade"+v,function(){
    if (display != "game" || subdisplay == "dead") return;
    if (player.upgradePts <= 0) return;
    if (upgrades[v] >= upgradeMaxes[v]) return;
    upgrades[v]++;
    socket.emit('upgrade', v);
    player.upgradePts--;
    if (player.upgradePts == 0) {
      setTimeout(() => {
        upgradeDisplay = false;
      }, 1000);
    }
  });
});
Keybinds.onpress("switchTracks", function(){
  if (display != "pmgame") return;
  if (settingsIdMap.usageMode.value != "Hotbar") return;
  cam.mode = cam.mode == "entity" ? "ability" : "entity";
});
(function(){
  var len = Math.max(EntityIDs.length,AbilityIDs.length);
  for (var i = 0; i < len; i++) (function(i){
    Keybinds.onpress("slot"+(i+1), function(){
      if (display != "pmgame") return;
      if (settingsIdMap.usageMode.value != "Hotbar") return;
      var sel = cam.mode == "entity" ? "selE" : "selA";
      var item = cam.mode == "entity" ? EntityIDs[i] : AbilityIDs[i];
      if (item) cam[sel] = item;
    });
  })(i);
  for (var i = 0; i < EntityIDs.length; i++) (function(i){
    Keybinds.onpress("select"+EntityIDs[i], function(){
      if (display != "pmgame") return;
      if (settingsIdMap.usageMode.value != "Item") return;
      cam.mode = "entity";
      cam.selE = EntityIDs[i];
    });
  })(i);
  for (var i = 0; i < AbilityIDs.length; i++) (function(i){
    Keybinds.onpress("select"+AbilityIDs[i], function(){
      if (display != "pmgame") return;
      if (settingsIdMap.usageMode.value != "Item") return;
      cam.mode = "ability";
      cam.selA = AbilityIDs[i];
    });
  })(i);
})();
Keybinds.onpress("useSelection",function(){
  if (display != "pmgame") return;
  // Spawn Pumpkin Monsters
  var sx = (wMouseX - cam.pos.x) / cam.zoom;
  var sy = (wMouseY - cam.pos.y) / cam.zoom;
  var selAbility = AbilityDisplay[cam.selA];
  if (cam.mode == "entity") {
    sx /= 36;
    sy /= 36;
    socket.emit('spawn', cam.selE, sx, sy);
  } else if (cam.mode == "ability" && Date.now() >= selAbility.wait && selAbility.cost < cam.coins) {
    var rx = floor(sx / (36 * 14));
    var ry = floor(sy / (36 * 14));
    if (roomMap[rx + "," + ry]) {
      socket.emit('ability', cam.selA, rx, ry);
      selAbility.wait = Date.now()+selAbility.cooldown;
    }
  }
});

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
  var u = false, d = false, l = false, r = false, f = 0;
  if (keyIsDown(38) || Keybinds.test("moveUp")) {
    u = true;
  }
  if (keyIsDown(40) || Keybinds.test("moveDown")) {
    d = true
  }
  if (keyIsDown(37) || Keybinds.test("moveLeft")) {
    l = true
  }
  if (keyIsDown(39) || Keybinds.test("moveRight")) {
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
  switch (settingsIdMap.facingMode.value) {
    case "Movement": 
      f = (r ? 1 : 0) + (l ? -1 : 0);
      if (Keybinds.test("faceReverse")) f = -f;
    break;
    case "Mouse": 
      f = mouseX > windowWidth/2 ? 1 : -1;
    break;
    case "Keybind": 
      if (Keybinds.test("faceRight")) f = 1;
      if (Keybinds.test("faceLeft")) f = -1;
    break;
  }
  socket.emit('move', u, d, l, r, f);
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
  candies = [];
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
async function doSmash() {
  smashcooldown = false;
  socket.emit('smash');
  await wait(125);
  smashcooldown = true;
}
function mousePressed2() {
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
    user.cam = cam;
  }
}
// Scroll
document.addEventListener("wheel", function(e) {
  if (display != "view" && display != "pmgame") return;
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
  //__cpLocation.href = __cpLocation.origin;
  setDisplay("home");
  history.pushState({}, "", __cpLocation.origin);
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
var TrickOrTreatDate = 0;
socket.on('trick-or-treat', function(date) {
  TrickOrTreatDate = date;
  //alert("Trick or Treat!");
});
socket.on('candies', function(packedCandies) {
  //alert(JSON.stringify(packedCandies));
  candies = packedCandies;
  for (var i in candies) {
    candies[i].x = (candies[i].x + 0.5) * 36;
    candies[i].y = (candies[i].y + 0.5) * 36;
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
var tutorialDate = 0;
socket.on('tutorialMsg', function(msg, date, p) {
  tutorialMsg = msg;
  tutorialDate = date;
  tutorialPumpkin = p;
})
// Win Conditions
socket.on('skeleton_win', async function(stats) {
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
  processStats(stats,player.pumpkinMaster,false);
  setDisplay("gameover", player.pumpkinMaster ? "lose" : "win");
  endGame();
});
socket.on('pumpkin_master_win', async function(stats) {
  console.log("Pumpkin Master Wins!")
  subdisplay = "animation";
  for (var i in players) {
    players[i].health = 0;
  }
  if (player.pumpkinMaster) {
    spawnConfetti();
  }
  await wait(5000);
  processStats(stats,player.pumpkinMaster,true);
  setDisplay("gameover", player.pumpkinMaster ? "win" : "lose");
  endGame();
});
function spawnConfetti() {
  if (document.hidden) return;
  if (!settingsIdMap.showConfetti?.value) return;
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
var MatchStats = {};
function processStats(stats,is_pm,pm_win) {
  var total = function(obj){
    var c = 0;
    for (var i in obj) c += obj[i];
    return c;
  };
  stats.GamesPlayed = 1;
  if (is_pm) {
    stats.PlayedAsPumpkinMaster = 1;
    if (pm_win) { stats.Wins = 1; stats.PumpkinMasterWins = 1; }
    else { stats.Losses = 1; stats.PumpkinMasterLosses = 1; }
    stats.SkeletonDamage = total(stats.DamagedSkeletonsWith);
    stats.SkeletonKills = total(stats.KilledSkeletonsWith);
    stats.TotalMonstersSpawned = total(stats.MonstersSpawned);
    stats.TotalAbilitiesUsed = total(stats.AbilitiesUsed);
    stats.CoinsSpent = 0;
    for (var i in stats.MonstersSpawned) stats.CoinsSpent += EntityDisplay[i].cost * stats.MonstersSpawned[i];
    for (var i in stats.AbilitiesUsed) stats.CoinsSpent += AbilityDisplay[i].cost * stats.AbilitiesUsed[i];
    stats.TotalCoins = stats.CoinsSpent + stats.CoinsLeft;
  } else {
    stats.PlayedAsSkeleton = 1;
    if (pm_win) { stats.Losses = 1; stats.SkeletonLosses = 1; }
    else { stats.Wins = 1; stats.SkeletonWins = 1; }
    stats.TotalUpgrades = total(stats.Upgrades);
    stats.TotalEntitiesKilled = total(stats.EntitiesKilled);
    stats.TotalCandiesCollected = total(stats.CandiesCollected);
  }
  MatchStats = stats;
  var add = function(c,o) {
    c = c || {};
    for (var i in o) {
      if (o[i] instanceof Object) c[i] = add(c[i],o[i]);
      else c[i] = (c[i]||0)+o[i];
    }
    return c;
  };
  user.stats = add(user.stats,stats);
  user.achievements = user.achievements || {};
  for (var i in AchievementData) {
    var a = AchievementData[i];
    if (a.test(stats,user.stats)) user.achievements[i] = true;
  }
}
socket.on('tutorialComplete', function(time) {
  user.stats = user.stats || {};
  user.stats.TutorialComplete = 1;
  user.stats.TutorialTime = Math.min(time,user.stats.TutorialTime||Infinity);
});

function changeUsername() {
  var name = homeDis.username.value;
  name = censor(name);
  socket.emit('changeName', name);
  user.name = homeDis.username.value;
}

function changeHat() {
  socket.emit('changeHat', user.hat || "");
}

function censor(str) {
  const censoredWords = ["(mother|)fuck", "\bass", "bitch", "(bull|)shit", "nigg(er|a)", "cock", "cunt", "clit", "pussy", "penis", "dick", "porn", "satan", "damn", "dyke", "gang[-_\s]*bang", "jizz", "piss", "\btit", "blow[-_\s]*job", "hand[-_\s]*job", "\bcoon", "\bcum", "\bcumm", "slut", "pimp", "\bsex", "\btits", "tities"];
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
function randomProperty(obj) {
  const keys = Object.keys(obj);
  return randomValueArray(keys);
}
function randomValue(obj) {
  return obj[randomProperty(obj)];
}
function randomValueArray(arr) {
  return arr[randomIndex(arr)];
}
function randomIndex(arr) {
  return arr.length * Math.random() << 0;
}
function format(Fill, Stroke, StrokeWidth, TextSize, TextAlignX, TextAlignY) {
  if (Fill || Fill === 0) fill(Fill);
  else noFill();

  if (Stroke || Stroke === 0) stroke(Stroke);
  else noStroke();

  strokeWeight(StrokeWidth ?? 1);
  textSize(TextSize ?? 10);
  if (!TextAlignY) textAlign(TextAlignX ?? LEFT);
  else textAlign(TextAlignX ?? LEFT, TextAlignY);
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

var counter = 0;
setInterval(()=>{
  if (settingsIdMap.takeLSD?.value) {
    document.body.style.filter = "hue-rotate("+counter+"deg)";
    counter += 1;
    counter %= 360;
  } else if (counter != 0) {
    counter = 0;
    document.body.style.filter = "hue-rotate("+counter+"deg)";
  }
},10);

//setInterval(()=>{socket.emit('smash');},10);
