import { describe, expect, it } from "vitest";

import { pageDepuisChemin } from "./pages";

describe("pages", () => {
  it.each([
    ["/", "carte"],
    ["/media/le-monde", "carte"],
    ["/methode", "methode"],
    ["/methode/", "methode"],
    ["/tableau", "tableau"],
    ["/jt", "carte"], // page retirée en V2 : redirigée vers la carte par nginx
    ["/proprietaires/", "proprietaires"],
  ])("%s → %s", (chemin, page) => {
    expect(pageDepuisChemin(chemin)).toBe(page);
  });
});
