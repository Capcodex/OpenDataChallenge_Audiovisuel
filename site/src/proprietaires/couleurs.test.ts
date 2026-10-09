import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Graphe } from "../graph/types";
import {
  COULEUR_AUTRES,
  COULEUR_NON_IDENTIFIE,
  couleursProprietaires,
  legendeProprietaires,
  proprietairePrincipal,
} from "./couleurs";

const g = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as Graphe;
const noeud = (id: string) => g.nodes.find((n) => n.id === id)!;

describe("propriétaire principal", () => {
  it("le contrôle (part non chiffrée) l'emporte sur une part chiffrée", () => {
    expect(proprietairePrincipal(noeud("m6"))).toBe("famille-mohn");
    expect(proprietairePrincipal(noeud("europe-1"))).toBe("vincent-bollore");
    expect(proprietairePrincipal(noeud("le-monde"))).toBe("xavier-niel");
  });

  it("sans contrôle, la plus grande part", () => {
    expect(proprietairePrincipal(noeud("tf1"))).toBe("famille-bouygues");
    expect(proprietairePrincipal(noeud("marianne"))).toBe("daniel-kretinsky");
  });

  it("plusieurs contrôles : le premier listé ; aucun propriétaire : null", () => {
    expect(proprietairePrincipal(noeud("arte"))).toBe("republique-francaise");
    expect(proprietairePrincipal({ owners: [] })).toBeNull();
  });
});

describe("légende de la vue Propriétaires", () => {
  const legende = legendeProprietaires(g);

  it("7 propriétaires colorés, puis « autres » et « non identifié »", () => {
    expect(legende.slice(0, 7).every((e) => e.libelle)).toBe(true);
    expect(legende.map((e) => e.cle).slice(-2)).toEqual(["autres", "non-identifie"]);
    expect(legende[0]).toMatchObject({ libelle: "République française", medias: 16 });
  });

  it("chaque média de la carte est compté une fois", () => {
    expect(legende.reduce((s, e) => s + e.medias, 0)).toBe(g.nodes.length);
  });

  it("couleurs des médias cohérentes avec la légende", () => {
    const couleurs = couleursProprietaires(g, legende);
    expect(couleurs.size).toBe(g.nodes.length);
    expect(couleurs.get("le-monde")).toBe(legende.find((e) => e.cle === "xavier-niel")?.couleur);
    const nonIdentifie = g.nodes.find((n) => n.owners.length === 0)!;
    expect(couleurs.get(nonIdentifie.id)).toBe(COULEUR_NON_IDENTIFIE);
    const autres = [...couleurs.values()].filter((c) => c === COULEUR_AUTRES).length;
    expect(autres).toBe(legende.find((e) => e.cle === "autres")?.medias);
  });
});
