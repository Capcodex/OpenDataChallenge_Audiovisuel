/**
 * Tests de bout en bout (CdC technique § 12.2). En CI et avec `make test-e2e`, ils tournent dans
 * le conteneur `e2e` contre l'image de production `site` : on teste exactement ce qui sera déployé.
 * Adresse du site : variable BASE_URL (par défaut, le service `site` publié sur le poste).
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "fr-FR",
    trace: "retain-on-failure",
    // En production, le site est servi en HTTPS : l'API presse-papiers y est disponible. Dans
    // Compose, il est en HTTP sur http://site:8080, qui n'est pas un contexte sécurisé (seul
    // localhost l'est) : Chromium traite cette origine comme en production. Ce réglage n'est
    // respecté que par le Chromium complet, pas par la version allégée lancée par défaut.
    channel: "chromium",
    launchOptions: {
      args: [
        `--unsafely-treat-insecure-origin-as-secure=${new URL(baseURL).origin}`,
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
});
