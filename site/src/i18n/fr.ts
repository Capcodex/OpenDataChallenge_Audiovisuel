/**
 * Tous les textes de l'interface (CdC technique § 9.1, T-039). Aucun texte en dur dans les
 * composants. Les formulations suivent la charte RG-20 à RG-25 et sont contrôlées par
 * `npm run vocabulaire` (formules interdites, RG-20).
 *
 * Source : maquettes haute fidélité (canevas de design du projet).
 */

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const entier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const pourcent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** Nombre décimal à la française : 4,7 ; 1 657. */
export const formaterNombre = (x: number): string => nombre.format(x);
/** Part (0-1) en pourcentage : 0,56 → « 56 % ». */
export const formaterPart = (x: number): string => pourcent.format(x);

export const fr = {
  marque: "Graphe des médias",
  titrePage: "Graphe des médias français",
  description:
    "Quels médias partagent le même public ? Carte des médias français d'après le baromètre de l'Arcom.",

  navigation: {
    libelle: "Navigation principale",
    carte: "Carte",
    proprietaires: "Propriétaires",
    jt: "JT 2000-2020",
    methode: "Méthode",
    donnees: "Données",
  },

  recherche: {
    libelle: "Rechercher un média",
    aucunResultat: "Aucun média trouvé.",
    aucunResultatDetail: "Ce média n'est peut-être pas couvert par le baromètre de l'Arcom.",
    regional:
      "Le baromètre regroupe les titres régionaux dans « un journal régional ou local » : ils ne peuvent pas être affichés un par un.",
  },

  // RG-21 : bandeau toujours visible sur la carte, repris dans les exports d'image (RG-23).
  bandeau:
    "Cette carte rapproche les médias suivis par les mêmes personnes. Elle décrit des publics, pas des lignes éditoriales.",
  edition: (annee: string) => `Baromètre Arcom ${annee}`,

  actions: {
    comprendreMethode: "Comprendre la méthode",
    calqueProprietaires: "Calque propriétaires",
    vueTableau: "Vue tableau",
    exporterImage: "Exporter l'image",
    exporter: "Exporter",
    telechargerDonnees: "Télécharger les données",
    copierMention: "Copier la mention de source",
    mentionCopiee: "Mention copiée",
    fermer: "Fermer",
    annuler: "Annuler",
  },

  legende: {
    titre: "Familles de médias",
    lecture: "Taille du point = part du public. Épaisseur du lien = proximité des publics.",
    famille: (numero: number) => `Famille ${numero}`,
  },

  accueil: {
    titre: "Explorer le paysage médiatique",
    invitation:
      "Cliquez sur un média de la carte ou recherchez-le pour voir les médias dont le public est le plus proche, le profil de son public et son propriétaire.",
    reperes: [
      "Deux médias reliés sont suivis par les mêmes personnes.",
      "Les couleurs indiquent des familles de médias détectées automatiquement.",
      "Chaque chiffre indique son effectif et sa marge d'incertitude.",
    ],
  },

  fiche: {
    effectif: (n: number) => `n = ${entier.format(n)} répondants`,
    fragile: "Chiffre fragile",
    voisinsTitre: "Médias au public le plus proche",
    voisin: (lift: number, communs: number) =>
      `× ${formaterNombre(lift)} · ${entier.format(communs)} communs`,
    lectureLift:
      "« × 2 » : les personnes qui suivent ce média sont deux fois plus nombreuses que la moyenne à suivre aussi l'autre.",
    profilTitre: "Profil du public",
    politiqueTitre: "Positionnement politique moyen du public",
    echelleGauche: "0 · très à gauche",
    echelleCentre: "5",
    echelleDroite: "10 · très à droite",
    ageTitre: "Âge moyen",
    age: (ans: number) => `≈ ${entier.format(ans)} ans`,
    moins35Titre: "Moins de 35 ans",
    confianceTitre: "Confiance",
    // ADR-006 : part de « source de référence » parmi les personnes qui ont noté le média.
    confiance: (part: number) =>
      `${formaterPart(part)} de son public le considère comme une source de référence.`,
    confianceJt: "Confiance : non mesurée par le baromètre pour les journaux télévisés.",
    proprieteTitre: "Propriété",
    groupe: "Groupe",
    proprietaires: "Propriétaire(s)",
  },

  etats: {
    // RG-02
    effectifInsuffisant: (seuil: number) =>
      `Trop peu de répondants suivent ce média (moins de ${seuil}) pour calculer des résultats fiables. Il n'apparaît donc pas sur la carte.`,
    pourquoiSeuil: (seuil: number) => `Pourquoi un seuil de ${seuil} répondants ?`,
    // RG-03
    fragileDetail: (seuil: number) =>
      `Moins de ${seuil} répondants : le résultat est affiché mais signalé, avec sa marge d'incertitude.`,
    // RG-07
    famillesNonAffichees:
      "Les familles de médias ne sont pas affichées pour cette édition : les regroupements détectés n'étaient pas assez stables. Les liens entre médias restent fiables.",
    detailTest: "Détail du test",
    sansWebgl:
      "Votre navigateur ne peut pas afficher la carte interactive. Toutes les informations restent disponibles dans la vue tableau.",
    ouvrirTableau: "Ouvrir la vue tableau",
    chargement: "Chargement de la carte…",
    pageIntrouvable: "Page introuvable",
    pageIntrouvableDetail: "Cette page n'existe pas ou plus.",
    retourCarte: "Retour à la carte",
  },

  tableau: {
    titre: "Vue tableau",
    description:
      "Toutes les informations de la carte, sous forme de liste. Accessible au clavier et aux lecteurs d'écran.",
    filtre: "Filtrer les médias",
    retourCarte: "Revenir à la carte",
    legende: "Médias, profil de leur public et voisins les plus proches",
    colonnes: {
      media: "Média",
      type: "Type",
      famille: "Famille",
      repondants: "Répondants",
      position: "Position du public (0-10)",
      age: "Âge moyen",
      voisins: "3 voisins les plus proches",
    },
    telechargementsTitre: "Télécharger les données",
    telechargementsDetail:
      "Données agrégées uniquement, au-dessus des seuils d'effectif. Aucune réponse individuelle.",
    dictionnaire: "Dictionnaire des colonnes",
    codeSource: "Code source du pipeline (dépôt public)",
    methode: "Méthode de calcul",
  },

  types: {
    radio: "Radio",
    journal: "Journal",
    magazine: "Magazine",
    tv: "Chaîne TV",
    info: "Chaîne d'info",
    web: "En ligne",
    createur: "Créateur de contenu",
    jt: "Journal télévisé",
  } as Record<string, string>,

  export: {
    titre: "Exporter l'image",
    apercu: "Aperçu de l'image exportée",
    cartoucheObligatoire:
      "Le cartouche (légende, phrase de lecture, source, date, adresse) est toujours inclus.",
    format: "Format",
    png: "PNG",
    pngUsage: "articles, réseaux sociaux",
    svg: "SVG",
    svgUsage: "impression, retouche",
    taille: "Taille",
    contenu: "Contenu",
    noms: "Noms des médias",
    liens: "Liens entre médias",
    cartouche: "Cartouche de source (obligatoire)",
    telecharger: (format: string) => `Télécharger le ${format}`,
  },
} as const;

/**
 * RG-20 : seule formulation autorisée pour le positionnement politique. Elle décrit le public,
 * jamais le média.
 */
export function phrasePositionnement(moyenne: number, bas: number, haut: number): string {
  return (
    `Le public de ce média se situe en moyenne à ${formaterNombre(moyenne)} sur une échelle de 0 ` +
    `(très à gauche) à 10 (très à droite), marge ${formaterNombre(bas)}–${formaterNombre(haut)}.`
  );
}

/** RG-22 : explication d'un lien, au survol. */
export function phraseLien(a: string, b: string, lift: number, communs: number): string {
  return (
    `Les personnes qui suivent ${a} sont ${formaterNombre(lift)} fois plus nombreuses que la ` +
    `moyenne à suivre aussi ${b} (${entier.format(communs)} répondants en commun).`
  );
}

/** RG-24 : mention de source à copier. */
export function mentionSource(annee: string, date: string, lien: string): string {
  return (
    `Source : Arcom, baromètre Les Français et l'information ${annee} ; ` +
    `traitement : ${fr.marque}, ${date}, ${lien}.`
  );
}

/** RG-23 : texte du cartouche des exports d'image. */
export function cartoucheExport(annee: string, date: string, adresse: string): string {
  return (
    `Source : Arcom, baromètre « Les Français et l'information » ${annee} · ` +
    `Traitement : ${fr.marque}, ${date} · ${adresse}`
  );
}
