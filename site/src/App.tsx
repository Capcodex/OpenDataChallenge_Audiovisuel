import { useEffect } from "preact/hooks";

import { Bandeau } from "./composants/Bandeau";
import { Carte } from "./composants/Carte";
import { EnTete } from "./composants/EnTete";
import { Legende } from "./composants/Legende";
import { Panneau } from "./composants/Panneau";
import { PiedDePage } from "./composants/PiedDePage";
import { donnees, erreur, synchroniserUrl } from "./etat/magasin";
import { chargerGraphe } from "./graph/charger";
import { fr } from "./i18n/fr";

export function App() {
  useEffect(() => {
    let arreter: (() => void) | undefined;
    chargerGraphe()
      .then((g) => {
        donnees.value = g;
        arreter = synchroniserUrl(g);
      })
      .catch((e: unknown) => (erreur.value = e instanceof Error ? e.message : String(e)));
    return () => arreter?.();
  }, []);

  const g = donnees.value;
  return (
    <div class="page">
      <EnTete />
      {g && <Bandeau edition={g.meta.edition} />}
      <main class="principal">
        {erreur.value ? (
          <p class="message" role="alert">
            {erreur.value}
          </p>
        ) : !g ? (
          <p class="message" aria-busy="true">
            {fr.etats.chargement}
          </p>
        ) : (
          <>
            <div class="principal__carte">
              <Carte donnees={g} />
              <Legende familles={g.communities} affichees={g.meta.communities_displayed} />
            </div>
            <Panneau donnees={g} />
          </>
        )}
      </main>
      {g && <PiedDePage meta={g.meta} />}
    </div>
  );
}
