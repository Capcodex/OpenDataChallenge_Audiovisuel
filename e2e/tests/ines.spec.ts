/**
 * Scénario d'Inès (CdC fonctionnel § 12.2, persona « journaliste ») : trouver les 5 voisins de
 * France Inter et copier la mention de source en moins de 30 secondes.
 *
 * Et, autour de ce parcours, ce que le sprint 6 ne peut vérifier que dans un navigateur :
 * recherche au clavier, navigation entre fiches, fermeture par Échap, états particuliers, CSP.
 */
import { expect, test, type Page } from "@playwright/test";

const champ = (page: Page) =>
  page.getByRole("combobox", { name: "Rechercher un média" });
const fiche = (page: Page) =>
  page.getByRole("complementary", { name: "Fiche média" });
const voisins = (page: Page) =>
  fiche(page)
    .getByRole("region", { name: "Médias au public le plus proche" })
    .getByRole("listitem");

// La CSP de nginx interdit scripts et styles en ligne (ENF-11) : toute violation fait échouer.
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

test("Inès : voisins de France Inter et mention de source en moins de 30 s", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const debut = Date.now();

  await page.goto("/");
  await champ(page).fill("france inter");
  await expect(page.getByRole("option").first()).toContainText("France Inter");
  await champ(page).press("Enter");

  // La fiche s'ouvre, reçoit le focus et l'adresse devient partageable.
  await expect(fiche(page).getByRole("heading", { level: 2 })).toHaveText(
    "France Inter",
  );
  await expect(fiche(page).getByRole("heading", { level: 2 })).toBeFocused();
  await expect(page).toHaveURL(/\/media\/france-inter$/);
  await expect(voisins(page)).toHaveCount(5);

  await fiche(page)
    .getByRole("button", { name: "Copier la mention de source" })
    .click();
  await expect(
    fiche(page).getByRole("button", { name: "Mention de source copiée" }),
  ).toBeVisible();
  const mention = await page.evaluate(() => navigator.clipboard.readText());
  // RG-24
  expect(mention).toMatch(
    /^Source : Arcom, baromètre Les Français et l'information \d{4} ; traitement : Graphe des médias, \d{1,2} \S+ \d{4}, https:\/\/\S+\/media\/france-inter\.$/,
  );

  expect(Date.now() - debut).toBeLessThan(30_000);
});

test("copie refusée : mention sélectionnée dans une zone de texte (E3-03, repli)", async ({
  page,
}) => {
  // Presse-papiers refusé (permission, navigateur ancien, contexte non sécurisé).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("refusé")) },
    });
  });
  await page.goto("/media/france-inter");
  await fiche(page)
    .getByRole("button", { name: "Copier la mention de source" })
    .click();

  const zone = fiche(page).getByRole("textbox", {
    name: "Copier la mention de source",
  });
  await expect(zone).toHaveValue(/^Source : Arcom, .+\/media\/france-inter\.$/);
  await expect(zone).toBeFocused();
  // Tout le texte est sélectionné : Ctrl+C suffit.
  const selection = await zone.evaluate(
    (el: HTMLTextAreaElement) =>
      el.selectionEnd - el.selectionStart === el.value.length,
  );
  expect(selection).toBe(true);
});

test("variantes de nom et navigation au clavier (E2-01)", async ({ page }) => {
  await page.goto("/");
  for (const variante of ["franceinfo", "France Info", "france-info"]) {
    await champ(page).fill(variante);
    await expect(page.getByRole("option").first()).toContainText("Franceinfo");
  }
  await champ(page).press("ArrowDown");
  await champ(page).press("ArrowDown");
  await expect(page.getByRole("option").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await champ(page).press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await champ(page).press("Escape");
  await expect(champ(page)).toHaveValue("");
});

test("aucun média trouvé (EF-M2-04)", async ({ page }) => {
  await page.goto("/");
  await champ(page).fill("Ouest-France");
  await expect(
    page.getByText("Aucun média trouvé.", { exact: true }).first(),
  ).toBeVisible();
});

test("clic sur un voisin : fiche du voisin en moins de 200 ms (E2-03, ENF-03)", async ({
  page,
}) => {
  await page.goto("/media/france-inter");
  await expect(voisins(page)).toHaveCount(5);
  const nom =
    (await voisins(page).first().locator(".fiche__voisin-nom").textContent()) ??
    "";

  // Délai entre le clic et l'affichage du nouveau titre. Une mesure isolée est bruitée sur une
  // machine de CI chargée : 5 ouvertures, la médiane doit rester sous 200 ms.
  const durees = await page.evaluate(async () => {
    const mesures: number[] = [];
    for (let i = 0; i < 5; i++) {
      const titre = document.querySelector("aside h2");
      const avant = titre?.textContent;
      const bouton =
        document.querySelector<HTMLButtonElement>(".fiche__voisin");
      if (!titre || !bouton) throw new Error("Fiche ou voisin introuvable");
      const debut = performance.now();
      const affiche = new Promise<void>((fin) => {
        const observateur = new MutationObserver(() => {
          if (document.querySelector("aside h2")?.textContent !== avant) {
            observateur.disconnect();
            fin();
          }
        });
        observateur.observe(document.querySelector("aside")!, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
      bouton.click();
      await affiche;
      mesures.push(performance.now() - debut);
    }
    return mesures;
  });
  const mediane = [...durees].sort((a, b) => a - b)[2];
  expect(
    mediane,
    `durées mesurées : ${durees.map((d) => d.toFixed(0)).join(", ")} ms`,
  ).toBeLessThan(200);

  // Retour arrière du navigateur : fiche du premier voisin, puis France Inter après 5 retours.
  for (let i = 0; i < 4; i++) await page.goBack();
  await expect(fiche(page).getByRole("heading", { level: 2 })).toHaveText(nom);
  await page.goBack();
  await expect(fiche(page).getByRole("heading", { level: 2 })).toHaveText(
    "France Inter",
  );
});

test("Échap ferme la fiche et rend le focus à la recherche (EF-M3-09)", async ({
  page,
}) => {
  await page.goto("/");
  await champ(page).fill("le monde");
  await champ(page).press("Enter");
  await expect(fiche(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fiche(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(champ(page)).toBeFocused();
});

test("effectif insuffisant : trouvé par la recherche, sans indicateurs (RG-02)", async ({
  page,
}) => {
  await page.goto("/");
  await champ(page).fill("Skyrock");
  await expect(page.getByRole("option").first()).toContainText(
    "effectif insuffisant",
  );
  await champ(page).press("Enter");
  await expect(fiche(page)).toContainText(
    "Trop peu de répondants suivent ce média (moins de 50)",
  );
  await expect(fiche(page).getByRole("region")).toHaveCount(0);
});

test("chiffres avec effectif et marge, badge « chiffre fragile » (E3-01)", async ({
  page,
}) => {
  await page.goto("/media/aj-plus"); // 62 répondants
  await expect(fiche(page)).toContainText("n = 62 répondants");
  await expect(fiche(page).getByText("Chiffre fragile")).toBeVisible();
  await expect(fiche(page)).toContainText(
    /Le public de ce média se situe en moyenne à [\d,]+ sur une échelle de 0 \(très à gauche\) à 10 \(très à droite\), marge [\d,]+–[\d,]+\./,
  );
});
