/**
 * Vue tableau (ENF-08, T-072, maquette « Tableau ») : toutes les informations de la carte sous
 * forme de liste, utilisable au clavier et aux lecteurs d'écran. Tri par colonne (aria-sort),
 * filtre par nom. Affichée aussi à la place de la carte si WebGL est indisponible.
 */
import { useMemo, useState } from "preact/hooks";

import { cinqVoisins } from "../fiche/fiche-donnees";
import type { Graphe, Noeud } from "../graph/types";
import { fr } from "../i18n/fr";
import { normaliser } from "../texte/normaliser";

type Cle = "media" | "repondants" | "position" | "age";
type Sens = "ascending" | "descending";

const VALEUR: Record<Cle, (n: Noeud) => number | string> = {
  media: (n) => n.label,
  repondants: (n) => n.n,
  position: (n) => n.pol[0],
  age: (n) => n.age[0],
};

/** Trie les médias ; à valeur égale, par nom. Fonction pure, testée. */
export function trier(noeuds: Noeud[], cle: Cle, sens: Sens): Noeud[] {
  const signe = sens === "ascending" ? 1 : -1;
  return [...noeuds].sort((a, b) => {
    const va = VALEUR[cle](a);
    const vb = VALEUR[cle](b);
    const ecart = typeof va === "string" ? va.localeCompare(String(vb), "fr") : va - (vb as number);
    return signe * ecart || a.label.localeCompare(b.label, "fr");
  });
}

function EnTeteTriable({
  cle,
  libelle,
  tri,
  surTri,
  nombre = false,
}: {
  cle: Cle;
  libelle: string;
  tri: { cle: Cle; sens: Sens };
  surTri: (cle: Cle) => void;
  nombre?: boolean;
}) {
  const actif = tri.cle === cle;
  return (
    <th scope="col" aria-sort={actif ? tri.sens : "none"} class="tableau__tri">
      <button
        type="button"
        class={nombre ? "tableau__nombre" : undefined}
        onClick={() => surTri(cle)}
        title={fr.tableau.trier(libelle)}
      >
        {libelle}
        <span aria-hidden="true">{actif ? (tri.sens === "ascending" ? " ▲" : " ▼") : ""}</span>
      </button>
    </th>
  );
}

export function Tableau({ donnees: g, titre = true }: { donnees: Graphe; titre?: boolean }) {
  const [filtre, setFiltre] = useState("");
  const [tri, setTri] = useState<{ cle: Cle; sens: Sens }>({ cle: "media", sens: "ascending" });
  const familles = useMemo(() => new Map(g.communities.map((c) => [c.id, c])), [g]);
  const noms = useMemo(() => new Map(g.nodes.map((n) => [n.id, n.label])), [g]);

  const lignes = useMemo(() => {
    const q = normaliser(filtre);
    const filtres = q
      ? g.nodes.filter((n) => [n.label, ...n.aliases].some((x) => normaliser(x).includes(q)))
      : g.nodes;
    return trier(filtres, tri.cle, tri.sens);
  }, [g, filtre, tri]);

  const surTri = (cle: Cle) =>
    setTri((t) =>
      t.cle === cle
        ? { cle, sens: t.sens === "ascending" ? "descending" : "ascending" }
        : { cle, sens: cle === "media" ? "ascending" : "descending" },
    );
  const c = fr.tableau.colonnes;

  return (
    <section class="tableau" aria-labelledby="tableau-titre">
      <div class="tableau__entete">
        <div>
          <h1 id="tableau-titre" class={titre ? undefined : "visuellement-masque"}>
            {fr.tableau.titre}
          </h1>
          {titre && <p class="tableau__description">{fr.tableau.description}</p>}
        </div>
        <div class="tableau__actions">
          <label for="tableau-filtre" class="visuellement-masque">
            {fr.tableau.filtre}
          </label>
          <input
            id="tableau-filtre"
            class="champ"
            type="search"
            placeholder={fr.tableau.filtre}
            value={filtre}
            onInput={(e) => setFiltre(e.currentTarget.value)}
          />
          {titre && (
            <a class="bouton" href="/">
              {fr.tableau.retourCarte}
            </a>
          )}
        </div>
      </div>
      <p class="panneau__discret" role="status">
        {fr.tableau.nombreMedias(lignes.length, g.nodes.length)}
      </p>
      <div class="defilant">
        <table>
          <caption class="visuellement-masque">{fr.tableau.legende}</caption>
          <thead>
            <tr>
              <EnTeteTriable cle="media" libelle={c.media} tri={tri} surTri={surTri} />
              <th scope="col">{c.type}</th>
              {g.meta.communities_displayed && <th scope="col">{c.famille}</th>}
              <EnTeteTriable
                cle="repondants"
                libelle={c.repondants}
                tri={tri}
                surTri={surTri}
                nombre
              />
              <EnTeteTriable cle="position" libelle={c.position} tri={tri} surTri={surTri} nombre />
              <EnTeteTriable cle="age" libelle={c.age} tri={tri} surTri={surTri} nombre />
              <th scope="col">{c.voisins}</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((n) => {
              const famille = familles.get(n.community);
              return (
                <tr key={n.id}>
                  <th scope="row">
                    <a href={`/media/${n.id}`}>{n.label}</a>
                  </th>
                  <td>{fr.types[n.type] ?? n.type}</td>
                  {g.meta.communities_displayed && (
                    <td>
                      {famille && (
                        <span class="etiquette-famille">
                          <span class="legende__pastille" style={{ background: famille.color }} />
                          {famille.label}
                        </span>
                      )}
                    </td>
                  )}
                  <td class="tableau__nombre">
                    {n.n}
                    {n.fragile && <span class="fiche__fragile"> · {fr.fiche.voisinFragile}</span>}
                  </td>
                  <td class="tableau__nombre">{fr.tableau.position(...n.pol)}</td>
                  <td class="tableau__nombre">{fr.tableau.age(n.age[0])}</td>
                  <td>
                    {cinqVoisins(g.edges, n.id, 3)
                      .map((v) => noms.get(v.id) ?? v.id)
                      .join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lignes.length === 0 && <p>{fr.tableau.aucun}</p>}
    </section>
  );
}

export function Telechargements() {
  const t = fr.tableau;
  return (
    <aside class="telechargements" aria-labelledby="telechargements-titre">
      <h2 id="telechargements-titre">{t.telechargementsTitre}</h2>
      <p class="panneau__discret">{t.telechargementsDetail}</p>
      <ul>
        {t.fichiers.map((f) => (
          <li key={f.fichier}>
            <a class="telechargements__fichier" href={`/telechargements/${f.fichier}`} download>
              <span>
                <span class="telechargements__nom">{f.fichier}</span>
                <span class="panneau__discret">{f.description}</span>
              </span>
              <span class="telechargements__format">{f.format}</span>
            </a>
          </li>
        ))}
      </ul>
      <ul class="telechargements__liens">
        <li>
          <a href="/telechargements/dictionnaire.md">{t.dictionnaire}</a>
        </li>
        <li>
          <a href="https://github.com/Capcodex/OpenDataChallenge_Audiovisuel" rel="noopener">
            {t.codeSource}
          </a>
        </li>
        <li>
          <a href="/methode">{t.methode}</a>
        </li>
      </ul>
      <p class="panneau__discret">{t.licenceDonnees}</p>
    </aside>
  );
}

export function PageTableau({ donnees }: { donnees: Graphe }) {
  return (
    <main class="principal">
      <div class="principal__carte">
        <Tableau donnees={donnees} />
      </div>
      <Telechargements />
    </main>
  );
}
