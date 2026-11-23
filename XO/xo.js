"use strict";

/* =========================================================
   Jeu XO (Morpion) : logique
   Fonctionne avec xo.html et xo.css
   ========================================================= */
(() => {
  // ---------- Constantes ----------
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // lignes
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // colonnes
    [0, 4, 8], [2, 4, 6]             // diagonales
  ];
  const STORAGE_KEY = "arcadehub-xo";
  const CPU_DELAY = 500;      // délai de « réflexion » de l'ordinateur (ms)
  const MODAL_DELAY = 700;    // délai avant d'afficher la modale de fin (ms)
  const HISTORY_MAX = 8;

  // ---------- Éléments du DOM ----------
  const boardEl = document.getElementById("board");
  const cells = Array.from(document.querySelectorAll(".cell"));
  const statusEl = document.getElementById("status");
  const cardX = document.getElementById("card-x");
  const cardO = document.getElementById("card-o");
  const scoreEls = {
    X: document.getElementById("score-x"),
    O: document.getElementById("score-o"),
    draw: document.getElementById("score-draw")
  };
  const difficultySel = document.getElementById("difficulty");
  const symbolRadios = document.querySelectorAll('input[name="symbol"]');
  const historyEl = document.getElementById("history");
  const modalEl = document.getElementById("resultModal");
  const resultTitle = document.getElementById("result-title");
  const resultText = document.getElementById("result-text");

  // ---------- État ----------
  let state = { board: Array(9).fill(null), current: "X", over: false };
  let scores = { X: 0, O: 0, draw: 0 };
  let history = [];
  let cpuTimer = null;
  let modalTimer = null;

  // ---------- Réglages lus dans le HTML ----------
  const isCpuMode = () => document.querySelector('input[name="mode"]:checked').value === "cpu";
  const humanSymbol = () => document.querySelector('input[name="symbol"]:checked').value;
  const cpuSymbol = () => (humanSymbol() === "X" ? "O" : "X");
  const isCpuTurn = () => isCpuMode() && state.current === cpuSymbol();
  const otherPlayer = (p) => (p === "X" ? "O" : "X");

  // ---------- Sauvegarde (localStorage) ----------
  function loadData() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data) {
        scores = { ...scores, ...data.scores };
        history = Array.isArray(data.history) ? data.history : [];
      }
    } catch (e) { /* données absentes ou invalides : on garde les valeurs par défaut */ }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores, history }));
    } catch (e) { /* stockage indisponible : on ignore */ }
  }

  // ---------- Victoires contre l'ordinateur (pour le classement) ----------
  const WINS_KEY = "arcadehub-xo-wins";
  function recordCpuWin() {
    try {
      const data = JSON.parse(localStorage.getItem(WINS_KEY)) || { wins: {} };
      const name = window.ArcadeAuth ? window.ArcadeAuth.playerName() : "Invité";
      data.wins[name] = (data.wins[name] || 0) + 1;
      localStorage.setItem(WINS_KEY, JSON.stringify(data));
    } catch (e) { /* stockage indisponible : on ignore */ }
  }

  // ---------- Règles ----------
  function findWinner(board) {
    for (const line of LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], line };
      }
    }
    return null;
  }

  // ---------- Affichage ----------
  const markHTML = (p) => `<span class="mark ${p.toLowerCase()}">${p}</span>`;

  function updateScores() {
    scoreEls.X.textContent = scores.X;
    scoreEls.O.textContent = scores.O;
    scoreEls.draw.textContent = scores.draw;
  }

  function updateActiveCards() {
    cardX.classList.toggle("active", !state.over && state.current === "X");
    cardO.classList.toggle("active", !state.over && state.current === "O");
  }

  function updateStatus() {
    statusEl.innerHTML = `Au tour de ${markHTML(state.current)}`;
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    if (history.length === 0) {
      const li = document.createElement("li");
      li.className = "list-group-item history-empty";
      li.textContent = "Aucune partie jouée pour le moment.";
      historyEl.append(li);
      return;
    }
    history.forEach((h) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      const label = document.createElement("span");
      label.textContent = h.text;
      const time = document.createElement("small");
      time.className = "text-body-secondary";
      time.textContent = h.time;
      li.append(label, time);
      historyEl.append(li);
    });
  }

  function addHistory(text) {
    const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    history.unshift({ text, time });
    history = history.slice(0, HISTORY_MAX);
    renderHistory();
  }

  // ---------- Déroulement d'une partie ----------
  function newGame() {
    clearTimeout(cpuTimer);
    clearTimeout(modalTimer);
    state = { board: Array(9).fill(null), current: "X", over: false };

    cells.forEach((cell, i) => {
      cell.textContent = "";
      cell.className = "cell";
      cell.disabled = false;
      cell.setAttribute("aria-label", `Case ${i + 1}`);
    });
    boardEl.classList.remove("finished");

    updateStatus();
    updateActiveCards();
    if (isCpuTurn()) scheduleCpu();
  }

  function play(index) {
    if (state.over || state.board[index]) return;

    const player = state.current;
    state.board[index] = player;

    const cell = cells[index];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
    cell.disabled = true;
    cell.setAttribute("aria-label", `Case ${index + 1}, ${player}`);

    const result = findWinner(state.board);
    if (result) return endGame(result.player, result.line);
    if (state.board.every(Boolean)) return endGame(null, []);

    state.current = otherPlayer(player);
    updateStatus();
    updateActiveCards();
    if (isCpuTurn()) scheduleCpu();
  }

  function endGame(winner, line) {
    state.over = true;
    boardEl.classList.add("finished");
    cells.forEach((c) => { c.disabled = true; });
    line.forEach((i) => cells[i].classList.add("win"));

    let title, text, historyText;
    const cpu = isCpuMode();

    if (winner) {
      scores[winner]++;
      statusEl.innerHTML = `Le joueur ${markHTML(winner)} a gagné !`;
      if (cpu) {
        const humanWon = winner === humanSymbol();
        if (humanWon) recordCpuWin();
        title = humanWon ? "Victoire !" : "Défaite";
        text = humanWon ? "Bravo, vous avez battu l'ordinateur." : "L'ordinateur remporte la partie.";
        historyText = humanWon ? `Victoire (${winner}) contre l'ordinateur` : `Défaite contre l'ordinateur`;
      } else {
        title = "Victoire !";
        text = `Le joueur ${winner} remporte la partie.`;
        historyText = `${winner} a gagné (2 joueurs)`;
      }
    } else {
      scores.draw++;
      statusEl.textContent = "Égalité !";
      title = "Égalité";
      text = "Aucun alignement : personne ne gagne cette partie.";
      historyText = cpu ? "Égalité contre l'ordinateur" : "Égalité (2 joueurs)";
    }

    updateScores();
    updateActiveCards();
    addHistory(historyText);
    saveData();

    resultTitle.textContent = title;
    resultText.textContent = text;
    modalTimer = setTimeout(() => {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }, MODAL_DELAY);
  }

  // ---------- Ordinateur ----------
  function scheduleCpu() {
    clearTimeout(cpuTimer);
    statusEl.innerHTML = `L'ordinateur réfléchit… ${markHTML(state.current)}`;
    cpuTimer = setTimeout(() => {
      if (!state.over) play(chooseCpuMove());
    }, CPU_DELAY);
  }

  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const emptyCells = (board) => board.map((v, i) => (v ? null : i)).filter((i) => i !== null);

  // Renvoie la case qui fait gagner `player`, ou null
  function winningMove(board, player) {
    for (const i of emptyCells(board)) {
      board[i] = player;
      const wins = findWinner(board) !== null;
      board[i] = null;
      if (wins) return i;
    }
    return null;
  }

  // Minimax : l'ordinateur ne peut pas perdre en mode « Difficile »
  function minimax(board, turn, me, foe, depth) {
    const w = findWinner(board);
    if (w) return w.player === me ? 10 - depth : depth - 10;
    if (board.every(Boolean)) return 0;

    const results = [];
    for (const i of emptyCells(board)) {
      board[i] = turn;
      results.push(minimax(board, turn === me ? foe : me, me, foe, depth + 1));
      board[i] = null;
    }
    return turn === me ? Math.max(...results) : Math.min(...results);
  }

  function bestMove(board, me, foe) {
    const empties = emptyCells(board);
    if (empties.length === 9) return randomItem([0, 2, 4, 6, 8]); // premier coup : évite un calcul inutile

    let best = -Infinity;
    let moves = [];
    for (const i of empties) {
      board[i] = me;
      const score = minimax(board, foe, me, foe, 1);
      board[i] = null;
      if (score > best) { best = score; moves = [i]; }
      else if (score === best) { moves.push(i); }
    }
    return randomItem(moves);
  }

  function chooseCpuMove() {
    const board = state.board.slice();
    const me = cpuSymbol();
    const foe = humanSymbol();
    const empties = emptyCells(board);

    switch (difficultySel.value) {
      case "easy":
        return randomItem(empties);
      case "medium": {
        const win = winningMove(board, me);
        if (win !== null) return win;
        const block = winningMove(board, foe);
        if (block !== null) return block;
        if (!board[4]) return 4;
        return randomItem(empties);
      }
      default: // "hard"
        return bestMove(board, me, foe);
    }
  }

  // ---------- Réglages ----------
  function syncSettings() {
    const cpu = isCpuMode();
    difficultySel.disabled = !cpu;
    symbolRadios.forEach((r) => { r.disabled = !cpu; });
  }

  // ---------- Événements ----------
  boardEl.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell || state.over || isCpuTurn()) return;
    play(Number(cell.dataset.index));
  });

  document.getElementById("btn-restart").addEventListener("click", newGame);
  document.getElementById("btn-replay").addEventListener("click", newGame);

  document.getElementById("btn-reset-scores").addEventListener("click", () => {
    scores = { X: 0, O: 0, draw: 0 };
    history = [];
    updateScores();
    renderHistory();
    saveData();
    newGame();
  });

  // Changer un réglage relance une nouvelle partie
  document.querySelectorAll('input[name="mode"], input[name="symbol"]').forEach((input) => {
    input.addEventListener("change", () => {
      syncSettings();
      newGame();
    });
  });
  difficultySel.addEventListener("change", newGame);

  // ---------- Démarrage ----------
  loadData();
  updateScores();
  renderHistory();
  syncSettings();
  newGame();
})();