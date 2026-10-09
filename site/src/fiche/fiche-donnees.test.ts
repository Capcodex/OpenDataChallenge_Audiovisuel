import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Graphe, Lien } from "../graph/types";
import {
  cinqVoisins,
  estFragile,
  formaterDate,
  lienPermanent,
  mentionFiche,
  propriete,
  seuils,
} from "./fiche-donnees";

const g = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as Graphe;

const lien = (s: string, t: string, lift: number, n = 40, shown = true): Lien => ({
  s,
  t,
  lift,
  ci: [lift - 0.5, lift + 0.5],
  n,
  shown,
});

describe("voisins (EF-M3-02)", () => {
  it("5 au plus, par lift décroissant, liens tracés ou non", () => {
    const edges = [
      lien("a", "b", 2),
      lien("c", "a", 6, 40, false),
      lien("a", "d", 3),
      lien("a", "e", 1.5),
      lien("f", "a", 4),
      lien("a", "g", 5),
      lien("b", "c", 9),
    ];
    expect(cinqVoisins(edges, "a").map((v) => v.id)).toEqual(["c", "g", "f", "d", "b"]);
  });

  it("à lift égal, le plus grand effectif commun d'abord", () => {
    const edges = [lien("a", "b", 2, 31), lien("a", "c", 2, 80)];
    expect(cinqVoisins(edges, "a").map((v) => v.id)).toEqual(["c", "b"]);
  });

  it("graph.json : 5 voisins, sauf si moins de 5 liens passent les seuils (RG-04, RG-05)", () => {
    const degre = (id: string) => g.edges.filter((e) => e.s === id || e.t === id).length;
    for (const n of g.nodes) {
      expect(cinqVoisins(g.edges, n.id)).toHaveLength(Math.min(5, degre(n.id)));
    }
    // Seul cas de l'édition 2026 : Le Crayon (54 répondants) n'a que 3 liens retenus.
    expect(cinqVoisins(g.edges, "le-crayon")).toHaveLength(3);
  });
});

describe("transparence (E3-01)", () => {
  it("seuils lus dans graph.json (RG-08)", () => {
    expect(seuils(g)).toEqual({ affichable: 50, fragile: 100, communsMin: 30 });
  });

  it("chiffre fragile sous 100 répondants (RG-03)", () => {
    expect(estFragile(99, 100)).toBe(true);
    expect(estFragile(100, 100)).toBe(false);
    for (const n of g.nodes) expect(estFragile(n.n, 100)).toBe(n.fragile);
  });
});

describe("propriété", () => {
  it("groupe, propriétaires avec leur part, source datée", () => {
    const bfm = g.nodes.find((n) => n.id === "bfmtv")!;
    const p = propriete(g, bfm);
    expect(p.groupe).toBe("CMA CGM");
    expect(p.proprietaires).toEqual([{ nom: "Rodolphe Saadé", part: 0.73 }]);
    expect(p.source?.date).toBe("2024-12-17");
  });

  it("propriétaire non identifié : ni ligne ni source", () => {
    const n = g.nodes.find((x) => x.owner_status === "non_identifie")!;
    expect(propriete(g, n)).toMatchObject({ proprietaires: [], source: null });
  });
});

describe("mention de source (RG-24, E3-03)", () => {
  it("date en toutes lettres", () => {
    expect(formaterDate("2026-10-08")).toBe("8 octobre 2026");
    expect(formaterDate("2026-01-01")).toBe("1 janvier 2026");
  });

  it("lien permanent vers l'adresse publique", () => {
    const meta = { ...g.meta, adresse_site: "https://exemple.fr/" };
    expect(lienPermanent({ meta }, "le-monde")).toBe("https://exemple.fr/media/le-monde");
  });

  it("texte conforme à RG-24", () => {
    expect(mentionFiche(g, "france-inter")).toBe(
      "Source : Arcom, baromètre Les Français et l'information 2026 ; traitement : Graphe des médias, 8 octobre 2026, https://graphe-medias.fr/media/france-inter.",
    );
  });
});
