import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Graphe } from "../graph/types";
import { construireIndex, SUGGESTIONS_MAX } from "./recherche";

// Données réelles : les variantes de noms viennent du référentiel du pipeline (RG-30).
const g = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as Graphe;
const index = construireIndex(g);
const ids = (q: string) => index.rechercher(q).map((r) => r.id);

describe("recherche (E2-01)", () => {
  it("« franceinfo », « France Info » et « france-info » trouvent le même média", () => {
    const premier = ids("franceinfo")[0];
    expect(premier).toMatch(/^franceinfo/);
    expect(ids("France Info")[0]).toBe(premier);
    expect(ids("france-info")[0]).toBe(premier);
  });

  it("insensible aux accents et à la casse", () => {
    expect(ids("liberation")[0]).toBe("liberation");
    expect(ids("LIBÉRATION")[0]).toBe("liberation");
    expect(ids("hugo decrypte")[0]).toBe("hugodecrypte");
  });

  it("nom exact avant début de nom : « France Inter » en premier", () => {
    expect(ids("france inter")[0]).toBe("france-inter");
    expect(ids("france")).toContain("france-inter");
  });

  it("tolère une faute de frappe à partir de 4 caractères", () => {
    expect(ids("mediaprt")).toContain("mediapart");
  });

  it("rien sous 2 caractères (EF-M2-02), au plus 6 suggestions", () => {
    expect(index.rechercher("f")).toEqual([]);
    expect(index.rechercher("fr").length).toBeLessThanOrEqual(SUGGESTIONS_MAX);
  });

  it("aucun résultat pour un média absent du baromètre (EF-M2-04)", () => {
    expect(index.rechercher("Ouest-France")).toEqual([]);
  });

  it("les médias sous le seuil sont trouvés, marqués « effectif insuffisant » (RG-02)", () => {
    const autre = g.others[0];
    const r = index.rechercher(autre.label).find((x) => x.id === autre.id);
    expect(r?.insuffisant).toBe(true);
    expect(index.rechercher("france inter")[0]?.insuffisant).toBe(false);
  });
});
