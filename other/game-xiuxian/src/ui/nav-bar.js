export function mountTopNav(container, actions) {
  if (!container) return;

  const navBar = document.getElementById('top-nav');
  if (navBar) navBar.remove();

  const newNav = document.createElement('div');
  newNav.id = 'top-nav';
  newNav.className = 'top-nav';

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
    newNav.appendChild(button);
  }

  container.appendChild(newNav);
}

export function mountBottomNav(actions) {
  const cont = document.getElementById('bottom-nav');
  if (!cont) return;
  cont.innerHTML = '';

  const items = [
    ['🧑', '角色', actions.toggleCharPanel],
    ['🎒', '背包', actions.toggleBagPanel],
    ['📖', '技能', actions.toggleSkillPanel],
    ['🎮', '玩法', actions.toggleGameplayPanel],
    ['🏅', '成就', actions.toggleAchPanel],
    ['🏪', '商店', actions.toggleShopPanel],
    ['⚙️', '设置', actions.toggleSettingsPanel]
  ];

  for (const [icon, label, onClick] of items) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.innerHTML = `<span class="tab-icon">${icon}</span><span class="tab-label">${label}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    cont.appendChild(btn);
  }
}