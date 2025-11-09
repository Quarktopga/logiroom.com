document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const reserveAlert = document.getElementById("reserveAlert");
  const rOrg = document.getElementById("rOrg");
  const rBuilding = document.getElementById("rBuilding");
  const rDate = document.getElementById("rDate");
  const rStart = document.getElementById("rStart");
  const rEnd = document.getElementById("rEnd");
  const rCap = document.getElementById("rCap");
  const rType = document.getElementById("rType");
  const rSearch = document.getElementById("rSearch");
  const rResults = document.getElementById("rResults");

  // init date - no past date
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const minDate = `${yyyy}-${mm}-${dd}`;
  rDate.min = minDate;
  rDate.value = minDate;

  async function loadOrgs() {
    const orgs = await db.listMyOrganizationsMembership();
    rOrg.innerHTML = orgs.map(o => `<option value="${o.id}">${o.name}</option>`).join("");
    await loadBuildings();
  }

  async function loadBuildings() {
    const orgId = rOrg.value;
    rBuilding.innerHTML = `<option value="tous">Tous</option>`;
    const buildings = await db.listBuildings(orgId);
    buildings.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id; opt.textContent = b.name;
      rBuilding.appendChild(opt);
    });
  }

  rOrg.addEventListener("change", loadBuildings);

  async function doSearch() {
    rResults.innerHTML = `<div class="alert alert-info">Recherche des disponibilités...</div>`;
    try {
      const reqEqp = Array.from(document.querySelectorAll(".req-eqp")).filter(e => e.checked).map(e => e.value);
      const rooms = await db.searchAvailableRooms({
        org_id: rOrg.value,
        building_id: rBuilding.value,
        date: rDate.value,
        start_time: rStart.value,
        end_time: rEnd.value,
        min_capacity: rCap.value ? parseInt(rCap.value, 10) : null,
        equipment: reqEqp,
        room_type: rType.value
      });
      if (!rooms.length) {
        rResults.innerHTML = `<div class="alert alert-error">Aucune salle disponible pour ce créneau. Essayez de modifier vos critères.</div>`;
        return;
      }
      const grid = document.createElement("div");
      grid.className = "card-grid";
      rooms.forEach(room => {
        const floorLabel = room.floor === 0 ? "RDC" : `${room.floor}`;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="card-title">${room.name}</div>
          <div class="card-meta">Bâtiment: ${room.buildings?.name || ""} · Étage: ${floorLabel}${room.location ? " · " + room.location : ""}</div>
          <div class="card-meta">Capacité: ${room.capacity}</div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-details" data-id="${room.id}">Voir détails</button>
            <button class="btn btn-warning btn-reserve" data-room="${room.id}" data-building="${room.building_id}" data-org="${room.org_id}">Réserver</button>
          </div>
        `;
        grid.appendChild(card);
      });
      rResults.innerHTML = "";
      rResults.appendChild(grid);

      rResults.querySelectorAll(".btn-details").forEach(btn => {
        btn.addEventListener("click", async (ev) => {
          const rid = ev.currentTarget.getAttribute("data-id");
          const { data, error } = await supabaseClient.from("rooms").select("*").eq("id", rid).single();
          if (error) { reserveAlert.innerHTML = `<div class="alert alert-error">${error.message}</div>`; return; }
          const floorLabel = data.floor === 0 ? "RDC" : `${data.floor}`;
          alert(
`Nom: ${data.name}
Type: ${data.room_type}
Étage: ${floorLabel}
Localisation: ${data.location || "-"}
Capacité: ${data.capacity}
Équipements: ${(data.equipment||[]).join(", ") || "-"}
Restrictions: ${data.restrictions || "-"}
Statut: ${data.status}`
          );
        });
      });

      rResults.querySelectorAll(".btn-reserve").forEach(btn => {
        btn.addEventListener("click", async (ev) => {
          const org = ev.currentTarget.getAttribute("data-org");
          const building = ev.currentTarget.getAttribute("data-building");
          const room = ev.currentTarget.getAttribute("data-room");
          const ok = confirm(
`Confirmer la réservation ?
Salle: ${room}
Date: ${rDate.value}
Horaire: ${rStart.value} - ${rEnd.value}
Participants: ${rCap.value || 1}`
          );
          if (!ok) return;
          try {
            await db.createReservation({
              org_id: org,
              building_id: building,
              room_id: room,
              date: rDate.value,
              start_time: rStart.value,
              end_time: rEnd.value,
              participants: rCap.value ? parseInt(rCap.value, 10) : 1
            });
            reserveAlert.innerHTML = `<div class="alert alert-success">Réservation réussie.</div>`;
          } catch (e) {
            reserveAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
          }
        });
      });
    } catch (e) {
      rResults.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }

  rSearch.addEventListener("click", doSearch);
  await loadOrgs();
});
