// Applies the saved theme (or the system preference) before first paint, and wires up the toggle.
(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = '1loom-theme';

  const savedTheme = () => {
    try {
      const value = localStorage.getItem(storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch { return null; }
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#12110e' : '#f6f4ef';
    const button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.title = `Switch to ${next} theme`;
    const label = button.querySelector('[data-theme-label]');
    if (label) label.textContent = next === 'light' ? 'Light' : 'Dark';
  };

  applyTheme(savedTheme() || (preference.matches ? 'dark' : 'light'));

  const initialize = () => {
    applyTheme(root.dataset.theme);
    const button = document.querySelector('[data-theme-toggle]');
    if (button) {
      button.addEventListener('click', () => {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(storageKey, next); } catch { /* Still applies for this page view. */ }
        applyTheme(next);
      });
    }
    preference.addEventListener('change', (event) => {
      if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
