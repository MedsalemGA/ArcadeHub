"use strict";
(() => {
  const KEY = "arcadehub-theme";
  const root = document.documentElement;

  function getTheme() {
    try {
      const t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") return t;
    } catch (e) { /* ignoré */ }
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-bs-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      const next = theme === "dark" ? "clair" : "sombre";
      btn.textContent = `Mode ${next}`;
      btn.setAttribute("aria-label", `Passer en mode ${next}`);
    }
    document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const theme = root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, theme); } catch (e) { /* ignoré */ }
      applyTheme(theme);
    });
  }

  // Synchronise les autres onglets ouverts
  window.addEventListener("storage", (e) => { if (e.key === KEY) applyTheme(getTheme()); });

  applyTheme(getTheme());
})();