import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Graphe } from "../graph/types";
import { matriceSimilarite, plusSinguliere, profilAnnee, rubriquesPrincipales } from "./jt-donnees";

const { jt } = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as Graphe;

describe("module JT (T-076)", () => {
  it("7 rubriques principales de l'année : Santé en 2020 (Covid), pas en 2010", () => {
    const nom = (annee: number) =>
      rubriquesPrincipales(jt, "sujets", annee).map((i) => jt.rubrics[i]);
    expect(nom(2020)).toHaveLength(7);
    expect(nom(2020)).toContain("Santé");
    expect(nom(2010)).not.toContain("Santé");
  });

  it("le profil d'une année somme à 1, « autres » compris", () => {
    const principales = rubriquesPrincipales(jt, "sujets", 2010);
    for (let c = 0; c < jt.channels.length; c++) {
      const total = profilAnnee(jt, "sujets", c, 2010, principales).reduce((s, x) => s + x.part, 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });

  it("matrice = valeurs du pipeline, symétrique, diagonale à 1", () => {
    const m = matriceSimilarite(jt, "2000-2020", "sujets");
    const tf1 = jt.channels.indexOf("TF1");
    const f2 = jt.channels.indexOf("France 2");
    expect(m[tf1][f2]).toBe(0.94);
    expect(m[f2][tf1]).toBe(0.94);
    expect(m.every((ligne) => ligne.every((v) => !Number.isNaN(v)))).toBe(true);
    expect(m[tf1][tf1]).toBe(1);
  });

  it("Arte, profil le plus singulier sur 2000-2020 (méthode, section 8)", () => {
    const s = plusSinguliere(matriceSimilarite(jt, "2000-2020", "sujets"));
    expect(jt.channels[s.chaine]).toBe("Arte");
    expect(s.moyenne).toBeGreaterThan(0.6);
    expect(s.moyenne).toBeLessThan(0.66);
    expect(s.autres).toBeGreaterThan(0.9);
  });
});
