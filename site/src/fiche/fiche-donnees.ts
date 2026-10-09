/**
 * Données de la fiche média (E2-02, E2-03, E3-01, E3-03), en fonctions pures testées sans
 * navigateur. Le composant Fiche ne fait que les afficher.
 */
import type { Graphe, Lien, Noeud } from "../graph/types";
import { mentionSource } from "../i18n/fr";

export const NOMBRE_VOISINS = 5; // EF-M3-02

export interface Voisin {
  id: string;
  lien: Lien;
}

/**
 * Les 5 voisins d'un média : liens retenus (RG-04, RG-05), tracés ou non sur la carte, classés par
 * lift décroissant (EF-M3-02). À lift égal, le plus grand effectif commun d'abord.
 */
export function cinqVoisins(edges: Lien[], id: string, nombre = NOMBRE_VOISINS): Voisin[] {
  return edges
    .filter((e) => e.s === id || e.t === id)
    .map((e) => ({ id: e.s === id ? e.t : e.s, lien: e }))
    .sort((a, b) => b.lien.lift - a.lien.lift || b.lien.n - a.lien.n)
    .slice(0, nombre);
}

/** Seuils publiés dans graph.json (RG-08), avec les valeurs du cahier des charges par défaut. */
export function seuils(g: Pick<Graphe, "meta">): {
  affichable: number;
  fragile: number;
  communsMin: number;
} {
  const s = (g.meta.params as { seuils?: Record<string, number> }).seuils ?? {};
  return {
    affichable: s.media_affichable_min ?? 50,
    fragile: s.chiffre_fragile_sous ?? 100,
    communsMin: s.lien_effectif_commun_min ?? 30,
  };
}

/** RG-03 : un chiffre est fragile si son effectif est sous le seuil. */
export function estFragile(effectif: number, seuilFragile: number): boolean {
  return effectif < seuilFragile;
}

export interface LigneProprietaire {
  nom: string;
  part: number | null;
}

export interface Propriete {
  groupe: string | null;
  proprietaires: LigneProprietaire[];
  /** Source et date de la base de propriété ; null si le propriétaire n'est pas identifié. */
  source: { nom: string; date: string } | null;
}

export function propriete(g: Pick<Graphe, "owners">, n: Noeud): Propriete {
  const parId = new Map(g.owners.map((o) => [o.id, o]));
  const lignes = n.owners
    .map((o) => ({ fiche: parId.get(o.id), part: o.share }))
    .filter((o) => o.fiche !== undefined);
  const premier = lignes[0]?.fiche;
  return {
    groupe: n.group,
    proprietaires: lignes.map((o) => ({ nom: o.fiche!.name, part: o.part })),
    source: premier ? { nom: premier.source, date: premier.as_of } : null,
  };
}

const dateLongue = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « 2026-10-08 » → « 8 octobre 2026 ». */
export function formaterDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateLongue.format(d);
}

/** Lien permanent de la fiche (EF-M7-01) : adresse publique du site, pas celle de l'aperçu. */
export function lienPermanent(g: Pick<Graphe, "meta">, id: string): string {
  return `${g.meta.adresse_site.replace(/\/+$/, "")}/media/${id}`;
}

/** Mention de source de la fiche (RG-24, CdC technique § 9.5). */
export function mentionFiche(g: Pick<Graphe, "meta">, id: string): string {
  return mentionSource(g.meta.edition, formaterDate(g.meta.date_traitement), lienPermanent(g, id));
}
