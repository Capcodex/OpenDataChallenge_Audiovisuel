/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import preact from "@preact/preset-vite";
import { defineConfig, type Plugin } from "vite";

import type { Graphe } from "./src/graph/types";
import { convertirMethode } from "./scripts/methode";
import { pagesStatiques } from "./scripts/pages-statiques";

// docs/methode.md : monté dans /app/docs du conteneur (compose.yaml, docker/site.Dockerfile).
const METHODE = fileURLToPath(new URL("../docs/methode.md", import.meta.url));
const GRAPHE = fileURLToPath(new URL("./public/data/graph.json", import.meta.url));

const lireMethode = () => convertirMethode(readFileSync(METHODE, "utf-8"));

/** Module `virtual:methode` : la page Méthode, convertie depuis docs/methode.md (T-069). */
function methode(): Plugin {
  const ID = "virtual:methode";
  const RESOLU = `\0${ID}`;
  return {
    name: "methode",
    resolveId: (id) => (id === ID ? RESOLU : undefined),
    load(id) {
      if (id !== RESOLU) return undefined;
      this.addWatchFile(METHODE);
      return `export default ${JSON.stringify(lireMethode())};`;
    },
  };
}

export default defineConfig({
  plugins: [
    preact(),
    methode(),
    pagesStatiques(() => ({
      graphe: JSON.parse(readFileSync(GRAPHE, "utf-8")) as Graphe,
      methode: lireMethode(),
    })),
  ],
  build: {
    // Aucun script ni style en ligne : la CSP de nginx les interdit (ENF-11).
    assetsInlineLimit: 0,
    target: "es2020", // ENF-04
  },
  server: {
    // Surveillance par sondage : les événements du système de fichiers de l'hôte ne traversent pas
    // toujours le montage Docker (macOS).
    watch: { usePolling: true, interval: 300 },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
