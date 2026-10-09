# Graphe des médias

Graphe de proximité des médias français : quels médias partagent le même public, appartiennent aux mêmes propriétaires et traitent les mêmes sujets.

Le projet s'appuie sur des données publiques : le baromètre de l'Arcom « Les Français et l'information » (2026), les données de l'INA sur les journaux télévisés et la base « Médias français » du Monde diplomatique et d'Acrimed.

**Site :** https://graphe-medias-718967467429.europe-west9.run.app · carte des publics, fiche de chaque média, propriétaires, JT 2000-2020, méthode et données téléchargeables.

> **État :** V1 (sprint 8) : recette et mise en production. Bilans de chaque sprint dans [docs/sprints/](docs/sprints/).

## Prérequis

**Docker** avec **Docker Compose v2**. Rien d'autre : Python, uv et les dépendances tournent dans les conteneurs ([ADR-001](docs/decisions/ADR-001-conteneurisation.md)).

## Démarrage

Depuis un poste neuf, avec Docker seul :

```bash
git clone https://github.com/Capcodex/OpenDataChallenge_Audiovisuel.git graphe-medias
cd graphe-medias
make build      # construire l'image du pipeline
make pipeline   # télécharger les sources, les vérifier et préparer les données
make test       # tests unitaires et tests sur les données
make check      # valider les sorties
make site       # site de production (nginx) sur http://localhost:8080
```

Sans `make` : `docker compose run --rm pipeline [commande]`.

| Commande | Effet |
|---|---|
| `python -m pipeline run` | Exécute toutes les étapes ; les étapes dont les entrées n'ont pas changé sont sautées |
| `python -m pipeline run --only <étape>` | Exécute une seule étape |
| `python -m pipeline run --from <étape>` | Reprend à partir d'une étape |
| `python -m pipeline run --force` | Réexécute tout |
| `python -m pipeline check` | Valide les sorties existantes (schémas) |

Étapes actuelles : `ingest` → `prepare_arcom` → `referentiel` → `proprietes` → `coaudience` → `attributs` → `familles` → `disposition` → `jt` → `jt_similarites` → `export_site` → `telechargements` → `journal`.

| Commande `make` | Effet |
|---|---|
| `make exploration` | Rapports sur les seuils et les familles, aperçu de la carte : `docs/exploration/` |
| `make dev` | Site en développement (Vite, rechargement à chaud) : http://localhost:5173 |
| `make site` / `make site-stop` | Site de production (nginx, lecture seule) : http://localhost:8080 |
| `make test-site`, `make lint-site` | Tests Vitest ; ESLint, Prettier et contrôle du vocabulaire (RG-20) |
| `make test-e2e` | Scénarios de recette (Playwright), accessibilité (axe-core) et budgets Lighthouse, contre l'image de production |
| `make format` | Formatage Python (ruff) |
| `make reproductibilite` | Deux exécutions forcées : les fichiers produits doivent être identiques |
| `make neo4j` / `make neo4j-stop` | Base graphe d'analyse : chargement, requêtes d'exemple ([docs/requetes.cypher](docs/requetes.cypher)), http://localhost:7474 |

## Organisation

```
config/          sources (adresses + empreintes), correspondance Arcom, référentiel des médias, paramètres
pipeline/        code du pipeline
tests/           tests unitaires (tests/unit) et tests sur les données réelles (tests/data)
docker/          Dockerfiles
docs/            walkthrough.md (visite guidée), DAT.md (architecture), methode.md (méthode publiée),
                 decisions/ (ADR), sprints/ (bilans), exploration/ (analyses hors produit)
data/            données téléchargées et calculées — non versionné
site/            site web : Vite + TypeScript + Preact + Sigma.js ; public/ (données agrégées publiées),
                 scripts/ (page Méthode et pages pré-générées au build)
infra/           infrastructure Google Cloud en Terraform (docs/deploiement.md)
e2e/             tests de bout en bout : Playwright, axe-core, Lighthouse (CdC technique § 12.2)
scripts/         reproductibilité du pipeline, vérification du site en production
```

### Données produites

| Fichier | Contenu | Diffusion |
|---|---|---|
| `data/raw/` | Sources téléchargées et `manifest.json` | Non versionné |
| `data/interim/repondant_media.parquet` | Répondant × média (0/1) avec poids | **Données individuelles : jamais publiées** |
| `data/interim/repondant_confiance.parquet` | Niveau de confiance par répondant et média | **Données individuelles : jamais publiées** |
| `data/interim/repondant_profil.parquet` | Classe d'âge et note politique par répondant | **Données individuelles : jamais publiées** |
| `data/interim/paires.parquet` | Toutes les paires de médias, y compris sous les seuils | **Jamais publié** (petits effectifs) |
| `data/output/medias.parquet` | Référentiel enrichi : effectifs, part pondérée, affichable, fragile | Agrégé |
| `data/output/correspondance_confiance.csv` | Colonne de confiance Arcom → média | Agrégé |
| `data/output/liens.parquet` | Liens de co-audience retenus (RG-04, RG-05) : lift, intervalle, effectif commun | Agrégé |
| `data/output/attributs_medias.parquet` | Profil du public de chaque média : politique, âge, confiance, avec intervalles | Agrégé |
| `data/output/journal_coaudience.json` | Paires testées, gardées, rejetées par motif ; lift de référence | Agrégé |
| `data/output/familles.parquet` | Famille, stabilité, intermédiarité, participation, pont | Agrégé |
| `data/output/disposition.parquet` | Position de chaque média sur la carte | Agrégé |
| `data/output/journal_familles.json` | Réglages, stabilité, familles affichées ou non (RG-07) | Agrégé |
| `data/output/proprietes.parquet` | Groupe et propriétaires ultimes de chaque média | Agrégé |
| `data/output/run_log.json` | Journal complet de l'exécution | Agrégé |
| `data/output/jt_profils.parquet`, `jt_similarites.parquet` | Module JT : parts des rubriques, proximité des chaînes | Agrégé |
| `site/public/data/graph.json` | Données de la carte (format validé par `site/src/graph/schema.json`) | **Publié, versionné** |
| `site/public/telechargements/` | CSV, Parquet, GEXF, dictionnaire des colonnes, journal | **Publié, versionné** |

La méthode de calcul est décrite dans [docs/methode.md](docs/methode.md) ; les sources et la définition de chaque colonne dans [docs/donnees.md](docs/donnees.md).

## Mettre à jour une source

L'étape `ingest` échoue si un fichier téléchargé n'a pas l'empreinte attendue : la source a changé. Vérifier la nouvelle version, puis mettre à jour l'adresse et l'empreinte dans `config/sources.yaml`.

## Modifier les dépendances Python

Éditer `pyproject.toml`, puis régénérer le verrouillage dans un conteneur :

```bash
docker run --rm -v "$PWD":/app -w /app -e UV_PYTHON_DOWNLOADS=never \
  ghcr.io/astral-sh/uv:0.8-python3.12-bookworm-slim uv lock
make build
```

## Déployer

Tout est décrit dans [docs/deploiement.md](docs/deploiement.md) (infrastructure en Terraform, accès à créer une fois) :

- **Aperçu** : chaque pull request est publiée sur sa propre adresse, en commentaire de la pull request.
- **Production** : une étiquette de version sur `main` (`git tag v1.0.0 && git push origin v1.0.0`) publie les images `amd64` et `arm64` sur ghcr.io et déploie le site ; retour arrière automatique si les vérifications échouent.

## Modifier les dépendances du site

```bash
docker compose run --rm site-dev npm install <paquet>   # met à jour package.json et package-lock.json
docker compose build site-dev site
```

## Sur Linux

Les conteneurs `pipeline` et `site-dev` tournent avec l'uid 1000. Si ton uid est différent, rendre `data/` et `site/` accessibles en écriture : `chmod -R a+rwX data site`.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) : branches et pull requests, contrôles à lancer, règles de vocabulaire et de confidentialité des données.

## Licences

- Code : [MIT](LICENSE)
- Données : voir [LICENSE-DATA.md](LICENSE-DATA.md) (Licence Ouverte, ODC-By ; attribution obligatoire)
