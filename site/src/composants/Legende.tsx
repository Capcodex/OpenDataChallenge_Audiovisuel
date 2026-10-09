import type { Famille } from "../graph/types";
import { filtreFamille } from "../etat/magasin";
import { fr } from "../i18n/fr";

/**
 * Légende permanente (E1-02). Si les familles ne sont pas assez stables (RG-07), la carte est
 * affichée sans couleurs et la légende l'explique.
 */
export function Legende({ familles, affichees }: { familles: Famille[]; affichees: boolean }) {
  return (
    <section class="legende" aria-labelledby="legende-titre">
      <h2 id="legende-titre" class="legende__titre">
        {fr.legende.titre}
      </h2>
      {affichees ? (
        <ul class="legende__familles">
          {familles.map((f) => {
            const active = filtreFamille.value === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  class="legende__famille"
                  aria-pressed={active}
                  title={fr.legende.filtrerFamille(f.label)}
                  onClick={() => (filtreFamille.value = active ? null : f.id)}
                >
                  <span class="legende__pastille" style={{ background: f.color }} />
                  <span>{f.label}</span>
                  <span class="legende__taille">{fr.legende.taille(f.size)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p class="legende__sans-familles">{fr.legende.sansFamilles}</p>
      )}
      <p class="legende__lecture">{fr.legende.lecture}</p>
    </section>
  );
}
