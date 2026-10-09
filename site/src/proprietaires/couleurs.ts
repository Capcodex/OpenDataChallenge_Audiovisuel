/**
 * Vue « Propriétaires » de la carte (V2) : chaque média prend la couleur de son propriétaire
 * principal. Fonctions pures, testées sans navigateur.
 *
 * Propriétaire principal : celui qui contrôle le média (part non chiffrée dans la base, « contrôle »
 * sans pourcentage) ; à défaut, la plus grande part chiffrée. Plusieurs contrôles (Arte : France et
 * Allemagne) : le premier listé. Les parts sont celles de graph.json (docs/methode.md, section 7).
 */
import type { Graphe, Noeud } from "../graph/types";

/** Propriétaires colorés ; les suivants sont regroupés en « autres propriétaires ». */
export const PROPRIETAIRES_COLORES = 7;

// Palette catégorielle (jetons des familles, puis deux teintes), dans l'ordre du nombre de médias.
export const PALETTE_PROPRIETAIRES = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#7b5ea7",
  "#3a9fb5",
];
export const COULEUR_AUTRES = "#8a9099";
export const COULEUR_NON_IDENTIFIE = "#c9ced5";

export function proprietairePrincipal(n: Pick<Noeud, "owners">): string | null {
  if (n.owners.length === 0) return null;
  const controle = n.owners.find((o) => o.share === null);
  if (controle) return controle.id;
  return n.owners.reduce((a, b) => ((b.share ?? 0) > (a.share ?? 0) ? b : a)).id;
}

export type CleLegende = string | "autres" | "non-identifie";

export interface EntreeLegende {
  /** Identifiant du propriétaire, ou « autres » / « non-identifie ». */
  cle: CleLegende;
  libelle: string | null;
  couleur: string;
  /** Nombre de médias de la carte dont c'est le propriétaire principal. */
  medias: number;
}

/**
 * Légende de la vue : les 7 propriétaires principaux les plus représentés, puis « autres
 * propriétaires » et « non identifié ». À nombre égal, ordre alphabétique (stable d'une édition à
 * l'autre). `libelle` vaut null pour les deux regroupements (texte fourni par l'interface).
 */
export function legendeProprietaires(g: Pick<Graphe, "nodes" | "owners">): EntreeLegende[] {
  const noms = new Map(g.owners.map((o) => [o.id, o.name]));
  const comptes = new Map<string, number>();
  let nonIdentifies = 0;
  for (const n of g.nodes) {
    const p = proprietairePrincipal(n);
    if (p === null) nonIdentifies++;
    else comptes.set(p, (comptes.get(p) ?? 0) + 1);
  }
  const tries = [...comptes.entries()].sort(
    ([a, na], [b, nb]) => nb - na || (noms.get(a) ?? a).localeCompare(noms.get(b) ?? b, "fr"),
  );
  const colores = tries.slice(0, PROPRIETAIRES_COLORES).map(([id, medias], i) => ({
    cle: id,
    libelle: noms.get(id) ?? id,
    couleur: PALETTE_PROPRIETAIRES[i],
    medias,
  }));
  const autres = tries.slice(PROPRIETAIRES_COLORES).reduce((s, [, m]) => s + m, 0);
  return [
    ...colores,
    ...(autres ? [{ cle: "autres", libelle: null, couleur: COULEUR_AUTRES, medias: autres }] : []),
    ...(nonIdentifies
      ? [
          {
            cle: "non-identifie",
            libelle: null,
            couleur: COULEUR_NON_IDENTIFIE,
            medias: nonIdentifies,
          },
        ]
      : []),
  ];
}

/** Couleur de chaque média dans la vue Propriétaires. */
export function couleursProprietaires(
  g: Pick<Graphe, "nodes" | "owners">,
  legende = legendeProprietaires(g),
): Map<string, string> {
  const parProprietaire = new Map(legende.map((e) => [e.cle, e.couleur]));
  return new Map(
    g.nodes.map((n) => {
      const p = proprietairePrincipal(n);
      const couleur =
        p === null ? COULEUR_NON_IDENTIFIE : (parProprietaire.get(p) ?? COULEUR_AUTRES);
      return [n.id, couleur];
    }),
  );
}
