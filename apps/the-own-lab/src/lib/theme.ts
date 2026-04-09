export const THEME_STORAGE_KEY = "the-own-lab-theme";

export const themeInitScript = `(function() {
  const key = "${THEME_STORAGE_KEY}";
  const root = document.documentElement;
  const stored = window.localStorage.getItem(key);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
})();`;
