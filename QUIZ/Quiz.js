"use strict";

/* =========================================================
   Quiz Culture : logique
   Fonctionne avec quiz.html et quiz.css
   ========================================================= */
(() => {
  // ---------- Constantes ----------
  const API_BASE = "https://opentdb.com";
  const QUESTION_TIME = 20;        // secondes par question
  const TICK = 100;                // mise à jour du chrono (ms)
  const FETCH_TIMEOUT = 8000;      // délai maximum d'une requête (ms)
  const BASE_POINTS = 100;
  const SPEED_BONUS = 5;           // points par seconde restante
  const STREAK_BONUS = 10;         // points par réponse correcte consécutive (à partir de la 2e)
  const TOP_MAX = 5;
  const STORAGE_KEY = "arcadehub-quiz";

  const DIFFICULTY = {
    easy:   { label: "Facile",    badge: "text-bg-success" },
    medium: { label: "Moyen",     badge: "text-bg-warning" },
    hard:   { label: "Difficile", badge: "text-bg-danger" }
  };

  // ---------- Banque de questions locales (français) ----------
  // c = catégorie, d = difficulté, q = question, a = bonne réponse, w = mauvaises réponses
  const LOCAL_QUESTIONS = [
    // Tunisie
    { c: "Tunisie", d: "easy",   q: "Quelle est la capitale de la Tunisie ?", a: "Tunis", w: ["Sfax", "Sousse", "Kairouan"] },
    { c: "Tunisie", d: "easy",   q: "Quelle est la monnaie de la Tunisie ?", a: "Le dinar tunisien", w: ["L'euro", "Le dirham", "Le franc"] },
    { c: "Tunisie", d: "easy",   q: "Quelle est la plus grande île de Tunisie ?", a: "Djerba", w: ["Kerkennah", "La Galite", "Zembra"] },
    { c: "Tunisie", d: "medium", q: "En quelle année la Tunisie est-elle devenue indépendante ?", a: "1956", w: ["1945", "1962", "1970"] },
    { c: "Tunisie", d: "medium", q: "Quel site antique près de Tunis fut la capitale d'un empire maritime ?", a: "Carthage", w: ["Dougga", "Sbeïtla", "El Jem"] },
    { c: "Tunisie", d: "medium", q: "Quelle ville tunisienne est connue pour sa Grande Mosquée et comme ville sainte de l'islam ?", a: "Kairouan", w: ["Monastir", "Gabès", "Bizerte"] },
    { c: "Tunisie", d: "hard",   q: "Quel est le plus haut sommet de Tunisie ?", a: "Jebel Chambi", w: ["Jebel Zaghouan", "Jebel Bargou", "Jebel Serj"] },
    { c: "Tunisie", d: "hard",   q: "Quel est le plus long fleuve de Tunisie ?", a: "La Medjerda", w: ["Le Miliane", "Le Nebhana", "Le Zeroud"] },
    // Culture générale
    { c: "Culture générale", d: "easy",   q: "Quelle est la capitale du Japon ?", a: "Tokyo", w: ["Kyoto", "Osaka", "Séoul"] },
    { c: "Culture générale", d: "easy",   q: "Quel est le plus grand océan du monde ?", a: "L'océan Pacifique", w: ["L'océan Atlantique", "L'océan Indien", "L'océan Arctique"] },
    { c: "Culture générale", d: "easy",   q: "Quelle planète est la plus proche du Soleil ?", a: "Mercure", w: ["Vénus", "Mars", "La Terre"] },
    { c: "Culture générale", d: "medium", q: "Qui a écrit « Les Misérables » ?", a: "Victor Hugo", w: ["Émile Zola", "Honoré de Balzac", "Alexandre Dumas"] },
    { c: "Culture générale", d: "medium", q: "Quel est le symbole chimique de l'or ?", a: "Au", w: ["Ag", "Or", "Fe"] },
    { c: "Culture générale", d: "hard",   q: "Combien d'os compte le corps humain adulte ?", a: "206", w: ["186", "212", "256"] },
    { c: "Culture générale", d: "hard",   q: "Quelle est la capitale de l'Australie ?", a: "Canberra", w: ["Sydney", "Melbourne", "Perth"] },
    // Informatique
    { c: "Informatique", d: "easy",   q: "Quel langage décrit le style visuel d'une page web ?", a: "CSS", w: ["HTML", "SQL", "Python"] },
    { c: "Informatique", d: "easy",   q: "Que signifie HTML ?", a: "HyperText Markup Language", w: ["High Tech Modern Language", "HyperTool Multi Language", "Home Text Markup Level"] },
    { c: "Informatique", d: "medium", q: "Quel framework CSS a été créé à l'origine chez Twitter ?", a: "Bootstrap", w: ["Tailwind", "Bulma", "Foundation"] },
    { c: "Informatique", d: "medium", q: "Quel objet du navigateur garde des données après la fermeture de la page ?", a: "localStorage", w: ["console", "Math", "JSON"] },
    { c: "Informatique", d: "hard",   q: "Que renvoie typeof null en JavaScript ?", a: "\"object\"", w: ["\"null\"", "\"undefined\"", "\"number\""] },
    { c: "Informatique", d: "hard",   q: "Quelle balise HTML5 sert à regrouper les liens de navigation principaux ?", a: "<nav>", w: ["<header>", "<aside>", "<menu>"] }
  ];

  // ---------- Éléments du DOM ----------
  const $ = (id) => document.getElementById(id);
  const screens = { setup: $("screen-setup"), play: $("screen-play"), result: $("screen-result") };

  const setupForm = $("setup-form");
  const sourceSel = $("source");
  const categorySel = $("category");
  const difficultySel = $("difficulty");
  const amountSel = $("amount");
  const sourceHint = $("source-hint");
  const setupAlert = $("setup-alert");
  const btnLaunch = $("btn-launch");
  const launchSpinner = $("launch-spinner");
  const launchLabel = $("launch-label");

  const qCounter = $("q-counter");
  const scoreEl = $("score");
  const streakEl = $("streak");
  const timerText = $("timer-text");
  const progressWrap = $("quiz-progress");
  const progressBar = $("progress-bar");
  const timerBar = $("timer-bar");
  const questionCard = $("question-card");
  const qCategory = $("q-category");
  const qDifficulty = $("q-difficulty");
  const questionEl = $("question");
  const answersEl = $("answers");
  const feedbackEl = $("feedback");
  const btn5050 = $("btn-5050");
  const btnQuit = $("btn-quit");
  const btnNext = $("btn-next");

  const historyEl = $("history");

  // ---------- État ----------
  let game = null;
  let timerId = null;
  let apiCategories = null;     // mis en cache après le premier chargement
  let lastSettings = null;
  let top = [];

  // ---------- Utilitaires ----------
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
  }

  function showAlert(message, type = "warning") {
    setupAlert.className = `alert alert-${type}`;
    setupAlert.textContent = message;
    setupAlert.hidden = false;
  }

  function setLoading(on) {
    btnLaunch.disabled = on;
    launchSpinner.hidden = !on;
    launchLabel.textContent = on ? "Chargement des questions…" : "Commencer le quiz";
  }

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.status === 429) throw new Error("rate");
      if (!res.ok) throw new Error("http");
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // ---------- Sauvegarde des meilleures parties ----------
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
      left.textContent = `${t.score} pts (${t.correct}/${t.total})`;
      const date = document.createElement("small");
      date.className = "text-body-secondary";
      date.textContent = t.date;
      li.append(left, date);
      historyEl.append(li);
    });
  }

  // ---------- Catégories (dynamiques selon la source) ----------
  function fillCategories(list) {
    categorySel.innerHTML = "";
    const all = new Option("Toutes les catégories", "");
    categorySel.append(all);
    list.forEach(({ value, label }) => categorySel.append(new Option(label, value)));
  }

  async function loadCategories() {
    if (sourceSel.value === "local") {
      sourceHint.textContent = "Questions en français, disponibles sans connexion.";
      const names = [...new Set(LOCAL_QUESTIONS.map((q) => q.c))];
      fillCategories(names.map((n) => ({ value: n, label: n })));
      categorySel.disabled = false;
      return;
    }

    sourceHint.textContent = "Questions en anglais, fournies par Open Trivia DB.";
    categorySel.disabled = true;

    if (!apiCategories) {
      try {
        const data = await fetchJSON(`${API_BASE}/api_category.php`);
        apiCategories = data.trivia_categories.map((c) => ({ value: String(c.id), label: c.name }));
      } catch (e) {
        showAlert("Impossible de charger les catégories en ligne. Les questions locales ont été sélectionnées à la place.");
        sourceSel.value = "local";
        return loadCategories();
      }
    }
    if (sourceSel.value !== "api") return; // l'utilisateur a changé de source entre-temps
    fillCategories(apiCategories);
    categorySel.disabled = false;
  }

  // ---------- Récupération des questions ----------
  function buildQuestion({ category, difficulty, question, correct, wrong }) {
    return {
      category,
      difficulty,
      question,
      correct,
      answers: shuffle([correct, ...wrong])
    };
  }

  async function getApiQuestions({ amount, category, difficulty }) {
    const params = new URLSearchParams({ amount, type: "multiple", encode: "url3986" });
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);

    const data = await fetchJSON(`${API_BASE}/api.php?${params}`);
    if (data.response_code === 5) throw new Error("rate");
    if (data.response_code !== 0 || !data.results.length) throw new Error("empty");

    const dec = decodeURIComponent; // les textes sont encodés (url3986) : plus de &quot; ni &#039;
    return data.results.map((r) => buildQuestion({
      category: dec(r.category),
      difficulty: dec(r.difficulty),
      question: dec(r.question),
      correct: dec(r.correct_answer),
      wrong: r.incorrect_answers.map(dec)
    }));
  }

  function getLocalQuestions({ amount, category, difficulty }) {
    const pool = LOCAL_QUESTIONS.filter((q) =>
      (!category || q.c === category) && (!difficulty || q.d === difficulty));
    if (!pool.length) throw new Error("empty");
    return shuffle(pool).slice(0, amount).map((q) => buildQuestion({
      category: q.c, difficulty: q.d, question: q.q, correct: q.a, wrong: q.w
    }));
  }

  function errorMessage(err) {
    if (err.message === "rate") return "L'API limite le nombre de requêtes. Patientez 5 secondes puis réessayez.";
    if (err.message === "empty") return "Pas assez de questions pour ces réglages. Essayez une autre catégorie ou une autre difficulté.";
    return "Impossible de contacter Open Trivia DB. Vérifiez votre connexion ou choisissez les questions locales.";
  }

  function readSettings() {
    return {
      source: sourceSel.value,
      category: categorySel.value,
      difficulty: difficultySel.value,
      amount: Number(amountSel.value)
    };
  }

  async function launch(settings) {
    lastSettings = settings;
    setupAlert.hidden = true;
    setLoading(true);
    try {
      const questions = settings.source === "api"
        ? await getApiQuestions(settings)
        : getLocalQuestions(settings);
      startGame(questions);
    } catch (err) {
      show("setup");
      showAlert(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ---------- Déroulement du jeu ----------
  function startGame(questions) {
    game = {
      questions, index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0,
      used5050: false, hintThisQuestion: false, answered: false, current: null, deadline: 0
    };
    updateHud();
    show("play");
    loadQuestion();
  }

  function updateHud() {
    scoreEl.textContent = game.score;
    streakEl.textContent = `x${game.streak}`;
  }

  function setProgress(done) {
    const pct = Math.round((done / game.questions.length) * 100);
    progressBar.style.width = `${pct}%`;
    progressWrap.setAttribute("aria-valuenow", String(pct));
  }

  function loadQuestion() {
    const q = game.questions[game.index];
    game.current = q;
    game.answered = false;
    game.hintThisQuestion = false;

    qCounter.textContent = `${game.index + 1}/${game.questions.length}`;
    setProgress(game.index);

    qCategory.textContent = q.category;
    const diff = DIFFICULTY[q.difficulty];
    qDifficulty.className = `badge ${diff ? diff.badge : "text-bg-secondary"}`;
    qDifficulty.textContent = diff ? diff.label : q.difficulty;
    questionEl.textContent = q.question;

    answersEl.innerHTML = "";
    q.answers.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-btn";
      btn.dataset.index = i;
      const key = document.createElement("span");
      key.className = "answer-key";
      key.textContent = i + 1;
      const label = document.createElement("span");
      label.textContent = text;
      btn.append(key, label);
      answersEl.append(btn);
    });

    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    btnNext.hidden = true;
    btn5050.disabled = game.used5050;

    // Rejoue l'animation d'entrée de la carte
    questionCard.classList.remove("q-enter");
    void questionCard.offsetWidth;
    questionCard.classList.add("q-enter");

    startTimer();
  }

  // ---------- Chronomètre ----------
  const remaining = () => Math.max(0, (game.deadline - Date.now()) / 1000);

  function updateTimer() {
    const r = remaining();
    timerText.textContent = `${Math.ceil(r)} s`;
    timerBar.style.width = `${(r / QUESTION_TIME) * 100}%`;
    timerBar.classList.toggle("warn", r <= 10 && r > 5);
    timerBar.classList.toggle("danger", r <= 5);
    return r;
  }

  function startTimer() {
    stopTimer();
    game.deadline = Date.now() + QUESTION_TIME * 1000;
    updateTimer();
    timerId = setInterval(() => {
      if (updateTimer() <= 0) answer(-1); // temps écoulé
    }, TICK);
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  // ---------- Réponse ----------
  function answer(choice) {
    if (!game || game.answered) return;
    game.answered = true;
    const timeLeft = remaining();
    stopTimer();

    const q = game.current;
    const correctIndex = q.answers.indexOf(q.correct);
    const buttons = Array.from(answersEl.children);
    buttons.forEach((b) => { b.disabled = true; });
    buttons[correctIndex].classList.add("correct");

    if (choice === correctIndex) {
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      game.correct++;
      let points = BASE_POINTS + Math.round(timeLeft) * SPEED_BONUS + (game.streak - 1) * STREAK_BONUS;
      if (game.hintThisQuestion) points = Math.round(points / 2);
      game.score += points;
      buttons[choice].classList.add("pop");
      feedbackEl.textContent = `Bonne réponse ! +${points} points`;
      feedbackEl.className = "feedback ok";
    } else {
      game.streak = 0;
      if (choice >= 0) buttons[choice].classList.add("wrong");
      feedbackEl.textContent = choice < 0
        ? `Temps écoulé ! La bonne réponse était : ${q.correct}`
        : `Raté ! La bonne réponse était : ${q.correct}`;
      feedbackEl.className = "feedback bad";
    }

    updateHud();
    setProgress(game.index + 1);
    btn5050.disabled = true;
    btnNext.textContent = game.index + 1 === game.questions.length ? "Voir les résultats" : "Question suivante";
    btnNext.hidden = false;
    btnNext.focus(); // Entrée ou Espace passent à la suite
  }

  // Joker 50/50 : élimine deux mauvaises réponses
  function useFiftyFifty() {
    if (!game || game.answered || game.used5050) return;
    game.used5050 = true;
    game.hintThisQuestion = true;
    btn5050.disabled = true;

    const q = game.current;
    const wrongIndexes = q.answers.map((a, i) => i).filter((i) => q.answers[i] !== q.correct);
    shuffle(wrongIndexes).slice(0, 2).forEach((i) => {
      const btn = answersEl.children[i];
      btn.disabled = true;
      btn.classList.add("eliminated");
    });
  }

  // ---------- Fin de partie ----------
  function countUp(el, to, duration = 900) {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = Math.round(to * t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function finish() {
    stopTimer();
    const total = game.questions.length;
    const accuracy = Math.round((game.correct / total) * 100);
    const previousBest = top.length ? top[0].score : 0;
    const isRecord = game.score > previousBest;

    if (game.score > 0) {
      const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      top.push({ score: game.score, correct: game.correct, total, date, player: window.ArcadeAuth ? window.ArcadeAuth.playerName() : "Invité" });
      top.sort((a, b) => b.score - a.score);
      top = top.slice(0, TOP_MAX);
      saveTop();
      renderTop();
    }

    let title, text;
    if (accuracy >= 80) { title = "Excellent !"; text = "Vous maîtrisez le sujet."; }
    else if (accuracy >= 50) { title = "Bien joué !"; text = "Un petit effort de plus pour atteindre le sommet."; }
    else { title = "Continuez à vous entraîner"; text = "Chaque partie vous rapproche du meilleur score."; }

    $("result-title").textContent = title;
    $("result-text").textContent = text;
    $("final-correct").textContent = `${game.correct}/${total}`;
    $("final-accuracy").textContent = `${accuracy} %`;
    $("final-streak").textContent = game.bestStreak;
    $("new-record").hidden = !(isRecord && game.score > 0);

    show("result");
    countUp($("final-score"), game.score);
  }

  // ---------- Événements ----------
  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    launch(readSettings());
  });

  sourceSel.addEventListener("change", () => {
    setupAlert.hidden = true;
    loadCategories();
  });

  answersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".answer-btn");
    if (btn && !btn.disabled) answer(Number(btn.dataset.index));
  });

  btn5050.addEventListener("click", useFiftyFifty);

  btnNext.addEventListener("click", () => {
    game.index++;
    if (game.index >= game.questions.length) finish();
    else loadQuestion();
  });

  btnQuit.addEventListener("click", () => {
    stopTimer();
    game = null;
    show("setup");
  });

  $("btn-replay").addEventListener("click", () => launch(lastSettings || readSettings()));
  $("btn-settings").addEventListener("click", () => show("setup"));

  // Touches 1 à 4 pour répondre
  document.addEventListener("keydown", (e) => {
    if (!game || screens.play.hidden || game.answered) return;
    if (e.target.closest("select, input, textarea")) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      const btn = answersEl.children[n - 1];
      if (btn && !btn.disabled) answer(n - 1);
    }
  });

  // ---------- Démarrage ----------
  loadTop();
  renderTop();
  loadCategories();
  show("setup");
})();