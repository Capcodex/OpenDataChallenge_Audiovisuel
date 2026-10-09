# ADR-010 · Hébergement : Google Cloud Run

- **Statut :** acceptée (choix du porteur du projet, 8 octobre 2026) · mise en service en attente des accès ([deploiement.md](../deploiement.md))
- **Date :** 8 octobre 2026
- **Références :** T-056, décision D3 du CdC technique, CdC technique § 3.1, § 5.6, § 13 et § 14, ENF-01, ENF-11

## Contexte

Le site est une image nginx statique de 9 Mo (ADR-001), à servir en HTTPS pour un coût nul ou très faible, avec un déploiement d'aperçu par pull request. Le CdC technique proposait Scaleway Serverless Containers ou Google Cloud Run.

Scaleway a d'abord été retenu. Le porteur du projet a ensuite choisi **Google Cloud Run**, le même jour, avant toute mise en service. Le workflow Scaleway n'a jamais tourné et a été remplacé.

## Décision

**Google Cloud Run, région Paris (`europe-west9`)**, images dans **Artifact Registry**, même région.

| Critère | Cloud Run |
|---|---|
| Hébergement | Données servies depuis Paris |
| Coût | Facturation à l'usage, mise en veille sans trafic, offre gratuite mensuelle |
| Image | Conteneur standard, port 8080 : l'image `site` est déployée telle quelle |
| TLS | Géré par la plateforme (ENF-11) |
| Aperçus | **Étiquettes de révision** : une URL par pull request sur un seul service, sans trafic de production |
| Accès depuis GitHub | **Workload Identity Federation** : jeton temporaire, aucune clé stockée, limité à ce dépôt |

**Aperçus :** le service `graphe-medias-apercu` reçoit une révision étiquetée `pr-<numéro>` par pull request (`--no-traffic --tag`). L'étiquette est retirée à la fermeture. Les options de `gcloud run` (SDK 588) ont été vérifiées dans l'aide intégrée. Le workflow n'a pas encore tourné contre un vrai projet.

**Infrastructure en Terraform** ([`infra/`](../../infra/)) : API, Artifact Registry avec règle de nettoyage, service d'aperçu public, comptes de service et Workload Identity Federation. Le principe du moindre privilège s'applique :
- GitHub Actions n'a que `run.developer` et l'écriture dans le seul dépôt d'images ;
- le service, son accès public et l'identité du site sont créés une fois par Terraform ;
- le site tourne sous un compte de service sans droits, et non sous le compte par défaut de Compute Engine.

## Conséquences

- **Accès à créer** par le porteur du projet : un projet Google Cloud avec facturation, `terraform apply` depuis la Cloud Shell, puis trois variables GitHub ([deploiement.md](../deploiement.md)). Tant que ces variables manquent, le workflow s'arrête sans erreur.
- **État Terraform local** à la Cloud Shell, non versionné. Si plusieurs personnes administrent l'infrastructure, il faudra le passer dans un bucket Cloud Storage (backend `gcs`).
- **Facturation** : un compte de facturation est obligatoire, même dans les limites de l'offre gratuite.
- **Démarrage à froid** : 0 instance au repos pour les aperçus. Pour la production, mesurer l'effet sur ENF-01 au sprint 8, et prévoir au besoin `--min-instances=1`.
- **Système de fichiers en lecture seule** : Cloud Run ne monte pas le conteneur en lecture seule comme `read_only` dans Compose. nginx n'écrit que dans `/tmp`, et l'image reste non root.
- **Accès public** : `--allow-unauthenticated` peut être bloqué par une politique d'organisation. Dans ce cas, une exception est nécessaire.
- Les images de production iront aussi sur ghcr.io au sprint 8 (CdC § 5.2).
