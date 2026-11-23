document.addEventListener("DOMContentLoaded", () => {
   const elementTexte = document.querySelector(".typewriter");
  if (elementTexte) {
    const texteComplet = elementTexte.textContent.trim();
    elementTexte.textContent = "";
    let index = 0;

    function ecrireLettre() {
      if (index < texteComplet.length) {
        elementTexte.textContent += texteComplet.charAt(index);
        index++;
        setTimeout(ecrireLettre, 60);
      }
    }
    ecrireLettre();
  }

  // 2. Défilement par ordre de rôle des images de jeux
  const cards = document.querySelectorAll(".game-card");
  let currentIndex = 0;

  function activerCarte(index) {
    cards.forEach(card => card.classList.remove("active"));
    cards[index].classList.add("active");
    currentIndex = index;
  }

  if (cards.length > 0) {
    // Passage automatique toutes les 3 secondes
    let interval = setInterval(() => {
      let nextIndex = (currentIndex + 1) % cards.length;
      activerCarte(nextIndex);
    }, 3000);

    // Bonus : permet de cliquer sur un jeu pour le mettre en avant
    cards.forEach((card, index) => {
      card.addEventListener("click", () => {
        clearInterval(interval);
        activerCarte(index);
      });
    });
  }
  const banner = document.getElementById("cookie-banner");
  const form = document.getElementById("cookie-form");
  const btnAccepter = document.getElementById("btn-accepter");
  const btnRefuser = document.getElementById("btn-refuser");

  // 1. Initialisation (équivalent ngOnInit) : cacher si déjà validé
  if (localStorage.getItem("preferencesCookies")) {
    banner.style.display = "none";
    return;
  }

  // 2. Tout accepter
  btnAccepter.addEventListener("click", () => {
    const choix = { necessaire: true, analytique: true, marketing: true };
    localStorage.setItem("preferencesCookies", JSON.stringify(choix));
    banner.style.display = "none";
  });

  // 3. Tout refuser
  btnRefuser.addEventListener("click", () => {
    const choix = { necessaire: true, analytique: false, marketing: false };
    localStorage.setItem("preferencesCookies", JSON.stringify(choix));
    banner.style.display = "none";
  });

  // 4. Enregistrer les choix personnalisés
  form.addEventListener("submit", (event) => {
    event.preventDefault(); // Empêche le rechargement de la page
    const choix = {
      necessaire: true,
      analytique: document.getElementById("cookie-analytique").checked,
      marketing: document.getElementById("cookie-marketing").checked
    };
    localStorage.setItem("preferencesCookies", JSON.stringify(choix));
    banner.style.display = "none";
  });
  animerCompteur("matchesnbr", matchesnbr, 1500);
animerCompteur("gamenbr", gamesnbr, 1500);
animerCompteur("registerplayer", playersnbr, 1500);
});

let gamesnbr = 8;
let matchesnbr = 2536;
let playersnbr = 152;

function animerCompteur(id, valeurFinale, duree = 4500) {
  const element = document.getElementById(id);
  const debut = performance.now();

  function mettreAJour(tempsActuel) {
    const tempsEcoule = tempsActuel - debut;
    // Calcule la progression entre 0 et 1
    const progression = Math.min(tempsEcoule / duree, 1);
    
    // Effet de ralentissement naturel à la fin (ease-out)
    const progressionFluide = 1 - Math.pow(1 - progression, 3);
    const valeurActuelle = Math.floor(progressionFluide * valeurFinale);

    element.textContent = valeurActuelle;

    if (progression < 1) {
      requestAnimationFrame(mettreAJour);
    } else {
      element.textContent = valeurFinale; // Garantit la valeur exacte à la fin
    }
  }

  requestAnimationFrame(mettreAJour);
}

// Lancement des animations (durée en millisecondes : 1500ms = 1.5s)
animerCompteur("matchesnbr", matchesnbr, 1500);
animerCompteur("gamenbr", gamesnbr, 1500);
animerCompteur("registerplayer", playersnbr, 1500);
