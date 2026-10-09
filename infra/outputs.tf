# Valeurs à reporter dans GitHub : Settings › Secrets and variables › Actions › Variables.

output "GCP_PROJECT_ID" {
  value = var.projet
}

output "GCP_WIF_PROVIDER" {
  value = google_iam_workload_identity_pool_provider.depot.name
}

output "GCP_SERVICE_ACCOUNT" {
  value = google_service_account.github.email
}

output "url_service_apercu" {
  description = "URL du service d'aperçu (chaque pull request a en plus sa propre URL étiquetée)."
  value       = google_cloud_run_v2_service.apercu.uri
}

output "numero_projet" {
  value = data.google_project.projet.number
}

output "url_production" {
  description = "Adresse publique du site (config/params.yaml : publication.adresse_site)."
  value       = "https://${google_cloud_run_v2_service.production.name}-${data.google_project.projet.number}.${var.region}.run.app"
}
