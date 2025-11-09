document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const accAlert = document.getElementById("accountAlert");
  const accLast = document.getElementById("accLast");
  const accFirst = document.getElementById("accFirst");
  const accEmail = document.getElementById("accEmail");
  const accSave = document.getElementById("accSave");
  const memberList = document.getElementById("memberList");

  try {
    const profile = await db.getProfile();
    accLast.value = profile.last_name || "";
    accFirst.value = profile.first_name || "";
    accEmail.value = profile.email || "";
  } catch (e) {
    accAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
  }

  accSave.addEventListener("click", async () => {
    accAlert.innerHTML = "";
    try {
      // basic syntax check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(accEmail.value.trim())) throw new Error("Email invalide");
      const updated = await db.updateProfile({
        first_name: accFirst.value.trim(),
        last_name: accLast.value.trim(),
        email: accEmail.value.trim()
      });
      accAlert.innerHTML = `<div class="alert alert-success">Profil mis à jour.</div>`;
    } catch (e) {
      accAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  });

  async function loadMemberships() {
    const memberships = await db.listMyOrganizationsMembership();
    if (!memberships.length) {
      memberList.innerHTML = `<div class="alert alert-info">Vous n'êtes membre d'aucune organisation.</div>`;
      return;
    }
    const container = document.createElement("div");
    container.className = "card-grid";
    memberships.forEach(org => {
      const card = document.createElement("div");
      card.className = "card";
      const isOwner = org.owner_id === session.user.id;
      card.innerHTML = `
        <div class="card-title">${org.name}</div>
        <div class="card-meta">Type: ${org.org_type}${org.is_private ? " · Organisation privée" : ""}</div>
        ${isOwner ? `<div class="alert alert-info">Vous êtes le responsable</div>` : ""}
        <div class="card-actions">
          ${isOwner ? "" : `<button data-org="${org.id}" class="btn btn-secondary btn-leave">Quitter</button>`}
        </div>
      `;
      container.appendChild(card);
    });
    memberList.innerHTML = "";
    memberList.appendChild(container);

    memberList.querySelectorAll(".btn-leave").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const orgId = ev.currentTarget.getAttribute("data-org");
        const ok = confirm("Confirmer la sortie de l'organisation ?");
        if (!ok) return;
        try {
          await db.leaveOrganization(orgId);
          await loadMemberships();
        } catch (e) {
          accAlert.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
        }
      });
    });
  }

  await loadMemberships();
});
