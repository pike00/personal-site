document.querySelectorAll(".dark-mode-toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
});
