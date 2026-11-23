"use strict";

/* =========================================================
   Classement : lit les scores sauvegardés par les 4 jeux
   (memory.js, snake.js, quiz.js et xo.js) dans localStorage.
   ========================================================= */
(() => {
  const TABLE_ROWS = 5;

  // Chaque jeu : sa clé de stockage, sa façon de lire les données et son texte de détails
  const GAMES = [
    { id: "memory", key: "arcadehub-memory", kind: "top", detail: (e) => `Niveau ${e.level}` },
    { id: "snake",  key: "arcadehub-snake",  kind: "top", detail: (e) => `Niveau ${e.level}` },
    { id: "quiz",   key: "arcadehub-quiz",   kind: "top", detail: (e) => `${e.correct}/${e.total} bonnes réponses` },
    { id: "xo",     key: "arcadehub-xo-wins", kind: "wins", detail: () => "Contre l'ordinateur" }
  ];

  // ---------- Lecture des données ----------
  function readJSON(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  // Renvoie une liste triée du meilleur au moins bon : { player, score, detail, date }
  function loadEntries(game) {
    const data = readJSON(game.key);
    let entries = [];

    if (game.kind === "top") {
      const list = data && Array.isArray(data.top) ? data.top : [];
      entries = list.map((e) => ({
        player: e.player || "Invité",
        score: Number(e.score) || 0,
        detail: game.detail(e),
        date: e.date || "-"
      }));
    } else if (data && data.wins && typeof data.wins === "object") {
      entries = Object.entries(data.wins).map(([player, count]) => ({
        player,
        score: Number(count) || 0,
        detail: game.detail(),
        date: "-"
      }));
    }

    return entries.filter((e) => e.score > 0).sort((a, b) => b.score - a.score);
  }

  // ---------- Affichage ----------
  const currentPlayer = () => (window.ArcadeAuth && ArcadeAuth.currentUser() ? ArcadeAuth.currentUser().pseudo : null);

  function renderBanner() {
    const banner = document.getElementById("auth-banner");
    const pseudo = currentPlayer();
    banner.innerHTML = "";

    if (pseudo) {
      banner.className = "alert auth-banner";
      banner.append("Connecté en tant que ");
      const strong = document.createElement("strong");
      strong.textContent = pseudo;
      banner.append(strong, ". Vos scores apparaissent avec votre pseudo.");
    } else {
      banner.className = "alert auth-banner";
      banner.append("Vous jouez en tant qu'invité. ");
      const link = document.createElement("a");
      link.href = "./connexion.html?next=classement.html";
      link.textContent = "Connectez-vous";
      banner.append(link, " pour que votre pseudo apparaisse dans le classement.");
    }
  }

  function renderRecord(game, entries) {
    const card = document.querySelector(`.record-card[data-game="${game.id}"]`);
    if (!card) return;
    const best = entries[0];
    card.querySelector(".record-score").textContent = best ? best.score : "-";
    card.querySelector(".record-player").textContent = best ? best.player : "Aucun score";
    card.querySelector(".record-detail").textContent = best
      ? (best.date !== "-" ? `${best.detail}, le ${best.date}` : best.detail)
      : "Soyez le premier !";
  }

  function cell(text, className) {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  function renderTable(game, entries) {
    const tbody = document.getElementById(`tbody-${game.id}`);
    if (!tbody) return;
    tbody.innerHTML = "";

    if (entries.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "empty-row";
      td.textContent = "Aucun score pour le moment. Lancez une partie !";
      tr.append(td);
      tbody.append(tr);
      return;
    }

    const me = currentPlayer();
    entries.slice(0, TABLE_ROWS).forEach((e, i) => {
      const tr = document.createElement("tr");
      if (me && e.player === me) tr.className = "mine";

      const rankTd = document.createElement("td");
      const rank = document.createElement("span");
      rank.className = `rank${i < 3 ? ` rank-${i + 1}` : ""}`;
      rank.textContent = i + 1;
      rankTd.append(rank);

      const playerTd = document.createElement("td");
      playerTd.append(e.player);
      if (me && e.player === me) {
        const badge = document.createElement("span");
        badge.className = "badge-you";
        badge.textContent = "Vous";
        playerTd.append(badge);
      }

      const scoreTd = cell(e.score, "fw-bold");
      tr.append(rankTd, playerTd, scoreTd, cell(e.detail), cell(e.date));
      tbody.append(tr);
    });
  }

  function renderAll() {
    renderBanner();
    GAMES.forEach((game) => {
      const entries = loadEntries(game);
      renderRecord(game, entries);
      renderTable(game, entries);
    });
  }

  // ---------- Effacer les scores ----------
  document.getElementById("btn-confirm-clear").addEventListener("click", () => {
    GAMES.forEach((game) => {
      try { localStorage.removeItem(game.key); } catch (e) { /* ignoré */ }
    });
    renderAll();
  });

  // Mise à jour si un autre onglet (un jeu) modifie les scores
  window.addEventListener("storage", renderAll);

  renderAll();
})();