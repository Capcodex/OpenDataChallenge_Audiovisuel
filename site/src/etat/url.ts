/**
 * Synchronisation état ↔ URL (CdC technique § 9.1, EF-M1-08, EF-M7-01).
 *
 *   /media/<id>?type=radio,journal&proprietaire=xavier-niel     vue Propriétaires (par défaut)
 *   /media/<id>?vue=familles&type=radio&famille=2               vue Familles
 *
 * Chaque filtre n'a de sens que dans sa vue : le propriétaire en vue Propriétaires, la famille en
 * vue Familles. Fonctions pures, testées sans navigateur. Les valeurs inconnues sont ignorées : un
 * lien partagé reste valable même si un média disparaît d'une édition.
 */
import type { TypeMedia } from "../graph/types";

export const TYPES_MEDIA: TypeMedia[] = [
  "tv",
  "info",
  "radio",
  "journal",
  "magazine",
  "web",
  "createur",
  "jt",
];

/** Couleur des points : propriétaire principal (V2, par défaut) ou famille de médias. */
export type Vue = "proprietaires" | "familles";
export const VUE_PAR_DEFAUT: Vue = "proprietaires";

export interface EtatUrl {
  media: string | null;
  vue: Vue;
  types: TypeMedia[];
  famille: number | null;
  proprietaire: string | null;
}

export const ETAT_VIDE: EtatUrl = {
  media: null,
  vue: VUE_PAR_DEFAUT,
  types: [],
  famille: null,
  proprietaire: null,
};

export function etatDepuisUrl(
  chemin: string,
  recherche: string,
  medias: ReadonlySet<string>,
  familles: ReadonlySet<number>,
  proprietaires: ReadonlySet<string> = new Set(),
): EtatUrl {
  const m = /^\/media\/([a-z0-9-]+)\/?$/.exec(chemin);
  const media = m && medias.has(m[1]) ? m[1] : null;
  const params = new URLSearchParams(recherche);
  const vue: Vue = params.get("vue") === "familles" ? "familles" : "proprietaires";
  const types = (params.get("type") ?? "")
    .split(",")
    .filter((t): t is TypeMedia => (TYPES_MEDIA as string[]).includes(t));
  const numero = Number(params.get("famille"));
  const famille =
    vue === "familles" && Number.isInteger(numero) && familles.has(numero) ? numero : null;
  const p = params.get("proprietaire");
  const proprietaire = vue === "proprietaires" && p && proprietaires.has(p) ? p : null;
  return { media, vue, types: [...new Set(types)].sort(), famille, proprietaire };
}

export function urlDepuisEtat(etat: EtatUrl): string {
  const chemin = etat.media ? `/media/${etat.media}` : "/";
  const params = new URLSearchParams();
  if (etat.vue === "familles") params.set("vue", "familles");
  if (etat.types.length) params.set("type", [...etat.types].sort().join(","));
  if (etat.vue === "familles" && etat.famille !== null) params.set("famille", String(etat.famille));
  if (etat.vue === "proprietaires" && etat.proprietaire)
    params.set("proprietaire", etat.proprietaire);
  const requete = params.toString().replace(/%2C/g, ",");
  return requete ? `${chemin}?${requete}` : chemin;
}
