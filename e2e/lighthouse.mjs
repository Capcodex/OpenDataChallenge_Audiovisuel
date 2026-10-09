/**
 * Budgets Lighthouse (CdC technique § 12.2, CdC fonctionnel § 12.3, T-083) : performance ≥ 90 et
 * accessibilité ≥ 95 sur chaque écran. Profil « bureau » de Lighthouse (débit et processeur
 * simulés), contre l'image de production : BASE_URL, comme les tests Playwright. Chaque page est
 * mesurée 3 fois et la note médiane est retenue, comme Lighthouse CI : la première mesure, dans un
 * navigateur froid, est souvent plus basse.
 * Usage : node lighthouse.mjs  (sortie non nulle si un budget n'est pas tenu)
 */
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktop from "lighthouse/core/config/desktop-config.js";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const BUDGETS = { performance: 90, accessibility: 95 };
const PAGES = [
  "/",
  "/media/france-inter",
  "/methode",
  "/tableau",
  "/jt",
  "/proprietaires",
];
const PASSAGES = 3;
const mediane = (valeurs) =>
  [...valeurs].sort((a, b) => a - b)[Math.floor(valeurs.length / 2)];

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: [
    "--headless=new",
    "--no-sandbox",
    // Comme pour Playwright : l'adresse testée est traitée comme en HTTPS (presse-papiers…).
    `--unsafely-treat-insecure-origin-as-secure=${new URL(BASE_URL).origin}`,
  ],
});

let echecs = 0;
try {
  for (const page of PAGES) {
    const rapports = [];
    for (let i = 0; i < PASSAGES; i++) {
      const { lhr } = await lighthouse(
        BASE_URL + page,
        {
          port: chrome.port,
          onlyCategories: Object.keys(BUDGETS),
          logLevel: "error",
        },
        desktop,
      );
      rapports.push(lhr);
    }
    const note = (lhr, c) => Math.round((lhr.categories[c]?.score ?? 0) * 100);
    const notes = Object.fromEntries(
      Object.keys(BUDGETS).map((c) => [
        c,
        mediane(rapports.map((r) => note(r, c))),
      ]),
    );
    // Rapport détaillé : le passage dont la performance est la médiane.
    const lhr =
      rapports.find((r) => note(r, "performance") === notes.performance) ??
      rapports[0];
    const enEchec = Object.entries(BUDGETS).filter(
      ([c, min]) => notes[c] < min,
    );
    echecs += enEchec.length;
    const lcp = lhr.audits["largest-contentful-paint"]?.displayValue ?? "?";
    console.log(
      `${enEchec.length ? "✗" : "✓"} ${page.padEnd(22)} performance ${notes.performance}, ` +
        `accessibilité ${notes.accessibility} · LCP ${lcp}`,
    );
    for (const [categorie] of enEchec) {
      const audits = lhr.categories[categorie].auditRefs
        .map((r) => lhr.audits[r.id])
        .filter(
          (a) =>
            a.score !== null &&
            a.score < 0.9 &&
            a.scoreDisplayMode !== "informative",
        )
        .slice(0, 5)
        .map(
          (a) => `${a.title} (${a.displayValue ?? Math.round(a.score * 100)})`,
        );
      console.log(
        `    ${categorie} sous ${BUDGETS[categorie]} : ${audits.join(" ; ")}`,
      );
    }
  }
} finally {
  await chrome.kill();
}

if (echecs) {
  console.error(`${echecs} budget(s) non tenu(s)`);
  process.exit(1);
}
console.log("Budgets Lighthouse tenus sur toutes les pages.");
