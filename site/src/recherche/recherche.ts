/**
 * Recherche des médias (E2-01, EF-M2-01 à 04, CdC technique § 9.3).
 *
 * Index sur le nom et les variantes (RG-30), normalisés comme dans le pipeline : « franceinfo »,
 * « France Info » et « france-info » donnent la même clé. Deux passes :
 *   1. correspondance exacte, puis début de nom, puis contenu (classement stable et prévisible) ;
 *   2. Fuse.js en complément, pour les fautes de frappe, à partir de 4 caractères.
 * Les médias sous le seuil d'affichage (`others`) sont dans l'index, marqués « effectif
 * insuffisant » (RG-02).
 */
import Fuse from "fuse.js";

import type { Graphe } from "../graph/types";
import { normaliser } from "../texte/normaliser";

export const LONGUEUR_MIN = 2; // EF-M2-02
export const LONGUEUR_FLOUE_MIN = 4;
export const SUGGESTIONS_MAX = 6;

export interface Resultat {
  id: string;
  label: string;
  type: string;
  /** Sous le seuil d'affichage (RG-02) : pas sur la carte, pas d'indicateurs. */
  insuffisant: boolean;
}

interface Entree extends Resultat {
  cles: string[];
  part: number;
}

export interface Index {
  rechercher(requete: string, limite?: number): Resultat[];
}

export function construireIndex(g: Pick<Graphe, "nodes" | "others">): Index {
  const entrees: Entree[] = [
    ...g.nodes.map((n) => ({ ...n, insuffisant: false, part: n.share })),
    ...g.others.map((o) => ({ ...o, insuffisant: true, part: 0 })),
  ].map(({ id, label, aliases, type, insuffisant, part }) => ({
    id,
    label,
    type,
    insuffisant,
    part,
    cles: [...new Set([label, ...aliases].map(normaliser))].filter(Boolean),
  }));

  const floue = new Fuse(entrees, {
    keys: ["cles"],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: LONGUEUR_MIN,
  });

  // 0 : nom exact ; 1 : début de nom ; 2 : contenu ; null : pas de correspondance directe.
  const rang = (e: Entree, q: string): number | null => {
    if (e.cles.includes(q)) return 0;
    if (e.cles.some((c) => c.startsWith(q))) return 1;
    if (e.cles.some((c) => c.includes(q))) return 2;
    return null;
  };

  return {
    rechercher(requete, limite = SUGGESTIONS_MAX) {
      const q = normaliser(requete);
      if (q.length < LONGUEUR_MIN) return [];
      const directs = entrees
        .map((e) => ({ e, r: rang(e, q) }))
        .filter((x): x is { e: Entree; r: number } => x.r !== null)
        .sort(
          (a, b) =>
            a.r - b.r ||
            Number(a.e.insuffisant) - Number(b.e.insuffisant) ||
            b.e.part - a.e.part ||
            a.e.label.localeCompare(b.e.label, "fr"),
        )
        .map((x) => x.e);
      const vus = new Set(directs.map((e) => e.id));
      const flous =
        q.length >= LONGUEUR_FLOUE_MIN
          ? floue
              .search(q)
              .map((r) => r.item)
              .filter((e) => !vus.has(e.id))
          : [];
      return [...directs, ...flous]
        .slice(0, limite)
        .map(({ id, label, type, insuffisant }) => ({ id, label, type, insuffisant }));
    },
  };
}
