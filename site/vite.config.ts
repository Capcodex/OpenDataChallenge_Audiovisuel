/// <reference types="vitest/config" />
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
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
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
