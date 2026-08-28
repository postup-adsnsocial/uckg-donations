# Livro Anual — análise funcional da planilha de referência

## Status e escopo

Este documento registra o funcionamento observado na planilha antes de qualquer alteração funcional no UCKG Donations.

- Status: análise concluída; primeira versão implementada em 2026-08-28.
- Interpretação de “nova sessão”: nova **seção/módulo de navegação** do aplicativo, chamada **Livro Anual**, e não uma nova sessão de autenticação.
- Fonte: `Libro Anual - 2026 (v1).xlsb`.
- Tamanho da fonte: 200.021 bytes.
- SHA-256: `7211d711548d4911e5b074e70333809071d9aaced6f99f450377a462ccfd96f6`.
- Data da análise: 2026-08-28.
- O arquivo recebido é um modelo vazio: as células de entrada não possuem lançamentos e os totais calculados estão em zero.

## Resumo executivo

A planilha é um livro financeiro operacional anual, organizado por mês. Ela combina quatro funções:

1. registrar o recebido em cada dia, culto/reunião e meio de pagamento;
2. calcular fechamentos diários e semanais;
3. informar o valor esperado para depósito em dinheiro e cheque e o total semanal de cartões;
4. consolidar o mês e o ano, inclusive ATH Móvil e comparação com o ano anterior.

O comportamento deve ser reproduzido como dados estruturados e regras calculadas. Não deve ser reproduzido como uma grade fixa de células, porque o calendário, os períodos de comparação e os controles de conferência precisam ser dinâmicos no sistema.

## Decisões confirmadas para a primeira versão

- Os dados do Livro Anual serão inseridos manualmente, sem somar automaticamente os lançamentos individuais de doações.
- Haverá um depósito esperado para cada dia útil, de segunda a sexta.
- Dinheiro e cheque recebidos em um dia serão levados para o próximo dia útil; recebimentos de sexta, sábado e domingo serão reunidos na segunda-feira.
- As comparações aceitarão dois períodos livres, inclusive períodos parciais e o mesmo período do ano anterior.
- `Undesignated` será calculado, exibido na seção e incluído nos relatórios PDF gerados pelo sistema.
- O calendário será gerado para qualquer mês/ano, com o dia da semana calculado a partir da data.

## Estrutura da pasta de trabalho

A pasta possui 13 abas:

- 12 abas mensais de `Enero` a `Diciembre`, todas referentes a 2026;
- 1 aba `Comparación Mensual` com dois gráficos e o total anual.

As 12 abas mensais possuem a mesma lógica, com altura variável conforme o número de dias e de semanas parciais do mês. O calendário cobre corretamente os 365 dias de 2026, inclusive o dia da semana de cada data.

Foram identificadas 3.712 fórmulas, das quais 3.686 estão nas abas mensais. Não foram encontrados erros calculados como `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` ou `#N/A`. A estrutura diária e a distribuição semanal dos depósitos também foram verificadas sem divergências.

## Entradas manuais mensais

### Valores recebidos por dia

Cada data contém cinco possíveis cultos/reuniões:

- 1ª reunião;
- 2ª reunião;
- 3ª reunião;
- 4ª reunião;
- extra.

Para cada culto/reunião são lançados valores em três meios de pagamento:

- `CASH` — dinheiro;
- `CARDS` — cartões;
- `CHECKS` — cheques.

Portanto, um dia comporta até 15 valores de entrada: 5 cultos/reuniões × 3 meios de pagamento.

### Total de envelopes

Depois das três linhas de meios de pagamento, há uma entrada manual chamada `Total de SOBRES`. Pelo uso na fórmula, ela representa o **valor monetário total identificado nos envelopes**, e não a quantidade de envelopes.

Esse valor é usado para calcular o montante `UNDESIGNATED` da semana.

### ATH Móvil

Cada mês possui uma tabela lateral com entradas manuais de:

- data (`FECHA`);
- valor (`VALOR`).

Ela comporta 26 registros mensais no modelo. Os valores são somados no `Total ATH Móvil` e adicionados ao total geral do mês.

### Total do mesmo mês do ano anterior

No cabeçalho mensal existe uma entrada manual como `Total Enero 2025`. O operador informa o total do mesmo mês no ano anterior. Não há busca automática do histórico dentro da planilha.

## Cálculos automáticos

### Fechamento diário

Para cada data, a planilha calcula:

- subtotal por meio de pagamento: soma das cinco reuniões;
- total por reunião: soma de dinheiro, cartões e cheques;
- total geral do dia: soma dos subtotais de dinheiro, cartões e cheques.

Exemplo do padrão em janeiro:

- `J6 = SUM(E6:I6)` — subtotal de dinheiro;
- `J7 = SUM(E7:I7)` — subtotal de cartões;
- `J8 = SUM(E8:I8)` — subtotal de cheques;
- `K6 = SUM(J6:J8)` — total geral do dia;
- `E9:I9` — totais por reunião.

### Fechamento semanal e depósitos esperados

As semanas seguem segunda-feira a domingo. A primeira e a última semana de um mês podem ser parciais.

Dinheiro e cheques são agrupados de acordo com o dia esperado do depósito bancário:

| Recebido em             | Depósito esperado |
| ----------------------- | ----------------- |
| segunda e terça         | quarta-feira      |
| quarta e quinta         | sexta-feira       |
| sexta, sábado e domingo | segunda-feira     |

Os cartões não entram nos depósitos bancários acima. A planilha calcula `Total CARDS` separadamente para a conferência da maquininha.

O fechamento semanal contém:

- total de tudo que foi recebido na semana, incluindo cartões;
- depósito de quarta: dinheiro + cheques de segunda e terça;
- depósito de sexta: dinheiro + cheques de quarta e quinta;
- depósito de segunda: dinheiro + cheques de sexta, sábado e domingo;
- total semanal de cartões;
- `UNDESIGNATED = total semanal − soma dos valores de envelopes`.

Os valores chamados “depósito” são valores **esperados**, calculados a partir dos recebimentos. A planilha não registra depósito efetivamente realizado, data efetiva, comprovante, referência bancária, status ou diferença.

### Fechamento mensal

O cabeçalho do mês apresenta:

- `SIN ATH MÓVIL`: soma dos fechamentos semanais;
- `CON ATH MÓVIL`: total sem ATH Móvil + total ATH Móvil;
- `Comparación`: total com ATH Móvil − total informado para o mesmo mês do ano anterior.

A comparação é uma diferença monetária absoluta. A planilha não calcula percentual de variação.

### Consolidação anual

A aba `Comparación Mensual` contém:

- tabela e gráfico com o total de cada mês **com ATH Móvil**;
- tabela e gráfico separados para ATH Móvil por mês;
- um cartão de total anual.

## Defeito semântico confirmado na planilha

O total anual exibido na aba `Comparación Mensual` soma os 12 totais mensais, que já incluem ATH Móvil, e adiciona novamente o total anual de ATH Móvil:

`U16 = SUM(D5:F16,D34)`

Como `D5:D16` referencia o total mensal `CON ATH MÓVIL` e `D34` soma novamente o ATH Móvil dos 12 meses, o ATH Móvil é contado duas vezes no total anual. Essa fórmula não deve ser reproduzida no sistema.

## O que a planilha permite hoje

- lançar valores diariamente por culto/reunião e meio de pagamento;
- visualizar subtotais por meio de pagamento e por culto/reunião;
- obter total diário, semanal, mensal e anual;
- calcular o valor esperado de depósitos três vezes por semana;
- obter o total semanal de cartões para conferência externa com a maquininha;
- registrar e consolidar ATH Móvil;
- calcular o valor não identificado em envelopes (`UNDESIGNATED`);
- comparar cada mês com um total do mesmo mês do ano anterior;
- visualizar dois gráficos anuais: total mensal e ATH Móvil mensal.

## Limitações e riscos do modelo atual

- O calendário está fixo em 2026; outro ano exige outra planilha.
- O ano anterior é digitado manualmente, sem vínculo com histórico.
- Não existe comparação livre entre dois períodos; a planilha só compara o mês atual com um total manual do ano anterior.
- A comparação mensal não mostra variação percentual.
- `Total CARDS` fornece apenas o valor esperado; não existe campo para o valor informado pela maquininha nem cálculo de divergência.
- Os depósitos são previstos, não conciliados com o banco.
- O arquivo não registra usuário, horário, versão do lançamento, aprovação, fechamento ou correção.
- Não existem validações de dados, tabelas estruturadas ou nomes definidos. A proteção das abas evita edição de fórmulas, mas não substitui validações de domínio.
- A unidade monetária não está identificada; os valores usam duas casas decimais, sem símbolo de moeda.
- As datas e dias da semana são texto/estrutura fixa, não um calendário gerado dinamicamente.
- Há muitas células mescladas e uma navegação inconsistente entre abas, o que dificulta manutenção e acessibilidade.
- O total anual possui a dupla contagem de ATH Móvil descrita acima.
- Valores recebidos no fim do mês podem ser depositados no mês seguinte; a planilha atribui o valor ao período de recebimento, mas não modela separadamente a data prevista e a data efetiva do depósito.

## Especificação recomendada para a seção “Livro Anual”

### Navegação e contexto

- Nova seção principal chamada `Livro Anual`.
- Nomes localizados: `Livro Anual` (pt-BR), `Annual Book` (en) e `Libro Anual` (es).
- Todo conteúdo deve respeitar a igreja selecionada e seu fuso horário.
- Filtros principais: ano e mês, com acesso ao resumo anual.

### Visão de lançamentos

- Calendário gerado automaticamente para qualquer ano, com data e dia da semana corretos.
- Grade diária por culto/reunião e meio de pagamento.
- Cultos/reuniões padrão: 1º, 2º, 3º, 4º e extra; o desenho dos dados deve permitir configuração futura.
- Meios de pagamento iniciais: dinheiro, cartão e cheque.
- Totais diários e por culto/reunião calculados no servidor.
- Entrada do valor total de envelopes identificados.
- Entradas de ATH Móvil com data e valor.

### Fechamento e conferência

- Fechamento semanal com a mesma regra de depósitos da planilha.
- Valor esperado de depósito separado por data prevista.
- Registro do depósito efetivamente realizado: data, valor, referência, status e comprovante opcional.
- Conferência de cartões com três valores explícitos:
  - valor esperado a partir dos lançamentos;
  - valor informado pela maquininha/adquirente;
  - diferença calculada.
- Cálculo de não designado: total recebido menos total identificado em envelopes.
- Estados recomendados: aberto, conferido e fechado.
- Correções posteriores ao fechamento devem deixar trilha de auditoria.

### Comparação entre períodos

- Período A e período B com datas de início e fim.
- Atalho “mesmo período do ano anterior”.
- Comparar total geral, dinheiro, cartões, cheques, ATH Móvil, envelopes e não designado.
- Mostrar diferença monetária e variação percentual, tratando base zero sem erro.
- Permitir períodos completos ou parciais, desde que o intervalo seja explícito.

### Regras de dados e segurança

- Todos os registros persistidos devem possuir `church_id`.
- Valores monetários devem ser armazenados em centavos inteiros.
- Datas de recebimento, datas previstas e datas efetivas de depósito devem ser campos distintos.
- Cada alteração deve registrar usuário e timestamps.
- Administrador da igreja e operador financeiro podem lançar/conferir; auditor deve possuir acesso somente leitura.
- O fechamento deve impedir edição acidental, com reabertura controlada.
- O total anual correto é a soma dos totais mensais uma única vez.

## Relação com o sistema atual

O sistema já possui doações individuais com data e meio de pagamento, além de permissões financeiras. Entretanto, o modelo atual não registra:

- culto/reunião;
- total monetário de envelopes por dia;
- ATH Móvil como fluxo separado;
- valor da maquininha e divergência;
- previsão e realização de depósitos;
- fechamento diário/semanal/mensal;
- seleção livre de períodos comparáveis.

Nesta primeira versão, os lançamentos do Livro Anual são agregados e manuais. Eles não são alimentados automaticamente pelas doações individuais, o que evita dupla contagem entre os dois módulos.

## Critérios de aceitação da implementação

1. Para qualquer ano selecionado, todas as datas e dias da semana são gerados corretamente.
2. Os subtotais por meio de pagamento, culto/reunião e dia reconciliam com o total diário.
3. Existe uma linha de depósito esperado para cada dia útil; dinheiro e cheque são atribuídos ao próximo dia útil, com sexta, sábado e domingo consolidados na segunda-feira.
4. O total de cartões semanal reconcilia com os lançamentos e mostra a diferença em relação à maquininha.
5. `Não designado = total recebido − total identificado em envelopes`.
6. O total mensal com ATH Móvil adiciona ATH Móvil uma única vez.
7. O total anual soma os meses sem dupla contagem.
8. A comparação permite mesmo período do ano anterior e dois períodos arbitrários, com diferença absoluta e percentual.
9. Todos os dados são isolados pela igreja ativa e respeitam as permissões.
10. Fechamentos e correções deixam trilha de auditoria.

## Decisões que permanecem abertas

- moeda utilizada por cada igreja;
- nomes e quantidade de cultos/reuniões configuráveis;
- se ATH Móvil deve ser tratado como meio de pagamento, canal ou fonte separada;
- documentos obrigatórios para confirmar depósito e fechamento;
- política de reabertura e aprovação de períodos fechados.
