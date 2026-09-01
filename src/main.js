import { Stage1Game } from "./scenes/Stage1Scene.js";

const canvas = document.getElementById("game-canvas");
const game = new Stage1Game(canvas);
window.BarkGuardGame = game;

game.init().catch((error) => {
  console.error("BARK & GUARD failed to start", error);
  const loading = document.getElementById("loading-screen");
  if (loading) {
    loading.querySelector(".loading-title").textContent = "Unable to start";
    loading.querySelector(".loading-subtitle").textContent = "Refresh the page or check the connection.";
  }
});
