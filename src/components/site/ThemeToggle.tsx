import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type ThemeMode = "light" | "dark";

function getResolvedTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => {
      const nextTheme = getResolvedTheme();
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };

    sync();

    const onMediaChange = () => {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored !== "light" && stored !== "dark") sync();
    };

    media.addEventListener("change", onMediaChange);
    window.addEventListener("storage", sync);

    return () => {
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "dark" ? "☼" : "◐"}
      </span>
      <span className="theme-toggle-label">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
