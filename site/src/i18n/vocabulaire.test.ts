import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { fr, mentionSource, phraseLien, phrasePositionnement } from "./fr";
import { controlerVocabulaire } from "./vocabulaire";

describe("contrôle du vocabulaire (RG-20, RG-25)", () => {
  it.each([
    "CNews est un média de droite.",
    "les médias d'extrême droite",
    "une chaîne de gauche",
    "Valeurs actuelles, titre conservateur",
    "un journal classé à gauche",
    "Ce média se situe à 6,7.",
    "Classement des médias du plus à gauche au plus à droite",
  ])("refuse : %s", (texte) => {
    expect(controlerVocabulaire(texte)).not.toHaveLength(0);
  });

  it.each([
    "Le public de ce média se situe en moyenne à 6,7.",
    "Un public positionné à 6,7 ne fait pas d'un média un « média de droite ».",
    "Les personnes qui suivent ce média se situent plutôt à droite.",
    "Elle décrit des publics, pas des lignes éditoriales.",
  ])("accepte : %s", (texte) => {
    expect(controlerVocabulaire(texte)).toHaveLength(0);
  });

  it("indique la ligne de chaque infraction", () => {
    expect(controlerVocabulaire("ligne 1\nun média de gauche")[0]?.ligne).toBe(2);
  });

  it("aucun texte de l'interface n'enfreint la charte", () => {
    const source = readFileSync(new URL("./fr.ts", import.meta.url), "utf-8");
    expect(controlerVocabulaire(source)).toEqual([]);
  });
});

describe("formulations imposées", () => {
  it("RG-20 : positionnement du public, chiffres à la française", () => {
    expect(phrasePositionnement(6.73, 6.52, 6.92)).toBe(
      "Le public de ce média se situe en moyenne à 6,7 sur une échelle de 0 (très à gauche) à 10 (très à droite), marge 6,5–6,9.",
    );
  });

  it("RG-22 : explication d'un lien", () => {
    expect(phraseLien("France Inter", "France Culture", 3.21, 241)).toBe(
      "Les personnes qui suivent France Inter sont 3,2 fois plus nombreuses que la moyenne à suivre aussi France Culture (241 répondants en commun).",
    );
  });

  it("RG-24 : mention de source", () => {
    expect(mentionSource("2026", "8 octobre 2026", "https://exemple.fr/media/le-monde")).toBe(
      "Source : Arcom, baromètre Les Français et l'information 2026 ; traitement : Graphe des médias, 8 octobre 2026, https://exemple.fr/media/le-monde.",
    );
  });

  it("RG-21 : bandeau", () => {
    expect(fr.bandeau).toContain("Elle décrit des publics, pas des lignes éditoriales.");
  });
});
