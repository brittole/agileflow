# Etapa 1.1 — Investigação: "usuário novo vira administrador"

**Data:** 2026-11-05
**Ambiente:** produção — https://agileflow-tcc.web.app (projeto Firebase `agileflow-tcc`)
**Conta de teste criada para a investigação:** `colaborador-teste@agileflow-tcc.dev` (uid `VhrFLLXkqYf29OYjekIBraUoH0M2`)

## Pergunta da investigação

Um usuário recém-cadastrado recebe privilégios administrativos indevidos?

## Análise estática do código

- Não existe perfil/role **global** no sistema. [src/app/interfaces/user.interface.ts](../../../../src/app/interfaces/user.interface.ts) define `IUserProfile` apenas com `uid, nome, email, criadoEm, atualizadoEm` — sem campo `role`/`admin`.
- Toda a autorização é **por projeto**: `projects.ownerId` (gestor) e `projects.memberIds` (colaboradores), verificados pelas regras do Firestore (`isProjectOwner` / `isProjectMember` em `firestore.rules`).
- O cadastro ([register.ts](../../../../src/app/features/register/register.ts) → [user.service.ts](../../../../src/app/services/user.service.ts) `createUserProfile`) grava somente `users/{uid}` e `userEmails/{email}` — nenhuma permissão é atribuída no cadastro.

## Teste dinâmico contra as regras de produção

Com o usuário recém-cadastrado autenticado, foram executadas 10 operações hostis contra o projeto alheio `diDD2zWbewq9JqStuVaX` ("Projeto TCC Real", de outra conta) e contra dados de outro usuário:

| # | Operação tentada | Resultado |
|---|---|---|
| 1 | Ler projeto alheio (`getDoc projects/{id}`) | ❌ `permission-denied` |
| 2 | Listar cartões do projeto alheio | ❌ `permission-denied` |
| 3 | Listar eventos (histórico) do projeto alheio | ❌ `permission-denied` |
| 4 | Criar cartão no projeto alheio | ❌ `permission-denied` |
| 5 | Editar projeto alheio (renomear) | ❌ `permission-denied` |
| 6 | Apagar projeto alheio | ❌ `permission-denied` |
| 7 | Auto-promover-se a membro (`memberIds: arrayUnion(uid)`) | ❌ `permission-denied` |
| 8 | Mover cartão alheio para `done` | ❌ `permission-denied` |
| 9 | Listar todos os projetos (`collection(projects)` sem filtro) | ❌ `permission-denied` |
| 10 | Ler perfil de outro usuário (`users/{outroUid}`) | ❌ `permission-denied` |

**10/10 operações bloqueadas pelas regras do Firestore.**

## Comportamento observado que explica o relato

O usuário recém-cadastrado **consegue criar um projeto próprio** e, nele, torna-se automaticamente o gestor (`ownerId = seu uid`). Nesse projeto próprio ele pode criar/mover/editar/excluir cartões e gerenciar a equipe.

Esse é o comportamento previsto pela regra de negócio: "usuários podem criar e administrar seus próprios projetos". Não há concessão de privilégio administrativo **global** nem sobre projetos de terceiros.

## Conclusão

**Não confirmada a existência de falha de elevação de privilégio.** O que ocorre é: quem cria um projeto é gestor **daquele projeto** — por design. As regras do Firestore impedem qualquer ação sobre projetos e dados de terceiros, inclusive auto-promoção (`memberIds` só pode ser alterado pelo dono, e `ownerId` é imutável).

## Limitações

- O teste cobriu as operações expostas pelo cliente web. Não foram testados caminhos que exijam credenciais de serviço (Admin SDK), pois o sistema não os utiliza.
- Se o relato original tiver um passo a passo diferente (ex.: usuário novo conseguiu agir **num projeto de outra pessoa**), é necessário reproduzir com os detalhes exatos.
