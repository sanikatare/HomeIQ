# HomeIQ — Google Cloud Production Deployment Architecture

## 1. Local-to-Cloud Component Mapping

| Local Docker Component | Google Cloud Managed Equivalent | Justification for Managed Selection |
| :--- | :--- | :--- |
| **`frontend` (Next.js)** | **Cloud Run (Service)** | Stateless container autoscaling (`0 -> N` or `min_instances=1`), native HTTPS load balancing, zero cluster node management overhead compared to GKE. |
| **`backend` (FastAPI)** | **Cloud Run (Service)** | Request-concurrency autoscaling (up to 80 concurrent async requests per instance), direct VPC egress to Cloud SQL & Memorystore, IAM Workload Identity. |
| **`worker` (Python AMQP)** | **Cloud Run Worker Pool / Always-On Service** | Runs with `--no-cpu-throttling` and `min_instances=1` to maintain persistent consumer connections without requiring a Kubernetes cluster. |
| **`postgres` (`pgvector:pg16`)** | **Cloud SQL for PostgreSQL 16 (`pgvector`)** | Automated point-in-time recovery (PITR), regional high availability (HA) failover, automated patching, and native `vector` extension support. |
| **`redis:7.2-alpine`** | **Cloud Memorystore for Redis (M1)** | Sub-millisecond VPC-peered cache and LangGraph checkpoint store with managed failover. |
| **`rabbitmq:3.13`** | **Cloud Run Internal AMQP / Cloud Pub/Sub Bridge** | Keeps AMQP protocol compatibility via internal VPC or bridges to Cloud Pub/Sub with dead-letter topics for zero-maintenance durability. |
| **Local Object Storage** | **Google Cloud Storage (GCS)** | 11 nines durability, signed URL direct upload/download, lifecycle policies, and CMEK encryption. |
| **`.env` Secrets** | **Google Cloud Secret Manager** | Versioned, IAM-audited secrets mounted directly into Cloud Run environment variables at container startup. |
| **OTel + Prometheus + Grafana** | **Cloud Monitoring (Managed Service for Prometheus) + Cloud Trace + Cloud Logging** | Native ingestion of structured JSON stdout logs and OTLP traces/metrics without managing Prometheus TSDB storage disks. |

---

## 2. Networking Model

- **VPC Topology**: Custom-mode VPC (`homeiq-vpc`) in `asia-south1` (Mumbai) with a dedicated `/24` subnet and **Direct VPC Egress** from Cloud Run.
- **Private Data Plane**: Cloud SQL for PostgreSQL 16 and Memorystore for Redis are provisioned with **Private IP only** (Private Services Access)—zero public IP exposure.
- **Ingress & Edge**:
  - `homeiq-frontend` and `homeiq-backend` are fronted by a **Global External Application Load Balancer** with **Cloud Armor WAF** (OWASP Top 10 preconfigured rules + rate limiting).
  - `homeiq-worker` is configured with `INGRESS_TRAFFIC_INTERNAL_ONLY`.

---

## 3. Security Model & Service-to-Service Communication

- **Dedicated IAM Service Accounts (Least Privilege)**:
  - `sa-homeiq-frontend`: Can only invoke `homeiq-backend` (`roles/run.invoker`).
  - `sa-homeiq-backend`: `roles/cloudsql.client`, `roles/storage.objectAdmin` (scoped to household documents bucket), `roles/secretmanager.secretAccessor`.
  - `sa-homeiq-worker`: Same data-plane permissions as backend, isolated from public ingress.
  - `sa-homeiq-cicd`: Bound via **Workload Identity Federation (WIF)** to GitHub Actions (`roles/artifactregistry.writer`, `roles/run.developer`). Zero long-lived service account JSON keys.

---

## 4. Scaling Strategy & Operational Complexity

- **Cloud Run Autoscaling**:
  - `homeiq-backend`: `min_instances=1` (eliminates cold starts), `max_instances=15`, `concurrency=60`, `2 vCPU / 2 GiB RAM`.
  - Connection pooling via **PgBouncer / Cloud SQL Auth Proxy** (`DB_POOL_SIZE=10` per instance) to avoid exhausting PostgreSQL `max_connections`.
- **Operational Complexity**: **Low-to-Moderate**. By choosing Cloud Run + Cloud SQL + Memorystore + GCS over GKE, the team eliminates Kubernetes control-plane upgrades, CNI debugging, and StatefulSet storage management.

---

## 5. Deployment Sequence & Rollback Procedures

### Deployment Sequence
1. Provision VPC, Private Services Access, Artifact Registry, GCS, Secret Manager, Cloud SQL, and Memorystore via Terraform (`infra/terraform/`).
2. Build and push immutable Docker images tagged with Git commit SHA (`asia-south1-docker.pkg.dev/<PROJECT>/homeiq/backend:<SHA>`) via GitHub Actions.
3. Execute Alembic migrations as a **Cloud Run Job** (`homeiq-db-migrate`) before shifting traffic.
4. Deploy new Cloud Run revision and verify `/health` and `/metrics`.

### Rollback Procedure
- **Application Rollback (< 15 seconds)**:
  ```bash
  gcloud run services update-traffic homeiq-backend \
    --region=asia-south1 \
    --to-revisions=homeiq-backend-<PREVIOUS_GOOD_REV>=100
  ```
- **Database Migration Rollback**:
  Follow expand-and-contract schema discipline; if an immediate revert is required, run the `homeiq-db-migrate` Cloud Run Job with `alembic downgrade -1`.
