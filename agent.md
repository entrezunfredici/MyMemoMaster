# agent.md

Instructions for coding agents in this repository.

## Scope

- Applies to the whole repository.

## Project

- `my_memo_master_api`: Node.js / Express API
- `my_memo_master_front`: Vue 3 + Vite frontend
- `docker-compose.yml`: local stack (Traefik, API, Front, Postgres, pgAdmin)

## Setup

1. Copy `.env.example` to `.env` and fill variables.
2. Start local environment from repo root:
   - `docker compose up --build`

## Local URLs

- Front: `http://localhost/`
- API: `http://localhost/api`
- Traefik dashboard: `http://localhost:8080/dashboard/#/`
- pgAdmin: `http://localhost:5050`

## Commands

### API (`my_memo_master_api`)

- Install: `npm ci`
- Run: `npm start`
- Test: `npm test`
- Lint: `npm run lint`
- Seed: `npm run seed`

### Front (`my_memo_master_front`)

- Install: `npm ci`
- Run: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

## Rules

- Keep changes focused on the request.
- Do not commit secrets or real `.env` values.
- If API endpoints change, keep Swagger/OpenAPI docs aligned.
- If env keys or scripts change, update `.env.example` and `README.md`.

## Validation

- Backend change: run API tests + lint.
- Frontend change: run front tests + lint.
- Full-stack change: run both.

## Branches and commits

- Branches:
  - `dev_back_<feature>`
  - `dev_front_<feature>`
- Commit prefixes:
  - `[ADD]` feature
  - `[IMP]` improvement
  - `[REF]` refactor
  - `[FIX]` bugfix
