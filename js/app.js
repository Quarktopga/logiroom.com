// Load header, footer, sidebar; clock; auth UI toggles; global events

async function loadPartial(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  const res = await fetch(url);
  const html = await res.text();
  el.innerHTML = html;

  // Hook logout buttons
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    const ok = confirm("Confirmer la déconnexion ?");
    if (ok) await signOut();
  });
}

async function setupLayout() {
  await loadPartial("#header", "/shared/header.html");
  await loadPartial("#footer", "/shared/footer.html");

  const session = await getSession();
  // Toggle links based on auth
  document.querySelectorAll(".anon-only").forEach(el => { el.style.display = session ? "none" : "inline-block"; });
  document.querySelectorAll(".auth-only").forEach(el => { el.style.display = session ? "inline-block" : "none"; });
  document.querySelectorAll(".require-auth").forEach(el => {
    el.addEventListener("click", (ev) => {
      if (!session) {
        ev.preventDefault();
        window.location.href = "/login.html";
      }
    });
  });

  // Sidebar only if connected
  const main = document.querySelector(".main");
  if (session && main) {
    await loadPartial("#sidebar", "/shared/sidebar.html");
    const emailEl = document.getElementById("sidebarUserEmail");
    if (emailEl) emailEl.textContent = session.user.email;
    const sidebarLogout = document.getElementById("sidebarLogout");
    if (sidebarLogout) sidebarLogout.addEventListener("click", async () => {
      const ok = confirm("Confirmer la déconnexion ?");
      if (ok) await signOut();
    });
  }
}

function startClock() {
  const clockEl = document.getElementById("liveClock");
  function tick() {
    if (!clockEl) return;
    const now = new Date();
    const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit" };
    clockEl.textContent = now.toLocaleString("fr-FR", opts);
  }
  tick();
  setInterval(tick, 1000 * 30);
}

document.addEventListener("DOMContentLoaded", async () => {
  startClock();
  await setupLayout();
});
