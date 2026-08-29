# PRESTARE

Gestão financeira.

MVP web multi-igreja para cadastro de membros, lançamento de envelopes e relatórios.

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

## Fluxos do MVP

- `/pt-BR/members`: lista, busca, cadastro completo, detalhe e edição de membros
- `/pt-BR/envelopes`: histórico por período, lançamento, foto privada e detalhe
- `/pt-BR/reports`: consolidação por período, total e geração de PDF arquivado
- as mesmas telas existem sob `/en` e `/es`

Todo cadastro e lançamento exibe a igreja ativa. Valores são armazenados em centavos de dólar
e imagens/PDFs ficam fora das tabelas do PostgreSQL.

## Supabase em produção

O aplicativo usa PostgreSQL padrão: as migrations funcionam tanto no Docker local quanto no
PostgreSQL do Supabase. Em produção, configure `DATABASE_URL` e `MIGRATION_DATABASE_URL` com as
conexões fornecidas pelo Supabase, aplique `pnpm db:migrate` e execute
[`supabase/storage.sql`](supabase/storage.sql) no editor SQL do projeto.

Com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` preenchidos, fotos e PDFs são enviados para os
buckets privados `envelopes` e `reports`. Sem essas variáveis, o desenvolvimento local usa `.data/`.
Nunca coloque a service role em uma variável `NEXT_PUBLIC_*` ou no navegador.

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
pnpm test:mvp
pnpm test:mvp:firefox
pnpm test:visual
```

O teste visual é executado depois dos testes funcionais. Além do login, `test:mvp` percorre dashboard,
membros, envelopes e relatórios, cria dados reais e registra screenshots em 1280, 375 e 320 pixels.
Repita-o no Firefox com `test:mvp:firefox`. O gate rejeita rolagem horizontal e impede que uma nova
tela seja considerada pronta sem revisão nos dois navegadores.

Use `pnpm check:full` para executar toda a sequência local. Quando uma alteração visual for
intencional e já tiver sido revisada nos arquivos gerados em `test-results/`, atualize as imagens
de referência com `pnpm test:visual:update` e versione essas imagens junto com a alteração.

Consulte [docs/architecture.md](docs/architecture.md) para os limites do Marco 0 e as regras que
orientam o Marco 1.
