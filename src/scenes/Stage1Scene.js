import { STAGE_1 } from "../data/stage1.js";

const SRC_W = STAGE_1.canvas.width;
const SRC_H = STAGE_1.canvas.height;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class Stage1Scene extends Phaser.Scene {
  constructor() {
    super("stage1");
    this.coins = STAGE_1.startingTreats;
    this.homeHP = STAGE_1.startingHomeHP;
    this.wave = 1;
    this.waveRunning = false;
    this.guardians = new Map();
    this.guardSpotViews = [];
    this.enemies = [];
    this.enemiesAlive = 0;
  }

  preload() {
    this.load.image("bg-day", STAGE_1.backgrounds.day);
    this.load.image("bg-night", STAGE_1.backgrounds.night);
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    const requestedTime = params.get("time");
    this.timeOfDay =
      requestedTime === "night" || requestedTime === "day"
        ? requestedTime
        : STAGE_1.defaultTimeOfDay;

    const bgKey = this.timeOfDay === "night" ? "bg-night" : "bg-day";

    this.background = this.add.image(0, 0, bgKey).setOrigin(0.5).setDepth(0);
    this.pathGraphics = this.add.graphics().setDepth(5);

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

    return { vw, vh, coverScale, displayW, displayH, offsetX, offsetY };
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

    this.visual = {
      spotRadius: clamp(vh * 0.042, 18, 28),
      spotFont: clamp(vh * 0.030, 13, 18),
      pathWidth: clamp(vh * 0.006, 3, 5),
      markerRadius: clamp(vh * 0.014, 7, 10),
      unitRadius: clamp(vh * 0.036, 16, 22)
    };

    this.drawDebugPath();
    this.positionGuardSpots();
    this.positionGuardians();
    this.positionHUD();
  }

  drawDebugPath() {
    const g = this.pathGraphics;
    g.clear();

    const pts = STAGE_1.path.map(([x, y]) => this.mapPoint(x, y));
    g.lineStyle(this.visual.pathWidth, 0xffdc72, 0.68);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();

    g.fillStyle(0xd84735, 0.94);
    g.fillCircle(pts[0].x, pts[0].y, this.visual.markerRadius);

    const goal = pts[pts.length - 1];
    g.fillStyle(0x64c078, 0.94);
    g.fillCircle(goal.x, goal.y, this.visual.markerRadius);
  }

  createGuardSpots() {
    STAGE_1.guardSpots.forEach((_, index) => {
      const spot = this.add.circle(0, 0, 18, 0x238b6c, 0.65)
        .setStrokeStyle(3, 0xe2fff0, 0.96)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, `${index + 1}`, {
        fontFamily: "system-ui",
        fontSize: "16px",
        fontStyle: "800",
        color: "#ffffff"
      }).setOrigin(0.5).setDepth(11);

      const click = () => this.placeGuardian(index, spot, label);
      spot.on("pointerdown", click);
      spot.on("pointerup", click);

      this.guardSpotViews.push({ spot, label });
    });
  }

  positionGuardSpots() {
    STAGE_1.guardSpots.forEach(([nx, ny], index) => {
      const { x, y } = this.mapPoint(nx, ny);
      const view = this.guardSpotViews[index];
      view.spot
        .setPosition(x, y)
        .setRadius(this.visual.spotRadius)
        .setStrokeStyle(clamp(this.visual.spotRadius * 0.12, 2, 3), 0xe2fff0, 0.96);
      view.label
        .setPosition(x, y)
        .setFontSize(this.visual.spotFont);
    });
  }

  createHUD() {
    this.hudPanel = this.add.rectangle(0, 0, 1, 1, 0x111722, 0.82)
      .setStrokeStyle(2, 0xe6c679, 0.45)
      .setDepth(30);

    this.coinText = this.add.text(0, 0, "", this.hudStyle())
      .setOrigin(0.5).setDepth(31);

    this.hpText = this.add.text(0, 0, "", this.hudStyle())
      .setOrigin(0.5).setDepth(31);

    this.waveText = this.add.text(0, 0, "", this.hudStyle())
      .setOrigin(0.5).setDepth(31);

    this.stageText = this.add.text(0, 0, "", {
      fontFamily: "system-ui",
      fontSize: "14px",
      fontStyle: "800",
      color: "#fff6d7",
      stroke: "#2b2016",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(31);

    this.startButton = this.add.rectangle(0, 0, 1, 1, 0x9d4f28, 0.96)
      .setStrokeStyle(3, 0xffd78a, 0.86)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.startButtonLabel = this.add.text(0, 0, "START WAVE", {
      fontFamily: "system-ui",
      fontSize: "16px",
      fontStyle: "800",
      color: "#fff5d9"
    }).setOrigin(0.5).setDepth(31);

    this.startButton.on("pointerdown", () => this.onStartWave());
    this.startButton.on("pointerup", () => this.onStartWave());

    this.refreshHUD();
  }

  positionHUD() {
    const { vw, vh } = this.metrics;
    const topPad = clamp(vh * 0.045, 18, 30);
    const hudH = clamp(vh * 0.07, 38, 54);
    const hudW = clamp(vw * 0.42, 290, 500);
    const stageY = topPad + hudH + 18;

    this.hudPanel.setPosition(vw / 2, topPad).setSize(hudW, hudH);

    const textSize = clamp(vh * 0.028, 13, 18);
    this.coinText.setPosition(vw / 2 - hudW * 0.31, topPad).setFontSize(textSize);
    this.hpText.setPosition(vw / 2, topPad).setFontSize(textSize);
    this.waveText.setPosition(vw / 2 + hudW * 0.31, topPad).setFontSize(textSize);

    this.stageText
      .setPosition(vw / 2, stageY)
      .setFontSize(clamp(vh * 0.024, 12, 18))
      .setText(`STAGE 1 • FRONT GARDEN • ${this.timeOfDay.toUpperCase()}`);

    const btnW = clamp(vw * 0.16, 120, 170);
    const btnH = clamp(vh * 0.08, 40, 50);
    const marginX = clamp(vw * 0.04, 14, 24);
    const marginY = clamp(vh * 0.05, 16, 24);

    this.startButton
      .setPosition(vw - marginX - btnW / 2, vh - marginY - btnH / 2)
      .setSize(btnW, btnH);

    this.startButtonLabel
      .setPosition(this.startButton.x, this.startButton.y)
      .setFontSize(clamp(btnH * 0.36, 13, 16));
  }

  hudStyle() {
    return {
      fontFamily: "system-ui",
      fontSize: "15px",
      fontStyle: "700",
      color: "#fff4d1"
    };
  }

  refreshHUD() {
    if (!this.coinText) return;
    this.coinText.setText(`TREATS ${this.coins}`);
    this.hpText.setText(`HOME ${this.homeHP}`);
    this.waveText.setText(`WAVE ${this.wave}`);
  }

  getGuardPixelPosition(index) {
    const [nx, ny] = STAGE_1.guardSpots[index];
    return this.mapPoint(nx, ny);
  }

  placeGuardian(index, spot, label) {
    if (this.guardians.has(index)) return;

    const cost = 100;
    if (this.coins < cost) {
      this.flashMessage("Not enough treats!");
      return;
    }

    this.coins -= cost;

    const { x, y } = this.getGuardPixelPosition(index);
    const r = this.visual.unitRadius;

    const body = this.add.circle(x, y, r, 0xf4e6c9, 1)
      .setStrokeStyle(4, 0x4a3022, 1)
      .setDepth(13);

    const earLeft = this.add.triangle(0, 0, 0, 13, 7, 0, 14, 13, 0x4a3022, 1).setDepth(12);
    const earRight = this.add.triangle(0, 0, 0, 13, 7, 0, 14, 13, 0x4a3022, 1).setDepth(12);

    this.guardians.set(index, { index, nextShot: 0, range: 0, body, earLeft, earRight });

    spot.disableInteractive().setFillStyle(0x397a48, 0.22);
    label.setVisible(false);

    this.positionGuardians();
    this.refreshHUD();
  }

  positionGuardians() {
    const unitR = this.visual.unitRadius;
    const rangeBase = 150 * this.metrics.coverScale;

    for (const guard of this.guardians.values()) {
      const { x, y } = this.getGuardPixelPosition(guard.index);
      guard.x = x;
      guard.y = y;
      guard.range = rangeBase;

      guard.body.setPosition(x, y).setRadius(unitR);
      guard.earLeft.setPosition(x - unitR * 0.55, y - unitR * 0.9).setScale(unitR / 18);
      guard.earRight.setPosition(x + unitR * 0.55, y - unitR * 0.9).setScale(unitR / 18);
    }
  }

  async onStartWave() {
    await this.tryEnterFullscreen();
    if (!this.waveRunning) this.startWave();
  }

  async tryEnterFullscreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {}
  }

  getPathPixels() {
    return STAGE_1.path.map(([x, y]) => this.mapPoint(x, y));
  }

  startWave() {
    this.waveRunning = true;
    const count = 6 + (this.wave - 1) * 2;
    this.enemiesAlive = count;

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * STAGE_1.pacing.spawnIntervalMs, () => this.spawnCat());
    }
  }

  spawnCat() {
    const pts = this.getPathPixels();
    const radius = clamp(16 * this.metrics.coverScale, 10, 16);

    const cat = this.add.circle(pts[0].x, pts[0].y, radius, 0x71503c, 1)
      .setStrokeStyle(clamp(3 * this.metrics.coverScale, 2, 3), 0x2a1912, 1)
      .setDepth(15);

    cat.hp = 45 + this.wave * 9;
    cat.pathIndex = 0;
    cat.speed =
      STAGE_1.pacing.baseEnemySpeed * this.metrics.coverScale +
      this.wave * STAGE_1.pacing.waveSpeedStep * this.metrics.coverScale;
    cat.dead = false;
    cat.path = pts;
    cat.radius = radius;

    const earA = this.add.triangle(0, 0, 0, 12, 7, 0, 14, 12, 0x71503c, 1).setDepth(14);
    const earB = this.add.triangle(0, 0, 0, 12, 7, 0, 14, 12, 0x71503c, 1).setDepth(14);
    cat.ears = [earA, earB];
    this.positionCatEars(cat);

    this.physics.add.existing(cat);
    cat.body.setAllowGravity(false);
    cat.body.setImmovable(true);

    this.enemies.push(cat);
  }

  positionCatEars(cat) {
    const r = cat.radius;
    cat.ears[0].setPosition(cat.x - r * 0.58, cat.y - r * 0.88).setScale(r / 17);
    cat.ears[1].setPosition(cat.x + r * 0.58, cat.y - r * 0.88).setScale(r / 17);
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

    if (cat.body) cat.body.reset(cat.x, cat.y);
    this.positionCatEars(cat);
  }

  findTarget(guard) {
    let best = null;
    let bestProgress = -1;

    for (const cat of this.enemies) {
      if (!cat || cat.dead) continue;
      const distance = Phaser.Math.Distance.Between(guard.x, guard.y, cat.x, cat.y);
      if (distance <= guard.range && cat.pathIndex > bestProgress) {
        best = cat;
        bestProgress = cat.pathIndex;
      }
    }
    return best;
  }

  fireShot(guard, target) {
    const shot = this.add.circle(guard.x, guard.y, clamp(6 * this.metrics.coverScale, 4, 6), 0xffe36e, 1)
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
      this.flashMessage("HOME OVERRUN");
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
    const message = this.add.text(vw / 2, vh - 96, text, {
      fontFamily: "system-ui",
      fontSize: `${clamp(vh * 0.026, 13, 18)}px`,
      fontStyle: "800",
      color: "#fff4d1",
      backgroundColor: "#142033dd",
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 22,
      duration: 1000,
      delay: 600,
      onComplete: () => message.destroy()
    });
  }
}
