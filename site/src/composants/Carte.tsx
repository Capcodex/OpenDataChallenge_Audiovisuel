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
  noeudsParId,
  ouverture,
  ouvrir,
  selection,
  survol,
  visible,
} from "../etat/magasin";
import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";
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

export function Carte({ donnees }: { donnees: Graphe }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const rendu = useRef<Sigma | null>(null);
  const [webgl] = useState(webglDisponible);

  useEffect(() => {
    if (!webgl || !conteneur.current) return;
    const graphe = construireGraphe(donnees);
    // Média mis en évidence : sélectionné, sinon survolé. Un média sous le seuil (RG-02) n'a pas de
    // point sur la carte : rien n'est mis en évidence.
    const mediaActif = () => {
      const id = selection.value ?? survol.value;
      return id !== null && graphe.hasNode(id) ? id : null;
    };

    const sigma = new Sigma(graphe, conteneur.current, {
      settings: REGLAGES_SIGMA,
      nodeReducer: (id, brut) => {
        const data = { ...brut, labelFont: POLICE };
        const actif = mediaActif();
        const noeud = noeudsParId.value.get(id);
        if (noeud && !visible(noeud)) return { ...data, visibility: "hidden" };
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
        if (!actif) return data;
        return a === actif || b === actif
          ? { ...data, color: COULEUR_LIEN_SELECTION, zIndex: 1 }
          : { ...data, visibility: "hidden" };
      },
    });
    rendu.current = sigma;

    sigma.on("clickNode", ({ node }) => ouvrir(node, "carte"));
    sigma.on("clickStage", fermer);
    sigma.on("enterNode", ({ node }) => (survol.value = node));
    sigma.on("leaveNode", () => (survol.value = null));

    // Tout changement d'état redessine la carte via les réducteurs.
    const arreter = effect(() => {
      void selection.value;
      void survol.value;
      void filtreTypes.value;
      void filtreFamille.value;
      sigma.refresh({ skipIndexation: true });
    });

    const centrer = (id: string) => {
      const point = sigma.getNodeDisplayData(id);
      if (!point) return;
      const camera = sigma.getCamera();
      void camera.animate(
        { x: point.x, y: point.y, ratio: Math.min(camera.ratio, ZOOM_CENTRAGE) },
        { duration: 300 },
      );
    };
    // Lien direct /media/<id> : la carte s'ouvre centrée sur le média.
    if (selection.value && graphe.hasNode(selection.value)) centrer(selection.value);
    const arreterCentrage = effect(() => {
      const o = ouverture.value;
      if (o && o.provenance !== "carte" && graphe.hasNode(o.id)) centrer(o.id);
    });

    return () => {
      arreter();
      arreterCentrage();
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
