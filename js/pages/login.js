document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("loginEmail");
  const passEl = document.getElementById("loginPassword");
  const btn = document.getElementById("loginBtn");
  const alertBox = document.getElementById("loginAlert");

  btn.addEventListener("click", async () => {
    alertBox.innerHTML = "";
    try {
      if (!emailEl.value || !passEl.value) throw new Error("Tous les champs sont requis.");
      await signIn(emailEl.value.trim(), passEl.value);
      window.location.href = "/index.html";
    } catch (e) {
      alertBox.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  });
});
