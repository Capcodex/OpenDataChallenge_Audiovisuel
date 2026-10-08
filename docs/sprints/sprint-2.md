# Bilan du sprint 2 · co-audience, attributs, image du site

**Période prévue :** 19-23 octobre 2026 · **Réalisé :** 8 octobre 2026 (en avance, à la suite du sprint 1)

## Résultat

Le pipeline compte deux étapes de plus, `coaudience` et `attributs`. Elles calculent en environ 1 seconde les liens entre médias et le profil de leurs publics, avec 1 000 tirages bootstrap. Deux exécutions donnent des sorties identiques à l'octet près. Le site a ses deux images Docker : développement (Vite) et production (nginx, 9 Mo, lecture seule, en-têtes de sécurité).

| Indicateur | Valeur |
|---|---|
| Paires de médias affichables testées | 2 278 (68 médias) |
| **Liens retenus (RG-04 + RG-05)** | **1 413 (62 %)** ; rejets : 580 effectif commun < 30, 285 borne basse ≤ 1 |
| Lift médian des paires | 1,80 ; **lift de référence dû à l'intensité de consommation : 1,57** |
| Durée du rééchantillonnage (1 000 tirages) | 0,8 s (critère : < 1 min) |
| Positionnement politique moyen des publics | de 4,4 (Mediapart) à 7,0 (Valeurs actuelles) ; intervalle médian ± 0,34 point |
| Confiance publiée | 59 médias (tous sauf les 9 JT) ; écart gauche/droite : 46 médias |
| Tests | 58 pytest (43 unitaires, 15 sur les données) + 3 Vitest, tous verts |
| Image `pipeline` / `site` | 794 Mo (budget 1 Go) / **9 Mo** (budget 50 Mo) |
| Service `site` | « healthy » en 1 s (critère : < 10 s) |

## Tâches

| ID | Tâche | Statut | Remarque |
|---|---|---|---|
| T-016 | `params.yaml` + chargeur typé et validé | ✅ | Clé absente, inconnue, mal typée ou hors plage = échec ; sections S3 incluses |
| T-017 | Lift vectorisé, effectifs communs | ✅ | `compute/coaudience.py` |
| T-018 | Rééchantillonnage pondéré, quantiles | ✅ | `compute/bootstrap.py`, partagé avec les attributs |
| T-019 | Filtrage RG-04 / RG-05, journal des rejets | ✅ | `liens.parquet` + `journal_coaudience.json` ; toutes les paires dans `interim/paires.parquet` |
| T-020 | Tests du lift, de la reproductibilité, des règles | ✅ | Matrice jouet calculée à la main ; recalcul complet comparé à la sortie |
| T-021 | Positionnement politique, marge, non-réponses | ✅ | Recalculé indépendamment en SQL dans les tests |
| T-022 | Âge, moins de 35 ans, fragile | ✅ | **Âge connu par classes seulement** : âge moyen approché (ADR-006) |
| T-023 | Confiance et écart gauche/droite (Should) | ✅ | Part de « source de référence » ; à confirmer (ADR-006) |
| T-024 | Schémas pandera `liens`, `attributs_medias` | ✅ | Plages et contrôles entre colonnes |
| T-025 | Exploration des seuils | ✅ | **Script + rapport Markdown** au lieu d'un notebook (voir écarts) |
| T-026 | Revue des seuils, recalibrage | 🟡 | ADR-005 rédigée ; **RG-05 à trancher** par le porteur du projet |
| T-027 | `site.Dockerfile` multi-étapes, `nginx.conf` | ✅ | CSP, cache, `gzip_static`, `/media/<id>/`, 404, IP anonymisées |
| T-028 | Services `site-dev` et `site`, healthcheck, lecture seule | ✅ | + `cap_drop: ALL`, `no-new-privileges`, ports sur 127.0.0.1 |
| T-029 | Échafaudage Vite + TS + Preact + Sigma + graphology, ESLint, Prettier, Vitest | ✅ | Build, lint et tests dans le conteneur |

## Décisions prises

- [ADR-005](../decisions/ADR-005-seuils-des-liens.md) : RG-01 (50) et RG-04 (30) maintenus, chiffres à l'appui. **RG-05 : trois options proposées**, recommandation C (règle inchangée pour les données, carte limitée aux liens les plus forts de chaque média).
- [ADR-006](../decisions/ADR-006-indicateurs-des-publics.md) : âge approché par classes (65 ans et plus = 74 ans), note politique (« ST Centre » = 5), confiance = part de « source de référence » publiée à partir de 50 réponses.

**Renumérotation :** les ADR prévues au sprint 3 deviennent ADR-007 (Leiden), ADR-008 (disposition), et la plateforme d'hébergement ADR-009.

## Écarts au backlog

| Écart | Raison |
|---|---|
| T-025 : script `docs/exploration/seuils.py` qui produit `seuils.md`, pas de notebook | Jupyter et matplotlib ajouteraient environ 150 Mo à une image déjà à 794 Mo pour un budget de 1 Go. Le rapport est régénérable (`make exploration`) et versionnable |
| Noms de colonnes en français (`liens`, `lift_bas`, `attributs_medias`…) au lieu de l'anglais du CdCT § 8.1 | Convention du dépôt depuis le sprint 1 ; correspondance dans le DAT § 7.3 |
| Job `site` ajouté à la CI dès S2 (tests, lint, build, taille, en-têtes) | Peu coûteux. hadolint et Trivy restent dans T-040 (S3) |
| Node 24 LTS, Preact 11, Sigma 4, Vite 8, TypeScript 6 | Dernières versions stables (CdCT § 3.2) |

## Corrections du sprint 1

- `ci.yml` était un **YAML invalide** : un nom d'étape non entre guillemets contenait « : ». La CI aurait échoué dès son premier lancement. Corrigé, et le fichier est désormais validé.
- `make format` n'écrivait rien : le montage en lecture seule de `compose.yaml` l'emportait sur le `-v` du Makefile. La cible lance maintenant l'image directement.
- `.dockerignore` excluait `site/public/data/`. Or `graph.json` est un agrégat qui doit entrer dans l'image `site` (CdCT § 12.3).

## Constats utiles pour la suite

- **Densité du graphe.** C'est le point clé pour le sprint 3. Les familles (T-030) et la disposition (T-033) dépendent du choix de RG-05. Avec l'option C : 623 liens affichés, aucun média isolé, degré médian 18.
- **Médias de masse.** Le lift de TF1 ne peut pas dépasser 1,8, celui de France 2 2,3. Toute règle fondée sur un seuil de lift les défavorise.
- **Confiance des JT.** Le baromètre ne la mesure pas : la fiche d'un JT devra le dire.
- **Sigma 4 / Preact 11.** Ce sont des versions majeures récentes. Le squelette se construit, mais l'API de Sigma 4 est à vérifier avant le sprint 5.

## Recalibrage de la capacité (T-026)

Les sprints 1 et 2 (65 h prévues) ont été réalisés le 8 octobre, avant le début prévu du sprint 1. Cette vitesse ne se transpose pas aux sprints suivants. Ceux-ci comportent davantage de décisions et de recherche utilisateur (R-01) et des tâches d'interface plus longues à valider. **Pas de réarbitrage du backlog** : les Should sont conservés, et l'avance sert de marge pour la décision sur RG-05 et pour le jalon J2.

## Restant à faire hors code

- [ ] **Trancher RG-05** (ADR-005, options A, B, C) avant T-030.
- [ ] Confirmer la définition de l'indicateur de confiance (ADR-006).
- [ ] Créer le dépôt GitHub, pousser `main` et vérifier que la CI passe (T-001, T-005, reportés du sprint 1).
- [ ] Recherche utilisateur R-01 : 5 journalistes ou fact-checkeurs.
