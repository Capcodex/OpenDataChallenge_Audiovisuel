# Walkthrough : ce qui a été construit jusqu'ici

Ce document fait visiter le projet tel qu'il est à la fin du **sprint 5** (8 octobre 2026) : d'où viennent les données, ce que fait le code, comment le lancer et le vérifier, et comment le faire évoluer.

Pour l'architecture cible et les choix techniques, voir le [DAT](DAT.md). Pour les bilans chiffrés, voir [sprints/](sprints/). Pour la méthode de calcul, voir [methode.md](methode.md).

---

## 1. Le chemin parcouru avant le code

| Étape | Livrable | Emplacement |
|---|---|---|
| Exploration de 11 jeux de données audiovisuels de data.gouv.fr | Notebook d'analyse exploratoire | `~/dev/Implementation/EDA_synthetique.ipynb` |
| Idées de produits, choix du graphe des médias | 10 produits data, puis 5 idées « graphe » | `produits_data.md` (introuvable au 08/10/2026) |
| Cadrage | Note de cadrage, Value Proposition Canvas, personas | `~/dev/Implementation/note_de_cadrage_graphe_medias.md`, etc. |
| Spécification | Backlog fonctionnel, cahiers des charges fonctionnel et technique | `~/dev/Implementation/backlog_graphe_medias.md`, `~/dev/Implementation/cahier_des_charges_*.md` |
| Conception | Wireframes et maquettes (canevas de design) | [lien du canevas](https://claude.ai/artifact/GFUXhLR1ZVAqncGU5oidmg) |
| Planification | Plan d'implémentation (8 semaines), backlog d'implémentation (88 tâches) | `~/dev/Implementation/plan_implementation_graphe_medias.md`, `~/dev/Implementation/backlog_implementation_graphe_medias.md` |
| **Sprint 1** | Socle Docker, ingestion, table répondant × média | `graphe-medias/` |
| **Sprint 2** | Liens de co-audience, profils des publics, image du site | `graphe-medias/` |
| **Sprint 3** | Familles, disposition de la carte, jetons de design, textes de l'interface | `graphe-medias/` |
| **Sprint 4** | Propriété, `graph.json`, téléchargements, Neo4j, reproductibilité | `graphe-medias/` |
| **Sprint 5** | Module JT, carte interactive, aperçus Google Cloud Run | `graphe-medias/` |

> Les documents de conception, d'abord dans `~/Documents/Data Viz/`, sont désormais dans `~/dev/Implementation/`, à côté du dépôt. `produits_data.md` ne se trouve dans aucun des deux dossiers.

**L'idée du produit, en une phrase :** relier deux médias quand ils sont suivis par les mêmes personnes, à partir des réponses individuelles du baromètre de l'Arcom, puis montrer ce graphe sur une carte interactive. La carte décrit des **publics**, pas des lignes éditoriales.

---

## 2. Lancer le projet en 3 commandes

Prérequis : Docker avec Docker Compose v2. Rien d'autre.

```bash
cd ~/dev/graphe-medias
make build      # construit l'image du pipeline (≈ 1 min la première fois)
make pipeline   # télécharge les sources, les vérifie, prépare les données (≈ 12 s)
make test       # 133 tests (+ 89 tests du site : make test-site ; 30 de bout en bout et Lighthouse : make test-e2e)
```

Sortie attendue de `make pipeline` (première exécution) :

```
▸ ingest : Téléchargement et vérification des sources
  arcom_2026_base                    téléchargement…
  …
  12 sources conformes, manifeste : data/raw/manifest.json
▸ prepare_arcom : Table répondant × média et niveaux de confiance (Arcom)
  3377 répondants au total, 2939 interrogés sur les médias
  SOURCES1FR_R2_R : 143 répondants non interrogés, comptés comme ne suivant pas ces médias
  99 médias × 2939 répondants ; 26997 réponses de confiance sur 78 médias
▸ referentiel : Référentiel des médias, effectifs et statut affichable
  Médias cités par aucun répondant en 2026 : cherie-fm, europe-2, …, c8, canal-plus
  Sous le seuil d'affichage (RG-01) : jean-massiet
  99 médias au référentiel, 68 affichables (dont 10 fragiles), 19 génériques
▸ coaudience : Liens de co-audience : lift, intervalles, filtrage (RG-04, RG-05)
  2278 paires testées entre 68 médias : 1413 liens retenus ; rejets : 580 effectif commun < 30 (RG-04), 285 borne basse ≤ 1 (RG-05)
  Lift de référence dû à l'intensité de consommation (ADR-005) : 1.57
▸ attributs : Profil des publics : positionnement politique, âge, confiance
  68 médias : positionnement politique de 4.4 à 7.0, âge moyen de 28 à 54 ans ; confiance publiée pour 59 médias, écart gauche/droite pour 46
Pipeline terminé en … s   (≈ 12 s, dont ≈ 1 s pour les étapes du sprint 2)
```

À la deuxième exécution, chaque étape affiche « à jour, ignorée » : rien n'a changé, rien n'est recalculé.

---

## 3. Le parcours des données, étape par étape

```
config/sources.yaml ──► [ingest] ──► data/raw/ (12 fichiers + manifest.json)
                                         │
config/variables_arcom.yaml ─┐           ▼
config/medias.csv ───────────┼──► [prepare_arcom] ──► data/interim/repondant_media.parquet
                             │                    ──► data/interim/repondant_confiance.parquet
                             │                    ──► data/interim/repondant_profil.parquet
                             │                    ──► data/output/correspondance_confiance.csv
config/params.yaml ──────────┴──► [referentiel] ───► data/output/medias.parquet
                                                          │
                                  [coaudience] ◄──────────┤──► data/interim/paires.parquet
                                       │                  │──► data/output/liens.parquet
                                       │                  │──► data/output/journal_coaudience.json
                                  [attributs] ◄───────────┘──► data/output/attributs_medias.parquet
                                  [familles] ◄── liens affichés ──► data/output/familles.parquet
                                  [disposition] ◄─ liens affichés ─► data/output/disposition.parquet
base Médias français + corrections ──► [proprietes] ──► data/output/proprietes.parquet
CSV INA (JT 2000-2020) ──► [jt] ──► jt_profils.parquet ──► [jt_similarites] ──► jt_similarites.parquet
toutes les sorties agrégées ──► [export_site] ──► site/public/data/graph.json (validé par son schéma)
                            ──► [telechargements] ──► site/public/telechargements/ (CSV, Parquet, GEXF…)
                            ──► [journal] ──► data/output/run_log.json
                                       ▲
                     compute/bootstrap.py : les mêmes 1 000 tirages pour les deux étapes
```

### 3.1 `ingest` : récupérer des sources vérifiées

**Fichier :** [`pipeline/ingest.py`](../pipeline/ingest.py) · **Configuration :** [`config/sources.yaml`](../config/sources.yaml)

Chaque source est décrite par une adresse figée et une empreinte sha256 :

```yaml
- id: arcom_2026_base
  url: https://www.data.gouv.fr/fr/datasets/r/8e499093-0d03-45ad-a5a9-1edb2d0a243f
  fichier: raw/arcom/2026-base-anonymisee-complete.csv
  sha256: 849eb1840dba4d1b0dfbcc7ac658aca6540510b835865db209ca9ab605450353
```

- Fichier présent avec la bonne empreinte : pas de téléchargement.
- Sinon : téléchargement dans un fichier `.part`, vérification, puis renommage.
- Empreinte différente : **le pipeline s'arrête** et affiche l'empreinte attendue et l'empreinte obtenue. Une source qui change sans prévenir ne peut donc pas fausser les résultats.

Les 12 sources : 3 fichiers Arcom (base, dictionnaire, guide), 2 fichiers INA (JT, chaînes), 7 fichiers de la base « Médias français » figés à un commit précis.

### 3.2 `prepare_arcom` : de l'enquête brute à la table répondant × média

**Fichier :** [`pipeline/prepare/arcom.py`](../pipeline/prepare/arcom.py) · **Configuration :** [`config/variables_arcom.yaml`](../config/variables_arcom.yaml)

**Le piège du fichier Arcom.** Une question à choix multiples occupe plusieurs colonnes, mais chaque colonne contient un **code de réponse**, pas un 0/1 par média :

| RECORD2025 | SOURCES1BR_B2_R2_R_1 | _2 | _3 | Lecture |
|---|---|---|---|---|
| 101 | 1 | 2 | 4 | « ST au moins un journal », Le Monde, Le Figaro |
| 102 | 17 | | | « Rien de tout cela » |

La fonction `codes_vers_indicateurs()` cherche chaque code dans toutes les colonnes de la question et produit une colonne 0/1 par média. Les codes non listés dans la configuration (sous-totaux « ST », « Rien de tout cela », « Non concerné », « Youtube »…) sont ignorés.

**Le garde-fou des libellés.** Pour chaque code configuré, `verifier_codes()` compare le libellé du dictionnaire Arcom au libellé attendu dans `config/medias.csv`. Si une future édition renumérote les codes, le pipeline échoue au lieu de produire des résultats faux.

**Les 7 questions traitées :** radios, journaux, magazines, chaînes TV, chaînes d'info, médias en ligne et créateurs, JT regardés.

**La base des répondants :** les 2 939 personnes intéressées par l'information générale. La question sur les médias en ligne n'a pas été posée à 143 d'entre elles (échantillon téléphonique, sans internet) : elles sont comptées comme ne suivant pas ces médias ([ADR-004](decisions/ADR-004-base-repondants.md)).

**La confiance.** Les 90 colonnes `SOURCES1TER_R2_n` sont rattachées aux médias grâce à la liste `C_SOURCES1TER_R2` du dictionnaire (`rattacher_confiance()`). 76 rattachements sont automatiques, 2 forcés (« Un autre journal » apparaît deux fois), 12 ignorés (médias ultramarins). Le résultat est relisible dans `data/output/correspondance_confiance.csv`.

### 3.3 `referentiel` : qui peut apparaître sur la carte

**Fichier :** [`pipeline/prepare/referentiel.py`](../pipeline/prepare/referentiel.py) · **Configuration :** [`config/medias.csv`](../config/medias.csv), [`config/params.yaml`](../config/params.yaml)

Pour chaque média, la fonction `enrichir()` ajoute :

| Colonne | Calcul | Règle |
|---|---|---|
| `n_repondants` | nombre de répondants (non pondéré) qui suivent le média | — |
| `part_ponderee` | part pondérée des 2 939 répondants qui le suivent | — |
| `affichable` | non générique **et** `n_repondants ≥ 50` | RG-01 |
| `fragile` | `n_repondants < 100` | RG-03 |

Extrait de `data/output/medias.parquet` :

| media_id | type | n_repondants | part_ponderee | affichable | fragile |
|---|---|---|---|---|---|
| tf1 | tv | 1 657 | 0,555 | ✓ | |
| bfmtv | info | 1 090 | 0,339 | ✓ | |
| france-inter | radio | 586 | 0,206 | ✓ | |
| hugodecrypte | createur | 534 | 0,195 | ✓ | |
| blast | web | 93 | 0,034 | ✓ | ✓ |
| jean-massiet | createur | < 50 | | | |
| c8 | tv | 0 | 0 | | |

### 3.4 `coaudience` : relier les médias qui partagent leur public

**Fichier :** [`pipeline/compute/coaudience.py`](../pipeline/compute/coaudience.py) · **Méthode :** [methode.md § 3](methode.md#3-les-liens--publics-partagés)

1. `matrice_lift()` calcule le lift de toutes les paires en un produit matriciel : `P = Xᵀ·diag(w)·X`, puis `lift = P / outer(diag(P), diag(P))`. `X` est la table répondant × média restreinte aux 68 médias affichables.
2. `calculer_paires()` refait ce calcul pour chacun des 1 000 tirages de [`compute/bootstrap.py`](../pipeline/compute/bootstrap.py) et garde les quantiles 2,5 % et 97,5 %. Durée : moins d'une seconde.
3. `filtrer()` applique RG-04 (30 répondants en commun) puis RG-05 (borne basse > 1) et compte les rejets par motif.

Toutes les paires, y compris celles qui ont de petits effectifs, restent dans `data/interim/paires.parquet` pour l'exploration. Seuls les liens retenus vont dans `data/output/`.

**Le constat du sprint.** 62 % des paires passent les règles. Les gros consommateurs d'information rapprochent tous les médias : le lift attendu de n'importe quelle paire, du seul fait de cette intensité, est de 1,57. Le rapport `make exploration` ([docs/exploration/seuils.md](exploration/seuils.md)) détaille l'effet, et l'[ADR-005](decisions/ADR-005-seuils-des-liens.md) propose trois options.

### 3.5 `attributs` : décrire le public de chaque média

**Fichier :** [`pipeline/compute/attributs.py`](../pipeline/compute/attributs.py) · **Décisions :** [ADR-006](decisions/ADR-006-indicateurs-des-publics.md)

Tous les indicateurs sont des moyennes pondérées sur une partie du public d'un média : `Σ w·valeur / Σ w`. La fonction `ratio_pondere()` calcule la valeur et son intervalle pour tous les médias à la fois. Le profil de chaque répondant (classe d'âge, note politique) est préparé par `prepare_arcom` (`profil_repondants()`), avec le même contrôle des libellés que les médias.

| media_id | pol_moy [intervalle] | moins35 | conf_ref | conf_ecart_gd |
|---|---|---|---|---|
| mediapart | 4,4 [4,0 ; 4,9] | 37 % | 48 % | +0,26 |
| france-inter | 4,7 [4,5 ; 5,0] | 25 % | 56 % | +0,26 |
| hugodecrypte | 5,3 [5,0 ; 5,6] | 74 % | 47 % | +0,16 |
| tf1 | 5,8 [5,7 ; 6,0] | 33 % | 45 % | −0,12 |
| cnews | 6,7 [6,5 ; 6,9] | 23 % | 47 % | −0,13 |

### 3.6 `familles` et `disposition` : la carte

**Fichiers :** [`pipeline/compute/familles.py`](../pipeline/compute/familles.py), [`pipeline/compute/disposition.py`](../pipeline/compute/disposition.py) · **Décisions :** [ADR-005](decisions/ADR-005-seuils-des-liens.md), [ADR-007](decisions/ADR-007-familles.md), [ADR-008](decisions/ADR-008-disposition.md)

1. `coaudience` marque les **liens affichés** (`affiche`) : les 5 plus forts de chaque média, plus ceux au-dessus du lift de référence. Cela fait 623 liens sur 1 413.
2. `familles` lance Leiden sur ces liens. Pour mesurer la stabilité, il refait le calcul sur 100 sous-échantillons et apparie les familles avec `apparier()` (algorithme hongrois). Le module applique ensuite RG-07 et calcule les médias « ponts ».
3. `disposition` place les médias avec `forceatlas2()`, une implémentation numpy de l'algorithme de Gephi, à graine fixe, puis ramène les coordonnées dans [0, 1].

`make exploration` produit en plus `familles.md` (36 configurations comparées), un aperçu `carte.svg` et un fichier `graphe_provisoire.gexf` pour Gephi.

### 3.7 `proprietes` et les exports

**Fichiers :** [`pipeline/prepare/proprietes.py`](../pipeline/prepare/proprietes.py), [`pipeline/export/`](../pipeline/export/) · **Décision :** [ADR-009](decisions/ADR-009-propriete-et-exports.md)

- `proprietes_ultimes()` remonte le graphe de détention de la base « Médias français » jusqu'à ses sommets, en multipliant les parts le long de la chaîne. Les cas particuliers passent par [`config/proprietes_corrections.csv`](../config/proprietes_corrections.csv) : JT rattachés à leur chaîne, nom différent dans la base, saisies sourcées, médias non identifiés.
- `export_site` assemble `graph.json`, puis le valide contre [`site/src/graph/schema.json`](../site/src/graph/schema.json), le contrat avec le site.
- `telechargements` écrit les données ouvertes et génère `dictionnaire.md` à partir des descriptions déclarées dans le code.
- `make neo4j` charge la base graphe d'analyse et vérifie les requêtes de [`docs/requetes.cypher`](requetes.cypher).
- `make reproductibilite` lance deux fois le pipeline et compare les empreintes de tous les fichiers produits.

### 3.8 Le module JT

**Fichiers :** [`pipeline/prepare/jt.py`](../pipeline/prepare/jt.py), [`pipeline/compute/jt.py`](../pipeline/compute/jt.py)

Le fichier de l'INA est lu et contrôlé (chaînes, rubriques, doublons), puis agrégé par chaîne, année et rubrique. Les similarités (1 − distance de Jensen-Shannon) et la synchronisation des agendas sont calculées pour 5 périodes. [`tests/data/test_donnees_jt.py`](../tests/data/test_donnees_jt.py) vérifie un **écart nul** avec les valeurs de la maquette du module JT ([`tests/fixtures/jt_reference.json`](../tests/fixtures/jt_reference.json)).

### 3.9 Le site : la carte

**Fichiers :** [`site/src/`](../site/src/)

| Module | Rôle |
|---|---|
| `graph/charger.ts`, `graph/types.ts` | Chargement de `/data/graph.json`, contrôle de cohérence ; types du format 1 |
| `etat/magasin.ts`, `etat/url.ts` | État en signaux Preact (sélection, filtres, survol) ; synchronisation avec l'URL `/media/<id>?type=…&famille=…` et l'historique |
| `composants/carte-donnees.ts`, `Carte.tsx` | Graphe graphology (positions du pipeline, taille selon le public, couleurs des familles ou gris, RG-07) ; Sigma.js, réducteurs pour la sélection et les filtres, zoom |
| `composants/EnTete.tsx`, `Bandeau.tsx`, `Legende.tsx`, `PiedDePage.tsx`, `Panneau.tsx` | Composants communs (maquettes) ; aperçu de la fiche (complète au sprint 6) |

**Piège Sigma 4 :** par défaut, les tailles sont dans les unités du graphe (`itemSizesReference: "positions"`). Avec des coordonnées dans [0, 1], les points couvraient toute la carte. Le réglage est remis à `"screen"`.

nginx sert `index.html` pour `/media/<id>` tant que les pages pré-générées n'existent pas (sprint 6) : un lien vers une fiche fonctionne déjà.

### 3.10 Le site : deux images

**Fichiers :** [`docker/site.Dockerfile`](../docker/site.Dockerfile), [`docker/nginx.conf`](../docker/nginx.conf), [`site/`](../site/)

| Cible | Rôle | Commande |
|---|---|---|
| `dev` | Vite avec rechargement à chaud ; Vitest, ESLint, Prettier | `make dev` → http://localhost:5173 |
| `build` | `tsc`, build Vite, pré-compression gzip | (intermédiaire) |
| `runtime` | nginx non root, ≈ 9 Mo, système de fichiers en lecture seule | `make site` → http://localhost:8080 |

Le site a ses **jetons de design** ([`site/src/styles/jetons.css`](../site/src/styles/jetons.css), relevés dans les maquettes) et ses polices IBM Plex, hébergées sur le site. Tous ses **textes** sont dans [`site/src/i18n/fr.ts`](../site/src/i18n/fr.ts), y compris les formulations imposées : `phrasePositionnement()` (RG-20), `phraseLien()` (RG-22) et `mentionSource()` (RG-24). `npm run vocabulaire` refuse les formules interdites, comme « média de droite » ; une citation entre « … » reste permise.

Les en-têtes de sécurité sont dans [`docker/nginx-entetes.conf`](../docker/nginx-entetes.conf), inclus dans **chaque** bloc `location`. nginx ignore les `add_header` du niveau supérieur dès qu'un bloc en déclare un. La CSP interdit toute source externe et tout script en ligne : la configuration Vite n'en produit pas (`assetsInlineLimit: 0`).

---

## 4. Visite du code

```
pipeline/
├── __main__.py        Ligne de commande : run (--from, --only, --force), check, export-neo4j
├── etapes.py          Registre ordonné des étapes + schémas à valider après chacune
├── etat.py            Empreintes des entrées, mémorisation, saut des étapes inchangées
├── chemins.py         Tous les chemins dérivent d'une racine (GM_RACINE ou dossier courant)
├── config.py          Lecture des YAML, sources ; Params : paramètres typés et validés
├── texte.py           normaliser() : minuscules, sans accents ni ponctuation
├── schemas.py         Schémas pandera des tables produites
├── ingest.py          Étape « ingest »
├── prepare/
│   ├── dictionnaire.py  Lecture des libellés du dictionnaire Arcom
│   ├── medias.py        Chargement et validation du référentiel des médias
│   ├── arcom.py         Étape « prepare_arcom »
│   └── referentiel.py   Étape « referentiel »
├── compute/
│   ├── bootstrap.py     Tirages multinomiaux à graine fixe, quantiles
│   ├── coaudience.py    Étape « coaudience »
│   └── attributs.py     Étape « attributs »
└── export/            (sprint 4 : graph.json, téléchargements, Neo4j)
```

**Le contrat d'une étape.** Chaque module d'étape expose trois fonctions :

```python
def executer(chemins: Chemins) -> None: ...      # fait le travail
def entrees(chemins: Chemins) -> list[Path]: ... # fichiers lus (config + données)
def sorties(chemins: Chemins) -> list[Path]: ... # fichiers écrits
```

`etapes.py` l'enregistre dans la liste `ETAPES`. L'empreinte d'une étape combine ses entrées **et le code source de son module** : modifier le code d'une étape suffit à la faire réexécuter.

**Ajouter une étape** (par exemple `familles` au sprint 3) :
1. créer `pipeline/compute/familles.py` avec `executer`, `entrees`, `sorties` ;
2. ajouter un schéma dans `schemas.py` ;
3. ajouter une ligne `Etape(...)` dans `ETAPES` ;
4. écrire les tests.

---

## 5. Vérifier que tout est juste

| Niveau | Où | Ce qui est vérifié |
|---|---|---|
| Tests unitaires (43) | `tests/unit/` | Sprint 1 + paramètres (clé absente, inconnue, mauvais type, hors plage), **lift sur une matrice jouet au résultat connu**, tirages reproductibles, RG-04/RG-05 et journal, lift de référence, attributs sur un jeu jouet calculé à la main, note politique, classes d'âge |
| Tests sur les données (15) | `tests/data/` | Sprint 1 + aucun lien hors RG-04/RG-05, liens entre médias affichables seulement, effectifs communs recomptés, **liens recalculés à l'identique**, **positionnement politique recalculé en SQL depuis le fichier brut**, aucune donnée sous les seuils dans `data/output/` |
| Tests du site (3) | `site/src/**/*.test.ts` | Normalisation pour la recherche (Vitest) ; `tsc`, ESLint, Prettier |
| Schémas | `pipeline/schemas.py` | Types, valeurs autorisées, unicité, plages ; appliqués après chaque étape et par `make check` |
| Lint | ruff | Style et erreurs courantes ; `ruff format` pour le formatage |
| CI | `.github/workflows/ci.yml` | Tout ce qui précède + tailles d'images (< 1 Go, < 50 Mo), démarrage et en-têtes du site (pas encore exécutée : dépôt GitHub à créer) |

Les tests sur les données sont ignorés tant que le pipeline n'a pas tourné (`pytest -m "not data"` pour les exclure).

---

## 6. Faire évoluer le projet

| Besoin | Où intervenir |
|---|---|
| Ajouter ou renommer un média | `config/medias.csv` (+ son code dans `variables_arcom.yaml`) |
| Changer un seuil | `config/params.yaml` ; mettre à jour la page Méthode |
| Nouvelle édition du baromètre | `config/sources.yaml` (adresse + empreinte), puis `variables_arcom.yaml` : le contrôle des libellés signale chaque code à revoir |
| Une source a changé (`ErreurEmpreinte`) | Vérifier le fichier, puis mettre à jour l'empreinte dans `sources.yaml` |
| Ajouter une dépendance Python | `pyproject.toml`, puis régénérer `uv.lock` dans un conteneur (voir README) |
| Forcer un recalcul complet | `make clean-interim && make pipeline`, ou `run --force` |
| Explorer l'effet d'un seuil | `make exploration`, puis lire `docs/exploration/seuils.md` |
| Ajouter une dépendance au site | `docker compose run --rm site-dev npm install <paquet>` (voir README) |

---

## 7. Erreurs fréquentes

| Message | Cause | Solution |
|---|---|---|
| `Entrée manquante : …/repondant_media.parquet` | Étape lancée sans ses prérequis (`--only`) | Lancer `make pipeline` |
| `ErreurEmpreinte … empreinte inattendue` | Le producteur a publié une nouvelle version | Voir section 6 |
| `ErreurCorrespondance … libellé … ≠ libellés de …` | Code renuméroté dans le dictionnaire | Corriger le code dans `variables_arcom.yaml` |
| `… répondants de la base sans réponse` | Une question n'a pas été posée à tout le monde | Comprendre pourquoi, puis `absence_vaut_non: true` si c'est justifié |
| `Permission denied` sur `data/` (Linux) | uid de l'hôte ≠ 1000 | `chmod -R a+rwX data site` |
| `params.yaml, section « … » : clés manquantes […]` | Paramètre absent, inconnu ou mal typé | Corriger `config/params.yaml` (le message dit quelle clé) |
| `repondant_profil n'est pas aligné sur repondant_media` | Étape `attributs` lancée sur des sorties de `prepare_arcom` d'époques différentes | `make pipeline` (ou `run --from prepare_arcom`) |
| `OSError: [Errno 35] Resource deadlock avoided` (macOS) | Projet dans un dossier synchronisé avec iCloud Drive (`Documents`, `Bureau`) : macOS a retiré les fichiers du disque (attribut `dataless`), et Docker ne sait pas les faire revenir. Plus fréquent quand le disque est presque plein | Immédiat : `find . -type f -flags +dataless -exec brctl download {} \;`. Durable : déplacer le projet hors d'iCloud (ex. `~/dev/graphe-medias`). `make` détecte ce cas avant de lancer Docker |

---

## 8. La suite

**Jalon J2** : la proposition est « go », sous condition du test H5 : faire nommer les 3 familles par 3 à 5 personnes extérieures ([J2-go-no-go.md](decisions/J2-go-no-go.md)).

**Sprint 6 (16-20 novembre)** : recherche (Fuse.js), fiche complète (profil du public, propriété, marges), vue tableau, pages pré-générées par média, tests de bout en bout (Playwright, axe-core). Détail dans le backlog d'implémentation (`~/dev/Implementation/backlog_implementation_graphe_medias.md`).
