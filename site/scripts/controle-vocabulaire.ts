/**
 * `npm run vocabulaire -- <fichiers…>` : échoue si un texte contient une formule interdite
 * (RG-20, RG-25). Lancé en CI sur src/i18n/fr.ts et docs/methode.md.
 */
import { readFileSync } from "node:fs";
import process from "node:process";

import { controlerVocabulaire } from "../src/i18n/vocabulaire.ts";

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error("Usage : npm run vocabulaire -- <fichier> [fichier…]");
  process.exit(2);
}

let total = 0;
for (const fichier of fichiers) {
  const infractions = controlerVocabulaire(readFileSync(fichier, "utf-8"));
  for (const i of infractions) {
    console.error(`${fichier}:${i.ligne} « ${i.extrait} » : ${i.raison}`);
  }
  total += infractions.length;
  if (infractions.length === 0) console.log(`✓ ${fichier}`);
}
process.exit(total > 0 ? 1 : 0);
