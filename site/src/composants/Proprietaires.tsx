/**
 * Calque propriétaires (E4-02, EF-M4-02), intégré à la carte en V2 : liste filtrable des
 * propriétaires et synthèse du propriétaire choisi, dans le panneau latéral. Seules les données de
 * la base de propriété, avec leur source et leur date, sont affichées.
 */
import { useMemo, useState } from "preact/hooks";

import { proprietaireActif } from "../etat/magasin";
import { formaterDate } from "../fiche/fiche-donnees";
import type { Graphe } from "../graph/types";
import { formaterPart, fr } from "../i18n/fr";
import { couleursProprietaires } from "../proprietaires/couleurs";
import { listerProprietaires } from "../proprietaires/liste";
import { normaliser } from "../texte/normaliser";

/** Choisir un propriétaire ; le choisir à nouveau le désélectionne. */
export function choisirProprietaire(id: string): void {
  proprietaireActif.value = proprietaireActif.value === id ? null : id;
}

export function ListeProprietaires({ donnees: g }: { donnees: Graphe }) {
  const lignes = useMemo(() => listerProprietaires(g), [g]);
  const [filtre, setFiltre] = useState("");
  const p = fr.proprietaires;
  const q = normaliser(filtre);
  const visibles = q
    ? lignes.filter((l) =>
        [l.proprietaire.name, ...l.groupes].some((x) => normaliser(x).includes(q)),
      )
    : lignes;
  const nonIdentifies = g.nodes.filter((n) => n.owner_status === "non_identifie").length;

  return (
    <section class="proprietaires" aria-labelledby="proprietaires-titre">
      <h2 id="proprietaires-titre">{p.titre}</h2>
      <p class="panneau__discret">{p.invitation}</p>
      <label for="filtre-proprietaire" class="champ__libelle">
        {p.filtre}
      </label>
      <input
        id="filtre-proprietaire"
        class="champ"
        type="search"
        placeholder={p.filtreExemple}
        value={filtre}
        onInput={(e) => setFiltre(e.currentTarget.value)}
      />
      <ul class="proprietaires__liste" aria-label={p.liste}>
        {visibles.map((l) => (
          <li key={l.proprietaire.id}>
            <button
              type="button"
              class="proprietaires__choix"
              aria-pressed={l.proprietaire.id === proprietaireActif.value}
              onClick={() => choisirProprietaire(l.proprietaire.id)}
            >
              <span class="proprietaires__nom">{l.proprietaire.name}</span>
              <span class="proprietaires__nombre">{p.nombreMedias(l.medias.length)}</span>
            </button>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && <p>{p.aucun}</p>}
      <p class="panneau__discret">{p.nonIdentifies(nonIdentifies)}</p>
    </section>
  );
}

export function SyntheseProprietaire({ donnees: g, id }: { donnees: Graphe; id: string }) {
  const ligne = useMemo(
    () => listerProprietaires(g).find((l) => l.proprietaire.id === id),
    [g, id],
  );
  // Pastilles aux couleurs de la vue Propriétaires, comme les points de la carte.
  const couleurs = useMemo(() => couleursProprietaires(g), [g]);
  if (!ligne) return null;
  const p = fr.proprietaires;
  return (
    <section class="proprietaires" aria-labelledby="synthese-titre" aria-live="polite">
      <span class="panneau__type">{p.selectionne}</span>
      <h2 id="synthese-titre">{ligne.proprietaire.name}</h2>
      <p class="panneau__discret">
        {p.type[ligne.proprietaire.type] ?? ligne.proprietaire.type}
        {ligne.groupes.length > 0 && ` · ${p.via(ligne.groupes)}`}
      </p>
      <h3>{p.medias}</h3>
      <ul class="proprietaires__medias">
        {ligne.medias.map(({ noeud, part }) => {
          const couleur = couleurs.get(noeud.id);
          return (
            <li key={noeud.id}>
              <span
                class="legende__pastille"
                style={couleur ? { background: couleur } : undefined}
              />
              <a href={`/media/${noeud.id}`}>{noeud.label}</a>
              <span class="panneau__chiffre">
                {part === null ? p.partNonChiffree : formaterPart(part)}
              </span>
            </li>
          );
        })}
      </ul>
      {g.meta.communities_displayed && (
        <p>{p.familles(new Set(ligne.medias.map((m) => m.noeud.community)).size)}</p>
      )}
      <p class="panneau__discret">
        {fr.fiche.sourcePropriete(
          ligne.proprietaire.source,
          formaterDate(ligne.proprietaire.as_of),
        )}
      </p>
      <button type="button" class="bouton" onClick={() => (proprietaireActif.value = null)}>
        {p.tous}
      </button>
    </section>
  );
}
