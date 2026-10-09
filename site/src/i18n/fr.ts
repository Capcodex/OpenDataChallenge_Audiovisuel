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

  // Titres et descriptions des pages (balises <title>, description, Open Graph).
  pages: {
    carte: {
      titre: "Graphe des médias français",
      description:
        "Quels médias partagent le même public ? Carte des médias français d'après le baromètre de l'Arcom.",
    },
    proprietaires: {
      titre: "Propriétaires des médias · Graphe des médias",
      description:
        "Choisir un propriétaire pour voir ses médias sur la carte des publics, avec la source de chaque donnée de propriété.",
    },
    methode: {
      titre: "Méthode · Graphe des médias",
      description:
        "Sources, calculs, seuils, marges d'incertitude et limites de la carte des médias : ce que les chiffres disent et ce qu'ils ne disent pas.",
    },
    tableau: {
      titre: "Données et vue tableau · Graphe des médias",
      description:
        "Tous les médias de la carte sous forme de tableau, et les données agrégées à télécharger en CSV, Parquet et GEXF.",
    },
    media: (nom: string) => `${nom} · Graphe des médias`,
    mediaDescription: (nom: string, n: number, voisins: string[]) =>
      `Public de ${nom} (${entier.format(n)} répondants) : médias au public le plus proche (${voisins.join(", ")}), profil du public et propriétaire. Baromètre de l'Arcom.`,
    mediaInsuffisant: (nom: string) =>
      `${nom} : trop peu de répondants dans le baromètre de l'Arcom pour publier des résultats fiables.`,
  },

  navigation: {
    libelle: "Navigation principale",
    carte: "Carte",
    proprietaires: "Propriétaires",
    methode: "Méthode",
    donnees: "Données",
  },

  recherche: {
    libelle: "Rechercher un média",
    exemple: "Rechercher un média (ex. France Inter)",
    suggestions: "Suggestions",
    insuffisant: "effectif insuffisant",
    // Annonce pour les lecteurs d'écran (zone live).
    nombreResultats: (n: number) =>
      n === 0 ? "Aucun média trouvé." : n === 1 ? "1 média trouvé." : `${n} médias trouvés.`,
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
    mentionCopiee: "Mention de source copiée",
    fermer: "Fermer",
    annuler: "Annuler",
  },

  proprietaires: {
    titre: "Propriétaires",
    invitation: "Choisissez un propriétaire pour faire ressortir ses médias sur la carte.",
    filtre: "Filtrer la liste",
    filtreExemple: "Nom du propriétaire ou du groupe",
    liste: "Propriétaires",
    nombreMedias: (n: number) => (n === 1 ? "1 média" : `${n} médias`),
    aucun: "Aucun propriétaire ne correspond.",
    carte: "Carte avec calque propriétaires",
    synthese: "Synthèse du propriétaire",
    selectionne: "Propriétaire sélectionné",
    type: { personne: "Personne ou famille", etat: "État", organisation: "Organisation" } as Record<
      string,
      string
    >,
    via: (groupes: string[]) => `via ${groupes.join(", ")}`,
    medias: "Médias détenus",
    familles: (n: number) =>
      n === 1
        ? "Ses médias sont tous dans la même famille de la carte."
        : `Ses médias sont répartis dans ${n} familles différentes de la carte.`,
    partNonChiffree: "part non chiffrée",
    choisir: "Choisissez un propriétaire dans la liste.",
    nonIdentifies: (n: number) =>
      `${n} médias de la carte n'ont pas de propriétaire identifié dans la base (presse indépendante, médias en ligne, créateurs).`,
  },

  methode: {
    sommaire: "Sommaire de la page",
    surCettePage: "Sur cette page",
  },

  legende: {
    titre: "Familles de médias",
    lecture: "Taille du point = part du public. Épaisseur du lien = proximité des publics.",
    famille: (numero: number) => `Famille ${numero}`,
    taille: (n: number) => `${n} médias`,
    sansFamilles: "Familles non affichées pour cette édition (regroupements pas assez stables).",
    filtrerFamille: (libelle: string) => `Afficher seulement : ${libelle}`,
    toutes: "Toutes les familles",
  },

  carte: {
    libelle:
      "Carte des médias : chaque point est un média, deux médias reliés partagent leur public",
    zoomer: "Zoomer",
    dezoomer: "Dézoomer",
    recentrer: "Recentrer la carte",
    filtresTypes: "Types de médias",
    tousTypes: "Tous",
    typesPluriel: {
      tv: "Chaînes TV",
      info: "Chaînes d'info",
      radio: "Radios",
      journal: "Journaux",
      magazine: "Magazines",
      web: "En ligne",
      createur: "Créateurs",
      jt: "JT",
    } as Record<string, string>,
    bientot: "Disponible prochainement",
  },

  pied: {
    sources: "Sources",
    traitement: (date: string) => `Données traitées le ${date}`,
    licence: "Données agrégées publiées sous Licence Ouverte. Aucune réponse individuelle.",
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
    resume: (medias: number, liens: number) =>
      `${entier.format(medias)} médias · ${entier.format(liens)} liens tracés`,
  },

  fiche: {
    libelle: "Fiche média",
    fermer: "Fermer la fiche",
    effectif: (n: number) => `n = ${entier.format(n)} répondants`,
    fragile: "Chiffre fragile",
    statut: { public: "Service public", prive: "Privé" } as Record<string, string>,
    voisinsTitre: "Médias au public le plus proche",
    voisin: (lift: number, communs: number) =>
      `× ${formaterNombre(lift)} · ${entier.format(communs)} communs`,
    margeLift: (bas: number, haut: number) =>
      `marge ${formaterNombre(bas)}–${formaterNombre(haut)}`,
    voisinFragile: "fragile",
    voisinsMoins: (n: number, communsMin: number) =>
      `Seuls ${n} liens atteignent les seuils de publication (${communsMin} répondants en commun et lift significatif) : ce média a donc ${n} voisins.`,
    lectureLift:
      "« × 2 » : les personnes qui suivent ce média sont deux fois plus nombreuses que la moyenne à suivre aussi l'autre.",
    profilTitre: "Profil du public",
    politiqueTitre: "Positionnement politique moyen du public",
    echelleGauche: "0 · très à gauche",
    echelleCentre: "5",
    echelleDroite: "10 · très à droite",
    nonReponses: (part: number) =>
      `${formaterPart(part)} de son public ne se positionne pas sur cette échelle.`,
    ageTitre: "Âge moyen",
    age: (ans: number) => `≈ ${entier.format(ans)} ans`,
    ageMarge: (bas: number, haut: number) =>
      `marge ${entier.format(bas)}–${entier.format(haut)} ans`,
    moins35Titre: "Moins de 35 ans",
    partMarge: (bas: number, haut: number) => `marge ${formaterPart(bas)}–${formaterPart(haut)}`,
    confianceTitre: "Confiance",
    // ADR-006 : part de « source de référence » parmi les personnes qui ont noté le média.
    confiance: (part: number) =>
      `${formaterPart(part)} de son public le considère comme une source de référence.`,
    confianceJt: "Confiance : non mesurée par le baromètre pour les journaux télévisés.",
    proprieteTitre: "Propriété",
    groupe: "Groupe",
    proprietaires: "Propriétaire(s)",
    aucunGroupe: "Aucun groupe",
    part: (part: number) => formaterPart(part),
    nonIdentifie: "Propriétaire non identifié dans la base de propriété.",
    sourcePropriete: (source: string, date: string) => `Source : ${source}, ${date}.`,
    citerTitre: "Citer et partager",
    lienPermanent: "Lien permanent",
    copieImpossible:
      "Copie automatique impossible : sélectionnez le texte ci-dessous, puis copiez-le (Ctrl+C ou ⌘+C).",
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
    trier: (colonne: string) => `Trier par ${colonne.toLowerCase()}`,
    position: (moyenne: number, bas: number, haut: number) =>
      `${formaterNombre(moyenne)} (${formaterNombre(bas)}–${formaterNombre(haut)})`,
    age: (ans: number) => `${entier.format(ans)} ans`,
    nombreMedias: (n: number, total: number) =>
      n === total
        ? `${entier.format(n)} médias`
        : `${entier.format(n)} médias sur ${entier.format(total)}`,
    aucun: "Aucun média ne correspond au filtre.",
    sansWebgl:
      "Votre navigateur ne peut pas afficher la carte interactive : voici la vue tableau, qui contient toutes les informations de la carte.",
    telechargementsTitre: "Télécharger les données",
    fichiers: [
      {
        fichier: "medias.csv",
        format: "CSV",
        description: "Médias, profils des publics, familles",
      },
      { fichier: "liens.csv", format: "CSV", description: "Liens de co-audience, lift et marges" },
      { fichier: "proprietes.csv", format: "CSV", description: "Médias, groupes et propriétaires" },
      { fichier: "graphe.gexf", format: "GEXF", description: "Graphe complet, pour Gephi" },
      { fichier: "medias.parquet", format: "Parquet", description: "Médias (format typé)" },
      { fichier: "liens.parquet", format: "Parquet", description: "Liens (format typé)" },
      { fichier: "proprietes.parquet", format: "Parquet", description: "Propriété (format typé)" },
    ],
    licenceDonnees:
      "Licence : Licence Ouverte. Citer : Arcom, baromètre Les Français et l'information ; traitement Graphe des médias.",
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
    titreProprietaire: (nom: string) => `Médias détenus par ${nom}`,
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
