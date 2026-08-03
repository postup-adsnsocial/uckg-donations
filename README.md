# UCKG Donations

Fundação do monólito modular multi-tenant para gestão de doações.

## Requisitos

- Node.js 22.13 ou mais recente
- pnpm 10 ou mais recente
- Docker Desktop, para o PostgreSQL local

## Começar

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Health check: <http://localhost:3001/health>

## Qualidade

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Consulte [docs/architecture.md](docs/architecture.md) para os limites do Marco 0 e as regras que
orientam o Marco 1.
