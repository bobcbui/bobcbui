/* DOM 元素缓存：避免重复查询 */

const elementCache = new Map();

export function getEl(id) {
  if (!id) return null;
  const cached = elementCache.get(id);
  if (cached && cached.isConnected) return cached;
  const el = document.getElementById(id);
  if (el) elementCache.set(id, el);
  return el;
}
