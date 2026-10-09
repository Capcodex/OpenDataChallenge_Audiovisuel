import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Famille, Graphe } from "../graph/types";
import { libellePosition, valeurPosition } from "./position";

const famille = (id: number, position: Famille["position"], pol = 5): Famille => ({
  id,
  label: `Famille ${id}`,
  color: "#000000",
  size: 1,
  pol: [pol, pol - 0.1, pol + 0.1],
  pol_n: 100,
  position,
});

describe("libellé relatif du public des familles (ADR-011)", () => {
  it("un seul groupe à chaque extrémité : « le plus »", () => {
    const f = [famille(1, "gauche"), famille(2, "centre"), famille(3, "droite")];
    expect(f.map((x) => libellePosition(x, f))).toEqual([
      "Public le plus à gauche des 3 familles",
      "Public au centre des 3 familles",
      "Public le plus à droite des 3 familles",
    ]);
  });

  it("libellé partagé : « parmi les plus »", () => {
    const f = [famille(1, "droite"), famille(2, "droite"), famille(3, "gauche")];
    expect(libellePosition(f[0], f)).toBe("Public parmi les plus à droite des 3 familles");
    expect(libellePosition(f[2], f)).toBe("Public le plus à gauche des 3 familles");
  });

  it("aucun libellé si aucun écart significatif", () => {
    const f = [famille(1, null), famille(2, null)];
    expect(libellePosition(f[0], f)).toBeNull();
  });

  it("valeur et marge à la française", () => {
    expect(valeurPosition(famille(1, null, 5.345))).toBe("5,3 sur 10, marge 5,2–5,4");
  });

  it("édition 2026 : famille 3 la plus à gauche, familles 1 et 2 parmi les plus à droite", () => {
    const g = JSON.parse(
      readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
    ) as Graphe;
    const texte = (id: number) =>
      libellePosition(
        g.communities.find((c) => c.id === id)!,
        g.communities,
      );
    expect(texte(3)).toBe("Public le plus à gauche des 3 familles");
    expect(texte(1)).toBe("Public parmi les plus à droite des 3 familles");
  });
});
