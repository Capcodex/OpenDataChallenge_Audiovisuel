/**
 * Liste des propriétaires (calque propriétaires, E4-02) : chaque propriétaire d'au moins un média
 * de la carte, avec ses médias et leurs parts. Fonction pure, testée.
 */
import type { Graphe, Noeud, Proprietaire } from "../graph/types";

export interface LigneProprietaire {
  proprietaire: Proprietaire;
  medias: { noeud: Noeud; part: number | null }[];
  groupes: string[];
}

/** Du plus grand nombre de médias au plus petit ; à égalité, ordre alphabétique. */
export function listerProprietaires(g: Pick<Graphe, "nodes" | "owners">): LigneProprietaire[] {
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
