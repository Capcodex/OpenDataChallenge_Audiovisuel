import { describe, expect, it } from "vitest";

import { normaliser } from "./normaliser";

describe("normaliser", () => {
  it("ignore la casse, les accents et la ponctuation", () => {
    expect(normaliser("Le Parisien / Aujourd’hui en France...")).toBe(
      normaliser("le parisien aujourd'hui en france"),
    );
    expect(normaliser("Télérama")).toBe("telerama");
  });

  it("rapproche les variantes d'écriture d'un même média", () => {
    const cles = ["France-Info", "france info", "franceinfo", "FRANCEINFO"].map(normaliser);
    expect(new Set(cles).size).toBe(1);
  });

  it("garde le + de Canal+", () => {
    expect(normaliser("Canal+")).toBe("canal+");
  });
});
