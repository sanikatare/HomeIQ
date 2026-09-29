# =============================================================================
# HomeIQ — Google Cloud Production Infrastructure as Code (Terraform)
# Provisions: Artifact Registry, Cloud SQL (PostgreSQL 16 + pgvector),
# Memorystore Redis, GCS Bucket, Secret Manager, IAM Service Accounts & Cloud Run v2
# =============================================================================

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Artifact Registry for Backend, Worker & Frontend Images
resource "google_artifact_registry_repository" "homeiq_repo" {
  location      = var.region
  repository_id = "homeiq-${var.environment}"
  description   = "HomeIQ Docker container registry (${var.environment})"
  format        = "DOCKER"
}

# 2. Google Cloud Storage Bucket for Household Documents (Encrypted, Private)
resource "google_storage_bucket" "household_documents" {
  name                        = "${var.project_id}-homeiq-docs-${var.environment}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }
}

# 3. Cloud SQL for PostgreSQL 16 (with pgvector flag enabled)
resource "google_sql_database_instance" "postgres" {
  name                = "homeiq-pg16-${var.environment}"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = var.environment == "production"

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_size         = 20
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "production"
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
}

resource "google_sql_database" "homeiq_core" {
  name     = "homeiq_core"
  instance = google_sql_database_instance.postgres.name
}

# 4. Cloud Memorystore for Redis 7
resource "google_redis_instance" "cache" {
  name           = "homeiq-redis-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = 1
  region         = var.region
  redis_version  = "REDIS_7_0"
}

# 5. Secret Manager Containers (Values populated out-of-band, never in Git)
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "homeiq-gemini-api-key-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_secret_key" {
  secret_id = "homeiq-jwt-secret-${var.environment}"
  replication {
    auto {}
  }
}

# 6. Least-Privilege IAM Service Account for Backend & Worker
resource "google_service_account" "backend_sa" {
  account_id   = "sa-homeiq-backend-${var.environment}"
  display_name = "HomeIQ Backend & Worker Service Account (${var.environment})"
}

resource "google_project_iam_member" "backend_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_storage_bucket_iam_member" "backend_gcs_access" {
  bucket = google_storage_bucket.household_documents.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "backend_gemini_secret" {
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

# 7. Cloud Run v2 Backend Service
resource "google_cloud_run_v2_service" "backend" {
  name     = "homeiq-backend-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.backend_sa.email

    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = var.max_instances
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 8000
      }

      env {
        name  = "APP_ENV"
        value = var.environment
      }

      env {
        name  = "GCS_BUCKET_DOCUMENTS"
        value = google_storage_bucket.household_documents.name
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}
