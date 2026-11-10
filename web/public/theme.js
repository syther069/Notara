// Runs before first paint: light or dark, from the visitor's saved choice or their system setting.
// A file (not an inline script) so the Content-Security-Policy can forbid inline scripts.
(function () {
  var t = null;
  try {
    t = localStorage.getItem("theme");
  } catch (e) {}
  if (t !== "light" && t !== "dark") t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = t;
})();
