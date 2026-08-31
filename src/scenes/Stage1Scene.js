import { STAGE_1 } from "../data/stage1.js";

const W = STAGE_1.canvas.width;
const H = STAGE_1.canvas.height;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Stage1Scene extends Phaser.Scene {
  constructor() {
    super("stage1");
    this.coins = STAGE_1.startingTreats;
    this.homeHP = STAGE_1.startingHomeHP;
    this.wave = 1;
    this.waveRunning = false;
    this.guardians = new Map();
    this.guardViews = [];
    this.enemies = [];
    this.enemiesAlive = 0;
  }

  preload() {
    this.load.image("day", STAGE_1.backgrounds.day);
    this.load.image("night", STAGE_1.backgrounds.night);
  }

  create() {
    const time = new URLSearchParams(location.search).get("time") === "night" ? "night" : "day";

    // Full-viewport presentation layer. No fake duplicated image and no black bars.
    this.viewportBg = this.add.rectangle(0, 0, 1, 1, 0x071a32, 1).setDepth(-3);
    this.leftRail = this.add.rectangle(0, 0, 1, 1, 0x0b2442, 1).setDepth(-2);
    this.rightRail = this.add.rectangle(0, 0, 1, 1, 0x0b2442, 1).setDepth(-2);

    // Canonical 16:9 board: FIT only, so the stage is never cropped or stretched.
    this.bg = this.add.image(0, 0, time).setOrigin(.5).setDepth(0);
    this.pathG = this.add.graphics().setDepth(5);

    this.makeGuards();
    this.makeHUD();
    this.layout();
    this.bindCanvasInput();
    this.scale.on("resize", this.layout, this);
  }

  metrics() {
    const vw = this.scale.width;
    const vh = this.scale.height;
    const s = Math.min(vw / W, vh / H);
    const dw = W * s;
    const dh = H * s;
    return { vw, vh, s, dw, dh, ox:(vw-dw)/2, oy:(vh-dh)/2 };
  }

  map(nx, ny) {
    const m = this.m;
    return { x:m.ox+nx*m.dw, y:m.oy+ny*m.dh };
  }

  layout() {
    this.m = this.metrics();
    const {vw,vh,dw,dh,ox,oy} = this.m;

    this.viewportBg.setPosition(vw/2,vh/2).setSize(vw,vh);
    this.bg.setPosition(vw/2,vh/2).setDisplaySize(dw,dh);

    const railW = Math.max(0, ox);
    this.leftRail.setVisible(railW > 0).setPosition(railW/2,vh/2).setSize(railW,vh);
    this.rightRail.setVisible(railW > 0).setPosition(vw-railW/2,vh/2).setSize(railW,vh);

    this.r = clamp(dh*.038,15,23);
    this.drawPath();

    STAGE_1.guardSpots.forEach(([x,y],i)=>{
      const p=this.map(x,y), v=this.guardViews[i];
      v.spot.setPosition(p.x,p.y).setRadius(this.r);
      v.label.setPosition(p.x,p.y).setFontSize(clamp(dh*.028,12,17));
    });

    for (const g of this.guardians.values()) {
      const [nx,ny]=STAGE_1.guardSpots[g.i], p=this.map(nx,ny);
      g.x=p.x; g.y=p.y; g.range=150*this.m.s;
      g.body.setPosition(p.x,p.y).setRadius(clamp(dh*.033,14,20));
    }

    const hh=clamp(dh*.066,36,48);
    const hw=clamp(dw*.42,300,500);
    const hy=oy+hh*.62;
    this.hud.setPosition(vw/2,hy).setSize(hw,hh);
    const fs=clamp(dh*.025,12,17);
    this.coin.setPosition(vw/2-hw*.31,hy).setFontSize(fs);
    this.hp.setPosition(vw/2,hy).setFontSize(fs);
    this.waveT.setPosition(vw/2+hw*.31,hy).setFontSize(fs);

    this.stageT.setPosition(ox+12, oy+14).setFontSize(clamp(dh*.022,11,14));

    const bw=clamp(dw*.145,112,158), bh=clamp(dh*.07,36,46);
    this.start.setPosition(ox+dw-14-bw/2,oy+dh-14-bh/2).setSize(bw,bh);
    this.startT.setPosition(this.start.x,this.start.y).setFontSize(clamp(bh*.35,12,15));
  }

  drawPath() {
    const pts=STAGE_1.path.map(([x,y])=>this.map(x,y));
    this.pathG.clear().lineStyle(clamp(this.m.dh*.004,2,3.5),0xffdc72,.62).beginPath().moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++) this.pathG.lineTo(pts[i].x,pts[i].y);
    this.pathG.strokePath();
  }

  makeGuards() {
    STAGE_1.guardSpots.forEach((_,i)=>{
      const spot=this.add.circle(0,0,18,0x238b6c,.62).setStrokeStyle(2.5,0xe2fff0,.94).setDepth(10).setInteractive();
      const label=this.add.text(0,0,String(i+1),{fontFamily:"system-ui",fontSize:"15px",fontStyle:"800",color:"#fff"}).setOrigin(.5).setDepth(11);
      spot.on("pointerdown",()=>this.place(i));
      this.guardViews.push({spot,label});
    });
  }

  makeHUD() {
    const style={fontFamily:"system-ui",fontSize:"14px",fontStyle:"700",color:"#fff4d1"};
    this.hud=this.add.rectangle(0,0,1,1,0x111722,.82).setStrokeStyle(1.5,0xe6c679,.45).setDepth(30);
    this.coin=this.add.text(0,0,"",style).setOrigin(.5).setDepth(31);
    this.hp=this.add.text(0,0,"",style).setOrigin(.5).setDepth(31);
    this.waveT=this.add.text(0,0,"",style).setOrigin(.5).setDepth(31);
    this.stageT=this.add.text(0,0,"STAGE 1 • DAY",{fontFamily:"system-ui",fontSize:"13px",fontStyle:"800",color:"#fff6d7",stroke:"#241b13",strokeThickness:3}).setOrigin(0,.5).setDepth(31);
    this.start=this.add.rectangle(0,0,1,1,0x9d4f28,.96).setStrokeStyle(2,0xffd78a,.86).setDepth(30).setInteractive();
    this.startT=this.add.text(0,0,"START WAVE",{fontFamily:"system-ui",fontSize:"15px",fontStyle:"800",color:"#fff5d9"}).setOrigin(.5).setDepth(31);
    this.start.on("pointerdown",()=>this.startTap());
    this.refreshHUD();
  }

  refreshHUD(){
    this.coin.setText(`TREATS ${this.coins}`);
    this.hp.setText(`HOME ${this.homeHP}`);
    this.waveT.setText(`WAVE ${this.wave}`);
  }

  bindCanvasInput(){
    const c=this.sys.game.canvas;
    this.domTap=(e)=>{
      const r=c.getBoundingClientRect();
      const x=(e.clientX-r.left)*(this.scale.width/r.width);
      const y=(e.clientY-r.top)*(this.scale.height/r.height);

      if(Math.abs(x-this.start.x)<=this.start.width/2 && Math.abs(y-this.start.y)<=this.start.height/2){
        e.preventDefault(); this.startTap(); return;
      }

      for(let i=0;i<STAGE_1.guardSpots.length;i++){
        if(this.guardians.has(i)) continue;
        const p=this.map(...STAGE_1.guardSpots[i]), dx=x-p.x, dy=y-p.y, rr=this.r*1.4;
        if(dx*dx+dy*dy<=rr*rr){e.preventDefault();this.place(i);return;}
      }
    };
    c.addEventListener("pointerup",this.domTap,{passive:false});
  }

  startTap(){
    if(this.waveRunning)return;
    this.startWave();
    this.fullscreen();
  }

  async fullscreen(){
    try{
      if(!document.fullscreenElement&&document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if(screen.orientation?.lock) await screen.orientation.lock("landscape");
    }catch(_){}
  }

  place(i){
    if(this.guardians.has(i)||this.coins<100)return;
    this.coins-=100;
    const p=this.map(...STAGE_1.guardSpots[i]);
    const body=this.add.circle(p.x,p.y,18,0xf4e6c9,1).setStrokeStyle(4,0x4a3022,1).setDepth(13);
    this.guardians.set(i,{i,body,x:p.x,y:p.y,range:150*this.m.s,nextShot:0});
    this.guardViews[i].spot.disableInteractive().setFillStyle(0x397a48,.22);
    this.guardViews[i].label.setVisible(false);
    this.refreshHUD();
  }

  startWave(){
    this.waveRunning=true;
    const n=6+(this.wave-1)*2;
    this.enemiesAlive=n;
    for(let i=0;i<n;i++) this.time.delayedCall(i*STAGE_1.pacing.spawnIntervalMs,()=>this.spawnEnemy());
  }

  spawnEnemy(){
    const path=STAGE_1.path.map(([x,y])=>this.map(x,y));
    const e=this.add.circle(path[0].x,path[0].y,14,0x71503c,1).setStrokeStyle(3,0x2a1912,1).setDepth(15);
    e.hp=45+this.wave*9;e.path=path;e.pathIndex=0;e.speed=(STAGE_1.pacing.baseEnemySpeed+this.wave*STAGE_1.pacing.waveSpeedStep)*this.m.s;e.dead=false;
    this.enemies.push(e);
  }

  update(time,delta){
    const dt=delta/1000;
    for(const e of this.enemies)if(e&&!e.dead)this.move(e,dt);
    for(const g of this.guardians.values())if(time>=g.nextShot){const t=this.target(g);if(t){g.nextShot=time+780;this.fire(g,t);}}
    this.enemies=this.enemies.filter(e=>e&&!e.destroyed);
  }

  move(e,dt){
    const ni=e.pathIndex+1;if(ni>=e.path.length){this.reach(e);return;}
    const t=e.path[ni],dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy);
    if(d<4){e.pathIndex++;return;}
    const s=Math.min(e.speed*dt,d);e.x+=dx/d*s;e.y+=dy/d*s;
  }

  target(g){let best=null,p=-1;for(const e of this.enemies){if(!e||e.dead)continue;const d=Phaser.Math.Distance.Between(g.x,g.y,e.x,e.y);if(d<=g.range&&e.pathIndex>p){best=e;p=e.pathIndex;}}return best;}
  fire(g,e){const s=this.add.circle(g.x,g.y,5,0xffe36e,1).setDepth(18);this.tweens.add({targets:s,x:e.x,y:e.y,duration:145,onComplete:()=>{s.destroy();if(!e||e.dead)return;e.hp-=16;if(e.hp<=0)this.kill(e);}});}
  kill(e){if(e.dead)return;e.dead=true;e.destroy();e.destroyed=true;this.coins+=18;this.enemiesAlive--;this.refreshHUD();this.endCheck();}
  reach(e){if(e.dead)return;e.dead=true;e.destroy();e.destroyed=true;this.homeHP=Math.max(0,this.homeHP-1);this.enemiesAlive--;this.refreshHUD();if(this.homeHP<=0)this.waveRunning=false;else this.endCheck();}
  endCheck(){if(this.enemiesAlive>0)return;this.waveRunning=false;this.coins+=75;this.wave++;this.refreshHUD();}
}
