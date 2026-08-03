# Requirements: UCKG Donations

**Defined:** 2026-08-03  
**Core Value:** Cada igreja consegue registrar e acompanhar suas contribuições com segurança,
clareza e isolamento total dos dados de outras congregações.

## Existing Baseline

- ✓ Operador administrativo entra e encerra uma sessão segura de 12 horas.
- ✓ Operador seleciona explicitamente uma igreja permitida e a API rejeita acesso cross-tenant.
- ✓ A interface base funciona em PT-BR, EN e ES.
- ✓ O repositório possui gates de lint, tipos, testes, build, E2E e regressão visual.

## v1 Requirements

### Tenant and Production Safety

- [x] **TEN-01**: Toda operação de domínio exige uma igreja ativa explícita e falha quando o contexto está ausente.
- [x] **TEN-02**: Leituras e escritas cross-tenant são bloqueadas pela API, constraints e políticas do banco executadas com a role real da aplicação.
- [x] **TEN-03**: Cada endpoint de domínio nega acesso por padrão e exige uma permissão específica declarada.
- [x] **SEC-01**: A API valida configuração de produção no startup e não usa defaults locais fora de desenvolvimento.
- [x] **SEC-02**: Login possui throttling por origem/conta, headers seguros e logs estruturados que não expõem credenciais, tokens ou PII.
- [ ] **SEC-03**: Operadores responsáveis conseguem observar saúde, erros e métricas essenciais sem acessar dados sensíveis de outras igrejas.

### Audit and Financial Primitives

- [ ] **AUD-01**: Operador autorizado consegue consultar eventos de auditoria imutáveis da igreja ativa com ator, ação, alvo e horário.
- [ ] **AUD-02**: Toda alteração de membro ou doação grava o evento de auditoria na mesma transação da alteração.
- [ ] **FIN-01**: Administrador configura a moeda e o timezone usados pela igreja sem reinterpretar registros financeiros históricos.
- [ ] **FIN-02**: Administrador gerencia fundos e formas de recebimento com ciclo ativo/arquivado, sem apagar referências históricas.
- [ ] **FIN-03**: Valores financeiros são armazenados e transmitidos de forma decimal exata e reconciliam entre entrada, histórico e relatórios.

### Members

- [ ] **MEM-01**: Operador com permissão consegue listar e pesquisar membros da igreja ativa com paginação determinística e limitada.
- [ ] **MEM-02**: Administrador consegue cadastrar membro com nome e contatos opcionais validados, sem criar uma conta administrativa.
- [ ] **MEM-03**: Administrador consegue editar dados cadastrais e desativar ou reativar um membro sem apagar seu histórico.
- [ ] **MEM-04**: O sistema alerta sobre possíveis duplicidades de membro dentro da mesma igreja e nunca compara dados com outra igreja.
- [ ] **MEM-05**: Administrador tem leitura/escrita, operador financeiro tem somente leitura e auditor não acessa PII de membros.
- [ ] **MEM-06**: O fluxo completo de membros funciona em PT-BR, EN e ES nos breakpoints desktop, mobile e estreito.

### Donation Ledger

- [ ] **DON-01**: Operador financeiro registra doação identificada ou anônima com valor positivo exato, fundo, forma de recebimento e data recebida.
- [ ] **DON-02**: Operador consegue lançar doações em lote com defaults, contagem e total corrente antes da postagem atômica.
- [ ] **DON-03**: Reenvios e cliques repetidos com a mesma chave de idempotência não criam doações duplicadas.
- [ ] **DON-04**: Uma doação postada não pode ser editada ou apagada; operador autorizado corrige por estorno e substituição vinculados ao original.
- [ ] **DON-05**: Operador autorizado consulta um histórico paginado por período, fundo, forma, membro/anonimato, status, lote e responsável.
- [ ] **DON-06**: Toda associação entre doação e membro é validada na mesma igreja e tentativas cross-tenant falham sem revelar PII.
- [ ] **DON-07**: Entrada, lote, confirmação, detalhe e correção de doações funcionam nas três línguas e passam pelo gate visual.

### Envelope Images

- [ ] **ENV-01**: Operador autorizado envia e consulta imagens de envelopes da igreja ativa vinculadas à doação ou ao lote correspondente.
- [ ] **ENV-02**: Arquivos de envelopes são privados e sua metadata registra igreja, responsável, horário, tipo, tamanho e checksum; acesso cross-tenant falha sem revelar a existência do arquivo.
- [ ] **ENV-03**: Uploads aceitam somente tipos e tamanhos configurados, preservam uma versão legível do arquivo recebido e geram uma visualização otimizada para a interface.

### Reporting

- [ ] **REP-01**: Operador autorizado consulta totais e quantidade de doações para um período definido no timezone da igreja.
- [ ] **REP-02**: Operador autorizado consulta breakdowns reconciliados por fundo e forma de recebimento usando os mesmos filtros do histórico.
- [ ] **REP-03**: Operador autorizado consulta o histórico de contribuições de um membro sem incluir dados de outra igreja.
- [ ] **REP-04**: Operador exporta CSV compatível com os filtros ativos e com os mesmos totais exibidos na interface.
- [ ] **REP-05**: Relatórios exibem moeda, timezone, filtros e horário de geração, e funcionam em PT-BR, EN e ES.
- [ ] **REP-06**: Operador gera, arquiva e baixa um relatório PDF privado com os mesmos filtros, totais e proveniência exibidos na interface.

### Operations and Large Exports

- [ ] **OPS-01**: Exportações grandes executam em job durável, idempotente e tenant-scoped sem bloquear o registro de doações.
- [ ] **OPS-02**: Operador acompanha estado da exportação e baixa somente artefatos da igreja que está autorizado a acessar.
- [ ] **OPS-03**: Jobs possuem tentativas limitadas, backoff, estado de falha visível, métricas e desligamento gracioso.
- [ ] **OPS-04**: Sessões expiradas são limpas e backups, restauração e rollback de migrations possuem procedimento testado antes do lançamento.
- [ ] **OPS-05**: Backups e restauração dos arquivos privados de envelopes e PDFs são testados separadamente do backup do banco de dados.

### Experience Quality

- [ ] **UX-01**: Toda nova interface entrega estados de loading, vazio, erro, sucesso e retry com texto útil nas três línguas.
- [ ] **UX-02**: Nenhuma entrega de UI possui texto truncado, rolagem horizontal indevida ou controle primário menor que 44 pixels.
- [ ] **UX-03**: Mudanças intencionais de interface só atualizam baselines visuais depois de inspeção das imagens geradas.

## v2 Requirements

### Advanced Giving

- **GIVE-01**: Doador realiza pagamentos online ou recorrentes pela plataforma.
- **GIVE-02**: Operador acompanha pledges, campanhas e metas de arrecadação.
- **GIVE-03**: Plataforma integra chargebacks, refunds, payouts e conciliação bancária.

### Extended Relationships

- **REL-01**: Operador agrupa membros em households.
- **REL-02**: Administrador mescla perfis duplicados preservando histórico e auditoria.

### Advanced Reporting

- **AREP-01**: Operador salva visões personalizadas de relatórios.
- **AREP-02**: Plataforma gera statements específicos por país após validação jurídica e fiscal.

## Out of Scope

| Feature                                                  | Reason                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Microsserviços                                           | O monólito modular atende o estágio atual com menos risco operacional       |
| Aplicativos móveis nativos                               | Web responsiva é a prioridade inicial                                       |
| Contabilidade geral, payroll, despesas e orçamento       | Produto é sistema de contribuições, não ERP contábil                        |
| Processamento de pagamentos no v1                        | Primeiro ciclo registra contribuições recebidas manualmente                 |
| Declarações de conformidade fiscal                       | Exigem requisitos jurídicos por país ainda não definidos                    |
| Exclusão física rotineira de membros, igrejas ou doações | Histórico pessoal/financeiro exige arquivo, inativação ou estorno auditável |
| Redis, Elasticsearch, warehouse e materialized views     | Nenhuma necessidade medida justifica infraestrutura adicional               |

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| TEN-01      | Phase 1 | Complete |
| TEN-02      | Phase 1 | Complete |
| TEN-03      | Phase 1 | Complete |
| SEC-01      | Phase 1 | Complete |
| SEC-02      | Phase 1 | Complete |
| SEC-03      | Phase 1 | Pending  |
| AUD-01      | Phase 2 | Pending  |
| AUD-02      | Phase 2 | Pending  |
| FIN-01      | Phase 2 | Pending  |
| FIN-02      | Phase 2 | Pending  |
| FIN-03      | Phase 2 | Pending  |
| MEM-01      | Phase 3 | Pending  |
| MEM-02      | Phase 3 | Pending  |
| MEM-03      | Phase 3 | Pending  |
| MEM-04      | Phase 3 | Pending  |
| MEM-05      | Phase 3 | Pending  |
| MEM-06      | Phase 3 | Pending  |
| DON-01      | Phase 4 | Pending  |
| DON-02      | Phase 4 | Pending  |
| DON-03      | Phase 4 | Pending  |
| DON-04      | Phase 4 | Pending  |
| DON-05      | Phase 4 | Pending  |
| DON-06      | Phase 4 | Pending  |
| DON-07      | Phase 4 | Pending  |
| ENV-01      | Phase 4 | Pending  |
| ENV-02      | Phase 4 | Pending  |
| ENV-03      | Phase 4 | Pending  |
| REP-01      | Phase 5 | Pending  |
| REP-02      | Phase 5 | Pending  |
| REP-03      | Phase 5 | Pending  |
| REP-04      | Phase 5 | Pending  |
| REP-05      | Phase 5 | Pending  |
| REP-06      | Phase 5 | Pending  |
| OPS-01      | Phase 6 | Pending  |
| OPS-02      | Phase 6 | Pending  |
| OPS-03      | Phase 6 | Pending  |
| OPS-04      | Phase 6 | Pending  |
| OPS-05      | Phase 6 | Pending  |
| UX-01       | Phase 6 | Pending  |
| UX-02       | Phase 6 | Pending  |
| UX-03       | Phase 6 | Pending  |

**Coverage:**

- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---

_Requirements defined: 2026-08-03_
_Last updated: 2026-08-03 after roadmap creation_
