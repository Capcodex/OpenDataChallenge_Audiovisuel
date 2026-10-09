/**
 * État de l'application (CdC technique § 9.1) : signaux Preact. Les composants lisent les signaux ;
 * la carte applique sélection et filtres par ses réducteurs, sans recréer le graphe.
 */
import { computed, effect, signal } from "@preact/signals";

import { cinqVoisins } from "../fiche/fiche-donnees";
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

/** Médias sous le seuil d'affichage (RG-02) : trouvables par la recherche, sans indicateurs. */
export const autresParId = computed(
  () => new Map((donnees.value?.others ?? []).map((o) => [o.id, o])),
);

/** Les 5 voisins du média sélectionné (EF-M3-02), du plus fort lift au plus faible. */
export const voisins = computed(() => {
  const id = selection.value;
  const g = donnees.value;
  if (!id || !g) return [];
  return cinqVoisins(g.edges, id);
});

/**
 * Dernière ouverture de fiche et sa provenance. Depuis la recherche ou une fiche voisine, la carte
 * se centre sur le média (EF-M2-03) et le focus passe à la fiche ; un clic sur la carte ne déplace
 * ni la vue ni le focus.
 */
export type Provenance = "carte" | "recherche" | "fiche";
export const ouverture = signal<{ id: string; provenance: Provenance; numero: number } | null>(
  null,
);

export function ouvrir(id: string, provenance: Provenance): void {
  const n = noeudsParId.value.get(id);
  // Un média masqué par les filtres serait invisible sur la carte : on retire les filtres.
  if (n && !visible(n)) {
    filtreTypes.value = [];
    filtreFamille.value = null;
  }
  selection.value = id;
  ouverture.value = { id, provenance, numero: (ouverture.value?.numero ?? 0) + 1 };
}

export function fermer(): void {
  selection.value = null;
}

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
  // Les médias sous le seuil ont aussi une adresse : leur fiche explique l'effectif insuffisant.
  const medias = new Set([...g.nodes, ...g.others].map((n) => n.id));
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
