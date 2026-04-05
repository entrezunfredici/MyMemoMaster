# Server deployment

This directory contains the Docker Compose stack for a server deployment such as preprod on a VPS.

## What this stack expects

- A reverse proxy stack running from `server_proxy/`
- An external Docker network named `traefik_proxy`
- DNS records pointing to the VPS for:
  - `tests.my-memo-master.com`
  - `api.tests.my-memo-master.com`
  - `pgadmin.tests.my-memo-master.com`
- Docker images already pushed for API and front

## Preprod setup

1. Copy the sample environment file:

```powershell
Copy-Item .env.example .env
```

2. Edit `.env` and set real values for:

- `ENVIRONMENT=preprod`
- `AUTH_JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `PG_PASS`
- domains and image tags if needed

3. Start the reverse proxy once on the VPS:

```powershell
cd server_proxy
docker network create traefik_proxy
docker compose up -d
```

4. Start the application stack:

```powershell
cd ..
docker compose up -d
```

## Useful checks

```powershell
docker compose ps
docker compose logs api --tail 100
docker compose logs front --tail 100
docker compose logs db-sync --tail 100
```

## Important note

Inside the Docker network, the API must connect to Postgres on port `5432`. This stack therefore uses `INTERNAL_PG_PORT` for container-to-container traffic instead of a host port such as `5433`.
