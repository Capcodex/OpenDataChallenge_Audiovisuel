import { useEffect, useState } from "preact/hooks";

import { Bandeau } from "./composants/Bandeau";
import { Carte, webglDisponible } from "./composants/Carte";
import { EnTete } from "./composants/EnTete";
import { BoutonExport } from "./composants/Export";
import { Legende } from "./composants/Legende";
import { PageMethode } from "./composants/PageMethode";
import { Panneau } from "./composants/Panneau";
import { PiedDePage } from "./composants/PiedDePage";
import { FiltresTypes } from "./composants/FiltresTypes";
import { PageTableau, Tableau } from "./composants/Tableau";
import { donnees, erreur, page, synchroniserUrl } from "./etat/magasin";
import type { Graphe } from "./graph/types";
import { chargerGraphe } from "./graph/charger";
import { fr } from "./i18n/fr";

function PageCarte({ donnees: g }: { donnees: Graphe }) {
  const [webgl] = useState(webglDisponible);
  return (
    <main class="principal">
      {webgl ? (
        <div class="principal__carte">
          <div class="barre-carte">
            <FiltresTypes donnees={g} />
            <div class="barre-carte__actions">
              <a class="bouton" href="/tableau">
                {fr.actions.vueTableau}
              </a>
              <BoutonExport donnees={g} />
            </div>
          </div>
          <Carte donnees={g} />
          <Legende donnees={g} />
        </div>
      ) : (
        // Bascule automatique (ENF-08, maquette « États », cas 5) : tout reste accessible.
        <div class="principal__carte">
          <p class="message-alerte" role="alert">
            {fr.tableau.sansWebgl}
          </p>
          <Tableau donnees={g} titre={false} />
        </div>
      )}
      <Panneau donnees={g} />
    </main>
  );
}

function Contenu({ donnees: g }: { donnees: Graphe }) {
  switch (page.value) {
    case "methode":
      return <PageMethode />;
    case "tableau":
      return <PageTableau donnees={g} />;
    default:
      return <PageCarte donnees={g} />;
  }
}

export function App() {
  useEffect(() => {
    let arreter: (() => void) | undefined;
    chargerGraphe()
      .then((g) => {
        donnees.value = g;
        // Seule la carte reflète son état dans l'adresse (/media/<id>?type=…&famille=…).
        if (page.value === "carte") arreter = synchroniserUrl(g);
      })
      .catch((e: unknown) => (erreur.value = e instanceof Error ? e.message : String(e)));
    return () => arreter?.();
  }, []);

  useEffect(() => {
    document.title = fr.pages[page.value].titre;
  }, []);

  const g = donnees.value;
  return (
    <div class="page">
      <EnTete />
      {g && page.value === "carte" && <Bandeau edition={g.meta.edition} />}
      {erreur.value ? (
        <main class="principal">
          <p class="message" role="alert">
            {erreur.value}
          </p>
        </main>
      ) : page.value === "methode" ? (
        // La méthode ne dépend pas des données : affichée sans attendre graph.json.
        <PageMethode />
      ) : !g ? (
        <main class="principal">
          {/* Maquette « États », cas 6 : squelette de la carte pendant le chargement. */}
          <div class="chargement" aria-busy="true">
            <div class="chargement__carte">
              <p role="status">{fr.etats.chargement}</p>
            </div>
            <div class="chargement__panneau" />
          </div>
        </main>
      ) : (
        <Contenu donnees={g} />
      )}
      {g && <PiedDePage meta={g.meta} />}
    </div>
  );
}
