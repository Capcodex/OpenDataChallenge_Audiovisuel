/**
 * Pages pré-générées (E2-04, EF-M7-01, CdC technique § 9.2, T-070).
 *
 * À la fin du build, une page HTML par écran (/methode/, /tableau/…) et par média
 * (/media/<id>/index.html), à partir de dist/index.html :
 *   - titre, description, lien canonique et balises Open Graph propres (aperçu du lien partagé) ;
 *   - un résumé lisible sans JavaScript, indexable, remplacé par l'application à son démarrage.
 * nginx sert ces fichiers directement (try_files $uri/index.html), sans redirection.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Plugin } from "vite";

import {
  cinqVoisins,
  formaterDate,
  lienPermanent,
  mentionFiche,
  propriete,
  seuils,
} from "../src/fiche/fiche-donnees";
import type { Graphe, Noeud } from "../src/graph/types";
import { formaterPart, fr, phrasePositionnement } from "../src/i18n/fr";
import { CHEMINS, type Page } from "../src/pages";
import type { Methode } from "./methode";

export const echapper = (texte: string): string =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Entete {
  titre: string;
  description: string;
  url: string;
  type?: "website" | "article";
}

/** Remplace titre et description du gabarit, ajoute canonique et Open Graph, insère le corps. */
export function composerPage(gabarit: string, entete: Entete, corps: string): string {
  const { titre, description, url, type = "website" } = entete;
  const balises = [
    `<link rel="canonical" href="${echapper(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${echapper(fr.marque)}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${echapper(titre)}" />`,
    `<meta property="og:description" content="${echapper(description)}" />`,
    `<meta property="og:url" content="${echapper(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
  const page = gabarit
    .replace(/<title>[^<]*<\/title>/, `<title>${echapper(titre)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${echapper(description)}" />`,
    )
    .replace("</head>", `    ${balises}\n  </head>`)
    .replace('<div id="app"></div>', `<div id="app">${corps}</div>`);
  if (!page.includes(`<title>${echapper(titre)}</title>`) || !page.includes(corps)) {
    throw new Error("Gabarit dist/index.html inattendu : titre ou point de montage introuvable");
  }
  return page;
}

const p = (texte: string) => `<p>${echapper(texte)}</p>`;

/** Résumé d'une fiche, lisible sans JavaScript. */
export function resumeMedia(g: Graphe, m: Noeud): string {
  const voisins = cinqVoisins(g.edges, m.id);
  const noms = new Map(g.nodes.map((n) => [n.id, n.label]));
  const prop = propriete(g, m);
  const lignesVoisins = voisins
    .map(
      ({ id, lien }) =>
        `<li><a href="/media/${id}/">${echapper(noms.get(id) ?? id)}</a> · ${echapper(
          fr.fiche.voisin(lien.lift, lien.n),
        )}</li>`,
    )
    .join("");
  const proprietaires = prop.proprietaires.length
    ? p(
        `${fr.fiche.groupe} : ${prop.groupe ?? fr.fiche.aucunGroupe}. ${fr.fiche.proprietaires} : ${prop.proprietaires
          .map((o) => (o.part === null ? o.nom : `${o.nom} (${formaterPart(o.part)})`))
          .join(", ")}.`,
      ) +
      (prop.source
        ? p(fr.fiche.sourcePropriete(prop.source.nom, formaterDate(prop.source.date)))
        : "")
    : p(fr.fiche.nonIdentifie);
  return [
    `<main class="statique">`,
    p(fr.types[m.type] ?? m.type),
    `<h1>${echapper(m.label)}</h1>`,
    p(fr.fiche.effectif(m.n) + (m.fragile ? ` · ${fr.fiche.fragile}` : "")),
    `<h2>${echapper(fr.fiche.voisinsTitre)}</h2><ol>${lignesVoisins}</ol>`,
    `<h2>${echapper(fr.fiche.profilTitre)}</h2>`,
    p(phrasePositionnement(...m.pol)),
    p(
      `${fr.fiche.ageTitre} : ${fr.fiche.age(m.age[0])} (${fr.fiche.ageMarge(m.age[1], m.age[2])}). ` +
        `${fr.fiche.moins35Titre} : ${formaterPart(m.under35[0])} (${fr.fiche.partMarge(m.under35[1], m.under35[2])}).`,
    ),
    `<h2>${echapper(fr.fiche.proprieteTitre)}</h2>`,
    proprietaires,
    `<h2>${echapper(fr.fiche.citerTitre)}</h2>`,
    p(mentionFiche(g, m.id)),
    `<p><a href="/">${echapper(fr.etats.retourCarte)}</a></p>`,
    `</main>`,
  ].join("");
}

export function resumeInsuffisant(g: Graphe, o: Graphe["others"][number]): string {
  return [
    `<main class="statique">`,
    p(fr.types[o.type] ?? o.type),
    `<h1>${echapper(o.label)}</h1>`,
    p(fr.etats.effectifInsuffisant(seuils(g).affichable)),
    `<p><a href="/">${echapper(fr.etats.retourCarte)}</a></p>`,
    `</main>`,
  ].join("");
}

function ecrire(dossier: string, chemin: string, contenu: string): void {
  const fichier = join(dossier, chemin, "index.html");
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, contenu);
}

/** Écrit toutes les pages dans `dist` ; renvoie le nombre de pages. */
export function genererPages(dist: string, g: Graphe, methode: Methode): number {
  const gabarit = readFileSync(join(dist, "index.html"), "utf-8");
  const adresse = g.meta.adresse_site.replace(/\/+$/, "");
  let nombre = 0;

  // Page d'accueil : balises Open Graph et canonique ajoutées au gabarit lui-même.
  const accueil = composerPage(
    gabarit,
    { titre: fr.pages.carte.titre, description: fr.pages.carte.description, url: `${adresse}/` },
    "",
  );
  writeFileSync(join(dist, "index.html"), accueil);

  const corpsPages: Partial<Record<Page, string>> = {
    methode: `<main class="statique methode">${methode.html}</main>`,
  };
  for (const page of ["proprietaires", "jt", "methode", "tableau"] as const) {
    const { titre, description } = fr.pages[page];
    const url = `${adresse}${CHEMINS[page]}`;
    ecrire(
      dist,
      CHEMINS[page],
      composerPage(gabarit, { titre, description, url }, corpsPages[page] ?? ""),
    );
    nombre++;
  }

  const noms = new Map(g.nodes.map((n) => [n.id, n.label]));
  for (const m of g.nodes) {
    const voisins = cinqVoisins(g.edges, m.id).map((v) => noms.get(v.id) ?? v.id);
    const entete: Entete = {
      titre: fr.pages.media(m.label),
      description: fr.pages.mediaDescription(m.label, m.n, voisins.slice(0, 3)),
      url: lienPermanent(g, m.id),
      type: "article",
    };
    ecrire(dist, `media/${m.id}`, composerPage(gabarit, entete, resumeMedia(g, m)));
    nombre++;
  }
  for (const o of g.others) {
    const entete: Entete = {
      titre: fr.pages.media(o.label),
      description: fr.pages.mediaInsuffisant(o.label),
      url: lienPermanent(g, o.id),
      type: "article",
    };
    ecrire(dist, `media/${o.id}`, composerPage(gabarit, entete, resumeInsuffisant(g, o)));
    nombre++;
  }
  return nombre;
}

/** Plugin Vite : génère les pages à la fin du build. */
export function pagesStatiques(charger: () => { graphe: Graphe; methode: Methode }): Plugin {
  let dist = "dist";
  return {
    name: "pages-statiques",
    apply: "build",
    configResolved(config) {
      dist = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const { graphe, methode } = charger();
      const nombre = genererPages(dist, graphe, methode);
      this.info(`${nombre} pages pré-générées`);
    },
  };
}
