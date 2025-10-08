/* 
  Server Code
  By DragonFire7z

  Dependendcies:
    express
    socket.io
    peer
    fs
    @replit/database
*/

// Idea: Special Tiles
// Spikes *Hits monsters and skeletons*
// Special Pumpkins that when smashed turn into a monster
// Candy *Collecting as skeleton gives temporary immunity (10 seconds), loses it when smashing*

// Express app and server
const express = require("express");
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const fs = require('fs');
// Replit Database
const Database = require("@replit/database");
const db = new Database();
// Socket.io
const io = require('socket.io')(server);
// Port and Conections
const port = 443;

app.use(express.static(path.join(__dirname)));

app.get("/", (request, response) => {
    response.sendFile(__dirname + "/client/index.html");
});
app.get("/instructions", (request, response) => {
    response.sendFile(__dirname + "/client/instructions/index.html");
});
/*
const axios = require('axios');
axios.get('https://pumpkin-smasher-discord-bot.onrender.com');
*/

server.listen(port);
console.log("Server Started on port "+port);

//

function readDir(dir,callback) {
  var obj = {};
  fs.readdir(dir, (err, files) => {
    files.forEach(file => {
      if (fs.lstatSync(path.resolve(dir, file)).isDirectory()) {
        obj[file] = readDir(dir+file+"/",callback);
      } else {
        var filename = file.substring(0, file.indexOf("."));
        obj[filename] = callback(dir+file,file);
      }
    });
  });
  return obj;
}
var maps = readDir("./assets/maps/", (path) => {
  var rawdata = fs.readFileSync(path);
  return JSON.parse(rawdata);
});

const tickRate = 30;
const speed = 1 / tickRate;
const gameLength =  5 * 60;
setInterval(tick, speed * 1000);
setInterval(perSecond, 1000);

// -----
// Rooms
// -----
const startCount = 4;
class Room {
  constructor(id) {
    // Room Details
    this.id = id;
    this.amount = 0;
    this.pm_amount = 0;
    this.sockets = [];
    this.settings = {
      hidden: false,
      start_count: startCount
    };
    this.state = "lobby";
    // Players
    this.players = {};
    this.disconnectedPlayers = {};
    // Entities
    this.entities = [];
    // Abilities
    this.fogs = [];
    this.vines = [];
    this.shield = false;
    this.generators = {};
    // Map
    this.tilemap = [];
    this.minTileX = 0;
    this.minTileY = 0;
    this.maxHeight = 0;
    this.maxWidth = 0;
    // Pumpkins
    this.spawnLocCount = 0;
    this.potentialSpawnLoc = [];
    this.pumpkins = {};
    this.newPumpkins = [];
    // Candies
    this.candies = {};
    // Objectives
    this.objectiveRooms = 0;
    this.objectives = [];
    // Pumpkin Master
    this.pumpkin_masters = [];
    this.skeletons = [];
    this.coins = {};
    this.coinMult = 1;
    
    console.log("Created Room("+id+")");
  }
  async start(time) {
    this.disconnectedPlayers = {};
    this.state = "game";
    this.startTime = time + 5000;
    this.trueStartTime = time + 5000;
    this.generateMap();
    io.to(this.id).emit('objective',this.objectives);
    for (var y in this.tilemap) {
      for (var x in this.tilemap[y]) {
        if (this.tilemap[y] && this.tilemap[y][x] === 0) {
          this.spawnLocCount++;
          this.potentialSpawnLoc.push({x:Number(x),y:Number(y)});
        }
      }
    }
    // Pumpkin Grow
    console.log(this.spawnLocCount);
    var count = Math.floor(this.spawnLocCount / 2.5);
    var batch = [];
    for (var i = 0; i < count; i++) {
      batch.push(this.growPumpkin(false));
      if (batch.length > 300) {
        console.log("Batching Pumpkins "+i);
        io.to(this.id).emit('allpumpkins',batch);
        await wait(500);
        batch = [];
      }
    }
    console.log("Batching Pumpkins "+i);
    io.to(this.id).emit('allpumpkins',batch);
  }
  async TrickOrTreat() {
    io.to(this.id).emit('trick-or-treat',Date.now());

    var s = this.amount-this.pm_amount;
    this.spawnCandies(1+s);

    var self = this;
    var buffPM = function() {
      if (Math.random() < 0.15) {
        self.spawnRandom("wizard",1+s);
        self.spawnRandom("rusher",1+s);
        self.spawnRandom("debuffer",1+Math.floor(s/4));
      } else if (Math.random() < 0.3) {
        self.spawnRandom("speeder",1+s*2);
        self.spawnRandom("monster",2+s*4);
      } else if (Math.random() < 0.4) {
        for (var i in self.players) {
          var p = self.players[i];
          if (p.pumpkinMaster) continue;
          self.spawnFrom("monster",5,p.x,p.y,30);
        }
      } else if (Math.random() < 0.5) {
        for (var i in self.players) {
          var p = self.players[i];
          if (p.pumpkinMaster) continue;
          self.spawn("nuke",p.x,p.y);
        }
      } else if (Math.random() < 0.6) {
        self.spawnRandom("ghost",1+2*s);
      } else if (Math.random() < 0.7) {
        self.spawnRandom("catapult",1+s);
      } else if (Math.random() < 0.8) {
        for (var i = 0; i < self.objectives.length; i++) {
          var o = self.objectives[i];
          self.spawnFrom("brute",3,o.x,o.y,30);
        }
      } else {
        for (var i in self.coins) self.coins[i] += 5+5*s;
      }
    }

    buffPM();
    await wait(5000);
    buffPM();

    await wait((Math.random()*60+30)*1000);
    this.TrickOrTreat();
  }
  update() {
    if (this.state == "ended") return;
    // Player update
    for (var i in this.players) {
      this.players[i].preupdate();
    }
    // Game update
    if (this.state == "game") this.gameUpdate();
    // Pack & send
    var players = {};
    for (var i in this.players) {
      this.players[i].update();
      players[i] = this.players[i].pack();
    }
    for (var j = 0; j < this.sockets.length; j++) {
      var id = this.sockets[j];
      if (!SOCKET_LIST[id]) continue;
      SOCKET_LIST[id].emit('players',players,id,Date.now());
    }
    if (this.state != "game") return;
    // Win conditions
    if (this.objectives.length == 0) {
      this.state = "ended";
      this.broadcastWin('skeleton_win');
    }
    const timer = gameLength - Math.floor((Date.now() - this.startTime) / 1000);
    if (timer <= 0) {
      this.state = "ended";
      this.broadcastWin('pumpkin_master_win');
    }
  }
  broadcastWin(win) {
    for (var i in this.players) {
      var p = this.players[i];
      SOCKET_LIST[p.socket].emit(win,p.generateStats(this));
    }
  }
  gameUpdate() {
    /* Random Entity Spawns
    if (Math.random() < 0.05*speed) {
      var r = Math.random();
      var sel = "monster";
      if (r < 0.3) sel = "ghost";
      if (r < 0.2) sel = "speeder";
      if (r < 0.12) sel = "rusher";
      if (r < 0.08) sel = "wizard";
      if (r < 0.04) sel = "brute";
      if (r < 0.01) sel = "debuffer";
      this.spawnRandom(sel,1);
    };
    //*/
    
    // Entity update
    var entities = [];
    for (var i = 0; i < this.entities.length; i++) {
      this.entities[i].update();
      if (!this.entities[i]) return;
      entities.push(this.entities[i].pack());
    }
    io.to(this.id).emit('entities',entities,Date.now());
    // Ability Update
    io.to(this.id).emit('abilities',this.fogs,this.vines,this.shield,this.generators,Date.now());
  }
  addSocket(socket) {
    this.sockets.push(socket.id);
    var client = CLIENT_LIST[socket.id];
    var player = new Player(socket.id,this.id);
    this.players[socket.id] = player;
    client.player = player;
    if (client.name != "") player.name = client.name;
    else player.name = randomValueArray(["Player","Random","Nobody","Default","Unnamed"]);
    player.hat = client.hat;
    this.amount++;
    io.to(this.id).emit('amount',this.amount);
  }
  removeSocket(socket,disconnect) {
    const index = this.sockets.indexOf(socket.id);
    this.sockets.splice(index,1);
    if (disconnect) {
      this.disconnectedPlayers[socket.id] = this.players[socket.id];
    }
    delete this.players[socket.id];
    delete CLIENT_LIST[socket.id].player;

    this.amount--;
    io.to(this.id).emit('amount',this.amount);

    console.log("Socket("+socket.id+") has left Room("+this.id+")");
  }
  reviveSocket(socket,oldid,reloaded) {
    this.sockets.push(socket.id);
    delete this.players[socket.id];
    var client = CLIENT_LIST[socket.id];

    if (!this.disconnectedPlayers[oldid]) {
      socket.emit('rejoinFailed');
      return;
    }
    var player = this.disconnectedPlayers[oldid];
    delete this.disconnectedPlayers[oldid];
    this.players[socket.id] = player;
    client.player = player;
    player.socket = socket.id;
    if (player.pumpkinMaster) {
      this.pumpkin_masters.splice(this.pumpkin_masters.indexOf(oldid),1,socket.id);
    } else {
      this.skeletons.splice(this.skeletons.indexOf(oldid),1,socket.id);
    }

    this.amount++;
    io.to(this.id).emit('amount',this.amount);

    socket.emit('rejoinSuccess',socket.id);
    if (reloaded && this.state == "game") {
      socket.emit('start', this.startTime, true);
      socket.emit('tilemap', this.tilemap, this.roomMap, this.maxWidth, this.maxHeight, this.minTileX, this.minTileY);
      socket.emit('objective',this.objectives);
      var pumpkinList = [];
      for (var i in this.pumpkins) {
        pumpkinList.push(this.pumpkins[i]);
      }
      socket.emit('allpumpkins',pumpkinList);
      console.log("From reload:")
    }

    console.log("Socket("+oldid+") has rejoined Room("+this.id+") as Socket("+socket.id+")");
  }
  generateMap() {
    this.roomMap = {};
    this.potentialRoomMap = {}; 

    var s = this.amount-this.pm_amount;
    var regularRooms = 3+Math.floor(s*2.5);
    this.objectiveRooms = 1+s;

    this.potentialRoomMap["0,0"] = 0;
    this.selectRoom(maps["start"]);
    for (var i = 0; i < regularRooms; i++) {
      // Select a potential room
      this.selectRoom(randomValue(maps.rooms),false);
    }
    for (var i = 0; i < this.objectiveRooms; i++) {
      // Select a potential objective room
      this.selectRoom(randomValue(maps.objective),true);
    }
    //this.selectRoom(randomValue(maps.special),false);
    //this.selectRoom(randomValue(maps.end),false);  

    this.loadTileMap();

    io.to(this.id).emit('tilemap', this.tilemap, this.roomMap, this.maxWidth, this.maxHeight, this.minTileX, this.minTileY);
  }
  loadTileMap() {
    this.tilemap = {};
    this.entities = [];
    for (var i in this.roomMap) {
      var rx = Number(i.match(/(.*?),/)[1]);
      var ry = Number(i.match(/,(.*)/)[1]);
      var tm = this.roomMap[i].tilemap;
      //var em = this.roomMap[i].entitymap;
      var rot = Math.floor(Math.random()*4);
      for (var y = 0; y < 15; y++) {
        for (var x = 0; x < 15; x++) {
          var sx = x;
          var sy = y;
          if (rot == 1) {sx = 14-y; sy = x;}
          if (rot == 2) {sx = 14-x; sy = 14-y;}
          if (rot == 3) {sx = y; sy = 14-x;}

          var tx = rx*14+sx;
          var ty = ry*14+sy;

          //if (fm[y][x] != 0) {
            //var e = new entityIDs[fm[y][x]](tx,ty);
          //}

          this.tilemap[ty] = nullCheck(this.tilemap[ty],{});
          if (this.tilemap[ty][tx] == 8 && tm[y][x] == 8) {
            this.tilemap[ty][tx] = 0;
            continue;
          }
          if (this.tilemap[ty][tx] == 1) {
            this.tilemap[ty][tx] = weightedRandom(1,[2],[0.2]);
            continue;
          }

          this.tilemap[ty][tx] = tm[y][x];
        }
    }
    }
    for (var y in this.tilemap) {
      for (var x in this.tilemap[y]) {
        if (this.tilemap[y][x] == 8) {this.tilemap[y][x] = 1;}
      }
    }

    for (var y in this.tilemap) {
      this.minTileY = Math.min(this.minTileY,Number(y));
      for (var x in this.tilemap[y]) {
        this.minTileX = Math.min(this.minTileX,Number(x));
      }
    }

    this.maxHeight = Object.keys(this.tilemap).length;
    for (var y in this.tilemap) {
      for (var x in this.tilemap[y]) {
        this.maxWidth = Math.max(this.maxWidth,Number(x)+1);
      }
    }
    this.maxWidth -= this.minTileX;
    console.log(this.maxHeight, this.maxWidth);
  }
  selectRoom(room,objective) {  
    const prm = this.potentialRoomMap;

    const toSel = Object.keys(prm).filter((k)=>{
      return prm[k] == 0;
    });
    const sel = toSel[Math.floor(Math.random()*toSel.length)];
    const x = Number(sel.match(/(.*?),/)[1]);
    const y = Number(sel.match(/,(.*)/)[1]);

    if (objective) {
      const o = {
        health:100,
        x:x*14+15/2,
        y:y*14+15/2
      }
      this.objectives.push(o);
    }

    this.roomMap[x+","+y] = room;
    //Mark as already generated
    prm[x+","+y] = 1;
    //Propagate potental generation
    prm[(x+1)+","+y] = nullCheck(prm[(x+1)+","+y],0);
    prm[(x-1)+","+y] = nullCheck(prm[(x-1)+","+y],0);
    prm[x+","+(y+1)] = nullCheck(prm[x+","+(y+1)],0);
    prm[x+","+(y-1)] = nullCheck(prm[x+","+(y-1)],0);
  }
  checkCollisions(x,y,bbox,obj,ghost) {
    if (this.state == "lobby" || this.state == "starting") {
      if (x-bbox.maxX >= 4 || x+bbox.minX <= -4 || y+bbox.maxY >= 4 || y+bbox.minY <= -4) return true;
    } else {
      if (this.checkPoint(x+bbox.minX,y+bbox.minY,ghost)) return true;
      if (this.checkPoint(x+bbox.minX,y+bbox.maxY,ghost)) return true;
      if (this.checkPoint(x+bbox.maxX,y+bbox.maxY,ghost)) return true;
      if (this.checkPoint(x+bbox.maxX,y+bbox.minY,ghost)) return true;
      for (var i = 0; i < this.vines.length; i++) {
        var v = this.vines[i];
        if (intersectAABB(x,y,bbox,v.x,v.y,v.bbox) && !ghost) return true;
      }
      /*
      if (!this.entities.inclides(obj)) return false;
      for (var i = 0; i < this.entities.length; i++) {
        var e = this.entities[i];
        if (obj == e) continue;
        if (intersectAABB(x,y,bbox,e.x,e.y,e.bbox)) return true;
      }
      //*/
    }
    return false;
  }
  async checkCandies(player) {
    const tx = Math.floor(player.x);
    const ty = Math.floor(player.y);
    var i = tx+","+ty;
    var c = this.candies[i];
    if (!c) return;
    var candy = CandyData[c.type];
    if (player.activeCandy && candy.duration) return;
    delete this.candies[i];
    io.to(this.id).emit('candies',this.candies);
    player.activeCandy = c.type;
    player.gamestats.CandiesCollected[c.type]++;
    candy.collect(player,this,tx,ty);
    if (candy.duration) {
      player.candyDuration = Date.now() + candy.duration*1000;
      await wait(candy.duration*1000);
    }
    if (player.activeCandy) {
      candy.expire(player,this);
      player.activeCandy = false;
    }
  }
  spawnCandies(n) {
    for (var i = 0; i < n; i++) {
      var c = {};
      while (true) {
        const pos = randomValueArray(this.potentialSpawnLoc);
        c.x = pos.x;
        c.y = pos.y;
        if (!this.pumpkins[c.x+","+c.y] && !this.candies[c.x+","+c.y]) break;
      }
      c.timestamp = Date.now();
      c.type = RandomCandy();
      this.candies[c.x+","+c.y] = c;
    }
    io.to(this.id).emit('candies',this.candies);
  }
  checkPoint(x,y,ghost) {
    //Get tile position
    const tx = Math.floor(x);
    const ty = Math.floor(y);

    //Check if undefined
    if (this.tilemap[ty] == undefined) {return true;}
    if (this.tilemap[ty][tx] == undefined) {return true;}

    if (ghost) return false;
    
    //Insert tile-specific code here
    /*if (typeof tiletype == 'function') {
      tiletype(this.tilemap[ty][tx],tx,ty);
    }*/

    //Check if wall
    if (this.tilemap[ty][tx] != 0) {return true;}
    
    return false;
  }
  growPumpkin(emit) {
    var p = {};
    while (true) {
      const pos = randomValueArray(this.potentialSpawnLoc);
      p.x = pos.x;
      p.y = pos.y;
      if (!this.pumpkins[p.x+","+p.y] && !this.candies[p.x+","+p.y]) break;
    }
    p.timestamp = Date.now();
    p.type = weightedRandom(0, [1, 2], [0.0316227766, 0.001]);
    if (emit) io.to(this.id).emit('growpumpkin',p);
    this.pumpkins[p.x+","+p.y] = p;
    return p;
  }
  destroyPumpkin(x,y) {
    io.to(this.id).emit('destroypumpkin',x,y);
    delete this.pumpkins[x+","+y];
    this.growPumpkin(true);
  }
  spawn(sel,x,y,spawnedBy,condition) {
    if (!ROOM_LIST[this.id]) return false;
    x = Math.floor(x);
    y = Math.floor(y);
    if (typeof condition == "function" && !condition(x,y,sel)) return;
    if (spawnedBy && this.coins[spawnedBy] < EntityData[sel].cost) return;
    if (!this.tilemap[y] || this.tilemap[y][x] != 0) return;
    if (EntityData[sel].pumpkin) {
      if (!this.pumpkins[x+","+y]) return;
      this.destroyPumpkin(x,y);
    }
    var e = new Entities[sel](x+0.5,y+0.5,this.id,spawnedBy);
    if (!spawnedBy) return e;
    this.coins[spawnedBy] -= EntityData[sel].cost;
    return e;
  }
  async spawnFrom(sel,amount,sx,sy,delay,spawnedBy,condition) {
    sx = Math.floor(sx);
    sy = Math.floor(sy);
    var dir = 0;
    var turns = 0;
    var spawned = [];
    while (true) {
      turns++;
      for (var i = 0; i < Math.ceil(turns/2); i++) {
        if (delay) await wait(delay);
        var e = this.spawn(sel,sx,sy,spawnedBy,condition);
        if (e) {
          spawned.push(e);
          if (spawned.length >= amount) return spawned;
        }
        sx += Math.round(Math.cos(dir));
        sy += Math.round(Math.sin(dir));
      }
      dir += Math.PI / 2;
    }
  }
  async spawnRandom(sel,amount,spawnedBy,condition) {
    if (spawnedBy && this.coins[spawnedBy] < EntityData[sel].cost * amount) return;
    var spawned = [];
    while (true) {
      await wait(30);
      var rx = Math.floor(this.maxWidth*Math.random())-this.minTileX;
      var ry = Math.floor(this.maxHeight*Math.random())-this.minTileY;
      var e = this.spawn(sel,rx,ry,spawnedBy,condition);
      if (e) {
        spawned.push(e);
        if (spawned.length >= amount) return spawned;
      }
    }
  }
  ability(sel,x,y,spawnedBy) {
    if (spawnedBy && this.coins[spawnedBy] < AbilityData[sel].cost) return;
    Abilities[sel](x,y,this,spawnedBy);
    if (!spawnedBy) return;
    this.coins[spawnedBy] -= AbilityData[sel].cost;
    if (this.usedAbility == false) this.usedAbility = true;
  }
  /*loadData(sx,sy,data) {
    for (var x = 0; x < 15; x++) {
      for (var y = 0; y < 15; y++) {
        this.tilemap[sx+x][sy+y] = data.key[data.map[y][x]];
      }
    }
  }*/
}
var pendingTutorials = {};
class TutorialRoom extends Room {
  constructor(socket) {
    super(socket.id);
    delete this.sockets;
    delete this.disconnectedPlayers;
    this.socket = socket;
    this.player = new Player(socket.id,this.id);
    this.players[socket.id] = this.player;
    this.client = CLIENT_LIST[socket.id];
    this.client.player = this.player;
    this.state = "tutorial";
    this.amount = 1;
    this.freeplay = false;
    this.healVines = null;
    this.skeletons = [socket.id];
    this.tutorial();
    this.coins = 0;
    this.coins[socket.id] = 0;
  }
  async tutorial() {
    // Start game
    this.start();

    // Place vines
    this.ability("vines",0,0,null);
    var self = this;
    this.healVines = setInterval(()=>{
      if (!self.vines[0]) return;
      self.vines[0].health = 25;
    },1000);

    await wait(5000);

    this.socket.emit('tutorialMsg',[
      "",
      "Oh! A new recruit! Welcome!",
      ""
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "As you know...",
      "(Insert story here)",
      "...so we smash pumpkins"
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "WASD or Arrow Keys to move",
      "SPACE to smash!",
      "Now, smash a few pumpkins!"
    ],Date.now(),false);

    while (this.player.level < 1 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Upgrades Upgrades Upgrades...",
      "Click one of the boxes to upgrade",
      "Choose wisely!"
    ],Date.now(),false);
    while (this.player.upgradePts != 0 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "",
      "Good choice!",
      ""
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Watch out for pumpkin monsters,",
      "they spawn from pumpkins and",
      "they kill you if given the chance."
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    await this.spawnFrom("monster",5,this.player.x,this.player.y,30,null,(x,y)=>x<14);
    
    while (this.entities.length > 0 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    if (this.player.health == this.player.maxhealth) {
      this.socket.emit('tutorialMsg',[
        "",
        "Wow, I'm impressed.",
        ""
      ],Date.now(),false);
    } else {
      this.socket.emit('tutorialMsg',[
        "YIKES!",
        "Here, let me restore you to ",
        "full health."
      ],Date.now(),false);
    }
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.player.health = this.player.maxhealth;

    this.socket.emit('tutorialMsg',[
      "Now, you see that little orange",
      "arrow to the side of you? That",
      "points to the objectives."
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Our goal is to destroy those",
      "objectives before the timer",
      "runs out."
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "",
      "Good Luck!",
      ""
    ],Date.now(),false);

    this.vines = [];
    clearInterval(this.healVines);

    this.spawnCandies(5);

    var filter = x=>x>14;
    this.spawnRandom("wizard",4,null,filter);
    this.spawnRandom("rusher",4,null,filter);
    this.spawnRandom("speeder",4,null,filter);
    this.spawnRandom("monster",8,null,filter);
    this.spawnRandom("catapult",2,null,filter);
    this.spawnRandom("debuffer",1,null,filter);

    while (this.player.x <= 28 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.spawnFrom("monster",5,this.player.x,this.player.y,30);

    while (this.player.x <= 42 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.spawn("nuke",this.player.x,this.player.y);

    while (this.player.x <= 56 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.spawnRandom("ghost",10,null,filter);

    while (this.player.x <= 62 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;
    this.spawn("nuke",this.player.x,this.player.y);

    while (this.player.x <= 70 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.spawn("nuke",this.player.x,this.player.y);

    while (this.player.x <= 98 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Look!",
      "There it is!",
      ""
    ],Date.now(),false);

    this.spawnFrom("brute",3,105,7,30);

    while (this.objectives.length > 0 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    for (var i = this.entities.length-1; i >= 0; i--) {
      var e = this.entities[i];
      this.socket.emit('hit',e.x,e.y);
      e.destroy();
    }

    this.socket.emit('tutorialMsg',[
      "",
      "Good Job!",
      ""
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Ack!",
      "You got our objective.",
      ""
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Let me show you the power of",
      "the Pumpkin Masters.",
      ""
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "No!",
      "Don't listen to him!",
      ""
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    // Convert to pumpkin master
    this.swap(false);
    await wait(5000);

    this.socket.emit('tutorialMsg',[
      "So, hello there.",
      "Can't you just feel the power",
      "coursing through your veins?"
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "You can't?!",
      "Oh, well...",
      "Let me show you the power!"
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "First, you can move by",
      "dragging your mouse and you",
      "can zoom out by scrolling"
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Why dont you try placing a few",
      "entities?",
      "Click an entity then click a pumpkin."
    ],Date.now(),true);

     while (this.entities.length < 5 && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "See! It's so easy!",
      "You will use these guys to protect",
      "the objective."
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "So, every second you get new",
      "pumpkin coins (upper left hand",
      "corner of your screen)"
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "They allow you to purchase",
      "abilities and entities to defend",
      "the objectives until time runs out."
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Now, lets try an ability.",
      "Select an ability above the ",
      "entities. Then, click a room."
    ],Date.now(),true);

    this.usedAbility = false
    while (!this.usedAbility && this.entities&& ROOM_LIST[this.id]) await wait(100);
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Nice.",
      "Now, I think you're ready to",
      "play in an actual match."
    ],Date.now(),true);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Yeah, I do too.",
      "Press ESCAPE to leave the",
      "tutorial."
    ],Date.now(),false);
    await this.waitForContinue();
    if (!ROOM_LIST[this.id] || this.freeplay) return;

    this.socket.emit('tutorialMsg',[
      "Or stay, I guess...",
      "Press P to swap between skeleton",
      "and pumpkin master, have fun!"
    ],Date.now(),false);
    this.freeplay = true;
    console.log("Tutorial Room("+this.id+") has finished and activated freeplay!")
  }
  update() {
    // Player update
    if (this.player.health <= 0 && !this.player.countdown) {
      this.socket.emit('tutorialMsg',[
        "Ouch!",
        "Dying is bad.",
        ""
      ],Date.now(),false);
    }
    this.player.preupdate();
    // Game Update
    this.gameUpdate();
    // Pack & Send
    this.player.update();
    var players = {};
    players[this.id] = this.player.pack();
    this.socket.emit('players',players,this.id,Date.now());
    // Time
    const timer = gameLength - Math.floor((Date.now() - this.startTime) / 1000);
    if (timer <= 0) {
      if (this.player.pumpkinMaster) this.socket.emit('tutorialMsg',[
        "Times Up!",
        "In a real game, you would've",
        "just won, but here I'll reset it."
      ],Date.now(),true);
      else this.socket.emit('tutorialMsg',[
        "Times Up!",
        "In a real game, you would've",
        "just lost, but here I'll reset it."
      ],Date.now(),false);
      this.startTime = Date.now();
      this.socket.emit('setTime',this.startTime);
    }
  }
  start() {
    this.disconnectedPlayers = {};
    this.state = "game";

    this.generateMap();
    io.to(this.id).emit('objective',this.objectives);
    for (var y in this.tilemap) {
      for (var x in this.tilemap[y]) {
        if (this.tilemap[y] && this.tilemap[y][x] === 0) {
          this.potentialSpawnLoc.push({x:Number(x),y:Number(y)});
        }
      }
    }
    // Pumpkin Grow
    var batch1 = [];
    for (var i = 0; i < 300; i++) {
      batch1.push(this.growPumpkin(false));
    }
    this.socket.emit('allpumpkins',batch1);

    this.startTime = Date.now();
    this.socket.emit('start', Date.now());

    this.player.x = 15/2;
    this.player.y = 15/2;
    this.socket.emit('PM',false);

    console.log("Tutorial Room ("+this.id+") has started!");
  }
  generateMap() {
    this.roomMap = {};
    this.potentialRoomMap = 0; 

    this.selectRoom(maps["start"]);
    for (var i = 0; i < 6; i++) {
      // Select a potential room
      this.selectRoom(randomValue(maps.rooms),false);
    }
    for (var i = 0; i < 1; i++) {
      // Select a potential objective room
      this.selectRoom(randomValue(maps.objective),true);
    }

    this.loadTileMap();

    this.socket.emit('tilemap', this.tilemap, this.roomMap, this.maxWidth, this.maxHeight, this.minTileX, this.minTileY);
  }
  selectRoom(room,objective) {  
    const x = this.potentialRoomMap;
    const y = 0;

    if (objective) {
      const o = {
        health:100,
        x:x*14+15/2,
        y:y*14+15/2
      }
      this.objectives.push(o);
    }

    this.roomMap[x+","+y] = room;
    //Mark as already generated
    this.potentialRoomMap++;
  }
  async waitForContinue() {
    await wait(100);
    pendingTutorials[this.id] = true;
    while (pendingTutorials[this.id] && ROOM_LIST[this.id] && !this.freeplay) await wait(100);
    return;
  }
  removeSocket(socket,disconnect) {
    if (pendingTutorials[this.id]) delete pendingTutorials[this.id];
    delete ROOM_LIST[this.id];
    console.log("Deleted Tutorial Room("+this.id+")");
  }
  swap(quick) {
    this.startTime = Date.now();
    this.socket.emit('start', Date.now(), quick);
    if (this.player.pumpkinMaster) {
      this.socket.emit('PM', false);
      this.pumpkin_masters = [];
      this.skeletons = [this.id];
      this.player.pumpkinMaster = false;
      this.player.level = 12;
      this.player.upgradePts = 12;
      this.player.upgradeLvls = {
        speed:0,
        axelength:0,
        maxhealth:0
      };
      this.socket.emit('lvlUp',this.player.upgradeLvls);
      this.player.speed = speedDefault * speed;
      this.player.axelength = axeLengthDefault;
      this.player.maxhealth = healthDefault;
      this.player.health = healthDefault;
      //
      this.candies = {};
      this.spawnCandies(3);
    } 
    else {
      this.socket.emit('PM', true);
      this.pumpkin_masters = [this.id];
      this.skeletons = [];
      this.player.pumpkinMaster = true;
      this.coinMult = 1;
      // Restore objective
      if (this.objectives.length == 0) {
        const o = {
          health:100,
          x: this.maxWidth-15/2,
          y: 15/2
        };
        this.objectives.push(o);
        this.socket.emit('objective',this.objectives);
      }
      if (this.freeplay) this.coins[this.id] = 500;
      else console.log("Tutorial Room ("+this.id+") starting Pumpkin Master");
    }
  }
}

// ------
// Player
// ------
/*var UpgradeData = {
  "speed": {
    "default": 2.2 * speed,
    "upgrade": v => v*1.28,
    "max": 4,
  },
  "axelength": {
    "default": 0.55,
    "upgrade": v => v+1/3,
    "max": 4
  },
  "health": {
    "default": 3,
    "upgrade": v => v+1,
    "max": 4
  },
};*/
const speedDefault = 2.2;
const speedMult = 1.28;
const axeLengthDefault = 0.55;
const axeLengthChange = 1/3;
const healthDefault = 3;
const healthChange = 1;
const upgradeMaxes = {
  speed:4,
  axelength:4,
  maxhealth:4
};
class Client {
  constructor(id) {
    this.id = id;
    this.room = "";
    this.name = "";
    this.timeJoined = Date.now();
  }
}
class Player {
  constructor(socket, room) {
    this.x = 0;
    this.y = 0;
    this.bbox = {
      minX:-0.2,
      maxX:0.2,
      minY:-0.2,
      maxY:0.45
    }

    this.dx = 0;
    this.dy = 0;

    this.score = 0;
    this.level = 0;
    this.upgradePts = 0;
    this.upgradeLvls = {
      speed:0,
      axelength:0,
      maxhealth:0
    };
    this.speed = speedDefault * speed;
    this.axelength = axeLengthDefault;
    this.maxhealth = healthDefault;

    this.skin = 3;
    this.realskin = Math.floor(Math.random() * 3);
    this.facing = 1;
    this.health = 3;
    this.swing = 0;
    this.pumpkinMaster = false;
    this.room = room;
    this.socket = socket;
    this.depth = 0;
    this.immune = false;
    this.disabled = true;

    this.activeCandy = false;
    this.candyDuration = 0;
    
    this.name = "";
    this.hat = "";
    
    this.gamestats = {
      // Skeleton
      Smashed: 0,
      SmashedGold: 0,
      SmashedDiamond: 0,
      EntitiesKilled: {},
      EntitiesKilledWithLolipop: 0,
      Deaths: 0,
      ObjectiveDamage: 0,
      ObjectivesDestroyed: 0,
      AbilityDamage: {},
      AbilitiesDestroyed: {},
      CandiesCollected: {},
      // Pumpkin Master
      DamagedSkeletonsWith: {},
      DamagedSkeletonsWithSwarm: 0,
      KilledSkeletonsWith: {},
      KilledSkeletonsWithSwarm: 0,
      EntitiesSpawned: {},
      AbilitiesUsed: {},
      CoinsGenerated: 0,
    };
    for (var t in EntityData) {
      this.gamestats.EntitiesKilled[t] = 0;
      this.gamestats.DamagedSkeletonsWith[t] = 0;
      this.gamestats.KilledSkeletonsWith[t] = 0;
      this.gamestats.EntitiesSpawned[t] = 0;
    }
    for (var t in AbilityData) {
      this.gamestats.AbilityDamage[t] = 0;
      this.gamestats.AbilitiesDestroyed[t] = 0;
      this.gamestats.AbilitiesUsed[t] = 0;
    }
    for (var t in CandyData) {
      this.gamestats.CandiesCollected[t] = 0;
    }

    var self = this;
    setTimeout(() => {
      self.skin = self.realskin;
    }, 1000);
  }
  pack() {
    var p = {
      x:this.x,
      y:this.y,
      facing:this.facing,
      skin:this.skin,
      health:this.health,
      maxhealth:this.maxhealth,
      swing:this.swing,
      axelength:this.axelength,
      countdown:this.countdown,
      pumpkinMaster:this.pumpkinMaster,
      score:Math.round(this.score),
      level:this.level,
      upgradePts:this.upgradePts,
      name:this.name,
      hat:this.hat,
      activeCandy:this.activeCandy,
      candyDuration:this.candyDuration,
    };
    if (this.disabled) {
      p.health = this.health / this.maxhealth * healthDefault;
      p.maxhealth = healthDefault;
      p.axelength = axeLengthDefault;
    }
    if (this.activeCandy == "chocolate") p.axelength += 1.5;
    return p;
  }
  generateStats(room) {
    var stats = this.gamestats;
    if (this.pumpkinMaster) {
      stats.CoinsLeft = room.coins[this.id];
      stats.ObjectivesLost = room.objectiveRooms - room.objectives.length;
    } else {
      stats.Upgrades = this.upgradeLvls;
      stats.Score = this.score;
      stats.Level = this.level;
    }
    stats.PlayTime = Date.now()-room.trueStartTime;
    return stats;
  }
  preupdate() {
    this.disabled = false;
  }
  update() {
    const room = ROOM_LIST[this.room];

    // Swing Animation
    if (this.swingint) {
      const SwingSpeed = 150; // milliseconds
      this.swing += (180 / SwingSpeed) * (speed * 1000);
      if (this.swing >= 180) {
        this.swingint = false;
        this.swing = 0;
      }
    }

    // Check death
    if (this.health <= 0 && !this.countdown) {
      this.death();
      return;
    }
    if (this.health <= 0) return;

    // Movement
    var dx = this.dx;
    var dy = this.dy;
    if (dx == 0 && dy == 0) {
      return;
    }

    // Collision
    this.facing = dx == 0 ? this.facing : dx > 0 ? 1 : -1;
    var myspeed = this.speed;
    if (this.disabled) myspeed = speedDefault * speed;
    const mag = myspeed / Math.sqrt(dx*dx+dy*dy);
    dx *= mag;
    dy *= mag;
    dx += this.x;
    dy += this.y;

    var ghost = this.activeCandy == "ghost_chew"
    if (!room.checkCollisions(dx,this.y,this.bbox,this,ghost)) {
      this.x = dx;
    }
    if (!room.checkCollisions(this.x,dy,this.bbox,this,ghost)) {
      this.y = dy;
    }

    room.checkCandies(this);
  }
  move(u, d, l, r) {
    var dx = 0;
    var dy = 0;
    if (u) {dy--;}
    if (d) {dy++;}
    if (l) {dx--;}
    if (r) {dx++;}
    this.dx = dx;
    this.dy = dy;
  }
  upgrade(name) {
    if (this.upgradeLvls[name] >= upgradeMaxes[name]) return;
    if (this.upgradePts <= 0) return;
    this.upgradeLvls[name]++;
    this.upgradePts--;
    switch (name) {
      case "speed": this.speed *= speedMult; break;
      case "axelength": this.axelength += axeLengthChange; break;
      case "maxhealth": this.maxhealth += healthChange; this.health += healthChange; break;
    }
  }
  smash() {
    const room = ROOM_LIST[this.room];
    if (!room) return;
    const self = this;

    var candy = CandyData[this.activeCandy];
    if (candy && candy.loseonswing) {
      candy.expire(this,room);
      this.activeCandy = false;
    }

    // Undo Immunity
    if (this.immune) {
      this.immune = false;
      this.skin = this.realskin;
    }

    // Check for pumpkins
    var ufx = this.x-0.5;
    var ufy = this.y-0.5;
    var check = function(x,y) {
      if (room.pumpkins[x+","+y]) {
        self.gamestats.Smashed++;
        switch (room.pumpkins[x+","+y].type) {
          case 0: self.addScore(1); break;
          case 1: self.addScore(2); self.gamestats.SmashedGold++; break;
          case 2: self.addScore(5); self.gamestats.SmashedDiamond++; break;
        }
        room.destroyPumpkin(x,y);
      }
    };
    var check2 = function(x,y) {
      check(Math.floor(x),Math.ceil(y));
      check(Math.ceil(x),Math.ceil(y));
      check(Math.ceil(x),Math.floor(y));
      check(Math.floor(x),Math.floor(y));
    }
    var axelength = this.axelength;
    if (this.disabled) axelength = axeLengthDefault;
    if (this.activeCandy == "chocolate") axelength += 1.5;
    check2(ufx,ufy);
    if (axelength >= 1) {
      check2(ufx+this.facing,ufy);
    }
    if (axelength >= 1.5) {
      check2(ufx,ufy+1);
      check2(ufx,ufy-1);
    }
    if (axelength >= 1.75) {
      check2(ufx+this.facing,ufy+1);
      check2(ufx+this.facing,ufy-1);
    }
    if (axelength >= 2) {
      check2(ufx,ufy+2);
      check2(ufx,ufy-2);
      check2(ufx+this.facing*2,ufy);
    }
    if (axelength >= 2.2) {
      check2(ufx+this.facing*2,ufy+1);
      check2(ufx+this.facing*2,ufy-1);
      check2(ufx+this.facing,ufy+2);
      check2(ufx+this.facing,ufy-2);
    }

    // Check for Entities
    for (var i = room.entities.length - 1; i >= 0; i--) {
      var e = room.entities[i];
      var b = e.bbox;
      var dx = e.x-this.x;
      var dy = e.y-this.y;
      var dist = dx * dx + dy * dy;
      if (Math.sign(dx+0.07*this.facing) != this.facing && dist > e.hitdist*e.hitdist) continue;
      if (dist > (e.hitdist+axelength)**2) continue;
      if (e.hit(this)) {
        io.to(room.id).emit('hit', e.x, e.y);
      }
    }

    // Check for vines
    for (var i = room.vines.length - 1; i >= 0; i--) {
      var v = room.vines[i];
      var dx = v.x-this.x;
      if (Math.sign(dx) != this.facing && v.orient == "vert") continue;
      var dy = v.y-this.y;
      if (dx * dx + dy * dy > 2.25) continue;
      room.vines[i].health--;
      this.gamestats.AbilityDamage.vines++;
      if (room.vines[i].health <= 0 || Date.now()-room.vines[i].spawnedAt < 1000) {
        this.gamestats.AbilitiesDestroyed.vines++;
        room.vines.splice(i,1);
      }
    }

    // Check for generators
    for (i in room.generators) {
      var gen = room.generators[i];
      var dx = gen.x-this.x;
      var dy = gen.y-this.y;
      if (dx * dx + dy * dy < 3.2*3.2) {
        this.addScore(0.2);
        gen.health--;
        this.gamestats.AbilityDamage.generators++;
        if (gen.health <= 0) {
          this.gamestats.AbilitiesDestroyed.generators++;
          delete room.generators[i];
        }
      }
    }

    // Check for shield
    if (room.shield) {
      var dx = room.shield.x-this.x;
      var dy = room.shield.y-this.y;
      if (dx * dx + dy * dy < 3.2*3.2) {
        this.addScore(0.2);
        room.shield.health--;
        this.gamestats.AbilityDamage.shield++;
        if (room.shield.health <= 0) {
          this.gamestats.AbilitiesDestroyed.shield++;
          room.shield = false;
        }
      }
    }
    // Check for objectives
    else {
      for (var i = room.objectives.length - 1; i >= 0; i--) {
        var o = room.objectives[i];
        var dx = o.x-this.x;
        var dy = o.y-this.y;
        if (dx * dx + dy * dy < 3.2*3.2) {
          this.addScore(0.2);
          o.health--;
          this.gamestats.ObjectiveDamage++;
          if (o.health <= 0) {
            this.gamestats.ObjectivesDestroyed++;
            room.coinMult += 0.5;
            room.objectives.splice(i,1);
            room.startTime += 60 * 1000;
            io.to(room.id).emit('objective_destroyed', o.x, o.y);
          }
          io.to(room.id).emit('objective',room.objectives);
        }
      }
    }

    // Level Upgrades
    // (5/6)x³ + (5/2)x² + (35/3)x + 10
    const threshold = {
      "0":10,   // +10  | +0
      "1":25,   // +15  | +5
      "2":50,   // +25  | +10
      "3":90,   // +40  | +15
      "4":150,  // +60  | +20
      "5":235,  // +85  | +25
      "6":350,  // +115 | +30
      "7":500,  // +150 | +35
      "8":690,  // +190 | +40
      "9":925,  // +235 | +45
     "10":1210, // +285 | +50
     "11":1550, // +340 | +55
     "12":1950  // +400 | +60
    }

    if (this.score >= threshold[this.level]) {
      this.level++;
      this.upgradePts++;
      SOCKET_LIST[this.socket].emit('lvlUp',this.upgradeLvls);
    }

    // Swing animation
    this.swing = 0;
    this.swingint = true;
    //socket.emit('swing',this.id)
  }
  damage(amount, dealer) {
    const room = ROOM_LIST[this.room];
    if (this.immune) return;
    var candy = CandyData[this.activeCandy];
    if (candy && candy.loseondamaged) {
      candy.expire(this,room);
      this.activeCandy = false;
    }
    if (this.disabled) amount *= this.maxhealth / healthDefault;
    this.health -= amount;
    // Stats
    var pm = room.players[dealer.spawnedBy];
    if (!pm) return;
    pm.gamestats.DamagedSkeletonsWith[dealer.category] += amount;
    if (dealer.swarm) pm.gamestats.DamagedSkeletonsWithSwarm += amount;
    if (this.health < 0) { 
      pm.gamestats.KilledSkeletonsWith[dealer.category]++;
      if (dealer.swarm) pm.gamestats.KilledSkeletonsWithSwarm++;
    }
  }
  addScore(n) {
    if (this.activeCandy == "candy_corn") n *= 3;
    this.score += n;
  }
  async death() {
    SOCKET_LIST[this.socket].emit('dead');
    this.gamestats.Deaths++;
    // Candy Reset
    const room = ROOM_LIST[this.room];
    var candy = CandyData[this.activeCandy];
    if (candy) {
      candy.expire(this,room);
      this.activeCandy = false;
    }
    // Countdown
    for (this.countdown = 10; this.countdown >= 1; this.countdown--) {
      await wait(1000);
    }
    // Reset Health and Position
    this.health = this.maxhealth;
    this.x = 15/2;
    this.y = 15/2;
    if (SOCKET_LIST[this.socket]) {
      SOCKET_LIST[this.socket].emit('revive');
    }
    await wait(10);
    delete this.countdown;

    // Initiate Immunity
    this.skin = 3;
    this.immune = true;
    await wait(5000);
    this.skin = this.realskin;
    this.immune = false;
  }
}

// --------
// Entities
// --------
class Entity {
  constructor(x, y, room, spawnedBy) {
    this.x = x;
    this.y = y;
    this.room = room;
    this.depth = 0;
    this.type = "";
    this.category = "";
    this.bbox = {
      minX:0,
      maxX:0,
      minY:0,
      maxY:0
    };
    this.hitdist = 0;
    this.img = "";
    this.facing = 1;
    this.f = Math.floor(Math.random()*100);
    this.value = 1;
    this.spawnedBy = spawnedBy;
    ROOM_LIST[room].entities.push(this);
  }
  pack() {
    return {
      x:this.x,
      y:this.y,
      type:this.type,
      depth:this.depth,
      f:this.f,
      img:this.img,
      facing:this.facing
    };
  }
  update() {}
  moveForward(dir,speed,ghost) {
    const room = ROOM_LIST[this.room];
    dir.x *= speed;
    dir.y *= speed;
    if (room.checkCollisions(dir.x+this.x,this.y,this.bbox,this)) {
      if (Math.abs(dir.y) > 0.03) dir.y = Math.sign(dir.y) * Math.abs(speed) // 1.41421356237;
      dir.x = 0;
    }
    if (room.checkCollisions(this.x,dir.y+this.y,this.bbox,this)) {
      if (Math.abs(dir.x) > 0.03) dir.x = Math.sign(dir.x) * Math.abs(speed) // 1.41421356237;
      dir.y = 0;
    }
    this.x += dir.x;
    this.y += dir.y;
  }
  hit(player) {
    player.addScore(this.value);
    player.gamestats.EntitiesKilled[this.type]++;
    this.destroy();
    return true;
  }
  destroy() {
    const room = ROOM_LIST[this.room];
    if (!room) return;
    const i = room.entities.indexOf(this);
    room.entities.splice(i, 1);
  }
  getNearestPlayer(max) {
    const room = ROOM_LIST[this.room];
    if (!room) return;

    var record = max ** 2;
    var sel;
    for (var i in room.players) {
      var p = room.players[i];
      if (p.pumpkinMaster || p.health <= 0 || p.immune) continue;
      var dx = this.x - p.x;
      var dy = this.y - p.y;
      var d = dx * dx + dy * dy;
      if (d < record) {
        record = d;
        sel = p;
      }
    }
    if (!sel) {
      return;
    }
    var dist = Math.sqrt(record);
    var dir = {x:sel.x - this.x, y:sel.y - this.y};
    dir.x /= dist;
    dir.y /= dist;
    return {player:sel,dist:dist,dir:dir}
  }
  getNearestPlayerDist() {
    const room = ROOM_LIST[this.room];
    if (!room) return;

    var record = Infinity;
    for (var i in room.players) {
      var p = room.players[i];
      if (p.pumpkinMaster || p.health <= 0 || p.immune) continue;
      var dx = this.x - p.x;
      var dy = this.y - p.y;
      var d = dx * dx + dy * dy;
      if (d < record) {
        record = d;
      }
    }
    return Math.sqrt(record);
  }
}
var Entities = {};
Entities.monster = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "monster";
    this.category = "monster";
    this.img = "attack";
    this.bbox = {
      minX:-0.45,
      maxX:0.45,
      minY:-0.45,
      maxY:0.45
    }
    this.hitdist = 0.2;
  }
  update() {
    const room = ROOM_LIST[this.room];

    const nearest = this.getNearestPlayer(Infinity);
    if (!nearest) return;
    var sel = nearest.player;
    const dist = nearest.dist;
    if (dist < 0.350 && !sel.immune) {
      sel.damage(0.5, this);
      this.destroy();
      return;
    }
    var dir = nearest.dir;
    const s = 2.2 * speed;
    this.moveForward(dir,s)
  }
};
Entities.ghost = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "ghost";
    this.category = "ghost";
    this.img = "attack";
    this.bbox = {
      minX:-0.4,
      maxX:0.4,
      minY:-0.65,
      maxY:0.65
    }
    this.hitdist = 0.2;
  }
  update() {
    const room = ROOM_LIST[this.room];

    const nearest = this.getNearestPlayer(Infinity);
    if (!nearest) return;
    var sel = nearest.player;
    const dist = nearest.dist;
    if (dist < 0.350 && !sel.immune) {
      sel.damage(0.5, this);
      this.destroy();
      return;
    }
    const s = 2.2 * speed;
    var dir = nearest.dir;
    dir.x *= s;
    dir.y *= s;

    this.x += dir.x;
    this.y += dir.y;
  }
};
Entities.nuke = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "nuke";
    this.category = "nuke";
    this.f = 0;
    this.img = "target";
    this.depth = -1;
    this.timer = 4;
    this.falling_pumpkin = new Entities.falling_pumpkin(x, y - 400/9, room, spawnedBy);
    this.lolipop_immune = true;
  }
  update() {
    this.timer -= speed;
    if (this.timer <= 0) {
      this.destroy();
    }
  }
  hit(p) {}
};
Entities.falling_pumpkin = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "falling_pumpkin";
    this.category = "nuke";
    this.depth = 1;
    this.timer = 4;
    this.smashed = false;
    this.lolipop_immune = true;
  }
  update() {
    const room = ROOM_LIST[this.room];
    this.timer -= speed;
    if (this.timer > 0) {
      this.y += (100 / 9) * speed;
    }
    if (this.timer <= 0 && !this.smashed) {
      for (var i in room.players) {
        var p = room.players[i];
        if (p.pumpkinMaster || p.immune) continue;
        var d = (this.x - p.x) ** 2 + (this.y - p.y) ** 2;
        if (d < 4) {
          p.damage(1.0, this);
        }
      }
      this.smashed = true;
    }
    if (this.timer <= -2) {
      this.destroy();
    }
  }
  hit(p) {}
};
Entities.speeder = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "speeder";
    this.category = "speeder";
    this.img = "attack";
    this.bbox = {
      minX:-0.4,
      maxX:0.4,
      minY:-0.4,
      maxY:0.4
    }
    this.hitdist = 0.25;
  }
  update() {
    const room = ROOM_LIST[this.room];

    const nearest = this.getNearestPlayer(Infinity);
    if (!nearest) return;
    var sel = nearest.player;
    this.facing = Math.sign(sel.x-this.x);
    const dist = nearest.dist;
    if (dist < 0.350 && !sel.immune) {
      sel.damage(0.5, this);
      this.destroy();
      return;
    }
    var dir = nearest.dir;
    const s = 4.4 * speed;
    this.moveForward(dir,s);
  }
};
Entities.rusher = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "rusher";
    this.category = "rusher";
    this.img = "idle";
    this.bbox = {
      minX:-0.47,
      maxX:0.47,
      minY:-0.47,
      maxY:0.47
    }
    this.hitdist = 0.2;
    this.cooldown = 1;
    this.rushing = 0;
    this.dir = {x:0, y:0};
    this.value = 2;
  }
  update() {
    const room = ROOM_LIST[this.room];
    if (this.rushing == 0) {
      const nearest = this.getNearestPlayer(10);
      if (!nearest) return;
      var sel = nearest.player;
      const dist = nearest.dist;
      var dir = nearest.dir;
      const s = (2 / 3) * speed;
      var direction = 2;
      if (dist < 10/3) {
        this.cooldown -= speed;
        if (this.cooldown <= 0.5 && this.img != "attack") {
          this.img = "attack";
        }
        if (this.cooldown <= 0) {
          this.dir = {
            x: dir.x * s,
            y: dir.y * s
          };
          this.rushing = 1;
          this.cooldown = 1;
          this.img = "rush";
        }
        direction = 0;
        if (dist < 3) {
          direction = -4;
        }
      }
      this.moveForward(dir,s*direction)
    } else {
      if (this.rushing == 1) {
        for (var i in room.players) {
          var p = room.players[i];
          if (p.pumpkinMaster || p.health <= 0 || p.immune) continue;
          var d = (this.x - p.x) ** 2 + (this.y - p.y) ** 2;
          if (d < 0.350**2) {
            p.damage(0.5, this);
            this.img = "idle";
            this.rushing = 2;
            this.dir.x *= -1;
            this.dir.y *= -1;
          }
        }
      } else if (this.rushing == 2) {
        var dist = this.getNearestPlayerDist();
        if (dist >= 10/3) {
          this.img = "idle";
          this.rushing = 0;
        }
      }
      var dir = {x:this.dir.x,y:this.dir.y};
      dir.x *= 6;
      dir.y *= 6;
      dir.x += this.x;
      dir.y += this.y;
      if (!room.checkCollisions(dir.x,dir.y,this.bbox,this)) {
        this.x = dir.x;
        this.y = dir.y;
      } else {
        this.img = "idle";
        this.rushing = 0;
      }
    }
  }
  hit(p) {
    if (this.rushing == 1) {
      this.rushing = 2;
      this.dir.x *= -1;
      this.dir.y *= -1;
      return true;
    }
    if (this.rushing == 2) return true;

    return super.hit(p);
  }
};
Entities.wizard = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "wizard";
    this.category = "wizard";
    this.img = "idle";
    this.bbox = {
      minX:-0.47,
      maxX:0.47,
      minY:-0.47,
      maxY:0.47
    }
    this.hitdist = 0.2;
    this.cooldown = 2;
    this.value = 2;
  }
  update() {
    const room = ROOM_LIST[this.room];
    const nearest = this.getNearestPlayer(10);
    if (!nearest) return;
    var sel = nearest.player;
    const dist = nearest.dist;
    var dir = nearest.dir;
    const s = (2 / 3) * speed;

    this.cooldown -= speed;
    if (this.cooldown <= 1 && this.img != "attack") {
      this.img = "attack";
    }
    if (this.cooldown <= 0) {
      var pdir = {
        x: dir.x * s * 4,
        y: dir.y * s * 4
      };
      var p = new Entities.projectile(this.x, this.y, pdir, this.room, this.spawnedBy);
      this.img = "idle";
      this.cooldown = 2;
    }
    var direction = 1.5;
    if (dist < 10/3) {
      direction = 0;
      if (dist < 3) {
        direction = -3;
      }
    }
    this.moveForward(dir,s*direction);
  }
};
Entities.projectile = class extends Entity {
  constructor(x, y, dir, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "projectile";
    this.category = "wizard";
    this.bbox = {
      minX:-0.25,
      maxX:0.25,
      minY:-0.25,
      maxY:0.25
    }
    this.dir = dir;
  }
  update() {
    const room = ROOM_LIST[this.room];
    for (var i in room.players) {
      var p = room.players[i];
      if (p.pumpkinMaster || p.health <= 0 || p.immune) continue;
      var d = (this.x - p.x) ** 2 + (this.y - p.y) ** 2;
      if (d < 0.350**2) {
        p.damage(0.5, this);
        this.destroy();
        return;
      }
    }
    this.x += this.dir.x;
    this.y += this.dir.y;

    if (room.checkCollisions(this.x,this.y,this.bbox,this)) {
      this.destroy();
    }
  }
  hit(p) {
    this.destroy();
    return true;
  }
};
Entities.brute = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "brute";
    this.category = "brute";
    this.img = "attack";
    this.bbox = {
      minX:-0.45,
      maxX:0.45,
      minY:-0.45,
      maxY:0.45
    }
    this.hitdist = 0.2;
    this.recoil = 0;
    this.cooldown = 2.5;
    this.weak = false;
    this.leaping = false;
    this.leapcount = 0.5;
    this.vely = 0;
    this.oldy = 0;
    this.value = 5;
  }
  update() {
    const room = ROOM_LIST[this.room];
    if (this.leaping) {
      if (this.y < this.oldy || this.vely <= 0) {
        this.vely += 11 * speed;
        this.y += this.vely * speed;
        return;
      }
      this.y = this.oldy;
      this.leapcount += speed;
      if (this.weak == false) {
        this.vely = 0;
        var shockwave = new Entities.shockwave(this.x,this.y,this.room,this.spawnedBy);
        this.img = "icon";
        this.weak = true;
      }
      if (this.leapcount >= 4.5) {
        this.leaping = false;
        this.img = "attack";
        this.weak = false;
      }
      return;
    }
    const nearest = this.getNearestPlayer(10);
    if (!nearest) return;
    var sel = nearest.player;
    const dist = nearest.dist;
    var dir = nearest.dir;
    var s = (2 / 3) * speed;
    if (dist < 3) {
      this.cooldown -= speed;
      if (this.cooldown <= 0) {
        this.leaping = true;
        this.vely = -8;
        this.oldy = this.y;
        this.leapcount = 0;
        this.img = "leap";
        this.cooldown = 2.5;
      }
    }
    if (this.recoil > 0) {
      this.recoil -= speed;
      s *= -5;
    } else {
      if (dist < 0.350 && !sel.immune) {
        sel.damage(0.25, this);
        this.recoil = 0.5;
        return;
      }
      s *= 2.5;
    }

    this.moveForward(dir,s);
  }
  hit(p) {
    if (this.weak) return super.hit(p);
    if (this.leaping) return;
    this.recoil = 0.5;
    return true;
  }
};
Entities.shockwave = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "shockwave";
    this.category = "brute";
    this.depth = -1;
    this.range = 0;
    this.smashed = false;
    this.hasHit = [];
    this.lolipop_immune = true;
  }
  update() {
    const room = ROOM_LIST[this.room];
    this.range += 2 * speed;
    this.f = Math.round(this.range);
    if (this.range < 3) {
      for (var i in room.players) {
        var p = room.players[i];
        if (p.pumpkinMaster || p.immune) continue;
        if (this.hasHit.includes(i)) continue;
        var d = (this.x - p.x) ** 2 + (this.y - p.y) ** 2;
        if (d < this.range * this.range) {
          p.damage(1.0, this);
          this.hasHit.push(i);
        }
      }
    }
    if (this.range >= 3.5) {
      this.destroy();
    }
  }
  hit(p) {}
};
Entities.catapult = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "catapult";
    this.category = "catapult";
    this.img = "launch";
    this.bbox = {
      minX:-0.97,
      maxX:0.97,
      minY:-0.97,
      maxY:0.97
    }
    this.hitdist = 0.4;
    this.f = 0;
    this.cooldown = 1.8;
    this.value = 1;
  }
  update() {
    const room = ROOM_LIST[this.room];
    const nearest = this.getNearestPlayer(12);
    if (!nearest) return;
    var sel = nearest.player;
    this.facing = Math.sign(this.x-sel.x);

    this.cooldown -= speed;
    if (this.cooldown <= 1) this.f = 0;
    if (this.cooldown <= 2/3) this.f = 1;
    if (this.cooldown <= 1/3) this.f = 2;
    if (this.cooldown <= 0) {
      var targetPos = {
        x: sel.x,
        y: sel.y
      };
      var p = new Entities.payload(this.x, this.y - 0.5, targetPos, this.room, this.spawnedBy);
      this.cooldown = 1.8;
      this.f = 3;
    }
  }
};
Entities.payload = class extends Entity {
  constructor(x, y, target, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "payload";
    this.category = "catapult";
    this.target = target;
    this.start = { x:x, y:y };
    this.path = 0;
    this.lolipop_immune = true;
  }
  update() {
    const room = ROOM_LIST[this.room];
    this.path += speed;
    if (this.path >= 2.5) {
      for (var i in room.players) {
        var p = room.players[i];
        if (p.pumpkinMaster || p.health <= 0 || p.immune) continue;
        var d = (this.x - p.x) ** 2 + (this.y - p.y) ** 2;
        if (d < 1.2**2) {
          p.damage(0.5, this);
        }
      }
      io.to(room.id).emit('hit', this.x, this.y);
      this.destroy();
    }
    var t = this.path / 2.5;
    this.x = (1-t)*this.start.x + t*this.target.x;
    var posy = -16*t*(1-t);
    this.y = (1-t)*this.start.y + t*this.target.y + posy;
  }
  hit(player) {
    return;
  }
};
Entities.debuffer = class extends Entity {
  constructor(x, y, room, spawnedBy) {
    super(x, y, room, spawnedBy);
    this.type = "debuffer";
    this.category = "debuffer";
    this.img = "idle";
    this.bbox = {
      minX:-0.47,
      maxX:0.47,
      minY:-0.47,
      maxY:0.47
    }
    this.hitdist = 0.2;
    this.cooldown = 2;
    this.value = 3;
  }
  update() {
    const room = ROOM_LIST[this.room];
    var record = Infinity;
    var sel;
    for (var i in room.players) {
      var p = room.players[i];
      if (p.pumpkinMaster || p.health <= 0 || p.immune) continue;
      var dx = this.x - p.x;
      var dy = this.y - p.y;
      var d = dx * dx + dy * dy;
      if (d < record) {
        record = d;
        sel = p;
      }
      if (d < 5*5) {
        p.disabled = true;
      }
    }
    const dist = Math.sqrt(record);
    if (dist > 20 || !sel) return;
    const s = (2 / 3) * speed;
    var direction = 1.5;
    if (dist < 10/3) {
      direction = 0;
      if (dist < 3) {
        direction = -3;
      }
    }
    var dir = {x:sel.x - this.x, y:sel.y - this.y};
    dir.x /= dist;
    dir.y /= dist;
    this.moveForward(dir,s*direction);
  }
};

var EntityData = {};
EntityData.monster = {
  cost: 1,
  pumpkin: true
};
EntityData.ghost = {
  cost: 3,
  pumpkin: true
};
EntityData.nuke = {
  cost: 3,
  pumpkin: false
};
EntityData.speeder = {
  cost: 4,
  pumpkin: true
};
EntityData.rusher = {
  cost: 5,
  pumpkin: true
};
EntityData.wizard = {
  cost: 7,
  pumpkin: true
};
EntityData.brute = {
  cost: 10,
  pumpkin: true
};
EntityData.catapult = {
  cost: 12,
  pumpkin: false
};
EntityData.debuffer = {
  cost: 15,
  pumpkin: true
};


// --------
// Abilities
// --------
var Abilities = {};
Abilities.fog = async function(rx,ry,room) {
  var tx = rx * 14;
  var ty = ry * 14;
  // Top

  var fog;

  var oldfog = room.fogs.filter(f => f.rx == rx && f.ry == ry);
  if (oldfog.length == 1) {
    fog = oldfog[0];
    fog.thick++;
  } else {
    fog = {
      x:tx+7.5,
      y:ty+7.5,
      rx:rx,
      ry:ry,
      thick:0
    }
    room.fogs.push(fog);
  }

  await wait(60*1000);
  fog.thick--;
  if (fog.thick < 0) {
    const index = room.fogs.indexOf(fog);
    //if (index == -1) return;
    room.fogs.splice(index,1);
  }
}
Abilities.vines = async function(rx,ry,room,free) {
  rx = rx * 14;
  ry = ry * 14;
  var v = [];
  // Top
  if (room.tilemap[ry] && room.tilemap[ry][rx+7] == 0) {
    var v1 = Abilities.newVine(rx+7.5,ry+0.5,"horiz");
    room.vines.push(v1); v.push(v1);
  }
  // Bottom
  if (room.tilemap[ry+15] && room.tilemap[ry+15][rx+7] == 0) {
    var v2 = Abilities.newVine(rx+7.5,ry+14.5,"horiz");
    room.vines.push(v2); v.push(v2);
  }
  // Left
  if (room.tilemap[ry+7] && room.tilemap[ry+7][rx] == 0) {
    var v3 = Abilities.newVine(rx+0.5,ry+7.5,"vert");
    room.vines.push(v3); v.push(v3);
  }
  // Right
  if (room.tilemap[ry+7] && room.tilemap[ry+7][rx+15] == 0) {
    var v4 = Abilities.newVine(rx+14.5,ry+7.5,"vert");
    room.vines.push(v4); v.push(v4);
  }

  if (free) return;

  /*await wait(60*1000);
  for (var i = 0; i < v.length; i++) {
    const index = room.vines.indexOf(v[i]);
    if (index == -1) continue;
    room.vines.splice(index,1);
  }*/
}
Abilities.newVine = function(x,y,orient) {
  var v = {
    x:x,
    y:y,
    orient:orient,
    health:25,
    spawnedAt:Date.now()
  };
  if (orient == "horiz") {
    v.bbox = {
      minX:-1.5,
      maxX:1.5,
      minY:-0.5,
      maxY:0.5
    }
  }
  else if (orient == "vert") {
    v.bbox = {
      minX:-0.5,
      maxX:0.5,
      minY:-1.5,
      maxY:1.5
    }
  }
  return v;
}
Abilities.swarm = async function(rx,ry,room,spawnedBy) {
  rx = rx * 14;
  ry = ry * 14;
  var swarm = [];
  for (var x = rx; x < rx + 15; x++) {
    for (var y = ry; y < ry + 15; y++) {
      if (!room.pumpkins[x+","+y]) continue;
      room.destroyPumpkin(x,y);
      var e = new Entities.monster(x+0.5,y+0.5,room.id,spawnedBy);
      e.swarm = true;
      swarm.push(e);
    }
  }
  await wait(20*1000);
  for (var i = 0; i < swarm.length; i++) {
    if (!room.entities.includes(swarm[i])) continue;
    io.to(room.id).emit('hit', swarm[i].x, swarm[i].y);
    swarm[i].destroy();
  }
}
Abilities.shield = async function(rx,ry,room,spawnedBy) {
  rx = rx * 14;
  ry = ry * 14;
  // Top
  const shield = {
    x:rx+7.5,
    y:ry+7.5,
    health:50
  }
  room.shield = shield;

  await wait(120*1000);
  if (room.shield == shield) {
    room.shield = false;
  }
}
Abilities.generators = async function(rx,ry,room,spawnedBy) {
  rx = rx * 14;
  ry = ry * 14;

  if (!spawnedBy) return;

  var oldgen = room.generators[rx+","+ry];
  if (oldgen && (oldgen.amount >= 1.2 || spawnedBy != oldgen.spawnedBy)) {
    room.coins[spawnedBy] += AbilityData.generators.cost;
    return;
  }
  if (oldgen) {
    oldgen.amount += 0.35;
    oldgen.maxhealth += 10;
    oldgen.health += 10;
    //oldgen.maxhealth += 5;
    //oldgen.health = oldgen.maxhealth;
    return;
  }

  const generator = {
    x:rx+7.5,
    y:ry+7.5,
    amount:0.5,
    health:25,
    maxhealth:25,
    spawnedBy: spawnedBy
  }
  room.generators[rx+","+ry] = generator;

  while (true) {
    await wait(1000);
    if (!room.generators[rx+","+ry]) return;
    room.coins[spawnedBy] += generator.amount;
    var p = room.players[spawnedBy];
    if (p) p.gamestats.CoinsGenerated += generator.amount;
  }
}

var AbilityData = {};
AbilityData.fog = {
  cost: 5,
  cooldown: 1,
};
AbilityData.vines = {
  cost: 8,
  cooldown: 1,
};
AbilityData.swarm = {
  cost: 22,
  cooldown: 10 * 1000,
};
AbilityData.shield = {
  cost: 75,
  cooldown: 90 * 1000,
};
AbilityData.generators = {
  cost: 18,
  cooldown: 1,
};

// Candies
var CandyData = {};
CandyData.candy_corn = {
  loseondamaged: true,
  duration: 60,
  collect: function(player) {
    player.addScore(10);
  },
  expire: async function(player) {},
};
CandyData.smarties = {
  duration: 20,
  loseonswing: true,
  collect: function(player) {
    player.immune = true;
    player.skin = 3;
  },
  expire: function(player) {
    player.immune = false;
    player.skin = player.realskin; 
  }
};
CandyData.peppermint = {
  collect: async function(player,room) {
    room.startTime += 30 * 1000;
    io.to(room.id).emit('setTime',room.startTime);
  },
  expire: async function(player) {},
};
CandyData.lolipop = {
  duration: 30,
  loseonswing: true,
  loseondamaged: true,
  collect: async function(player) {},
  expire: async function(player,room) {
    var isfar = function(e) {
      var dx = e.x-this.x;
      var dy = e.y-this.y;
      return dx * dx + dy * dy > 64;
    };
    // Kill Entities
    for (var i = room.entities.length - 1; i >= 0; i--) {
      var e = room.entities[i];
      if (isfar(e) || e.lolipop_immune) continue;
      player.addScore(e.value);
      player.gamestats.EntitiesKilled[e.type]++;
      player.gamestats.EntitiesKilledWithLolipop++;
      io.to(room.id).emit('hit', e.x, e.y);
      e.destroy();
    }
    // Check for vines
    for (var i = room.vines.length - 1; i >= 0; i--) {
      var v = room.vines[i];
      if (isfar(v)) continue;
      v.health = 0;
      this.gamestats.AbilityDamage.vines+=v.health;
      this.gamestats.AbilitiesDestroyed.vines++;
      room.vines.splice(i,1);
    }
    // Check for generators
    for (i in room.generators) {
      var gen = room.generators[i];
      if (isfar(gen)) continue;
      this.addScore(0.2 * gen.health);
      gen.health = 0;
      this.gamestats.AbilityDamage.generators+=gen.health;
      this.gamestats.AbilitiesDestroyed.generators++;
      delete room.generators[i];
    }
  },
};
CandyData.hot_tamale = {
  duration: 20,
  loseondamaged: true,
  collect: async function(player) {
    player.smashInt = setInterval(()=>{player.smash();},100);
  },
  expire: async function(player) {
    clearInterval(player.smashInt);
  },
};
CandyData.ghost_chew = {
  duration: 20,
  collect: async function(player) {},
  expire: async function(player,room) {
    var s = Math.sqrt(2);
    if (room.checkCollisions(player.x,player.y,player.bbox,player)) return;
    for (var i = 0.05; i < 2; i+=0.05) {
      if (!room.checkCollisions(player.x+i,player.y,player.bbox,player)) { player.x += i; break; }
      if (!room.checkCollisions(player.x,player.y+i,player.bbox,player)) { player.y += i; break; }
      if (!room.checkCollisions(player.x-i,player.y,player.bbox,player)) { player.x -= i; break; }
      if (!room.checkCollisions(player.x,player.y-i,player.bbox,player)) { player.y -= i; break; }
      if (!room.checkCollisions(player.x+i/s,player.y+i/s,player.bbox,player)) { player.x += i/s; player.y += i/s; break; }
      if (!room.checkCollisions(player.x+i/s,player.y-i/s,player.bbox,player)) { player.x += i/s; player.y -= i/s; break; }
      if (!room.checkCollisions(player.x-i/s,player.y-i/s,player.bbox,player)) { player.x -= i/s; player.y -= i/s; break; }
      if (!room.checkCollisions(player.x-i/s,player.y+i/s,player.bbox,player)) { player.x -= i/s; player.y += i/s; break; }
    }
  },
};
CandyData.chocolate = {
  duration: 20,
  loseondamaged: true,
  collect: async function(player) {},
  expire: async function(player) {},
};
CandyData.candied_apple = {
  collect: async function(player) {
    player.health += 3;
  },
  expire: async function(player) {},
};
CandyData.blue_candy = {
  collect: async function(player) {
    player.upgradePts++;
    SOCKET_LIST[player.socket].emit('lvlUp',player.upgradeLvls);
  },
  expire: async function(player) {},
};
function RandomCandy() {
  return weightedRandom(0,["candy_corn","smarties","peppermint","blue_candy","candied_apple","hot_tamale","ghost_chew","chocolate","lolipop"],[0.25,0.2,0.15,0.1,0.1,0.05,0.05,0.05,0.05]);
}

// --------

var ROOM_LIST = {};
var queue = {};
var next = randomString(8);
ROOM_LIST[next] = new Room(next);
queue[next] = ROOM_LIST[next];
clientQueue = {};

SOCKET_LIST = {};
CLIENT_LIST = {};

io.sockets.on('connection', function (socket) {
  SOCKET_LIST[socket.id] = socket;
  const client = new Client(socket.id);
  CLIENT_LIST[socket.id] = client;
  console.log("Socket("+socket.id+") joined!");

  // Room Management
  socket.on('joinRoom', function () {
    client.room = next;

    socket.join(next);
    socket.emit('room',next,true,ROOM_LIST[next].settings);

    ROOM_LIST[next].addSocket(socket);

    console.log("Socket("+socket.id+") has joined Room("+client.room+")");
  });
  socket.on("leaveRoom", function (room) {
    socket.leave(room);

    client.room = "";
    if (!ROOM_LIST[room]) return;
    ROOM_LIST[room].removeSocket(socket,false);
  });
  socket.on('hostRoom', function (room) {
    if (!room || room.length != 8) room = randomString(8);
    client.room = room;

    ROOM_LIST[room] = new Room(room);
    queue[room] = ROOM_LIST[room];

    socket.join(room);
    socket.emit('room', room, false, ROOM_LIST[room].settings);

    ROOM_LIST[room].addSocket(socket);

    console.log("Socket("+socket.id+") is hosting Room("+room+")");
  });
  socket.on('doTutorial', function () {
    client.room = socket.id;
    socket.join(socket.id);

    ROOM_LIST[socket.id] = new TutorialRoom(socket);

    socket.emit('room', socket.id, false, ROOM_LIST[socket.id].settings);

    console.log("Socket("+socket.id+") has begun Tutorial Room("+socket.id+")");
  });
  socket.on("continueTutorial", function () {
    delete pendingTutorials[socket.id];
  });
  socket.on('updateSettings', function (room, settings) {
    if (!ROOM_LIST[room]) return;
    ROOM_LIST[room].settings = settings;
    for (var i in ROOM_LIST[room].players) {
      SOCKET_LIST[i].emit('room', room, room == next, settings);
    }
  });
  socket.on('viewRooms', function () {
    clientQueue[socket.id] = socket;
  });
  socket.on('stopViewRooms', function () {
    delete clientQueue[socket.id];
  });
  socket.on('joinRoomCode', function (room) {
    if (!ROOM_LIST[room] || ROOM_LIST[room].state != "lobby") {
      socket.emit('rejoinFailed');
      return;
    }

    client.room = room;

    socket.join(room);
    socket.emit('room',room,room == next,ROOM_LIST[room].settings);

    delete clientQueue[socket.id];

    ROOM_LIST[room].addSocket(socket);

    console.log("Socket("+socket.id+") has joined Room("+room+")");
  });
  socket.on('rejoin', function (room, oldid, reloaded) {
    if (!ROOM_LIST[room]) {
      socket.emit('rejoinFailed');
      return;
    }
    client.room = room;
    socket.join(room);

    ROOM_LIST[room].reviveSocket(socket,oldid,reloaded);
  });

  // Skeleton Actions
  socket.on('move',(u,d,l,r) => {
    if (!client.player) return;
    client.player.move(u,d,l,r);
  });
  socket.on('smash',() => {
    if (!client.player) return;
    client.player.smash();
  });
  socket.on('upgrade',(name) => {
    if (!client.player) return;
    client.player.upgrade(name);
  });

  //Other
  socket.on('swap',()=>{
    var room = ROOM_LIST[socket.id];
    if (!room) return;
    if (!room.freeplay) return;
    room.swap(true);
  });
  socket.on('freeplay',()=>{
    var room = ROOM_LIST[socket.id];
    if (!room) return;
    if (!room.freeplay) {
      socket.emit('tutorialMsg',[
        "Entering freeplay!",
        "Swap by pressing P",
        "Leave with ESCAPE"
      ],Date.now(),false);
      room.vines = [];
      clearInterval(room.healVines);
      console.log("Tutorial Room("+room.id+") has activated freeplay!")
    }
    room.freeplay = true;
  });

  // Pumpkin Master actions
  socket.on('spawn',(sel,x,y) => {
    if (!client.room) return;
    const room = ROOM_LIST[client.room];
    if (!room) return;
    //ROOM_LIST[client.room].spawnFrom(sel,1,x,y,socket.id);
    var e = room.spawn(sel,x,y,socket.id);
    var p = room.players[socket.id];
    p.gamestats.EntitiesSpawned[sel]++;
  });
  socket.on('ability',(sel,x,y) => {
    if (!client.room) return;
    const room = ROOM_LIST[client.room];
    if (!room) return;
    room.ability(sel,x,y,socket.id);
    var p = room.players[socket.id];
    p.gamestats.AbilitiesUsed[sel]++;
  });

  // Misc
  socket.on('changeName',(name) => {
    client.name = name;
  });
  socket.on('changeHat',(hat) => {
    client.hat = hat;
  });

  // Disconnect
  socket.on("disconnecting", () => {
    const r = Array.from(socket.rooms);
    for (var j = 0; j < r.length; j++) {
      socket.leave(r[j]);
    }
    if (!ROOM_LIST[client.room]) return;
    ROOM_LIST[client.room].removeSocket(socket,true);
  });
  socket.on('disconnect', function () {
    console.log("Socket("+socket.id+") disconnected!");
    var time = Math.round((Date.now()-client.timeJoined)/1000);
    var minutes = Math.floor(time/60);
    //if (minutes < 10) minutes = "0"+minutes;
    var seconds = time % 60;
    if (seconds < 10) seconds = "0"+seconds;
    console.log(" - Active for "+minutes+":"+seconds);
    delete SOCKET_LIST[socket.id];
    delete CLIENT_LIST[socket.id];
  });
});

function tick() {
  for (var i in ROOM_LIST) {
    ROOM_LIST[i].update();
  }
}

function perSecond() {
  for (var i in ROOM_LIST) {
    var room = ROOM_LIST[i];
    if (room.amount >= room.settings.start_count && room.state == "lobby") {
      start(i);
      console.log("Room("+i+") has started!");
      if (i == next) {
        next = randomString(8);
        ROOM_LIST[next] = new Room(next);
        queue[next] = ROOM_LIST[next];
      }
    }
    for (var j in room.coins) {
      room.coins[j] += room.coinMult;
      var soc = SOCKET_LIST[j];
      if (!soc) continue;
      soc.emit('coins',room.coins[j]);
    }
    if (room.amount <= 0 && i != next) {
      if (queue[i]) delete queue[i];
      delete ROOM_LIST[i];
      console.log("Deleted Room("+i+")");
    }
  }
  var codes = [];
  for (var i in queue) {
    codes.push({
      id: i,
      amount: queue[i].amount,
      next: (next==i),
      settings: queue[i].settings
    });
  }
  for (var i in clientQueue) {
    clientQueue[i].emit('roomCodes',codes);
  }
}

async function start(room) {
  var game = ROOM_LIST[room];
  game.state = "starting";

  for (var i = 5; i >= 0; i--) {
    await wait(1000);
    io.to(room).emit("timer",i);
  }

  const time = Date.now();

  if (queue[room]) delete queue[room];
  game.pm_amount = Math.floor(game.amount/6)+1;
  game.start(time);

  console.log("Room ("+room+") has started!");
  io.to(room).emit('start',time);

  game.skeletons = Object.keys(game.players);
  game.pumpkin_masters = [];
  for (var i = 0; i < game.pm_amount; i++) {
    var r = randomIndex(game.skeletons);
    var p = game.skeletons[r];
    game.players[p].pumpkinMaster = true;
    console.log("In Room ("+room+") Client ("+p+") was selected as Pumpkin Master");
    game.pumpkin_masters.push(p);
    game.skeletons.splice(r,1);
  }
  for (var i in game.players) {
    game.players[i].x = 15/2;
    game.players[i].y = 15/2;
    SOCKET_LIST[i].emit("PM",game.players[i].pumpkinMaster);
  }
  // Candies
  setTimeout(()=>{
    game.TrickOrTreat();
  },(Math.random()*30+15)*1000);
  // Init Coins
  var starting_amount = (15+7.5*game.skeletons.length)/game.pumpkin_masters.length;
  game.coins = {};
  for (var i = 0; i < game.pumpkin_masters.length; i++) game.coins[game.pumpkin_masters[i]] = starting_amount;
  game.coinMult = 1;

  /*var clients = io.sockets.adapter.rooms.get(room);
  var a = 0;
  for (const i of clients){
    SOCKET_LIST[i].emit("PM",a == PM);

    //CLIENT_LIST[i].rank = a;
    //SOCKET_LIST[i].emit("rank",CLIENT_LIST[i].rank);
    //console.log("In room ("+room+") socket ("+i+") was ranked: "+a);
    a++;
  }*/
}


// Random Functions
function randomProperty(obj) {
  const keys = Object.keys(obj);
  return randomValueArray(keys);
};
function randomValue(obj) {
  return obj[randomProperty(obj)];
}
function randomValueArray(arr) {
  return arr[randomIndex(arr)];
}
function randomIndex(arr) {
  return arr.length * Math.random() << 0;
}
function weightedRandom(def, values, weights) {
  var prob = Math.random();
  for (var i = 0; i < values.length; i++) {
    if (prob < weights[i]) {
      return values[i];
    }
    prob -= weights[i];
  }
  return def;
}
function randomString(length) {
  var key = '';
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    key += characters.charAt(Math.floor(Math.random() * 
  charactersLength));
  }
  return key;
}

// Misc Functions
function wait(t) {
  return new Promise(function(resolve) {
    setTimeout(()=>{
      resolve();
    },t);
  });
}
function intersectAABB(x1,y1,bbox1,x2,y2,bbox2) {
  return (
    x1+bbox1.minX <= x2+bbox2.maxX &&
    x1+bbox1.maxX >= x2+bbox2.minX &&
    y1+bbox1.minY <= y2+bbox2.maxY &&
    y1+bbox1.maxY >= y2+bbox2.minY
  );
}
function nullCheck(obj,def) {
  return obj == undefined ? def : obj;
}
