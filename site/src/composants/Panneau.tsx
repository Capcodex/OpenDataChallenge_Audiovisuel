import { noeudsParId, selection, voisins } from "../etat/magasin";
import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";

/**
 * Panneau latéral. Sans sélection : présentation de la carte (maquette « Explorer le paysage
 * médiatique »). Avec sélection : aperçu du média et de ses voisins ; la fiche complète (profil du
 * public, propriété) arrive au sprint 6.
 */
export function Panneau({ donnees }: { donnees: Graphe }) {
  const media = selection.value ? noeudsParId.value.get(selection.value) : undefined;
  if (!media) {
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
      </aside>
    );
  }
  return (
    <aside class="panneau" aria-labelledby="panneau-titre">
      <span class="panneau__type">{fr.types[media.type]}</span>
      <h2 id="panneau-titre">{media.label}</h2>
      <p class="panneau__effectif">
        {fr.fiche.effectif(media.n)}
        {media.fragile && <span class="badge-fragile">{fr.fiche.fragile}</span>}
      </p>
      <h3>{fr.fiche.voisinsTitre}</h3>
      <ol class="panneau__voisins">
        {voisins.value.slice(0, 8).map(({ id, lien }) => (
          <li key={id}>
            <button type="button" onClick={() => (selection.value = id)}>
              {noeudsParId.value.get(id)?.label ?? id}
            </button>
            <span class="panneau__chiffre">{fr.fiche.voisin(lien.lift, lien.n)}</span>
          </li>
        ))}
      </ol>
      <p class="panneau__discret">{fr.fiche.lectureLift}</p>
      <button type="button" class="panneau__fermer" onClick={() => (selection.value = null)}>
        {fr.actions.fermer}
      </button>
    </aside>
  );
}
