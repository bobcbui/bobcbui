// Minimal UI bridge to decouple DOM operations from game logic
export function showBreakthrough(nextName, btCost, chance) {
  const title = document.getElementById('btTitle');
  const desc = document.getElementById('btDesc');
  const ch = document.getElementById('btChance');
  const box = document.getElementById('breakthrough-box');
  const overlay = document.getElementById('breakthrough-overlay');
  if (title) title.textContent = '突破至 ' + nextName + '!';
  if (desc) desc.textContent = '天劫将至，引雷淬体！ 消耗 '+btCost+' 灵石';
  if (ch) ch.textContent = chance + '%';
  if (ch) ch.style.color = chance>=70 ? 'var(--gold)' : 'var(--hp)';
  if (box) box.classList.remove('hidden');
  if (overlay) overlay.classList.add('show');
}

export function hideBreakthrough() {
  const box = document.getElementById('breakthrough-box');
  const overlay = document.getElementById('breakthrough-overlay');
  if (box) box.classList.add('hidden');
  if (overlay) overlay.classList.remove('show');
}

export function showSaveNotification() {
  const n = document.getElementById('saveNotif');
  if (!n) return;
  n.style.opacity = '1';
  setTimeout(() => { n.style.opacity = '0'; }, 1200);
}

export function showStatus(text, dur) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  // duration handled elsewhere; keep simple
}

export function showLoot(text) {
  const el = document.getElementById('loot-popup');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
}

export function addClass(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add(cls);
}

export function removeClass(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove(cls);
}

export function downloadJSON(jsonString, filename) {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) { return false; }
}

export function openFilePicker(onTextLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onTextLoaded && onTextLoaded(reader.result);
    };
    reader.readAsText(file);
  };
  input.click();
}

export function confirmPrompt(message) {
  return confirm(message);
}
