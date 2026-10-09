/**
 * Carte des médias (E1-01, E1-02, CdC technique § 9.1) : Sigma.js sur WebGL.
 *
 * Positions précalculées par le pipeline (aucun calcul de disposition dans le navigateur). La
 * sélection, le survol et les filtres passent par les réducteurs de Sigma : le graphe n'est jamais
 * recréé (ENF-03).
 */
import { effect } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import Sigma from "sigma";

import {
  fermer,
  filtreFamille,
  filtreTypes,
  mediasDuProprietaire,
  noeudsParId,
  ouverture,
  ouvrir,
  selection,
  survol,
  visible,
  vue,
} from "../etat/magasin";
import type { Graphe } from "../graph/types";
import { couleursProprietaires } from "../proprietaires/couleurs";
import { fr, phraseLien } from "../i18n/fr";
import {
  COULEUR_ESTOMPEE,
  COULEUR_LIEN_SELECTION,
  construireGraphe,
  POLICE,
  REGLAGES_SIGMA,
} from "./carte-donnees";

export function webglDisponible(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Zoom appliqué en centrant la carte sur un média (EF-M2-03), s'il est plus large. */
const ZOOM_CENTRAGE = 0.6;

export function Carte({
  donnees,
  surClic = (id) => ouvrir(id, "carte"),
}: {
  donnees: Graphe;
  /** Clic sur un média ; par défaut, ouvre sa fiche à côté de la carte. */
  surClic?: (id: string) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const rendu = useRef<Sigma | null>(null);
  const [webgl] = useState(webglDisponible);
  const [bulle, setBulle] = useState<{ texte: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!webgl || !conteneur.current) return;
    const graphe = construireGraphe(donnees);
    const couleursParProprietaire = couleursProprietaires(donnees);
    // Média mis en évidence : sélectionné, sinon survolé. Un média sous le seuil (RG-02) n'a pas de
    // point sur la carte : rien n'est mis en évidence.
    const mediaActif = () => {
      const id = selection.value ?? survol.value;
      return id !== null && graphe.hasNode(id) ? id : null;
    };

    const sigma = new Sigma(graphe, conteneur.current, {
      settings: REGLAGES_SIGMA,
      nodeReducer: (id, brut) => {
        // Vue Propriétaires : couleur du propriétaire principal ; vue Familles : celle du graphe.
        const couleur = vue.value === "proprietaires" ? couleursParProprietaire.get(id) : undefined;
        const data = { ...brut, labelFont: POLICE, ...(couleur ? { color: couleur } : {}) };
        const actif = mediaActif();
        const noeud = noeudsParId.value.get(id);
        if (noeud && !visible(noeud)) return { ...data, visibility: "hidden" };
        const calque = mediasDuProprietaire.value;
        if (!actif && calque) {
          // Calque propriétaires : ses médias ressortent, nommés ; les autres s'estompent.
          return calque.has(id)
            ? { ...data, zIndex: 1, labelVisibility: "visible", highlighted: true }
            : { ...data, color: COULEUR_ESTOMPEE, label: null, zIndex: 0 };
        }
        if (!actif) return data;
        const proche = id === actif || graphe.areNeighbors(id, actif);
        return proche
          ? { ...data, zIndex: 1, labelVisibility: "visible", highlighted: id === actif }
          : { ...data, color: COULEUR_ESTOMPEE, label: null, zIndex: 0 };
      },
      edgeReducer: (id, data) => {
        const [a, b] = graphe.extremities(id);
        const na = noeudsParId.value.get(a);
        const nb = noeudsParId.value.get(b);
        if ((na && !visible(na)) || (nb && !visible(nb))) return { ...data, visibility: "hidden" };
        const actif = mediaActif();
        const calque = mediasDuProprietaire.value;
        if (!actif && calque) {
          return calque.has(a) && calque.has(b) ? data : { ...data, visibility: "hidden" };
        }
        if (!actif) return data;
        return a === actif || b === actif
          ? { ...data, color: COULEUR_LIEN_SELECTION, zIndex: 1 }
          : { ...data, visibility: "hidden" };
      },
    });
    rendu.current = sigma;

    sigma.on("clickNode", ({ node }) => surClic(node));
    sigma.on("clickStage", fermer);
    sigma.on("enterEdge", ({ edge, event }) => {
      const [a, b] = graphe.extremities(edge);
      const lien = graphe.getEdgeAttributes(edge) as { lift: number; communs: number };
      const nom = (id: string) => noeudsParId.value.get(id)?.label ?? id;
      setBulle({
        texte: phraseLien(nom(a), nom(b), lien.lift, lien.communs),
        x: event.x,
        y: event.y,
      });
    });
    sigma.on("leaveEdge", () => setBulle(null));
    sigma.on("enterNode", ({ node }) => (survol.value = node));
    sigma.on("leaveNode", () => (survol.value = null));

    // Tout changement d'état redessine la carte via les réducteurs.
    const arreter = effect(() => {
      void selection.value;
      void survol.value;
      void filtreTypes.value;
      void filtreFamille.value;
      void mediasDuProprietaire.value;
      void vue.value;
      sigma.refresh({ skipIndexation: true });
    });

    const centrer = (id: string, anime = true) => {
      const point = sigma.getNodeDisplayData(id);
      if (!point) return;
      const camera = sigma.getCamera();
      const cible = { x: point.x, y: point.y, ratio: Math.min(camera.ratio, ZOOM_CENTRAGE) };
      if (anime) void camera.animate(cible, { duration: 300 });
      else camera.setState(cible);
    };
    // Lien direct /media/<id> : la carte s'ouvre centrée sur le média, sans animation (une
    // animation au chargement enchaîne des dizaines de rendus avant que la page soit utilisable).
    if (selection.value && graphe.hasNode(selection.value)) centrer(selection.value, false);

    // Survol des liens activé à la première approche de la souris (voir REGLAGES_SIGMA).
    const elementCarte = conteneur.current;
    const activerSurvolLiens = () => sigma.setSetting("enableEdgeEvents", true);
    elementCarte.addEventListener("pointerenter", activerSurvolLiens, { once: true });
    const arreterCentrage = effect(() => {
      const o = ouverture.value;
      if (o && o.provenance !== "carte" && graphe.hasNode(o.id)) centrer(o.id);
    });

    return () => {
      arreter();
      arreterCentrage();
      elementCarte.removeEventListener("pointerenter", activerSurvolLiens);
      sigma.kill();
      rendu.current = null;
    };
  }, [donnees, webgl]);

  if (!webgl) {
    return (
      <div class="carte carte--indisponible" role="alert">
        <p>{fr.etats.sansWebgl}</p>
      </div>
    );
  }

  const camera = () => rendu.current?.getCamera();
  return (
    <div class="carte">
      <div ref={conteneur} class="carte__rendu" role="img" aria-label={fr.carte.libelle} />
      {bulle && (
        <p
          class="carte__bulle"
          aria-hidden="true"
          style={{ left: `${bulle.x}px`, top: `${bulle.y}px` }}
        >
          {bulle.texte}
        </p>
      )}
      <div class="carte__commandes">
        <button type="button" aria-label={fr.carte.zoomer} onClick={() => camera()?.zoomIn()}>
          +
        </button>
        <button type="button" aria-label={fr.carte.dezoomer} onClick={() => camera()?.zoomOut()}>
          −
        </button>
        <button type="button" aria-label={fr.carte.recentrer} onClick={() => camera()?.reset()}>
          ⟲
        </button>
      </div>
    </div>
  );
}
