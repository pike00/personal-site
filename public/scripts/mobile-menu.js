const menu = document.getElementById("mobile-menu");
const trigger = document.getElementById("mobile-menu-btn");
const closeButton = document.getElementById("mobile-menu-close");

function setMenuOpen(open, returnFocus = false) {
  menu?.classList.toggle("hidden", !open);
  trigger?.setAttribute("aria-expanded", String(open));

  if (open) closeButton?.focus();
  else if (returnFocus) trigger?.focus();
}

trigger?.addEventListener("click", () => {
  setMenuOpen(menu?.classList.contains("hidden"));
});
closeButton?.addEventListener("click", () => setMenuOpen(false, true));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu && !menu.classList.contains("hidden")) {
    setMenuOpen(false, true);
  }
});
// Dismiss on link click so navigation feels immediate.
menu?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => setMenuOpen(false));
});
