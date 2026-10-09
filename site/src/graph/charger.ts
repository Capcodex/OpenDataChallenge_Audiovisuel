import type { Graphe } from "./types";

export const URL_DONNEES = "/data/graph.json";
const FORMAT_ATTENDU = 2; // ADR-011

export class ErreurDonnees extends Error {}

/**
 * Contrôle de cohérence minimal au chargement. La validation complète contre schema.json est
 * faite à l'export (pipeline) et dans les tests (graphe.test.ts) : inutile d'embarquer un
 * validateur JSON Schema dans le navigateur.
 */
export function verifierGraphe(donnees: unknown): Graphe {
  const g = donnees as Partial<Graphe> | null;
  if (
    !g ||
    typeof g !== "object" ||
    !g.meta ||
    !Array.isArray(g.nodes) ||
    !Array.isArray(g.edges)
  ) {
    throw new ErreurDonnees("Données de la carte illisibles");
  }
  if (g.meta.format !== FORMAT_ATTENDU) {
    throw new ErreurDonnees(
      `Format de données ${String(g.meta.format)} non pris en charge (attendu : ${FORMAT_ATTENDU})`,
    );
  }
  const ids = new Set(g.nodes.map((n) => n.id));
  const orphelin = g.edges.find((e) => !ids.has(e.s) || !ids.has(e.t));
  if (orphelin) throw new ErreurDonnees(`Lien vers un média inconnu : ${orphelin.s}–${orphelin.t}`);
  return g as Graphe;
}

export async function chargerGraphe(url = URL_DONNEES): Promise<Graphe> {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new ErreurDonnees(`Données indisponibles (${reponse.status})`);
  return verifierGraphe(await reponse.json());
}
