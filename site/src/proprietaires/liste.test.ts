import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Graphe } from "../graph/types";
import { listerProprietaires } from "./liste";

const g = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as Graphe;

describe("liste des propriétaires", () => {
  const lignes = listerProprietaires(g);

  it("seulement les propriétaires d'au moins un média, le plus grand nombre d'abord", () => {
    expect(lignes.every((l) => l.medias.length > 0)).toBe(true);
    expect(lignes[0].proprietaire.name).toBe("République française");
    const nombres = lignes.map((l) => l.medias.length);
    expect(nombres).toEqual([...nombres].sort((a, b) => b - a));
  });

  it("tous les médias détenus, participations minoritaires comprises", () => {
    const saade = lignes.find((l) => l.proprietaire.id === "rodolphe-saade")!;
    expect(saade.medias.map((m) => m.noeud.id)).toContain("m6"); // 7,3 % de M6
    expect(saade.medias.find((m) => m.noeud.id === "m6")?.part).toBe(0.073);
  });
});
