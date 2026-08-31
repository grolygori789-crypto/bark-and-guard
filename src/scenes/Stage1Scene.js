import { STAGE_1 } from "../data/stage1.js";

const SRC_W = STAGE_1.canvas.width;
const SRC_H = STAGE_1.canvas.height;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

    const backgroundKey = `stage1-bg-${this.timeOfDay}`;

    // Decorative full-viewport backdrop. This fills ultra-wide phones without
    // black bars, while the real 16:9 gameplay board remains fully visible.
    this.backdrop = this.add
      .image(0, 0, backgroundKey)
      .setOrigin(0.5)
      .setDepth(-3)
      .setTint(0x70839a);

    this.backdropShade = this.add
      .rectangle(0, 0, 1, 1, 0x061426, 0.43)
      .setOrigin(0.5)
      .setDepth(-2);

    // Canonical 16:9 gameplay board. Never crop this layer.
    this.background = this.add
      .image(0, 0, backgroundKey)
      .setOrigin(0.5)
      .setDepth(0);

    this.boardShadow = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.16)
      .setOrigin(0.5)
      .setDepth(-1);

    this.pathGraphics = this.add.graphics().setDepth(5);

    this.stageLabel = this.add
      .text(0, 0, "", {
        fontFamily: "system-ui",
        fontSize: "14px",
        fontStyle: "700",
        color: "#fff7df",
        stroke: "#22190f",
        strokeThickness: 3
      })
      .setOrigin(0, 0.5)
      .setDepth(20);

    this.createGuardSpots();
    this.createHUD();
    this.refreshLayout();

    this.scale.on("resize", this.refreshLayout, this);
  }

  getMetrics() {
    const vw = this.scale.width;
    const vh = this.scale.height;

    // FIT keeps every pixel of the 16:9 gameplay board visible.
    const boardScale = Math.min(vw / SRC_W, vh / SRC_H);
    const boardW = SRC_W * boardScale;
    const boardH = SRC_H * boardScale;
    const boardX = (vw - boardW) / 2;
    const boardY = (vh - boardH) / 2;

    // COVER is only used for the decorative backdrop behind the board.
    const backdropScale = Math.max(vw / SRC_W, vh / SRC_H);
    const backdropW = SRC_W * backdropScale;
    const backdropH = SRC_H * backdropScale;

    return {
      vw,
      vh,
      boardScale,
      boardW,
      boardH,
      boardX,
      boardY,
      backdropW,
      backdropH
    };
  }

  mapPoint(nx, ny) {
    const m = this.metrics;
    return {
      x: m.boardX + nx * m.boardW,
      y: m.boardY + ny * m.boardH
    };
  }

  refreshLayout() {
    this.metrics = this.getMetrics();

    const {
      vw,
      vh,
      boardW,
      boardH,
      boardX,
      boardY,
      backdropW,
      backdropH
    } = this.metrics;

    this.backdrop
      .setPosition(vw / 2, vh / 2)
      .setDisplaySize(backdropW, backdropH);

    this.backdropShade
      .setPosition(vw / 2, vh / 2)
      .setSize(vw, vh);

    this.boardShadow
      .setPosition(vw / 2, vh / 2 + 2)
      .setSize(boardW + 12, boardH + 12);

    this.background
      .setPosition(vw / 2, vh / 2)
      .setDisplaySize(boardW, boardH);

    this.visual = {
      spotRadius: clamp(boardH * 0.026, 13, 19),
      spotFont: clamp(boardH * 0.025, 12, 17),
      pathWidth: clamp(boardH * 0.004, 2, 3.2),
      markerRadius: clamp(boardH * 0.013, 6, 9),
      unitRadius: clamp(boardH * 0.023, 12, 18)
    };

    this.drawDebugPath();
    this.positionGuardSpots();
    this.positionGuardians();
    this.positionHUD();

    const safeInset = clamp(boardH * 0.018, 8, 14);
    this.stageLabel
      .setPosition(boardX + safeInset, boardY + safeInset + 8)
      .setFontSize(clamp(boardH * 0.022, 11, 15))
      .setText(`STAGE 1  •  ${this.timeOfDay.toUpperCase()}`);
  }

  drawDebugPath() {
    const g = this.pathGraphics;
    g.clear();

    const pts = STAGE_1.path.map(([x, y]) => this.mapPoint(x, y));

    g.lineStyle(this.visual.pathWidth, 0xffdc72, 0.72);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }

    g.strokePath();

    g.fillStyle(0xd84735, 0.94);
    g.fillCircle(pts[0].x, pts[0].y, this.visual.markerRadius);

    const goal = pts[pts.length - 1];
    g.fillStyle(0x64c078, 0.94);
    g.fillCircle(goal.x, goal.y, this.visual.markerRadius);
  }

  createGuardSpots() {
    STAGE_1.guardSpots.forEach((_, index) => {
      const spot = this.add
        .circle(0, 0, 16, 0x238b6c, 0.68)
        .setStrokeStyle(2, 0xe2fff0, 0.94)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(0, 0, `${index + 1}`, {
          fontFamily: "system-ui",
          fontSize: "14px",
          fontStyle: "800",
          color: "#ffffff"
        })
        .setOrigin(0.5)
        .setDepth(11);

      spot.on("pointerdown", () =>
        this.placePlaceholderGuardian(index, spot, label)
      );

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
        .setStrokeStyle(
          clamp(this.metrics.boardScale * 2.4, 1.4, 2.4),
          0xe2fff0,
          0.94
        );

      view.label
        .setPosition(x, y)
        .setFontSize(this.visual.spotFont);
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
      .circle(x, y, this.visual.unitRadius, 0xf4e6c9, 1)
      .setStrokeStyle(3, 0x4a3022, 1)
      .setDepth(13);

    const earLeft = this.add
      .triangle(0, 0, 0, 13, 7, 0, 14, 13, 0x4a3022, 1)
      .setDepth(12);

    const earRight = this.add
      .triangle(0, 0, 0, 13, 7, 0, 14, 13, 0x4a3022, 1)
      .setDepth(12);

    this.guardians.set(index, {
      index,
      nextShot: 0,
      range: 0,
      body,
      earLeft,
      earRight
    });

    spot.setFillStyle(0x397a48, 0.22).disableInteractive();
    label.setVisible(false);

    this.positionGuardians();
    this.refreshHUD();
  }

  positionGuardians() {
    const unitR = this.visual.unitRadius;
    const rangeBase = 150 * this.metrics.boardScale;

    for (const guard of this.guardians.values()) {
      const { x, y } = this.getGuardPixelPosition(guard.index);

      guard.x = x;
      guard.y = y;
      guard.range = rangeBase;

      guard.body
        .setPosition(x, y)
        .setRadius(unitR);

      guard.earLeft
        .setPosition(x - unitR * 0.55, y - unitR * 0.9)
        .setScale(unitR / 18);

      guard.earRight
        .setPosition(x + unitR * 0.55, y - unitR * 0.9)
        .setScale(unitR / 18);
    }
  }

  createHUD() {
    this.hudPanel = this.add
      .rectangle(0, 0, 1, 1, 0x111722, 0.86)
      .setStrokeStyle(1.5, 0xe6c679, 0.5)
      .setDepth(30);

    this.coinText = this.add
      .text(0, 0, "", this.hudStyle())
      .setOrigin(0.5)
      .setDepth(31);

    this.hpText = this.add
      .text(0, 0, "", this.hudStyle())
      .setOrigin(0.5)
      .setDepth(31);

    this.waveText = this.add
      .text(0, 0, "", this.hudStyle())
      .setOrigin(0.5)
      .setDepth(31);

    this.startButton = this.add
      .rectangle(0, 0, 1, 1, 0x9d4f28, 0.94)
      .setStrokeStyle(2, 0xffd78a, 0.82)
      .setDepth(30)
      .setInteractive({ useHandCursor: true });

    this.startButtonLabel = this.add
      .text(0, 0, "START WAVE", {
        fontFamily: "system-ui",
        fontSize: "15px",
        fontStyle: "800",
        color: "#fff5d9"
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.startButton.on("pointerdown", async () => {
      await this.tryEnterFullscreen();

      if (!this.waveRunning) {
        this.startWave();
      }
    });

    this.refreshHUD();
  }

  positionHUD() {
    const { vw, vh, boardW, boardH, boardX, boardY } = this.metrics;

    const hudH = clamp(boardH * 0.072, 38, 48);
    const hudW = clamp(boardW * 0.48, 360, 540);
    const hudY = boardY + hudH * 0.64;

    const textSize = clamp(boardH * 0.024, 12, 16);

    this.hudPanel
      .setPosition(vw / 2, hudY)
      .setSize(hudW, hudH);

    this.coinText
      .setPosition(vw / 2 - hudW * 0.31, hudY)
      .setFontSize(textSize);

    this.hpText
      .setPosition(vw / 2, hudY)
      .setFontSize(textSize);

    this.waveText
      .setPosition(vw / 2 + hudW * 0.31, hudY)
      .setFontSize(textSize);

    const buttonW = clamp(boardW * 0.13, 112, 154);
    const buttonH = clamp(boardH * 0.064, 36, 44);
    const margin = clamp(boardH * 0.025, 12, 18);

    this.startButton
      .setPosition(
        boardX + boardW - margin - buttonW / 2,
        boardY + boardH - margin - buttonH / 2
      )
      .setSize(buttonW, buttonH);

    this.startButtonLabel
      .setPosition(this.startButton.x, this.startButton.y)
      .setFontSize(clamp(buttonH * 0.36, 12, 15));
  }

  async tryEnterFullscreen() {
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen();
      }

      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (_) {
      // Installed PWA and some mobile browsers already manage fullscreen.
    }
  }

  hudStyle() {
    return {
      fontFamily: "system-ui",
      fontSize: "14px",
      fontStyle: "700",
      color: "#fff4d1"
    };
  }

  refreshHUD() {
    if (!this.coinText) return;

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
    const radius = clamp(17 * this.metrics.boardScale, 10, 16);

    const cat = this.add
      .circle(pts[0].x, pts[0].y, radius, 0x71503c, 1)
      .setStrokeStyle(clamp(3 * this.metrics.boardScale, 1.5, 3), 0x2a1912, 1)
      .setDepth(15);

    cat.hp = 45 + this.wave * 9;
    cat.pathIndex = 0;
    cat.speed =
      STAGE_1.pacing.baseEnemySpeed * this.metrics.boardScale +
      this.wave *
        STAGE_1.pacing.waveSpeedStep *
        this.metrics.boardScale;
    cat.dead = false;
    cat.path = pts;
    cat.radius = radius;

    const earA = this.add
      .triangle(0, 0, 0, 12, 7, 0, 14, 12, 0x71503c, 1)
      .setDepth(14);

    const earB = this.add
      .triangle(0, 0, 0, 12, 7, 0, 14, 12, 0x71503c, 1)
      .setDepth(14);

    cat.ears = [earA, earB];
    this.positionCatEars(cat);

    this.physics.world.enable(cat);
    cat.body.setCircle(radius);
    cat.body.setAllowGravity(false);

    this.enemies.push(cat);
  }

  positionCatEars(cat) {
    const r = cat.radius;

    cat.ears[0]
      .setPosition(cat.x - r * 0.58, cat.y - r * 0.88)
      .setScale(r / 17);

    cat.ears[1]
      .setPosition(cat.x + r * 0.58, cat.y - r * 0.88)
      .setScale(r / 17);
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

    this.enemies = this.enemies.filter(
      (enemy) => enemy && !enemy.destroyed
    );
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
    this.positionCatEars(cat);
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

      if (
        distance <= guard.range &&
        cat.pathIndex > bestProgress
      ) {
        best = cat;
        bestProgress = cat.pathIndex;
      }
    }

    return best;
  }

  fireShot(guard, target) {
    const radius = clamp(6 * this.metrics.boardScale, 3.5, 6);

    const shot = this.add
      .circle(guard.x, guard.y, radius, 0xffe36e, 1)
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

        if (target.hp <= 0) {
          this.killCat(target);
        }
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
    const { vw, boardY, boardH } = this.metrics;

    const message = this.add
      .text(vw / 2, boardY + boardH - 64, text, {
        fontFamily: "system-ui",
        fontSize: `${clamp(boardH * 0.027, 13, 18)}px`,
        fontStyle: "800",
        color: "#fff4d1",
        backgroundColor: "#142033dd",
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5)
      .setDepth(50);

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
