document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const alertBox = document.getElementById("orgManageAlert");
  const list = document.getElementById("orgManageList");

  async function load() {
    alertBox.innerHTML = "";
    list.innerHTML = `<div class="alert alert-info">Chargement...</div>`;
    try {
      const orgs = await db.listMyOrganizationsRoleOwner();
      if (!orgs.length) {
        list.innerHTML = `<div class="alert alert-info">Vous n'êtes pas responsable d'organisation</div>`;
        return;
      }
      const container = document.createElement("div");
      container.className = "card-grid";
      orgs.forEach(org => {
        const card = document.createElement("div");
        card.className = "card";
        const roomCount = (org.rooms || []).length;
        card.innerHTML = `
          <div class="card-title">${org.name}</div>
          <div class="card-meta">Nombre de salles: ${roomCount}</div>
          <div class="card-actions">
            <a href="/rooms.html?org=${org.id}" class="btn">Salles »</a>
            <a href="/org_create.html?edit=${org.id}" class="btn btn-secondary">Modifier les informations</a>
            <a href="/members.html?org=${org.id}" class="btn btn-secondary" style="display:none;">Voir les membres</a>
            <button class="btn btn-danger btn-del" data-id="${org.id}" data-name="${org.name}">Supprimer cette organisation</button>
          </div>
        `;
        container.appendChild(card);
      });
      list.innerHTML = "";
      list.appendChild(container);

      list.querySelectorAll(".btn-del").forEach(btn => {
        btn.addEventListener("click", async (ev) => {
          const orgId = ev.currentTarget.getAttribute("data-id");
          const orgName = ev.currentTarget.getAttribute("data-name");
          const input = prompt(`Tapez le nom de l'organisation pour confirmer la suppression:\n${orgName}`);
          if (input === null) return;
          try {
            await db.deleteOrganization(orgId, input.trim());
            alertBox.innerHTML = `<div class="alert alert-success">Organisation supprimée.</div>`;
            await load();
          } catch (e) {
            alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
          }
        });
      });
    } catch (e) {
      alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }

  await load();
});
