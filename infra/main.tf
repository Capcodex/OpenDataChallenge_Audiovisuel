# Infrastructure Google Cloud du site (ADR-010, docs/deploiement.md).
#
# Crée : les API nécessaires, le registre d'images, le service Cloud Run d'aperçu (public), un
# compte de service d'exécution sans droits, un compte de service pour GitHub Actions et la
# fédération d'identité (Workload Identity Federation) limitée au dépôt GitHub du projet.
#
# Le contenu du service (image, révisions, étiquettes pr-<n>) est déployé par
# .github/workflows/preview.yml : Terraform crée le service une fois, puis ignore ces changements.

data "google_project" "projet" {}

locals {
  apis = [
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "sts.googleapis.com",
  ]
  # Image de démonstration de Google, servie jusqu'au premier déploiement par le workflow.
  image_initiale = "us-docker.pkg.dev/cloudrun/container/hello"
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# --- Registre d'images ------------------------------------------------------------------------

resource "google_artifact_registry_repository" "images" {
  repository_id = "graphe-medias"
  location      = var.region
  format        = "DOCKER"
  description   = "Images du site Graphe des médias"

  # Nettoyage : versions de plus de 30 jours supprimées, sauf les plus récentes.
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "garder-les-plus-recentes"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.images_conservees
    }
  }
  cleanup_policies {
    id     = "supprimer-les-anciennes"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 jours
    }
  }

  depends_on = [google_project_service.apis]
}

# --- Comptes de service -----------------------------------------------------------------------

# Identité du site en exécution : aucun droit (nginx sert des fichiers statiques).
resource "google_service_account" "site" {
  account_id   = "graphe-medias-site"
  display_name = "Site Graphe des médias (exécution Cloud Run)"
  depends_on   = [google_project_service.apis]
}

# Identité de GitHub Actions : publier des images et déployer des révisions, rien d'autre.
resource "google_service_account" "github" {
  account_id   = "github-actions"
  display_name = "GitHub Actions (graphe-medias)"
  depends_on   = [google_project_service.apis]
}

resource "google_artifact_registry_repository_iam_member" "github_ecriture" {
  repository = google_artifact_registry_repository.images.name
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github.email}"
}

resource "google_project_iam_member" "github_deploiement" {
  project = var.projet
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github.email}"
}

# Déployer une révision qui s'exécute sous l'identité du site.
resource "google_service_account_iam_member" "github_agit_comme_site" {
  service_account_id = google_service_account.site.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github.email}"
}

# --- Workload Identity Federation : GitHub Actions, ce dépôt seulement ---------------------------

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "depot" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "depot"
  display_name                       = "Dépôt graphe-medias"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == '${var.depot_github}'"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_federation" {
  service_account_id = google_service_account.github.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.depot_github}"
}

# --- Service Cloud Run d'aperçu ---------------------------------------------------------------

resource "google_cloud_run_v2_service" "apercu" {
  name                = "graphe-medias-apercu"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.site.email
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
    containers {
      image = local.image_initiale
      ports {
        container_port = 8080
      }
      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle = true
      }
    }
  }

  # Les révisions et les étiquettes pr-<n> sont gérées par le workflow d'aperçu.
  lifecycle {
    ignore_changes = [template, traffic, client, client_version, scaling]
  }

  depends_on = [google_project_service.apis]
}

# Site public (contenu statique, aucune donnée individuelle : ENF-09).
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.apercu.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
