# MVP funcional — UCKG Donations

## Objetivo

Entregar uma primeira versão utilizável por uma igreja, mantendo o isolamento necessário para crescer
até 150 igrejas nos Estados Unidos.

## O que precisa funcionar

1. Login administrativo e seleção da igreja.
2. Cadastro, edição, busca e desativação de membros.
3. Registro manual de doação com valor, data, membro opcional e observação.
4. Envio e consulta privada da imagem do envelope vinculada à doação.
5. Histórico de doações com filtro por período e membro, quantidade e total.
6. Geração e download de um relatório PDF básico com os filtros e totais exibidos.
7. Interface responsiva e revisada visualmente em PT-BR, inglês e espanhol.
8. Banco PostgreSQL e arquivos privados preparados para uma implantação gerenciada nos EUA.

## Segurança mínima que permanece obrigatória

- Nenhuma igreja acessa dados ou arquivos de outra igreja.
- Toda rota exige login e permissão.
- Valores financeiros são armazenados com exatidão.
- Doações não são apagadas fisicamente.
- Imagens de envelopes e PDFs não ficam públicos.

## Adiado para depois do MVP

- Entrada de doações em lote.
- Estorno e substituição avançados.
- Exportação CSV e exportações assíncronas grandes.
- Painéis e métricas operacionais avançados.
- Backup automatizado e testes completos de recuperação.
- Fundos e formas de recebimento configuráveis; o MVP começa com opções básicas.
- Alertas avançados de duplicidade de membros.

## Ordem de execução

1. Concluir o fluxo de membros já iniciado.
2. Construir doações e imagem do envelope.
3. Construir histórico, totais e PDF.
4. Fazer revisão funcional e visual nos três idiomas e nos tamanhos de tela suportados.
5. Implantar banco, arquivos, API e site em serviços gerenciados nos Estados Unidos.

## Estado atual — 2026-08-03

- [x] Fluxo completo de membros com endereço dos EUA e igreja visível.
- [x] Fluxo de envelopes com valor, data, membro opcional, imagem, observação e operador.
- [x] Dashboard calculado a partir dos registros reais.
- [x] Relatório por período com PDF e registro de arquivo por igreja.
- [x] PostgreSQL portável e armazenamento com adaptador para buckets privados do Supabase.
- [x] Rotas próprias em PT-BR, EN e ES e revisão responsiva automatizada preparada.
- [ ] Executar migrations e o roteiro de navegador no ambiente local fora do sandbox.
- [ ] Informar credenciais do projeto Supabase e da hospedagem para publicar o MVP.

## Critério de pronto

Um operador consegue entrar, escolher sua igreja, cadastrar um membro, registrar uma doação com a
foto do envelope, localizar essa doação no histórico e baixar um PDF, sem enxergar dados de outra
igreja e sem encontrar texto cortado nas três línguas.
