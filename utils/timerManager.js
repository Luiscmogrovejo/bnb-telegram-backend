// File: utils/timerManager.js
// Utility to manage timers with robust cleanup
timerManager = {
  timers: new Map(),

  setTimer(roomId, callback, delay) {
    if (this.timers.has(roomId)) {
      clearTimeout(this.timers.get(roomId));
    }
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(roomId);
    }, delay);
    this.timers.set(roomId, timer);
  },

  clearTimer(roomId) {
    if (this.timers.has(roomId)) {
      clearTimeout(this.timers.get(roomId));
      this.timers.delete(roomId);
    }
  },

  clearAllTimers() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  },
};

module.exports = timerManager;
