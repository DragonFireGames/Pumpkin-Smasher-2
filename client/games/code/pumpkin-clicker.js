/* Pumpkin Clicker. Canvas-only p5 game; hard-edged Pumpkin Smasher style. */
const PC_SAVE="pumpkin-clicker-save-v1", PC_DAILY="pumpkin-clicker-daily-v1";
const PC_ORANGE="#ffa500", PC_BLACK="#10180b", PC_BG="#123904", PC_WHITE="#f6f2dd";
const PC_GENS=[
 {id:"green",name:"Green Pumpkin",cost:10,rate:.2,path:"/assets/pumpkins/new_pumpkin.png"},
 {id:"regular",name:"Pumpkin",cost:60,rate:1,path:"/assets/pumpkins/pumpkin.png"},
 {id:"gold",name:"Gold Pumpkin",cost:350,rate:5,path:"/assets/pumpkins/gold_pumpkin.png"},
 {id:"diamond",name:"Diamond Pumpkin",cost:2200,rate:24,path:"/assets/pumpkins/diamond_pumpkin.png"}
];
const PC_WORKERS=[
 {id:"monster",name:"Monster",cost:25,desc:"+0.10/sec per gen",path:"/assets/entities/monster/attack.png"},
 {id:"ghost",name:"Ghost",cost:100,desc:"+5% all production",path:"/assets/entities/ghost/attack.png"},
 {id:"speeder",name:"Speeder",cost:175,desc:"+10% all production",path:"/assets/entities/speeder/attack.png"},
 {id:"rusher",name:"Rusher",cost:300,desc:"Burst every 10 seconds",path:"/assets/entities/rusher/idle.png"},
 {id:"brute",name:"Brute",cost:450,desc:"+0.55/sec per gen",path:"/assets/entities/brute/attack.png"},
 {id:"wizard",name:"Wizard",cost:850,desc:"+18% all production",path:"/assets/entities/wizard/idle.png"},
 {id:"debuffer",name:"Debuffer",cost:1600,desc:"+8% worker bonuses",path:"/assets/entities/debuffer/idle.png"}
];
const PC_BUILDS=[
 {id:"g0",name:"Green Pumpkin",cost:10,desc:"0.20 pumpkins/sec",kind:"generator",tier:0},
 {id:"g1",name:"Pumpkin",cost:60,desc:"1 pumpkin/sec",kind:"generator",tier:1},
 {id:"g2",name:"Gold Pumpkin",cost:350,desc:"5 pumpkins/sec",kind:"generator",tier:2},
 {id:"g3",name:"Diamond Pumpkin",cost:2200,desc:"24 pumpkins/sec",kind:"generator",tier:3},
 {id:"shield",name:"Multiplier",cost:180,desc:"Boosts nearby generators",kind:"multiplier"},
 {id:"vault",name:"Vault",cost:120,desc:"+50 storage capacity",kind:"vault"},
 {id:"autosell",name:"Auto-Sell",cost:650,desc:"Sell new production",kind:"upgrade"}
];
const PC_CANDIES=[
 {id:"candy_corn",name:"Candy Corn",path:"/assets/candies/candy-corn.png",desc:"3× generator production",production:3},
 {id:"smarties",name:"Smarties",path:"/assets/candies/smarties.png",desc:"Clicks harvest 3 pumpkins",click:3},
 {id:"peppermint",name:"Peppermint",path:"/assets/candies/peppermint.png",desc:"Sell pumpkins for 2× cash",sell:2},
 {id:"lolipop",name:"Lollipop",path:"/assets/candies/lolipop.png",desc:"+50% total production",production:1.5},
 {id:"hot_tamale",name:"Hot Tamale",path:"/assets/candies/hot-tamale.png",desc:"2× generator production",production:2},
 {id:"ghost_chew",name:"Ghost Chew",path:"/assets/candies/ghost-chew.png",desc:"+50% pumpkin storage",capacity:1.5},
 {id:"chocolate",name:"Chocolate",path:"/assets/candies/chocolate.png",desc:"+$5 per manual click",clickCash:5},
 {id:"candied_apple",name:"Candied Apple",path:"/assets/candies/candied-apple.png",desc:"+25% generator production",production:1.25},
 {id:"blue_candy",name:"Blue Candy",path:"/assets/candies/blue-candy.png",desc:"Doubles additive worker bonuses",workers:2}
];
let pcImgs={},pcState,pcTargets=[],pcTab="workers",pcSideScroll=0,pcGridScroll=0,pcSelected=null,pcToast="",pcToastEnd=0,pcLast=0,pcSaveTicks=0,pcClaimed=false,pcSpecks=[],pcCandyOpening=null;

function pcFresh(p=0){return {cash:25,pumpkins:0,prestige:p,totalClicks:0,totalSold:0,totalHarvested:0,totalWorkers:0,autoSell:false,progress:0,activeCandies:[],workers:{monster:0,ghost:0,speeder:0,rusher:0,brute:0,wizard:0,debuffer:0},farmCols:6+p,farmRows:4+p,farm:[],lastSavedAt:Date.now()};}
function preload(){
 PC_GENS.forEach(g=>pcImgs[g.id]=loadImage(g.path,()=>{},()=>{}));
 PC_WORKERS.forEach(w=>pcImgs[w.id]=loadImage(w.path,()=>{},()=>{}));
 PC_CANDIES.forEach(v=>pcImgs[v.id]=loadImage(v.path,()=>{},()=>{}));
 pcImgs.candyBag=loadImage("/assets/candies/trick-or-treat.png",()=>{},()=>{});
 pcImgs.generatorPot=loadImage("/assets/abilities/generator/generator.png",()=>{},()=>{});
 pcImgs.multiplier=loadImage("/assets/abilities/shield/shield.png",()=>{},()=>{});
 pcImgs.objective=loadImage("/assets/pumpkins/objective.png",()=>{},()=>{});
}
function setup(){
 createCanvas(windowWidth,windowHeight);pixelDensity(1);frameRate(60);imageMode(CENTER);textFont("Arial");
 const c=document.querySelector("canvas");if(c){c.style.width="100vw";c.style.height="100vh";c.style.imageRendering="pixelated";}
 for(let i=0;i<80;i++)pcSpecks.push({x:random(0,1400),y:random(0,1000),s:random(1,3),a:random(14,43)});
 pcLoad();pcOffline();pcLast=millis();window.addEventListener("beforeunload",pcSave);
}
function windowResized(){resizeCanvas(windowWidth,windowHeight);pcSideScroll=0;}
function pcLoad(){
 let d=null;try{d=JSON.parse(localStorage.getItem(PC_SAVE)||"null");}catch(e){}
 if(d&&Array.isArray(d.farm)){
  const f=pcFresh(+d.prestige||0);pcState=Object.assign(f,d);pcState.workers=Object.assign(f.workers,d.workers||{});
  pcState.farmCols=Math.max(6,+pcState.farmCols||6);pcState.farmRows=Math.max(4,+pcState.farmRows||4);
  pcState.farm=pcState.farm.slice(0,pcState.farmRows);while(pcState.farm.length<pcState.farmRows)pcState.farm.push([]);
  pcState.farm.forEach(r=>{while(r.length<pcState.farmCols)r.push(null);r.length=pcState.farmCols;});
  // JSON duplicates repeated mega references; reconnect each 2x2 footprint after loading.
  for(let r=0;r<pcState.farmRows;r++)for(let c=0;c<pcState.farmCols;c++){
   const m=pcState.farm[r][c];
   if(m&&m.kind==="generator"&&m.mega&&m.row===r&&m.col===c&&r+1<pcState.farmRows&&c+1<pcState.farmCols){
    pcState.farm[r][c]=m;pcState.farm[r][c+1]=m;pcState.farm[r+1][c]=m;pcState.farm[r+1][c+1]=m;
   }
  }
 }else{pcState=pcFresh();pcState.farm=Array.from({length:4},()=>Array(6).fill(null));}
 pcState.cash=Math.max(0,+pcState.cash||0);pcState.pumpkins=Math.max(0,+pcState.pumpkins||0);pcState.progress=Math.max(0,+pcState.progress||0);
 pcState.activeCandies=Array.isArray(pcState.activeCandies)?pcState.activeCandies.filter(v=>v&&v.expiresAt>Date.now()):[];
 pcState.farm.forEach(row=>row.forEach(o=>{if(o&&o.kind==="shield")o.kind="multiplier";}));
 try{pcClaimed=localStorage.getItem(PC_DAILY)===pcToday();}catch(e){pcClaimed=false;}
}
function pcSave(){if(!pcState)return;pcState.lastSavedAt=Date.now();try{localStorage.setItem(PC_SAVE,JSON.stringify(pcState));}catch(e){}}
function pcToday(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function pcOffline(){
 const secs=Math.max(0,Math.min(2592000,(Date.now()-(pcState.lastSavedAt||Date.now()))/1000)),rate=pcRate();if(secs<1||rate<=0)return;
 if(pcState.autoSell)pcState.cash+=rate*secs;else pcState.pumpkins+=Math.min(Math.max(0,pcCap()-pcState.pumpkins),rate*secs);
 pcSay("Farm grew while you were away");pcState.lastSavedAt=Date.now();
}
function pcFmt(v){
 v=Number(v)||0;if(Math.abs(v)<1000)return Math.floor(v).toLocaleString("en-US");
 const u=["K","M","B","T","Qa","Qi"];let i=-1;while(Math.abs(v)>=1000&&i<u.length-1){v/=1000;i++;}
 return (Math.abs(v)>=100?v.toFixed(0):Math.abs(v)>=10?v.toFixed(1):v.toFixed(2))+u[i];
}
function pcUnique(fn){const seen=new Set();for(let r=0;r<pcState.farmRows;r++)for(let c=0;c<pcState.farmCols;c++){const o=pcState.farm[r][c];if(o&&!seen.has(o)){seen.add(o);fn(o);}}}
function pcHasCandy(id){return pcState.activeCandies.some(v=>v.id===id&&v.expiresAt>Date.now());}
function pcCandyMult(key){return PC_CANDIES.reduce((n,v)=>n*(v[key]&&pcHasCandy(v.id)?v[key]:1),1);}
function pcCap(){let n=0;pcUnique(o=>{if(o.kind==="vault")n++;});return Math.floor((50+n*50)*pcCandyMult("capacity"));}
function pcShield(o){
 let n=0;const cells=o.mega?[[o.row,o.col],[o.row+1,o.col],[o.row,o.col+1],[o.row+1,o.col+1]]:[[o.row,o.col]],seen=new Set();
 cells.forEach(([r,c])=>{for(let y=Math.max(0,r-1);y<=Math.min(pcState.farmRows-1,r+1);y++)for(let x=Math.max(0,c-1);x<=Math.min(pcState.farmCols-1,c+1);x++){const a=pcState.farm[y][x];if(a&&(a.kind==="multiplier"||a.kind==="shield"))seen.add(a);}});
 n=seen.size;return 1+.28*Math.sqrt(n);
}
function pcVaultNext(o){
 const cells=o.mega?[[o.row,o.col],[o.row+1,o.col],[o.row,o.col+1],[o.row+1,o.col+1]]:[[o.row,o.col]];
 for(const [r,c] of cells)for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const y=r+dy,x=c+dx;if(y>=0&&x>=0&&y<pcState.farmRows&&x<pcState.farmCols&&pcState.farm[y][x]?.kind==="vault")return true;}
 return false;
}
function pcRate(){
 let total=0;const w=pcState.workers,deb=1+w.debuffer*.08*pcCandyMult("workers"),global=(1+w.ghost*.05*deb)*(1+w.speeder*.1*deb)*(1+w.wizard*.18*deb)*(1+w.rusher*.035*deb);
 pcUnique(o=>{if(o.kind!=="generator")return;total+=(PC_GENS[o.tier].rate+(w.monster*.1+w.brute*.55)*deb)*pcShield(o)*(pcVaultNext(o)?1.15:1)*(o.mega?1.5:1);});
 return total*global*pcCandyMult("production")*(1+pcState.prestige*.5);
}
function pcTick(){
 const now=millis(),dt=Math.max(0,Math.min(.25,(now-pcLast)/1000));pcLast=now;const rate=pcRate();
 if(pcState.autoSell)pcState.cash+=rate*dt;
 else if(pcState.pumpkins<pcCap()){pcState.progress+=rate*dt;const n=Math.min(Math.floor(pcState.progress),Math.floor(pcCap()-pcState.pumpkins));if(n>0){pcState.pumpkins+=n;pcState.progress-=n;}if(pcState.pumpkins>=pcCap())pcState.progress=Math.min(.999,pcState.progress);}
 if(pcState.workers.rusher>0&&frameCount%600===0){const n=pcState.workers.rusher*5;if(pcState.autoSell)pcState.cash+=n;else pcState.pumpkins=Math.min(pcCap(),pcState.pumpkins+n);}
 if(++pcSaveTicks>=60){pcSaveTicks=0;pcSave();}
}
function draw(){pcTick();pcTargets=[];background(PC_BG);noStroke();pcSpecks.forEach(p=>{fill(123,150,65,p.a);rect(p.x%width,p.y%height,p.s,p.s);});const L=pcLayout();pcTop(L);pcSidebar(L);pcMain(L);if(pcToast&&millis()<pcToastEnd)pcDrawToast(L);if(pcCandyOpening)pcDrawCandyReveal();}
function pcLayout(){
 const W=width,H=height,top=Math.max(68,Math.min(88,H*.15)),side=Math.max(112,Math.min(205,W*.245)),mainX=side+8,mainW=Math.max(120,W-mainX-6);
 const gridStart=Math.max(top+146,H*.535),gridTop=gridStart+25,tile=Math.max(24,Math.min(54,Math.floor((mainW-(pcState.farmCols-1)*3)/pcState.farmCols))),gap=3;
 const gridW=pcState.farmCols*tile+(pcState.farmCols-1)*gap,gridX=mainX+Math.max(0,(mainW-gridW)/2),content=pcState.farmRows*(tile+gap)-gap,view=Math.max(0,H-5-gridTop);
 pcGridScroll=constrain(pcGridScroll,0,Math.max(0,content-view));
 return {W,H,top,side,mainX,mainW,gridStart,gridTop,gridBottom:H-5,tile,gap,gridX,content,view};
}
function pcTarget(x,y,w,h,fn,modal=false){pcTargets.push({x,y,w,h,fn,modal});}
function pcTop(L){
 noStroke();fill(PC_BLACK);rect(0,0,L.W,L.top);stroke(PC_ORANGE);strokeWeight(2);line(0,L.top-1,L.W,L.top-1);
 const f=Math.max(9,Math.min(14,L.W*.031));noStroke();fill(PC_WHITE);textAlign(LEFT,CENTER);textSize(f);
 text("PUMPKINS "+pcFmt(pcState.pumpkins)+"/"+pcFmt(pcCap()),7,L.top*.22);text("CASH $"+pcFmt(pcState.cash),7,L.top*.53);
 textAlign(RIGHT,CENTER);fill(PC_ORANGE);textSize(Math.max(8,f*.82));text("PRESTIGE "+pcState.prestige+"  ×"+(1+pcState.prestige*.5).toFixed(2),L.W-8,L.top*.22);
 fill(PC_WHITE);text("FARM "+pcState.farmCols+"×"+pcState.farmRows,L.W-8,L.top*.53);
 const live=pcState.activeCandies.filter(v=>v.expiresAt>Date.now());let cx=8;const cy=L.top*.84;fill("#a9bf94");textAlign(LEFT,CENTER);textSize(Math.max(7,Math.min(10,f*.7)));text(live.length?"ACTIVE CANDY":"NO ACTIVE CANDY",cx,cy);cx+=Math.max(82,f*5.8);
 live.slice(0,5).forEach(v=>{const candy=PC_CANDIES.find(q=>q.id===v.id);if(!candy)return;const img=pcImgs[v.id];if(img&&img.width)pcSheet(img,cx+7,cy,14,1);cx+=17;fill(PC_WHITE);textAlign(LEFT,CENTER);textSize(Math.max(7,Math.min(9,f*.65)));const mins=Math.max(0,Math.ceil((v.expiresAt-Date.now())/60000));const label=candy.name+" "+mins+"m";text(label,cx,cy);cx+=textWidth(label)+12;});
 if(live.length>5){fill(PC_ORANGE);textAlign(LEFT,CENTER);text("+"+(live.length-5),cx,cy);}
}
function pcSidebar(L){
 const x=4,y=L.top+4,w=L.side-8,h=L.H-y-4;fill(PC_BLACK);stroke(PC_ORANGE);strokeWeight(1.5);rect(x,y,w,h);
 const tabs=[["workers","WORKERS"],["build","BUILD"],["candy","CANDY"]],th=Math.max(20,Math.min(28,(L.H-L.top)*.075)),tw=(w-8)/3,ty=y+4;
 tabs.forEach((t,i)=>{const tx=x+4+i*tw;fill(pcTab===t[0]?PC_ORANGE:"#17210f");stroke(PC_ORANGE);strokeWeight(1);rect(tx,ty,tw-2,th);noStroke();fill(pcTab===t[0]?PC_BLACK:PC_WHITE);textAlign(CENTER,CENTER);textSize(Math.max(7,Math.min(10,w*.075)));text(t[1],tx+(tw-2)/2,ty+th/2);pcTarget(tx,ty,tw-2,th,()=>{pcTab=t[0];pcSideScroll=0;});});
 const ly=ty+th+5,lh=Math.max(0,y+h-ly),items=pcItems(),rh=Math.max(44,Math.min(65,(L.H-L.top)*.16)),total=items.length*rh;
 pcSideScroll=constrain(pcSideScroll,0,Math.max(0,total-lh));drawingContext.save();drawingContext.beginPath();drawingContext.rect(x+2,ly,w-4,lh);drawingContext.clip();
 items.forEach((it,i)=>{const yy=ly+i*rh-pcSideScroll;if(yy+rh>ly&&yy<ly+lh)pcItem(it,x+4,yy,w-10,rh);});drawingContext.restore();
 if(total>lh){fill("#35492c");noStroke();rect(x+w-4,ly,2,lh);fill(PC_ORANGE);rect(x+w-4,ly+pcSideScroll/total*lh,2,Math.max(8,lh*lh/total));}
}
function pcItems(){
 if(pcTab==="workers")return PC_WORKERS.map(d=>({type:"worker",d}));
 if(pcTab==="build")return PC_BUILDS.map(d=>({type:"build",d}));
 return [{type:"daily",d:{name:"Daily Candy",desc:"Free one-hour candy"}},{type:"buyCandy",d:{name:"Buy Random Candy",desc:"One-hour random bonus"}},{type:"sell",d:{name:"Sell Pumpkins",desc:"Trade stored harvest"}},{type:"info",d:{name:"Farm Guide",desc:"Build → click an empty tile"}}];
}
function pcItem(it,x,y,w,h){
 const d=it.d,isB=it.type==="build",sel=isB&&pcSelected===d.id;fill(sel?"#263d16":"#172414");stroke(sel?PC_ORANGE:"#50623f");strokeWeight(sel?2:1);rect(x,y+1,w,h-3);
 const sz=Math.min(28,h*.46),ix=x+sz/2+4,iy=y+sz/2+5;
 if(it.type==="worker")pcSprite(d.id,ix,iy,sz,8);
 else if(isB&&d.kind==="generator")pcGen(d.tier,ix,iy,sz);
 else if(isB&&d.kind==="multiplier"){const si=pcImgs.multiplier;if(si&&si.width)pcSheet(si,ix,iy,sz,3,Math.floor(frameCount/7)%3);else pcDrawShieldFallback(ix,iy,sz);}
 else if(isB&&d.kind==="vault")pcDrawGrowGenerator(1,ix,iy,sz,true);
 else if(it.type==="daily"||it.type==="buyCandy"){const img=pcImgs.candyBag;if(img?.width)pcSheet(img,ix,iy,sz,1);else{noStroke();fill(PC_ORANGE);rect(ix-5,iy-8,10,16);}}
 else{noStroke();fill(PC_ORANGE);textAlign(CENTER,CENTER);textSize(Math.max(11,sz*.75));text(isB?(d.kind==="shield"?"S":d.kind==="vault"?"V":"$"):(it.type==="sell"?"$":"i"),ix,iy);}
 const tx=x+sz+9,tw=Math.max(26,w-sz-18-w*.28);noStroke();fill(PC_WHITE);textAlign(LEFT,TOP);textSize(Math.max(8,Math.min(11,w*.082)));text(d.name,tx,y+4,tw,h*.40);
 fill("#bdc9a9");textSize(Math.max(7,Math.min(9,w*.073)));
 const sub=it.type==="worker"?d.desc:isB&&d.kind==="upgrade"?(pcState.autoSell?"AUTO-SELL ON":"UPGRADE"):isB&&sel?"SELECTED":it.type==="daily"?(pcClaimed?"CLAIMED TODAY":"READY TO OPEN"):it.type==="buyCandy"?"ONE-HOUR RANDOM BONUS":d.desc;
 text(sub,tx,y+h*.43,tw,h*.29);if(it.type==="worker"){fill("#8fa27a");textSize(Math.max(6,Math.min(8,w*.065)));text("OWNED "+(pcState.workers[d.id]||0),tx,y+h*.77);}
 textAlign(RIGHT,CENTER);fill(PC_ORANGE);textSize(Math.max(8,Math.min(11,w*.09)));
 if(it.type==="worker")text("$"+pcFmt(d.cost),x+w-5,y+h*.5);
 else if(isB)text(d.kind==="upgrade"?(pcState.autoSell?"ON":"$"+pcFmt(d.cost)):"$"+pcFmt(d.cost),x+w-5,y+h*.5);
 else if(it.type==="daily")text(pcClaimed?"DONE":"OPEN",x+w-5,y+h*.5);
 else if(it.type==="buyCandy")text("$"+pcFmt(pcCandyPrice()),x+w-5,y+h*.5);
 else if(it.type==="sell")text("$"+pcFmt(Math.floor(pcState.pumpkins)),x+w-5,y+h*.5);
 if(it.type==="worker")pcTarget(x,y,w,h,()=>pcBuyWorker(d.id));
 if(isB)pcTarget(x,y,w,h,()=>{if(d.kind==="upgrade"){pcToggleAuto();return;}pcSelected=pcSelected===d.id?null:d.id;pcSay(pcSelected?"Click an empty farm tile":"Build selection cleared");});
 if(it.type==="daily")pcTarget(x,y,w,h,pcDailyCandy);
 if(it.type==="buyCandy")pcTarget(x,y,w,h,pcBuyCandy);
 if(it.type==="sell")pcTarget(x,y,w,h,pcSell);
 if(it.type==="info")pcTarget(x,y,w,h,()=>pcSay("Click BUILD, choose a building, then click an empty tile."));
}
function pcMain(L){
 const x=L.mainX,w=L.mainW,px=x+w/2,py=L.top+Math.max(44,(L.gridStart-L.top)*.39),sz=Math.min(w*.38,(L.gridStart-L.top)*.62,118);
 noStroke();fill("#0d190b");rect(x,L.top+3,w,L.gridStart-L.top-4);stroke(PC_ORANGE);strokeWeight(1.5);noFill();rect(x,L.top+3,w,L.gridStart-L.top-4);
 const img=pcImgs.regular;if(img?.width)pcSheet(img,px,py,sz,1);else{noStroke();fill("#ed8d20");ellipse(px,py,sz*.78,sz*.82);fill("#bd5c11");ellipse(px-sz*.18,py,sz*.23,sz*.8);ellipse(px+sz*.18,py,sz*.23,sz*.8);fill("#4d7b20");rect(px-sz*.05,py-sz*.52,sz*.1,sz*.22);}
 textAlign(CENTER,CENTER);noStroke();fill(PC_WHITE);textSize(Math.max(12,Math.min(18,w*.055)));text("PUMPKIN HARVEST",px,py+sz*.66);fill("#b8caa4");textSize(Math.max(9,Math.min(12,w*.038)));text("CLICK TO COLLECT",px,py+sz*.88);
 pcTarget(px-sz*.65,py-sz*.65,sz*1.3,sz*1.3,pcClick);
 const by=L.gridStart-29,bw=Math.max(70,(w-16)/2);pcButton(x+4,by,bw,23,"SELL HARVEST",PC_ORANGE,PC_BLACK);pcTarget(x+4,by,bw,23,pcSell);
 const cost=pcPrestigeCost(),ready=pcState.cash>=cost;pcButton(x+8+bw,by,bw,23,"PRESTIGE $"+pcFmt(cost),ready?PC_ORANGE:"#4a553e",ready?PC_BLACK:"#9aa38e");pcTarget(x+8+bw,by,bw,23,pcPrestige);
 fill("#0d190b");noStroke();rect(x,L.gridStart,w,L.H-L.gridStart);stroke(PC_ORANGE);strokeWeight(1);noFill();rect(x,L.gridStart,w,L.H-L.gridStart);
 noStroke();fill(PC_ORANGE);textAlign(LEFT,CENTER);textSize(Math.max(9,Math.min(12,w*.038)));text("FARM GRID • CLICK TO PLACE",x+5,L.gridStart+12);
 if(pcSelected){const b=PC_BUILDS.find(v=>v.id===pcSelected);fill(PC_WHITE);textAlign(RIGHT,CENTER);textSize(Math.max(8,Math.min(10,w*.032)));text(b?b.name:"",x+w-4,L.gridStart+12);}
 pcGrid(L);
}
function pcButton(x,y,w,h,label,col,tc){fill(col);stroke(PC_ORANGE);strokeWeight(1);rect(x,y,w,h);noStroke();fill(tc);textAlign(CENTER,CENTER);textSize(Math.max(8,Math.min(11,h*.48)));text(label,x+w/2,y+h/2);}
function pcGrid(L){
 const t=L.tile,g=L.gap,clipY=L.gridTop;drawingContext.save();drawingContext.beginPath();drawingContext.rect(L.mainX+1,clipY,L.mainW-2,L.view);drawingContext.clip();
 for(let r=0;r<pcState.farmRows;r++)for(let c=0;c<pcState.farmCols;c++){
  const x=L.gridX+c*(t+g),y=clipY+r*(t+g)-pcGridScroll;if(y+t<clipY||y>clipY+L.view)continue;
  fill((r+c)%2?"#1b3b13":"#214318");stroke("#65813a");strokeWeight(1);rect(x,y,t,t);
  const o=pcState.farm[r][c];
  if(!o){if(pcSelected){noStroke();fill("#8aa96a");textAlign(CENTER,CENTER);textSize(Math.max(9,t*.25));text("+",x+t/2,y+t/2);}pcTarget(x,y,t,t,()=>pcTile(r,c));continue;}
  if(o.kind==="generator"){
   if(!o.mega||(r===o.row&&c===o.col)){const s=o.mega?t*1.9:t*.78;pcDrawGrowGenerator(o.tier,x+t/2+(o.mega?t/2:0),y+t/2+(o.mega?t/2:0),s,false);if(o.mega){noFill();stroke(PC_ORANGE);strokeWeight(2);rect(x,y,t*2+g,t*2+g);noStroke();fill(PC_BLACK);rect(x+t*.08,y+t*.08,t*.65,t*.3);fill(PC_ORANGE);textAlign(CENTER,CENTER);textSize(Math.max(8,t*.2));text("MEGA",x+t*.4,y+t*.23);}}
   if(!o.mega){fill(PC_WHITE);noStroke();textAlign(CENTER,BOTTOM);textSize(Math.max(7,t*.17));text(pcFmt(PC_GENS[o.tier].rate)+"/s",x+t/2,y+t-1);}
  }else if(o.kind==="multiplier"||o.kind==="shield"){const si=pcImgs.multiplier;if(si&&si.width)pcSheet(si,x+t/2,y+t/2,t*.92,3,Math.floor(frameCount/7)%3);else pcDrawShieldFallback(x+t/2,y+t/2,t);}
  else if(o.kind==="vault"){pcDrawGrowGenerator(1,x+t/2,y+t/2,t*.88,true);}
  pcTarget(x,y,t,t,()=>pcTile(r,c));
 }
 drawingContext.restore();
 if(L.content>L.view){fill("#35492c");noStroke();rect(L.mainX+L.mainW-3,clipY,2,L.view);fill(PC_ORANGE);rect(L.mainX+L.mainW-3,clipY+pcGridScroll/Math.max(1,L.content)*L.view,2,Math.max(8,L.view*L.view/L.content));}
}
function pcSheet(img,x,y,size,frames,frame=0){if(!img||!img.width||!img.height)return;const horizontal=img.width>img.height*1.4,fw=horizontal?img.width/frames:img.width,fi=horizontal?((frame%frames)+frames)%frames:0;image(img,x,y,fw*size/img.height,size,fi*fw,0,fw,img.height);}
function pcGen(t,x,y,s){const img=pcImgs[PC_GENS[t].id];if(img?.width)pcSheet(img,x,y,s,1);else{noStroke();fill(t===0?"#85b54a":t===2?"#e9c33e":t===3?"#74e4e8":"#ed8d20");ellipse(x,y,s*.82,s*.68);fill("#4d7b20");rect(x-s*.04,y-s*.42,s*.08,s*.2);}}
function pcDrawGrowGenerator(t,x,y,s,isVault=false){
 const pot=pcImgs.generatorPot,fruit=isVault?pcImgs.objective:pcImgs[PC_GENS[t].id],rate=PC_GENS[t].rate,cycle=Math.max(1300,1000/Math.max(.01,rate));
 const phase=((Date.now()+Math.round(x*13+y*7))%cycle)/cycle,growth=phase<.84?Math.max(.12,phase/.84):1;
 if(pot&&pot.width&&pot.height)image(pot,x,y+s*.20,pot.width*(s*.70/pot.height),s*.70);else{noStroke();fill("#79502c");stroke("#b87a35");rect(x-s*.32,y+s*.10,s*.64,s*.38);}
 const img=phase<.84?pcImgs.green:fruit;
 if(img&&img.width&&img.height){const fw=img.width>img.height*1.4?img.width/8:img.width,fy=y+s*.04-(s*.22*phase),h=(isVault?s*.40:s*.46)*growth;pcSheet(img,x,fy,h,img.width>img.height*1.4?8:1,Math.floor(frameCount/8)%8);}
 if(isVault){noFill();stroke(PC_ORANGE);strokeWeight(1);rect(x-s*.40,y-s*.38,s*.80,s*1.0);}
}
function pcDrawShieldFallback(x,y,s){noStroke();fill("#9ed8f0");stroke("#e6f5ff");beginShape();vertex(x,y-s*.4);vertex(x+s*.32,y-s*.2);vertex(x+s*.25,y+s*.23);vertex(x,y+s*.4);vertex(x-s*.25,y+s*.23);vertex(x-s*.32,y-s*.2);endShape(CLOSE);}
function pcSprite(id,x,y,s,frames){const img=pcImgs[id];if(img?.width)pcSheet(img,x,y,s,frames,Math.floor(frameCount/5)%frames);else{noStroke();fill(id==="ghost"?"#b6cce0":id==="brute"?"#9d5b45":id==="wizard"?"#6a65bd":PC_ORANGE);ellipse(x,y,s*.65,s*.75);}}
function pcTile(r,c){
 let o=pcState.farm[r]&&pcState.farm[r][c];
 if(!pcSelected&&(o&&(o.kind==="multiplier"||o.kind==="shield"))){pcSay("Multipliers boost generators in the surrounding 3×3");return;}
 if(!pcSelected){
  if(o&&o.kind==="generator"){
   const cost=Math.ceil(PC_GENS[o.tier].cost*.6);
   if(pcState.cash<cost){pcSay("Not enough cash to upgrade");return;}
   if(o.tier>=3){pcSay("Diamond pumpkins are max tier");return;}
   if(o.mega){for(let y=o.row;y<o.row+2;y++)for(let x=o.col;x<o.col+2;x++)pcState.farm[y][x]=null;}
   pcState.cash-=cost;
   pcState.farm[r][c]={kind:"generator",tier:o.tier+1,row:r,col:c,mega:false};
   pcMerge();pcSay("Generator upgraded");pcSave();
  }else pcSay(o&&o.kind==="vault"?"Vaults increase storage":"Choose a building from BUILD first");
  return;
 }
 const b=PC_BUILDS.find(v=>v.id===pcSelected);
 if(!b)return;
 if(o){pcSay("That tile is occupied");return;}
 if(pcState.cash<b.cost){pcSay("Not enough cash");return;}
 if(b.kind==="upgrade"){pcToggleAuto();return;}
 pcState.cash-=b.cost;
 const obj=b.kind==="generator"?{kind:"generator",tier:b.tier,row:r,col:c,mega:false}:{kind:b.kind,row:r,col:c};
 pcState.farm[r][c]=obj;
 if(obj.kind==="generator")pcMerge();
 pcSelected=null;pcSay(b.name+" placed");pcSave();
}
function pcMerge(){
 for(let r=0;r<pcState.farmRows-1;r++)for(let c=0;c<pcState.farmCols-1;c++){
  const a=pcState.farm[r][c],b=pcState.farm[r][c+1],d=pcState.farm[r+1][c],e=pcState.farm[r+1][c+1];
  if(!a||a.kind!=="generator"||a.mega||!b||!d||!e||b===a||d===a||e===a)continue;
  if([b,d,e].some(v=>v.kind!=="generator"||v.mega||v.tier!==a.tier))continue;
  const m={kind:"generator",tier:a.tier,row:r,col:c,mega:true};pcState.farm[r][c]=m;pcState.farm[r][c+1]=m;pcState.farm[r+1][c]=m;pcState.farm[r+1][c+1]=m;pcSay("Four pumpkins became a MEGA generator!");
 }
}
function pcBuyWorker(id){const w=PC_WORKERS.find(v=>v.id===id);if(!w)return;if(pcState.cash<w.cost){pcSay("Not enough cash");return;}pcState.cash-=w.cost;pcState.workers[id]++;pcState.totalWorkers++;pcSay(w.name+" hired");pcSave();}
function pcToggleAuto(){if(pcState.autoSell){pcState.autoSell=false;pcSay("Auto-Sell paused");pcSave();return;}if(pcState.cash<650){pcSay("Auto-Sell costs $650");return;}pcState.cash-=650;pcState.autoSell=true;pcSelected=null;pcSay("Auto-Sell enabled");pcSave();}
function pcClick(){if(!pcState.autoSell&&pcState.pumpkins>=pcCap()){pcSay("Storage full — sell pumpkins or add a vault");return;}pcState.totalClicks++;pcState.totalHarvested++;if(pcState.autoSell){pcState.cash++;pcSay("+$1");}else{const n=pcCandyMult("click");pcState.pumpkins=Math.min(pcCap(),pcState.pumpkins+n);pcSay("+"+n+" pumpkins");}if(pcHasCandy("chocolate")){pcState.cash+=5;pcSay("+$5 candy bonus");}pcSave();}
function pcSell(){const n=Math.floor(pcState.pumpkins);if(n<=0){pcSay("No pumpkins to sell");return;}pcState.pumpkins-=n;const earned=n*pcCandyMult("sell");pcState.cash+=earned;pcState.totalSold+=n;pcSay("Sold "+pcFmt(n)+" pumpkins for $"+pcFmt(earned));pcSave();}
function pcCandyPrice(){return 250+Math.min(1750,pcState.prestige*100);}
function pcRandomCandy(){return PC_CANDIES[Math.floor(Math.random()*PC_CANDIES.length)];}
function pcOpenCandy(source,candy){pcCandyOpening={source,candy:candy||pcRandomCandy(),started:millis(),activated:false};pcToast="";}
function pcDailyCandy(){if(pcCandyOpening)return;if(pcClaimed){pcSay("Daily candy already claimed");return;}pcClaimed=true;try{localStorage.setItem(PC_DAILY,pcToday());}catch(e){}const reward=50+Math.min(100,pcState.prestige*10);pcState.cash+=reward;pcState.pumpkins=Math.min(pcCap(),pcState.pumpkins+10);pcOpenCandy("daily");pcSave();}
function pcBuyCandy(){if(pcCandyOpening)return;const price=pcCandyPrice();if(pcState.cash<price){pcSay("Random candy costs $"+pcFmt(price));return;}pcState.cash-=price;pcOpenCandy("shop");pcSave();}
function pcActivateCandy(candy){const expiry=Date.now()+60*60*1000,existing=pcState.activeCandies.find(v=>v.id===candy.id);if(existing)existing.expiresAt=expiry;else pcState.activeCandies.push({id:candy.id,expiresAt:expiry});pcSave();}
function pcDrawCandyReveal(){if(!pcCandyOpening)return;const o=pcCandyOpening,elapsed=millis()-o.started;pcLayout();if(elapsed>=1050&&!o.activated){pcActivateCandy(o.candy);o.activated=true;}noStroke();fill(0,0,0,175);rect(0,0,width,height);const w=Math.min(width*.78,420),h=Math.min(height*.66,390),x=(width-w)/2,y=(height-h)/2;fill("#14230e");stroke(PC_ORANGE);strokeWeight(3);rect(x,y,w,h);fill(PC_WHITE);noStroke();textAlign(CENTER,CENTER);textSize(Math.max(16,Math.min(24,w*.065)));text(elapsed<1050?(o.source==="daily"?"OPENING DAILY CANDY":"OPENING RANDOM CANDY"):"CANDY BONUS UNLOCKED",x+w/2,y+h*.16);if(elapsed<1050){const shake=elapsed<750?Math.sin(elapsed*.065)*Math.max(1,12-elapsed*.012):0,pop=elapsed>=750?1+Math.sin((elapsed-750)/300*Math.PI)*.24:1,img=pcImgs.candyBag;if(img&&img.width)pcSheet(img,x+w/2+shake,y+h*.47,Math.min(w*.34,h*.3)*pop,1);else{fill(PC_ORANGE);rect(x+w*.42,y+h*.35,w*.16,h*.2);}fill("#c8d6b9");textSize(12);text(elapsed<750?"SHAKING...":"POP!",x+w/2,y+h*.76);return;}const d=o.candy,img=pcImgs[d.id],icon=Math.min(w*.28,h*.25);if(img&&img.width)pcSheet(img,x+w/2,y+h*.40,icon,1);fill(PC_ORANGE);textSize(Math.max(15,Math.min(22,w*.06)));text(d.name,x+w/2,y+h*.62);fill(PC_WHITE);textSize(Math.max(11,Math.min(15,w*.042)));text(d.desc,x+w/2,y+h*.71,w-30,48);fill("#9fb58a");textSize(11);text("ACTIVE FOR 1 HOUR",x+w/2,y+h*.83);pcButton(x+w*.25,y+h*.88,w*.5,28,"CONTINUE",PC_ORANGE,PC_BLACK);pcTarget(x+w*.25,y+h*.88,w*.5,28,()=>{pcCandyOpening=null;pcSave();},true);}
function pcPrestigeCost(){return Math.floor(2500*Math.pow(3,pcState.prestige));}
function pcPrestige(){const cost=pcPrestigeCost();if(pcState.cash<cost){pcSay("Need $"+pcFmt(cost)+" to prestige");return;}const p=pcState.prestige+1,buffs=pcState.activeCandies.filter(v=>v.expiresAt>Date.now());pcState=pcFresh(p);pcState.activeCandies=buffs;pcState.farmCols=6+p;pcState.farmRows=4+p;pcState.farm=Array.from({length:pcState.farmRows},()=>Array(pcState.farmCols).fill(null));pcGridScroll=0;pcSideScroll=0;pcSelected=null;pcSay("Prestige "+p+"! Farm expanded; permanent production increased.");pcSave();}
function pcSay(s){pcToast=s;pcToastEnd=millis()+2500;}
function pcDrawToast(L){const y=L.H-23,w=Math.min(L.W-20,Math.max(150,pcToast.length*6.5+26)),x=(L.W-w)/2;fill(PC_BLACK);stroke(PC_ORANGE);strokeWeight(1.5);rect(x,y,w,19);noStroke();fill(PC_WHITE);textAlign(CENTER,CENTER);textSize(10);text(pcToast,x+w/2,y+9.5);}
function mousePressed(){for(let i=pcTargets.length-1;i>=0;i--){const t=pcTargets[i];if(pcCandyOpening&&!t.modal)continue;if(mouseX>=t.x&&mouseX<=t.x+t.w&&mouseY>=t.y&&mouseY<=t.y+t.h){t.fn();return false;}}return false;}
function mouseWheel(e){const L=pcLayout();if(mouseX<L.side&&mouseY>L.top)pcSideScroll+=e.delta;else if(mouseX>=L.mainX&&mouseY>=L.gridTop)pcGridScroll+=e.delta;return false;}
function keyPressed(){if(key==="Escape"){pcSelected=null;pcSay("Build selection cleared");return false;}if(key==="1"){pcTab="workers";pcSideScroll=0;return false;}if(key==="2"){pcTab="build";pcSideScroll=0;return false;}if(key==="3"){pcTab="candy";pcSideScroll=0;return false;}return true;}
