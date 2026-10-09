import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";
import { imageSvg, TAILLES } from "./image-svg";

const g = JSON.parse(
  readFileSync(new URL("../../public/data/graph.json", import.meta.url), "utf-8"),
) as Graphe;
const options = { ...TAILLES[0], noms: true, liens: true };

describe("export d'image (E6-01, RG-23)", () => {
  it("cartouche toujours présent : phrase RG-21, source, date, adresse", () => {
    for (const opts of [options, { ...options, noms: false, liens: false }]) {
      const svg = imageSvg(g, g.nodes, opts);
      expect(svg).toContain(fr.bandeau);
      expect(svg).toContain("Source : Arcom, baromètre « Les Français et l'information » 2026");
      expect(svg).toContain("8 octobre 2026");
      expect(svg).toContain("graphe-medias.fr");
    }
  });

  it("un point par média visible, les liens tracés entre médias visibles", () => {
    const svg = imageSvg(g, g.nodes, options);
    // + 1 pastille de légende par famille
    expect(svg.match(/<circle/g)).toHaveLength(g.nodes.length + g.communities.length);
    expect(svg.match(/<line/g)).toHaveLength(g.edges.filter((e) => e.shown).length + 1);
    const radios = g.nodes.filter((n) => n.type === "radio");
    const filtre = imageSvg(g, radios, options);
    expect(filtre.match(/<circle/g)).toHaveLength(radios.length + g.communities.length);
  });

  it("options : sans noms ni liens", () => {
    const svg = imageSvg(g, g.nodes, { ...options, noms: false, liens: false });
    expect(svg).not.toContain(">France Inter<");
    expect(svg.match(/<line/g)).toHaveLength(1); // filet du cartouche
  });

  it("dimensions demandées, texte échappé", () => {
    const svg = imageSvg(g, g.nodes, { ...TAILLES[1], noms: true, liens: true });
    expect(svg).toMatch(/^<svg [^>]*width="1200" height="1200"/);
    expect(svg).toContain("L&apos;Humanité".replace("&apos;", "'"));
    expect(svg).not.toMatch(/<text[^>]*>[^<]*&(?!amp;|lt;|gt;|quot;)/);
  });

  it("calque propriétaires : titre, médias mis en avant nommés, autres estompés sans nom", () => {
    const misEnAvant = new Set(["bfmtv", "rmc"]);
    const svg = imageSvg(g, g.nodes, { ...options, misEnAvant, titre: "Médias détenus par X" });
    expect(svg).toContain(">Médias détenus par X<");
    expect(svg).toContain(">BFM TV<");
    expect(svg).not.toContain(">France Inter<");
    expect(svg).toContain(fr.bandeau);
  });
});
