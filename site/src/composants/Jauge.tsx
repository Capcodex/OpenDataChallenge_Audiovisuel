/**
 * Jauge horizontale : valeur et intervalle de confiance à 95 % sur une échelle (T-062,
 * EF-M3-03, EF-M3-04, EF-M6-01). Masquée aux lecteurs d'écran : la phrase affichée à côté donne
 * la même information, marge comprise.
 */
import type { Triplet } from "../graph/types";

const LARGEUR = 300;
const HAUTEUR = 36;
const MARGE = 8;
const Y = 16;

/** Position horizontale (en unités du dessin) d'une valeur de l'échelle [min, max]. */
export function abscisse(valeur: number, min: number, max: number): number {
  const t = Math.min(1, Math.max(0, (valeur - min) / (max - min)));
  return MARGE + t * (LARGEUR - 2 * MARGE);
}

export function Jauge({
  triplet: [valeur, bas, haut],
  min,
  max,
  graduations,
  fragile = false,
}: {
  triplet: Triplet;
  min: number;
  max: number;
  graduations: number[];
  fragile?: boolean;
}) {
  const x = (v: number) => abscisse(v, min, max);
  return (
    <svg
      class={`jauge${fragile ? " jauge--fragile" : ""}`}
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      aria-hidden="true"
      focusable="false"
    >
      <line class="jauge__axe" x1={MARGE} x2={LARGEUR - MARGE} y1={Y} y2={Y} />
      {graduations.map((g) => (
        <line key={g} class="jauge__graduation" x1={x(g)} x2={x(g)} y1={Y - 5} y2={Y + 5} />
      ))}
      <rect
        class="jauge__marge"
        x={x(bas)}
        y={Y - 6}
        width={Math.max(2, x(haut) - x(bas))}
        height={12}
        rx={6}
      />
      <circle class="jauge__valeur" cx={x(valeur)} cy={Y} r={6} />
    </svg>
  );
}
