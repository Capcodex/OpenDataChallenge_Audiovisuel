import { describe, expect, it } from "vitest";

import { pageDepuisChemin } from "./pages";

describe("pages", () => {
  it.each([
    ["/", "carte"],
    ["/media/le-monde", "carte"],
    ["/methode", "methode"],
    ["/methode/", "methode"],
    ["/tableau", "tableau"],
    ["/jt", "jt"],
    ["/proprietaires/", "proprietaires"],
  ])("%s → %s", (chemin, page) => {
    expect(pageDepuisChemin(chemin)).toBe(page);
  });
});
