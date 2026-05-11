export function bindGlobalActions() {
  window._pickCard = function(index) {
    const cards = window._pendingCards;
    if (!cards || !cards[index]) return;

    const overlay = document.getElementById('cardDrawOverlay');
    if (overlay) overlay.classList.add('hidden');

    const scene = window._scene;
    if (scene) {
      scene.onCardChosen(cards[index]);
    }
  };

  window._restartGame = function() {
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) overlay.classList.add('hidden');

    const scene = window._scene;
    if (scene) scene.restartGame();
  };

  window._nextStage = function() {
    const overlay = document.getElementById('stageOverlay');
    if (overlay) overlay.classList.add('hidden');

    const scene = window._scene;
    if (scene) scene.startNextStage();
  };
}
