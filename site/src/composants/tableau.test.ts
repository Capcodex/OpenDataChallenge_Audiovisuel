import { describe, expect, it } from "vitest";

import type { Noeud } from "../graph/types";
import { trier } from "./Tableau";

const n = (label: string, nombre: number, pol: number) =>
  ({ id: label, label, n: nombre, pol: [pol, pol, pol], age: [40, 40, 40] }) as unknown as Noeud;

describe("vue tableau : tri (T-072)", () => {
  const medias = [n("Libération", 300, 3.5), n("Arte", 500, 4.6), n("Le Monde", 500, 4.2)];

  it("par nom, ordre alphabétique français", () => {
    expect(trier(medias, "media", "ascending").map((x) => x.label)).toEqual([
      "Arte",
      "Le Monde",
      "Libération",
    ]);
  });

  it("par nombre décroissant, à égalité par nom", () => {
    expect(trier(medias, "repondants", "descending").map((x) => x.label)).toEqual([
      "Arte",
      "Le Monde",
      "Libération",
    ]);
    expect(trier(medias, "position", "ascending")[0].label).toBe("Libération");
  });
});
