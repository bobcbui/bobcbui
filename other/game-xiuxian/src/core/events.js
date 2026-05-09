const listeners = {};

export const bus = {
  on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
  },
  off(event, fn) {
    const arr = listeners[event];
    if (arr) { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
  },
  emit(event, ...args) {
    (listeners[event] || []).forEach(fn => fn(...args));
  }
};
