/**
 * Données de la page JT (E5-01, EF-M5-01 à 03, T-076), en fonctions pures. Les valeurs viennent
 * telles quelles du bloc `jt` de graph.json (pipeline/compute/jt.py) : parts par année, et
 * similarités calculées par le pipeline pour chaque période.
 */
import type { Jt } from "../graph/types";

export type Mesure = "sujets" | "duree";

export const RUBRIQUES_DETAILLEES = 7;

/** Rubriques détaillées : les plus fréquentes l'année choisie, toutes chaînes confondues. */
export function rubriquesPrincipales(
  jt: Jt,
  mesure: Mesure,
  annee: number,
  nombre = RUBRIQUES_DETAILLEES,
): number[] {
  const i = jt.years.indexOf(annee);
  const profils = jt.profiles[mesure];
  const moyennes = jt.rubrics.map(
    (_, r) => profils.reduce((s, chaine) => s + chaine[i][r], 0) / profils.length,
  );
  return moyennes
    .map((m, r) => ({ m, r }))
    .sort((a, b) => b.m - a.m)
    .slice(0, nombre)
    .map((x) => x.r);
}

export interface Segment {
  /** Indice de la rubrique, ou null pour « autres rubriques ». */
  rubrique: number | null;
  part: number;
}

/** Profil d'une chaîne une année : rubriques principales puis « autres » (somme des restantes). */
export function profilAnnee(
  jt: Jt,
  mesure: Mesure,
  chaine: number,
  annee: number,
  principales: number[],
): Segment[] {
  const parts = jt.profiles[mesure][chaine][jt.years.indexOf(annee)];
  const detail = principales.map((r) => ({ rubrique: r, part: parts[r] }));
  const reste = parts.reduce((s, p, r) => (principales.includes(r) ? s : s + p), 0);
  return [...detail, { rubrique: null, part: reste }];
}

/** Matrice de similarité (1 − Jensen-Shannon) entre chaînes, pour une période et une mesure. */
export function matriceSimilarite(jt: Jt, periode: string, mesure: Mesure): number[][] {
  const index = new Map(jt.channels.map((c, i) => [c, i]));
  const m = jt.channels.map((_, i) => jt.channels.map((__, j) => (i === j ? 1 : NaN)));
  for (const s of jt.similarity) {
    if (s.period !== periode || s.measure !== mesure) continue;
    const a = index.get(s.a);
    const b = index.get(s.b);
    if (a === undefined || b === undefined) continue;
    m[a][b] = s.js;
    m[b][a] = s.js;
  }
  return m;
}

/** Chaîne au profil le plus singulier : plus faible similarité moyenne avec les autres. */
export function plusSinguliere(m: number[][]): { chaine: number; moyenne: number; autres: number } {
  const moyenneAvec = (i: number, exclus: number[] = []) => {
    const valeurs = m[i].filter((v, j) => j !== i && !exclus.includes(j) && !Number.isNaN(v));
    return valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  };
  const moyennes = m.map((_, i) => moyenneAvec(i));
  const chaine = moyennes.indexOf(Math.min(...moyennes));
  const autresIndices = m.map((_, i) => i).filter((i) => i !== chaine);
  const autres =
    autresIndices.reduce((s, i) => s + moyenneAvec(i, [chaine]), 0) / autresIndices.length;
  return { chaine, moyenne: moyennes[chaine], autres };
}
