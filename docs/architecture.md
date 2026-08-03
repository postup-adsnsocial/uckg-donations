# Arquitetura

## Forma do sistema

UCKG Donations começa como um monólito modular em um monorepo pnpm. Web, API e worker são
processos implantáveis separados, mas compartilham contratos, autorização e acesso a dados. Essa
separação preserva limites claros sem introduzir a complexidade operacional de microsserviços antes
de ela ser necessária.

```text
apps/web     interface Next.js
apps/api     API HTTP NestJS
apps/worker  processamento assíncrono

packages/authorization  políticas de acesso e contexto de igreja
packages/contracts      contratos compartilhados e validação
packages/database       schema Drizzle e acesso PostgreSQL
```

## Regra de tenancy

Todo registro de domínio criado a partir do Marco 1 deve pertencer explicitamente a uma igreja. O
contexto autenticado fornece `churchId`; operações sem contexto são negadas, e queries de domínio
devem filtrar o tenant por padrão. Constraints, índices e testes devem tornar acesso cross-tenant um
erro verificável, não apenas uma convenção.

## Limites do Marco 0

Este marco entrega somente a fundação executável, os processos, a infraestrutura local e os gates de
qualidade. Igrejas, usuários administrativos, membros, doações, relatórios, autenticação e filas são
implementados em marcos posteriores.

## Próximo marco

O Marco 1 introduz igrejas, identidade administrativa, tenant context, papéis, permissões, migrations
e testes de isolamento antes de qualquer dado financeiro ou pessoal.
