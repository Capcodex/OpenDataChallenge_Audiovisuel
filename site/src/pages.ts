/**
 * Pages du site (CdC technique § 9.1, § 9.2). Chaque page a une adresse et un fichier HTML
 * pré-généré au build (scripts/pages-statiques.ts) : titre, description et balises Open Graph
 * propres, sans redirection d'application monopage.
 */
export type Page = "carte" | "proprietaires" | "jt" | "methode" | "tableau";

export const CHEMINS: Record<Page, string> = {
  carte: "/",
  proprietaires: "/proprietaires",
  jt: "/jt",
  methode: "/methode",
  tableau: "/tableau",
};

/** Page affichée pour une adresse ; la carte pour « / » et les fiches « /media/<id> ». */
export function pageDepuisChemin(chemin: string): Page {
  const propre = chemin.replace(/\/+$/, "") || "/";
  const trouvee = (Object.entries(CHEMINS) as [Page, string][]).find(([, c]) => c === propre);
  return trouvee?.[0] ?? "carte";
}
