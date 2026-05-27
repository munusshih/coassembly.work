// Hamburger nav toggle.
// Markup lives in src/components/Nav.astro.

const toggle = document.getElementById("nav-toggle");
const menu = document.getElementById("nav-menu");

if (toggle && menu) {
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
  };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}
