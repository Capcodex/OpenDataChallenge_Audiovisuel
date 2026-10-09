import { describe, expect, it } from "vitest";

import type { Graphe } from "../graph/types";
import { construireGraphe, epaisseurLien, REGLAGES_SIGMA, taillePoint } from "./carte-donnees";

const graphe = (affichees: boolean) =>
  ({
    meta: { communities_displayed: affichees },
    communities: [
      { id: 1, label: "Famille 1", color: "#2a78d6", size: 1 },
      { id: 2, label: "Famille 2", color: "#eb6834", size: 1 },
    ],
    nodes: [
      { id: "a", label: "A", x: 0.1, y: 0.2, share: 0.5, community: 1 },
      { id: "b", label: "B", x: 0.9, y: 0.8, share: 0.125, community: 2 },
    ],
    edges: [
      { s: "a", t: "b", lift: 3, ci: [2, 4], n: 40, shown: true },
      { s: "b", t: "a", lift: 1.2, ci: [1.1, 1.3], n: 35, shown: false },
    ],
  }) as unknown as Graphe;

describe("construireGraphe", () => {
  it("couleurs de famille quand les familles sont affichées (E1-02)", () => {
    const g = construireGraphe(graphe(true));
    expect(g.getNodeAttribute("a", "color")).toBe("#2a78d6");
    expect(g.getNodeAttribute("b", "color")).toBe("#eb6834");
  });

  it("une seule couleur neutre sans familles (RG-07)", () => {
    const g = construireGraphe(graphe(false));
    expect(g.getNodeAttribute("a", "color")).toBe(g.getNodeAttribute("b", "color"));
    expect(g.getNodeAttribute("a", "color")).toBe("#5a616b");
  });

  it("positions du pipeline, axe vertical retourné pour Sigma", () => {
    const g = construireGraphe(graphe(true));
    expect(g.getNodeAttributes("a")).toMatchObject({ x: 0.1, y: -0.2, label: "A" });
  });

  it("seuls les liens tracés sont dessinés (ADR-005)", () => {
    expect(construireGraphe(graphe(true)).size).toBe(1);
  });
});

describe("échelles", () => {
  it("aire du point proportionnelle à la part du public", () => {
    expect(taillePoint(0.5, 0.5)).toBe(20);
    expect(taillePoint(0.125, 0.5)).toBe(12); // racine de 1/4 = 1/2
  });

  it("épaisseur des liens bornée", () => {
    expect(epaisseurLien(1)).toBe(0.5);
    expect(epaisseurLien(20)).toBe(4);
  });
});

describe("réglages de Sigma", () => {
  it("tailles en pixels écran : sinon les points couvrent toute la carte (régression S5)", () => {
    expect(REGLAGES_SIGMA.itemSizesReference).toBe("screen");
  });

  it("tailles de points compatibles avec des coordonnées dans [0, 1]", () => {
    // Avec des tailles en unités du graphe, un point de 4 unités dépasserait la carte entière.
    expect(taillePoint(0.001, 0.5)).toBeGreaterThan(1);
  });
});
