export type Theme = 'light' | 'dark';

const THEME_KEY = 'gestura_theme';

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return 'light';
}

export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}

  const root = document.documentElement;
  const body = document.body;

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    body.classList.add('dark-theme');
  } else {
    root.setAttribute('data-theme', 'light');
    body.classList.remove('dark-theme');
  }

  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
}

export function toggleTheme(): Theme {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
