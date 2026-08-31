import { Stage1Scene } from "./scenes/Stage1Scene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1600,
  height: 900,
  backgroundColor: "#14130f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scene: [Stage1Scene]
};

new Phaser.Game(config);
