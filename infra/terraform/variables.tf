variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP region (e.g. asia-south1)"
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Deployment environment tier (development | staging | production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-2-7680"
}

variable "max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 10
}

variable "backend_image" {
  description = "Fully qualified Artifact Registry Docker image URI for backend"
  type        = string
}
