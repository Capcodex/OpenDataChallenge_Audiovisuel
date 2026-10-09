/**
 * Construction du graphe affiché par la carte, à partir de graph.json. Séparé du composant Carte :
 * ne dépend pas de WebGL, testable sans navigateur.
 */
import Graph from "graphology";

import type { Graphe } from "../graph/types";

/**
 * Réglages de Sigma. Sigma 4 exprime par défaut les tailles dans les unités du graphe
 * (`itemSizesReference: "positions"`) ; nos coordonnées tiennent dans [0, 1], et des points de
 * 4 à 20 unités couvraient toute la carte. Tailles en pixels écran, comme en Sigma 3.
 */
export const REGLAGES_SIGMA = {
  itemSizesReference: "screen",
  labelRenderedSizeThreshold: 8,
  minCameraRatio: 0.1,
  maxCameraRatio: 2,
  // Survol des liens : phrase d'explication (E3-05, RG-22).
  enableEdgeEvents: true,
} as const;

// Jetons de design (styles/jetons.css) ; Sigma dessine en WebGL et ne lit pas les variables CSS.
export const COULEUR_SANS_FAMILLE = "#5a616b";
export const COULEUR_LIEN = "#8a9099";
export const COULEUR_ESTOMPEE = "#dde1e6";
export const COULEUR_LIEN_SELECTION = "#14171c";
export const POLICE = "IBM Plex Sans";

/** Taille d'un point selon la part du public (aire proportionnelle), entre 4 et 20 px. */
export function taillePoint(part: number, partMax: number): number {
  return 4 + 16 * Math.sqrt(part / partMax);
}

/** Épaisseur d'un lien selon le lift, entre 0,5 et 4 px. */
export function epaisseurLien(lift: number): number {
  return Math.min(4, 0.5 + (lift - 1) * 0.6);
}

export function construireGraphe(g: Graphe): Graph {
  const graphe = new Graph({ type: "undirected" });
  const couleurs = new Map(g.communities.map((c) => [c.id, c.color]));
  const partMax = Math.max(...g.nodes.map((n) => n.share));
  for (const n of g.nodes) {
    graphe.addNode(n.id, {
      // y du pipeline croissant vers le bas ; Sigma place les y croissants vers le haut.
      x: n.x,
      y: -n.y,
      size: taillePoint(n.share, partMax),
      color: g.meta.communities_displayed
        ? (couleurs.get(n.community) ?? COULEUR_SANS_FAMILLE)
        : COULEUR_SANS_FAMILLE,
      label: n.label,
    });
  }
  for (const e of g.edges) {
    if (e.shown) {
      graphe.addEdge(e.s, e.t, {
        size: epaisseurLien(e.lift),
        color: COULEUR_LIEN,
        lift: e.lift,
        communs: e.n,
      });
    }
  }
  return graphe;
}
