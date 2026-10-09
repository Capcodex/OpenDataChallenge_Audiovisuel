/**
 * Filtres par type de média (E1-04, EF-M1-08, T-074, maquette « Carte et fiche »). Plusieurs types
 * peuvent être combinés ; « Tous » les retire. L'état est dans l'adresse (?type=radio,journal) :
 * une carte filtrée se partage et se rouvre à l'identique.
 */
import { filtreTypes } from "../etat/magasin";
import type { Graphe, TypeMedia } from "../graph/types";
import { fr } from "../i18n/fr";
import { TYPES_MEDIA } from "../etat/url";

export function FiltresTypes({ donnees: g }: { donnees: Graphe }) {
  const presents = TYPES_MEDIA.filter((t) => g.nodes.some((n) => n.type === t));
  const actifs = filtreTypes.value;
  const basculer = (t: TypeMedia) =>
    (filtreTypes.value = actifs.includes(t)
      ? actifs.filter((x) => x !== t)
      : [...actifs, t].sort());
  return (
    <div class="filtres" role="group" aria-label={fr.carte.filtresTypes}>
      <button
        type="button"
        class="filtre"
        aria-pressed={actifs.length === 0}
        onClick={() => (filtreTypes.value = [])}
      >
        {fr.carte.tousTypes}
      </button>
      {presents.map((t) => (
        <button
          key={t}
          type="button"
          class="filtre"
          aria-pressed={actifs.includes(t)}
          onClick={() => basculer(t)}
        >
          {fr.carte.typesPluriel[t] ?? t}
        </button>
      ))}
    </div>
  );
}
