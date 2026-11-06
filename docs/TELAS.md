# AgileFlow — Telas, Funcionalidades e Regras

Documento completo do que cada tela faz, quais funcionalidades tem e quais regras se aplicam. Baseado no código real em produção (https://agileflow-tcc.web.app).

---

## Telas públicas (sem login)

### 1. Login (`/login`)

**Funcionalidades:**
- Entrar com e-mail e senha.
- Entrar com Google (botão "Entrar com Google").
- Link "Cadastre-se" para criar conta.
- Validação de campos: e-mail obrigatório e válido, senha obrigatória (mínimo 6 caracteres).
- Mensagens de erro em português (ex.: "Credenciais inválidas", "Falha de conexão").
- Botão fica "Entrando..." durante a autenticação.

**Regras:**
- E-mail e senha são verificados pelo Firebase Authentication.
- Login com Google usa o provedor Google do Firebase (precisa estar ativado no console do Firebase).
- Após login, redireciona para o Dashboard.

---

### 2. Cadastro (`/register`)

**Funcionalidades:**
- Criar conta com nome, e-mail, senha e confirmação de senha.
- Validação: nome obrigatório (mínimo 2 caracteres), e-mail válido, senha mínima de 6 caracteres, senhas devem ser iguais.
- Mensagens de erro em português (ex.: "Este e-mail já está em uso").

**Regras:**
- Cria a conta no Firebase Authentication.
- Grava o perfil em `users/{uid}` (nome, e-mail, datas) e o índice `userEmails/{email}` (para buscar colaboradores por e-mail).
- **Usuário recém-cadastrado NÃO recebe privilégios administrativos globais.** Ele só vira gestor dos projetos que ele mesmo criar.
- Após cadastrar, entra automaticamente e vai para o Dashboard.

---

## Telas internas (exigem login)

Todas as telas abaixo ficam dentro do layout com menu lateral (Dashboard, Projetos, Perfil) e botão Sair. Quem não está logado é redirecionado para o Login (authGuard).

---

### 3. Dashboard (`/dashboard`)

**Funcionalidades:**
- Cartão de boas-vindas.
- 4 indicadores com números reais: **Projetos**, **Cards**, **Em andamento**, **Concluídos**.
- Os números somam todos os projetos do usuário (projetos que ele é dono + projetos em que é colaborador).

**Regras:**
- Os dados vêm do Firestore em tempo real (onSnapshot).
- A contagem de cartões é feita por projeto (as regras do Firestore exigem filtro por `projectId`).
- Se um projeto falhar ao carregar, ele contribui com zero — o dashboard não trava.

---

### 4. Projetos (`/projects`)

**Funcionalidades:**
- Lista todos os projetos do usuário (dono + colaborador), em cards com nome e descrição.
- Botão **+ Novo projeto**: abre formulário para criar (nome + descrição, ambos obrigatórios).
- Em cada card de projeto: botão **✏️ Editar** (nome/descrição) e **🗑️ Excluir**.
- Clicar no card abre o Kanban do projeto.

**Regras:**
- Quem cria um projeto vira o **gestor** (dono) dele automaticamente.
- Editar e excluir projeto: **somente o gestor**.
- Excluir um projeto apaga todos os cartões dele, mas **preserva o histórico** (eventos).
- A lista mostra projetos onde o usuário é dono (`ownerId`) ou membro (`memberIds`).

---

### 5. Kanban (`/projects/:id/kanban`)

Tela principal do projeto. Quadro com 4 colunas e arrastar-e-soltar.

**Funcionalidades:**
- 4 colunas fixas, cada uma com cor e contagem de cartões:
  - **Backlog** (cinza) → **Em andamento** (azul) → **Revisão** (âmbar) → **Concluído** (verde).
- **Arrastar um cartão** para outra coluna muda o status dele na hora, sem recarregar a página (atualização em tempo real via onSnapshot).
- Cada cartão mostra: título, descrição (se houver), **Story Points** (1, 2, 3, 5 ou 8) e, quando houver:
  - **👤 Responsável** — nome do membro atribuído ao cartão.
  - **"Pode atrasar"** (amarelo) — quando o cartão está no último dia do prazo e ainda não chegou em Revisão.
  - **"Atrasado"** (vermelho) — quando o cartão passou do prazo.
- **+ Novo card** (só o gestor): cria cartão com título, descrição e Story Points. Todo cartão nasce no Backlog.
- Clicar num cartão abre o **detalhe do cartão** (modal):
  - Ver/editar título, descrição, Story Points e **Responsável** (dropdown com os membros do projeto).
  - **Excluir** o cartão (com confirmação).
- Links no topo: **Gerenciar equipe** (só gestor), **Histórico**, **Desempenho**.

**Regras de movimentação:**
- Colaborador move entre Backlog, Em andamento e Revisão.
- **Somente o gestor** move para Concluído e tira de Concluído.
- Colaborador não arrasta cartões da coluna Concluído.

**Regras de edição de cartão:**
- **Somente o gestor** edita título, descrição, Story Points, atribui responsável e exclui.
- Colaborador só visualiza o detalhe do cartão.

**Regra do prazo (atraso):**
- O limite de dias de um cartão é igual aos seus **Story Points** (ex.: cartão de 5 pts tem 5 dias).
- O prazo começa a contar quando o cartão entra em "Em andamento" (ou da criação, se nunca saiu do Backlog).
- **"Pode atrasar"**: o cartão está no penúltimo dia do prazo (ou depois) e ainda não chegou em Revisão.
- **"Atrasado"**: o lead time passou do limite e o cartão não está Concluído.
- Cartão Concluído nunca está atrasado.

**Regras de histórico (auditoria):**
- Toda criação, movimentação e exclusão grava um **evento imutável** no histórico, no mesmo batch da operação.
- Mudança de status exige um evento "moved" vinculado (`lastEventId`) — as regras do Firestore impedem mover sem registrar.

---

### 6. Gerenciar equipe (`/projects/:id/team`) — só gestor

**Funcionalidades:**
- **Adicionar participante**: informar o e-mail de alguém que já tem conta no AgileFlow.
- **Lista de participantes**: nome e e-mail de cada membro, com botão **Remover** (com confirmação).

**Regras:**
- **Somente o gestor** acessa esta tela e gerencia membros.
- Só é possível adicionar e-mail já cadastrado no AgileFlow (a busca é feita no índice `userEmails`).
- Não é possível adicionar o próprio gestor nem alguém que já é participante.
- Ao adicionar, o sistema grava o `memberInfo` (nome + e-mail) no projeto, porque as regras não permitem ler o perfil de outro usuário.
- O membro adicionado passa a ver o projeto e os cartões, e pode mover cartões (exceto para Concluído).
- O gestor não pode se remover (ele é o dono).

---

### 7. Histórico (`/projects/:id/history`)

**Funcionalidades:**
- Lista cronológica (mais recente primeiro) de **tudo** que aconteceu nos cartões do projeto.
- Cada item mostra: ícone da ação, o cartão, **quem fez** (nome do usuário), a descrição da ação e a data/hora.
- Ícones: ➕ criação, ↔️ movimentação entre colunas, 🗑️ exclusão.
- Descrição em português (ex.: "Admin moveu de Backlog para Em andamento").

**Regras:**
- Membros do projeto (gestor e colaboradores) podem ver o histórico.
- O histórico é **imutável**: eventos não podem ser editados nem apagados (as regras do Firestore bloqueiam update/delete).
- Os eventos **sobrevivem** mesmo se o cartão ou o projeto forem excluídos.

---

### 8. Desempenho (`/projects/:id/performance`)

Métricas reais do projeto, calculadas a partir dos cartões e do histórico.

**Funcionalidades:**

**Indicadores (cards no topo):**
- **Total de cartões**, **Concluídos**, **Em andamento (WIP)**, **Story Points concluídos**.

**Distribuição por status:**
- Barras com a quantidade e porcentagem em cada coluna (Backlog, Em andamento, Revisão, Concluído).

**Desempenho e produtividade:**
- **Throughput**: cartões concluídos nos últimos 7 dias.
- **Cycle time médio**: tempo médio entre o cartão entrar em "Em andamento" e ser Concluído. Quando não há dados suficientes, a tela informa ("Cycle time indisponível") em vez de inventar número.

**⚠️ Cartões com prazo:**
- Lista dos cartões **Atrasados** (vermelho) e **Podem atrasar** (amarelo), com título e Story Points de cada um.

**AgileFlow AI (inteligência artificial com Google Gemini):**
- **Analisar projeto**: gera um diagnóstico do projeto com:
  - **Resumo** (visão geral com os números principais)
  - **Pontos fortes**
  - **Pontos de atenção**
  - **Gargalos**
  - **Sugestões** práticas de melhoria
- **Comparar projetos**: seleciona dois projetos (A e B) e a IA compara:
  - **Resumo** comparativo
  - **Melhor projeto**, **Maior throughput**, **Menor cycle time**, **Mais cartões parados**, **Melhor distribuição**
  - **O que o Projeto A faz melhor**
  - **Práticas do A que ajudariam o B**
  - **Gargalos** e **Melhorias** para cada projeto
- Análises anteriores ficam em cache local (a tela avisa "Esta é uma análise anterior").

**Regras:**
- Membros do projeto (gestor e colaboradores) podem ver as métricas e usar a IA.
- A IA recebe **apenas as métricas agregadas** (nunca dados dos cartões).
- A chamada à IA é autenticada: o Cloudflare Worker valida o token do Firebase e verifica se o usuário tem acesso ao projeto antes de chamar o Gemini.
- O cycle time só é calculado para cartões com histórico completo (entrada em andamento + conclusão).

---

### 9. Perfil (`/profile`)

**Funcionalidades:**
- Mostra o **nome** e o **e-mail** da conta logada.

**Regras:**
- Cada usuário só vê o próprio perfil (as regras do Firestore bloqueiam ler o perfil de outro usuário).

---

## Tabela de permissões (resumo)

| Ação | Gestor (dono do projeto) | Colaborador (membro) |
|---|---|---|
| Criar projeto | ✅ (vira gestor dele) | ✅ (vira gestor dele) |
| Ver projetos e cartões | ✅ | ✅ (só os projetos em que é membro) |
| Criar/editar/excluir cartões | ✅ | ❌ |
| Mover cartões (Backlog/Em andamento/Revisão) | ✅ | ✅ |
| Mover para/da coluna Concluído | ✅ | ❌ |
| Atribuir responsável a um cartão | ✅ | ❌ |
| Gerenciar equipe (adicionar/remover membros) | ✅ | ❌ |
| Ver histórico, métricas e relatórios de IA | ✅ | ✅ |
| Editar/excluir projeto | ✅ | ❌ |

---

## Detalhes técnicos úteis

- **Tempo real**: as telas usam `onSnapshot` do Firestore — qualquer mudança aparece na hora, sem F5.
- **Prazo do cartão**: o limite de dias de um cartão é igual aos seus Story Points. O prazo começa a contar quando o cartão entra em "Em andamento" (ou da criação, se nunca saiu do Backlog).
- **Responsável**: gravado no campo `assigneeId` do cartão; o nome exibido vem do `memberInfo` do projeto.
- **Segurança**: todas as permissões acima são enforced pelas regras do Firestore no servidor (não apenas escondendo botões na tela). Um usuário recém-cadastrado não consegue ler, editar ou apagar nada de projetos de terceiros (testado: 10/10 operações hostis bloqueadas).
- **Login com Google**: o botão existe na tela de Login e funciona quando o provedor Google está ativado no console do Firebase (Authentication → Sign-in method → Google).
