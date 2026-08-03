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

## Identidade e tenancy — Marco 1

A identidade administrativa é própria e separada do futuro domínio de membros. Senhas usam
`scrypt` com salt aleatório. O login cria um token opaco de 256 bits; somente seu hash SHA-256 é
persistido, e o token é entregue em cookie `httpOnly`, `SameSite=Strict` e `Secure` em produção.
Sessões expiram após 12 horas.

Rotas autenticadas resolvem o usuário pela sessão. Rotas de domínio exigem também `x-church-id` e
confirmam uma membership ativa antes de construir o tenant context. A ausência do contexto ou uma
tentativa cross-tenant resulta em negação por padrão. Administradores de plataforma podem selecionar
qualquer igreja ativa, mas isso é explícito no contexto da requisição.

Papéis por igreja:

- `church_admin`: configurações, memberships, finanças e auditoria;
- `financial_operator`: leitura da igreja e operações financeiras;
- `auditor`: leitura da igreja e auditoria;
- `platform_admin`: flag global, fora das memberships e com acesso explícito a tenants ativos.

As tabelas `churches`, `admin_users`, `church_memberships` e `admin_sessions` possuem constraints,
índices e chaves estrangeiras. O teste de migrations cria um banco vazio temporário, aplica toda a
cadeia e o remove ao final.

Antes de produção, login deve receber rate limiting e auditoria de eventos de autenticação. Isso não
altera o modelo de sessão ou o isolamento implementado neste marco.

## Limites do Marco 0

Este marco entrega somente a fundação executável, os processos, a infraestrutura local e os gates de
qualidade. Igrejas, usuários administrativos, membros, doações, relatórios, autenticação e filas são
implementados em marcos posteriores.

## Próximo marco após identidade

O próximo marco pode introduzir o domínio de membros, sempre associado a `church_id`, sem misturar
contas administrativas com pessoas cadastradas pela igreja.

## Internacionalização da interface

A interface usa rotas localizadas e dicionários tipados antes da expansão dos domínios. Os idiomas
suportados são `pt-BR`, `en` e `es`, com português brasileiro como padrão. A preferência escolhida é
persistida em cookie e todas as navegações autenticadas preservam o segmento de idioma.

Textos de interface devem ser adicionados aos três dicionários no mesmo pull request. Datas, números
e valores monetários devem usar os formatadores compartilhados baseados em `Intl`; valores não devem
ser formatados manualmente nos componentes. O idioma da interface é uma preferência do operador e
não altera o `locale` ou o `timezone` cadastrado para a igreja.
