import { describe, expect, it } from "vitest";

import { ETAT_VIDE, etatDepuisUrl, urlDepuisEtat } from "./url";

const MEDIAS = new Set(["le-monde", "france-inter"]);
const FAMILLES = new Set([1, 2, 3]);
const PROPRIETAIRES = new Set(["xavier-niel", "famille-bouygues"]);
const lire = (chemin: string, recherche = "") =>
  etatDepuisUrl(chemin, recherche, MEDIAS, FAMILLES, PROPRIETAIRES);

describe("état ↔ URL", () => {
  it("page d'accueil : état vide, vue Propriétaires par défaut", () => {
    expect(lire("/")).toEqual(ETAT_VIDE);
    expect(ETAT_VIDE.vue).toBe("proprietaires");
    expect(urlDepuisEtat(ETAT_VIDE)).toBe("/");
  });

  it("vue Propriétaires : fiche, types et propriétaire", () => {
    const etat = lire("/media/le-monde", "?type=radio,journal&proprietaire=xavier-niel");
    expect(etat).toEqual({
      media: "le-monde",
      vue: "proprietaires",
      types: ["journal", "radio"],
      famille: null,
      proprietaire: "xavier-niel",
    });
    expect(urlDepuisEtat(etat)).toBe("/media/le-monde?type=journal,radio&proprietaire=xavier-niel");
  });

  it("vue Familles : famille gardée, propriétaire ignoré", () => {
    const etat = lire("/", "?vue=familles&famille=2&proprietaire=xavier-niel");
    expect(etat).toMatchObject({ vue: "familles", famille: 2, proprietaire: null });
    expect(urlDepuisEtat(etat)).toBe("/?vue=familles&famille=2");
  });

  it("vue Propriétaires : filtre de famille ignoré", () => {
    expect(lire("/", "?famille=2").famille).toBeNull();
  });

  it("aller-retour stable", () => {
    for (const url of [
      "/media/france-inter?vue=familles&type=tv&famille=1",
      "/?type=radio&proprietaire=famille-bouygues",
    ]) {
      const [chemin, recherche] = url.split("?");
      expect(urlDepuisEtat(lire(chemin, `?${recherche}`))).toBe(url);
    }
  });

  it("accepte la barre oblique finale des pages pré-générées", () => {
    expect(lire("/media/le-monde/").media).toBe("le-monde");
  });

  it("ignore les valeurs inconnues au lieu d'échouer", () => {
    expect(
      lire("/media/inconnu", "?vue=autre&type=radio,podcast,radio&proprietaire=inconnu"),
    ).toEqual({ ...ETAT_VIDE, types: ["radio"] });
    expect(lire("/", "?vue=familles&famille=abc").famille).toBeNull();
  });
});
