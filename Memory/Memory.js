"use strict";

/* =========================================================
   Memory : logique
   Fonctionne avec memory.html et memory.css
   ========================================================= */
(() => {
  // ---------- Constantes ----------
  const PICSUM = "https://picsum.photos/seed";   // /seed/{graine}/{largeur}/{hauteur}
  const PAIRS = [3, 4, 6, 8, 10, 12, 15];        // paires par niveau (le dernier palier se répète)
  const COLS = [3, 4, 4, 4, 5, 6, 6];            // colonnes de la grille par niveau
  const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ".split("");

  const MATCH_POINTS = 100;
  const STREAK_BONUS = 10;     // points par paire consécutive (à partir de la 2e)
  const TIME_BONUS = 10;       // points par seconde restante en fin de niveau
  const LEVEL_BONUS = 50;      // points × numéro du niveau
  const PRELOAD_TIMEOUT = 6000;
  const ROADMAP_LEVELS = 7;
  const TOP_MAX = 5;
  const STORAGE_KEY = "arcadehub-memory";

  // ---------- Difficulté selon le niveau ----------
  function levelConfig(level) {
    const i = Math.min(level - 1, PAIRS.length - 1);
    const pairs = PAIRS[i];
    return {
      level,
      pairs,
      cols: COLS[i],
      time: Math.max(pairs * 6 + 10, pairs * 11 + 20 - (level - 1) * 4),        // secondes
      preview: Math.max(1, Math.round((3 - (level - 1) * 0.3) * 10) / 10),      // aperçu des cartes
      flipDelay: Math.max(450, 900 - (level - 1) * 60),                         // temps pour voir une erreur (ms)
      shuffleEvery: level >= 4 ? Math.max(2, 8 - level) : 0                     // mélange après N erreurs
    };
  }

  function describeLevel(cfg) {
    const shuffle = cfg.shuffleEvery ? `, mélange toutes les ${cfg.shuffleEvery} erreurs` : "";
    return `${cfg.pairs * 2} cartes, ${cfg.time} s${shuffle}`;
  }

  // ---------- Éléments du DOM ----------
  const $ = (id) => document.getElementById(id);
  const board = $("board");
  const levelEl = $("level");
  const scoreEl = $("score");
  const pairsEl = $("pairs");
  const timerText = $("timer-text");
  const timerBar = $("timer-bar");
  const messageEl = $("message");
  const overlay = $("overlay");
  const overlayTitle = $("overlay-title");
  const overlayText = $("overlay-text");
  const btnStart = $("btn-start");
  const btnPause = $("btn-pause");
  const btnRestart = $("btn-restart");
  const cardType = $("card-type");
  const roadmapEl = $("levels-list");
  const historyEl = $("history");

  // ---------- État ----------
  let game;
  let timerId = null;
  let overlayAction = null;
  let runToken = 0;          // change à chaque nouvelle partie pour ignorer les actions « en retard »
  let top = [];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------- Sauvegarde ----------
  function loadTop() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && Array.isArray(data.top)) top = data.top;
    } catch (e) { /* liste vide par défaut */ }
  }

  function saveTop() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ top }));
    } catch (e) { /* stockage indisponible : on ignore */ }
  }

  function renderTop() {
    historyEl.innerHTML = "";
    if (top.length === 0) {
      const li = document.createElement("li");
      li.className = "list-group-item history-empty";
      li.textContent = "Aucune partie jouée pour le moment.";
      historyEl.append(li);
      return;
    }
    top.forEach((t) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      const left = document.createElement("span");
      left.className = "ms-2 me-auto";
      left.textContent = `${t.score} points (niveau ${t.level})`;
      const date = document.createElement("small");
      date.className = "text-body-secondary";
      date.textContent = t.date;
      li.append(left, date);
      historyEl.append(li);
    });
  }

  function recordRun() {
    if (game.score <= 0) return;
    const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    top.push({ score: game.score, level: game.level, date, player: window.ArcadeAuth ? window.ArcadeAuth.playerName() : "Invité" });
    top.sort((a, b) => b.score - a.score);
    top = top.slice(0, TOP_MAX);
    saveTop();
    renderTop();
  }

  // ---------- Affichage ----------
  function setMessage(text, kind = "") {
    messageEl.textContent = text;
    messageEl.className = `message ${kind}`.trim();
  }

  function showOverlay(title, text, buttonLabel, action) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayAction = action || null;
    btnStart.hidden = !buttonLabel;
    if (buttonLabel) btnStart.textContent = buttonLabel;
    overlay.hidden = false;
  }

  const hideOverlay = () => { overlay.hidden = true; };

  function updateHud() {
    const cfg = game.cfg || levelConfig(game.level);
    levelEl.textContent = game.level;
    scoreEl.textContent = game.score;
    pairsEl.textContent = `${game.found}/${cfg.pairs}`;
  }

  function renderRoadmap() {
    roadmapEl.innerHTML = "";
    const addItem = (level, current) => {
      const cfg = levelConfig(level);
      const li = document.createElement("li");
      li.className = "list-group-item";
      if (level < game.level) li.classList.add("done");
      if (current) li.classList.add("current");
      const left = document.createElement("span");
      left.textContent = `Niveau ${level}`;
      const right = document.createElement("span");
      right.textContent = `${cfg.pairs * 2} cartes · ${cfg.time} s${cfg.shuffleEvery ? " · mélange" : ""}`;
      li.append(left, right);
      roadmapEl.append(li);
    };
    for (let l = 1; l <= ROADMAP_LEVELS; l++) addItem(l, l === game.level);
    if (game.level > ROADMAP_LEVELS) addItem(game.level, true);
  }

  // ---------- Chrono ----------
  const remaining = () => Math.max(0, (game.deadline - Date.now()) / 1000);

  function updateTimerUI() {
    const total = game.cfg ? game.cfg.time : levelConfig(game.level).time;
    const left = game.status === "playing" ? remaining() : game.timeLeft;
    timerText.textContent = `${Math.ceil(left)} s`;
    timerBar.style.width = `${(left / total) * 100}%`;
    timerBar.classList.toggle("warn", left <= total * 0.3 && left > 10);
    timerBar.classList.toggle("danger", left <= 10);
  }

  function runTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      updateTimerUI();
      if (remaining() <= 0) gameOver();
    }, 100);
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  // ---------- Construction d'un niveau ----------
  function preload(url) {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(false), PRELOAD_TIMEOUT);
      img.onload = () => { clearTimeout(timeout); resolve(true); };
      img.onerror = () => { clearTimeout(timeout); resolve(false); };
      img.src = url;
    });
  }

  // Une graine aléatoire différente = une photo différente à chaque niveau et à chaque partie
  async function buildItems(pairs) {
    const hueBase = Math.floor(Math.random() * 360);
    const letters = shuffle(LETTERS).slice(0, pairs);
    const items = letters.map((letter, i) => ({
      id: i,
      letter,
      hue: (hueBase + i * Math.round(360 / pairs)) % 360,
      url: null,
      ok: false
    }));

    if (cardType.value === "photos") {
      items.forEach((it) => {
        it.url = `${PICSUM}/${Math.random().toString(36).slice(2, 10)}/240/240`;
      });
      const results = await Promise.all(items.map((it) => preload(it.url)));
      results.forEach((ok, i) => { items[i].ok = ok; });
    }
    return items;
  }

  function createCardElement(card) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mem-card";
    btn.dataset.id = card.id;

    const inner = document.createElement("span");
    inner.className = "mem-inner";

    const back = document.createElement("span");
    back.className = "mem-face mem-back";
    back.setAttribute("aria-hidden", "true");
    back.textContent = "?";

    const front = document.createElement("span");
    front.className = "mem-face mem-front";
    front.setAttribute("aria-hidden", "true");
    if (card.item.ok) {
      const img = document.createElement("img");
      img.src = card.item.url;
      img.alt = "";
      img.draggable = false;
      front.append(img);
    } else {
      front.classList.add("tile");
      front.style.backgroundColor = `hsl(${card.item.hue} 65% 35%)`;
      front.textContent = card.item.letter;
    }

    inner.append(back, front);
    btn.append(inner);
    return btn;
  }

  function renderBoard() {
    board.style.setProperty("--cols", game.cfg.cols);
    board.innerHTML = "";
    game.cards.forEach((card) => board.append(createCardElement(card)));
    refreshLabels();
  }

  // Grille de cartes cachées affichée avant le début de la partie
  function renderPlaceholder() {
    const cfg = levelConfig(1);
    board.style.setProperty("--cols", cfg.cols);
    board.innerHTML = "";
    for (let i = 0; i < cfg.pairs * 2; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mem-card";
      btn.tabIndex = -1;
      btn.setAttribute("aria-hidden", "true");
      btn.innerHTML = '<span class="mem-inner"><span class="mem-face mem-back">?</span></span>';
      board.append(btn);
    }
  }

  const cardElement = (card) => board.querySelector(`[data-id="${card.id}"]`);

  // Libellés accessibles mis à jour selon la position et l'état de chaque carte
  function refreshLabels() {
    Array.from(board.children).forEach((btn, pos) => {
      const card = game.cards[Number(btn.dataset.id)];
      if (!card) return;
      const desc = card.item.ok ? `photo ${card.pair + 1}` : `lettre ${card.item.letter}`;
      const state = card.matched ? `${desc}, trouvée` : card.flipped ? desc : "face cachée";
      btn.setAttribute("aria-label", `Carte ${pos + 1}, ${state}`);
    });
  }

  function setFlipped(card, on) {
    card.flipped = on;
    cardElement(card).classList.toggle("flipped", on);
  }

  // ---------- Déroulement ----------
  function resetRun() {
    runToken++;
    stopTimer();
    game = {
      level: 1, score: 0, found: 0, streak: 0, mistakes: 0,
      cfg: null, cards: [], open: [], locked: true,
      status: "idle", timeLeft: levelConfig(1).time, deadline: 0
    };
    btnPause.disabled = true;
    btnPause.textContent = "Pause";
    updateHud();
    updateTimerUI();
    renderRoadmap();
    renderPlaceholder();
    setMessage("");
    showOverlay("Prêt à jouer ?", "Mémorisez les cartes, puis retrouvez toutes les paires avant la fin du chrono.", "Commencer", loadLevel);
  }

  async function loadLevel() {
    const token = runToken;
    const cfg = levelConfig(game.level);
    game.cfg = cfg;
    game.found = 0;
    game.streak = 0;
    game.mistakes = 0;
    game.open = [];
    game.locked = true;
    game.status = "loading";
    game.timeLeft = cfg.time;
    btnPause.disabled = true;
    updateHud();
    updateTimerUI();
    renderRoadmap();
    setMessage("");
    showOverlay(`Niveau ${cfg.level}`, cardType.value === "photos" ? "Chargement des photos…" : "Préparation des cartes…", null);

    const items = await buildItems(cfg.pairs);
    if (token !== runToken) return; // la partie a été relancée entre-temps

    game.cards = shuffle(items.flatMap((it) => [it, it])).map((item, id) => ({
      id, pair: item.id, item, flipped: false, matched: false
    }));
    renderBoard();
    hideOverlay();

    if (cardType.value === "photos" && items.every((it) => !it.ok)) {
      setMessage("Photos indisponibles : des symboles sont utilisés.", "bad");
      await sleep(1500);
      if (token !== runToken) return;
    }
    startPreview(token);
  }

  async function startPreview(token) {
    const cfg = game.cfg;
    game.status = "preview";
    setMessage(`Mémorisez les cartes… (${cfg.preview} s)`);
    game.cards.forEach((c) => setFlipped(c, true));
    refreshLabels();

    await sleep(cfg.preview * 1000);
    if (token !== runToken) return;

    game.cards.forEach((c) => setFlipped(c, false));
    refreshLabels();
    await sleep(500); // le temps que les cartes se retournent
    if (token !== runToken) return;

    game.status = "playing";
    game.locked = false;
    game.timeLeft = cfg.time;
    game.deadline = Date.now() + cfg.time * 1000;
    runTimer();
    btnPause.disabled = false;
    setMessage("À vous de jouer !");
  }

  function onCardClick(card) {
    setFlipped(card, true);
    game.open.push(card);
    refreshLabels();
    if (game.open.length === 2) {
      game.locked = true;
      resolvePair();
    }
  }

  function resolvePair() {
    const [a, b] = game.open;
    const token = runToken;

    if (a.pair === b.pair) {
      [a, b].forEach((c) => {
        c.matched = true;
        cardElement(c).classList.add("matched");
      });
      game.streak++;
      game.found++;
      const points = MATCH_POINTS + (game.streak - 1) * STREAK_BONUS;
      game.score += points;
      game.open = [];
      game.locked = false;
      setMessage(`Paire trouvée ! +${points} points`, "ok");
      updateHud();
      refreshLabels();
      if (game.found === game.cfg.pairs) levelComplete();
      return;
    }

    game.streak = 0;
    game.mistakes++;
    setMessage("Raté…", "bad");
    setTimeout(() => {
      if (token !== runToken) return;
      setFlipped(a, false);
      setFlipped(b, false);
      game.open = [];
      if (game.cfg.shuffleEvery && game.mistakes % game.cfg.shuffleEvery === 0) shuffleBoard();
      game.locked = false;
      refreshLabels();
    }, game.cfg.flipDelay);
  }

  // Niveau 4 et plus : les cartes non trouvées changent de place
  function shuffleBoard() {
    const nodes = Array.from(board.children);
    const slots = nodes.map((n, i) => i).filter((i) => !nodes[i].classList.contains("matched"));
    if (slots.length < 3) return;
    const moved = shuffle(slots.map((i) => nodes[i]));
    slots.forEach((slot, k) => { nodes[slot] = moved[k]; });
    nodes.forEach((n) => board.append(n));
    moved.forEach((n) => n.classList.add("shuffling"));
    setTimeout(() => moved.forEach((n) => n.classList.remove("shuffling")), 650);
    setMessage("Les cartes se mélangent !", "bad");
  }

  async function levelComplete() {
    const token = runToken;
    const left = Math.round(remaining());
    stopTimer();
    game.status = "between";
    game.locked = true;
    btnPause.disabled = true;

    const bonus = left * TIME_BONUS + game.level * LEVEL_BONUS;
    game.score += bonus;
    updateHud();

    await sleep(700); // laisse voir la dernière paire
    if (token !== runToken) return;

    const next = levelConfig(game.level + 1);
    showOverlay(
      `Niveau ${game.level} réussi !`,
      `Bonus : +${bonus} points. Prochain niveau : ${describeLevel(next)}.`,
      "Niveau suivant",
      () => { game.level++; loadLevel(); }
    );
  }

  function gameOver() {
    stopTimer();
    game.status = "over";
    game.locked = true;
    game.timeLeft = 0;
    updateTimerUI();
    btnPause.disabled = true;
    recordRun();
    setMessage("");
    showOverlay(
      "Temps écoulé !",
      `Score : ${game.score} points. Niveau atteint : ${game.level}.`,
      "Rejouer",
      () => { resetRun(); loadLevel(); }
    );
  }

  // ---------- Pause ----------
  function pause() {
    if (game.status !== "playing") return;
    game.timeLeft = remaining();
    stopTimer();
    game.status = "paused";
    game.locked = true;
    btnPause.textContent = "Reprendre";
    showOverlay("Pause", "Le chrono est arrêté.", "Reprendre", resume);
  }

  function resume() {
    if (game.status !== "paused") return;
    game.status = "playing";
    game.locked = game.open.length >= 2;
    game.deadline = Date.now() + game.timeLeft * 1000;
    btnPause.textContent = "Pause";
    hideOverlay();
    runTimer();
  }

  // ---------- Événements ----------
  board.addEventListener("click", (e) => {
    const btn = e.target.closest(".mem-card");
    if (!btn || game.status !== "playing" || game.locked) return;
    const card = game.cards[Number(btn.dataset.id)];
    if (!card || card.flipped || card.matched) return;
    onCardClick(card);
  });

  btnStart.addEventListener("click", () => { if (overlayAction) overlayAction(); });
  btnPause.addEventListener("click", () => (game.status === "paused" ? resume() : pause()));
  btnRestart.addEventListener("click", resetRun);
  cardType.addEventListener("change", resetRun);

  // Pause automatique si l'onglet n'est plus visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });

  // ---------- Démarrage ----------
  loadTop();
  renderTop();
  resetRun();
})();