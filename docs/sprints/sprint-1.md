# Bilan du sprint 1 · socle technique et données Arcom

**Période prévue :** 12-16 octobre 2026 · **Réalisé :** 8 octobre 2026 (en avance)

## Résultat

Le pipeline tourne entièrement dans Docker : `make pipeline` télécharge les 12 sources, vérifie leurs empreintes et produit la table répondant × média et le référentiel enrichi en ≈ 12 s. Une deuxième exécution saute les étapes inchangées.

| Indicateur | Valeur |
|---|---|
| Répondants du baromètre | 3 377 |
| Interrogés sur les médias (base de calcul) | 2 939 |
| Médias au référentiel | 99 (dont 19 catégories génériques) |
| **Médias affichables** (≥ 50 répondants, RG-01) | **68**, dont 10 fragiles (< 100, RG-03) |
| Médias cités par personne en 2026 | 11 : C8, Canal+, 9 radios musicales (Chérie FM, NRJ, Skyrock…) |
| Sous le seuil d'affichage | Jean Massiet (< 50) |
| Réponses de confiance | 26 997, sur 78 médias |
| Tests | 24 (17 unitaires, 7 sur les données réelles), tous verts |
| Image du pipeline | ≈ 800 Mo (budget 1 Go) |

## Tâches

| ID | Tâche | Statut | Remarque |
|---|---|---|---|
| T-001 | Dépôt, arborescence, licences | ✅ | Dépôt local initialisé, **pas encore poussé sur GitHub** |
| T-002 | `pyproject.toml` + `uv.lock` | ✅ | 42 paquets verrouillés |
| T-003 | Dockerfile du pipeline | ✅ | Images figées par empreinte, non root, cache uv hors image |
| T-004 | Compose, `.dockerignore`, `.env.example`, Makefile | ✅ | |
| T-005 | CI `ci.yml` | ✅ écrit | **Non exécuté** : nécessite un dépôt GitHub |
| T-006 | ADR-001, ADR-002 | ✅ | |
| T-007 | CLI (`run`, `--from`, `--only`, `--force`, `check`) | ✅ | Saut des étapes inchangées par empreinte |
| T-008 | Ingest + `sources.yaml` + manifeste | ✅ | 12 sources (Arcom, INA, INA/CSA, Médias français) |
| T-009 | `variables_arcom.yaml` | ✅ | 7 questions, 99 codes ; libellés vérifiés automatiquement |
| T-010 | Table répondant × média | ✅ | |
| T-011 | Tests effectifs, poids, schémas | ✅ | Recomptage indépendant des effectifs |
| T-012 | Référentiel `medias.csv` | ✅ | 99 médias, variantes, public/privé |
| T-013 | Statut affichable (RG-01) | ✅ | |
| T-014 | Correspondance des 90 colonnes de confiance | ✅ | **Bien en dessous de la limite de 6 h** : la correspondance figure dans le dictionnaire (liste `C_SOURCES1TER_R2`) |
| T-015 | Base de propriété + ADR-003 | ✅ | ODC-By, figée au commit du 17/12/2024 |

## Décisions prises

- [ADR-003](../decisions/ADR-003-source-proprietes.md) : base « Médias français » + fichier de corrections au sprint 4 (presse indépendante non couverte, changements 2025 absents).
- [ADR-004](../decisions/ADR-004-base-repondants.md) : base de 2 939 répondants ; les 143 répondants téléphoniques non interrogés sur les réseaux sociaux sont comptés comme ne suivant pas ces médias.

**Renumérotation :** l'ADR sur les seuils prévue au sprint 2 devient l'ADR-005 (et les suivantes sont décalées d'un numéro).

## Constats utiles pour la suite

- **Confiance :** la question donne 3 niveaux (« source de référence », « complémentaire », « à prendre avec précaution »), pas une note. Au sprint 2, l'indicateur de confiance sera la part pondérée de « source de référence », à confirmer.
- **Magazines :** le baromètre a aussi une question sur les magazines (Télérama, Le Point, Valeurs actuelles…). Elle est intégrée : 15 médias de plus que prévu dans la maquette.
- **Médias ultramarins :** 12 colonnes de confiance les concernent ; elles sont hors périmètre de la V1.

## Restant à faire hors code

- [ ] Créer le dépôt GitHub, pousser `main` et vérifier que la CI passe (T-001, T-005).
- [ ] Recherche utilisateur R-01 : recruter et interroger 5 journalistes ou fact-checkeurs.
