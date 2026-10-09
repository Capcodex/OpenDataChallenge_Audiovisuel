import { useMemo } from "preact/hooks";

import { changerVue, filtreFamille, proprietaireActif, vue } from "../etat/magasin";
import type { Vue } from "../etat/url";
import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";
import { libellePosition, valeurPosition } from "../familles/position";
import { legendeProprietaires } from "../proprietaires/couleurs";
import { choisirProprietaire } from "./Proprietaires";

const VUES: Vue[] = ["proprietaires", "familles"];

/**
 * Légende permanente de la carte (E1-02, V2) : choix de la vue (couleur des points), puis la
 * légende de cette vue. Vue Propriétaires : les 7 propriétaires principaux les plus représentés,
 * cliquables pour faire ressortir leurs médias. Vue Familles : les familles, cliquables pour filtrer ;
 * si elles ne sont pas assez stables (RG-07), la carte est sans couleurs et la légende l'explique.
 */
export function Legende({ donnees: g }: { donnees: Graphe }) {
  const entrees = useMemo(() => legendeProprietaires(g), [g]);
  const enProprietaires = vue.value === "proprietaires";

  return (
    <section class="legende" aria-labelledby="legende-titre">
      <div class="legende__entete">
        <h2 id="legende-titre" class="legende__titre">
          {enProprietaires ? fr.legende.titreProprietaires : fr.legende.titre}
        </h2>
        <div class="filtres" role="group" aria-label={fr.legende.vue}>
          {VUES.map((v) => (
            <button
              key={v}
              type="button"
              class="filtre"
              aria-pressed={vue.value === v}
              onClick={() => changerVue(v)}
            >
              {fr.legende.vues[v]}
            </button>
          ))}
        </div>
      </div>

      {enProprietaires ? (
        <ul class="legende__familles">
          {entrees.map((e) => {
            const nom =
              e.libelle ??
              (e.cle === "autres" ? fr.legende.autresProprietaires : fr.legende.nonIdentifie);
            const contenu = (
              <>
                <span class="legende__pastille" style={{ background: e.couleur }} />
                <span>{nom}</span>
                <span class="legende__taille">{fr.legende.taille(e.medias)}</span>
              </>
            );
            return (
              <li key={e.cle}>
                {e.libelle ? (
                  <button
                    type="button"
                    class="legende__famille"
                    aria-pressed={proprietaireActif.value === e.cle}
                    title={fr.legende.filtrerProprietaire(e.libelle)}
                    onClick={() => choisirProprietaire(e.cle)}
                  >
                    {contenu}
                  </button>
                ) : (
                  <span class="legende__famille legende__famille--fixe">{contenu}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : g.meta.communities_displayed ? (
        <ul class="legende__familles">
          {g.communities.map((f) => {
            const active = filtreFamille.value === f.id;
            const position = libellePosition(f, g.communities);
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
                  <span class="legende__famille-texte">
                    <span>
                      {f.label} <span class="legende__taille">{fr.legende.taille(f.size)}</span>
                    </span>
                    {position && (
                      <span class="legende__position">
                        {position} · {valeurPosition(f)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p class="legende__sans-familles">{fr.legende.sansFamilles}</p>
      )}
      {enProprietaires && <p class="legende__lecture">{fr.legende.lectureProprietaires}</p>}
      {!enProprietaires && g.meta.communities_displayed && (
        <p class="legende__lecture">
          {g.communities.some((c) => c.position) ? fr.familles.lecture : fr.familles.proches}
        </p>
      )}
      <p class="legende__lecture">{fr.legende.lecture}</p>
    </section>
  );
}
