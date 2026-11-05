# Cenário 1 — Projeto com Bom Andamento

**Data:** 2026-11-05 | **Ambiente:** produção (https://agileflow-tcc.web.app) | **Projeto:** `eULUgOrLLJ3ufcgmMOOU` ("Cenário 1 — Bom Andamento")

## Dados utilizados (criados via fluxo real do app)

8 cartões criados e movimentados pelo Kanban (drag-and-drop real, gerando eventos de histórico):

| Cartão | Story Points | Status final |
|---|---|---|
| C1 Login social | 3 | done |
| C1 Cadastro de usuário | 5 | done |
| C1 Recuperação de senha | 2 | done |
| C1 Perfil do usuário | 3 | done |
| C1 Logout | 1 | done |
| C1 Validação de formulários | 2 | review |
| C1 Tela de configurações | 3 | inProgress |
| C1 Notificações | 5 | todo |

**Métricas exibidas:** 8 cartões, 5 concluídos (63%), WIP 1, 14 story points concluídos, 5 concluídos nos últimos 7 dias, cycle time médio < 1 min.

## Resultado esperado
A IA deve reconhecer o bom andamento (alta proporção de concluídos, WIP baixo) e apresentar recomendações coerentes.

## Resultado observado (diagnóstico Gemini, modelo `gemini-3.6-flash`)

- **Tempo de resposta:** 4.151 ms (2ª tentativa; a 1ª retornou HTTP 503 "high demand" do Gemini — falha transitória do provedor, tratada pelo app com mensagem "Erro ao consultar a IA.").
- **Resumo:** "bom andamento... 5 dos 8 cartões concluídos, 14 story points, throughput 5, apenas 1 cartão em progresso".
- **Pontos fortes:** alta taxa de entrega (5/8, 14 SP); WIP baixo (1).
- **Pontos de atenção:** detectou anomalia no cycle time (~0,000016 dias) — correta: os cartões foram criados e concluídos no mesmo minuto (limitação do cenário sintético, documentada).
- **Gargalos:** "não há gargalo evidente" — correto para o cenário.
- **Sugestões:** auditar registro de cycle time; manter disciplina de WIP.

## Avaliação

- **Correção factual:** 6/6 afirmações verificáveis corretas (8 totais, 5 concluídos, 14 SP, throughput 5, WIP 1, distribuição 1/1/1).
- **Acertos:** reconheceu bom andamento; identificou corretamente a ausência de gargalo; detectou a anomalia do cycle time.
- **Falhas:** nenhuma factual. A leitura do cycle time como "problema de registro" é uma inferência razoável, mas incorreta no contexto (dados sintéticos criados no mesmo dia).
- **Limitação do cenário:** cycle time artificialmente baixo porque os cartões foram criados e concluídos na mesma sessão.

## Evidências
- `01-kanban.png` — quadro com 5 cards em Concluído
- `02-metricas.png` — métricas do projeto
- `03-relatorio-ia.png` — relatório completo da IA
