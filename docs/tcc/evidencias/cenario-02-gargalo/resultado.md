# Cenário 2 — Projeto com Gargalo

**Data:** 2026-11-05 | **Ambiente:** produção (https://agileflow-tcc.web.app) | **Projeto:** `QISqcGuotB6T34Pxe3qc` ("Cenário 2 — Gargalo")

## Dados utilizados (criados via fluxo real do app)

| Cartão | Story Points | Status final |
|---|---|---|
| C2 Migração de banco | 8 | done |
| C2 Integração pagamento | 8 | review |
| C2 Relatórios PDF | 5 | review |
| C2 Exportação CSV | 3 | review |
| C2 API parceiros | 5 | inProgress |
| C2 Webhooks | 3 | inProgress |
| C2 Notificações push | 5 | inProgress |
| C2 Auditoria | 2 | todo |

**Métricas exibidas:** 8 cartões, 1 concluído (13%), WIP 3, 8 SP concluídos, 1 concluído em 7 dias, cycle time < 1 min (amostra 1).

## Resultado esperado
A IA deve identificar o acúmulo em andamento/revisão como gargalo e recomendar ações de desbloqueio.

## Resultado observado (diagnóstico Gemini, `gemini-3.6-flash`)

- **Tempo de resposta:** 16.181 ms | **Tentativas:** 1 | **Sucesso:** sim
- **Resumo:** "throughput de apenas 1 cartão... trabalho majoritariamente represado no meio do fluxo, 3 em inProgress e 3 em review".
- **Pontos fortes:** entrega de 8 SP; 75% dos cartões saíram do backlog.
- **Pontos de atenção:** throughput baixo (1/7 dias); amostra de cycle time insuficiente (n=1); 6 cartões retidos nas fases intermediárias.
- **Gargalos identificados:** "Retenção na fase de Review: 3 cartões (37,5%)"; "75% do projeto (6 de 8) entre inProgress e review".
- **Sugestões:** priorizar vazão da revisão; estabelecer limites formais de WIP; aguardar amostra maior de cycle time.

## Avaliação

- **Correção factual:** 8/8 afirmações verificáveis corretas (8 totais, 1 concluído, 8 SP, 3 inProgress, 3 review, 1 todo, 1 done, n=1).
- **Acertos:** identificou corretamente o gargalo em Revisão e o excesso de WIP; recomendações pertinentes (limitar WIP, desbloquear review); reconheceu a fragilidade estatística do cycle time com amostra 1.
- **Falhas:** nenhuma factual relevante.
- **Limitação do cenário:** cycle time artificialmente baixo (dados criados e concluídos na mesma sessão).

## Evidências
- `01-kanban.png` — quadro com 3 cards em Revisão e 3 em Andamento
- `02-metricas.png` — métricas do projeto
- `03-relatorio-ia.png` — relatório completo da IA
