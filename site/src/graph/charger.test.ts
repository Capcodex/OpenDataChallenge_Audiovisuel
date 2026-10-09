import { describe, expect, it } from "vitest";

import { ErreurDonnees, verifierGraphe } from "./charger";

const minimal = () => ({
  meta: { format: 2 },
  nodes: [{ id: "a" }, { id: "b" }],
  edges: [{ s: "a", t: "b" }],
});

describe("verifierGraphe", () => {
  it("accepte des données cohérentes", () => {
    expect(verifierGraphe(minimal()).nodes).toHaveLength(2);
  });

  it("refuse un autre format", () => {
    expect(() => verifierGraphe({ ...minimal(), meta: { format: 1 } })).toThrow(ErreurDonnees);
  });

  it("refuse un lien vers un média inconnu", () => {
    const g = minimal();
    g.edges.push({ s: "a", t: "z" });
    expect(() => verifierGraphe(g)).toThrow(/média inconnu/);
  });

  it("refuse des données illisibles", () => {
    expect(() => verifierGraphe(null)).toThrow(ErreurDonnees);
    expect(() => verifierGraphe({ meta: {} })).toThrow(ErreurDonnees);
  });
});
