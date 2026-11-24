"use strict";

/* =========================================================
   Page Profil (front-end seulement)
   Utilise auth.js (ArcadeAuth) et lit les scores des 4 jeux.
   ========================================================= */
(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- Accès réservé aux comptes connectés ----------
  let user = ArcadeAuth.currentUser();
  if (!user) {
    location.replace("./connexion.html?next=profil.html");
    return;
  }

  // ---------- Données des jeux ----------
  const TOP_GAMES = [
    { id: "memory", name: "Memory",       key: "arcadehub-memory", detail: (e) => `Niveau ${e.level}` },
    { id: "snake",  name: "Snake",        key: "arcadehub-snake",  detail: (e) => `Niveau ${e.level}` },
    { id: "quiz",   name: "Quiz Culture", key: "arcadehub-quiz",   detail: (e) => `${e.correct}/${e.total} bonnes réponses` }
  ];
  const XO_KEY = "arcadehub-xo-wins";

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignoré */ }
  }

  // Parties du joueur dans un jeu (liste « top »), triées du meilleur au moins bon
  function myEntries(game, pseudo) {
    const data = readJSON(game.key);
    const list = data && Array.isArray(data.top) ? data.top : [];
    return list
      .filter((e) => e.player === pseudo)
      .map((e) => ({ game: game.name, score: Number(e.score) || 0, detail: game.detail(e), date: e.date || "-" }))
      .sort((a, b) => b.score - a.score);
  }

  const myXoWins = (pseudo) => {
    const data = readJSON(XO_KEY);
    return data && data.wins && Number(data.wins[pseudo]) ? Number(data.wins[pseudo]) : 0;
  };

  // Quand le pseudo change, les anciens scores suivent le nouveau nom
  function renamePlayerInScores(oldName, newName) {
    TOP_GAMES.forEach((game) => {
      const data = readJSON(game.key);
      if (!data || !Array.isArray(data.top)) return;
      data.top.forEach((e) => { if (e.player === oldName) e.player = newName; });
      writeJSON(game.key, data);
    });
    const xo = readJSON(XO_KEY);
    if (xo && xo.wins && xo.wins[oldName]) {
      xo.wins[newName] = (xo.wins[newName] || 0) + xo.wins[oldName];
      delete xo.wins[oldName];
      writeJSON(XO_KEY, xo);
    }
  }

  function removePlayerScores(pseudo) {
    TOP_GAMES.forEach((game) => {
      const data = readJSON(game.key);
      if (!data || !Array.isArray(data.top)) return;
      data.top = data.top.filter((e) => e.player !== pseudo);
      writeJSON(game.key, data);
    });
    const xo = readJSON(XO_KEY);
    if (xo && xo.wins) {
      delete xo.wins[pseudo];
      writeJSON(XO_KEY, xo);
    }
  }

  // ---------- Alertes ----------
  function showAlert(el, message, type) {
    el.className = `alert ${type === "success" ? "alert-success-custom" : "alert-error"}`;
    el.textContent = message;
    el.hidden = false;
  }

  const hideAlert = (el) => { el.hidden = true; };

  // ---------- Affichage ----------
  function renderIdentity() {
    $("profile-avatar").textContent = user.pseudo.charAt(0).toUpperCase();
    $("profile-name").textContent = user.pseudo;
    $("profile-email").textContent = user.email;
    const since = new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    $("profile-since").textContent = `Membre depuis le ${since}`;
  }

  function renderStats() {
    let total = 0;
    const rows = [];

    TOP_GAMES.forEach((game) => {
      const entries = myEntries(game, user.pseudo);
      total += entries.length;
      rows.push(...entries);

      const tile = document.querySelector(`.stat-tile[data-game="${game.id}"]`);
      tile.querySelector(".stat-value").textContent = entries.length ? entries[0].score : "-";
      tile.querySelector(".stat-detail").textContent = entries.length ? entries[0].detail : "Pas encore joué";
    });

    const wins = myXoWins(user.pseudo);
    total += wins;
    const xoTile = document.querySelector('.stat-tile[data-game="xo"]');
    xoTile.querySelector(".stat-value").textContent = wins || "-";
    xoTile.querySelector(".stat-detail").textContent = wins
      ? (wins > 1 ? "victoires contre l'ordinateur" : "victoire contre l'ordinateur")
      : "Pas encore de victoire";

    $("profile-count").textContent = total
      ? `${total} partie${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}`
      : "Aucune partie enregistrée";

    renderGamesTable(rows, wins);
  }

  function cell(text) {
    const td = document.createElement("td");
    td.textContent = text;
    return td;
  }

  function renderGamesTable(rows, wins) {
    const tbody = $("games-body");
    tbody.innerHTML = "";

    const all = [...rows];
    if (wins) all.push({ game: "XO", score: `${wins} victoire${wins > 1 ? "s" : ""}`, detail: "Contre l'ordinateur", date: "-" });

    if (all.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "empty-row";
      td.textContent = "Aucune partie pour le moment. Lancez un jeu !";
      tr.append(td);
      tbody.append(tr);
      return;
    }

    all.forEach((r) => {
      const tr = document.createElement("tr");
      const score = cell(r.score);
      score.className = "fw-bold";
      tr.append(cell(r.game), score, cell(r.detail), cell(r.date));
      tbody.append(tr);
    });
  }

  function fillForm() {
    $("info-pseudo").value = user.pseudo;
    $("info-email").value = user.email;
  }

  function renderAll() {
    renderIdentity();
    renderStats();
    fillForm();
    ArcadeAuth.refreshNavbar();
  }

  // ---------- Déconnexion ----------
  $("btn-logout").addEventListener("click", () => {
    ArcadeAuth.logout();
    location.href = "./Arcadehub.html";
  });

  // ---------- Modifier pseudo et e-mail ----------
  const infoForm = $("info-form");
  const infoAlert = $("info-alert");

  infoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(infoAlert);
    infoForm.classList.add("was-validated");
    if (!infoForm.checkValidity()) return;

    const result = await ArcadeAuth.updateProfile({
      pseudo: $("info-pseudo").value,
      email: $("info-email").value
    });

    if (!result.ok) {
      const messages = {
        pseudo: "Ce pseudo est déjà utilisé. Choisissez-en un autre.",
        email: "Un autre compte utilise déjà cette adresse e-mail.",
        storage: "Impossible d'enregistrer : le stockage du navigateur est indisponible.",
        session: "Votre session a expiré. Reconnectez-vous."
      };
      showAlert(infoAlert, messages[result.error] || "Une erreur est survenue.", "error");
      return;
    }

    if (result.oldPseudo !== result.user.pseudo) renamePlayerInScores(result.oldPseudo, result.user.pseudo);
    user = result.user;
    infoForm.classList.remove("was-validated");
    renderAll();
    showAlert(infoAlert, "Informations mises à jour.", "success");
  });

  // ---------- Changer le mot de passe ----------
  const passForm = $("pass-form");
  const passAlert = $("pass-alert");
  const passNew = $("pass-new");
  const passConfirm = $("pass-confirm");

  const checkConfirm = () => {
    passConfirm.setCustomValidity(passConfirm.value === passNew.value ? "" : "Les mots de passe diffèrent.");
  };
  passNew.addEventListener("input", checkConfirm);
  passConfirm.addEventListener("input", checkConfirm);

  passForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(passAlert);
    checkConfirm();
    passForm.classList.add("was-validated");
    if (!passForm.checkValidity()) return;

    const result = await ArcadeAuth.changePassword({
      current: $("pass-current").value,
      next: passNew.value
    });

    if (!result.ok) {
      const message = result.error === "credentials"
        ? "Le mot de passe actuel est incorrect."
        : "Impossible de modifier le mot de passe. Reconnectez-vous puis réessayez.";
      showAlert(passAlert, message, "error");
      return;
    }

    passForm.reset();
    passForm.classList.remove("was-validated");
    showAlert(passAlert, "Mot de passe mis à jour.", "success");
  });

  // ---------- Effacer mes scores ----------
  $("btn-confirm-scores").addEventListener("click", () => {
    removePlayerScores(user.pseudo);
    renderStats();
    showAlert($("danger-alert"), "Vos scores ont été effacés.", "success");
  });

  // ---------- Supprimer le compte ----------
  const deleteForm = $("delete-form");
  const deleteAlert = $("delete-alert");

  deleteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(deleteAlert);
    deleteForm.classList.add("was-validated");
    if (!deleteForm.checkValidity()) return;

    const pseudo = user.pseudo;
    const result = await ArcadeAuth.deleteAccount($("delete-password").value);

    if (!result.ok) {
      const message = result.error === "credentials"
        ? "Mot de passe incorrect."
        : "Impossible de supprimer le compte. Réessayez.";
      showAlert(deleteAlert, message, "error");
      return;
    }

    if ($("delete-scores").checked) removePlayerScores(pseudo);
    location.href = "./Arcadehub.html";
  });

  // Réinitialise la modale quand on la ferme
  $("deleteModal").addEventListener("hidden.bs.modal", () => {
    deleteForm.reset();
    deleteForm.classList.remove("was-validated");
    hideAlert(deleteAlert);
  });

  // ---------- Démarrage ----------
  renderAll();
})();