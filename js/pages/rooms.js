function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;
  const orgId = getQueryParam("org");
  const roomsTitle = document.getElementById("roomsTitle");
  const addRoomLink = document.getElementById("addRoomLink");
  const roomsAlert = document.getElementById("roomsAlert");
  const roomsList = document.getElementById("roomsList");

  if (!orgId) {
    roomsAlert.innerHTML = `<div class="alert alert-error">Organisation non spécifiée.</div>`;
    return;
  }
  addRoomLink.href = `/room_add.html?org=${orgId}`;

  async function loadRooms() {
    roomsList.innerHTML = `<div class="alert alert-info">Chargement...</div>`;
    try {
      const rooms = await db.listRooms(orgId);
      roomsTitle.textContent = rooms.length
        ? `X salles enregistrées pour l'organisation`
        : `Aucune salle enregistrée pour cette organisation`;

      if (!rooms.length) {
        roomsList.innerHTML = `<div class="alert alert-info">Aucune salle enregistrée.</div>`;
        return;
      }
      const grid = document.createElement("div");
      grid.className = "card-grid";
      rooms.forEach(r => {
        const floorLabel = r.floor === 0 ? "RDC" : `${r.floor}`;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="card-title">${r.name}</div>
          <div class="card-meta">${r.buildings?.name || "Bâtiment"} · Étage: ${floorLabel}${r.location ? " · " + r.location : ""}</div>
          <div class="card-meta">Capacité: ${r.capacity} · Type: ${r.room_type}</div>
          <div class="card-actions">
            <a href="/reserve.html?org=${r.org_id}&room=${r.id}" class="btn">Réserver</a>
            <button class="btn btn-secondary btn-details" data-id="${r.id}">Voir détails</button>
          </div>
        `;
        grid.appendChild(card);
      });
      roomsList.innerHTML = "";
      roomsList.appendChild(grid);

      roomsList.querySelectorAll(".btn-details").forEach(btn => {
        btn.addEventListener("click", (ev) => {
          const id = ev.currentTarget.getAttribute("data-id");
          showDetails(id);
        });
      });
    } catch (e) {
      roomsAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }

  async function showDetails(roomId) {
    try {
      const { data, error } = await supabaseClient
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (error) throw error;
      const floorLabel = data.floor === 0 ? "RDC" : `${data.floor}`;
      alert(
`Nom: ${data.name}
Type: ${data.room_type}
Étage: ${floorLabel}
Localisation: ${data.location || "-"}
Capacité: ${data.capacity}
Horaires: ${data.available_start} - ${data.available_end}
Équipements: ${(data.equipment||[]).join(", ") || "-"}
Restrictions: ${data.restrictions || "-"}
Statut: ${data.status}`
      );
    } catch (e) {
      roomsAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }

  await loadRooms();
});
