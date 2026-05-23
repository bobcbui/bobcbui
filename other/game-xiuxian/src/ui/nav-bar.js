export function mountTopNav(container, actions) {
  if (!container) return;

  const navBar = document.createElement('div');
  navBar.id = 'top-nav';
  navBar.className = 'top-nav';

  const items = [
    ['角色', 'btn-gold', actions.toggleCharPanel],
    ['背包', 'btn-sec', actions.toggleBagPanel],
    ['技能', 'btn-sec', actions.toggleSkillPanel],
    ['玩法', 'btn-gold', actions.toggleGameplayPanel],
    ['成就', 'btn-sec', actions.toggleAchPanel],
    ['百宝阁', 'btn-gold', actions.toggleShopPanel],
    ['设置', 'btn-sec', actions.toggleSettingsPanel]
  ];

  for (const [label, tone, onClick] of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-sm ${tone}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    navBar.appendChild(button);
  }

  container.appendChild(navBar);
}
