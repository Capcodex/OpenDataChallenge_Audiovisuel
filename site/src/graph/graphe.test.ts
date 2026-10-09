/**
 * Le graph.json publié respecte le schéma partagé avec le pipeline (CdC technique § 8.2), et le
 * site sait le lire. Test sur le vrai fichier de public/data.
 */
import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";

import { verifierGraphe } from "./charger";
import schema from "./schema.json";

const graphe = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as unknown;

describe("graph.json publié", () => {
  it("est conforme à schema.json", () => {
    const valider = new Ajv2020({ allErrors: true }).compile(schema);
    const ok = valider(graphe);
    expect(valider.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("passe le contrôle de chargement du site", () => {
    const g = verifierGraphe(graphe);
    expect(g.nodes.length).toBeGreaterThan(0);
    expect(g.communities.length).toBeGreaterThan(0);
    expect(g.jt.channels).toContain("TF1");
  });

  it("chaque média a une famille connue", () => {
    const g = verifierGraphe(graphe);
    const familles = new Set(g.communities.map((c) => c.id));
    expect(g.nodes.every((n) => familles.has(n.community))).toBe(true);
  });
});
