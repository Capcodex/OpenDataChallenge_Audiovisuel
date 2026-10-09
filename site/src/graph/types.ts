/**
 * Types de graph.json (format 1), miroir de schema.json (contrat avec le pipeline, ADR-009).
 * Les triplets sont [valeur, borne basse, borne haute] de l'intervalle à 95 %.
 */
export type Triplet = [number, number, number];

export type TypeMedia =
  "radio" | "journal" | "magazine" | "tv" | "info" | "web" | "createur" | "jt";

export interface Noeud {
  id: string;
  label: string;
  aliases: string[];
  type: TypeMedia;
  public: "public" | "prive" | "autre" | "na";
  x: number;
  y: number;
  community: number;
  stability: number;
  bridge: boolean;
  n: number;
  share: number;
  fragile: boolean;
  pol: Triplet;
  pol_nr: number;
  age: Triplet;
  under35: Triplet;
  trust: Triplet | null;
  trust_gap: Triplet | null;
  group: string | null;
  owners: { id: string; share: number | null }[];
  owner_status: "base" | "correction" | "meme_que" | "non_identifie";
}

export interface Lien {
  s: string;
  t: string;
  lift: number;
  ci: [number, number];
  n: number;
  shown: boolean;
}

export interface Famille {
  id: number;
  label: string;
  color: string;
  size: number;
}

export interface Proprietaire {
  id: string;
  name: string;
  type: "personne" | "etat" | "organisation";
  source: string;
  as_of: string;
}

export interface Jt {
  channels: string[];
  rubrics: string[];
  years: number[];
  periods: string[];
  profiles: { sujets: number[][][]; duree: number[][][] };
  similarity: {
    a: string;
    b: string;
    period: string;
    measure: "sujets" | "duree";
    js: number;
    sync: number | null;
  }[];
}

export interface Graphe {
  meta: {
    format: 1;
    edition: string;
    date_traitement: string;
    version_pipeline: string;
    adresse_site: string;
    sources: { name: string; producer: string; license: string; url: string }[];
    params: Record<string, unknown>;
    communities_displayed: boolean;
    lift_reference: number;
  };
  nodes: Noeud[];
  others: { id: string; label: string; aliases: string[]; type: string }[];
  edges: Lien[];
  communities: Famille[];
  owners: Proprietaire[];
  jt: Jt;
}
