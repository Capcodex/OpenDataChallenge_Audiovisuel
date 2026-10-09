/**
 * État de l'application (CdC technique § 9.1) : signaux Preact. Les composants lisent les signaux ;
 * la carte applique sélection et filtres par ses réducteurs, sans recréer le graphe.
 */
import { computed, effect, signal } from "@preact/signals";

import type { Graphe, Noeud, TypeMedia } from "../graph/types";
import { ETAT_VIDE, etatDepuisUrl, urlDepuisEtat, type EtatUrl } from "./url";

export const donnees = signal<Graphe | null>(null);
export const erreur = signal<string | null>(null);

export const selection = signal<string | null>(null);
export const filtreTypes = signal<TypeMedia[]>([]);
export const filtreFamille = signal<number | null>(null);
export const survol = signal<string | null>(null);

export const noeudsParId = computed(
  () => new Map<string, Noeud>((donnees.value?.nodes ?? []).map((n) => [n.id, n])),
);

/** Voisins (liens tracés) du média sélectionné, du plus fort lift au plus faible. */
export const voisins = computed(() => {
  const id = selection.value;
  const g = donnees.value;
  if (!id || !g) return [];
  return g.edges
    .filter((e) => e.shown && (e.s === id || e.t === id))
    .map((e) => ({ id: e.s === id ? e.t : e.s, lien: e }))
    .sort((a, b) => b.lien.lift - a.lien.lift);
});

/** Un média passe les filtres de type et de famille. */
export function visible(n: Noeud): boolean {
  const types = filtreTypes.value;
  const famille = filtreFamille.value;
  return (
    (types.length === 0 || types.includes(n.type)) && (famille === null || n.community === famille)
  );
}

export function etatCourant(): EtatUrl {
  return { media: selection.value, types: filtreTypes.value, famille: filtreFamille.value };
}

export function appliquer(etat: EtatUrl): void {
  selection.value = etat.media;
  filtreTypes.value = etat.types;
  filtreFamille.value = etat.famille;
}

/** Lit l'URL au démarrage, puis tient l'URL à jour (retour arrière du navigateur compris). */
export function synchroniserUrl(g: Graphe): () => void {
  const medias = new Set(g.nodes.map((n) => n.id));
  const familles = new Set(g.communities.map((c) => c.id));
  const lire = () => appliquer(etatDepuisUrl(location.pathname, location.search, medias, familles));
  lire();
  addEventListener("popstate", lire);
  const arreter = effect(() => {
    const cible = urlDepuisEtat(etatCourant());
    if (cible !== location.pathname + location.search) {
      // Changer de média ajoute une entrée d'historique ; changer de filtre la remplace.
      const nouvelleFiche =
        selection.value !== etatDepuisUrl(location.pathname, "", medias, familles).media;
      history[nouvelleFiche ? "pushState" : "replaceState"](null, "", cible);
    }
  });
  return () => {
    removeEventListener("popstate", lire);
    arreter();
    appliquer(ETAT_VIDE);
  };
}
