import { describe, expect, it } from "vitest";

import { ETAT_VIDE, etatDepuisUrl, urlDepuisEtat } from "./url";

const MEDIAS = new Set(["le-monde", "france-inter"]);
const FAMILLES = new Set([1, 2, 3]);
const lire = (chemin: string, recherche = "") => etatDepuisUrl(chemin, recherche, MEDIAS, FAMILLES);

describe("état ↔ URL", () => {
  it("page d'accueil : état vide", () => {
    expect(lire("/")).toEqual(ETAT_VIDE);
    expect(urlDepuisEtat(ETAT_VIDE)).toBe("/");
  });

  it("fiche d'un média et filtres", () => {
    const etat = lire("/media/le-monde", "?type=radio,journal&famille=2");
    expect(etat).toEqual({ media: "le-monde", types: ["journal", "radio"], famille: 2 });
    expect(urlDepuisEtat(etat)).toBe("/media/le-monde?type=journal,radio&famille=2");
  });

  it("aller-retour stable", () => {
    const url = "/media/france-inter?type=tv&famille=1";
    const [chemin, recherche] = url.split("?");
    expect(urlDepuisEtat(lire(chemin, `?${recherche}`))).toBe(url);
  });

  it("accepte la barre oblique finale des pages pré-générées", () => {
    expect(lire("/media/le-monde/").media).toBe("le-monde");
  });

  it("ignore les valeurs inconnues au lieu d'échouer", () => {
    expect(lire("/media/inconnu", "?type=radio,podcast,radio&famille=9")).toEqual({
      media: null,
      types: ["radio"],
      famille: null,
    });
    expect(lire("/media/le-monde", "?famille=abc").famille).toBeNull();
  });
});
