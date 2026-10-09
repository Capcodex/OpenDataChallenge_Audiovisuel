/**
 * Calque propriétaires (E4-02, EF-M4-02, T-073, maquette « Calque propriétaires »).
 *
 * Choisir un propriétaire dans la liste fait ressortir tous ses médias sur la carte. Le choix est
 * dans l'adresse (/proprietaires?proprietaire=<id>, CdC technique § 9.1) : la vue se partage.
 * Seules les données de la base de propriété, avec leur source et leur date, sont affichées.
 */
import { useEffect, useMemo, useState } from "preact/hooks";

import { mediasDuProprietaire, proprietaireActif } from "../etat/magasin";
import { formaterDate } from "../fiche/fiche-donnees";
import type { Graphe, Noeud, Proprietaire } from "../graph/types";
import { formaterPart, fr } from "../i18n/fr";
import { normaliser } from "../texte/normaliser";
import { Carte, webglDisponible } from "./Carte";
import { BoutonExport } from "./Export";
import { Legende } from "./Legende";

export interface LigneProprietaire {
  proprietaire: Proprietaire;
  medias: { noeud: Noeud; part: number | null }[];
  groupes: string[];
}

/** Propriétaires ayant au moins un média sur la carte, du plus grand nombre de médias au plus petit. */
export function listerProprietaires(g: Graphe): LigneProprietaire[] {
  return g.owners
    .map((proprietaire) => {
      const medias = g.nodes.flatMap((noeud) =>
        noeud.owners.filter((o) => o.id === proprietaire.id).map((o) => ({ noeud, part: o.share })),
      );
      const groupes = [
        ...new Set(medias.map((m) => m.noeud.group).filter((x): x is string => !!x)),
      ];
      return { proprietaire, medias, groupes };
    })
    .filter((l) => l.medias.length > 0)
    .sort(
      (a, b) =>
        b.medias.length - a.medias.length ||
        a.proprietaire.name.localeCompare(b.proprietaire.name, "fr"),
    );
}

const lireAdresse = (ids: Set<string>) => {
  const id = new URLSearchParams(location.search).get("proprietaire");
  return id && ids.has(id) ? id : null;
};

export function PageProprietaires({ donnees: g }: { donnees: Graphe }) {
  const lignes = useMemo(() => listerProprietaires(g), [g]);
  const ids = useMemo(() => new Set(lignes.map((l) => l.proprietaire.id)), [lignes]);
  const [filtre, setFiltre] = useState("");
  const [webgl] = useState(webglDisponible);

  // Adresse → état au chargement et au retour arrière ; état → adresse à chaque choix.
  useEffect(() => {
    const lire = () => (proprietaireActif.value = lireAdresse(ids));
    lire();
    addEventListener("popstate", lire);
    return () => {
      removeEventListener("popstate", lire);
      proprietaireActif.value = null;
    };
  }, [ids]);

  const choisir = (id: string) => {
    const nouveau = proprietaireActif.value === id ? null : id;
    proprietaireActif.value = nouveau;
    history.pushState(
      null,
      "",
      nouveau ? `/proprietaires?proprietaire=${nouveau}` : "/proprietaires",
    );
  };

  const q = normaliser(filtre);
  const visibles = q
    ? lignes.filter((l) =>
        [l.proprietaire.name, ...l.groupes].some((x) => normaliser(x).includes(q)),
      )
    : lignes;
  const actif = lignes.find((l) => l.proprietaire.id === proprietaireActif.value);
  const familles = new Map(g.communities.map((c) => [c.id, c]));
  const nonIdentifies = g.nodes.filter((n) => n.owner_status === "non_identifie").length;
  const p = fr.proprietaires;

  return (
    <main class="principal principal--trois">
      <aside class="panneau proprietaires" aria-labelledby="proprietaires-titre">
        <h1 id="proprietaires-titre">{p.titre}</h1>
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
                onClick={() => choisir(l.proprietaire.id)}
              >
                <span class="proprietaires__nom">{l.proprietaire.name}</span>
                <span class="proprietaires__nombre">{p.nombreMedias(l.medias.length)}</span>
              </button>
            </li>
          ))}
        </ul>
        {visibles.length === 0 && <p>{p.aucun}</p>}
        <p class="panneau__discret">{p.nonIdentifies(nonIdentifies)}</p>
      </aside>

      <section class="principal__carte" aria-label={p.carte}>
        <div class="barre-carte">
          <span />
          <div class="barre-carte__actions">
            <BoutonExport
              donnees={g}
              misEnAvant={mediasDuProprietaire.value}
              titre={actif ? fr.export.titreProprietaire(actif.proprietaire.name) : undefined}
            />
          </div>
        </div>
        {webgl ? (
          <Carte donnees={g} surClic={(id) => location.assign(`/media/${id}`)} />
        ) : (
          <p class="message-alerte">{fr.etats.sansWebgl}</p>
        )}
        <Legende familles={g.communities} affichees={g.meta.communities_displayed} />
      </section>

      <aside class="panneau" aria-label={p.synthese} aria-live="polite">
        {actif ? (
          <>
            <span class="panneau__type">{p.selectionne}</span>
            <h2>{actif.proprietaire.name}</h2>
            <p class="panneau__discret">
              {p.type[actif.proprietaire.type] ?? actif.proprietaire.type}
              {actif.groupes.length > 0 && ` · ${p.via(actif.groupes)}`}
            </p>
            <h3>{p.medias}</h3>
            <ul class="proprietaires__medias">
              {actif.medias.map(({ noeud, part }) => {
                const famille = g.meta.communities_displayed
                  ? familles.get(noeud.community)
                  : undefined;
                return (
                  <li key={noeud.id}>
                    <span
                      class="legende__pastille"
                      style={famille ? { background: famille.color } : undefined}
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
              <p>{p.familles(new Set(actif.medias.map((m) => m.noeud.community)).size)}</p>
            )}
            <p class="panneau__discret">
              {fr.fiche.sourcePropriete(
                actif.proprietaire.source,
                formaterDate(actif.proprietaire.as_of),
              )}
            </p>
          </>
        ) : (
          <p>{p.choisir}</p>
        )}
      </aside>
    </main>
  );
}
