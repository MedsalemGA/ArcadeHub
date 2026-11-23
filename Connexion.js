"use strict";

/* =========================================================
   Page Connexion / Inscription (front-end seulement)
   Utilise auth.js (ArcadeAuth) pour créer et vérifier les comptes.
   ========================================================= */
(() => {
  const $ = (id) => document.getElementById(id);

  const screenAuth = $("screen-auth");
  const screenLogged = $("screen-logged");
  const loginForm = $("login-form");
  const registerForm = $("register-form");
  const loginAlert = $("login-alert");
  const registerAlert = $("register-alert");
  const regPassword = $("reg-password");
  const regConfirm = $("reg-confirm");
  const pwBar = $("pw-bar");
  const pwLabel = $("pw-label");

  // ---------- Redirection après connexion ----------
  // On n'accepte qu'un nom de page locale (ex. classement.html) : pas de lien externe.
  function nextPage() {
    const next = new URLSearchParams(location.search).get("next");
    return next && /^[\w\-]+\.html$/.test(next) ? `./${next}` : "./Arcadehub.html";
  }

  // ---------- Alertes ----------
  function showAlert(el, message, type) {
    el.className = `alert ${type === "success" ? "alert-success-custom" : "alert-error"}`;
    el.textContent = message;
    el.hidden = false;
  }

  const hideAlert = (el) => { el.hidden = true; };

  // ---------- Écran « déjà connecté » ----------
  function showLoggedScreen(user) {
    screenAuth.hidden = true;
    screenLogged.hidden = false;
    $("logged-avatar").textContent = user.pseudo.charAt(0).toUpperCase();
    $("logged-name").textContent = user.pseudo;
    $("logged-email").textContent = user.email;
    const since = new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    $("logged-since").textContent = `Membre depuis le ${since}`;
  }

  $("btn-logout").addEventListener("click", () => {
    ArcadeAuth.logout();
    location.reload();
  });

  // ---------- Afficher / masquer le mot de passe ----------
  document.querySelectorAll(".btn-toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Masquer" : "Afficher";
      btn.setAttribute("aria-pressed", String(show));
    });
  });

  // ---------- Passer d'un onglet à l'autre ----------
  function switchTab(name) {
    const tab = $(name === "register" ? "tab-register" : "tab-login");
    bootstrap.Tab.getOrCreateInstance(tab).show();
  }

  document.querySelectorAll("[data-switch]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.switch));
  });

  if (location.hash === "#inscription") switchTab("register");

  // ---------- Force du mot de passe ----------
  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score; // 0 à 5
  }

  function updateStrength() {
    const value = regPassword.value;
    if (!value) {
      pwBar.style.width = "0";
      pwBar.className = "pw-bar";
      pwLabel.textContent = "-";
      return;
    }
    const score = passwordStrength(value);
    const level = score >= 4 ? "strong" : score === 3 ? "medium" : "weak";
    pwBar.style.width = `${Math.max(15, (score / 5) * 100)}%`;
    pwBar.className = `pw-bar ${level === "weak" ? "" : level}`.trim();
    pwLabel.textContent = level === "strong" ? "Fort" : level === "medium" ? "Moyen" : "Faible";
  }

  // ---------- Confirmation du mot de passe ----------
  function checkConfirm() {
    regConfirm.setCustomValidity(regConfirm.value === regPassword.value ? "" : "Les mots de passe diffèrent.");
  }

  regPassword.addEventListener("input", () => {
    updateStrength();
    checkConfirm();
  });
  regConfirm.addEventListener("input", checkConfirm);

  // ---------- Soumission : connexion ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(loginAlert);
    loginForm.classList.add("was-validated");
    if (!loginForm.checkValidity()) return;

    const result = await ArcadeAuth.login({
      identifier: $("login-identifier").value,
      password: $("login-password").value,
      remember: $("login-remember").checked
    });

    if (!result.ok) {
      showAlert(loginAlert, "Identifiants incorrects. Vérifiez votre e-mail ou pseudo et votre mot de passe.", "error");
      return;
    }
    showAlert(loginAlert, `Bienvenue ${result.user.pseudo} ! Redirection…`, "success");
    setTimeout(() => { location.href = nextPage(); }, 700);
  });

  // ---------- Soumission : inscription ----------
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(registerAlert);
    checkConfirm();
    registerForm.classList.add("was-validated");
    if (!registerForm.checkValidity()) return;

    const result = await ArcadeAuth.register({
      pseudo: $("reg-pseudo").value,
      email: $("reg-email").value,
      password: regPassword.value,
      remember: true
    });

    if (!result.ok) {
      const messages = {
        pseudo: "Ce pseudo est déjà utilisé. Choisissez-en un autre.",
        email: "Un compte existe déjà avec cette adresse e-mail.",
        storage: "Impossible d'enregistrer le compte : le stockage du navigateur est indisponible."
      };
      showAlert(registerAlert, messages[result.error] || "Une erreur est survenue.", "error");
      return;
    }
    showAlert(registerAlert, `Compte créé. Bienvenue ${result.user.pseudo} ! Redirection…`, "success");
    setTimeout(() => { location.href = nextPage(); }, 900);
  });

  // ---------- Démarrage ----------
  const user = ArcadeAuth.currentUser();
  if (user) showLoggedScreen(user);
})();"use strict";

/* =========================================================
   Page Connexion / Inscription (front-end seulement)
   Utilise auth.js (ArcadeAuth) pour créer et vérifier les comptes.
   ========================================================= */
(() => {
  const $ = (id) => document.getElementById(id);

  const screenAuth = $("screen-auth");
  const screenLogged = $("screen-logged");
  const loginForm = $("login-form");
  const registerForm = $("register-form");
  const loginAlert = $("login-alert");
  const registerAlert = $("register-alert");
  const regPassword = $("reg-password");
  const regConfirm = $("reg-confirm");
  const pwBar = $("pw-bar");
  const pwLabel = $("pw-label");

  // ---------- Redirection après connexion ----------
  // On n'accepte qu'un nom de page locale (ex. classement.html) : pas de lien externe.
  function nextPage() {
    const next = new URLSearchParams(location.search).get("next");
    return next && /^[\w\-]+\.html$/.test(next) ? `./${next}` : "./Arcadehub.html";
  }

  // ---------- Alertes ----------
  function showAlert(el, message, type) {
    el.className = `alert ${type === "success" ? "alert-success-custom" : "alert-error"}`;
    el.textContent = message;
    el.hidden = false;
  }

  const hideAlert = (el) => { el.hidden = true; };

  // ---------- Écran « déjà connecté » ----------
  function showLoggedScreen(user) {
    screenAuth.hidden = true;
    screenLogged.hidden = false;
    $("logged-avatar").textContent = user.pseudo.charAt(0).toUpperCase();
    $("logged-name").textContent = user.pseudo;
    $("logged-email").textContent = user.email;
    const since = new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    $("logged-since").textContent = `Membre depuis le ${since}`;
  }

  $("btn-logout").addEventListener("click", () => {
    ArcadeAuth.logout();
    location.reload();
  });

  // ---------- Afficher / masquer le mot de passe ----------
  document.querySelectorAll(".btn-toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Masquer" : "Afficher";
      btn.setAttribute("aria-pressed", String(show));
    });
  });

  // ---------- Passer d'un onglet à l'autre ----------
  function switchTab(name) {
    const tab = $(name === "register" ? "tab-register" : "tab-login");
    bootstrap.Tab.getOrCreateInstance(tab).show();
  }

  document.querySelectorAll("[data-switch]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.switch));
  });

  if (location.hash === "#inscription") switchTab("register");

  // ---------- Force du mot de passe ----------
  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score; // 0 à 5
  }

  function updateStrength() {
    const value = regPassword.value;
    if (!value) {
      pwBar.style.width = "0";
      pwBar.className = "pw-bar";
      pwLabel.textContent = "-";
      return;
    }
    const score = passwordStrength(value);
    const level = score >= 4 ? "strong" : score === 3 ? "medium" : "weak";
    pwBar.style.width = `${Math.max(15, (score / 5) * 100)}%`;
    pwBar.className = `pw-bar ${level === "weak" ? "" : level}`.trim();
    pwLabel.textContent = level === "strong" ? "Fort" : level === "medium" ? "Moyen" : "Faible";
  }

  // ---------- Confirmation du mot de passe ----------
  function checkConfirm() {
    regConfirm.setCustomValidity(regConfirm.value === regPassword.value ? "" : "Les mots de passe diffèrent.");
  }

  regPassword.addEventListener("input", () => {
    updateStrength();
    checkConfirm();
  });
  regConfirm.addEventListener("input", checkConfirm);

  // ---------- Soumission : connexion ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(loginAlert);
    loginForm.classList.add("was-validated");
    if (!loginForm.checkValidity()) return;

    const result = await ArcadeAuth.login({
      identifier: $("login-identifier").value,
      password: $("login-password").value,
      remember: $("login-remember").checked
    });

    if (!result.ok) {
      showAlert(loginAlert, "Identifiants incorrects. Vérifiez votre e-mail ou pseudo et votre mot de passe.", "error");
      return;
    }
    showAlert(loginAlert, `Bienvenue ${result.user.pseudo} ! Redirection…`, "success");
    setTimeout(() => { location.href = nextPage(); }, 700);
  });

  // ---------- Soumission : inscription ----------
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(registerAlert);
    checkConfirm();
    registerForm.classList.add("was-validated");
    if (!registerForm.checkValidity()) return;

    const result = await ArcadeAuth.register({
      pseudo: $("reg-pseudo").value,
      email: $("reg-email").value,
      password: regPassword.value,
      remember: true
    });

    if (!result.ok) {
      const messages = {
        pseudo: "Ce pseudo est déjà utilisé. Choisissez-en un autre.",
        email: "Un compte existe déjà avec cette adresse e-mail.",
        storage: "Impossible d'enregistrer le compte : le stockage du navigateur est indisponible."
      };
      showAlert(registerAlert, messages[result.error] || "Une erreur est survenue.", "error");
      return;
    }
    showAlert(registerAlert, `Compte créé. Bienvenue ${result.user.pseudo} ! Redirection…`, "success");
    setTimeout(() => { location.href = nextPage(); }, 900);
  });

  // ---------- Démarrage ----------
  const user = ArcadeAuth.currentUser();
  if (user) showLoggedScreen(user);
})();