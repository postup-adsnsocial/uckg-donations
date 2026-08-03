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
pnpm db:migrate
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Health check: <http://localhost:3001/health>

A interface está disponível em português brasileiro (`/pt-BR`), inglês (`/en`) e espanhol (`/es`).
O seletor de idioma no login e no dashboard mantém a preferência no navegador.

## Bootstrap administrativo

Após aplicar as migrations, preencha temporariamente as variáveis `SEED_*` no ambiente e execute:

```bash
pnpm db:seed
```

O comando é idempotente para o slug da igreja e o e-mail administrativo. A senha precisa ter entre
6 e 128 caracteres, é armazenada com `scrypt` e nunca deve ser versionada. Depois do bootstrap,
remova `SEED_ADMIN_PASSWORD` do ambiente.

Rotas administrativas iniciais:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /churches/current`, com cookie de sessão e header `x-church-id`
- `GET /churches/current/settings`, restrita a administradores da igreja

## Qualidade

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:migrations
pnpm build
pnpm exec playwright install chromium firefox
pnpm test:e2e
pnpm test:visual
```

O teste visual é executado depois dos testes funcionais. Ele compara screenshots aprovadas do
login em português, inglês e espanhol, nos navegadores Chromium e Firefox e em larguras de 320,
390 e 1440 pixels. O mesmo gate rejeita rolagem horizontal, textos de campos ou idiomas cortados
e controles principais menores que 44 pixels.

Use `pnpm check:full` para executar toda a sequência local. Quando uma alteração visual for
intencional e já tiver sido revisada nos arquivos gerados em `test-results/`, atualize as imagens
de referência com `pnpm test:visual:update` e versione essas imagens junto com a alteração.

Consulte [docs/architecture.md](docs/architecture.md) para os limites do Marco 0 e as regras que
orientam o Marco 1.
