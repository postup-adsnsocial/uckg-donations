# Roadmap: UCKG Donations

## Overview

Este marco transforma a fundação administrativa existente em um sistema de contribuições seguro e
utilizável de ponta a ponta. A sequência primeiro torna tenancy, autorização e operação de produção
estruturalmente seguras; fixa auditoria e primitivas financeiras; conclui membros; entrega o ledger
imutável de doações; deriva relatórios reconciliados; e encerra com exportações duráveis, recuperação
operacional e o gate completo de qualidade da experiência.

## Phases

- [ ] **Phase 1: Tenant and Production-Safety Foundation** - Operações de domínio ficam protegidas por contexto explícito, privilégio mínimo e controles seguros de produção.
- [ ] **Phase 2: Audit and Financial Primitives** - Igrejas passam a ter auditoria transacional, moeda, timezone, fundos, formas de recebimento e valores exatos.
- [ ] **Phase 3: Members End to End** - Operadores autorizados conseguem manter membros da igreja ativa por um fluxo completo e localizado.
- [ ] **Phase 4: Immutable Donation Ledger and Batches** - Operadores financeiros conseguem registrar, consultar e corrigir contribuições sem duplicar ou alterar fatos postados.
- [ ] **Phase 5: Essential Reconciled Reporting** - Operadores conseguem consultar e exportar totais confiáveis derivados do ledger canônico.
- [ ] **Phase 6: Durable Exports and Launch Readiness** - Exportações grandes, jobs, recuperação e qualidade transversal ficam prontos para operação em produção.

## Phase Details

### Phase 1: Tenant and Production-Safety Foundation

**Goal**: Toda operação de domínio e toda execução de produção preservam isolamento entre igrejas, negação por padrão e observabilidade sem vazamento de dados.
**Depends on**: Nothing (first phase)
**Requirements**: TEN-01, TEN-02, TEN-03, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):

1. Uma operação de domínio sem igreja ativa explícita falha, e alternar de igreja nunca reutiliza dados ou contexto da seleção anterior.
2. Tentativas de leitura, escrita ou associação cross-tenant falham tanto pela API quanto com a role real da aplicação no banco.
3. Um endpoint de domínio sem permissão específica declarada é negado, e cada função acessa somente as capacidades que recebeu.
4. Uma configuração de produção incompleta impede o startup; login abusivo é limitado e respostas incluem headers seguros.
5. Operadores responsáveis conseguem verificar saúde, erros correlacionados e métricas essenciais sem encontrar credenciais, tokens ou PII nos registros.
   **Plans**: 7 plans

Plans:

- [x] 01-01-PLAN.md — Enforce and prove tenant isolation with the real PostgreSQL runtime role.
- [x] 01-02-PLAN.md — Require explicit transaction-local tenant context for domain work.
- [x] 01-03-PLAN.md — Classify every route and deny missing permissions by default.
- [x] 01-04-PLAN.md — Validate production configuration and harden HTTP/database bootstrap.
- [ ] 01-05-PLAN.md — Add exact source and failed-account login throttling semantics.
- [ ] 01-06-PLAN.md — Add correlated safe logs, health, errors and bounded metrics.
- [ ] 01-07-PLAN.md — Execute the production-role outage/recovery adversarial phase gate.
      **UI hint**: yes

### Phase 2: Audit and Financial Primitives

**Goal**: Administradores configuram a base financeira da igreja e operadores autorizados contam com um histórico imutável e exato para toda mudança futura.
**Depends on**: Phase 1
**Requirements**: AUD-01, AUD-02, FIN-01, FIN-02, FIN-03
**Success Criteria** (what must be TRUE):

1. Operador autorizado consulta somente os eventos imutáveis da igreja ativa, identificando ator, ação, alvo e horário.
2. Criar ou alterar membro ou doação produz o evento de auditoria na mesma transação; uma falha não deixa alteração ou auditoria isolada.
3. Administrador configura moeda e timezone da igreja, e mudanças futuras não reinterpretam valores financeiros já registrados.
4. Administrador cria, consulta e arquiva fundos e formas de recebimento sem remover referências históricas.
5. Um mesmo valor decimal é exibido e reconciliado sem perda entre contrato, persistência e cálculos financeiros.
   **Plans**: TBD
   **UI hint**: yes

### Phase 3: Members End to End

**Goal**: Operadores autorizados conseguem localizar e manter membros da igreja ativa sem misturar identidades administrativas, igrejas ou privilégios.
**Depends on**: Phase 2
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06
**Success Criteria** (what must be TRUE):

1. Operador com permissão lista e pesquisa membros da igreja ativa em páginas limitadas, estáveis e navegáveis.
2. Administrador cadastra e edita nome e contatos opcionais validados sem criar uma conta administrativa.
3. Administrador desativa e reativa um membro preservando seu cadastro e histórico.
4. O sistema alerta possíveis duplicidades apenas dentro da igreja ativa, sem revelar candidatos ou PII de outra igreja.
5. Administrador possui leitura/escrita, operador financeiro somente leitura e auditor não vê PII; o fluxo correspondente funciona em PT-BR, EN e ES nos breakpoints desktop, mobile e estreito.
   **Plans**: TBD
   **UI hint**: yes

### Phase 4: Immutable Donation Ledger and Batches

**Goal**: Operadores financeiros registram contribuições exatas e auditáveis, individualmente ou em lote, com histórico imutável e correção explícita.
**Depends on**: Phase 3
**Requirements**: DON-01, DON-02, DON-03, DON-04, DON-05, DON-06, DON-07, ENV-01, ENV-02, ENV-03
**Success Criteria** (what must be TRUE):

1. Operador financeiro registra uma doação positiva identificada ou anônima com fundo, forma de recebimento e data recebida válidos para a igreja ativa.
2. Operador prepara um lote com defaults, acompanha contagem e total exatos e o posta de forma atômica.
3. Reenvios concorrentes ou cliques repetidos com a mesma chave retornam o mesmo resultado sem criar doações duplicadas.
4. Doação postada não pode ser editada ou apagada; operador autorizado a corrige por estorno e substituição vinculados ao original.
5. Operador autorizado consulta detalhe e histórico paginado pelos filtros definidos, sem vínculos cross-tenant, e completa entrada, lote, confirmação e correção em PT-BR, EN e ES com aprovação visual.
6. Operador autorizado anexa e consulta imagens privadas de envelopes da igreja ativa, enquanto tentativas cross-tenant falham sem revelar o arquivo.
   **Plans**: TBD
   **UI hint**: yes

### Phase 5: Essential Reconciled Reporting

**Goal**: Operadores autorizados consultam histórico, totais, breakdowns e exportações que reconciliam com o ledger nos limites locais da igreja.
**Depends on**: Phase 4
**Requirements**: REP-01, REP-02, REP-03, REP-04, REP-05, REP-06
**Success Criteria** (what must be TRUE):

1. Operador autorizado consulta quantidade e total exato de doações para um período interpretado no timezone da igreja.
2. Breakdowns por fundo e forma de recebimento reconciliam com o total usando os mesmos filtros e regras do histórico.
3. Operador autorizado consulta contribuições de um membro sem incluir registros ou PII de outra igreja.
4. CSV e interface apresentam os mesmos registros e totais para os filtros ativos, com moeda, timezone, filtros e horário de geração visíveis em PT-BR, EN e ES.
5. Um PDF privado arquivado reproduz os filtros, totais e proveniência do relatório exibido.
   **Plans**: TBD
   **UI hint**: yes

### Phase 6: Durable Exports and Launch Readiness

**Goal**: Operadores executam exportações grandes com segurança e a plataforma pode ser lançada com jobs resilientes, recuperação testada e experiência visual íntegra.
**Depends on**: Phase 5
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

1. Operador inicia uma exportação grande sem bloquear o registro de doações, e pedidos repetidos não criam trabalhos ou artefatos duplicados.
2. Operador acompanha estados pendente, em execução, concluído ou falho e baixa somente artefatos de uma igreja à qual ainda possui acesso.
3. Falhas de job são tentadas novamente com limite e backoff, ficam visíveis com métricas úteis e não perdem trabalho durante desligamento gracioso.
4. Sessões expiradas são removidas e responsáveis executam com sucesso os procedimentos testados de backup, restauração e rollback de migration antes do lançamento.
5. Arquivos privados de envelopes e PDFs possuem backup e restauração testados independentemente do banco relacional.
6. Toda nova interface apresenta loading, vazio, erro, sucesso e retry úteis nas três línguas, sem truncamento ou rolagem horizontal indevida, com controles primários de pelo menos 44 px e baselines visuais alteradas somente após inspeção.
   **Plans**: TBD
   **UI hint**: yes

## Progress

**Execution Order:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

| Phase                                      | Plans Complete | Status      | Completed |
| ------------------------------------------ | -------------- | ----------- | --------- |
| 1. Tenant and Production-Safety Foundation | 4/7            | In Progress | -         |
| 2. Audit and Financial Primitives          | 0/TBD          | Not started | -         |
| 3. Members End to End                      | 0/TBD          | Not started | -         |
| 4. Immutable Donation Ledger and Batches   | 0/TBD          | Not started | -         |
| 5. Essential Reconciled Reporting          | 0/TBD          | Not started | -         |
| 6. Durable Exports and Launch Readiness    | 0/TBD          | Not started | -         |
