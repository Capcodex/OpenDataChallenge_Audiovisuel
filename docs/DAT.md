# Dossier d'architecture technique (DAT)

| | |
|---|---|
| **Projet** | Graphe des médias français |
| **Version du document** | 0.2 — fin du sprint 2 |
| **Date** | 8 octobre 2026 |
| **Auteur** | Alexandre Masson |
| **Statut** | En construction : complété à chaque sprint |

Ce dossier décrit l'architecture technique du produit : ses composants, ses données, son infrastructure, sa sécurité et son exploitation. Il distingue ce qui est **implémenté** de ce qui est **prévu**.

**Légende :** ✅ implémenté · 🟡 partiellement implémenté · 🔜 prévu (sprint indiqué)

---

## Sommaire

1. Introduction
2. Exigences qui structurent l'architecture
3. Principes d'architecture
4. Vue de contexte
5. Vue des conteneurs
6. Vue des composants du pipeline
7. Vue des données
8. Vue de l'infrastructure et du déploiement
9. Sécurité et protection des données
10. Qualité, tests et observabilité
11. Exploitation et maintenance
12. Décisions d'architecture
13. Risques et dette technique
14. État d'implémentation
15. Glossaire

---

## 1. Introduction

### 1.1 Objet

Le produit est une base de données orientée graphe et une carte interactive des médias français. Deux médias y sont reliés quand ils partagent leur public, appartiennent aux mêmes propriétaires, ou (pour les JT) traitent les mêmes sujets.

### 1.2 Périmètre du document

| Inclus | Exclu |
|---|---|
| Pipeline de données, site web, base graphe d'analyse, infrastructure Docker, CI/CD, hébergement | Méthode statistique détaillée (page Méthode, sprint 7), contenu éditorial, recherche utilisateur |

### 1.3 Documents de référence

| Document | Rôle |
|---|---|
| Note de cadrage | Objectifs, périmètre, planning |
| Cahier des charges fonctionnel (CdCF) | Exigences `EF-*`, règles `RG-*`, exigences non fonctionnelles `ENF-*` |
| Cahier des charges technique (CdCT) | Choix techniques détaillés ; ce DAT en est la version vivante |
| Backlog d'implémentation | Tâches `T-nnn` |
| [Walkthrough](walkthrough.md) | Visite guidée du code existant |
| [ADR](decisions/) | Décisions d'architecture |

Les documents de conception sont dans le dossier parent `Data Viz/`.

---

## 2. Exigences qui structurent l'architecture

| Exigence | Source | Conséquence architecturale |
|---|---|---|
| Aucune donnée individuelle publiée | FC3, ENF-09 | Séparation stricte `interim` (individuel) / `output` (agrégé) ; données hors des images Docker |
| Chaque chiffre vérifiable (source, effectif, marge) | FC1, RG-08 | Paramètres publiés ; marges calculées dans le pipeline ; métadonnées dans l'export |
| Résultats reproductibles | ENF-12 | Sources figées par empreinte, graines fixes, dépendances verrouillées, images figées |
| Carte affichée en < 3 s, données < 2 Mo | ENF-01, ENF-02 | Tout est précalculé ; site statique ; export JSON compact |
| Hébergement gratuit ou très peu cher | Contrainte budget | Pas de serveur applicatif ni de base en production |
| Tout le projet conteneurisé | Contrainte projet | Docker + Compose pour chaque composant ([ADR-001](decisions/ADR-001-conteneurisation.md)) |
| Neutralité des formulations | FC2, RG-20 à RG-25 | Textes centralisés et contrôlés automatiquement (sprint 3) |
| Accessibilité (RGAA, daltonisme, vue tableau) | ENF-06 à ENF-08 | Composants HTML natifs, vue alternative au graphe WebGL |

---

## 3. Principes d'architecture

| # | Principe | Statut |
|---|---|---|
| A1 | **Tout est calculé à l'avance** : liens, familles, disposition de la carte. Le site ne fait aucun calcul statistique. | 🟡 Liens et attributs ✅ ; familles et disposition S3 |
| A2 | **Site statique** servi par nginx ; pas de serveur applicatif ni de base en production. | 🟡 Image nginx ✅ ; contenu S5-S6 |
| A3 | **Une seule source de vérité** : les fichiers Parquet de `data/output/`. Tout le reste en dérive. | ✅ |
| A4 | **Reproductible de bout en bout** : une commande régénère tout depuis les sources brutes. | ✅ |
| A5 | **Aucune donnée individuelle hors du pipeline.** | ✅ |
| A6 | **Paramètres explicites**, versionnés et publiés. | ✅ |
| A7 | **Tout est conteneurisé.** | ✅ pipeline et site |

---

## 4. Vue de contexte

Qui utilise le système et avec quels systèmes externes il échange.

```mermaid
flowchart LR
    subgraph Utilisateurs
        U1["Journalistes, fact-checkeurs<br/>(Inès, Thomas)"]
        U2["Chercheurs<br/>(Claire)"]
        U3["Enseignants, grand public<br/>(Karim, Léa)"]
    end

    S(["Graphe des médias<br/>site + données ouvertes"])

    subgraph Sources["Sources de données"]
        D1["data.gouv.fr<br/>Arcom, INA"]
        D2["GitHub<br/>Médias français<br/>(Monde diplomatique, Acrimed)"]
    end

    E1["Plateforme de conteneurs<br/>(hébergement)"]
    E2["GitHub<br/>code, CI, registre d'images"]

    U1 -->|consulte la carte, cite| S
    U2 -->|télécharge, interroge| S
    U3 -->|explore| S
    S -->|télécharge les sources figées| D1
    S -->|télécharge au commit figé| D2
    E2 -->|déploie l'image du site| E1
    E1 -->|sert| S
```

---

## 5. Vue des conteneurs

Les unités déployables ou exécutables, toutes orchestrées par `compose.yaml`.

```mermaid
flowchart TB
    subgraph Hors_ligne["Hors ligne : poste de travail ou CI"]
        P["pipeline<br/>Python 3.12 · pandas · igraph<br/>✅"]
        N[("neo4j<br/>base graphe d'analyse<br/>profil « analyse » · 🔜 S4")]
        SD["site-dev<br/>Node · Vite<br/>✅"]
        E2E["e2e<br/>Playwright · axe-core<br/>🔜 S6"]
    end

    subgraph Fichiers["Volumes (hôte)"]
        RAW[/"data/raw<br/>sources brutes"/]
        INT[/"data/interim<br/>individuel · jamais publié"/]
        OUT[/"data/output<br/>agrégé · vérité"/]
        PUB[/"site/public<br/>graph.json · téléchargements"/]
    end

    subgraph En_ligne["En ligne"]
        SITE["site<br/>nginx non privilégié · lecture seule<br/>✅ squelette"]
    end

    P --> RAW --> P
    P --> INT --> P
    P --> OUT
    P -->|export · 🔜 S4| PUB
    P -->|chargement · 🔜 S4| N
    PUB --> SD
    PUB -->|build multi-étapes| SITE
    E2E -->|teste| SITE
```

| Conteneur | Image | Rôle | Statut |
|---|---|---|---|
| `pipeline` | `docker/pipeline.Dockerfile` (python:3.12-slim + uv) | Téléchargement, préparation, calculs, exports, tests Python | ✅ |
| `site-dev` | `docker/site.Dockerfile`, cible `dev` (node:24-slim) | Serveur de développement Vite, Vitest, ESLint, Prettier | ✅ |
| `site` | `docker/site.Dockerfile`, cible `runtime` (nginx-unprivileged alpine-slim) | Site de production | ✅ squelette (contenu S5-S6) |
| `e2e` | image Playwright officielle | Tests de bout en bout, accessibilité, performance | 🔜 S6 |
| `neo4j` | `neo4j:5-community` | Requêtes Cypher pour l'analyse et les chercheurs | 🔜 S4 |

---

## 6. Vue des composants du pipeline

### 6.1 Organisation

```mermaid
flowchart LR
    CLI["__main__.py<br/>run · check · export-neo4j"] --> REG["etapes.py<br/>registre ETAPES"]
    REG --> ETAT["etat.py<br/>empreintes, saut"]
    REG --> ING["ingest.py"]
    REG --> ARC["prepare/arcom.py"]
    REG --> REF["prepare/referentiel.py"]
    REG --> CMP["compute/coaudience.py<br/>compute/attributs.py"]
    CMP --> BOOT["compute/bootstrap.py<br/>tirages communs"]
    REG -.-> CMP3["compute/familles, disposition<br/>🔜 S3"]
    REG -.-> EXP["export/*<br/>🔜 S4"]
    REG --> SCH["schemas.py<br/>pandera"]
    ARC --> DIC["prepare/dictionnaire.py"]
    ARC --> MED["prepare/medias.py"]
    REF --> MED
    ING & ARC & REF & CMP --> CFG["config.py (Params typés) · chemins.py · texte.py"]
```

### 6.2 Contrat d'une étape

Chaque étape est un module qui expose :

| Fonction | Rôle |
|---|---|
| `executer(chemins)` | Effectue le traitement |
| `entrees(chemins)` | Liste les fichiers lus (configuration et données) |
| `sorties(chemins)` | Liste les fichiers écrits |

Le registre `ETAPES` (dans `etapes.py`) fixe l'ordre et associe à chaque étape les schémas pandera de ses sorties.

**Exécution d'une étape :**
1. calcul de l'empreinte = sha256 des fichiers d'entrée **+ code source du module** ;
2. si l'empreinte est celle mémorisée dans `data/.etat_pipeline.json` et que les sorties existent : étape sautée ;
3. sinon : `executer()`, puis validation des sorties par leurs schémas, puis mémorisation de l'empreinte.

Une entrée manquante arrête le pipeline avec un message explicite (code de sortie 1).

### 6.3 Étapes

| Étape | Module | Entrées | Sorties | Statut |
|---|---|---|---|---|
| `ingest` | `ingest.py` | `config/sources.yaml` | `data/raw/**`, `manifest.json` | ✅ |
| `prepare_arcom` | `prepare/arcom.py` | base et dictionnaire Arcom, `variables_arcom.yaml`, `medias.csv` | `repondant_media.parquet`, `repondant_confiance.parquet`, `repondant_profil.parquet`, `correspondance_confiance.csv` | ✅ |
| `referentiel` | `prepare/referentiel.py` | `medias.csv`, `params.yaml`, `repondant_media.parquet` | `medias.parquet` | ✅ |
| `coaudience` | `compute/coaudience.py` | `repondant_media.parquet`, `medias.parquet`, `params.yaml` | `paires.parquet` (interim), `liens.parquet`, `journal_coaudience.json` | ✅ |
| `attributs` | `compute/attributs.py` | `repondant_media`, `repondant_profil`, `repondant_confiance`, `medias.parquet`, `params.yaml` | `attributs_medias.parquet` | ✅ |
| `familles` | `compute/communities.py` | `liens.parquet` | `communities.parquet` | 🔜 S3 |
| `disposition` | `compute/layout.py` | `liens.parquet`, `communities.parquet` | `layout.parquet` | 🔜 S3 |
| `proprietes` | `prepare/ownership.py` | base Médias français, corrections | `ownership.parquet` | 🔜 S4 |
| `jt` | `prepare/jt.py` | CSV INA | `jt_profiles.parquet`, `jt_similarity.parquet` | 🔜 S5 |
| `export_site` | `export/site_json.py` | toutes les sorties | `site/public/data/graph.json` | 🔜 S4 |
| `telechargements` | `export/downloads.py` | toutes les sorties | `site/public/telechargements/*` | 🔜 S4 |

### 6.4 Ligne de commande

| Commande | Effet | Statut |
|---|---|---|
| `python -m pipeline run` | Toutes les étapes, en sautant celles qui sont à jour | ✅ |
| `run --only <étape>` / `--from <étape>` / `--force` | Exécution ciblée ou forcée | ✅ |
| `python -m pipeline check` | Valide les sorties existantes | ✅ |
| `python -m pipeline export-neo4j` | Charge le graphe dans Neo4j | 🔜 S4 (renvoie le code 2) |

---

## 7. Vue des données

### 7.1 Sources

| Source | Producteur | Format | Licence | Figée par | Usage | Statut |
|---|---|---|---|---|---|---|
| Baromètre « Les Français et l'information » 2026 | Arcom | CSV `;`, décimales `,` | Licence Ouverte v2.0 | sha256 | Publics, confiance, profils | ✅ |
| Dictionnaire des variables | Arcom | XLSX | Licence Ouverte v2.0 | sha256 | Libellés, correspondances | ✅ |
| Sujets des JT 2000-2020 | INA | CSV latin-1 sans en-tête | Licence Ouverte v1.0 | sha256 | Module JT | ✅ téléchargé · 🔜 traité S5 |
| Temps de parole F/H (CSA) | INA / CSA | CSV | Licence Ouverte v1.0 | sha256 | Éditeurs et groupes | ✅ téléchargé · 🔜 traité S4 |
| Médias français | Le Monde diplomatique / Acrimed | 7 TSV | ODC-By v1.0 | commit + sha256 | Propriété | ✅ téléchargé · 🔜 traité S4 |

### 7.2 Classification des données

| Zone | Contenu | Sensibilité | Versionné | Dans une image | Publié |
|---|---|---|---|---|---|
| `data/raw/` | Sources brutes | Publique (données ouvertes), mais individuelle pour l'Arcom | Non | Non | Non |
| `data/interim/` | Répondant × média, confiance individuelle | **Individuelle** (anonymisée par l'Arcom) | Non | Non | **Jamais** |
| `data/output/` | Agrégats par média, par paire | Agrégée, au-dessus des seuils | Non (régénérable) | Non | Via exports |
| `site/public/` | `graph.json`, téléchargements | Agrégée | Oui | Oui (image `site`) | Oui |

### 7.3 Tables produites

| Table | Clé | Colonnes | Statut |
|---|---|---|---|
| `interim/repondant_media` | `resp_id` | `poids`, une colonne `int8` 0/1 par média (99) | ✅ |
| `interim/repondant_confiance` | (`resp_id`, `media_id`) | `niveau` (1 référence, 2 complémentaire, 3 précaution) | ✅ |
| `interim/repondant_profil` | `resp_id` | `age_classe` (1-6), `pol` (0-10, vide si non-réponse) | ✅ S2 |
| `interim/paires` | (`source`, `cible`) | toutes les paires de médias affichables, y compris sous les seuils : **jamais publiée** | ✅ S2 |
| `output/medias` | `media_id` | `nom`, `type`, `public_prive`, `generique`, `variantes`, `libelles_arcom`, `same_brand_as`, `n_repondants`, `part_ponderee`, `affichable`, `fragile` | ✅ |
| `output/correspondance_confiance` (CSV) | `colonne` | `libelle_arcom`, `media_id`, `statut` | ✅ |
| `output/liens` | (`source`, `cible`), `source < cible` | `lift`, `lift_bas`, `lift_haut`, `n_communs` | ✅ S2 |
| `output/attributs_medias` | `media_id` | `n_repondants`, `pol_n`, `pol_moy`/`_bas`/`_haut`, `pol_part_nr`, `age_moy`/`_bas`/`_haut`, `moins35`/`_bas`/`_haut`, `n_confiance`, `conf_ref`/`_bas`/`_haut`, `n_conf_gauche`, `n_conf_droite`, `conf_ecart_gd`/`_bas`/`_haut`, `fragile` | ✅ S2 |
| `output/journal_coaudience` (JSON) | — | paires testées, gardées, rejetées par motif ; lift de référence | ✅ S2 |
| `output/communities`, `layout`, `ownership`, `jt_*` | — | voir CdCT § 8.1 | 🔜 S3-S5 |

### 7.4 Référentiel des médias

`config/medias.csv` est la table de référence, maintenue à la main :

| Colonne | Contenu |
|---|---|
| `media_id` | Identifiant stable (ex. `france-inter`) |
| `type` | `radio`, `journal`, `magazine`, `tv`, `info`, `web`, `createur`, `jt` |
| `public_prive` | `public` (service public français), `prive`, `autre`, `na` |
| `generique` | Catégorie non affichable (« Une radio locale »…) |
| `variantes` | Autres noms, pour la recherche et le rapprochement des sources |
| `libelles_arcom` | Libellés exacts du dictionnaire Arcom, pour le contrôle des codes |
| `same_brand_as` | Même marque sur un autre support (RG-31), réciproque |

99 médias en 2026, dont 19 catégories génériques et 11 médias cités par personne (C8, Canal+, radios musicales).

### 7.5 Garde-fous sur les données

| Garde-fou | Où |
|---|---|
| Empreinte sha256 de chaque source | `ingest` |
| Libellé du dictionnaire = libellé attendu pour chaque code | `prepare_arcom` |
| Question sans réponse pour une partie de la base : arrêt, sauf choix explicite (`absence_vaut_non`) | `prepare_arcom` |
| Identifiants uniques, poids strictement positifs | `prepare_arcom` |
| Chaque colonne de confiance rattachée, forcée ou ignorée ; ambiguïté = erreur | `prepare_arcom` |
| Référentiel : identifiants uniques, valeurs autorisées, `same_brand_as` réciproque | `prepare/medias.py` |
| Schémas pandera des sorties | après chaque étape, `check` |

### 7.6 Format d'échange avec le site (🔜 S4)

`site/public/data/graph.json`, figé au jalon J3 (6 novembre). Structure : `meta` (édition, paramètres, sources), `nodes`, `edges`, `communities`, `owners`, `jt`. Schéma JSON versionné dans `site/src/graph/schema.json`, validé à l'export et au chargement. Budget : < 2 Mo. Détail dans le CdCT § 8.2.

---

## 8. Vue de l'infrastructure et du déploiement

### 8.1 Images Docker

| Image | Base (figée par empreinte) | Taille | Utilisateur | Statut |
|---|---|---|---|---|
| `pipeline` | `python:3.12-slim@sha256:05cda977…` + `uv:0.8@sha256:1d31be55…` | ≈ 795 Mo (budget 1 Go) | `app` (uid 1000) | ✅ |
| `site-dev` | `node:24-slim@sha256:d6aa754f…` | ≈ 375 Mo décompressée (développement) | `node` (uid 1000) | ✅ |
| `site` | `node:24-slim` (build) → `nginx-unprivileged:stable-alpine-slim@sha256:3af0c10d…` (runtime) | **≈ 9 Mo** (budget 50 Mo) | `nginx` (uid 101) | ✅ |
| `e2e` | `mcr.microsoft.com/playwright` | — | — | 🔜 S6 |
| `neo4j` | `neo4j:5-community` | — | — | 🔜 S4 |

**Construction de l'image `pipeline` :**
1. copie de `pyproject.toml`, `uv.lock`, `README.md`, puis `uv sync --frozen --no-install-project` (couche de dépendances, mise en cache) ;
2. copie du code et des tests, `uv sync --frozen` ;
3. création de l'utilisateur `app`.

Le cache de uv est monté pendant le build (`--mount=type=cache`) et n'entre pas dans l'image.

### 8.2 Volumes du service `pipeline`

| Hôte | Conteneur | Mode | Rôle |
|---|---|---|---|
| `./config` | `/app/config` | lecture seule | Configuration |
| `./data` | `/app/data` | lecture-écriture | Données brutes, intermédiaires, sorties |
| `./site/public` | `/app/site/public` | lecture-écriture | Exports pour le site |
| `./pipeline`, `./tests` | `/app/pipeline`, `/app/tests` | lecture seule | Code monté en développement : pas de rebuild à chaque modification |

### 8.3 Environnements

| Environnement | Composition | Statut |
|---|---|---|
| Local | `docker compose` sur Docker Desktop (macOS arm64) | ✅ |
| CI | GitHub Actions, `ubuntu-latest` (amd64) | 🟡 workflow écrit, jamais exécuté |
| Aperçu | Image `site` de chaque pull request, URL temporaire | 🔜 S5 |
| Production | Image `site` sur une plateforme de conteneurs (Scaleway Serverless Containers ou Google Cloud Run, décision D3) | 🔜 S8 |

### 8.4 Chaîne CI/CD

| Workflow | Déclencheur | Étapes | Statut |
|---|---|---|---|
| `ci.yml` | pull request, push sur `main` | **pipeline** : build de l'image (cache GHA) → contrôle de taille → lint et formatage → tests unitaires → pipeline complet → tests sur les données → `check` · **site** : image `dev` → Vitest, lint, build → image `runtime` → taille < 50 Mo → healthcheck, en-têtes, 404 | 🟡 écrit, jamais exécuté |
| `pipeline.yml` | manuel | pipeline complet, pull request automatique des sorties | 🔜 S4 |
| `reproducibility.yml` | hebdomadaire | deux exécutions, comparaison des empreintes | 🔜 S4 |
| `deploy.yml` | étiquette de version | images multi-architecture → ghcr.io → déploiement | 🔜 S8 |

### 8.5 Architecture de production cible (🔜 S8)

```mermaid
flowchart LR
    V["Visiteur"] -->|HTTPS| PF["Plateforme de conteneurs<br/>TLS · CDN éventuel"]
    PF --> C["Conteneur site<br/>nginx non privilégié<br/>système de fichiers en lecture seule"]
    C --> F["Fichiers statiques<br/>HTML pré-rendus · JS · graph.json · téléchargements"]
    R["ghcr.io<br/>image versionnée"] -.->|déploiement| PF
```

---

## 9. Sécurité et protection des données

| Sujet | Mesure | Statut |
|---|---|---|
| Données individuelles | Restent dans `data/interim/`, ignoré par git et exclu des images ; seuls des agrégats au-dessus des seuils sont exportés ; test dédié | 🟡 séparation en place, contrôle des sorties S2 · test des exports 🔜 S4 |
| Intégrité des sources | Empreinte sha256 de chaque fichier, adresses figées | ✅ |
| Chaîne d'approvisionnement | Images de base figées par empreinte ; dépendances verrouillées (`uv.lock`) ; analyse de vulnérabilités (Trivy) en CI | 🟡 Trivy 🔜 S3 |
| Moindre privilège | Conteneurs non root ; montages de configuration et de code en lecture seule | ✅ |
| Secrets | Aucun dans les images ni dans git ; `.env` local à partir de `.env.example` (mot de passe Neo4j) | ✅ |
| Site | CSP sans source externe ni script en ligne, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` ; nginx non root, système de fichiers en lecture seule, `cap_drop: ALL` ; journaux sans adresse IP complète ; HTTPS terminé par la plateforme | ✅ image · HTTPS 🔜 S8 |
| Traçage des visiteurs | Aucun script tiers ; mesure d'audience éventuelle exemptée de consentement | 🔜 S8 |
| Licences | Attribution des sources dans `LICENSE-DATA.md`, l'interface et les exports | 🟡 fichier en place |

---

## 10. Qualité, tests et observabilité

### 10.1 Tests

| Niveau | Outil | Contenu actuel | Statut |
|---|---|---|---|
| Unitaires | pytest | 43 tests : + paramètres (chargeur typé), lift sur matrice jouet, lift de référence, tirages reproductibles, RG-04/RG-05 et journal, attributs sur jeu jouet, note politique, âge | ✅ |
| Données réelles | pytest (marqueur `data`) | 15 tests : + aucun lien hors RG-04/RG-05, effectifs communs recomptés, journal, reproductibilité des liens, positionnement politique recalculé en SQL (DuckDB) depuis le fichier brut, aucune donnée sous les seuils | ✅ |
| Schémas | pandera | 6 schémas (dont `liens` et `attributs_medias` avec plages), appliqués après chaque étape | ✅ |
| Lint | ruff | `check` + `format --check` | ✅ |
| Front-end | Vitest, ESLint, Prettier, `tsc` | 3 tests (normalisation de la recherche) | ✅ S2 |
| Bout en bout, accessibilité, performance | Playwright, axe-core, Lighthouse CI | — | 🔜 S6-S8 |

### 10.2 Journalisation

Le pipeline écrit sur la sortie d'erreur : heure, niveau, étape, puis les chiffres clés de chaque étape (nombre de répondants, médias affichables, médias absents…). `-v` active le niveau DEBUG. Un journal structuré `run_log.json` est prévu au sprint 4 (T-047).

### 10.3 Traçabilité

| Élément | Trace |
|---|---|
| Version de chaque source | `data/raw/manifest.json` (adresse, empreinte, taille, date de vérification) |
| Correspondance de la confiance | `data/output/correspondance_confiance.csv` |
| Filtrage des liens | `data/output/journal_coaudience.json` (paires testées, rejets par motif, lift de référence) |
| Choix des seuils | `docs/exploration/seuils.md` (`make exploration`) |
| État des étapes | `data/.etat_pipeline.json` |
| Décisions | `docs/decisions/ADR-*.md` |

---

## 11. Exploitation et maintenance

| Opération | Procédure | Statut |
|---|---|---|
| Nouvelle édition du baromètre | Mettre à jour `sources.yaml` puis `variables_arcom.yaml` ; le contrôle des libellés signale chaque code à revoir | ✅ mécanisme en place |
| Source modifiée par son producteur | `ErreurEmpreinte` : vérifier puis mettre à jour l'empreinte | ✅ |
| Mise à jour des images de base | Mensuelle, par pull request (Dependabot ou Renovate) | 🔜 S8 |
| Mise à jour de la propriété | Annuelle au minimum, fichier de corrections sourcé | 🔜 S4 |
| Retour arrière | Redéploiement de l'image précédente (ghcr.io) | 🔜 S8 |

---

## 12. Décisions d'architecture

| ADR | Décision | Date |
|---|---|---|
| [ADR-001](decisions/ADR-001-conteneurisation.md) | Conteneurisation intégrale du projet | 08/10/2026 |
| [ADR-002](decisions/ADR-002-base-graphe-neo4j.md) | Neo4j Community plutôt que Kùzu (archivé en octobre 2025) | 08/10/2026 |
| [ADR-003](decisions/ADR-003-source-proprietes.md) | Base « Médias français » figée + fichier de corrections | 08/10/2026 |
| [ADR-004](decisions/ADR-004-base-repondants.md) | Base de 2 939 répondants ; non-interrogés téléphoniques = ne suivent pas les médias en ligne | 08/10/2026 |
| [ADR-005](decisions/ADR-005-seuils-des-liens.md) | RG-01 (50) et RG-04 (30) maintenus ; **RG-05 : option à trancher** (effet d'intensité, lift de référence 1,57) | 08/10/2026 |
| [ADR-006](decisions/ADR-006-indicateurs-des-publics.md) | Âge approché par classes (65+ = 74 ans), note politique avec centre = « ST Centre », confiance = part de « source de référence » | 08/10/2026 |

**Décisions à prendre :**

| # | Sujet | Échéance |
|---|---|---|
| ADR-005 | Règle RG-05 / affichage des liens : options A, B, C | **avant T-030 (S3)** |
| ADR-007 | Pondération et résolution de Leiden | S3 |
| ADR-008 | Implémentation de la disposition ForceAtlas2 (Python ou Node) | S3 |
| ADR-009 | Plateforme de conteneurs de production (D3) | S5 |

---

## 13. Risques et dette technique

| Élément | Type | Impact | Action |
|---|---|---|---|
| CI jamais exécutée | Risque | Problèmes Linux/amd64 non détectés (droits sur les volumes, architecture) | Créer le dépôt GitHub et lancer la CI |
| Images construites pour arm64 uniquement en local | Dette | Différences possibles avec la CI | Build multi-architecture prévu (`deploy.yml`, S8) |
| Base de propriété de décembre 2024, presse indépendante absente | Risque | Couverture < 90 % sans corrections | Fichier de corrections sourcé (ADR-003) |
| Code monté en lecture seule en développement, mais copié dans l'image pour la CI | Choix | Deux chemins d'exécution | Les deux sont testés (local et CI) |
| Graphe très dense : 62 % des paires reliées avec RG-05 telle qu'écrite | Risque | Carte illisible, « lien » sans signification | ADR-005 : décision avant T-030 |
| Âge connu par classes seulement | Limite des données | Âge moyen approché (± 1 an) | Mettre en avant la part des moins de 35 ans (ADR-006) |
| Bibliothèques front récentes (Preact 11, Sigma 4, Vite 8, TypeScript 6) | Risque | Exemples et documentation plus rares | Squelette minimal validé par build et tests ; vérifier l'API de Sigma 4 avant S5 |
| Projet initialement dans `Documents` (synchronisé avec iCloud Drive), disque plein à 98 % | Risque **résolu** le 08/10/2026 | macOS retirait les fichiers du disque ; Docker ne pouvait plus les lire (`Errno 35`) | Projet déplacé dans `~/dev/graphe-medias` ; contrôle `fichiers-locaux` conservé dans le Makefile |

---

## 14. État d'implémentation

| Domaine | Fin S2 | Prochaine étape |
|---|---|---|
| Socle Docker et outillage | ✅ pipeline, site-dev, site | hadolint, Trivy (S3) |
| Ingestion des sources | ✅ 12 sources | — |
| Préparation Arcom | ✅ médias, confiance, âge, politique | — |
| Calculs du graphe | ✅ co-audience, attributs | Familles, disposition (S3) |
| Propriété | 🟡 sources téléchargées | Rapprochement (S4) |
| Exports et base graphe | — | S4 |
| Site | ✅ images `site-dev` et `site`, squelette Vite + Preact | Jetons de design, i18n (S3), carte (S5) |
| CI/CD | 🟡 `ci.yml` écrit (pipeline + site), YAML corrigé | Exécution sur GitHub |

---

## 15. Glossaire

| Terme | Définition |
|---|---|
| **ADR** | Architecture Decision Record : fiche courte qui consigne une décision et ses raisons |
| **Affichable** | Média non générique suivi par au moins 50 répondants (RG-01) |
| **CATI** | Enquête par téléphone ; ici, l'échantillon de personnes n'utilisant pas internet |
| **Co-audience** | Part de public commune à deux médias |
| **Empreinte (sha256)** | Identifiant calculé à partir du contenu d'un fichier ; change si un seul octet change |
| **Fragile** | Chiffre reposant sur moins de 100 répondants (RG-03) |
| **Lift** | Rapport entre le public commun observé et celui attendu par hasard |
| **Parquet** | Format de fichier tabulaire compressé, qui conserve les types |
| **Pondération** | Correction qui rend l'échantillon représentatif (colonne `POIDS`) |
| **uv** | Gestionnaire de paquets et d'environnements Python |
