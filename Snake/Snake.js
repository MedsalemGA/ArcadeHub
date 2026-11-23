"use strict";

/* =========================================================
   Jeu Snake : logique
   Fonctionne avec snake.html et snake.css
   ========================================================= */
(() => {
  // ---------- Constantes ----------
  const GRID = 20;                 // 20 x 20 cases
  const CELL = 20;                 // taille d'une case en pixels (résolution interne)
  const FOODS_PER_LEVEL = 5;       // pommes à manger pour passer au niveau suivant
  const SPEEDUP_PER_LEVEL = 6;     // ms gagnées par niveau
  const MIN_DELAY = 50;            // vitesse maximale (ms entre deux déplacements)
  const BASE_DELAY = { easy: 150, medium: 110, hard: 80 };
  const TOP_MAX = 5;
  const STORAGE_KEY = "arcadehub-snake";

  const DIRS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 }
  };

  const KEY_MAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", z: "up", s: "down", a: "left", q: "left", d: "right"
  };

  // ---------- Éléments du DOM ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = GRID * CELL;
  canvas.height = GRID * CELL;

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const levelEl = document.getElementById("level");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnRestart = document.getElementById("btn-restart");
  const difficultySel = document.getElementById("difficulty");
  const wrapToggle = document.getElementById("wrap-toggle");
  const historyEl = document.getElementById("history");
  const wrapEl = document.querySelector(".snake-wrap");

  // ---------- Couleurs (lues dans les variables CSS du site) ----------
  const css = getComputedStyle(document.documentElement);
  const cssVar = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const COLORS = {
    cellA: cssVar("--bg", "#0f1020"),
    cellB: cssVar("--surface", "#1a1b33"),
    snake: cssVar("--accent", "#7c5cff"),
    head: cssVar("--accent-2", "#22d3a6"),
    food: cssVar("--gold", "gold")
  };

  // ---------- État ----------
  let snake, dir, queue, food;
  let score, level, eaten;
  let status = "ready";            // "ready" | "running" | "paused" | "over"
  let timer = null;
  let top = [];

  // ---------- Sauvegarde ----------
  function loadTop() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && Array.isArray(data.top)) top = data.top;
    } catch (e) { /* on garde la liste vide */ }
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
    } else {
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
    bestEl.textContent = top.length ? top[0].score : 0;
  }

  function recordScore() {
    if (score <= 0) return;
    const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    top.push({ score, level, date, player: window.ArcadeAuth ? window.ArcadeAuth.playerName() : "Invité" });
    top.sort((a, b) => b.score - a.score);
    top = top.slice(0, TOP_MAX);
    saveTop();
    renderTop();
  }

  // ---------- Vitesse ----------
  function currentDelay() {
    const base = BASE_DELAY[difficultySel.value] || BASE_DELAY.medium;
    return Math.max(MIN_DELAY, base - (level - 1) * SPEEDUP_PER_LEVEL);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(tick, currentDelay());
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  // ---------- Affichage de l'overlay ----------
  function showOverlay(title, text, buttonLabel) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    btnStart.textContent = buttonLabel;
    overlay.hidden = false;
  }

  function updateHud() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
  }

  // ---------- Initialisation d'une partie ----------
  function reset() {
    stopTimer();
    const mid = Math.floor(GRID / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    dir = DIRS.right;
    queue = [];
    score = 0;
    level = 1;
    eaten = 0;
    status = "ready";
    placeFood();
    updateHud();
    draw();
    btnPause.disabled = true;
    btnPause.textContent = "Pause";
    showOverlay("Prêt à jouer ?", "Dirigez le serpent avec les flèches ou Z Q S D.", "Jouer");
  }

  function start() {
    status = "running";
    overlay.hidden = true;
    btnPause.disabled = false;
    startTimer();
  }

  function pause() {
    if (status !== "running") return;
    status = "paused";
    stopTimer();
    btnPause.textContent = "Reprendre";
    showOverlay("Pause", "Appuyez sur Espace ou sur le bouton pour reprendre.", "Reprendre");
  }

  function resume() {
    if (status !== "paused") return;
    btnPause.textContent = "Pause";
    start();
  }

  function togglePause() {
    if (status === "running") pause();
    else if (status === "paused") resume();
  }

  function gameOver(won = false) {
    status = "over";
    stopTimer();
    btnPause.disabled = true;
    recordScore();
    draw();
    showOverlay(
      won ? "Bravo, tableau complet !" : "Partie terminée",
      `Score : ${score} points, niveau ${level}.`,
      "Rejouer"
    );
  }

  // ---------- Nourriture ----------
  function placeFood() {
    const free = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  // ---------- Direction ----------
  function setDirection(name) {
    const next = DIRS[name];
    if (!next) return;
    const last = queue.length ? queue[queue.length - 1] : dir;
    const isReverse = next.x === -last.x && next.y === -last.y;
    const isSame = next.x === last.x && next.y === last.y;
    if (isReverse || isSame || queue.length >= 2) return;
    queue.push(next);
  }

  function handleDirection(name) {
    if (status === "over") return;
    if (status === "paused") return;
    if (status === "ready") start();
    setDirection(name);
  }

  // ---------- Boucle de jeu ----------
  function tick() {
    if (queue.length) dir = queue.shift();

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (wrapToggle.checked) {
      head.x = (head.x + GRID) % GRID;
      head.y = (head.y + GRID) % GRID;
    } else if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      return gameOver();
    }

    const willEat = food && head.x === food.x && head.y === food.y;
    // Si le serpent ne mange pas, sa queue libère sa case
    const body = willEat ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);

    if (willEat) {
      eaten++;
      score += 10 * level;
      if (eaten % FOODS_PER_LEVEL === 0) {
        level++;
        startTimer(); // le serpent accélère
      }
      placeFood();
      if (!food) { updateHud(); return gameOver(true); }
    } else {
      snake.pop();
    }

    updateHud();
    draw();
  }

  // ---------- Dessin ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    // Fond en damier
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.cellA : COLORS.cellB;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Pomme
    if (food) {
      ctx.fillStyle = COLORS.food;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }

    // Corps (du bout de la queue vers la tête)
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      ctx.fillStyle = i === 0 ? COLORS.head : COLORS.snake;
      roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 5);
      ctx.fill();
    }

    // Yeux sur la tête
    const h = snake[0];
    const cx = h.x * CELL + CELL / 2;
    const cy = h.y * CELL + CELL / 2;
    const f = CELL * 0.18;  // décalage vers l'avant
    const p = CELL * 0.2;   // écartement des yeux
    ctx.fillStyle = COLORS.cellA;
    [[1, -1], [-1, 1]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.arc(cx + dir.x * f + a * dir.y * p * -1, cy + dir.y * f + b * dir.x * p * -1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---------- Événements : clavier ----------
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("select, input, textarea")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.code === "Space") {
      e.preventDefault();
      if (status === "ready") start();
      else if (status === "over") { reset(); start(); }
      else togglePause();
      return;
    }

    const name = KEY_MAP[e.key] || KEY_MAP[e.key.toLowerCase()];
    if (name) {
      e.preventDefault();
      handleDirection(name);
    }
  });

  // ---------- Événements : croix tactile ----------
  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleDirection(btn.dataset.dir));
  });

  // ---------- Événements : glissement sur le plateau ----------
  let touchStart = null;
  wrapEl.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  wrapEl.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // trop court : on ignore
    if (Math.abs(dx) > Math.abs(dy)) handleDirection(dx > 0 ? "right" : "left");
    else handleDirection(dy > 0 ? "down" : "up");
  }, { passive: true });

  // ---------- Événements : boutons ----------
  btnStart.addEventListener("click", () => {
    if (status === "ready") start();
    else if (status === "paused") resume();
    else if (status === "over") { reset(); start(); }
  });
  btnPause.addEventListener("click", togglePause);
  btnRestart.addEventListener("click", reset);
  difficultySel.addEventListener("change", reset);
  wrapToggle.addEventListener("change", reset);

  // Pause automatique si l'onglet n'est plus visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });

  // ---------- Démarrage ----------
  loadTop();
  renderTop();
  reset();
})();