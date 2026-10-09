/**
 * Conversion de docs/methode.md en HTML pour la page « Méthode » (E3-04, EF-M6-04, T-069).
 *
 * Le document du dépôt est la seule version du texte : il est converti au build (et à la volée en
 * développement) par le module virtuel `virtual:methode` (vite.config.ts). Chaque titre reçoit une
 * ancre ; les sections de niveau 2 forment le sommaire. Les liens relatifs (ADR, paramètres)
 * pointent vers le dépôt public ; les liens absolus du site (/tableau) sont gardés.
 */
import { Marked, Renderer, type Tokens } from "marked";

export const DEPOT = "https://github.com/Capcodex/OpenDataChallenge_Audiovisuel";
const DOSSIER_DOCS = `${DEPOT}/blob/main/docs/`;

export interface Methode {
  html: string;
  sommaire: { id: string; titre: string }[];
}

/** « 3.1 Le lift » → « le-lift » ; « 9. Ce que la carte… » → « ce-que-la-carte… ». */
export function ancre(texte: string): string {
  return texte
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^[\d.\s]+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Lien du document → lien de la page publiée. */
export function lienPublie(href: string): string {
  if (/^(https?:|mailto:|#|\/)/.test(href)) return href;
  return new URL(href, DOSSIER_DOCS).href;
}

const RENDU_PAR_DEFAUT = new Renderer();

const echapper = (texte: string) =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function convertirMethode(markdown: string): Methode {
  const sommaire: Methode["sommaire"] = [];
  const vues = new Set<string>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        let id = ancre(text) || "section";
        while (vues.has(id)) id += "-2";
        vues.add(id);
        const contenu = this.parser.parseInline(tokens);
        if (depth === 2) sommaire.push({ id, titre: text.replace(/^[\d.]+\s*/, "") });
        return `<h${depth} id="${id}">${contenu}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const cible = lienPublie(href);
        const externe = /^https?:/.test(cible);
        const attributs = [
          `href="${echapper(cible)}"`,
          title ? `title="${echapper(title)}"` : "",
          externe ? 'rel="noopener"' : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<a ${attributs}>${this.parser.parseInline(tokens)}</a>`;
      },
      // Les tableaux larges défilent dans leur cadre, pas la page (mobile).
      table(jeton: Tokens.Table) {
        const tableau = RENDU_PAR_DEFAUT.table.call(this, jeton);
        return `<div class="defilant">${tableau}</div>\n`;
      },
      // Commentaires de rédaction du document : jamais publiés.
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return text.trim().startsWith("<!--") ? "" : text;
      },
    },
  });
  const html = marked.parse(markdown, { async: false });
  return { html, sommaire };
}
