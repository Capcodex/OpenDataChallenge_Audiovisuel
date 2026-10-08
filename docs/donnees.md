# Données du projet : sources et dictionnaire

*État : fin du sprint 4 (8 octobre 2026). À mettre à jour à chaque nouvelle source, table ou colonne.*

Ce document recense **les sources utilisées** (section 1) et **la définition de chaque donnée** manipulée par le projet : variables lues dans les sources (section 2), fichiers de configuration (section 3) et tables produites par le pipeline (sections 4 et 5). La méthode de calcul est détaillée dans [methode.md](methode.md), les licences dans [LICENSE-DATA.md](../LICENSE-DATA.md).

**Conventions de types**

| Type | Signification |
|---|---|
| `str` | Chaîne UTF-8 |
| `int8`, `int64` | Entier signé 8 ou 64 bits |
| `float64` | Réel double précision ; `NaN` = valeur absente ou non publiée |
| `bool` | Vrai / faux |
| `list[str]` | Liste de chaînes (Parquet) ; dans un CSV de configuration, valeurs séparées par `|` |

Les parts (`part_*`, `moins35`, `conf_ref`…) sont exprimées **entre 0 et 1**, pas en pourcentage. Les effectifs (`n_*`) sont des **nombres de répondants non pondérés**. Toutes les autres statistiques sont **pondérées** par `POIDS` (RG-11).

---

## 1. Sources

Toutes les sources sont téléchargées par l'étape `ingest` depuis une adresse figée et vérifiées par leur empreinte sha256 ([`config/sources.yaml`](../config/sources.yaml)). Le manifeste `data/raw/manifest.json` garde, pour chaque fichier, l'adresse, l'empreinte, la taille et la date de vérification.

### 1.1 Vue d'ensemble

| Source | Producteur | Licence | Usage dans le projet | Statut |
|---|---|---|---|---|
| [Les Français et l'information, baromètre 2026](https://www.data.gouv.fr/fr/datasets/les-francais-et-linformation-barometre/) (2e édition, terrain juin-juillet 2025) | Arcom | Licence Ouverte v2.0 | Médias suivis, confiance, âge, positionnement politique : liens et profils des publics | ✅ utilisée |
| [Classement thématique des sujets de JT, 2000-2020](https://www.data.gouv.fr/fr/datasets/classement-thematique-des-sujets-de-journaux-televises-janvier-2000-decembre-2020/) | INA | Licence Ouverte v1.0 | Module JT : profils thématiques et similarité des chaînes | Téléchargée · traitement S5 |
| [Temps de parole des femmes et des hommes (déclarations CSA)](https://www.data.gouv.fr/fr/datasets/temps-de-parole-des-femmes-et-des-hommes-dans-les-programmes-ayant-fait-lobjet-dune-declaration-au-csa-pour-son-rapport-portant-sur-la-representation-des-femmes-a-la-television-et-la-radio/) | INA / CSA | Licence Ouverte v1.0 | Éditeur et groupe des chaînes et radios (complément de la propriété) | Téléchargée · traitement S4 |
| [Médias français : qui possède quoi](https://github.com/mdiplo/Medias_francais), commit `231814e` du 17/12/2024 | Le Monde diplomatique, Acrimed | ODC-By v1.0 (attribution obligatoire) | Propriétaires et groupes des médias ([ADR-003](decisions/ADR-003-source-proprietes.md), [ADR-009](decisions/ADR-009-propriete-et-exports.md)) | ✅ utilisée |

### 1.2 Fichiers

| Identifiant (`sources.yaml`) | Fichier local (`data/`) | Format | Taille | Contenu |
|---|---|---|---|---|
| `arcom_2026_base` | `raw/arcom/2026-base-anonymisee-complete.csv` | CSV `;`, décimale `,`, avec en-tête | 14,8 Mo | Réponses individuelles anonymisées : 3 377 répondants, une ligne par répondant |
| `arcom_2026_dictionnaire` | `raw/arcom/2026-datamap.xlsx` | Excel, feuilles `LEVELS`, `VARIABLES`, `TEXTS` | 124 ko | Libellés des questions et des modalités (feuille `TEXTS` : `NAME`, `TYPE`, `CODE`, `FR:L`) |
| `arcom_2026_guide` | `raw/arcom/2026-guide-utilisation.pdf` | PDF | 156 ko | Guide d'utilisation de la base (documentation, non lu par le pipeline) |
| `ina_jt_2000_2020` | `raw/ina/jt-quotidien-2000-2020.csv` | CSV `;`, **latin-1, sans en-tête** | 9,9 Mo | 268 424 lignes : jour × chaîne × rubrique |
| `ina_csa_chaines` | `raw/ina/csa-parole-femmes-chaines.csv` | CSV `,`, avec en-tête | 9 ko | 40 chaînes et radios, avec éditeur et groupe |
| `mdiplo_medias` | `raw/proprietes/medias.tsv` | TSV | 16 ko | 218 médias |
| `mdiplo_organisations` | `raw/proprietes/organisations.tsv` | TSV | 2 ko | 78 organisations (groupes, sociétés, État…) |
| `mdiplo_personnes` | `raw/proprietes/personnes.tsv` | TSV | 1 ko | 38 personnes (actionnaires), avec classements Challenges et Forbes |
| `mdiplo_organisation_media` | `raw/proprietes/organisation-media.tsv` | TSV | — | 226 relations organisation → média |
| `mdiplo_organisation_organisation` | `raw/proprietes/organisation-organisation.tsv` | TSV | — | 43 relations organisation → organisation |
| `mdiplo_personne_media` | `raw/proprietes/personne-media.tsv` | TSV | — | 4 relations personne → média |
| `mdiplo_personne_organisation` | `raw/proprietes/personne-organisation.tsv` | TSV | — | 41 relations personne → organisation |

---

## 2. Variables lues dans les sources

### 2.1 Baromètre Arcom (`arcom_2026_base`)

Seules les variables ci-dessous sont lues. Les autres colonnes du fichier sont ignorées.

| Variable | Type source | Définition | Utilisée pour |
|---|---|---|---|
| `RECORD2025` | entier | Identifiant anonyme du répondant, unique | `resp_id` |
| `POIDS` | réel | Poids de redressement fourni par l'Arcom (le guide le nomme `POIDS03`) | Toutes les statistiques pondérées |
| `SOURCES1AR_B1_R2_R_1` … `_n` | code de modalité ou vide | Radios consultées régulièrement (choix multiples) | Table répondant × média ; définit aussi la base des 2 939 répondants interrogés sur les médias (RG-10) |
| `SOURCES1BR_B2_R2_R_*` | idem | Journaux | Table répondant × média |
| `SOURCES1CR_B3_R3_R_*` | idem | Magazines, revues | idem |
| `SOURCES1DR_B4_R3_*` | idem | Chaînes de télévision | idem |
| `SOURCES1ER_B4_R2_*` | idem | Chaînes d'information | idem |
| `SOURCES1FR_R2_R_*` | idem | Réseaux sociaux, plateformes, créateurs ; non posée aux 143 répondants interrogés par téléphone ([ADR-004](decisions/ADR-004-base-repondants.md)) | idem |
| `TV2AR_R_*` | idem | Journaux télévisés regardés régulièrement | idem |
| `SOURCES1TER_R2_1` … `_90` | 1, 2, 3 ou vide | Confiance accordée à un média : 1 « source de référence », 2 « complémentaire », 3 « à prendre avec précaution ». Les colonnes suivent l'ordre de la liste `C_SOURCES1TER_R2` du dictionnaire | `repondant_confiance` |
| `RS2C_RECODE_AGE` | 1 à 6 | Classe d'âge : 15-17, 18-24, 25-34, 35-49, 50-64, 65 ans et plus | `repondant_profil.age_classe` |
| `NOU1_R1_1`, `NOU1_R1_2` | code de modalité ou vide | Orientation politique de 0 (très à gauche) à 10 (très à droite) : sous-total en colonne 1, note détaillée en colonne 2 ; la note 5 n'existe que sous « ST Centre » ([ADR-006](decisions/ADR-006-indicateurs-des-publics.md)) | `repondant_profil.pol` |
| `PAGE_R_2` | entier | Mode d'interrogation (2 = téléphone) | Tests de contrôle seulement |

La correspondance **code de modalité → média** est dans [`config/variables_arcom.yaml`](../config/variables_arcom.yaml). Pour chaque code, le pipeline vérifie que le libellé du dictionnaire correspond au média attendu.

### 2.2 JT de l'INA (`ina_jt_2000_2020`, à traiter au sprint 5)

Fichier sans en-tête. Noms de colonnes retenus lors de l'analyse exploratoire :

| Position | Nom | Type | Définition |
|---|---|---|---|
| 1 | `date` | date `JJ/MM/AAAA` | Jour de diffusion |
| 2 | `chaine` | str | TF1, France 2, France 3, Arte, M6 |
| 3 | `vide` | — | Colonne entièrement vide |
| 4 | `rubrique` | str | Une des 14 rubriques (Catastrophes, Culture-loisirs, Économie… Sport) |
| 5 | `nb_sujets` | entier | Nombre de sujets de la rubrique ce jour-là |
| 6 | `duree_s` | entier | Durée cumulée de ces sujets, en secondes |

### 2.3 Temps de parole INA / CSA (`ina_csa_chaines`, à traiter au sprint 4)

| Colonne | Définition | Usage prévu |
|---|---|---|
| `media` | Nom de la chaîne ou de la radio | Rapprochement avec `medias.csv` |
| `Editeur` | Société éditrice | Propriété |
| `group` | Groupe audiovisuel | Propriété |
| `*_2019`, `*_2020` | Déclarations et temps de parole par sexe | Non utilisées |

### 2.4 Médias français (`mdiplo_*`)

| Fichier | Colonnes | Définition |
|---|---|---|
| `medias.tsv` | `Nom`, `Type`, `Periodicite`, `Echelle`, `Prix`, `Disparu` | Un média par ligne |
| `organisations.tsv` | `nom`, `commentaire` | Une organisation par ligne |
| `personnes.tsv` | `Nom`, `rangChallenges<année>`, `milliardaireForbes<année>` (2021-2024) | Une personne par ligne |
| `organisation-media.tsv`, `personne-media.tsv` | `id`, `origine`, `qualificatif`, `valeur`, `cible` | Lien de détention : `origine` détient `cible` ; `valeur` = part de détention |
| `organisation-organisation.tsv`, `personne-organisation.tsv` | idem + `commentaire` | idem, entre organisations |

Valeurs de `qualificatif` : `égal à` (282 relations, `valeur` en pourcentage), `contrôle` (22, sans valeur), `participe` (5), `supérieur à` (4), `inférieur à` (1). Seul `égal à` donne une part chiffrée. Fichiers en UTF-8 avec fins de ligne Windows (CRLF).

---

## 3. Fichiers de configuration

### 3.1 Référentiel des médias : `config/medias.csv`

Une ligne par média (99 en 2026). Maintenu à la main, validé à chaque exécution.

| Colonne | Type | Obligatoire | Définition |
|---|---|---|---|
| `media_id` | str | oui, unique | Identifiant stable, en minuscules avec tirets (ex. `france-inter`). Clé de toutes les tables |
| `nom` | str | oui | Nom affiché |
| `type` | str | oui | `radio`, `journal`, `magazine`, `tv`, `info` (chaîne d'information), `web`, `createur` (créateur de contenu), `jt` |
| `public_prive` | str | oui | `public` (service public français), `prive`, `autre`, `na` |
| `generique` | `true` / `false` | oui | Catégorie non affichable (« une autre radio », « un journal régional ») |
| `variantes` | `list[str]` | non | Autres noms du média, pour la recherche et le rapprochement des sources |
| `libelles_arcom` | `list[str]` | oui | Libellés exacts du dictionnaire Arcom, pour contrôler les codes |
| `same_brand_as` | str | non | `media_id` de la même marque sur un autre support (RG-31) ; doit être réciproque |

### 3.2 Correspondance Arcom : `config/variables_arcom.yaml`

| Clé | Définition |
|---|---|
| `colonnes.identifiant`, `colonnes.poids` | Noms des colonnes identifiant et poids |
| `question_base` | Question qui définit la base des répondants (RG-10) |
| `questions[].variable` | Préfixe des colonnes d'une question à choix multiples |
| `questions[].medias` | Code de modalité → `media_id` ; les codes absents (sous-totaux, « Rien de tout cela »…) sont ignorés (RG-12) |
| `questions[].absence_vaut_non` | Si vrai, une absence de réponse vaut « ne suit pas » ; sinon elle fait échouer le pipeline |
| `confiance` | Variable de confiance, liste de libellés, niveaux, colonnes ignorées (médias ultramarins) ou forcées (libellés ambigus) |
| `profil.age.classes` | Code → libellé attendu et bornes `[âge min, âge max]` (`null` = pas de borne haute) |
| `profil.politique.codes` | Code → libellé attendu et note 0-10 |

### 3.3 Corrections de propriété : `config/proprietes_corrections.csv`

Une ligne par média à traiter hors du rapprochement automatique ([ADR-009](decisions/ADR-009-propriete-et-exports.md)).

| Colonne | Définition |
|---|---|
| `media_id` | Média du référentiel |
| `regle` | `nom_base` (nom différent dans la base), `meme_que` (mêmes propriétaires qu'un autre média), `detenteur` (saisie sourcée, plusieurs lignes possibles), `non_identifie` |
| `valeur` | Nom dans la base (`nom_base`), `media_id` modèle (`meme_que`) ou nom du détenteur (`detenteur`) |
| `part` | Part du détenteur, en % (`detenteur`) |
| `type_proprietaire` | `personne`, `etat` ou `organisation` (`detenteur`) |
| `source`, `date` | Source et date de l'information ; **obligatoires** pour `detenteur` |
| `commentaire` | Justification |

### 3.4 Paramètres : `config/params.yaml`

Liste et valeurs dans [methode.md § 9](methode.md#9-paramètres-édition-2026). Une clé absente, inconnue, mal typée ou hors plage fait échouer le pipeline.

---

## 4. Tables intermédiaires (`data/interim/`)

> ⚠️ **Données individuelles ou sous les seuils : jamais publiées**, jamais versionnées, jamais copiées dans une image Docker (ENF-09).

### 4.1 `repondant_media.parquet` · étape `prepare_arcom`

Une ligne par répondant de la base (2 939 lignes, 101 colonnes).

| Colonne | Type | Définition |
|---|---|---|
| `resp_id` | int64, unique | Identifiant du répondant (`RECORD2025`) |
| `poids` | float64, > 0 | Poids de redressement (`POIDS`) |
| `<media_id>` (99 colonnes) | int8, 0 ou 1 | 1 si le répondant suit régulièrement le média |

### 4.2 `repondant_confiance.parquet` · étape `prepare_arcom`

Une ligne par réponse de confiance (26 997 lignes). Clé : (`resp_id`, `media_id`).

| Colonne | Type | Définition |
|---|---|---|
| `resp_id` | int64 | Identifiant du répondant |
| `media_id` | str | Média évalué |
| `niveau` | int8, 1 à 3 | 1 « source de référence », 2 « complémentaire », 3 « à prendre avec précaution » |

### 4.3 `repondant_profil.parquet` · étape `prepare_arcom`

Une ligne par répondant de la base (2 939 lignes), dans le même ordre que `repondant_media`.

| Colonne | Type | Définition |
|---|---|---|
| `resp_id` | int64, unique | Identifiant du répondant |
| `age_classe` | int8, 1 à 6 | Classe d'âge (1 = 15-17 ans … 6 = 65 ans et plus) |
| `pol` | float64, 0 à 10, `NaN` possible | Auto-positionnement politique ; `NaN` = non-réponse |

### 4.4 `paires.parquet` · étape `coaudience`

Toutes les paires de médias affichables, **avant** filtrage (2 278 lignes). Mêmes colonnes que `liens.parquet` (§ 5.2), sauf `affiche`. Contient des paires à faible effectif commun : sert uniquement à l'exploration des seuils.

---

## 5. Tables de sortie (`data/output/`)

Agrégats au-dessus des seuils : source de vérité du projet (CdCT principe A3). `graph.json` et les fichiers téléchargeables en seront dérivés au sprint 4.

### 5.1 `medias.parquet` · étape `referentiel`

Une ligne par média du référentiel (99 lignes). Contient toutes les colonnes de `medias.csv` (§ 3.1), avec `generique` en `bool`, `variantes` et `libelles_arcom` en `list[str]`, et `same_brand_as` absent (`None`) si vide. S'y ajoutent :

| Colonne | Type | Définition | Règle |
|---|---|---|---|
| `n_repondants` | int64, ≥ 0 | Nombre de répondants (non pondéré) qui suivent le média | — |
| `part_ponderee` | float64, 0 à 1 | Part pondérée des 2 939 répondants qui suivent le média | RG-11 |
| `affichable` | bool | Non générique et `n_repondants` ≥ 50 | RG-01 |
| `fragile` | bool | `n_repondants` < 100 | RG-03 |

### 5.2 `liens.parquet` · étape `coaudience`

Un lien de co-audience retenu par ligne (1 413 lignes en 2026). Clé : (`source`, `cible`), avec `source < cible` (ordre alphabétique) : chaque paire n'apparaît qu'une fois.

| Colonne | Type | Définition | Règle |
|---|---|---|---|
| `source` | str | `media_id` du premier média | — |
| `cible` | str | `media_id` du second média | — |
| `lift` | float64, > 0 | `P(A et B) / (P(A) × P(B))`, probabilités pondérées | RG-15 |
| `lift_bas` | float64, > 0 | Borne basse de l'intervalle de confiance à 95 % (quantile 2,5 % sur 1 000 tirages bootstrap) ; > 1 pour un lien retenu | RG-05 |
| `lift_haut` | float64, > 0 | Borne haute (quantile 97,5 %) | — |
| `n_communs` | int64, ≥ 30 | Nombre de répondants (non pondéré) qui suivent les deux médias | RG-04 |
| `affiche` | bool | Lien tracé sur la carte : l'un des 5 plus forts de l'un des deux médias, ou borne basse supérieure au lift de référence (623 liens en 2026) | ADR-005 |

### 5.3 `attributs_medias.parquet` · étape `attributs`

Profil du public de chaque média affichable (68 lignes). Clé : `media_id`. Pour chaque indicateur, les colonnes `_bas` et `_haut` donnent l'intervalle de confiance à 95 % (bootstrap, mêmes tirages que les liens).

| Colonne | Type | Unité | Définition | Absent (`NaN`) si |
|---|---|---|---|---|
| `media_id` | str | — | Identifiant du média | — |
| `n_repondants` | int64 | répondants | Public du média (non pondéré) | — |
| `pol_n` | int64 | répondants | Public ayant donné une note politique | — |
| `pol_moy`, `pol_bas`, `pol_haut` | float64 | note 0-10 | Positionnement politique moyen du public, non-réponses exclues (RG-13) | — |
| `pol_part_nr` | float64 | part 0-1 | Part du public sans note politique | — |
| `age_moy`, `age_bas`, `age_haut` | float64 | années | Âge moyen **approché** : milieu de chaque classe d'âge, 74 ans pour les 65 ans et plus ([ADR-006](decisions/ADR-006-indicateurs-des-publics.md)) | — |
| `moins35`, `moins35_bas`, `moins35_haut` | float64 | part 0-1 | Part du public âgée de moins de 35 ans (exacte) | — |
| `n_confiance` | int64 | réponses | Réponses de confiance pour ce média | — |
| `conf_ref`, `conf_ref_bas`, `conf_ref_haut` | float64 | part 0-1 | Part des réponses « source de référence » (RG-14) | `n_confiance` < 50, ou média sans question de confiance (JT) |
| `n_conf_gauche`, `n_conf_droite` | int64 | réponses | Réponses de confiance des répondants notés 0-4 et 6-10 | — |
| `conf_ecart_gd`, `conf_ecart_gd_bas`, `conf_ecart_gd_haut` | float64 | écart de parts, -1 à 1 | `conf_ref` à gauche moins `conf_ref` à droite ; positif = plus de confiance à gauche | `conf_ref` absent, ou moins de 30 réponses d'un côté |
| `fragile` | bool | — | `n_repondants` < 100 (RG-03) | — |

### 5.4 `correspondance_confiance.csv` · étape `prepare_arcom`

Une ligne par colonne de confiance du baromètre (90 lignes), pour relecture.

| Colonne | Type | Définition |
|---|---|---|
| `colonne` | str | Nom de la colonne Arcom (`SOURCES1TER_R2_<n>`) |
| `libelle_arcom` | str | Libellé du média dans le dictionnaire |
| `media_id` | str | Média rattaché ; vide si la colonne est ignorée |
| `statut` | str | `automatique` (libellé reconnu), `forcée` (ambiguïté tranchée dans la configuration), `ignorée` (hors périmètre : médias ultramarins) |

### 5.5 `journal_coaudience.json` · étape `coaudience`

| Clé | Type | Définition |
|---|---|---|
| `paires_testees` | entier | Paires de médias affichables évaluées |
| `liens_retenus` | entier | Paires qui respectent RG-04 et RG-05 |
| `rejet_effectif_commun_rg04` | entier | Paires écartées pour moins de 30 répondants communs |
| `rejet_borne_basse_rg05` | entier | Paires écartées pour une borne basse ≤ 1 (après RG-04) |
| `medias_affichables` | entier | Nombre de médias affichables |
| `medias_relies` | entier | Médias ayant au moins un lien |
| `iterations_bootstrap` | entier | Nombre de tirages |
| `lift_reference_intensite` | réel | Lift attendu du seul fait de l'intensité de consommation, `E[k²] / E[k]²` ([ADR-005](decisions/ADR-005-seuils-des-liens.md)) |
| `liens_affiches` | entier | Liens tracés sur la carte (`affiche` vrai) |

### 5.6 `familles.parquet` · étape `familles`

Une ligne par média affichable (68 lignes). Clé : `media_id` ([ADR-007](decisions/ADR-007-familles.md)).

| Colonne | Type | Définition | Règle |
|---|---|---|---|
| `media_id` | str | Identifiant du média | — |
| `famille` | int64, ≥ 1 | Famille détectée par Leiden ; 1 = la plus grande | RG-06 |
| `stabilite` | float64, 0 à 1 | Part des 100 sous-échantillons où le média reste dans sa famille | RG-07 |
| `intermediarite` | float64, 0 à 1 | Intermédiarité pondérée (distance = 1 / lift), normalisée | E1-05 |
| `participation` | float64, 0 à 1 | Coefficient de participation : 0 si tous les liens restent dans la famille | E1-05 |
| `pont` | bool | Parmi les 10 médias à la participation la plus forte | E1-05 |

### 5.7 `journal_familles.json` · étape `familles`

| Clé | Type | Définition |
|---|---|---|
| `liens`, `liens_utilises` | texte, entier | Ensemble de liens utilisé (`affiches` ou `retenus`) et leur nombre |
| `resolution`, `poids` | réel, texte | Réglages de Leiden |
| `sous_echantillons` | entier | Nombre de sous-échantillons de stabilité |
| `familles`, `tailles` | entier, objet | Nombre de familles et nombre de médias par famille |
| `ari_moyen` | réel | Indice de Rand ajusté moyen entre la référence et les sous-échantillons |
| `part_medias_stables` | réel, 0 à 1 | Part des médias dont la stabilité atteint `stabilite_noeud_min` |
| `familles_affichees` | booléen | RG-07 : `part_medias_stables` ≥ `part_noeuds_stables_min` |

### 5.8 `disposition.parquet` · étape `disposition`

Une ligne par média affichable (68 lignes). Clé : `media_id` ([ADR-008](decisions/ADR-008-disposition.md)).

| Colonne | Type | Définition |
|---|---|---|
| `media_id` | str | Identifiant du média |
| `x`, `y` | float64, 0 à 1 | Position sur la carte (ForceAtlas2, graine fixe), proportions conservées ; `y` croît vers le bas |

### 5.9 `graphe_provisoire.gexf` · `make exploration` (hors pipeline)

Graphe complet pour Gephi, produit pour le jalon J2. Remplacé par `telechargements/graphe.gexf` (§ 6.2).

### 5.10 `proprietes.parquet` · étape `proprietes`

Une ligne par (média, propriétaire ultime) ; une ligne sans propriétaire pour un média non identifié. Médias non génériques du référentiel ([ADR-009](decisions/ADR-009-propriete-et-exports.md)).

| Colonne | Type | Définition |
|---|---|---|
| `media_id` | str | Identifiant du média |
| `groupe` | str, vide possible | Détenteur direct principal |
| `proprietaire_id` | str, vide si non identifié | Identifiant du propriétaire ultime (`famille-bouygues`) |
| `proprietaire` | str, vide si non identifié | Nom du propriétaire ultime |
| `type_proprietaire` | str | `personne` (ou famille), `etat`, `organisation` |
| `part` | float64, 0 à 1, vide possible | Part effective (produit des parts le long de la chaîne) ; vide si un maillon n'est pas chiffré |
| `statut` | str | `base`, `correction`, `meme_que`, `non_identifie` |
| `source`, `date` | str | Source de l'information et sa date |

### 5.11 `journal_arcom.json`, `journal_proprietes.json` et `run_log.json`

- `journal_arcom.json` (`prepare_arcom`) : `repondants_total`, `repondants_base`, `non_interroges_par_question`, `medias`, `reponses_confiance`, `medias_avec_confiance`, `notes_politiques`.
- `journal_proprietes.json` (`proprietes`) : `medias_affichables`, `rattaches_base`, `rattaches_correction`, `rattaches_meme_que`, `non_identifies`, `sans_statut`, `taux_rattaches`, `taux_rattaches_ou_marques`, `non_identifies_liste`.
- `run_log.json` (`journal`) : journal complet d'une exécution (EF-FT-10). Il contient `version_pipeline`, `edition`, `date_traitement`, `sources` (identifiant, sha256, taille), `params`, et les sections `repondants`, `medias`, `liens`, `attributs`, `familles` et `proprietes`. Il est publié tel quel dans `telechargements/journal.json`.

---

## 6. Données publiées (`site/public/`, versionnées)

### 6.1 `data/graph.json` · étape `export_site`

Données de la carte, au format décrit et validé par [`site/src/graph/schema.json`](../site/src/graph/schema.json) (format 1, gelé au jalon J3, [ADR-009](decisions/ADR-009-propriete-et-exports.md)). JSON compact, réels arrondis à 3 décimales, 155 ko en 2026.

| Clé | Contenu |
|---|---|
| `meta` | `format`, `edition`, `date_traitement`, `version_pipeline`, `adresse_site`, `sources`, `params`, `communities_displayed` (RG-07), `lift_reference` |
| `nodes[]` | Un média affichable : `id`, `label`, `aliases`, `type`, `public`, `x`, `y`, `community`, `stability`, `bridge`, `n`, `share`, `fragile`, `pol`, `age`, `under35`, `trust`, `trust_gap` (triplets [valeur, borne basse, borne haute], `null` si non publiés), `pol_nr`, `group`, `owners[] {id, share}`, `owner_status` |
| `others[]` | Médias sous le seuil (RG-02) : `id`, `label`, `aliases`, `type` seulement |
| `edges[]` | Liens retenus : `s`, `t`, `lift`, `ci` [bas, haut], `n` (répondants communs), `shown` (tracé sur la carte) |
| `communities[]` | `id`, `label` (provisoire), `color`, `size` |
| `owners[]` | `id`, `name`, `type`, `source`, `as_of` |
| `jt` | `null` jusqu'au sprint 5 |

### 6.2 `telechargements/` · étapes `telechargements` et `journal`

| Fichier | Contenu |
|---|---|
| `medias.csv`, `medias.parquet` | Médias affichables : référentiel, effectifs, profils des publics (§ 5.3), famille et ponts (§ 5.6), position (§ 5.8), groupe. Les effectifs de confiance sont vides quand l'indicateur correspondant n'est pas publié (ENF-09) |
| `liens.csv`, `liens.parquet` | Liens retenus (§ 5.2) |
| `proprietes.csv`, `proprietes.parquet` | Propriété des médias affichables (§ 5.10) |
| `graphe.gexf` | Graphe complet pour Gephi : nœuds avec position et attributs principaux, arêtes pondérées par le lift |
| `dictionnaire.md` | Description de chaque colonne, générée par le pipeline |
| `journal.json` | Copie de `run_log.json` |

CSV en UTF-8, séparateur virgule, point décimal, réels à 6 chiffres significatifs.

---

## 7. Tables prévues

| Table | Sprint | Colonnes prévues (CdCT § 8.1) |
|---|---|---|
| Noms des familles | après le test H5 | `communities[].label` dans `graph.json` |
| `jt_profiles` | S5 | `channel`, `year`, `rubric`, `n_subjects`, `duration_s`, `share_subjects`, `share_duration` |
| `jt_similarity` | S5 | `channel_a`, `channel_b`, `period`, `js_similarity`, `sync_corr` |

Les noms définitifs suivront la convention française du dépôt (comme `liens` et `attributs_medias`), et cette section sera alors déplacée dans la section 5.
