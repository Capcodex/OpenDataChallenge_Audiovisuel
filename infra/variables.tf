variable "projet" {
  description = "Identifiant du projet Google Cloud (PROJECT_ID), facturation activée."
  type        = string
}

variable "region" {
  description = "Région de Cloud Run et d'Artifact Registry (europe-west9 = Paris, ADR-010)."
  type        = string
  default     = "europe-west9"
}

variable "depot_github" {
  description = "Seul dépôt GitHub autorisé à déployer (propriétaire/nom)."
  type        = string
  default     = "Capcodex/OpenDataChallenge_Audiovisuel"
}

variable "images_conservees" {
  description = "Nombre de versions d'image gardées dans Artifact Registry (les plus récentes)."
  type        = number
  default     = 10
}

variable "instances_production_max" {
  description = "Nombre maximal d'instances du service de production (site statique : 3 suffisent)."
  type        = number
  default     = 3
}
