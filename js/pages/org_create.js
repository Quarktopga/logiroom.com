document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const orgAlert = document.getElementById("orgAlert");
  const orgName = document.getElementById("orgName");
  const orgType = document.getElementById("orgType");
  const orgPrivate = document.getElementById("orgPrivate");
  const orgCode = document.getElementById("orgCode");
  const privateCodeRow = document.getElementById("privateCodeRow");

  const bldName = document.getElementById("bldName");
  const bldType = document.getElementById("bldType");
  const btnAddBuilding = document.getElementById("btnAddBuilding");
  const extraBuildings = document.getElementById("extraBuildings");

  orgPrivate.addEventListener("change", () => {
    privateCodeRow.style.display = orgPrivate.checked ? "block" : "none";
  });

  const buildings = [];
  function renderExtraBuildings() {
    extraBuildings.innerHTML = "";
    buildings.forEach((b, idx) => {
      const row = document.createElement("div");
      row.className = "form-row";
      row.innerHTML = `
        <div class="form-col">
          <label>Bâtiment ${idx + 2} - Nom</label>
          <input data-idx="${idx}" data-k="name" value="${b.name}">
        </div>
        <div class="form-col">
          <label>Bâtiment ${idx + 2} - Type</label>
          <input data-idx="${idx}" data-k="building_type" value="${b.building_type}">
        </div>
        <div class="form-col">
          <button class="btn btn-danger btn-del" data-idx="${idx}">Supprimer le bâtiment</button>
        </div>
      `;
      extraBuildings.appendChild(row);
    });

    extraBuildings.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", (ev) => {
        const idx = parseInt(ev.target.getAttribute("data-idx"), 10);
        const key = ev.target.getAttribute("data-k");
        buildings[idx][key] = ev.target.value;
      });
    });
    extraBuildings.querySelectorAll(".btn-del").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const idx = parseInt(ev.target.getAttribute("data-idx"), 10);
        buildings.splice(idx, 1);
        renderExtraBuildings();
      });
    });
  }

  btnAddBuilding.addEventListener("click", () => {
    buildings.push({ name: "", building_type: "" });
    renderExtraBuildings();
  });

  document.getElementById("createOrgBtn").addEventListener("click", async () => {
    orgAlert.innerHTML = "";
    try {
      if (!orgName.value.trim()) throw new Error("Nom de l'organisation requis");
      let code = null;
      if (orgPrivate.checked) {
        code = orgCode.value.trim();
        if (!/^\d{5}$/.test(code)) throw new Error("Code d'accès : 5 chiffres");
      }

      const firstBuilding = (bldName.value.trim() && bldType.value.trim())
        ? { name: bldName.value.trim(), building_type: bldType.value.trim() }
        : null;

      const org = await db.createOrganization({
        name: orgName.value.trim(),
        org_type: orgType.value.trim(),
        is_private: orgPrivate.checked,
        access_code: code,
        firstBuilding
      });

      // Persist extra buildings
      for (const b of buildings) {
        if (!b.name || !b.building_type) continue;
        await db.addBuilding(org.id, b.name, b.building_type);
      }

      orgAlert.innerHTML = `<div class="alert alert-success">Organisation créée. Redirection vers les salles...</div>`;
      setTimeout(() => {
        window.location.href = `/rooms.html?org=${org.id}`;
      }, 800);
    } catch (e) {
      orgAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  });
});
