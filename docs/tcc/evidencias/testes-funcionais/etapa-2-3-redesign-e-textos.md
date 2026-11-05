# Etapas 2 e 3 — Modernização visual e revisão de textos

**Data:** 2026-11-05 | **Ambiente:** desenvolvimento local (localhost:4200) — redesign NÃO publicado em produção ainda.

## Etapa 2 — Modernização visual (tema escuro)

Redesign completo para tema escuro, baseado em variáveis CSS em `src/styles.scss`. Nenhuma lógica de negócio foi alterada.

### Identidade visual
- Fundo grafite profundo (`#0f1420`), superfícies em tons escuros (`#1a2236`, `#212b44`).
- Azul (`#4f7cff`) e roxo (`#8b5cf6`) como cores de destaque, com gradientes sutis.
- Bordas arredondadas, sombras suaves, scrollbar estilizada, `color-scheme: dark`.

### Telas modificadas
| Tela | Alteração |
|---|---|
| Login | Fundo com gradientes radiais azul/roxo, logo com gradiente, botão primário com gradiente, campos escuros |
| Cadastro | Mesma identidade do login |
| Dashboard | Card de boas-vindas com gradiente azul→roxo, ícones dos indicadores com cores do tema |
| Kanban | **4 colunas** com cabeçalhos coloridos (Backlog cinza, Em andamento azul, Revisão âmbar, Concluído verde), contagem de cartões, borda esquerda colorida, feedback visual ao arrastar (glow), cards com hover |
| Histórico | Correção de bug de classe (HTML usava `Histórico` com acento, SCSS usava `.history`), ícones coloridos por tipo de evento |
| Desempenho | Ícones dos indicadores com cores do tema (estavam com fundo claro do tema antigo) |
| Header | Botão Sair com hover vermelho |

### Correções de layout
- Kanban: grid corrigido de `repeat(3, 1fr)` para 4 colunas (`repeat(4, minmax(240px, 1fr))`) com scroll horizontal — antes só 3 colunas cabiam e a 4ª quebrava.
- Cabeçalho do Kanban com `flex-wrap` para não espremer o título.

### Proibido alterar (preservado)
- Lógica do drag-and-drop, valores internos dos status, estrutura dos documentos Firestore, persistência, atualização em tempo real, histórico, Story Points, permissões. **Nada disso foi tocado.**

## Etapa 3 — Revisão de textos (pt-BR)

Correções de textos visíveis ao usuário (sem renomear campos internos):

| Local | Antes | Depois |
|---|---|---|
| Histórico | "moveu de todo para inProgress" | "moveu de Backlog para Em andamento" |
| Histórico | "moveu de inProgress para done" | "moveu de Em andamento para Concluído" |
| Desempenho — distribuição | "A fazer" e **sem a coluna Revisão** | "Backlog" e **com as 4 colunas** (Backlog, Em andamento, Revisão, Concluído) |

**Bug real encontrado na revisão:** a distribuição por status do Desempenho omitia a coluna "Revisão" (só mostrava 3 das 4). Corrigido em `project-performance.ts` e no teste `project-performance.spec.ts`.

## Validação
- Build de produção: compila sem erros.
- Testes unitários: **27/27 aprovados** (2 specs ajustados: `kanban.drag.spec.ts` ganhou `currentTarget` no evento fake; `project-performance.spec.ts` passou a esperar 4 colunas).
- Kanban testado após redesign: movimentação sem F5 funcionando (e desfeita para preservar o cenário).

## Evidências
- `etapa-2-login-tema-escuro.png`
- `etapa-2-kanban-tema-escuro.png`

## Pendente
- **Deploy do redesign em produção** — aguardando autorização.
