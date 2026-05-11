export function bindGlobalActions() {
  window._gameUpgrade = function(upgradeId) {
    const { G, recalcStats } = window._stateModule;
    const currentLv = G.upgradeLevels[upgradeId] || 0;
    const { UPGRADE_DEFS, getUpgradeCost } = window._dataModule;
    const def = UPGRADE_DEFS.find(u => u.id === upgradeId);
    if (!def || currentLv >= def.maxLevel) return;
    const cost = getUpgradeCost(upgradeId, currentLv);
    if (G.gold < cost) return;
    G.gold -= cost;
    G.upgradeLevels[upgradeId] = currentLv + 1;
    recalcStats();
    const { renderHUD, renderUpgradePanel } = window._uiModule;
    renderHUD();
    renderUpgradePanel();
  };

  window._startNextWave = function() {
    const scene = window._scene;
    if (scene) {
      const panel = document.getElementById('upgrade-panel');
      if (panel) panel.classList.add('hidden');
      scene.startNextWave();
      const { renderHUD, renderSkillBar } = window._uiModule;
      renderHUD();
      renderSkillBar();
    }
  };

  window._restartGame = function() {
    const scene = window._scene;
    if (scene) {
      const panel = document.getElementById('gameover-panel');
      if (panel) panel.classList.add('hidden');
      scene.restartGame();
      const { renderHUD, renderSkillBar, renderUpgradePanel } = window._uiModule;
      renderHUD();
      renderSkillBar();
      const up = document.getElementById('upgrade-panel');
      if (up) up.classList.add('hidden');
    }
  };
}
