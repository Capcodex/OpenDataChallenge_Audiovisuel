/**
 * Contrôle du vocabulaire (RG-20, RG-25, CdC technique § 12.2) : le produit décrit des publics,
 * il ne qualifie jamais la ligne politique d'un média.
 *
 * Les passages entre guillemets français « … » sont ignorés : la page Méthode doit pouvoir citer
 * une formule pour expliquer qu'elle est fausse.
 */

export interface FormuleInterdite {
  motif: RegExp;
  raison: string;
}

const MEDIA = String.raw`(?:m[ée]dias?|cha[iî]nes?|journa(?:l|ux)|radios?|titres?|presse|sites?|magazines?|r[ée]dactions?)`;
const BORD = String.raw`(?:(?:l'|d'|de l')?extr[êe]me[- ](?:gauche|droite)|gauche|droite|centre)`;

export const FORMULES_INTERDITES: FormuleInterdite[] = [
  {
    motif: new RegExp(String.raw`\b${MEDIA}\s+(?:de|d'|du)\s*${BORD}\b`, "giu"),
    raison: "qualifie un média par un bord politique (RG-20)",
  },
  {
    motif: new RegExp(
      String.raw`\b${MEDIA}\s+(?:gauchistes?|droitiers?|conservateurs?|progressistes?|r[ée]actionnaires?|identitaires?|militants?|partisans?|engag[ée]s?)\b`,
      "giu",
    ),
    raison: "qualifie la ligne d'un média (RG-20)",
  },
  {
    motif: new RegExp(
      String.raw`\b${MEDIA}\s+(?:class[ée]s?|marqu[ée]s?|orient[ée]s?|ancr[ée]s?)\s+à\s+${BORD}`,
      "giu",
    ),
    raison: "place un média, et non son public, sur l'échelle politique (RG-20)",
  },
  {
    motif: /(?<!public de )\bce m[ée]dia se situe\b/giu,
    raison: "formulation imposée : « Le public de ce média se situe… » (RG-20)",
  },
  {
    motif: /\bdu plus à gauche au plus à droite\b|\bdu plus à droite au plus à gauche\b/giu,
    raison: "classement politique des médias (RG-25)",
  },
];

export interface Infraction {
  ligne: number;
  extrait: string;
  raison: string;
}

/** Remplace chaque citation « … » par des espaces (les numéros de ligne sont conservés). */
function sansCitations(texte: string): string {
  return texte.replace(/«[^»]*»/gu, (citation) => citation.replace(/[^\n]/gu, " "));
}

export function controlerVocabulaire(texte: string): Infraction[] {
  const nettoye = sansCitations(texte);
  const infractions: Infraction[] = [];
  for (const { motif, raison } of FORMULES_INTERDITES) {
    for (const m of nettoye.matchAll(motif)) {
      const ligne = nettoye.slice(0, m.index).split("\n").length;
      infractions.push({ ligne, extrait: m[0], raison });
    }
  }
  return infractions.sort((a, b) => a.ligne - b.ligne);
}
