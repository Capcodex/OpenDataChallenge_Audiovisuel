/**
 * Image exportée de la carte (E6-01, EF-M7-03, RG-23, CdC technique § 9.4, T-075).
 *
 * SVG généré à partir des positions et des styles de graph.json (cercles, lignes, textes) ; le PNG
 * en est le rendu sur un canvas. Le cartouche (légende des familles, phrase de lecture RG-21,
 * source, date, adresse) fait partie de l'image : aucune option ne permet de le retirer.
 */
import {
  COULEUR_ESTOMPEE,
  COULEUR_LIEN,
  COULEUR_SANS_FAMILLE,
  epaisseurLien,
  taillePoint,
} from "../composants/carte-donnees";
import { formaterDate } from "../fiche/fiche-donnees";
import type { Graphe, Noeud } from "../graph/types";
import { libellePosition } from "../familles/position";
import { cartoucheExport, fr } from "../i18n/fr";

export interface OptionsExport {
  largeur: number;
  hauteur: number;
  noms: boolean;
  liens: boolean;
  /** Calque propriétaires : médias mis en avant ; les autres sont estompés et sans nom. */
  misEnAvant?: ReadonlySet<string> | null;
  /** Titre en haut de l'image (calque : « Médias détenus par … »). */
  titre?: string;
  /**
   * Coloration de la vue Propriétaires (V2) : couleur de chaque média et légende du cartouche.
   * Absente : couleurs et légende des familles.
   */
  coloration?: { couleurs: ReadonlyMap<string, string>; legende: EntreeCartouche[] } | null;
}

export interface EntreeCartouche {
  libelle: string;
  couleur: string;
}

export const TAILLES = [
  { largeur: 1600, hauteur: 900, libelle: "1600 × 900 (16:9)" },
  { largeur: 1200, hauteur: 1200, libelle: "1200 × 1200 (carré)" },
  { largeur: 2400, hauteur: 1350, libelle: "2400 × 1350 (haute définition)" },
] as const;

const POLICE = "IBM Plex Sans, Helvetica, Arial, sans-serif";

const xml = (texte: string) =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Image SVG de la carte et de son cartouche. `visibles` : médias passant les filtres en cours. */
export function imageSvg(g: Graphe, visibles: Noeud[], options: OptionsExport): string {
  const {
    largeur: L,
    hauteur: H,
    noms,
    liens,
    misEnAvant = null,
    titre,
    coloration = null,
  } = options;
  const enAvant = (id: string) => !misEnAvant || misEnAvant.has(id);
  const e = L / 1600; // échelle des tailles de points, traits et textes
  const marge = 40 * e;
  const hCartouche = 150 * e;
  const hTitre = titre ? 40 * e : 0;
  const zone = {
    x: marge,
    y: marge + hTitre,
    l: L - 2 * marge,
    h: H - hCartouche - 2 * marge - hTitre,
  };

  // Les coordonnées du pipeline tiennent dans [0, 1] ; on garde les proportions.
  const xs = visibles.map((n) => n.x);
  const ys = visibles.map((n) => n.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const echelle = Math.min(zone.l / (x1 - x0 || 1), zone.h / (y1 - y0 || 1));
  const dx = zone.x + (zone.l - (x1 - x0) * echelle) / 2;
  const dy = zone.y + (zone.h - (y1 - y0) * echelle) / 2;
  const pos = new Map(
    visibles.map((n) => [n.id, { x: dx + (n.x - x0) * echelle, y: dy + (n.y - y0) * echelle }]),
  );

  const couleurs = new Map(g.communities.map((c) => [c.id, c.color]));
  const couleur = (n: Noeud) =>
    !enAvant(n.id)
      ? COULEUR_ESTOMPEE
      : coloration
        ? (coloration.couleurs.get(n.id) ?? COULEUR_SANS_FAMILLE)
        : g.meta.communities_displayed
          ? (couleurs.get(n.community) ?? COULEUR_SANS_FAMILLE)
          : COULEUR_SANS_FAMILLE;
  const partMax = Math.max(...g.nodes.map((n) => n.share));

  const traits = liens
    ? g.edges
        .filter((l) => l.shown && pos.has(l.s) && pos.has(l.t) && enAvant(l.s) && enAvant(l.t))
        .map((l) => {
          const a = pos.get(l.s)!;
          const b = pos.get(l.t)!;
          return `<line x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}" stroke-width="${r1(epaisseurLien(l.lift) * e)}"/>`;
        })
        .join("")
    : "";
  // Les plus gros points d'abord : les petits restent visibles par-dessus ; mis en avant au-dessus.
  const tries = [...visibles].sort(
    (a, b) => Number(enAvant(a.id)) - Number(enAvant(b.id)) || b.share - a.share,
  );
  const points = tries
    .map((n) => {
      const p = pos.get(n.id)!;
      return `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(taillePoint(n.share, partMax) * e)}" fill="${couleur(n)}"/>`;
    })
    .join("");
  const etiquettes = noms
    ? tries
        .filter((n) => enAvant(n.id))
        .map((n) => {
          const p = pos.get(n.id)!;
          const decalage = (taillePoint(n.share, partMax) + 4) * e;
          return `<text x="${r1(p.x + decalage)}" y="${r1(p.y + 4 * e)}">${xml(n.label)}</text>`;
        })
        .join("")
    : "";

  // Cartouche (RG-23) : légende, phrase de lecture, source, date, adresse.
  const yC = H - hCartouche;
  const entrees: EntreeCartouche[] | null = coloration
    ? coloration.legende
    : g.meta.communities_displayed
      ? g.communities.map((c) => {
          const position = libellePosition(c, g.communities);
          return {
            libelle: position ? `${c.label} · ${position.toLowerCase()}` : c.label,
            couleur: c.color,
          };
        })
      : null;
  // Entrées à la suite, sur deux lignes au plus (largeur du texte estimée : 7,5 px par caractère).
  let x = marge;
  let ligne = 0;
  const legende = entrees
    ? entrees
        .map(({ libelle, couleur: c }) => {
          const largeur = (30 + libelle.length * 7.5) * e;
          if (x + largeur > L - marge && x > marge && ligne === 0) {
            x = marge;
            ligne = 1;
          }
          const y = yC + (24 + ligne * 22) * e;
          const svg = `<circle cx="${r1(x + 6 * e)}" cy="${r1(y)}" r="${r1(6 * e)}" fill="${c}"/><text x="${r1(x + 18 * e)}" y="${r1(y + 5 * e)}">${xml(libelle)}</text>`;
          x += largeur;
          return svg;
        })
        .join("")
    : `<text x="${r1(marge)}" y="${r1(yC + 39 * e)}">${xml(fr.legende.sansFamilles)}</text>`;
  const source = cartoucheExport(
    g.meta.edition,
    formaterDate(g.meta.date_traitement),
    g.meta.adresse_site.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}" font-family="${POLICE}">`,
    `<title>${xml(fr.marque)}</title>`,
    `<rect width="${L}" height="${H}" fill="#ffffff"/>`,
    titre
      ? `<text x="${r1(marge)}" y="${r1(marge + 22 * e)}" font-size="${r1(24 * e)}" font-weight="700" fill="#14171c">${xml(titre)}</text>`
      : "",
    `<g stroke="${COULEUR_LIEN}" stroke-opacity="0.45" stroke-linecap="round">${traits}</g>`,
    `<g stroke="#ffffff" stroke-width="${r1(1.5 * e)}">${points}</g>`,
    `<g font-size="${r1(13 * e)}" fill="#14171c" stroke="#ffffff" stroke-width="${r1(3 * e)}" paint-order="stroke" stroke-linejoin="round">${etiquettes}</g>`,
    `<line x1="${r1(marge)}" y1="${r1(yC)}" x2="${r1(L - marge)}" y2="${r1(yC)}" stroke="#dde1e6" stroke-width="${r1(e)}"/>`,
    `<g font-size="${r1(14 * e)}" fill="#14171c">${legende}</g>`,
    `<text x="${r1(marge)}" y="${r1(yC + 78 * e)}" font-size="${r1(17 * e)}" fill="#14171c">${xml(fr.bandeau)}</text>`,
    `<text x="${r1(marge)}" y="${r1(yC + 112 * e)}" font-size="${r1(14 * e)}" fill="#5a616b">${xml(source)}</text>`,
    `</svg>`,
  ].join("");
}

/** Rendu PNG du SVG, dans le navigateur. */
export async function imagePng(svg: string, largeur: number, hauteur: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.width = largeur;
    image.height = hauteur;
    await new Promise<void>((ok, echec) => {
      image.onload = () => ok();
      image.onerror = () => echec(new Error("Rendu de l'image impossible"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const contexte = canvas.getContext("2d");
    if (!contexte) throw new Error("Canvas indisponible");
    contexte.drawImage(image, 0, 0, largeur, hauteur);
    return await new Promise<Blob>((ok, echec) =>
      canvas.toBlob((b) => (b ? ok(b) : echec(new Error("Export PNG impossible"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function telecharger(contenu: Blob, nom: string): void {
  const url = URL.createObjectURL(contenu);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
