import { STAGE_1 } from "../data/stage1.js";

const SRC_W = STAGE_1.canvas.width;
const SRC_H = STAGE_1.canvas.height;

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
    this.guardSpotViews = [];
  }

  preload() {
    this.load.image("stage1-bg-day", STAGE_1.backgrounds.day);
    this.load.image("stage1-bg-night", STAGE_1.backgrounds.night);
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    const requestedTime = params.get("time");
    this.timeOfDay =
      requestedTime === "day" || requestedTime === "night"
        ? requestedTime
        : STAGE_1.defaultTimeOfDay;

    this.background = this.add
      .image(0, 0, `stage1-bg-${this.timeOfDay}`)
      .setOrigin(0.5)
      .setDepth(0);

    this.pathGraphics = this.add.graphics().setDepth(5);

    this.titleText = this.add.text(0, 0, "", {
      fontFamily: "system-ui",
      fontSize: "24px",
      fontStyle: "700",
      color: "#fff6d7",
      stroke: "#2b2016",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(20);

    this.createGuardSpots();
    this.createHUD();
    this.refreshLayout();

    this.scale.on("resize", this.refreshLayout, this);
  }

  getMetrics() {
    const vw = this.scale.width;
    const vh = this.scale.height;
    const coverScale = Math.max(vw / SRC_W, vh / SRC_H);
    const displayW = SRC_W * coverScale;
    const displayH = SRC_H * coverScale;
    const offsetX = (vw - displayW) / 2;
    const offsetY = (vh - displayH) / 2;

    return {
      vw,
      vh,
      coverScale,
      displayW,
      displayH,
      offsetX,
      offsetY
    };
  }

  mapPoint(nx, ny) {
    const m = this.metrics;
    return {
      x: m.offsetX + nx * m.displayW,
      y: m.offsetY + ny * m.displayH
    };
  }

  refreshLayout() {
    this.metrics = this.getMetrics();

    const { vw, vh, displayW, displayH } = this.metrics;

    this.background
      .setPosition(vw / 2, vh / 2)
      .setDisplaySize(displayW, displayH);

    this.drawDebugPath();
    this.positionGuardSpots();
    this.positionGuardians();
    this.positionHUD();

    this.titleText
      .setPosition(vw / 2, 84)
      .setText(`STAGE 1  •  ${STAGE_1.name.toUpperCase()}  •  ${this.timeOfDay.toUpperCase()}`);
  }

  drawDebugPath() {
    const g = this.pathGraphics;
    g.clear();

    const pts = STAGE_1.path.map(([x, y]) => this.mapPoint(x, y));
    g.lineStyle(5, 0xffdc72, 0.82);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.strokePath();

    g.fillStyle(0xd84735, 0.95);
    g.fillCircle(pts[0].x, pts[0].y, 13);

    const goal = pts[pts.length - 1];
    g.fillStyle(0x64c078, 0.95);
    g.fillCircle(goal.x, goal.y, 15);
  }

  createGuardSpots() {
    STAGE_1.guardSpots.forEach((_, index) => {
      const spot = this.add
        .circle(0, 0, 31, 0x238b6c, 0.72)
        .setStrokeStyle(3, 0xe2fff0, 0.98)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(0, 0, `${index + 1}`, {
          fontFamily: "system-ui",
          fontSize: "22px",
          fontStyle: "800",
          color: "#ffffff"
        })
        .setOrigin(0.5)
        .setDepth(11);

      spot.on("pointerdown", () => this.placePlaceholderGuardian(index, spot, label));
      this.guardSpotViews.push({ spot, label });
    });
  }

  positionGuardSpots() {
    STAGE_1.guardSpots.forEach(([nx, ny], index) => {
      const { x, y } = this.mapPoint(nx, ny);
      const view = this.guardSpotViews[index];
      view.spot.setPosition(x, y);
      view.label.setPosition(x, y);
    });
  }

  getGuardPixelPosition(index) {
    const [nx, ny] = STAGE_1.guardSpots[index];
    return this.mapPoint(nx, ny);
  }

  placePlaceholderGuardian(index, spot, label) {
    if (this.guardians.has(index)) return;

    const cost = 100;
    if (this.coins < cost) {
      this.flashMessage("Not enough treats!");
      return;
    }

    this.coins -= cost;

    const { x, y } = this.getGuardPixelPosition(index);
    const body = this.add
      .circle(x, y, 24, 0xf4e6c9, 1)
      .setStrokeStyle(4, 0x4a3022, 1)
      .setDepth(13);

    const earLeft = this.add
      .triangle(x - 14, y - 23, 0, 17, 9, 0, 18, 17, 0x4a3022, 1)
      .setDepth(12);

    const earRight = this.add
      .triangle(x + 14, y - 23, 0, 17, 9, 0, 18, 17, 0x4a3022, 1)
      .setDepth(12);

    this.guardians.set(index, {
      index,
      nextShot: 0,
      range: 0,
      body,
      earLeft,
      earRight
    });

    spot.setFillStyle(0x397a48, 0.25).disableInteractive();
    label.setVisible(false);

    this.positionGuardians();
    this.refreshHUD();
  }

  positionGuardians() {
    const rangeBase = 150 * this.metrics.coverScale;

    for (const guard of this.guardians.values()) {
      const { x, y } = this.getGuardPixelPosition(guard.index);
      guard.x = x;
      guard.y = y;
      guard.range = rangeBase;

      guard.body.setPosition(x, y);
      guard.earLeft.setPosition(x - 14, y - 23);
      guard.earRight.setPosition(x + 14, y - 23);
    }
  }

  createHUD() {
    this.hudPanel = this.add
      .rectangle(0, 0, 610, 58, 0x17130f, 0.88)
      .setStrokeStyle(2, 0xd6b66f, 0.45)
      .setDepth(30);

    this.coinText = this.add
      .text(0, 0, "", this.hudStyle())
      .setOrigin(0, 0.5)
      .setDepth(31);

    this.hpText = this.add
      .text(0, 0, "", this.hudStyle())
      .setOrigin(0, 0.5)
      .setDepth(31);

    this.waveText = this.add
      .text(0, 0, "", this.hudStyle())
      .setOrigin(0, 0.5)
      .setDepth(31);

    this.startButton = this.add
      .rectangle(0, 0, 182, 54, 0x9d4f28, 0.96)
      .setStrokeStyle(3, 0xffd78a, 0.85)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.startButtonLabel = this.add
      .text(0, 0, "START WAVE", {
        fontFamily: "system-ui",
        fontSize: "20px",
        fontStyle: "800",
        color: "#fff5d9"
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.startButton.on("pointerdown", async () => {
      await this.tryEnterFullscreen();
      if (!this.waveRunning) this.startWave();
    });

    this.refreshHUD();
  }

  positionHUD() {
    const { vw, vh } = this.metrics;

    this.hudPanel.setPosition(vw / 2, 38);
    this.coinText.setPosition(vw / 2 - 245, 38);
    this.hpText.setPosition(vw / 2 - 50, 38);
    this.waveText.setPosition(vw / 2 + 120, 38);

    this.startButton.setPosition(vw - 118, vh - 52);
    this.startButtonLabel.setPosition(vw - 118, vh - 52);
  }

  async tryEnterFullscreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {
      // Mobile browser support varies; the game still works without this.
    }
  }

  hudStyle() {
    return {
      fontFamily: "system-ui",
      fontSize: "19px",
      fontStyle: "700",
      color: "#fff4d1"
    };
  }

  refreshHUD() {
    this.coinText.setText(`TREATS  ${this.coins}`);
    this.hpText.setText(`HOME  ${this.homeHP}`);
    this.waveText.setText(`WAVE  ${this.wave}`);
  }

  getPathPixels() {
    return STAGE_1.path.map(([x, y]) => this.mapPoint(x, y));
  }

  startWave() {
    this.waveRunning = true;
    const count = 6 + (this.wave - 1) * 2;
    this.enemiesAlive = count;

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(
        i * STAGE_1.pacing.spawnIntervalMs,
        () => this.spawnCat()
      );
    }
  }

  spawnCat() {
    const pts = this.getPathPixels();

    const cat = this.add
      .circle(pts[0].x, pts[0].y, 17, 0x71503c, 1)
      .setStrokeStyle(4, 0x2a1912, 1)
      .setDepth(15);

    cat.hp = 45 + this.wave * 9;
    cat.pathIndex = 0;
    cat.speed =
      STAGE_1.pacing.baseEnemySpeed * this.metrics.coverScale +
      this.wave * STAGE_1.pacing.waveSpeedStep * this.metrics.coverScale;
    cat.dead = false;
    cat.path = pts;

    const earA = this.add
      .triangle(cat.x - 10, cat.y - 16, 0, 14, 8, 0, 16, 14, 0x71503c, 1)
      .setDepth(14);

    const earB = this.add
      .triangle(cat.x + 10, cat.y - 16, 0, 14, 8, 0, 16, 14, 0x71503c, 1)
      .setDepth(14);

    cat.ears = [earA, earB];

    this.physics.world.enable(cat);
    cat.body.setCircle(17);
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

    this.enemies = this.enemies.filter((enemy) => enemy && !enemy.destroyed);
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

    if (dist < 4) {
      cat.pathIndex++;
      return;
    }

    const step = Math.min(cat.speed * dt, dist);
    cat.x += (dx / dist) * step;
    cat.y += (dy / dist) * step;

    cat.body.reset(cat.x, cat.y);
    cat.ears[0].setPosition(cat.x - 10, cat.y - 16);
    cat.ears[1].setPosition(cat.x + 10, cat.y - 16);
  }

  findTarget(guard) {
    let best = null;
    let bestProgress = -1;

    for (const cat of this.enemies) {
      if (!cat || cat.dead) continue;

      const distance = Phaser.Math.Distance.Between(
        guard.x,
        guard.y,
        cat.x,
        cat.y
      );

      if (distance <= guard.range && cat.pathIndex > bestProgress) {
        best = cat;
        bestProgress = cat.pathIndex;
      }
    }

    return best;
  }

  fireShot(guard, target) {
    const shot = this.add
      .circle(guard.x, guard.y, 7, 0xffe36e, 1)
      .setDepth(18);

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
    cat.ears.forEach((ear) => ear.destroy());
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
    cat.ears.forEach((ear) => ear.destroy());
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
    const { vw, vh } = this.metrics;

    const message = this.add
      .text(vw / 2, vh - 112, text, {
        fontFamily: "system-ui",
        fontSize: "23px",
        fontStyle: "800",
        color: "#fff4d1",
        backgroundColor: "#2b2016cc",
        padding: { x: 18, y: 10 }
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: vh - 138,
      duration: 1300,
      delay: 650,
      onComplete: () => message.destroy()
    });
  }
}
