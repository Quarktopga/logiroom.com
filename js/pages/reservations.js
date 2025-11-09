document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const resSummary = document.getElementById("resSummary");
  const tabs = document.querySelectorAll(".tab");
  const resList = document.getElementById("resList");

  const filters = {
    fOrg: document.getElementById("fOrg"),
    fBuilding: document.getElementById("fBuilding"),
    fRoom: document.getElementById("fRoom"),
    fDate: document.getElementById("fDate"),
    fType: document.getElementById("fType"),
    fSearch: document.getElementById("fSearch")
  };

  let allReservations = [];
  let currentTab = "future";

  function computeSummary() {
    const upcoming = allReservations.filter(r => r.status === "active" && new Date(r.start_at) >= new Date());
    const next = upcoming.sort((a,b) => new Date(a.start_at) - new Date(b.start_at))[0];
    resSummary.innerHTML = `
      <div><strong>Nombre de réservations à venir:</strong> ${upcoming.length}</div>
      <div><strong>Prochaine réservation:</strong> ${next
        ? `${next.rooms?.name || "Salle"} · ${new Date(next.start_at).toLocaleString("fr-FR",{ dateStyle:"short", timeStyle:"short" })}`
        : "Aucune"}</div>
    `;
  }

  function passFilters(r) {
    const orgName = r.organizations?.name || "";
    const buildingName = r.buildings?.name || "";
    const roomName = r.rooms?.name || "";
    const typeName = r.rooms?.room_type || "";
    const dateStr = r.start_at.slice(0,10);

    if (filters.fOrg.value && !orgName.toLowerCase().includes(filters.fOrg.value.toLowerCase())) return false;
    if (filters.fBuilding.value && !buildingName.toLowerCase().includes(filters.fBuilding.value.toLowerCase())) return false;
    if (filters.fRoom.value && !roomName.toLowerCase().includes(filters.fRoom.value.toLowerCase())) return false;
    if (filters.fType.value && !typeName.toLowerCase().includes(filters.fType.value.toLowerCase())) return false;
    if (filters.fDate.value && filters.fDate.value !== dateStr) return false;

    const needle = filters.fSearch.value.trim().toLowerCase();
    if (needle) {
      const hay = `${orgName} ${buildingName} ${roomName} ${typeName} ${dateStr}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  }

  function render() {
    const now = new Date();
    let items = allReservations.filter(passFilters);
    if (currentTab === "future") {
      items = items.filter(r => r.status === "active" && new Date(r.end_at) >= now);
    } else if (currentTab === "past") {
      items = items.filter(r => r.status === "active" && new Date(r.end_at) < now);
    } else {
      items = items.filter(r => r.status === "cancelled");
    }

    if (!items.length) {
      resList.innerHTML = `<div class="alert alert-info">Aucune réservation dans cet onglet.</div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "card-grid";
    items.forEach(r => {
      const card = document.createElement("div");
      card.className = "card";
      const start = new Date(r.start_at);
      const end = new Date(r.end_at);
      card.innerHTML = `
        <div class="card-title">${r.organizations?.name || ""}</div>
        <div class="card-meta">Bâtiment: ${r.buildings?.name || ""} · Étage: ${r.rooms?.floor === 0 ? "RDC" : r.rooms?.floor} · Salle: ${r.rooms?.name || ""}</div>
        <div class="card-meta">Horaire choisi: ${start.toLocaleString("fr-FR",{ dateStyle:"short", timeStyle:"short" })} - ${end.toLocaleString("fr-FR",{ timeStyle:"short" })}</div>
        <div class="card-meta">Type de salle: ${r.rooms?.room_type || ""}</div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-edit" data-id="${r.id}">Modifier</button>
          <button class="btn btn-danger btn-cancel" data-id="${r.id}">Annuler</button>
          <button class="btn btn-warning btn-dup" data-id="${r.id}">Dupliquer</button>
        </div>
      `;
      grid.appendChild(card);
    });

    resList.innerHTML = "";
    resList.appendChild(grid);

    resList.querySelectorAll(".btn-cancel").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const id = ev.currentTarget.getAttribute("data-id");
        const ok = confirm("Confirmer l'annulation ?");
        if (!ok) return;
        await db.cancelReservation(id);
        await load();
      });
    });

    resList.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const id = ev.currentTarget.getAttribute("data-id");
        const item = allReservations.find(r => r.id === id);
        if (!item) return;
        const start = new Date(item.start_at);
        const end = new Date(item.end_at);
        const newDate = prompt("Nouvelle date (YYYY-MM-DD):", item.start_at.slice(0,10));
        if (!newDate) return;
        const newStartTime = prompt("Nouvelle heure de début (HH:MM):", `${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`);
        if (!newStartTime) return;
        const newEndTime = prompt("Nouvelle heure de fin (HH:MM):", `${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}`);
        if (!newEndTime) return;
        await db.updateReservation(id, {
          start_at: new Date(`${newDate}T${newStartTime}:00`).toISOString(),
          end_at: new Date(`${newDate}T${newEndTime}:00`).toISOString()
        });
        await load();
      });
    });

    resList.querySelectorAll(".btn-dup").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const id = ev.currentTarget.getAttribute("data-id");
        const item = allReservations.find(r => r.id === id);
        if (!item) return;
        // Go to reserve with info pre-filled but without date/time
        const params = new URLSearchParams({
          org: item.org_id,
          building: item.building_id,
          room: item.room_id
        });
        window.location.href = `/reserve.html?${params.toString()}`;
      });
    });
  }

  async function load() {
    allReservations = await db.listMyReservations();
    computeSummary();
    render();
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.getAttribute("data-tab");
      render();
    });
  });

  Object.values(filters).forEach(el => {
    el.addEventListener("input", render);
  });

  await load();
});
