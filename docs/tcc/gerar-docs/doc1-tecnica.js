// Documento 1 — AgileFlow_Documentacao_Tecnica_Completa.docx
const { DocBuilder } = require('./docx-helper');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'docs', 'tcc', 'AgileFlow_Documentacao_Tecnica_Completa.docx');

async function main() {
  const d = new DocBuilder('AgileFlow — Documentação Técnica Completa');

  // ===================== 8.1 VISÃO GERAL =====================
  d.h1('1. Visão Geral do Sistema');
  d.h2('1.1 Objetivo');
  d.p('O AgileFlow é um sistema web de gestão ágil de projetos baseado em Kanban, com quatro colunas de trabalho (Backlog, Em andamento, Revisão e Concluído), Story Points, histórico de movimentações, métricas de fluxo e diagnóstico automatizado por inteligência artificial (Google Gemini).');
  d.h2('1.2 Problema que o sistema busca resolver');
  d.p('Equipes pequenas de desenvolvimento frequentemente carecem de visibilidade objetiva sobre o andamento dos seus projetos: onde o trabalho está parado, qual a vazão real de entregas e quanto tempo um item leva para ser concluído. Ferramentas genéricas de Kanban registram o quadro, mas não interpretam os dados. O AgileFlow resolve essa lacuna ao combinar o quadro Kanban em tempo real com métricas de fluxo (throughput, WIP, cycle time) e uma camada de análise por IA que transforma essas métricas em diagnósticos e recomendações em linguagem natural.');
  d.h2('1.3 Público-alvo');
  d.p('Equipes de desenvolvimento de software, gestores de projeto e estudantes/pesquisadores de métodos ágeis, em computadores e notebooks (aplicação exclusivamente web desktop).');
  d.h2('1.4 Escopo funcional');
  d.bullet('Cadastro e autenticação de usuários (e-mail/senha e Google).');
  d.bullet('Criação e gerenciamento de projetos com perfis de gestor (dono) e colaborador.');
  d.bullet('Quadro Kanban com quatro colunas, drag-and-drop e atualização em tempo real.');
  d.bullet('Story Points por cartão (1, 2, 3, 5, 8).');
  d.bullet('Histórico imutável de movimentações (criação, movimentação, exclusão).');
  d.bullet('Dashboard com indicadores agregados.');
  d.bullet('Métricas de fluxo: throughput, WIP, cycle time, distribuição por status.');
  d.bullet('Diagnóstico de projeto por IA e comparação entre dois projetos.');
  d.h2('1.5 Limitações');
  d.bullet('Aplicação exclusivamente web desktop; não há versão mobile nem responsividade para celulares.');
  d.bullet('O cycle time só pode ser calculado para cartões com evento de entrada em "Em andamento" e de conclusão; cartões sem esse histórico não entram na amostra.');
  d.bullet('A análise de IA depende da disponibilidade e das cotas da API Gemini; falhas do provedor são tratadas com mensagem de erro ao usuário.');
  d.bullet('Não há notificações, comentários em cartões nem anexos (não previstos no escopo).');
  d.h2('1.6 Justificativa da utilização de inteligência artificial');
  d.p('A IA foi integrada para interpretar métricas de fluxo — dados numéricos que, isoladamente, exigem experiência em métricas ágeis para serem lidos corretamente. O Gemini recebe somente as métricas calculadas (nunca dados brutos de cartões) e devolve um diagnóstico estruturado em JSON (resumo, pontos fortes, pontos de atenção, gargalos, sugestões), permitindo que gestores identifiquem gargalos e ações de melhoria sem conhecimento especializado. A eficiência da IA é avaliada com metodologia própria (ver documento "AgileFlow_Avaliacao_Eficiencia_IA").');

  // ===================== 8.2 ARQUITETURA =====================
  d.h1('2. Arquitetura da Aplicação');
  d.h2('2.1 Arquitetura geral');
  d.p('Arquitetura cliente-servidor com três camadas de serviço externo:');
  d.bullet('Frontend: aplicação Angular 20 (standalone components, zone-based change detection) servida pelo Firebase Hosting.');
  d.bullet('Backend-as-a-Service: Firebase Authentication (identidade) e Cloud Firestore (dados em tempo real via onSnapshot).');
  d.bullet('Camada de IA: Cloudflare Worker ("agileflow-ai") que autentica o usuário via JWT do Firebase, verifica o acesso ao projeto via REST do Firestore (respeitando as regras de segurança) e chama a API Gemini.');
  d.p('Diagrama da arquitetura (representação textual):');
  d.code('Navegador (Angular) ──► Firebase Auth (login/JWT)');
  d.code('Navegador (Angular) ──► Cloud Firestore (onSnapshot: projetos, cartões, eventos)');
  d.code('Navegador ──► Cloudflare Worker ──► Firestore REST (verifica acesso) ──► Gemini API (diagnóstico)');
  d.h2('2.2 Organização do frontend Angular');
  d.p('Componentes standalone (sem NgModule), roteamento com lazy loading por feature, estado reativo com Angular Signals e RxJS para streams do Firestore. O change detection é baseado em Zone.js (provideZoneChangeDetection com eventCoalescing).');
  d.h2('2.3 Firebase Authentication');
  d.p('Autenticação por e-mail/senha e provedor Google. O AuthService encapsula o SDK e expõe getUidWhenReady$(), que aguarda auth.authStateReady() antes de emitir o uid — essencial porque auth.currentUser é null imediatamente após um refresh (F5), mesmo com sessão válida.');
  d.h2('2.4 Cloud Firestore');
  d.p('Banco NoSQL em tempo real. As telas assinam consultas com onSnapshot (ex.: cartões de um projeto), de modo que qualquer escrita (inclusive a movimentação de cartões) reflete na interface sem recarregar a página. As regras de segurança do Firestore são a principal barreira de autorização (ver seção 7).');
  d.h2('2.5 Firebase Hosting');
  d.p('Hospedagem estática do build de produção (dist/agileflow/browser), com rewrite de todas as rotas para index.html (SPA), permitindo refresh em rotas internas sem erro 404.');
  d.h2('2.6 Cloudflare Worker');
  d.p('Worker "agileflow-ai" (TypeScript, runtime Workers) com duas rotas POST: /analyze (diagnóstico de um projeto) e /compare (comparação entre dois projetos). Responsabilidades: (1) autenticar o chamador verificando o JWT do Firebase (issuer/audience = projeto Firebase, JWKS do Google); (2) verificar o acesso ao projeto consultando o documento do projeto via REST do Firestore com o próprio token do usuário — ou seja, o Worker herda as regras de segurança; (3) chamar a API Gemini com a chave armazenada como secret (GEMINI_API_KEY) e devolver o JSON estruturado.');
  d.h2('2.7 Integração com Gemini');
  d.p('Modelo configurado: gemini-3.6-flash (variável GEMINI_MODEL no wrangler.toml). A chamada usa generationConfig com responseMimeType application/json, temperature 0.3 e maxOutputTokens 4096. Os prompts instruem a IA a usar apenas os dados fornecidos, não inventar métricas e responder em JSON com campos fixos.');
  d.h2('2.8 Fluxo de autenticação');
  d.code('1. Usuário faz login → Firebase Auth emite ID token (JWT).');
  d.code('2. Frontend guarda a sessão (persistência padrão do SDK, IndexedDB).');
  d.code('3. Chamadas ao Firestore levam o token automaticamente (regras leem request.auth).');
  d.code('4. Chamadas ao Worker levam o token no header Authorization: Bearer <token>.');
  d.h2('2.9 Fluxo das requisições à IA');
  d.code('1. Tela de Desempenho calcula métricas localmente (MetricsService).');
  d.code('2. AiService envia POST /analyze { projectId, metrics } com o ID token.');
  d.code('3. Worker valida o JWT, verifica acesso ao projeto no Firestore e chama o Gemini.');
  d.code('4. Worker devolve { diagnosis } ou { comparison }; a tela renderiza as seções.');

  // ===================== 8.3 TECNOLOGIAS =====================
  d.h1('3. Tecnologias Utilizadas');
  d.table(['Tecnologia', 'Versão', 'Finalidade', 'Justificativa técnica'], [
    ['Angular', '20.3.x', 'Framework do frontend (standalone, Signals, Router)', 'Componentes standalone eliminam NgModules; Signals dão reatividade fina e previsível para o quadro Kanban.'],
    ['TypeScript', '5.9.x', 'Linguagem do frontend e do Worker', 'Tipagem estática reduz erros de contrato entre camadas (interfaces ICard, IProject, ICardEvent).'],
    ['RxJS', '7.8.x', 'Streams assíncronos (Observables)', 'Integração natural com onSnapshot do Firestore e operadores (switchMap, combineLatest).'],
    ['Zone.js', '0.15.x', 'Change detection do Angular', 'Dispara verificação de mudanças após eventos e tarefas assíncronas.'],
    ['Firebase JS SDK', '12.16.x', 'Auth + Firestore no cliente', 'SDK oficial; onSnapshot fornece tempo real sem polling.'],
    ['Firebase Authentication', '(serviço)', 'Identidade de usuários', 'E-mail/senha e Google sem backend próprio; JWT usado também pelo Worker.'],
    ['Cloud Firestore', '(serviço)', 'Banco de dados em tempo real', 'Consultas reativas, regras de segurança declarativas, índices compostos.'],
    ['Firebase Hosting', '(serviço)', 'Hospedagem do frontend', 'CDN global, rewrite para SPA, deploy via CLI.'],
    ['Cloudflare Workers', '(plataforma)', 'Backend da camada de IA', 'Execução na borda, baixa latência, secrets nativos, sem servidor dedicado.'],
    ['Google Gemini API', 'gemini-3.6-flash', 'Diagnóstico e comparação de projetos', 'Modelo estável, resposta em JSON estruturado, bom custo/latência.'],
    ['jose (Worker)', '6.x', 'Verificação de JWT no Worker', 'Valida issuer/audience do Firebase com JWKS remoto do Google.'],
    ['Jasmine + Karma', '5.9 / 6.4', 'Testes unitários do Angular', 'Stack padrão do Angular CLI.'],
    ['@firebase/rules-unit-testing + Mocha', '5.0.2 / 12.x', 'Testes das regras do Firestore', 'Executa as regras reais no emulador e valida permissões positivas e negativas.'],
    ['firebase-tools', '15.34.x', 'CLI de deploy e emuladores', 'Deploy de regras/índices/hosting e emulação local de Auth/Firestore.'],
    ['Wrangler', '4.156.x', 'CLI do Cloudflare Workers', 'Deploy e gerenciamento de secrets do Worker.'],
  ]);

  // ===================== 8.4 ESTRUTURA DO CÓDIGO =====================
  d.h1('4. Estrutura do Código');
  d.h2('4.1 Organização das pastas (src/app)');
  d.table(['Pasta', 'Responsabilidade'], [
    ['core/', 'Inicialização do Firebase (firebase.ts) e auth.guard.ts (proteção de rotas).'],
    ['services/', 'Serviços injetáveis: auth, user, project, card, metrics, ai.'],
    ['models/', 'Classes de domínio com fromFirestore(): Card, Project, CardEvent, User, Comment.'],
    ['interfaces/', 'Contratos TypeScript (ICard, IProject, ICardEvent, IUser, IProjectMetrics...).'],
    ['features/', 'Telas: login, register, dashboard, projects, kanban, card-detail, project-team, project-history, project-performance, profile.'],
    ['shared/layout/', 'Layout com sidebar e header usado pelas rotas autenticadas.'],
    ['environments/', 'environment.ts (produção) e environment.emulator.ts (emuladores locais).'],
  ]);
  d.h2('4.2 Rotas (app.routes.ts)');
  d.p('Rotas públicas: /login e /register. Todas as demais ficam sob o Layout com canActivate: [authGuard], que redireciona para /login quando não há uid autenticado. Rotas internas: /dashboard, /projects, /projects/:projectId/kanban, /projects/:projectId/team, /projects/:projectId/history, /projects/:projectId/performance, /profile. Rota coringa ** redireciona para /dashboard.');
  d.h2('4.3 Serviços e responsabilidades');
  d.table(['Arquivo', 'Responsabilidades principais'], [
    ['services/auth.service.ts', 'Login, registro, Google, logout, getUidWhenReady$(), getIdToken(), mapeamento de erros de auth para pt-BR.'],
    ['services/user.service.ts', 'Perfil em users/{uid} e índice userEmails/{email} (busca de colaborador por e-mail).'],
    ['services/project.service.ts', 'CRUD de projetos, watchProjects$ (ownerId + orderBy createdAt), membros (arrayUnion/arrayRemove), findUserByEmail.'],
    ['services/card.service.ts', 'CRUD de cartões com writeBatch, updateCardStatus com evento "moved" no mesmo batch (lastEventId), watchCardsByProject$ (onSnapshot), getProjectEvents, deleteCardsByProject em lotes.'],
    ['services/metrics.service.ts', 'calculateProjectMetrics (função pura): distribuição por status, throughput no período, cycle time médio a partir dos eventos.'],
    ['services/ai.service.ts', 'Chamadas autenticadas ao Worker (/analyze, /compare), cache local de diagnósticos, tratamento de erros (429, timeout 35s).'],
  ]);
  d.h2('4.4 Interfaces e modelos');
  d.p('ICard: id, projectId, title, description, status (todo|inProgress|review|done), storyPoints (1|2|3|5|8), createdBy, createdAt, updatedAt, completedAt?, lastEventId?. ICardEvent: cardId, projectId, type (created|moved|deleted), fromStatus, toStatus, storyPoints, createdBy, createdAt. IProject: name, description, ownerId, memberIds, memberInfo, createdAt, updatedAt.');

  // ===================== 8.5 BANCO DE DADOS =====================
  d.h1('5. Banco de Dados (Cloud Firestore)');
  d.h2('5.1 Coleções e campos');
  d.table(['Coleção', 'Campos', 'Observações'], [
    ['users/{uid}', 'uid, nome, email, criadoEm, atualizadoEm', 'Perfil do usuário; leitura/escrita apenas pelo próprio.'],
    ['userEmails/{email}', 'uid', 'Índice de busca por e-mail; get permitido a autenticados, list proibido.'],
    ['projects/{projectId}', 'name, description, ownerId, memberIds[], memberInfo{}, createdAt, updatedAt', 'ownerId imutável; memberIds editável só pelo dono.'],
    ['cards/{cardId}', 'projectId, title, description, status, storyPoints, createdBy, createdAt, updatedAt, completedAt?, lastEventId?', 'status ∈ todo|inProgress|review|done; storyPoints ∈ 1,2,3,5,8.'],
    ['cardEvents/{eventId}', 'cardId, projectId, type, fromStatus, toStatus, storyPoints, createdBy, createdAt', 'Imutável (update/delete proibidos); sobrevive à exclusão do cartão.'],
  ]);
  d.h2('5.2 Relacionamentos lógicos');
  d.bullet('projects 1—N cards (cards.projectId → projects.id).');
  d.bullet('cards 1—N cardEvents (cardEvents.cardId → cards.id); cards.lastEventId aponta para o evento da última mudança de status.');
  d.bullet('projects N—N users via memberIds (colaboradores) e ownerId (gestor).');
  d.h2('5.3 Exemplo estrutural (fictício, apenas ilustrativo)');
  d.code('cards/abc123 = { projectId: "proj1", title: "Exemplo", description: "", status: "inProgress", storyPoints: 3, createdBy: "uid1", createdAt: <server>, updatedAt: <server>, completedAt: null, lastEventId: "evt9" }');
  d.code('cardEvents/evt9 = { cardId: "abc123", projectId: "proj1", type: "moved", fromStatus: "todo", toStatus: "inProgress", storyPoints: 3, createdBy: "uid1", createdAt: <server> }');
  d.h2('5.4 Índices (firestore.indexes.json)');
  d.table(['Coleção', 'Campos', 'Consulta atendida'], [
    ['projects', 'ownerId ASC, createdAt DESC', 'Listagem de projetos do usuário (ProjectService.watchProjects$).'],
    ['cards', 'projectId ASC, createdAt ASC', 'Cartões do projeto em ordem de criação (Kanban).'],
    ['cardEvents', 'projectId ASC, createdAt DESC', 'Histórico do projeto, mais recente primeiro.'],
  ]);
  d.h2('5.5 Regras de segurança (resumo)');
  d.p('As regras completas estão em firestore.rules e são validadas por 64 testes automatizados. Pontos centrais: leitura de cards/eventos exige membership do projeto (isProjectMember via get() do projeto); mudança de status exige evento "moved" criado no mesmo batch e referenciado por lastEventId (statusChangeHasEvent com existsAfter/getAfter); colaborador só move entre todo/inProgress/review; somente o dono move para done, edita campos e exclui; eventos são imutáveis.');

  // ===================== 8.6 FUNCIONALIDADES =====================
  d.h1('6. Funcionalidades Implementadas');
  d.h2('6.1 Cadastro e autenticação');
  d.p('Cadastro com nome, e-mail e senha (validação de confirmação de senha). O registro cria a conta no Firebase Auth, grava o perfil em users/{uid} e o índice userEmails/{email}. Login por e-mail/senha ou Google. Logout pelo header. A sessão persiste entre reloads (IndexedDB do SDK).');
  d.h2('6.2 Perfis e permissões');
  d.p('Não há perfil global. O gestor de um projeto é o seu ownerId; colaboradores são os uids em memberIds. Quem cria um projeto torna-se seu gestor. Colaboradores leem e movem cartões (exceto para Concluído); apenas o gestor cria, edita, exclui cartões, move para Concluído e gerencia a equipe.');
  d.h2('6.3 Projetos e colaboradores');
  d.p('Criação, edição (nome/descrição) e exclusão de projetos (a exclusão remove antes os cartões em lotes, preservando os eventos). Gerenciamento de equipe por e-mail: o sistema busca o uid em userEmails e adiciona/remove em memberIds (arrayUnion/arrayRemove).');
  d.h2('6.4 Kanban');
  d.p('Quatro colunas fixas (Backlog=todo, Em andamento=inProgress, Revisão=review, Concluído=done). Drag-and-drop com a API nativa HTML5: dragstart guarda o id do cartão; drop chama CardService.updateCardStatus, que grava status + evento "moved" + lastEventId em um único writeBatch. A atualização da tela ocorre pelo onSnapshot da consulta de cartões — sem recarregar a página. Colaborador não arrasta cartões da coluna Concluído nem para ela.');
  d.h2('6.5 Histórico');
  d.p('Cada criação, movimentação e exclusão grava um documento imutável em cardEvents, no mesmo batch da operação principal. A tela de Histórico lista os eventos do projeto em ordem cronológica reversa, com título do cartão, ação, usuário e data/hora.');
  d.h2('6.6 Dashboard');
  d.p('Indicadores agregados: total de projetos do usuário, total de cartões, cartões em andamento e concluídos. A consulta de cartões é feita por projeto (getCardsByProject$ para cada projeto do usuário, combinadas com combineLatest), pois as regras de segurança exigem o filtro por projectId.');
  d.h2('6.7 Métricas');
  d.p('MetricsService.calculateProjectMetrics (função pura e testável): distribuição por status, concluídos, story points concluídos, WIP (inProgress), throughput (eventos moved→done no período de 7 dias) e cycle time médio (intervalo entre o primeiro moved→inProgress e o primeiro moved→done posterior, por cartão). Cycle time fica null quando não há amostra — a tela informa a indisponibilidade em vez de inventar números.');
  d.h2('6.8 Diagnóstico com IA e comparação');
  d.p('A tela de Desempenho envia as métricas ao Worker, que chama o Gemini e devolve JSON com resumo, pontos fortes, pontos de atenção, gargalos e sugestões. A comparação entre dois projetos envia as duas métricas e devolve veredito (melhor projeto, maior throughput, menor cycle time, mais cartões parados, melhor distribuição), gargalos e melhorias por projeto. Diagnósticos são cacheados localmente por projeto/usuário.');

  // ===================== 8.7 SEGURANÇA =====================
  d.h1('7. Segurança');
  d.h2('7.1 Autenticação e autorização');
  d.p('Autenticação delegada ao Firebase Auth. A autorização é aplicada em três camadas: (1) regras do Firestore (barreira principal, avaliadas no servidor do Google); (2) verificações no CardService (requireProjectOwner, requireCanMoveTo) para mensagens de erro amigáveis; (3) Worker, que valida o JWT e consulta o projeto com o token do próprio usuário.');
  d.h2('7.2 Proteção de rotas');
  d.p('authGuard bloqueia todas as rotas internas para usuários não autenticados, aguardando authStateReady() para não expulsar sessões válidas durante o F5.');
  d.h2('7.3 Testes de segurança executados');
  d.bullet('64 testes automatizados das regras do Firestore (emulador), cobrindo criação, leitura, atualização, exclusão, vínculo obrigatório de eventos, imutabilidade do histórico e limites de batch.');
  d.bullet('Teste de penetração manual em produção (05/11/2026): com um usuário recém-cadastrado, 10 operações hostis contra projeto e dados de terceiros (ler/editar/apagar projeto alheio, listar cartões/eventos, criar cartão, auto-promover-se a membro, mover cartão para done, listar todos os projetos, ler perfil alheio) — 10/10 bloqueadas com permission-denied. Evidência: docs/tcc/evidencias/seguranca/etapa-1.1-usuario-novo-permissoes.md.');
  d.h2('7.4 Correções de vulnerabilidades/problemas identificados');
  d.bullet('Kanban não atualizava após drag-and-drop: causa raiz era a versão publicada das regras do Firestore estar desatualizada em relação ao código (leitura de cartões exigia createdBy == uid, incompatível com a consulta por projectId). Correção: publicação das regras atuais no projeto agileflow-tcc. Nenhuma regra foi afrouxada — a leitura continua restrita a membros do projeto.');
  d.bullet('Dashboard preso em estado de carregamento: a consulta de cartões por createdBy não era provável pelas regras. Correção: consulta por projeto (getCardsByProject$), sem alterar regras.');
  d.bullet('Listener do Firestore morria silenciosamente em caso de erro: adicionado log de erro no callback do onSnapshot (card.service.ts) para diagnóstico.');
  d.h2('7.5 Proteção das chamadas à IA');
  d.p('O Worker exige Authorization: Bearer <ID token do Firebase>, valida assinatura/issuer/audience via JWKS do Google e verifica o acesso ao projeto via REST do Firestore com o token do usuário (um não-membro recebe 403). A chave do Gemini é um secret do Worker (GEMINI_API_KEY) e nunca é exposta ao frontend. Nenhum dado de cartão é enviado à IA — apenas métricas agregadas.');

  // ===================== 8.8 INTERFACE =====================
  d.h1('8. Interface e Usabilidade');
  d.p('A interface foi desenvolvida exclusivamente para navegadores em computadores e notebooks. Layout com sidebar de navegação (Dashboard, Projetos, Perfil) e área de conteúdo. Telas de autenticação centralizadas com validação inline. Kanban com colunas de largura uniforme e cartões com título, descrição resumida e story points. Estados de carregamento e mensagens de erro em português brasileiro em todas as telas. (A modernização visual completa — tema escuro e diferenciação cromática das colunas — está registrada como etapa posterior à presente documentação.)');

  // ===================== 8.9 REQUISITOS =====================
  d.h1('9. Requisitos');
  d.h2('9.1 Requisitos funcionais (implementados e validados)');
  d.table(['ID', 'Requisito', 'Validação'], [
    ['RF01', 'Cadastro e login (e-mail/senha e Google), logout e persistência de sessão', 'Testado em produção (login/logout/F5).'],
    ['RF02', 'Criar, editar, excluir projetos; criador vira gestor do projeto', 'Testado em produção.'],
    ['RF03', 'Adicionar/remover colaboradores por e-mail', 'Implementado (project-team); testado em regras.'],
    ['RF04', 'Kanban com 4 colunas, drag-and-drop e atualização em tempo real', 'Testado em produção (20 movimentações sem F5).'],
    ['RF05', 'Story Points 1/2/3/5/8 por cartão', 'Regras + testes.'],
    ['RF06', 'Histórico imutável de movimentações', 'Testado em produção (eventos created/moved).'],
    ['RF07', 'Dashboard com indicadores agregados', 'Testado em produção.'],
    ['RF08', 'Métricas de fluxo (throughput, WIP, cycle time, distribuição)', 'Testado em produção.'],
    ['RF09', 'Diagnóstico de projeto por IA', 'Testado em produção (ver Avaliação da IA).'],
    ['RF10', 'Comparação entre dois projetos por IA', 'Testado em produção.'],
  ]);
  d.h2('9.2 Requisitos não funcionais');
  d.table(['ID', 'Requisito', 'Situação'], [
    ['RNF01', 'Aplicação web desktop (Chrome/Edge), sem versão mobile', 'Atendido.'],
    ['RNF02', 'Tempo de resposta da UI à movimentação < 1s em condições normais', 'Medido: média ~250 ms (ver Relatório de Desempenho).'],
    ['RNF03', 'Autorização no servidor (regras Firestore), não apenas na UI', 'Atendido e testado.'],
    ['RNF04', 'Nenhum segredo no frontend; chave do Gemini em secret do Worker', 'Verificado no bundle de produção.'],
    ['RNF05', 'Código TypeScript tipado, componentes standalone', 'Atendido.'],
  ]);
  d.h2('9.3 Regras de negócio');
  d.bullet('RN01: Todo cartão nasce em Backlog (todo).');
  d.bullet('RN02: Colaborador move cartões entre Backlog/Em andamento/Revisão; somente o gestor move para Concluído e edita/exclui cartões.');
  d.bullet('RN03: Toda mudança de status grava um evento "moved" no mesmo batch, referenciado por lastEventId (auditoria obrigatória).');
  d.bullet('RN04: Eventos são imutáveis e sobrevivem à exclusão do cartão e do projeto.');
  d.bullet('RN05: completedAt é gravado ao entrar em Concluído e limpo ao sair; não muda em movimentações entre outras colunas.');
  d.bullet('RN06: O cycle time só é calculado com histórico suficiente (entrada em andamento + conclusão).');
  d.h2('9.4 Atores e casos de uso');
  d.table(['Ator', 'Casos de uso'], [
    ['Visitante', 'Cadastrar-se; fazer login.'],
    ['Gestor de projeto', 'Criar/editar/excluir projeto; gerenciar equipe; criar/editar/excluir cartões; mover cartões para qualquer coluna; ver histórico, métricas, diagnóstico e comparação.'],
    ['Colaborador', 'Ver projetos de que participa; mover cartões (exceto Concluído); ver histórico, métricas, diagnóstico e comparação.'],
  ]);
  d.h2('9.5 Requisitos planejados/pendentes');
  d.bullet('Modernização visual completa (tema escuro, diferenciação cromática das colunas) — etapa posterior a esta documentação.');
  d.bullet('Comentários em cartões e notificações — fora do escopo atual.');

  // ===================== 8.10 DESENVOLVIMENTO =====================
  d.h1('10. Desenvolvimento e Validação');
  d.h2('10.1 Processo e principais desafios técnicos');
  d.bullet('Atualização em tempo real do Kanban: a falha observada (cartão só aparecia na nova coluna após F5) foi rastreada até a divergência entre as regras publicadas e o código — o listener onSnapshot morria com permission-denied. A correção foi publicar as regras atuais; a cadeia Signals/change detection foi comprovada íntegra por testes dedicados (kanban.drag.spec.ts).');
  d.bullet('Restauração de sessão: auth.currentUser é null logo após F5; getUidWhenReady$() aguarda authStateReady() antes de liberar consultas.');
  d.bullet('Consultas prováveis pelas regras: o Firestore rejeita list cuja regra não pode ser provada pelos filtros da própria consulta; por isso cartões e eventos são sempre consultados com filtro de projectId.');
  d.bullet('Auditoria consistente: mudança de status e evento "moved" no mesmo writeBatch, com vínculo lastEventId verificado pelas regras (existsAfter/getAfter).');
  d.h2('10.2 Estratégias de teste e resultados comprovados');
  d.table(['Suíte', 'Ferramenta', 'Resultado'], [
    ['Regras do Firestore', 'Mocha + @firebase/rules-unit-testing (emulador)', '64/64 aprovados'],
    ['CardService contra regras reais', 'Jasmine/Karma + emuladores Auth/Firestore', '9/9 aprovados'],
    ['Testes unitários do frontend', 'Jasmine/Karma (ChromeHeadless)', '27/27 aprovados'],
    ['Drag-and-drop e change detection', 'kanban.drag.spec.ts', '4/4 aprovados'],
    ['Teste de penetração manual (produção)', 'Navegador + SDK', '10/10 operações hostis bloqueadas'],
    ['Fluxos E2E em produção', 'Playwright (navegador)', 'Kanban, histórico, métricas, IA e comparação validados'],
  ]);
  d.h2('10.3 Limitações conhecidas');
  d.bullet('O cycle time dos cenários de demonstração é artificialmente baixo (cartões criados e concluídos na mesma sessão).');
  d.bullet('A disponibilidade da IA depende do provedor; sob demanda alta o Gemini pode responder 503 transitório (tratado com mensagem ao usuário).');
  d.bullet('Sem testes automatizados de UI (E2E em CI); os fluxos foram validados manualmente com automação de navegador.');

  await d.save(OUT);
  console.log('OK:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
