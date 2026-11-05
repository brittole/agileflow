# Etapa 1.2 — Bug do dashboard ("—" nos indicadores)

**Data:** 2026-11-05
**Ambiente:** produção — https://agileflow-tcc.web.app

## Causa raiz (identificada e corrigida nesta sessão)

O dashboard usava `CardService.getAllCardsForCurrentUser$()`, que lista cartões com o filtro `where('createdBy', '==', uid)`. As regras do Firestore publicadas exigem que a consulta prove a membership do projeto via `where('projectId', ...)`; sem esse filtro, o Firestore responde `permission-denied` e a assinatura morria — os indicadores ficavam presos no estado de carregamento ("—") ou zerados.

**Correção:** [dashboard.ts](../../../../src/app/features/dashboard/dashboard.ts) passou a combinar `ProjectService.getProjects$()` com `CardService.getCardsByProject$(id)` por projeto (`switchMap` + `combineLatest`), respeitando as regras. Nenhuma regra de segurança foi alterada.

## Validação em produção (após o deploy da correção)

| # | Cenário | Conta | Resultado |
|---|---|---|---|
| 1 | Navegação para /dashboard | colaborador (1 projeto, 0 cards) | ✅ 1 Projeto, 0 Cards, 0 Em andamento, 0 Concluídos |
| 2 | F5 (restauração de sessão) | colaborador | ✅ mesmos números |
| 3 | Ir a Projetos e voltar | colaborador | ✅ mesmos números |
| 4 | Logout | colaborador | ✅ redireciona a /login |
| 5 | Login | admin (leticia@agileflow-tcc.dev) | ✅ 2 Projetos, 4 Cards, 1 Em andamento, 0 Concluídos |
| 6 | F5 logado | admin | ✅ mesmos números |

Conferência manual dos números: Projeto "TCC Real" = 3 cards (1 todo, 1 inProgress, 1 review); Projeto "B - Comparacao" = 1 card (todo). Total 4 cards, 1 em andamento. **Valores batem com o banco.**

Evidência: `etapa-1.2-dashboard-admin-indicadores.png` nesta pasta.
