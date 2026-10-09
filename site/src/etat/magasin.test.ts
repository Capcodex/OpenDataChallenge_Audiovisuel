import { afterEach, describe, expect, it } from "vitest";

import type { Graphe, Noeud } from "../graph/types";
import {
  appliquer,
  donnees,
  filtreFamille,
  filtreTypes,
  selection,
  visible,
  voisins,
} from "./magasin";
import { ETAT_VIDE } from "./url";

const noeud = (id: string, type: Noeud["type"], community: number) =>
  ({ id, type, community }) as Noeud;

const G = {
  nodes: [noeud("a", "radio", 1), noeud("b", "tv", 1), noeud("c", "radio", 2)],
  edges: [
    { s: "a", t: "b", lift: 2, ci: [1.5, 2.5], n: 40, shown: true },
    { s: "a", t: "c", lift: 3, ci: [2, 4], n: 35, shown: true },
    { s: "b", t: "c", lift: 1.4, ci: [1.1, 1.7], n: 50, shown: false },
  ],
} as unknown as Graphe;

afterEach(() => {
  appliquer(ETAT_VIDE);
  donnees.value = null;
});

describe("magasin", () => {
  it("voisins tracés du média sélectionné, du plus fort au plus faible", () => {
    donnees.value = G;
    selection.value = "a";
    expect(voisins.value.map((v) => v.id)).toEqual(["c", "b"]);
    selection.value = "b";
    expect(voisins.value.map((v) => v.id)).toEqual(["a"]); // b-c n'est pas tracé
  });

  it("filtres de type et de famille", () => {
    const [a, b, c] = G.nodes;
    filtreTypes.value = ["radio"];
    expect([a, b, c].map(visible)).toEqual([true, false, true]);
    filtreFamille.value = 2;
    expect([a, b, c].map(visible)).toEqual([false, false, true]);
  });
});
