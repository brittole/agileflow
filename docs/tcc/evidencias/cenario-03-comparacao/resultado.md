# Cenário 3 — Comparação entre Dois Projetos

**Data:** 2026-11-05 | **Ambiente:** produção (https://agileflow-tcc.web.app)

## Projetos utilizados

- **Projeto A:** "Cenário 1 — Bom Andamento" (`eULUgOrLLJ3ufcgmMOOU`) — 8 cartões: 5 done, 1 review, 1 inProgress, 1 todo; 14 SP concluídos; throughput 5; WIP 1.
- **Projeto B:** "Cenário 2 — Gargalo" (`QISqcGuotB6T34Pxe3qc`) — 8 cartões: 1 done, 3 review, 3 inProgress, 1 todo; 8 SP concluídos; throughput 1; WIP 3.

## Resultado esperado
A IA deve identificar o Projeto A como de melhor desempenho, apontar o acúmulo do Projeto B e oferecer recomendações úteis, sem afirmações sem fundamento.

## Resultado observado (comparação Gemini, `gemini-3.6-flash`)

- **Tempo de resposta:** 14.553 ms | **Tentativas:** 1 | **Sucesso:** sim
- **Melhor projeto:** A | **Maior throughput:** A (5 vs 1) | **Menor cycle time:** A | **Mais cartões parados:** B | **Melhor distribuição:** A
- **O que A faz melhor:** throughput 5 vs 1; 14 SP vs 8 SP; menor acúmulo (1 em cada status ativo).
- **Práticas de A para B:** limitar WIP (3 cartões); escoar os 3 retidos em review; desbloquear os 3 em inProgress.
- **Gargalos A:** 1 em inProgress, 1 em review. **Gargalos B:** 3 em inProgress, 3 em review, WIP 3.
- **Melhorias A:** concluir os 2 cartões ativos. **Melhorias B:** desgargalar review, finalizar inProgress, aumentar amostra de concluídos.

## Avaliação

- **Identificação das diferenças:** correta — A declarado melhor com justificativa quantitativa.
- **Correção dos dados:** 10/10 afirmações verificáveis corretas (throughput 5/1, SP 14/8, WIP 1/3, distribuições 5/1/1/1 e 1/3/3/1, amostras 5/1).
- **Qualidade das conclusões:** coerentes com as métricas; "empate" não foi forçado; a superioridade de A foi justificada por números.
- **Recomendações:** aplicáveis e específicas (limitar WIP, escoar review).
- **Afirmações sem fundamento:** nenhuma identificada. A IA ressalvou a baixa confiabilidade do cycle time de B (amostra 1).
- **Limitação:** cycle times de ambos são artificialmente baixos (dados criados na mesma sessão); a IA citou os valores brutos em dias (0,000016) sem arredondar — ponto de atenção de apresentação, não de correção.

## Evidências
- `01-comparacao-ia.png` — relatório comparativo completo
- Kanban e métricas dos projetos A e B: ver `../cenario-01-bom-andamento/` e `../cenario-02-gargalo/`
