/* Pumpkin Clicker — standalone p5.js farm-builder for Pumpkin Smasher 2.
   Uses existing repository sprites where available; all other visuals are drawn with p5. */
(() => {
  "use strict";
  const SAVE_KEY = "pumpkin-clicker-save-v1";
  const TILE = 74;
  const START_SIZE = 3;
  const GENERATORS = [
    {id:"green",name:"Green pumpkin",emoji:"🟢",sprite:"/assets/pumpkins/new_pumpkin.png",cost:10,rate:0.25,color:"#7fb84a"},
    {id:"regular",name:"Pumpkin",emoji:"🎃",sprite:"/assets/pumpkins/pumpkin.png",cost:60,rate:1.1,color:"#e8892f"},
    {id:"gold",name:"Gold pumpkin",emoji:"🌟",sprite:"/assets/pumpkins/gold_pumpkin.png",cost:350,rate:5,color:"#e8bd3d"},
    {id:"diamond",name:"Diamond pumpkin",emoji:"💎",sprite:"/assets/pumpkins/diamond_pumpkin.png",cost:2200,rate:24,color:"#63d6d1"}
  ];
  const WORKERS = [
    {id:"monster",name:"Monster",emoji:"👹",cost:120,desc:"+0.35 base pumpkins/sec per worker",effect:"flat",value:0.35},
    {id:"ghost",name:"Ghost",emoji:"👻",cost:450,desc:"+1% output per generator owned",effect:"perGenerator",value:0.01},
    {id:"speeder",name:"Speeder",emoji:"💨",cost:1200,desc:"+5% production speed per worker",effect:"speed",value:0.05},
    {id:"rusher",name:"Rusher",emoji:"🏃",cost:3000,desc:"Periodic bonus harvest every 10 seconds",effect:"burst",value:3},
    {id:"brute",name:"Brute",emoji:"💪",cost:7000,desc:"+2 base pumpkins/sec per worker (drawn, no unique sprite)",effect:"flat",value:2},
    {id:"wizard",name:"Wizard",emoji:"🧙",cost:18000,desc:"+8% total production per worker",effect:"mult",value:0.08},
    {id:"debuffer",name:"Debuffer",emoji:"🧪",cost:60000,desc:"+12% strength to other workers per worker",effect:"support",value:0.12}
  ];
  const UPGRADES = [
    {id:"click",name:"Stronger clicks",desc:"+1 pumpkin per objective click",base:75,max:100},
    {id:"capacity",name:"Bigger baskets",desc:"+100 storage capacity",base:100,max:100},
    {id:"sell",name:"Better market",desc:"+10% selling price",base:250,max:100},
    {id:"shield",name:"Shield tuning",desc:"+5% shield bonus",base:400,max:100}
  ];
  let state, p, images={}, gridBox=null, selected={x:0,y:0}, buildMode="green", lastTick=0, lastSave=0, lastRusher=0, noticeText="", noticeUntil=0, dailyBoostUntil=0, clickPulse=0, autoSell=false, evolveCandidate=null, tileRects=[], resizeObserver;
  const emptyTile=()=>({type:"empty"});
  function freshState(){return {cash:250,pumpkins:0,lifetimePumpkins:0,totalSold:0,size:START_SIZE,tiles:Array(START_SIZE*START_SIZE).fill(null).map(emptyTile),workers:{},upgrades:{},prestige:0,prestigeBonus:0,autoSell:false,lastSeen:Date.now(),lastDaily:0,boostUntil:0,boostType:"",lastRusher:Date.now(),clicks:0};}
  function loadState(){
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw)return freshState();
      const saved=JSON.parse(raw); const base=freshState(); state={...base,...saved};
      state.size=Math.max(START_SIZE,Math.min(12,Number(state.size)||START_SIZE));
      if(!Array.isArray(state.tiles))state.tiles=[];
      while(state.tiles.length<state.size*state.size)state.tiles.push(emptyTile());
      state.tiles=state.tiles.slice(0,state.size*state.size).map(t=>t&&typeof t==="object"?t:emptyTile());
      state.workers=state.workers||{};state.upgrades=state.upgrades||{};
      const elapsed=Math.max(0,Math.min(30*24*3600,(Date.now()-(Number(state.lastSeen)||Date.now()))/1000));
      const cap=storageCapacity(false);
      const offline=Math.min(cap-state.pumpkins,productionRate()*elapsed);
      if(offline>0){state.pumpkins+=offline;state.lifetimePumpkins+=offline;setNotice("Welcome back! Your farm harvested "+fmt(offline)+" pumpkins while you were away.");}
      else if(elapsed>60)setNotice("Welcome back! Your storage was full, so production paused.");
      state.lastSeen=Date.now();state.lastRusher=Date.now();
      return state;
    }catch(e){console.warn("Could not load Pumpkin Clicker save",e);return freshState();}
  }
  function save(){if(!state)return;state.lastSeen=Date.now();state.autoSell=autoSell;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){console.warn("Save failed",e);} }
  function fmt(n){n=Math.max(0,Number(n)||0);if(n<1000)return n<10?String(Math.round(n*10)/10):Math.floor(n).toLocaleString();const units=["K","M","B","T","Qa","Qi"];let i=-1;while(n>=1000&&i<units.length-1){n/=1000;i++;}return n>=1000?n.toExponential(2):n.toFixed(n<10?2:1)+units[i];}
  function money(n){return "$"+fmt(n);}
  function setNotice(t){noticeText=t;noticeUntil=Date.now()+6500;const el=document.getElementById("notice");if(el)el.textContent=t;}
  function countType(type){return state.tiles.filter(t=>t.type===type).length;}
  function generatorCount(){return state.tiles.filter(t=>t.type==="generator").length;}
  function storageCapacity(includeBonus=true){let cap=100+Number(state.upgrades.capacity||0)*100;state.tiles.forEach(t=>{if(t.type==="vault")cap+=t.capacity||250;});return cap;}
  function generatorBaseRate(t){const g=GENERATORS.find(x=>x.id===t.tier)||GENERATORS[0];return g.rate*(t.level||1);}
  function workerCount(id){return Number(state.workers[id]||0);}
  function workerTotal(){return Object.values(state.workers).reduce((a,b)=>a+Number(b||0),0);}
  function workerSupport(){return 1+workerCount("debuffer")*0.12;}
  function productionRate(){
    let base=0, shields=0;
    state.tiles.forEach((t,i)=>{if(t.type!=="generator")return;const x=i%state.size,y=Math.floor(i/state.size);let shieldCount=0;
      state.tiles.forEach((s,j)=>{if(s.type!=="shield")return;const sx=j%state.size,sy=Math.floor(j/state.size);if(Math.abs(sx-x)<=1&&Math.abs(sy-y)<=1)shieldCount++;});
      const shieldBonus=shieldCount*(0.15+Number(state.upgrades.shield||0)*0.05)/(1+Math.max(0,shieldCount-1)*0.6);
      base+=generatorBaseRate(t)*(1+shieldBonus);
    });
    const flat=(workerCount("monster")*0.35+workerCount("brute")*2)*workerSupport();
    const speed=1+workerCount("speeder")*0.05*workerSupport();
    const perGen=1+workerCount("ghost")*0.01*generatorCount()*workerSupport();
    const mult=1+workerCount("wizard")*0.08*workerSupport();
    const prestige=1+state.prestigeBonus;
    const boost=Date.now()<Number(state.boostUntil||0)?1.5:1;
    return Math.max(0,(base+flat)*speed*perGen*mult*prestige*boost);
  }
  function sellPrice(){return 1+Number(state.upgrades.sell||0)*0.1;}
  function orthAdjacent(x,y,nx,ny){return Math.abs(x-nx)+Math.abs(y-ny)===1;}
  function vaultCollectsGenerator(vx,vy,gx,gy,gt){
    const w=gt.type==="mega"?gt.size||2:1;
    for(let yy=gy;yy<gy+w;yy++)for(let xx=gx;xx<gx+w;xx++)if(orthAdjacent(vx,vy,xx,yy))return true;
    return false;
  }
  function connectedProductionRate(){
    let total=0;state.tiles.forEach((t,i)=>{if(t.type!=="generator"&&t.type!=="mega")return;const x=i%state.size,y=Math.floor(i/state.size);let connected=false;
      state.tiles.forEach((v,j)=>{if(v.type!=="vault")return;const vx=j%state.size,vy=Math.floor(j/state.size);if(vaultCollectsGenerator(vx,vy,x,y,t))connected=true;});
      if(connected){if(t.type==="generator")total+=generatorBaseRate(t);else total+=(t.rate||0);}
    });return total;
  }
  function sellAll(){if(state.pumpkins<=0){setNotice("No pumpkins to sell yet.");return;}const qty=state.pumpkins,earned=qty*sellPrice();state.pumpkins=0;state.cash+=earned;state.totalSold+=qty;setNotice("Sold "+fmt(qty)+" pumpkins for "+money(earned)+".");updateUI();save();}
  function buyGenerator(id){const g=GENERATORS.find(x=>x.id===id);if(!g)return;const cost=Math.floor(g.cost*Math.pow(1.17,countType("generator")*0.65+countType("mega")*2));if(state.cash<cost){setNotice("Not enough cash for "+g.name+".");return;}state.cash-=cost;buildMode=id;setNotice(g.name+" selected. Click an empty tile to place it.");document.querySelectorAll("[data-build]").forEach(b=>b.classList.toggle("active",b.dataset.build===id));updateUI();}
  function buyStructure(type){const count=countType(type);const cost=Math.floor((type==="shield"?90:140)*Math.pow(1.28,count));if(state.cash<cost){setNotice("Not enough cash.");return;}state.cash-=cost;buildMode=type;setNotice((type==="shield"?"Shield":"Vault")+" selected. Click an empty tile to place it.");updateUI();}
  function placeAt(x,y){
    if(x<0||y<0||x>=state.size||y>=state.size)return;const i=y*state.size+x,t=state.tiles[i];
    if(t.type==="occupied"){const anchor=t.anchor;selected={x:anchor%state.size,y:Math.floor(anchor/state.size)};setNotice("That tile belongs to a mega-generator. Select its top-left tile to inspect it.");updateUI();return;}
    if(t.type!=="empty"){
      selected={x,y};if(t.type==="generator"||t.type==="mega"){buildMode="inspect";setNotice((t.type==="mega"?"Mega-generator":"Generator")+" selected. Production: "+fmt(t.type==="mega"?t.rate:generatorBaseRate(t))+"/sec.");}
      else if(t.type==="vault")setNotice("Vault: +"+fmt(t.capacity||250)+" pumpkin storage. Collects from generators touching its orthogonal edges.");
      else if(t.type==="shield")setNotice("Shield: boosts generators in its 3×3 area, including diagonals.");
      updateUI();return;
    }
    if(buildMode==="inspect"){setNotice("Choose a building from the shop first.");return;}
    if(buildMode==="green"||buildMode==="regular"||buildMode==="gold"||buildMode==="diamond"){
      const g=GENERATORS.find(z=>z.id===buildMode);if(!g)return;
      const cost=Math.floor(g.cost*Math.pow(1.17,countType("generator")*0.65+countType("mega")*2));
      if(state.cash<cost){setNotice("Not enough cash.");return;}
      state.cash-=cost;state.tiles[i]={type:"generator",tier:g.id,level:1};setNotice(g.name+" planted!");buildMode="inspect";
    }else if(buildMode==="shield"||buildMode==="vault"){
      const count=countType(buildMode),cost=Math.floor((buildMode==="shield"?90:140)*Math.pow(1.28,count));
      if(state.cash<cost){setNotice("Not enough cash.");return;}
      state.cash-=cost;state.tiles[i]=buildMode==="shield"?{type:"shield"}:{type:"vault",capacity:250};setNotice(buildMode==="shield"?"Shield placed.":"Vault placed. Connect it to a generator to collect production.");buildMode="inspect";
    }
    selected={x,y};updateUI();save();
  }
  function canEvolveAt(x,y){
    if(x<0||y<0||x+1>=state.size||y+1>=state.size)return null;
    const ids=[y*state.size+x,y*state.size+x+1,(y+1)*state.size+x,(y+1)*state.size+x+1];
    const tiles=ids.map(i=>state.tiles[i]);
    if(!tiles.every(t=>t.type==="generator"))return null;
    if(!tiles.every(t=>t.tier===tiles[0].tier))return null;
    return {ids,tiles,tier:tiles[0].tier,x,y};
  }
  function evolveSelected(){
    const x=selected.x,y=selected.y,candidate=canEvolveAt(x,y);
    if(!candidate){setNotice("Select the top-left tile of a 2×2 square of four same-tier generators.");return;}
    const rate=candidate.tiles.reduce((a,t)=>a+generatorBaseRate(t),0)*1.35;
    state.tiles[candidate.ids[0]]={type:"mega",tier:candidate.tier,size:2,rate,level:1};
    for(const id of candidate.ids.slice(1))state.tiles[id]={type:"occupied",anchor:candidate.ids[0]};
    selected={x,y};setNotice("Mega-generator evolved! It occupies a 2×2 footprint and produces "+fmt(rate)+"/sec.");updateUI();save();
  }
  function expandFarm(){const old=state.size;if(old>=12){setNotice("Farm has reached its maximum size.");return false;}const next=old+1,tiles=Array(next*next).fill(null).map(emptyTile);for(let y=0;y<old;y++)for(let x=0;x<old;x++)tiles[y*next+x]=state.tiles[y*old+x];state.size=next;state.tiles=tiles;return true;}
  function doPrestige(){
    const threshold=1000000*Math.pow(5,state.prestige);
    if(state.lifetimePumpkins<threshold){setNotice("Prestige unlocks at "+fmt(threshold)+" lifetime pumpkins harvested.");return;}
    if(!confirm("Prestige will reset cash, pumpkins, buildings, workers and upgrades. You gain a permanent +25% production bonus and a larger farm. Continue?"))return;
    const nextPrestige=state.prestige+1,bonus=state.prestigeBonus+0.25;state=freshState();state.prestige=nextPrestige;state.prestigeBonus=bonus;state.size=Math.min(12,START_SIZE+nextPrestige);state.tiles=Array(state.size*state.size).fill(null).map(emptyTile);autoSell=false;setNotice("Prestige "+nextPrestige+"! Permanent production bonus increased.");rebuildCanvas();updateUI();save();
  }
  function claimDaily(){
    const now=Date.now(),day=86400000;if(now-Number(state.lastDaily||0)<day){const remaining=day-(now-state.lastDaily);setNotice("Your next Daily Candy Bag is ready in "+Math.ceil(remaining/3600000)+" hour(s).");return;}
    state.lastDaily=now;const rewards=[
      ()=>{state.cash+=500;return "Candy Bag: $500 cash!";},
      ()=>{state.boostUntil=now+10*60*1000;return "Candy Bag: +50% production for 10 minutes!";},
      ()=>{state.pumpkins=Math.min(storageCapacity(),state.pumpkins+Math.min(1000,storageCapacity()));return "Candy Bag: bonus pumpkins!";},
      ()=>{state.cash+=2500;return "Candy Bag: $2,500 cash!";},
      ()=>{state.boostUntil=now+30*60*1000;return "Candy Bag: +50% production for 30 minutes!";}
    ];setNotice(rewards[Math.floor(Math.random()*rewards.length)]());updateUI();save();
  }
  function buyWorker(id){const w=WORKERS.find(x=>x.id===id);if(!w)return;const cost=Math.floor(w.cost*Math.pow(1.55,workerCount(id)));if(state.cash<cost){setNotice("Not enough cash to hire "+w.name+".");return;}state.cash-=cost;state.workers[id]=workerCount(id)+1;setNotice(w.name+" hired! One-time cost; no wages.");updateUI();save();}
  function buyUpgrade(id){const u=UPGRADES.find(x=>x.id===id);if(!u)return;const level=Number(state.upgrades[id]||0);if(level>=u.max){setNotice("Upgrade is already maxed.");return;}const cost=Math.floor(u.base*Math.pow(1.65,level));if(state.cash<cost){setNotice("Not enough cash.");return;}state.cash-=cost;state.upgrades[id]=level+1;setNotice(u.name+" upgraded to level "+(level+1)+".");updateUI();save();}
  function makeButton(title,description,price,action,emoji="🎃",disabled=false,attrs=""){
    const b=document.createElement("button");b.className="buy";b.innerHTML='<span class="emoji">'+emoji+'</span><span class="desc"><b>'+title+'</b><small>'+description+'</small></span><span class="price">'+price+'</span>';b.disabled=disabled;b.onclick=action;if(attrs)b.dataset.build=attrs;return b;
  }
  function renderShop(){
    const gs=document.getElementById("generator-shop");gs.innerHTML="";
    GENERATORS.forEach(g=>{const cost=Math.floor(g.cost*Math.pow(1.17,countType("generator")*0.65+countType("mega")*2));gs.appendChild(makeButton(g.name,"Produces "+fmt(g.rate)+"/sec · owned "+state.tiles.filter(t=>t.type==="generator"&&t.tier===g.id).length,money(cost),()=>buyGenerator(g.id),g.emoji,state.cash<cost,g.id));});
    const ss=document.getElementById("structure-shop");ss.innerHTML="";
    for(const type of ["shield","vault"]){const count=countType(type),cost=Math.floor((type==="shield"?90:140)*Math.pow(1.28,count));ss.appendChild(makeButton(type==="shield"?"Shield":"Vault",type==="shield"?"3×3 coverage; diagonal boosts count":" +250 storage; orthogonal collection only",money(cost),()=>buyStructure(type),type==="shield"?"🛡️":"🏦",state.cash<cost,type));}
    const ws=document.getElementById("worker-shop");ws.innerHTML="";
    WORKERS.forEach(w=>{const count=workerCount(w.id),cost=Math.floor(w.cost*Math.pow(1.55,count));ws.appendChild(makeButton(w.name,w.desc+" · owned "+count,money(cost),()=>buyWorker(w.id),w.emoji,state.cash<cost));});
    const us=document.getElementById("upgrade-shop");us.innerHTML="";
    UPGRADES.forEach(u=>{const level=Number(state.upgrades[u.id]||0),cost=Math.floor(u.base*Math.pow(1.65,level));us.appendChild(makeButton(u.name,u.desc+" · Lv. "+level+"/"+u.max,level>=u.max?"MAX":money(cost),()=>buyUpgrade(u.id),u.id==="click"?"👆":u.id==="capacity"?"🧺":u.id==="sell"?"💰":"🛡️",level>=u.max||state.cash<cost));});
  }
  function updateUI(){
    if(!state)return;
    document.getElementById("cash").textContent=money(state.cash);
    document.getElementById("pumpkins").textContent=fmt(state.pumpkins)+" / "+fmt(storageCapacity());
    document.getElementById("rate").textContent=fmt(productionRate())+" / sec";
    document.getElementById("worker-count").textContent=workerTotal()+" hired";
    document.getElementById("farm-size").textContent=state.size+" × "+state.size+" farm · "+generatorCount()+" generators · "+countType("mega")+" mega";
    document.getElementById("sell").textContent="Sell pumpkins ("+money(state.pumpkins*sellPrice())+")";
    document.getElementById("click-pumpkin").textContent="🎃 Harvest objective (+"+(1+Number(state.upgrades.click||0))+")";
    document.getElementById("auto-sell").textContent="Enable auto-sell: "+(autoSell?"ON":"OFF");
    document.getElementById("storage-bar").style.width=Math.min(100,100*state.pumpkins/Math.max(1,storageCapacity()))+"%";
    document.getElementById("storage-label").textContent="Storage: "+fmt(state.pumpkins)+" / "+fmt(storageCapacity())+" · connected generator output "+fmt(connectedProductionRate())+"/sec";
    const threshold=1000000*Math.pow(5,state.prestige);document.getElementById("prestige").textContent="🌙 Prestige ("+fmt(threshold)+" lifetime)";
    document.getElementById("daily").textContent=Date.now()-Number(state.lastDaily||0)<86400000?"🍬 Candy Bag (claimed)":"🍬 Daily Candy Bag";
    renderShop();
  }
  function rebuildCanvas(){if(p){p.remove();p=null;}setupP5();}
  function setupP5(){
    p=new p5((s)=>{
      s.preload=()=>{GENERATORS.forEach(g=>{images[g.id]=s.loadImage(g.sprite,()=>{},()=>{});});images.vault=s.loadImage("/assets/pumpkins/objective.png",()=>{},()=>{});images.shield=s.loadImage("/assets/abilities/shield/icon.png",()=>{},()=>{});images.objective=s.loadImage("/assets/pumpkins/objective.png",()=>{},()=>{});};
      s.setup=()=>{const w=Math.min(760,Math.max(290,document.getElementById("canvas-wrap").clientWidth||600));s.createCanvas(w,Math.ceil(w*0.75)).parent("canvas-wrap");s.textFont("system-ui");s.frameRate(30);};
      s.windowResized=()=>{const w=Math.min(760,Math.max(290,document.getElementById("canvas-wrap").clientWidth||600));s.resizeCanvas(w,Math.ceil(w*0.75));};
      s.draw=()=>{
        const w=s.width,h=s.height;s.background("#203825");
        s.noStroke();for(let i=0;i<90;i++){s.fill(i%3===0?"#29442c":"#263f29");s.circle((i*97)%w,(i*53)%h,2);}
        const cell=Math.min((w-24)/state.size,(h-24)/state.size);const ox=(w-cell*state.size)/2,oy=(h-cell*state.size)/2;tileRects=[];
        for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
          const xx=ox+x*cell,yy=oy+y*cell,i=y*state.size+x,t=state.tiles[i];tileRects.push({x:xx,y:yy,w:cell,h:cell,gx:x,gy:y});
          s.fill((x+y)%2?"#496c3e":"#527746");s.stroke("#1b2c20");s.strokeWeight(2);s.rect(xx+1,yy+1,cell-2,cell-2,5);
          if(t.type==="generator"){
            const sprite=images[t.tier]||images.green,sz=cell*.64;
            if(sprite&&sprite.width){s.imageMode(s.CENTER);s.image(sprite,xx+cell/2,yy+cell/2,sz,sz);}
            else drawPumpkin(s,xx+cell/2,yy+cell/2,sz,t.tier);
          }else if(t.type==="mega"){
            // Drawn again after the tile pass so later tile backgrounds never cover its footprint.
          }else if(t.type==="shield"){
            if(images.shield&&images.shield.width){s.imageMode(s.CENTER);s.image(images.shield,xx+cell/2,yy+cell/2,cell*.65,cell*.65);}else{ s.fill("#7d76bd");s.stroke("#d6caff");s.strokeWeight(2);s.beginShape();s.vertex(xx+cell/2,yy+cell*.16);s.vertex(xx+cell*.78,yy+cell*.3);s.vertex(xx+cell*.72,yy+cell*.65);s.vertex(xx+cell/2,yy+cell*.84);s.vertex(xx+cell*.28,yy+cell*.65);s.vertex(xx+cell*.22,yy+cell*.3);s.endShape(s.CLOSE);}
          }else if(t.type==="vault"){
            if(images.vault&&images.vault.width){s.imageMode(s.CENTER);s.image(images.vault,xx+cell/2,yy+cell/2,cell*.7,cell*.7);}else{drawPumpkin(s,xx+cell/2,yy+cell/2,cell*.55,"gold");s.fill("#f5d88a");s.textAlign(s.CENTER,s.CENTER);s.text("V",xx+cell/2,yy+cell/2);}
          }
          if(selected.x===x&&selected.y===y){s.noFill();s.stroke("#fff1a8");s.strokeWeight(3);s.rect(xx+3,yy+3,cell-6,cell-6,5);}
        }
        // Mega-generators are drawn last across their full 2×2 footprint.
        state.tiles.forEach((t,i)=>{if(t.type!=="mega")return;const x=i%state.size,y=Math.floor(i/state.size),xx=ox+x*cell,yy=oy+y*cell,span=Math.min(2,state.size-x,state.size-y);s.fill("#b77c2e");s.stroke("#f3ca65");s.strokeWeight(3);s.rect(xx+4,yy+4,cell*span-8,cell*span-8,12);const sprite=images[t.tier]||images.green,sz=cell*.75;if(sprite&&sprite.width){s.imageMode(s.CENTER);s.image(sprite,xx+cell,yy+cell,sz*span,sz*span);}else drawPumpkin(s,xx+cell,yy+cell,sz*span,t.tier);s.noStroke();s.fill("#fff0bd");s.textAlign(s.CENTER,s.CENTER);s.textStyle(s.BOLD);s.text("MEGA",xx+cell,yy+cell*2-10);s.textStyle(s.NORMAL);});
        // Objective pumpkin, drawn as a clickable banner beneath/above the farm grid.
        s.noStroke();s.fill("#17251b");s.rect(8,8,Math.min(w-16,240),32,8);s.fill("#f7e9c3");s.textSize(12);s.textAlign(s.LEFT,s.CENTER);s.text("OBJECTIVE  •  click to harvest",18,24);
        if(Date.now()<clickPulse){s.fill("#ffdc69");s.textAlign(s.CENTER,s.CENTER);s.textSize(18);s.text("+ "+(1+Number(state.upgrades.click||0))+" 🎃",w/2, h-16);}
      };
      s.mousePressed=()=>{const xx=s.mouseX,yy=s.mouseY;if(xx<8+Math.min(s.width-16,240)&&yy<40){harvestClick();return;}for(const r of tileRects){if(xx>=r.x&&xx<r.x+r.w&&yy>=r.y&&yy<r.y+r.h){placeAt(r.gx,r.gy);return;}}};
      s.touchStarted=()=>{if(s.mouseX<8+Math.min(s.width-16,240)&&s.mouseY<40){harvestClick();return false;}return false;};
    });
  }
  function drawPumpkin(s,x,y,size,tier){s.push();s.translate(x,y);s.noStroke();const col=tier==="gold"?"#edb92f":tier==="diamond"?"#5bd3d0":tier==="regular"?"#ed852d":"#77b949";s.fill(col);s.ellipse(-size*.22,0,size*.42,size*.65);s.ellipse(size*.22,0,size*.42,size*.65);s.ellipse(0,0,size*.52,size*.72);s.fill("#44632d");s.rect(-size*.06,-size*.48,size*.12,size*.18,3);s.pop();}
  function harvestClick(){const qty=1+Number(state.upgrades.click||0);const available=Math.max(0,storageCapacity()-state.pumpkins);const gain=Math.min(qty,available);state.pumpkins+=gain;state.lifetimePumpkins+=gain;state.clicks++;clickPulse=Date.now()+600;if(gain<qty)setNotice("Storage is full! Place a vault next to generators or sell pumpkins.");updateUI();}
  function tick(){
    const now=Date.now();if(!lastTick)lastTick=now;const dt=Math.min(2,(now-lastTick)/1000);lastTick=now;
    const rate=productionRate(),cap=storageCapacity(),space=Math.max(0,cap-state.pumpkins);
    // Only generators adjacent to at least one vault can deliver their production.
    let connectedRate=0;state.tiles.forEach((t,i)=>{if(t.type!=="generator"&&t.type!=="mega")return;const x=i%state.size,y=Math.floor(i/state.size);let connected=false;
      state.tiles.forEach((v,j)=>{if(v.type!=="vault")return;const vx=j%state.size,vy=Math.floor(j/state.size);if(vaultCollectsGenerator(vx,vy,x,y,t))connected=true;});
      if(connected)connectedRate+=t.type==="mega"?t.rate:generatorBaseRate(t);
    });
    const unconnectedWorkerRate=Math.max(0,rate-connectedRate);
    // Workers are global; their non-generator flat component is still collectible if any vault is present.
    const anyVault=countType("vault")>0;
    const deliverable=connectedRate+(anyVault?unconnectedWorkerRate:0);
    const gain=Math.min(space,deliverable*dt);
    state.pumpkins+=gain;state.lifetimePumpkins+=gain;
    if(workerCount("rusher")>0&&now-lastRusher>=10000){lastRusher=now;state.lastRusher=now;const bonus=Math.min(Math.max(0,cap-state.pumpkins),workerCount("rusher")*3);state.pumpkins+=bonus;state.lifetimePumpkins+=bonus;if(bonus>0)setNotice("Rusher burst! +"+fmt(bonus)+" pumpkins.");}
    if(autoSell&&state.pumpkins>=cap*.9)sellAll();
    if(now-lastSave>15000){save();lastSave=now;}
    if(now%500<40)updateUI();
  }
  function initUI(){
    document.getElementById("sell").onclick=sellAll;
    document.getElementById("click-pumpkin").onclick=harvestClick;
    document.getElementById("auto-sell").onclick=()=>{autoSell=!autoSell;updateUI();save();setNotice("Auto-sell "+(autoSell?"enabled":"disabled")+".");};
    document.getElementById("evolve").onclick=evolveSelected;
    document.getElementById("daily").onclick=claimDaily;
    document.getElementById("prestige").onclick=doPrestige;
    document.getElementById("save").onclick=()=>{save();setNotice("Farm saved.");};
    document.getElementById("reset").onclick=()=>{if(confirm("Permanently reset this Pumpkin Clicker save?")){localStorage.removeItem(SAVE_KEY);state=freshState();autoSell=false;lastTick=Date.now();updateUI();rebuildCanvas();setNotice("Fresh farm ready.");}};
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".section").forEach(x=>x.classList.toggle("active",x.id==="tab-"+b.dataset.tab));});
    window.addEventListener("beforeunload",save);
  }
  state=loadState();autoSell=!!state.autoSell;
  initUI();setupP5();updateUI();setInterval(tick,100);setInterval(updateUI,1000);
})();