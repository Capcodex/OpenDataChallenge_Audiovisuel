/**
 * Libellé relatif du public d'une famille (V2, ADR-011) : « Public le plus à gauche des 3
 * familles ». Le libellé est calculé par le pipeline (graph.json) ; ce module le met en mots.
 */
import type { Famille } from "../graph/types";
import { fr } from "../i18n/fr";

/** Texte du libellé, ou null si la famille n'en a pas (aucun écart significatif, RG-07). */
export function libellePosition(famille: Famille, familles: Famille[]): string | null {
  if (!famille.position) return null;
  const partage = familles.filter((f) => f.position === famille.position).length > 1;
  return fr.familles.position(famille.position, partage, familles.length);
}

/** Valeur et marge du positionnement du public : « 5,3 sur 10, marge 5,1–5,6 ». */
export function valeurPosition(famille: Famille): string {
  return fr.familles.valeur(...famille.pol);
}
