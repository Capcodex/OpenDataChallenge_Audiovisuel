/**
 * Tests de bout en bout (CdC technique § 12.2). En CI et avec `make test-e2e`, ils tournent dans
 * le conteneur `e2e` contre l'image de production `site` : on teste exactement ce qui sera déployé.
 * Adresse du site : variable BASE_URL (par défaut, le service `site` publié sur le poste).
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080",
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
