# Cenários com Usuários Simulados — para métricas de assertividade da IA

**Data de criação:** 2026-11-06
**Ambiente:** produção — https://agileflow-tcc.web.app (projeto Firebase `agileflow-tcc`)
**Objetivo:** gerar métricas de assertividade da IA no dia 08/11/2026, com dados de "usuários reais" (microempresas, não necessariamente de TI).

**Senha padrão dos 3 usuários:** `teste123`

---

## Cenário 1 — Bom Andamento (Editor de imagens)

| Item | Valor |
|---|---|
| **Usuária** | Pedro Oliveira |
| **E-mail** | `pedro@designpedro.com.br` |
| **Projeto** | "Estúdio Pedro — Edições da Semana" |
| **ID do projeto** | `CFep3xgG88ikyxiX0f2n` |
| **URL** | https://agileflow-tcc.web.app/projects/CFep3xgG88ikyxiX0f2n/kanban |

**Cards (8):**

| Cartão | Story Points | Status final |
|---|---|---|
| Retocar fotos do casamento Silva | 5 | Concluído |
| Criar banner para Instagram da cliente | 3 | Concluído |
| Restaurar foto antiga da família | 2 | Concluído |
| Montar álbum digital do evento | 5 | Concluído |
| Ajustar iluminação das fotos de produto | 3 | Concluído |
| Editar fotos do catálogo de moda | 8 | Revisão |
| Criar stories animados para lançamento | 2 | Em andamento |
| Revisar portfólio atualizado | 1 | Backlog |

**Situação:** 5 concluídos (63%), 1 revisão, 1 em andamento, 1 backlog. Fluxo saudável, boa taxa de entrega.

---

## Cenário 2 — Gargalo (Loja de roupas)

| Item | Valor |
|---|---|
| **Usuário** | João Santos |
| **E-mail** | `joao@lojajoao.com.br` |
| **Projeto** | "Loja do João — Organização de Estoque" |
| **ID do projeto** | `pbnoonCp4r9KOSFZj0xD` |
| **URL** | https://agileflow-tcc.web.app/projects/pbnoonCp4r9KOSFZj0xD/kanban |

**Cards (8):**

| Cartão | Story Points | Status final |
|---|---|---|
| Arrumar vitrine da loja | 1 | Concluído |
| Fotografar novas peças para o site | 5 | Revisão |
| Criar promoção de liquidação | 5 | Revisão |
| Cadastrar fornecedor novo | 8 | Revisão |
| Contar estoque de camisetas | 3 | Em andamento |
| Atualizar preços no sistema | 2 | Em andamento |
| Organizar arara de inverno | 3 | Em andamento |
| Responder avaliações de clientes | 2 | Backlog |

**Situação:** 1 concluído (13%), 3 em revisão, 3 em andamento, 1 backlog. Acúmulo claro em Revisão e Em andamento — gargalo.

---

## Cenário 3 — Comparação (Salão de beleza)

| Item | Valor |
|---|---|
| **Usuária** | Ana Costa |
| **E-mail** | `ana@salaoana.com.br` |
| **Projeto** | "Salão da Ana — Agendamentos e Marketing" |
| **ID do projeto** | `NXYMMKurkJZ8n8EGQWf2` |
| **URL** | https://agileflow-tcc.web.app/projects/NXYMMKurkJZ8n8EGQWf2/kanban |

**Cards (8):**

| Cartão | Story Points | Status final |
|---|---|---|
| Postar antes/depois no Instagram | 2 | Concluído |
| Organizar agenda da semana | 1 | Concluído |
| Ligar para clientes inativas | 2 | Concluído |
| Criar pacote de noivas | 5 | Revisão |
| Decorar salão para o Natal | 3 | Revisão |
| Implementar agendamento online | 8 | Em andamento |
| Treinar equipe em novo produto | 3 | Em andamento |
| Fazer parceria com influencer local | 5 | Backlog |

**Situação:** 3 concluídos (38%), 2 revisão, 2 em andamento, 1 backlog. Fluxo equilibrado — serve para comparar com o gargalo do João.

---

## Como usar no dia 08/11

1. **Login** com cada usuário (senha `teste123`).
2. Abrir o **Desempenho** de cada projeto.
3. Rodar **"Analisar projeto"** em cada um (diagnóstico da IA).
4. Para a **comparação**, logar com qualquer um dos 3 e usar "Comparar projetos" — todos têm acesso apenas ao próprio projeto, então para comparar Cenário 1 vs Cenário 2, o ideal é:
   - **Opção A:** adicionar um usuário como membro do projeto do outro (ex.: Pedro como membro do projeto do João), ou
   - **Opção B:** usar a conta admin (`leticia@agileflow-tcc.dev`) que é dona de projetos de teste, ou adicionar os 3 projetos a ela.

**Nota:** os cards foram criados e movidos em 06/11/2026, então o cycle time será de minutos (não dias). Isso é uma limitação dos dados sintéticos — a IA deve detectar e ressalvar.
