import { STAGE_1, GUARDIANS } from "../data/stage1.js";

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const $ = (id)=>document.getElementById(id);

export class Stage1Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha:false, desynchronized:true });
    this.worldW = STAGE_1.world.width;
    this.worldH = STAGE_1.world.height;
    this.dpr = 1;
    this.viewportW = 0;
    this.viewportH = 0;
    this.worldScale = 1;
    this.worldX = 0;
    this.worldY = 0;
    this.last = performance.now();
    this.accumSpawn = 0;
    this.spawnRemaining = 0;
    this.waveRunning = false;
    this.wave = 1;
    this.treats = STAGE_1.startingTreats;
    this.homeHP = STAGE_1.startingHomeHP;
    this.speed = 1;
    this.paused = false;
    this.selectedSpot = null;
    this.guardians = new Map();
    this.enemies = [];
    this.projectiles = [];
    this.timeMode = localStorage.getItem("bark-guard-time") || "auto";
    this.debug = new URLSearchParams(location.search).get("debug") === "1";
    this.images = {};
    this.path = STAGE_1.path.map(([x,y])=>({x:x*this.worldW,y:y*this.worldH}));
    this.guardSpots = STAGE_1.guardSpots.map(([x,y])=>({x:x*this.worldW,y:y*this.worldH}));
    this.pathSegments = this.buildPathSegments(this.path);
    this.pathLength = this.pathSegments.at(-1).endDistance;
    this.boundLoop = (t)=>this.loop(t);
  }

  async init() {
    await Promise.all([
      this.loadImage("day", STAGE_1.backgrounds.day),
      this.loadImage("night", STAGE_1.backgrounds.night)
    ]);
    this.resolveTimeOfDay();
    this.resize();
    this.bindInput();
    this.bindUI();
    this.renderGuardianCards();
    this.updateHUD();
    window.addEventListener("resize", ()=>this.resize(), {passive:true});
    window.addEventListener("orientationchange", ()=>setTimeout(()=>this.resize(),120), {passive:true});
    $("loading-screen").classList.add("hidden");
    requestAnimationFrame(this.boundLoop);
  }

  loadImage(key, src) {
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload=()=>{this.images[key]=img;resolve(img)};
      img.onerror=reject;
      img.src=src;
    });
  }

  resolveTimeOfDay() {
    const forced = new URLSearchParams(location.search).get("time");
    if (forced === "day" || forced === "night") this.timeOfDay = forced;
    else if (this.timeMode === "day" || this.timeMode === "night") this.timeOfDay = this.timeMode;
    else {
      const hour = new Date().getHours();
      this.timeOfDay = hour >= 6 && hour < 18 ? "day" : "night";
    }
    document.body.classList.toggle("night", this.timeOfDay === "night");
    document.querySelectorAll("#time-mode button").forEach(b=>b.classList.toggle("active",b.dataset.time===this.timeMode));
  }

  setTimeMode(mode) {
    this.timeMode = mode;
    localStorage.setItem("bark-guard-time", mode);
    this.resolveTimeOfDay();
    this.toast(`Lighting: ${mode[0].toUpperCase()+mode.slice(1)}`);
  }

  buildPathSegments(points) {
    let total=0;
    return points.slice(0,-1).map((a,i)=>{
      const b=points[i+1];
      const length=Math.hypot(b.x-a.x,b.y-a.y);
      const seg={a,b,length,startDistance:total,endDistance:total+length};
      total+=length;
      return seg;
    });
  }

  pathPosition(distance) {
    const d=clamp(distance,0,this.pathLength);

    // Dense centerline + binary segment lookup keeps every enemy exactly on the
    // locked stone walkway without cutting across grass on tight curves.
    let lo=0, hi=this.pathSegments.length-1;
    while(lo<hi){
      const mid=(lo+hi)>>1;
      if(d<=this.pathSegments[mid].endDistance) hi=mid;
      else lo=mid+1;
    }

    const seg=this.pathSegments[lo];
    const t=seg.length ? clamp((d-seg.startDistance)/seg.length,0,1) : 0;
    return {x:lerp(seg.a.x,seg.b.x,t),y:lerp(seg.a.y,seg.b.y,t)};
  }

  resize() {
    const r=this.canvas.getBoundingClientRect();
    this.viewportW=Math.max(1,r.width);
    this.viewportH=Math.max(1,r.height);
    this.dpr=clamp(window.devicePixelRatio||1,1,2.5);
    this.canvas.width=Math.round(this.viewportW*this.dpr);
    this.canvas.height=Math.round(this.viewportH*this.dpr);
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    // 20:9 master fills modern landscape displays. Slight crop only on narrower ratios.
    this.worldScale=Math.max(this.viewportW/this.worldW,this.viewportH/this.worldH);
    this.worldX=(this.viewportW-this.worldW*this.worldScale)/2;
    this.worldY=(this.viewportH-this.worldH*this.worldScale)/2;
  }

  worldToScreen(p) { return {x:this.worldX+p.x*this.worldScale,y:this.worldY+p.y*this.worldScale}; }
  screenToWorld(x,y) { return {x:(x-this.worldX)/this.worldScale,y:(y-this.worldY)/this.worldScale}; }

  bindInput() {
    this.canvas.addEventListener("pointerup", (e)=>{
      if (this.paused) return;
      const rect=this.canvas.getBoundingClientRect();
      const p=this.screenToWorld(e.clientX-rect.left,e.clientY-rect.top);
      let best=-1,bestD=Infinity;
      this.guardSpots.forEach((s,i)=>{
        if(this.guardians.has(i)) return;
        const d=Math.hypot(p.x-s.x,p.y-s.y);
        if(d<48 && d<bestD){best=i;bestD=d;}
      });
      if(best>=0) this.openPlacement(best);
      else this.closePlacement();
    }, {passive:true});
  }

  bindUI() {
    $("start-wave").addEventListener("click",()=>this.startWave());
    $("speed-button").addEventListener("click",()=>{
      this.speed=this.speed===1?2:1; $("speed-button").textContent=`×${this.speed}`; this.toast(`Game speed ×${this.speed}`);
    });
    $("pause-button").addEventListener("click",()=>this.setPaused(true));
    $("resume-button").addEventListener("click",()=>this.setPaused(false));
    $("restart-button").addEventListener("click",()=>location.reload());
    $("placement-close").addEventListener("click",()=>this.closePlacement());
    $("settings-button").addEventListener("click",()=>this.toggleSettings(true));
    $("settings-close").addEventListener("click",()=>this.toggleSettings(false));
    document.querySelectorAll("#time-mode button").forEach(b=>b.addEventListener("click",()=>this.setTimeMode(b.dataset.time)));
    $("install-app").addEventListener("click",async()=>{
      const result=await window.BarkPWA?.install?.();
      if(result?.status==="installed"||result?.status==="accepted") this.toast("BARK & GUARD installed");
      else if(result?.status==="ios") this.toast("Safari: Share → Add to Home Screen",2600);
      else if(result?.status==="manual") this.toast("Browser menu → Install app / Add to Home screen",3000);
    });
    window.addEventListener("bark:pwa-state",(e)=>this.updateInstallUI(e.detail));
    this.updateInstallUI(window.BarkPWA?.state || {});
  }

  updateInstallUI(state={}) {
    const button=$("install-app"), hint=$("install-hint");
    if(!button) return;
    if(state.installed||state.installedHint){button.classList.add("hidden");hint.textContent="Installed. Open BARK & GUARD directly from its Home Screen icon.";}
    else {button.classList.remove("hidden");hint.textContent=state.canPrompt?"Ready to install as an app.":"Install it once, then launch directly from its Home Screen icon.";}
  }

  toggleSettings(open) { $("settings-panel").classList.toggle("open",open); $("settings-panel").setAttribute("aria-hidden",String(!open)); if(open)this.closePlacement(); }
  setPaused(value) { this.paused=value; $("pause-overlay").classList.toggle("open",value); $("pause-overlay").setAttribute("aria-hidden",String(!value)); }

  renderGuardianCards() {
    const wrap=$("guardian-cards"); wrap.innerHTML="";
    for(const g of GUARDIANS){
      const btn=document.createElement("button"); btn.className="guardian-card"; btn.dataset.id=g.id;
      btn.innerHTML=`<i class="avatar" style="background:${g.color}">${g.name[0]}</i><strong>${g.name}</strong><span>${g.cost} treats</span><small>${g.role}</small>`;
      btn.addEventListener("click",()=>this.placeGuardian(g.id)); wrap.appendChild(btn);
    }
  }

  openPlacement(index) {
    this.selectedSpot=index;
    $("placement-title").textContent=`Select Shih Tzu · Spot ${index+1}`;
    $("placement-panel").classList.add("open"); $("placement-panel").setAttribute("aria-hidden","false");
    document.querySelectorAll(".guardian-card").forEach(btn=>{
      const g=GUARDIANS.find(x=>x.id===btn.dataset.id); btn.disabled=this.treats<g.cost;
    });
  }
  closePlacement(){this.selectedSpot=null;$("placement-panel").classList.remove("open");$("placement-panel").setAttribute("aria-hidden","true");}

  placeGuardian(id) {
    if(this.selectedSpot===null || this.guardians.has(this.selectedSpot)) return;
    const type=GUARDIANS.find(g=>g.id===id); if(!type||this.treats<type.cost){this.toast("Not enough treats");return;}
    const p=this.guardSpots[this.selectedSpot];
    this.treats-=type.cost;
    this.guardians.set(this.selectedSpot,{spot:this.selectedSpot,type,x:p.x,y:p.y,cooldown:0});
    this.updateHUD(); this.toast(`${type.name} is guarding Spot ${this.selectedSpot+1}`); this.closePlacement();
  }

  startWave() {
    if(this.paused||this.waveRunning||this.wave>STAGE_1.maxWaves) return;
    this.waveRunning=true;
    const count=6+(this.wave-1)*2;
    this.spawnRemaining=count; this.accumSpawn=999;
    $("start-wave").disabled=true; $("start-wave").querySelector("span:last-child").textContent="WAVE ACTIVE";
    this.showWaveAlert(this.wave,count);
    this.tryFullscreen();
  }

  async tryFullscreen(){
    if(window.BarkPWA?.enterImmersive){
      await window.BarkPWA.enterImmersive();
      return;
    }

    try{
      if(!window.matchMedia("(display-mode: standalone)").matches && !document.fullscreenElement && document.documentElement.requestFullscreen){
        await document.documentElement.requestFullscreen({navigationUI:"hide"});
      }
    }catch(_){ }

    try{
      if(screen.orientation?.lock) await screen.orientation.lock("landscape");
    }catch(_){ }
  }

  spawnEnemy() {
    const hp=58+this.wave*12;
    this.enemies.push({distance:0,hp,maxHp:hp,speed:STAGE_1.pacing.baseEnemySpeed+this.wave*STAGE_1.pacing.waveSpeedStep,slowUntil:0,slowFactor:1,dead:false});
  }

  update(dt, now) {
    if(this.paused) return;
    const sim=dt*this.speed;
    if(this.waveRunning && this.spawnRemaining>0){
      this.accumSpawn+=sim*1000;
      while(this.spawnRemaining>0 && this.accumSpawn>=STAGE_1.pacing.spawnIntervalMs){
        this.accumSpawn-=STAGE_1.pacing.spawnIntervalMs; this.spawnEnemy(); this.spawnRemaining--;
      }
    }

    for(const e of this.enemies){
      if(e.dead)continue;
      const slow=now<e.slowUntil?e.slowFactor:1;
      e.distance+=e.speed*slow*sim;
      if(e.distance>=this.pathLength){e.dead=true;this.homeHP=Math.max(0,this.homeHP-1);this.updateHUD();}
    }

    for(const g of this.guardians.values()){
      g.cooldown-=sim;
      if(g.cooldown>0)continue;
      let target=null,best=-1;
      for(const e of this.enemies){
        if(e.dead)continue; const ep=this.pathPosition(e.distance); const d=Math.hypot(ep.x-g.x,ep.y-g.y);
        if(d<=g.type.range && e.distance>best){target=e;best=e.distance;}
      }
      if(target){
        g.cooldown=g.type.cooldown; const tp=this.pathPosition(target.distance);
        target.hp-=g.type.damage;
        if(g.type.slow){target.slowFactor=g.type.slow;target.slowUntil=now+1000;}
        this.projectiles.push({x:g.x,y:g.y,tx:tp.x,ty:tp.y,life:.16,max:.16,color:g.type.color});
        if(target.hp<=0){target.dead=true;this.treats+=STAGE_1.economy.killReward;this.updateHUD();}
      }
    }

    this.projectiles.forEach(p=>p.life-=sim);
    this.projectiles=this.projectiles.filter(p=>p.life>0);
    this.enemies=this.enemies.filter(e=>!e.dead);

    if(this.waveRunning && this.spawnRemaining===0 && this.enemies.length===0){
      this.waveRunning=false;
      if(this.homeHP<=0){this.toast("Home overrun — restart Stage 1",3000);return;}
      this.treats+=STAGE_1.economy.waveReward;
      this.wave++;
      if(this.wave>STAGE_1.maxWaves){this.toast("STAGE 1 CLEARED!",4000);}
      else this.toast(`Wave cleared · +${STAGE_1.economy.waveReward} treats`,2200);
      $("start-wave").disabled=this.wave>STAGE_1.maxWaves;
      $("start-wave").querySelector("span:last-child").textContent=this.wave>STAGE_1.maxWaves?"STAGE CLEAR":"START WAVE";
      this.updateHUD();
    }
  }

  loop(now) {
    const dt=clamp((now-this.last)/1000,0,0.05); this.last=now;
    this.update(dt,now); this.render(now); requestAnimationFrame(this.boundLoop);
  }

  render(now) {
    const c=this.ctx, w=this.viewportW,h=this.viewportH;
    c.save(); c.setTransform(this.dpr,0,0,this.dpr,0,0); c.clearRect(0,0,w,h);
    const img=this.images[this.timeOfDay]; c.drawImage(img,this.worldX,this.worldY,this.worldW*this.worldScale,this.worldH*this.worldScale);
    // Very light readability vignette only at extreme top edge behind HUD.
    const grad=c.createLinearGradient(0,0,0,78); grad.addColorStop(0,this.timeOfDay==="night"?"rgba(3,17,28,.16)":"rgba(255,255,255,.06)"); grad.addColorStop(1,"rgba(0,0,0,0)"); c.fillStyle=grad;c.fillRect(0,0,Math.min(w,680),84);
    this.drawMarkers(c,now); this.drawEnemies(c); this.drawGuardians(c); this.drawProjectiles(c);
    if(this.debug)this.drawDebug(c);
    c.restore();
  }

  drawMarkers(c,now) {
    const pulse=1+Math.sin(now/450)*.06;
    // Guard placement rings.
    this.guardSpots.forEach((p,i)=>{
      if(this.guardians.has(i))return;
      const s=this.worldToScreen(p),r=18*this.worldScale*pulse;
      c.beginPath();c.arc(s.x,s.y,r,0,Math.PI*2);c.fillStyle=this.selectedSpot===i?"rgba(255,213,111,.42)":"rgba(104,207,170,.22)";c.fill();
      c.lineWidth=2.2;c.strokeStyle=this.selectedSpot===i?"rgba(255,230,156,.95)":"rgba(231,255,247,.92)";c.stroke();
      c.beginPath();c.arc(s.x,s.y,4*this.worldScale,0,Math.PI*2);c.fillStyle="rgba(255,255,255,.94)";c.fill();
    });
    // Start and Home markers.
    const spawn=this.worldToScreen(this.path[0]),goal=this.worldToScreen(this.path.at(-1));
    this.drawPill(c,spawn.x-2,spawn.y-22,"START","#47b98f");
    this.drawPill(c,goal.x+2,goal.y-15,"HOME","#55a9d5");
  }

  drawPill(c,x,y,text,color){
    c.save();c.font="800 10px system-ui";const tw=c.measureText(text).width,pw=tw+14,ph=21;
    c.fillStyle=color;c.strokeStyle="rgba(255,255,255,.9)";c.lineWidth=1.3;this.roundRect(c,x-pw/2,y-ph/2,pw,ph,9);c.fill();c.stroke();
    c.fillStyle="#fff";c.textAlign="center";c.textBaseline="middle";c.fillText(text,x,y+.5);c.restore();
  }

  drawEnemies(c){
    for(const e of this.enemies){
      const p=this.worldToScreen(this.pathPosition(e.distance)), r=12*this.worldScale;
      c.save();c.translate(p.x,p.y);
      c.fillStyle="#745244";c.strokeStyle="#3e2d28";c.lineWidth=2;
      c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();
      c.beginPath();c.moveTo(-r*.72,-r*.62);c.lineTo(-r*.25,-r*1.35);c.lineTo(0,-r*.64);c.closePath();c.fill();c.stroke();
      c.beginPath();c.moveTo(r*.72,-r*.62);c.lineTo(r*.25,-r*1.35);c.lineTo(0,-r*.64);c.closePath();c.fill();c.stroke();
      const hp=clamp(e.hp/e.maxHp,0,1);c.fillStyle="rgba(28,44,51,.48)";this.roundRect(c,-r,r+5,r*2,4,2);c.fill();c.fillStyle="#77d49b";this.roundRect(c,-r,r+5,r*2*hp,4,2);c.fill();c.restore();
    }
  }

  drawGuardians(c){
    for(const g of this.guardians.values()){
      const p=this.worldToScreen(g),r=16*this.worldScale;
      c.save();c.translate(p.x,p.y);
      c.shadowColor="rgba(21,63,68,.22)";c.shadowBlur=8;
      c.fillStyle=g.type.color;c.strokeStyle="rgba(255,255,255,.94)";c.lineWidth=2.5;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();c.shadowBlur=0;
      c.fillStyle="#fff";c.font=`900 ${Math.max(9,11*this.worldScale)}px system-ui`;c.textAlign="center";c.textBaseline="middle";c.fillText(g.type.name[0],0,.5);c.restore();
    }
  }

  drawProjectiles(c){
    for(const p of this.projectiles){
      const t=1-p.life/p.max,a=this.worldToScreen(p),b=this.worldToScreen({x:p.tx,y:p.ty});
      const x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);c.save();c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.color;c.shadowColor=p.color;c.shadowBlur=9;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.restore();
    }
  }

  drawDebug(c){
    c.save();c.strokeStyle="#ffd24a";c.lineWidth=2;c.beginPath();this.path.forEach((p,i)=>{const s=this.worldToScreen(p);i?c.lineTo(s.x,s.y):c.moveTo(s.x,s.y)});c.stroke();
    c.font="800 11px system-ui";c.textAlign="center";c.textBaseline="middle";
    this.guardSpots.forEach((p,i)=>{const s=this.worldToScreen(p);c.fillStyle="#238b6c";c.beginPath();c.arc(s.x,s.y,16,0,Math.PI*2);c.fill();c.fillStyle="#fff";c.fillText(String(i+1),s.x,s.y);});c.restore();
  }

  roundRect(c,x,y,w,h,r){
    if(w<=0||h<=0)return;c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
  }

  updateHUD(){
    $("hud-treats").textContent=this.treats;
    const pct=Math.round((this.homeHP/STAGE_1.startingHomeHP)*100);$("hud-home").textContent=`${pct}%`;$("hud-home-bar").style.width=`${pct}%`;
    $("hud-wave").textContent=`${Math.min(this.wave,STAGE_1.maxWaves)} / ${STAGE_1.maxWaves}`;
    if(this.selectedSpot!==null)this.openPlacement(this.selectedSpot);
  }

  showWaveAlert(wave,count){
    const el=$("wave-alert");el.innerHTML=`<small>ENEMIES INCOMING · ${count}</small>WAVE ${wave}`;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1350);
  }
  toast(message,duration=1800){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove("show"),duration);}
}
