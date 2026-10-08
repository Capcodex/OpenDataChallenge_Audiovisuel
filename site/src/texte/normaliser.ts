/**
 * Normalisation des libellés pour la recherche (EF-M2, CdC technique § 9.3).
 *
 * Même règle que `pipeline/texte.py` : minuscules, sans accents, sans ponctuation ni espaces.
 * « France-Info », « france info » et « franceinfo » donnent la même clé.
 */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, "");
}
