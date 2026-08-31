import { Stage1Scene } from "./scenes/Stage1Scene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scene: [Stage1Scene]
};

new Phaser.Game(config);
