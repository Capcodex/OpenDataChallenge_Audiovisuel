/**
 * Panneau latéral (E2-02, maquette « Carte et fiche »). Sans sélection : présentation de la carte.
 * Avec sélection : fiche du média, ou explication de l'effectif insuffisant (RG-02).
 *
 * La fiche se ferme par son bouton et par la touche Échap (EF-M3-09). Ouverte depuis la recherche
 * ou une fiche voisine, elle reçoit le focus : les lecteurs d'écran annoncent le média.
 */
import { useEffect, useRef } from "preact/hooks";

import {
  autresParId,
  fermer,
  noeudsParId,
  ouverture,
  proprietaireActif,
  selection,
  vue,
} from "../etat/magasin";
import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";
import { Fiche, FicheInsuffisante } from "./Fiche";
import { ListeProprietaires, SyntheseProprietaire } from "./Proprietaires";
import { ID_RECHERCHE } from "./Recherche";

export function Panneau({ donnees }: { donnees: Graphe }) {
  const id = selection.value;
  const media = id ? noeudsParId.value.get(id) : undefined;
  const autre = id && !media ? autresParId.value.get(id) : undefined;
  const titre = useRef<HTMLHeadingElement>(null);
  const panneau = useRef<HTMLElement>(null);
  const ouvert = Boolean(media ?? autre);

  useEffect(() => {
    const o = ouverture.value;
    if (o && o.id === id && o.provenance !== "carte") titre.current?.focus();
    // Chaque nouvelle ouverture, même du même média, renvoie le focus au titre.
  }, [id, ouverture.value?.numero]);

  useEffect(() => {
    if (!ouvert) return;
    const surEchap = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return; // Échap ferme d'abord la fenêtre ouverte
      const focusDansPanneau = panneau.current?.contains(document.activeElement) ?? false;
      fermer();
      // Le focus ne doit pas rester sur un élément qui disparaît.
      if (focusDansPanneau) document.getElementById(ID_RECHERCHE)?.focus();
    };
    addEventListener("keydown", surEchap);
    return () => removeEventListener("keydown", surEchap);
  }, [ouvert]);

  // Vue Propriétaires sans fiche ouverte : synthèse du propriétaire choisi, ou liste des propriétaires.
  if (!ouvert && vue.value === "proprietaires" && proprietaireActif.value) {
    return (
      <aside class="panneau" aria-label={fr.proprietaires.synthese}>
        <SyntheseProprietaire donnees={donnees} id={proprietaireActif.value} />
      </aside>
    );
  }

  if (!ouvert) {
    return (
      <aside class="panneau" aria-labelledby="panneau-titre">
        <h2 id="panneau-titre">{fr.accueil.titre}</h2>
        <p>{fr.accueil.invitation}</p>
        <ul class="panneau__reperes">
          {fr.accueil.reperes.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p class="panneau__discret">
          {fr.accueil.resume(donnees.nodes.length, donnees.edges.filter((e) => e.shown).length)}
        </p>
        {vue.value === "proprietaires" && <ListeProprietaires donnees={donnees} />}
      </aside>
    );
  }

  return (
    <aside ref={panneau} class="panneau fiche" aria-label={fr.fiche.libelle}>
      {media ? (
        <Fiche donnees={donnees} media={media} titre={titre} />
      ) : (
        autre && <FicheInsuffisante donnees={donnees} media={autre} titre={titre} />
      )}
    </aside>
  );
}
