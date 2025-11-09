function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const orgId = getQueryParam("org");
  const alertBox = document.getElementById("roomAddAlert");
  const buildingSel = document.getElementById("roomBuilding");
  const nameEl = document.getElementById("roomName");
  const typeEl = document.getElementById("roomType");
  const floorEl = document.getElementById("roomFloor");
  const locationEl = document.getElementById("roomLocation");
  const startEl = document.getElementById("roomStart");
  const endEl = document.getElementById("roomEnd");
  const accessEl = document.getElementById("roomAccessCode");
  const capacityEl = document.getElementById("roomCapacity");
  const restrictionsEl = document.getElementById("roomRestrictions");
  const statusEl = document.getElementById("roomStatus");
  const saveBtn = document.getElementById("roomSaveBtn");

  async function loadBuildings() {
    if (!orgId) {
      alertBox.innerHTML = `<div class="alert alert-error">Organisation non spécifiée.</div>`;
      return;
    }
    const bl = await db.listBuildings(orgId);
    buildingSel.innerHTML = bl.map(b => `<option value="${b.id}">${b.name}</option>`).join("");
  }

  saveBtn.addEventListener("click", async () => {
    alertBox.innerHTML = "";
    try {
      const equipment = Array.from(document.querySelectorAll(".eqp")).filter(e => e.checked).map(e => e.value);
      await db.addRoom({
        org_id: orgId,
        building_id: buildingSel.value,
        name: nameEl.value.trim(),
        room_type: typeEl.value.trim(),
        floor: parseInt(floorEl.value, 10),
        location: locationEl.value.trim(),
        available_start: startEl.value,
        available_end: endEl.value,
        access_code_required: accessEl.checked,
        capacity: parseInt(capacityEl.value, 10),
        equipment,
        restrictions: restrictionsEl.value.trim(),
        status: statusEl.value
      });
      alertBox.innerHTML = `<div class="alert alert-success">Salle enregistrée.</div>`;
      setTimeout(() => {
        window.location.href = `/rooms.html?org=${orgId}`;
      }, 800);
    } catch (e) {
      alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  });

  await loadBuildings();
});
