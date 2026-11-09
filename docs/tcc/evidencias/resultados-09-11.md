# Resultados dos Testes — 09/11/2026

**Data:** 09/11/2026
**Ambiente:** produção — https://agileflow-tcc.web.app (projeto Firebase `agileflow-tcc`)
**Billing:** Nível 1 (pago) — ativado hoje, resolveu o limite de 20 req/dia do nível gratuito.

---

## 1. Funcionalidade "Card Atrasado" — validada com tempo real

Os cards foram criados em 06/11/2026. Hoje (09/11), com **3 dias decorridos**, os cards com Story Points baixos apareceram **atrasados de verdade** — sem simulação.

### Cenário 1 — Pedro (editor de imagens, bom andamento)

| Card | Story Points | Status | Estado do prazo |
|---|---|---|---|
| Revisar portfólio atualizado | 1 | Backlog | 🔴 **Atrasado** |
| Criar stories animados para lançamento | 2 | Em andamento | 🔴 **Atrasado** |
| Editar fotos do catálogo de moda | 8 | Revisão | ⚪ No prazo |
| (5 concluídos) | — | Concluído | ⚪ Nunca atrasado |

**Print:** `cenario-01-bom-andamento/01-kanban.png` — badges "Atrasado" visíveis.

### Cenário 2 — João (loja de roupas, gargalo)

| Card | Story Points | Status | Estado do prazo |
|---|---|---|---|
| Responder avaliações de clientes | 2 | Backlog | 🔴 **Atrasado** |
| Contar estoque de camisetas | 3 | Em andamento | 🔴 **Atrasado** |
| Atualizar preços no sistema | 2 | Em andamento | 🔴 **Atrasado** |
| Organizar arara de inverno | 3 | Em andamento | 🔴 **Atrasado** |
| (3 em Revisão: 5, 5, 8 pts) | — | Revisão | ⚪ No prazo |
| Arrumar vitrine da loja | 1 | Concluído | ⚪ Nunca atrasado |

**Print:** `cenario-02-gargalo/01-kanban.png` — 4 cards com badge "Atrasado".

### Cenário 3 — Ana (salão de beleza, comparação)

| Card | Story Points | Status | Estado do prazo |
|---|---|---|---|
| Treinar equipe em novo produto | 3 | Em andamento | 🔴 **Atrasado** |
| Decorar salão para o Natal | 3 | Revisão | 🔴 **Atrasado** |
| (3 concluídos) | — | Concluído | ⚪ Nunca atrasado |

**Print:** `cenario-03-comparacao/03-kanban-ana.png`

---

## 2. Diagnóstico da IA (Gemini) — com billing ativo

### Cenário 1 — Pedro (bom andamento)

- **Tempo de resposta:** 12.862 ms (1ª tentativa falhou com 503 transitório; 2ª funcionou)
- **Resultado:** ✅ Sucesso
- **Correção factual:** 6/6 afirmações corretas (8 cartões, 5 concluídos, 18 SP, throughput 5, WIP 1, distribuição 1/1/1/5)
- **A IA detectou:** a anomalia do cycle time (0,000016 dias) — correta, pois os cards foram criados e concluídos no mesmo dia (06/11)
- **Print:** `cenario-01-bom-andamento/03-relatorio-ia.png`

### Cenário 2 — João (gargalo)

- **Tempo de resposta:** 20.330 ms (com billing ativo e retry do Worker)
- **Resultado:** ✅ Sucesso
- **Correção factual:** 8/8 afirmações corretas (8 cartões, 1 concluído, 1 SP, throughput 1, WIP 3, 6 retidos no meio do fluxo, 3 em review, 3 em inProgress)
- **A IA identificou o gargalo:** "A etapa de 'review' representa um gargalo crítico com 3 cartões retidos (37,5%)" e "6 dos 8 cartões (75%) estão ativos simultaneamente"
- **Sugestões:** escoar review, limitar WIP, padronizar registro de cycle time
- **Print:** `cenario-02-gargalo/03-relatorio-ia.png`

### Cenário 3 — Ana (comparação)

- **Tempo de resposta:** 15.361 ms
- **Resultado:** ✅ Sucesso
- **Correção factual:** 6/6 afirmações corretas (8 cartões, 3 concluídos, 5 SP, throughput 3, WIP 2, distribuição 1/2/2/3)
- **Print:** `cenario-03-comparacao/02-relatorio-ia-ana.png`

---

## 3. Comparação entre projetos (IA)

**Pedro (A) vs João (B)** — executado com a conta admin (membro de ambos):

- **Tempo de resposta:** 17.876 ms
- **Resultado:** ✅ Sucesso
- **Correção factual:** 10/10 afirmações corretas:
  - Melhor projeto: A ✅
  - Maior throughput: A (5 vs 1) ✅
  - Menor cycle time: A ✅
  - Mais cartões parados: B (6 vs 2) ✅
  - Melhor distribuição: A (62,5% done vs 12,5%) ✅
  - Gargalos de B: 3 inProgress + 3 review ✅
  - Práticas de A para B: reduzir WIP, escoar review ✅
- **Print:** `cenario-03-comparacao/01-comparacao-ia.png`

---

## 4. Problemas encontrados e resolvidos hoje

| Problema | Causa | Solução |
|---|---|---|
| IA falhava com 502/504 | Limite gratuito de 20 req/dia estourado (24 feitas) | Billing ativado (Nível 1) — 10.000 req/dia |
| Gemini lento (90s+) | Alta demanda do provedor | Retry automático no Worker (1 tentativa extra em 503/500) + timeout aumentado para 60s |
| Admin não via projetos de Pedro/João | Não era membro | Pedro e João adicionaram a admin como membro via "Gerenciar equipe" |
| Ana não carregava o próprio projeto | Sessão expirada | Login novamente |

---

## 5. Limitações documentadas

- **Cycle time artificialmente baixo:** os cards foram criados e concluídos em 06/11, então o cycle time é de minutos (não dias). A IA detectou isso como anomalia — comportamento correto.
- **Diagnóstico do João:** executado com sucesso às 19:50 (após billing ativo), 20,3s, 8/8 fatos corretos.
- **Gemini sob alta demanda:** mesmo com billing, o provedor pode ter latência alta em horários de pico. O retry do Worker absorve a maioria dos casos.

---

## 6. Arquivos de evidência atualizados hoje

- `cenario-01-bom-andamento/01-kanban.png` — Kanban do Pedro com "Atrasado"
- `cenario-01-bom-andamento/02-metricas.png` — Métricas do Pedro
- `cenario-01-bom-andamento/03-relatorio-ia.png` — Diagnóstico da IA do Pedro
- `cenario-02-gargalo/01-kanban.png` — Kanban do João com 4 "Atrasado"
- `cenario-02-gargalo/02-metricas.png` — Métricas do João
- `cenario-03-comparacao/01-comparacao-ia.png` — Comparação Pedro vs João
- `cenario-03-comparacao/02-relatorio-ia-ana.png` — Diagnóstico da IA da Ana
- `cenario-03-comparacao/03-kanban-ana.png` — Kanban da Ana
- `cenario-03-comparacao/04-metricas-ana.png` — Métricas da Ana
