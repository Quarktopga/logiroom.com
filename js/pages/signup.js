document.addEventListener("DOMContentLoaded", () => {
  const lastEl = document.getElementById("signupLast");
  const firstEl = document.getElementById("signupFirst");
  const emailEl = document.getElementById("signupEmail");
  const passEl = document.getElementById("signupPassword");
  const pass2El = document.getElementById("signupPassword2");
  const errLast = document.getElementById("errLast");
  const errFirst = document.getElementById("errFirst");
  const errEmail = document.getElementById("errEmail");
  const errPass = document.getElementById("errPass");
  const errGlobal = document.getElementById("errGlobal");
  const btn = document.getElementById("signupBtn");

  function showErr(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }
  function hideErr(el) { el.textContent = ""; el.classList.add("hidden"); }

  btn.addEventListener("click", async () => {
    [errLast, errFirst, errEmail, errPass, errGlobal].forEach(hideErr);

    try {
      const ln = lastEl.value.trim();
      const fn = firstEl.value.trim();
      const email = emailEl.value.trim();
      const pass = passEl.value;
      const pass2 = pass2El.value;

      if (!ln || /\s$/.test(lastEl.value) || /^\s/.test(lastEl.value)) showErr(errLast, "Espace avant ou après le NOM non-autorisé");
      if (!fn || /\s$/.test(firstEl.value) || /^\s/.test(firstEl.value)) showErr(errFirst, "Espace avant ou après le prénom non-autorisé");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) showErr(errEmail, "Email invalide");
      if (!pass || pass !== pass2) showErr(errPass, "Les mots de passe ne correspondent pas");

      if ([errLast, errFirst, errEmail, errPass].some(el => !el.classList.contains("hidden"))) {
        showErr(errGlobal, "Veuillez corriger les erreurs ci-dessus.");
        return;
      }

      await signUp(email, pass, fn, ln);
      // User is auto connected
      window.location.href = "/index.html";
    } catch (e) {
      showErr(errGlobal, e.message);
    }
  });
});
