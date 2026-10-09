# Bilan du sprint 8 · Recette et mise en production

**Période prévue :** 30 novembre-4 décembre 2026 · **Réalisé :** 9 octobre 2026 (branche `sprint-8`, partie de `main`) · **🚀 J5 : mise en ligne par l'étiquette `v1.0.0`**

## Résultat

La V1 est recettée et prête à partir en production. Le procès-verbal ([docs/recette.md](../recette.md)) couvre les données, le fonctionnel et la conformité. Aucune anomalie bloquante ou majeure n'est ouverte. Le service de production est décrit dans Terraform. Une étiquette de version publie les images multi-architecture sur ghcr.io, déploie le site, le vérifie en ligne et revient en arrière automatiquement si une vérification échoue.

| Indicateur | Valeur |
|---|---|
| Tests | 124 pytest (+6), 78 Vitest, 28 Playwright (+1), tous verts |
| Reproductibilité | 2 exécutions forcées : 29 fichiers identiques octet pour octet |
| Lighthouse (bureau, médiane de 3) | Performance 97 à 100, accessibilité 100, sur 6 écrans ; LCP 0,5 à 0,6 s |
| axe-core (WCAG 2.1 AA) | 0 violation grave ou critique sur 10 écrans |
| Adresse de production | https://graphe-medias-718967467429.europe-west9.run.app |

## Tâches

| ID | Tâche | Statut | Remarque |
|---|---|---|---|
| T-081 | Recette des données | ✅ | 5 critères sur 5 ; pondération vérifiée à 0 près ; test ajouté : chaque chiffre de la méthode = journal du calcul |
| T-082 | Recette fonctionnelle | 🟡 | 4 scénarios automatisés verts ; **tests avec 5 utilisateurs à mener** (protocole et grille dans `docs/recette.md`) |
| T-083 | Recette de conformité | ✅ | Vocabulaire, sources sur chaque écran (test ajouté), axe-core, **Lighthouse ajouté à la CI** et à `make test-e2e` |
| T-084 | Corrections des anomalies bloquantes et majeures | ✅ | 3 majeures corrigées (HSTS, adresse du site, budget Lighthouse en CI) ; 7 mineures reportées en V2 |
| T-085 | Publication du dépôt | ✅ | README (démarrage sur un poste neuf, production), `CONTRIBUTING.md`, licences inchangées |
| T-086 | Méthode avec les résultats réels | ✅ | Chiffres déjà réels depuis le sprint 7 ; désormais garantis par `tests/data/test_methode_publiee.py` |
| T-087 | `deploy.yml` : images multi-architecture, production | ✅ | Étiquette `v*.*.*` sur `main` → ghcr.io (`amd64`, `arm64`) → copie dans Artifact Registry → déploiement → vérification → retour arrière automatique |
| T-088 | Vérifications en production | ✅ | `v1.0.0` en ligne, 23 vérifications vertes ; restent Observatory, aperçu de lien, paquets ghcr.io |

## Décisions prises

- **Pas de nom de domaine pour la V1** (choix du porteur du projet) : l'adresse est celle du service Cloud Run de production, prévisible avant sa création (`<service>-<numéro du projet>.<région>.run.app`). Un domaine dans la région de Paris demanderait un équilibreur de charge (≈ 18 €/mois) ou Firebase Hosting.
- **Même image en production que sur ghcr.io** : Cloud Run ne lit pas ghcr.io ; l'image publiée est copiée telle quelle (même empreinte, vérifiée) dans Artifact Registry.
- **Retour arrière automatique** : la révision en service est notée avant le déploiement ; si `verifier-production.sh` échoue, le trafic y revient.
- **Lighthouse : médiane de 3 mesures**, comme Lighthouse CI : la première mesure, navigateur froid, donnait 72 sur la page d'accueil contre 100 ensuite.
- **Lighthouse dans la CI : 75 pour les pages avec carte** (choix du porteur du projet). Les machines de la CI n'ont pas de carte graphique ; WebGL y est émulé et les pages avec carte obtenaient 79 à 99 selon les passages, contre 100 sur un poste réel. Le critère « ≥ 90 » est vérifié sur un poste réel avant chaque version.
- **Pipeline hors Docker pour la recette** : Docker étant indisponible, l'environnement exact du projet a été recréé depuis `uv.lock` (Python 3.12, dans un dossier temporaire, sans rien installer sur le poste). Les fichiers publiés ont été régénérés par le pipeline, pas modifiés à la main.

## Problèmes rencontrés et corrigés

| Problème | Correction |
|---|---|
| Adresse `graphe-medias.fr` (non détenue) dans les liens, la mention de source et les images | `config/params.yaml` ; pipeline relancé (export, téléchargements, journal) ; seule l'adresse change, vérifié fichier par fichier |
| Parquet légèrement différents (10⁻¹⁴) quand le pipeline tourne sur macOS ARM | Différence de plateforme ; versions Docker gardées dans le dépôt, la référence reste l'image Docker |
| HSTS absent des en-têtes | Ajouté à `docker/nginx-entetes.conf` |
| Tests du site qui écrivaient l'adresse en dur | Adresse lue dans `graph.json` |
| `docs/methode.md` absent du conteneur `pipeline` (nouveau test) | Montage en lecture seule dans `compose.yaml` |
| Premier déploiement : l'étape de calcul de l'adresse appelait l'API Cloud Resource Manager, non activée ; retour arrière automatique vers la page de démonstration | Adresse lue dans `config/params.yaml` ; révision `v1.0.0` vérifiée puis mise en service à la main ; site en ligne |
| CI : performance Lighthouse 84 et 79 sur la fiche et les propriétaires (WebGL émulé) | Survol des liens activé à la première approche de la souris (il doublait chaque rendu), centrage initial sans animation : blocage réduit d'un quart ; seuil de 75 pour les pages avec carte dans la CI |

## Écarts au backlog

| Écart | Raison |
|---|---|
| Tests avec 5 utilisateurs non menés | Demandent de vrais testeurs ; protocole prêt |
| « Un poste neuf lance le projet avec Docker seul » non rejoué | Docker indisponible sur le poste ; la CI construit toutes les images depuis zéro à chaque pull request |
| Firefox et Safari non testés (ENF-04) | Playwright limité à Chromium ; à vérifier pendant les tests utilisateurs |
| Mise en production non déclenchée | Demande `terraform apply` (service de production) et l'étiquette `v1.0.0`, à lancer par le porteur du projet |

## Restant à faire hors code

- [x] `terraform apply` dans `infra/` : service de production (2 créations).
- [x] Fusionner la pull request du sprint 8, puis poser l'étiquette `v1.0.0` sur `main`.
- [ ] Fusionner le correctif du workflow et poser `v1.0.1` (valide le déploiement automatique de bout en bout).
- [ ] Cocher la liste de contrôle de mise en production (`docs/recette.md`, § 5).
- [ ] Mener les tests avec 5 utilisateurs, dont Firefox et Safari.
- [ ] Toujours en attente : test H5 (noms des familles), saisies sourcées de propriété, GEXF dans Gephi, recherche utilisateur R-01.
