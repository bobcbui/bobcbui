import { G } from '../core/state.js';
import { SKILL_DEFS } from '../data/skills.js';
import { getSkillCooldowns } from '../core/runtime.js';

export function updateSkillCooldowns() {
  const cooldowns = getSkillCooldowns();
  for (const skill of SKILL_DEFS) {
    const cd = cooldowns[skill.id] || 0;
    const cdEl = document.getElementById('cd-' + skill.id);
    const btn = document.getElementById('skill-' + skill.id);
    if (cdEl) {
      if (cd > 0) {
        cdEl.textContent = cd.toFixed(1) + 's';
        cdEl.style.display = 'block';
        if (btn) btn.classList.add('on-cooldown');
      } else {
        cdEl.textContent = '';
        cdEl.style.display = 'none';
        if (btn) btn.classList.remove('on-cooldown');
      }
    }
  }
}

export function getSkillLevel(skillId) {
  return G.skillLevels?.[skillId] || 1;
}
