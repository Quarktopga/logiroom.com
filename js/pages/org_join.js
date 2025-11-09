document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const joinQuery = document.getElementById("joinQuery");
  const joinType = document.getElementById("joinType");
  const joinSearch = document.getElementById("joinSearch");
  const joinResults = document.getElementById("joinResults");
  const joinAlert = document.getElementById("joinAlert");

  async function search() {
    joinAlert.innerHTML = "";
    joinResults.innerHTML = `<div class="alert alert-info">Recherche en cours...</div>`;
    try {
      const data = await db.searchOrganizations({ query: joinQuery.value.trim(), org_type: joinType.value });
      if (!data.length) {
        joinResults.innerHTML = `<div class="alert alert-info">Aucune organisation trouvée.</div>`;
        return;
      }
      const grid = document.createElement("div");
      grid.className = "card-grid";
      data.forEach(org => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="card-title">${org.name}</div>
          <div class="card-meta">Type: ${org.org_type} ${org.is_private ? "· organisation privée" : ""}</div>
          <div class="form-col ${org.is_private ? "" : "hidden"}">
            <label>Code d'accès (5 chiffres)</label>
            <input class="joinCode" maxlength="5" placeholder="12345">
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-join" data-id="${org.id}" data-private="${org.is_private}">Rejoindre</button>
          </div>
        `;
        grid.appendChild(card);
      });
      joinResults.innerHTML = "";
      joinResults.appendChild(grid);

      joinResults.querySelectorAll(".btn-join").forEach(btn => {
        btn.addEventListener("click", async (ev) => {
          try {
            const isPriv = ev.currentTarget.getAttribute("data-private") === "true";
            const orgId = ev.currentTarget.getAttribute("data-id");
            let code = null;
            if (isPriv) {
              const codeInput = ev.currentTarget.closest(".card").querySelector(".joinCode");
              code = codeInput.value.trim();
              if (!/^\d{5}$/.test(code)) throw new Error("Code d'accès invalide.");
            }
            await db.joinOrganization({ org_id: orgId, access_code: code });
            joinAlert.innerHTML = `<div class="alert alert-success">Vous avez rejoint l'organisation.</div>`;
          } catch (e) {
            joinAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
          }
        });
      });
    } catch (e) {
      joinAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  }

  joinSearch.addEventListener("click", search);
  search();
});
