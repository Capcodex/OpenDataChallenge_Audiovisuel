/**
 * Synchronisation état ↔ URL (CdC technique § 9.1, EF-M1-08, EF-M7-01).
 *
 *   /media/<id>?type=radio,journal&famille=2
 *
 * Fonctions pures, testées sans navigateur. Les valeurs inconnues sont ignorées : un lien partagé
 * reste valable même si un média disparaît d'une édition.
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

export interface EtatUrl {
  media: string | null;
  types: TypeMedia[];
  famille: number | null;
}

export const ETAT_VIDE: EtatUrl = { media: null, types: [], famille: null };

export function etatDepuisUrl(
  chemin: string,
  recherche: string,
  medias: ReadonlySet<string>,
  familles: ReadonlySet<number>,
): EtatUrl {
  const m = /^\/media\/([a-z0-9-]+)\/?$/.exec(chemin);
  const media = m && medias.has(m[1]) ? m[1] : null;
  const params = new URLSearchParams(recherche);
  const types = (params.get("type") ?? "")
    .split(",")
    .filter((t): t is TypeMedia => (TYPES_MEDIA as string[]).includes(t));
  const numero = Number(params.get("famille"));
  const famille = Number.isInteger(numero) && familles.has(numero) ? numero : null;
  return { media, types: [...new Set(types)].sort(), famille };
}

export function urlDepuisEtat(etat: EtatUrl): string {
  const chemin = etat.media ? `/media/${etat.media}` : "/";
  const params = new URLSearchParams();
  if (etat.types.length) params.set("type", [...etat.types].sort().join(","));
  if (etat.famille !== null) params.set("famille", String(etat.famille));
  const requete = params.toString().replace(/%2C/g, ",");
  return requete ? `${chemin}?${requete}` : chemin;
}
