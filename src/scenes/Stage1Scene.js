import { STAGE_1 } from "../data/stage1.js";

const W = STAGE_1.canvas.width;
const H = STAGE_1.canvas.height;

export class Stage1Scene extends Phaser.Scene {
  constructor() {
    super("stage1");
    this.coins = STAGE_1.startingTreats;
    this.homeHP = STAGE_1.startingHomeHP;
    this.wave = 1;
    this.waveRunning = false;
    this.guardians = new Map();
    this.enemiesAlive = 0;
    this.enemies = [];
  }

  preload() {
    this.load.image("stage1-bg", STAGE_1.background);
  }

  create() {
    this.add.image(W / 2, H / 2, "stage1-bg")
      .setDisplaySize(W, H)
      .setDepth(0);

    const vignette = this.add.graphics().setDepth(1);
    vignette.fillStyle(0x000000, 0.12);
    vignette.fillRect(0, 0, W, 82);
    vignette.fillRect(0, H - 92, W, 92);

    this.makeDebugPath();
    this.makeGuardSpots();
    this.makeHUD();

    this.add.text(W / 2, 118, "STAGE 1  •  NIGHT WATCH", {
      fontFamily: "system-ui",
      fontSize: "28px",
      fontStyle: "700",
      color: "#fff6d7",
      stroke: "#2b2016",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 154, "Graybox: validate path, guard placement and pacing first", {
      fontFamily: "system-ui",
      fontSize: "17px",
      color: "#ead7ad",
      stroke: "#2b2016",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(20);
  }

  makeDebugPath() {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(6, 0xffdc72, 0.72);
    const pts = STAGE_1.path.map(([x, y]) => new Phaser.Math.Vector2(x * W, y * H));

    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();

    g.fillStyle(0xd84735, 0.95);
    g.fillCircle(pts[0].x, pts[0].y, 16);

    const goal = pts[pts.length - 1];
    g.fillStyle(0x64c078, 0.95);
    g.fillCircle(goal.x, goal.y, 18);
  }

  makeGuardSpots() {
    STAGE_1.guardSpots.forEach(([nx, ny], index) => {
      const x = nx * W;
      const y = ny * H;

      const c = this.add.circle(x, y, 33, 0x2c7f67, 0.68)
        .setStrokeStyle(4, 0xcdf7d8, 0.95)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, `${index + 1}`, {
        fontFamily: "system-ui",
        fontSize: "24px",
        fontStyle: "800",
        color: "#ffffff"
      }).setOrigin(0.5).setDepth(11);

      c.on("pointerdown", () => this.placePlaceholderGuardian(index, x, y, c, label));
    });
  }

  placePlaceholderGuardian(index, x, y, spot, label) {
    if (this.guardians.has(index)) return;

    const cost = 100;
    if (this.coins < cost) {
      this.flashMessage("Not enough treats!");
      return;
    }

    this.coins -= cost;
    this.guardians.set(index, { x, y, range: 155, nextShot: 0 });

    spot.setFillStyle(0x397a48, 0.28).disableInteractive();
    label.setVisible(false);

    const body = this.add.circle(x, y, 25, 0xf4e6c9, 1)
      .setStrokeStyle(5, 0x4a3022, 1)
      .setDepth(13);

    this.add.triangle(x - 15, y - 25, 0, 18, 10, 0, 20, 18, 0x4a3022, 1).setDepth(12);
    this.add.triangle(x + 15, y - 25, 0, 18, 10, 0, 20, 18, 0x4a3022, 1).setDepth(12);

    body.guardIndex = index;
    this.refreshHUD();
  }

  makeHUD() {
    this.add.rectangle(W / 2, 42, 650, 62, 0x17130f, 0.88)
      .setStrokeStyle(2, 0xd6b66f, 0.45)
      .setDepth(30);

    this.coinText = this.add.text(W / 2 - 260, 42, "", this.hudStyle())
      .setOrigin(0, 0.5).setDepth(31);
    this.hpText = this.add.text(W / 2 - 55, 42, "", this.hudStyle())
      .setOrigin(0, 0.5).setDepth(31);
    this.waveText = this.add.text(W / 2 + 125, 42, "", this.hudStyle())
      .setOrigin(0, 0.5).setDepth(31);

    const button = this.add.rectangle(W - 125, H - 58, 190, 58, 0x9d4f28, 0.96)
      .setStrokeStyle(3, 0xffd78a, 0.85)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.add.text(W - 125, H - 58, "START WAVE", {
      fontFamily: "system-ui",
      fontSize: "22px",
      fontStyle: "800",
      color: "#fff5d9"
    }).setOrigin(0.5).setDepth(31);

    button.on("pointerdown", () => {
      if (!this.waveRunning) this.startWave();
    });

    this.refreshHUD();
  }

  hudStyle() {
    return {
      fontFamily: "system-ui",
      fontSize: "20px",
      fontStyle: "700",
      color: "#fff4d1"
    };
  }

  refreshHUD() {
    this.coinText.setText(`TREATS  ${this.coins}`);
    this.hpText.setText(`HOME  ${this.homeHP}`);
    this.waveText.setText(`WAVE  ${this.wave}`);
  }

  startWave() {
    this.waveRunning = true;
    const count = 6 + (this.wave - 1) * 2;
    this.enemiesAlive = count;

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 720, () => this.spawnCat());
    }
  }

  spawnCat() {
    const pts = STAGE_1.path.map(([x, y]) => ({ x: x * W, y: y * H }));

    const cat = this.add.circle(pts[0].x, pts[0].y, 18, 0x71503c, 1)
      .setStrokeStyle(4, 0x2a1912, 1)
      .setDepth(15);

    cat.hp = 45 + this.wave * 9;
    cat.pathIndex = 0;
    cat.speed = 82 + this.wave * 3;
    cat.dead = false;
    cat.path = pts;

    const earA = this.add.triangle(cat.x - 10, cat.y - 17, 0, 15, 8, 0, 16, 15, 0x71503c, 1).setDepth(14);
    const earB = this.add.triangle(cat.x + 10, cat.y - 17, 0, 15, 8, 0, 16, 15, 0x71503c, 1).setDepth(14);
    cat.ears = [earA, earB];

    this.physics.world.enable(cat);
    cat.body.setCircle(18);
    cat.body.setAllowGravity(false);

    this.enemies.push(cat);
  }

  update(time, delta) {
    const dt = delta / 1000;

    for (const cat of this.enemies) {
      if (!cat || cat.dead) continue;
      this.moveCat(cat, dt);
    }

    for (const guard of this.guardians.values()) {
      if (time < guard.nextShot) continue;
      const target = this.findTarget(guard);
      if (target) {
        guard.nextShot = time + 780;
        this.fireShot(guard, target);
      }
    }

    this.enemies = this.enemies.filter(e => e && !e.destroyed);
  }

  moveCat(cat, dt) {
    const nextIndex = cat.pathIndex + 1;

    if (nextIndex >= cat.path.length) {
      this.reachHome(cat);
      return;
    }

    const target = cat.path[nextIndex];
    const dx = target.x - cat.x;
    const dy = target.y - cat.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) {
      cat.pathIndex++;
      return;
    }

    const step = Math.min(cat.speed * dt, dist);
    cat.x += (dx / dist) * step;
    cat.y += (dy / dist) * step;

    cat.body.reset(cat.x, cat.y);
    cat.ears[0].setPosition(cat.x - 10, cat.y - 17);
    cat.ears[1].setPosition(cat.x + 10, cat.y - 17);
  }

  findTarget(guard) {
    let best = null;
    let bestProgress = -1;

    for (const cat of this.enemies) {
      if (!cat || cat.dead) continue;

      const d = Phaser.Math.Distance.Between(guard.x, guard.y, cat.x, cat.y);
      if (d <= guard.range && cat.pathIndex > bestProgress) {
        best = cat;
        bestProgress = cat.pathIndex;
      }
    }

    return best;
  }

  fireShot(guard, target) {
    const shot = this.add.circle(guard.x, guard.y, 7, 0xffe36e, 1).setDepth(18);

    this.tweens.add({
      targets: shot,
      x: target.x,
      y: target.y,
      duration: 145,
      onComplete: () => {
        shot.destroy();
        if (!target || target.dead) return;

        target.hp -= 16;
        if (target.hp <= 0) this.killCat(target);
      }
    });
  }

  killCat(cat) {
    if (cat.dead) return;

    cat.dead = true;
    cat.ears.forEach(e => e.destroy());
    cat.destroy();
    cat.destroyed = true;

    this.coins += 18;
    this.enemiesAlive--;
    this.refreshHUD();
    this.checkWaveEnd();
  }

  reachHome(cat) {
    if (cat.dead) return;

    cat.dead = true;
    cat.ears.forEach(e => e.destroy());
    cat.destroy();
    cat.destroyed = true;

    this.homeHP = Math.max(0, this.homeHP - 1);
    this.enemiesAlive--;
    this.refreshHUD();

    if (this.homeHP <= 0) {
      this.waveRunning = false;
      this.flashMessage("HOME OVERRUN — Graybox test ended");
    } else {
      this.checkWaveEnd();
    }
  }

  checkWaveEnd() {
    if (this.enemiesAlive > 0) return;

    this.waveRunning = false;
    this.coins += 75;
    this.wave++;
    this.refreshHUD();
    this.flashMessage("Wave cleared! +75 treats");
  }

  flashMessage(text) {
    const t = this.add.text(W / 2, H - 120, text, {
      fontFamily: "system-ui",
      fontSize: "24px",
      fontStyle: "800",
      color: "#fff4d1",
      backgroundColor: "#2b2016cc",
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: t,
      alpha: 0,
      y: H - 145,
      duration: 1300,
      delay: 650,
      onComplete: () => t.destroy()
    });
  }
}
