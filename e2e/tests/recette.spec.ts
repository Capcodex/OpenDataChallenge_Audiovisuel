/**
 * Scénarios de recette Thomas, Claire et Karim (CdC fonctionnel § 12.2, T-080), et contrôle
 * d'accessibilité axe-core sur chaque écran (CdC technique § 12.2) : aucune violation critique
 * ou grave n'est acceptée.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const champ = (page: Page) =>
  page.getByRole("combobox", { name: "Rechercher un média" });
const fiche = (page: Page) =>
  page.getByRole("complementary", { name: "Fiche média" });

test.beforeEach(({ page }) => {
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Content Security Policy/i.test(message.text())
    ) {
      throw new Error(`Violation de la CSP : ${message.text()}`);
    }
  });
});

test("Thomas : calque d'un propriétaire, puis export de l'image avec sa source", async ({
  page,
}) => {
  // V2 : le calque fait partie de la carte (vue Propriétaires, par défaut).
  await page.goto("/");
  const liste = page.getByRole("list", { name: "Propriétaires" });
  await page.getByRole("searchbox", { name: "Filtrer la liste" }).fill("Saadé");
  await liste.getByRole("button", { name: /Rodolphe Saadé/ }).click();
  await expect(page).toHaveURL(/\?proprietaire=rodolphe-saade$/);
  const synthese = page.getByRole("complementary", {
    name: "Synthèse du propriétaire",
  });
  await expect(synthese.getByRole("heading", { level: 2 })).toHaveText(
    "Rodolphe Saadé",
  );
  await expect(synthese.getByRole("link", { name: "BFM TV" })).toBeVisible();
  await expect(synthese).toContainText("Source : Le Monde diplomatique");

  await page.getByRole("button", { name: "Exporter l'image" }).click();
  const dialogue = page.getByRole("dialog", { name: "Exporter l'image" });
  await expect(dialogue).toBeVisible();
  // Cartouche obligatoire : case cochée, non désactivable (RG-23).
  const cartouche = dialogue.getByRole("checkbox", {
    name: "Cartouche de source (obligatoire)",
  });
  await expect(cartouche).toBeChecked();
  await expect(cartouche).toBeDisabled();

  await dialogue.getByRole("radio", { name: /SVG/ }).check();
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    dialogue.getByRole("button", { name: "Télécharger le SVG" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(
    /^graphe-medias-\d{4}\.svg$/,
  );
  const svg = await (await telechargement.createReadStream()).toArray();
  const texte = Buffer.concat(svg).toString("utf-8");
  expect(texte).toContain("Médias détenus par Rodolphe Saadé");
  // Légende du cartouche : celle de la vue Propriétaires.
  expect(texte).toContain("République française");
  expect(texte).toContain("Non identifié");
  expect(texte).toContain("BFM TV");
  expect(texte).toContain(
    "Elle décrit des publics, pas des lignes éditoriales.",
  );
  expect(texte).toMatch(
    /Source : Arcom, baromètre « Les Français et l'information » \d{4}/,
  );
  await expect(dialogue).toBeHidden();
});

test("vues : Propriétaires par défaut, Familles au clavier, conservées dans l'adresse", async ({
  page,
}) => {
  await page.goto("/");
  const vues = page.getByRole("group", { name: "Couleur des points" });
  await expect(
    vues.getByRole("button", { name: "Propriétaires" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Propriétaire principal" }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Propriétaires" })).toBeVisible();

  await vues.getByRole("button", { name: "Familles" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?vue=familles$/);
  await expect(
    page.getByRole("heading", { name: "Familles de médias" }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Propriétaires" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /^Famille 2/ }).click();
  await expect(page).toHaveURL(/\?vue=familles&famille=2$/);

  // La vue se rouvre à l'identique ; revenir aux propriétaires retire le filtre de famille.
  await page.reload();
  await expect(vues.getByRole("button", { name: "Familles" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await vues.getByRole("button", { name: "Propriétaires" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("vue Familles : positionnement relatif du public, légende, fiche et export (ADR-011)", async ({
  page,
}) => {
  await page.goto("/?vue=familles");
  const legende = page.getByRole("region", { name: "Familles de médias" });
  await expect(
    legende.getByRole("button", { name: /Famille 3/ }),
  ).toContainText(
    /Public le plus à gauche des 3 familles · [\d,]+ sur 10, marge [\d,]+–[\d,]+/,
  );
  await expect(
    legende.getByRole("button", { name: /Famille 1/ }),
  ).toContainText("Public parmi les plus à droite des 3 familles");
  await expect(legende).toContainText("comparé à celui des autres familles");

  // Fiche d'un média de la famille 3 : libellé de sa famille, dans le profil du public.
  await page.goto("/media/brut?vue=familles");
  await expect(
    page.getByRole("complementary", { name: "Fiche média" }),
  ).toContainText("Famille 3 : public le plus à gauche des 3 familles.");

  await page.getByRole("button", { name: "Exporter l'image" }).click();
  await page.getByRole("radio", { name: /SVG/ }).check();
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le SVG" }).click(),
  ]);
  const texte = Buffer.concat(
    await (await telechargement.createReadStream()).toArray(),
  ).toString("utf-8");
  expect(texte).toContain("Famille 3 · public le plus à gauche des 3 familles");
});

test("légende : un clic sur un propriétaire fait ressortir ses médias", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "Propriétaire principal" })
    .getByRole("button", { name: /Xavier Niel/ })
    .click();
  await expect(page).toHaveURL(/\?proprietaire=xavier-niel$/);
  const synthese = page.getByRole("complementary", {
    name: "Synthèse du propriétaire",
  });
  await expect(
    synthese.getByRole("link", { name: "Le Monde", exact: true }),
  ).toBeVisible();
  await synthese
    .getByRole("button", { name: "Tous les propriétaires" })
    .click();
  await expect(page).toHaveURL(/\/$/);
});

test("Thomas : export PNG depuis la carte", async ({ page }) => {
  await page.goto("/?type=radio");
  await page.getByRole("button", { name: "Exporter l'image" }).click();
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le PNG" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/\.png$/);
  const octets = Buffer.concat(
    await (await telechargement.createReadStream()).toArray(),
  );
  expect(octets.subarray(1, 4).toString()).toBe("PNG");
  expect(octets.length).toBeGreaterThan(20_000);
});

test("Claire : télécharger les liens en CSV et retrouver le lift affiché", async ({
  page,
}) => {
  await page.goto("/tableau");
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /liens\.csv/ }).click(),
  ]);
  const csv = Buffer.concat(
    await (await telechargement.createReadStream()).toArray(),
  ).toString("utf-8");
  const [entete, ...lignes] = csv.trim().split("\n");
  const colonnes = entete.split(",");
  const lien = (a: string, b: string) => {
    const ligne = lignes
      .map((l) =>
        Object.fromEntries(l.split(",").map((v, i) => [colonnes[i], v])),
      )
      .find(
        (l) =>
          (l.source === a && l.cible === b) ||
          (l.source === b && l.cible === a),
      );
    if (!ligne) throw new Error(`Lien ${a}–${b} absent du CSV`);
    return ligne;
  };

  // Deux liens de la fiche de France Inter : même lift (arrondi à 0,1) et même effectif commun.
  await page.goto("/media/france-inter");
  for (const [id, nom] of [
    ["france-culture", "France Culture"],
    ["liberation", "Libération"],
  ]) {
    const l = lien("france-inter", id);
    const attendu = `× ${Number(l.lift).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} · ${l.n_communs} communs`;
    await expect(
      fiche(page).getByRole("button", { name: new RegExp(nom) }),
    ).toContainText(attendu);
  }
});

test("Karim : retrouver HugoDécrypte et ouvrir sa fiche sans aide", async ({
  page,
}) => {
  await page.goto("/");
  await champ(page).fill("hugo");
  await expect(page.getByRole("option").first()).toContainText("HugoDécrypte");
  await champ(page).press("Enter");
  await expect(fiche(page).getByRole("heading", { level: 2 })).toHaveText(
    "HugoDécrypte",
  );
  await expect(page).toHaveURL(/\/media\/hugodecrypte$/);
});

test("recherche depuis une autre page : ouvre la fiche sur la carte", async ({
  page,
}) => {
  await page.goto("/methode");
  await champ(page).fill("le monde");
  await champ(page).press("Enter");
  await expect(page).toHaveURL(/\/media\/le-monde$/);
  await expect(fiche(page).getByRole("heading", { level: 2 })).toHaveText(
    "Le Monde",
  );
});

test("vue tableau : tri au clavier et lien vers la fiche (ENF-08)", async ({
  page,
}) => {
  await page.goto("/tableau");
  const tri = page.getByRole("button", { name: "Répondants" });
  await tri.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("columnheader", { name: /Répondants/ }),
  ).toHaveAttribute("aria-sort", "descending");
  const premier = page.getByRole("rowheader").first();
  await expect(premier).toHaveText("TF1");
  await page
    .getByRole("searchbox", { name: "Filtrer les médias" })
    .fill("libé");
  await expect(page.getByRole("rowheader")).toHaveText(["Libération"]);
});

test("page Méthode : sommaire et section « Ce que la carte ne mesure pas »", async ({
  page,
}) => {
  await page.goto("/methode");
  await page
    .getByRole("navigation", { name: "Sommaire de la page" })
    .getByRole("link", { name: "Ce que la carte ne mesure pas" })
    .click();
  await expect(page).toHaveURL(/#ce-que-la-carte-ne-mesure-pas$/);
  await expect(
    page.getByRole("heading", { name: /Ce que la carte ne mesure pas/ }),
  ).toBeInViewport();
});

test("page pré-générée : titre, Open Graph et résumé sans JavaScript (E2-04)", async ({
  browser,
}) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto("/media/france-inter/");
  await expect(page).toHaveTitle("France Inter · Graphe des médias");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "France Inter · Graphe des médias",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    /\/media\/france-inter$/,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "France Inter",
  );
  await expect(
    page.getByText(/Le public de ce média se situe en moyenne à/),
  ).toBeVisible();
  await contexte.close();
});

test("sources : mention Arcom, licence et date des données sur chaque écran (CdC § 12.3)", async ({
  page,
}) => {
  for (const adresse of [
    "/",
    "/media/france-inter",
    "/methode",
    "/tableau",
    "/?vue=familles",
  ]) {
    await page.goto(adresse);
    const pied = page.getByRole("contentinfo");
    await expect(pied, adresse).toContainText("Arcom");
    await expect(pied, adresse).toContainText("Licence Ouverte");
    await expect(pied, adresse).toContainText(/Données traitées le \d/);
  }
});

// Accessibilité automatique (axe-core) : chaque écran, et la fenêtre d'export ouverte.
const ECRANS: [string, string, ((page: Page) => Promise<void>)?][] = [
  ["carte", "/"],
  ["fiche", "/media/france-inter"],
  ["fiche fragile", "/media/aj-plus"],
  ["effectif insuffisant", "/media/skyrock"],
  ["méthode", "/methode"],
  ["tableau", "/tableau"],
  ["vue Propriétaires, propriétaire choisi", "/?proprietaire=rodolphe-saade"],
  ["vue Familles", "/?vue=familles"],
  [
    "recherche ouverte",
    "/",
    async (page) => {
      await champ(page).fill("france");
      await expect(page.getByRole("listbox")).toBeVisible();
    },
  ],
  [
    "export",
    "/",
    async (page) => {
      await page.getByRole("button", { name: "Exporter l'image" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  ],
];

for (const [nom, adresse, preparer] of ECRANS) {
  test(`accessibilité (axe-core) : ${nom}`, async ({ page }) => {
    await page.goto(adresse);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForLoadState("networkidle");
    if (preparer) await preparer(page);
    const resultat = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const graves = resultat.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      graves.map(
        (v) =>
          `${v.impact} · ${v.id} : ${v.help} (${v.nodes.length} éléments : ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(" "))
            .join(" | ")})`,
      ),
    ).toEqual([]);
  });
}
