"use strict";

/* =========================================================
   ArcadeHub : authentification simulée (front-end seulement)
   À charger sur TOUTES les pages, avant le script de la page.

   ATTENTION : tout est stocké dans le navigateur (localStorage).
   Ce n'est pas sécurisé : c'est une simulation pour un projet
   universitaire. Un vrai site vérifie les mots de passe côté serveur.
   ========================================================= */
(() => {
  const USERS_KEY = "arcadehub-users";
  const SESSION_KEY = "arcadehub-session";

  // ---------- Stockage ----------
  function read(store, key, fallback) {
    try {
      const value = JSON.parse(store.getItem(key));
      return value === null || value === undefined ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  const getUsers = () => {
    const users = read(localStorage, USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  };

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- Outils ----------
  function randomHex(bytes) {
    const arr = new Uint8Array(bytes);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
    else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Mot de passe + sel -> empreinte SHA-256 (le mot de passe n'est jamais stocké en clair)
  async function hashPassword(password, salt) {
    if (window.crypto && crypto.subtle) {
      const data = new TextEncoder().encode(salt + password);
      const buffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Repli très simple si Web Crypto n'est pas disponible (page ouverte hors HTTPS/localhost)
    let h = 5381;
    const s = salt + password;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "x" + (h >>> 0).toString(16);
  }

  const publicUser = (u) => ({ id: u.id, pseudo: u.pseudo, email: u.email, createdAt: u.createdAt });

  // ---------- Session ----------
  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignoré */ }
  }

  // « Se souvenir de moi » : localStorage (reste après fermeture) sinon sessionStorage
  function setSession(id, remember) {
    clearSession();
    try {
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ id }));
    } catch (e) { /* ignoré */ }
  }

  function currentUser() {
    const session = read(sessionStorage, SESSION_KEY, null) || read(localStorage, SESSION_KEY, null);
    if (!session) return null;
    const user = getUsers().find((u) => u.id === session.id);
    return user ? publicUser(user) : null;
  }

  const playerName = () => {
    const user = currentUser();
    return user ? user.pseudo : "Invité";
  };

  // ---------- Inscription et connexion ----------
  async function register({ pseudo, email, password, remember = true }) {
    const users = getUsers();
    const cleanPseudo = pseudo.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some((u) => u.pseudo.toLowerCase() === cleanPseudo.toLowerCase())) return { ok: false, error: "pseudo" };
    if (users.some((u) => u.email === cleanEmail)) return { ok: false, error: "email" };

    const salt = randomHex(16);
    const user = {
      id: randomHex(8),
      pseudo: cleanPseudo,
      email: cleanEmail,
      salt,
      hash: await hashPassword(password, salt),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    if (!saveUsers(users)) return { ok: false, error: "storage" };

    setSession(user.id, remember);
    return { ok: true, user: publicUser(user) };
  }

  async function login({ identifier, password, remember }) {
    const id = identifier.trim().toLowerCase();
    const user = getUsers().find((u) => u.email === id || u.pseudo.toLowerCase() === id);
    if (!user) return { ok: false, error: "credentials" };

    const hash = await hashPassword(password, user.salt);
    if (hash !== user.hash) return { ok: false, error: "credentials" };

    setSession(user.id, Boolean(remember));
    return { ok: true, user: publicUser(user) };
  }

  // ---------- Gestion du compte connecté ----------
  function sessionUserId() {
    const session = read(sessionStorage, SESSION_KEY, null) || read(localStorage, SESSION_KEY, null);
    return session ? session.id : null;
  }

  async function updateProfile({ pseudo, email }) {
    const users = getUsers();
    const me = users.find((u) => u.id === sessionUserId());
    if (!me) return { ok: false, error: "session" };

    const cleanPseudo = pseudo.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (users.some((u) => u.id !== me.id && u.pseudo.toLowerCase() === cleanPseudo.toLowerCase())) return { ok: false, error: "pseudo" };
    if (users.some((u) => u.id !== me.id && u.email === cleanEmail)) return { ok: false, error: "email" };

    const oldPseudo = me.pseudo;
    me.pseudo = cleanPseudo;
    me.email = cleanEmail;
    if (!saveUsers(users)) return { ok: false, error: "storage" };
    return { ok: true, user: publicUser(me), oldPseudo };
  }

  async function changePassword({ current, next }) {
    const users = getUsers();
    const me = users.find((u) => u.id === sessionUserId());
    if (!me) return { ok: false, error: "session" };
    if ((await hashPassword(current, me.salt)) !== me.hash) return { ok: false, error: "credentials" };

    me.salt = randomHex(16);
    me.hash = await hashPassword(next, me.salt);
    return saveUsers(users) ? { ok: true } : { ok: false, error: "storage" };
  }

  async function deleteAccount(password) {
    const users = getUsers();
    const me = users.find((u) => u.id === sessionUserId());
    if (!me) return { ok: false, error: "session" };
    if ((await hashPassword(password, me.salt)) !== me.hash) return { ok: false, error: "credentials" };

    if (!saveUsers(users.filter((u) => u.id !== me.id))) return { ok: false, error: "storage" };
    clearSession();
    return { ok: true };
  }

  const logout = () => clearSession();

  // ---------- Bouton de la navbar (#connex) ----------
  function refreshNavbar() {
    const btn = document.getElementById("connex");
    if (!btn) return;
    document.querySelectorAll(".navbar-user").forEach((n) => n.remove());

    const user = currentUser();
    if (user) {
      const hello = document.createElement("a");
      hello.className = "navbar-user";
      hello.href = "./profil.html";
      hello.textContent = `Bonjour, ${user.pseudo}`;
      btn.before(hello);
      btn.textContent = "Déconnexion";
      btn.onclick = () => {
        logout();
        location.reload();
      };
    } else {
      btn.textContent = "Se connecter";
      btn.onclick = () => {
        if (document.body.dataset.authPage !== undefined) {
          const field = document.getElementById("login-identifier");
          if (field) field.focus();
          return;
        }
        const page = location.pathname.split("/").pop() || "Arcadehub.html";
        location.href = `./connexion.html?next=${encodeURIComponent(page)}`;
      };
    }
  }

  window.ArcadeAuth = { register, login, logout, currentUser, playerName, refreshNavbar, updateProfile, changePassword, deleteAccount };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshNavbar);
  else refreshNavbar();
})();