import { boot3DFPSGame } from "./fps-game.js";

boot3DFPSGame().catch((error) => {
  console.error("3D-FPS boot failed:", error);
});
