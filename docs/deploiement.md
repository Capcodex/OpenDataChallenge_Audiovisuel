# Déploiement sur Google Cloud Run

Mise en place des aperçus par pull request (T-056), puis de la production (sprint 8), sur **Google Cloud Run**, région **Paris (`europe-west9`)** ([ADR-010](decisions/ADR-010-hebergement-cloud-run.md)).

L'infrastructure est décrite en **Terraform** dans [`infra/`](../infra/). Le workflow [`.github/workflows/preview.yml`](../.github/workflows/preview.yml) déploie ensuite le site. Il reste inactif, sans erreur, tant que les variables GitHub ne sont pas définies.

## Ce que crée Terraform

| Ressource | Rôle |
|---|---|
| 5 API (Cloud Run, Artifact Registry, IAM, IAM Credentials, STS) | Activées sur le projet |
| Dépôt Artifact Registry `graphe-medias` (`europe-west9`) | Images du site ; nettoyage automatique : versions de plus de 30 jours supprimées, sauf les 10 plus récentes |
| Service Cloud Run `graphe-medias-apercu` | Accueille les révisions d'aperçu ; **public** ; 0 à 1 instance ; image de démonstration de Google jusqu'au premier déploiement |
| Compte de service `graphe-medias-site` | Identité du site en exécution, **sans aucun droit** |
| Compte de service `github-actions` | `run.developer` sur le projet, écriture dans le seul dépôt `graphe-medias`, droit d'agir comme `graphe-medias-site` |
| Workload Identity Federation (pool `github`, fournisseur `depot`) | GitHub Actions obtient un jeton temporaire, **pour ce dépôt seulement** ; aucune clé stockée |

Le contenu du service (image, révisions, étiquettes `pr-<n>`) est géré par le workflow. Terraform crée le service, puis ignore ces changements (`ignore_changes`).

## 1. Projet et facturation (une fois)

Un projet dont la facturation est activée est obligatoire, même pour rester dans l'offre gratuite de Cloud Run. Dans la [Cloud Shell](https://shell.cloud.google.com/) :

```bash
gcloud projects list                       # colonne PROJECT_ID
gcloud billing projects describe <PROJECT_ID>   # billingEnabled: true ?
# Sinon :
gcloud billing accounts list
gcloud billing projects link <PROJECT_ID> --billing-account=XXXXXX-XXXXXX-XXXXXX
```

## 2. Créer l'infrastructure (Cloud Shell)

La Cloud Shell a Terraform et tes identifiants : rien à installer. L'état de Terraform (`terraform.tfstate`) reste dans ton dossier personnel de la Cloud Shell, qui est conservé ; il n'est jamais versionné.

```bash
git clone https://github.com/Capcodex/OpenDataChallenge_Audiovisuel.git graphe-medias
cd graphe-medias/infra
echo 'projet = "<PROJECT_ID>"' > terraform.tfvars

terraform init       # télécharge le fournisseur Google
terraform validate   # vérifie la configuration
terraform plan       # liste ce qui sera créé (16 ressources), sans rien créer
terraform apply      # crée, après confirmation (« yes »)
```

À la fin, Terraform affiche les valeurs à reporter dans GitHub (`terraform output` pour les revoir).

**Si une partie du script `gcloud` a déjà été lancée**, Terraform signalera « already exists ». Il faut alors importer la ressource existante au lieu de la recréer. C'est obligatoire pour le pool Workload Identity Federation : un pool supprimé reste réservé 30 jours. Par exemple :

```bash
P=<PROJECT_ID>
terraform import google_service_account.github "projects/$P/serviceAccounts/github-actions@$P.iam.gserviceaccount.com"
terraform import google_artifact_registry_repository.images "projects/$P/locations/europe-west9/repositories/graphe-medias"
terraform import google_iam_workload_identity_pool.github "projects/$P/locations/global/workloadIdentityPools/github"
terraform import google_iam_workload_identity_pool_provider.depot "projects/$P/locations/global/workloadIdentityPools/github/providers/depot"
```

puis relancer `terraform plan` et `terraform apply`.

## 3. Variables GitHub (une fois)

*Settings › Secrets and variables › Actions › **Variables*** du dépôt. Ce ne sont pas des secrets : la sécurité repose sur la condition de dépôt de Workload Identity Federation.

| Variable | Sortie Terraform |
|---|---|
| `GCP_PROJECT_ID` | `GCP_PROJECT_ID` |
| `GCP_WIF_PROVIDER` | `GCP_WIF_PROVIDER` (`projects/<numéro>/locations/global/workloadIdentityPools/github/providers/depot`) |
| `GCP_SERVICE_ACCOUNT` | `GCP_SERVICE_ACCOUNT` (`github-actions@<projet>.iam.gserviceaccount.com`) |

## 4. Ce qui se passe à chaque pull request

Pour une pull request ouverte depuis ce dépôt (pas depuis un fork) :

1. l'image `site` est construite pour `linux/amd64` et publiée dans Artifact Registry sous `site:pr-<numéro>-<commit>` ;
2. elle est déployée comme **révision du service `graphe-medias-apercu`, étiquetée `pr-<numéro>`, sans trafic**, sous l'identité `graphe-medias-site`. Elle a sa propre URL : `https://pr-<numéro>---graphe-medias-apercu-….run.app` ;
3. le workflow vérifie la réponse, la CSP, le lien direct `/media/le-monde` et le temps de chargement de `graph.json` (< 3 s, ENF-01) ;
4. l'URL est publiée en commentaire de la pull request, et mise à jour à chaque commit.

À la fermeture de la pull request, l'étiquette est retirée et l'URL ne répond plus.

## 5. Modifier ou supprimer

- Changer un réglage (région, rétention des images…) : modifier `infra/`, puis `terraform plan` et `terraform apply`.
- Tout supprimer : `terraform destroy`. Les API restent activées (`disable_on_destroy = false`), et le pool Workload Identity Federation reste réservé 30 jours.

## 6. Production (sprint 8)

Un service distinct, `graphe-medias`, à ajouter dans `infra/`. Il sera déployé à partir de `main` ou d'une étiquette de version (`deploy.yml`), avec un nom de domaine personnalisé. Prévoir `min_instance_count = 1` si le démarrage à froid dégrade ENF-01.
