const menu = document.getElementById("mobile-menu");
document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
  menu?.classList.toggle("hidden");
});
document.getElementById("mobile-menu-close")?.addEventListener("click", () => {
  menu?.classList.add("hidden");
});
// Dismiss on link click so navigation feels immediate.
menu?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => menu.classList.add("hidden"));
});
