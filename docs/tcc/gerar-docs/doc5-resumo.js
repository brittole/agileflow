// Documento 5 — AgileFlow_Resumo_Para_Equipe_TCC.docx
const { DocBuilder } = require('./docx-helper');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'docs', 'tcc', 'AgileFlow_Resumo_Para_Equipe_TCC.docx');

async function main() {
  const d = new DocBuilder('AgileFlow — Resumo para a Equipe do TCC');

  d.h1('1. O que é o AgileFlow');
  d.p('Sistema web (desktop) de gestão ágil de projetos com Kanban de quatro colunas, Story Points, histórico de movimentações, métricas de fluxo e diagnóstico por inteligência artificial (Google Gemini). URL pública: https://agileflow-tcc.web.app.');
  d.h2('1.1 Problema que resolve');
  d.p('Quadros Kanban mostram onde as tarefas estão, mas não interpretam o fluxo. O AgileFlow calcula métricas (throughput, WIP, cycle time) e usa IA para transformar esses números em diagnóstico e recomendações em linguagem acessível a qualquer gestor.');

  d.h1('2. Como funciona (visão rápida)');
  d.bullet('Usuário se cadastra e cria um projeto — quem cria é o gestor (admin) daquele projeto.');
  d.bullet('O gestor adiciona colaboradores por e-mail. Colaboradores veem e movem cartões, mas só o gestor conclui (coluna Concluído), edita e exclui.');
  d.bullet('O Kanban tem 4 colunas (Backlog, Em andamento, Revisão, Concluído) e atualiza em tempo real ao arrastar — sem F5.');
  d.bullet('Toda movimentação grava um evento imutável de histórico (auditoria).');
  d.bullet('A tela Desempenho mostra métricas e dois recursos de IA: diagnóstico do projeto e comparação entre dois projetos.');

  d.h1('3. Tecnologias e arquitetura');
  d.table(['Camada', 'Tecnologia', 'Papel'], [
    ['Frontend', 'Angular 20 + TypeScript + RxJS + Signals', 'SPA com rotas lazy, estado reativo, Kanban em tempo real.'],
    ['Identidade', 'Firebase Authentication', 'Login e-mail/senha e Google; emite JWT usado em tudo.'],
    ['Dados', 'Cloud Firestore', 'Banco em tempo real; onSnapshot atualiza a tela sem reload; regras de segurança no servidor.'],
    ['Hospedagem', 'Firebase Hosting', 'Serve o build com rewrite para SPA (sem 404 em rotas internas).'],
    ['IA (backend)', 'Cloudflare Worker + Gemini API', 'Valida o JWT, checa acesso ao projeto e chama o Gemini; chave da IA fica em secret, nunca no frontend.'],
  ]);
  d.p('Detalhes completos: ver "AgileFlow_Documentacao_Tecnica_Completa.docx".');

  d.h1('4. Funcionalidades implementadas');
  d.table(['Funcionalidade', 'Estado', 'Onde ver'], [
    ['Autenticação (cadastro, login, logout, F5)', 'Funcionando', 'Testado em produção'],
    ['Projetos e colaboradores', 'Funcionando', 'Testado em produção'],
    ['Kanban com drag-and-drop em tempo real', 'Funcionando', 'Testado em produção (20 movimentações sem F5)'],
    ['Histórico imutável', 'Funcionando', 'Eventos created/moved verificados'],
    ['Dashboard com indicadores', 'Funcionando', 'Corrigido e validado'],
    ['Métricas (throughput, WIP, cycle time)', 'Funcionando', 'Tela Desempenho'],
    ['Diagnóstico IA', 'Funcionando', 'Cenários 1 e 2'],
    ['Comparação entre projetos (IA)', 'Funcionando', 'Cenário 3'],
  ]);

  d.h1('5. Como a IA foi integrada e avaliada');
  d.p('A IA recebe apenas métricas agregadas (nunca dados de cartões) e responde em JSON estruturado. A eficiência foi avaliada com rubrica própria (notas 1–5 em correção factual, relevância, consistência, clareza e utilidade), com 3 cenários reais. Resultados: 100% das afirmações verificáveis corretas (24/24), conclusões consistentes entre execuções repetidas, gargalo identificado corretamente. Detalhes: "AgileFlow_Avaliacao_Eficiencia_IA.docx".');

  d.h1('6. Testes executados e resultados');
  d.table(['Tipo de teste', 'Ferramenta', 'Resultado'], [
    ['Regras de segurança do Firestore', 'Mocha + emulador', '64/64 aprovados'],
    ['Serviço de cartões contra regras reais', 'Jasmine + emuladores', '9/9 aprovados'],
    ['Testes unitários do frontend', 'Jasmine/Karma', '27/27 aprovados'],
    ['Drag-and-drop / change detection', 'Jasmine/Karma', '4/4 aprovados'],
    ['Segurança (penetração manual)', 'Navegador + SDK', '10/10 ataques bloqueados'],
    ['Desempenho (carga, Firestore, Kanban, IA)', 'Playwright + Lighthouse', 'Ver relatório de desempenho'],
    ['Lighthouse desktop', 'Lighthouse 13.6', 'Performance 100, A11y 97, BP 100, SEO 82'],
  ]);
  d.p('Detalhes e dados brutos: "AgileFlow_Relatorio_Testes_Desempenho.docx" e pasta docs/tcc/evidencias/.');

  d.h1('7. Limitações que permanecem');
  d.bullet('Aplicação exclusivamente web desktop (sem versão mobile).');
  d.bullet('Cycle time só existe para cartões com histórico completo (entrada em andamento + conclusão); cenários de demonstração têm cycle time artificialmente baixo.');
  d.bullet('A IA depende da disponibilidade do Gemini; sob demanda alta pode ocorrer 503 transitório (tratado com mensagem ao usuário).');
  d.bullet('Sem testes E2E automatizados em CI; fluxos validados com automação de navegador em produção.');
  d.bullet('Modernização visual (tema escuro) é etapa posterior a esta documentação.');

  d.h1('8. Onde encontrar as evidências');
  d.table(['Conteúdo', 'Local'], [
    ['Documentação técnica completa', 'docs/tcc/AgileFlow_Documentacao_Tecnica_Completa.docx'],
    ['Relatório de desempenho', 'docs/tcc/AgileFlow_Relatorio_Testes_Desempenho.docx'],
    ['Avaliação da IA', 'docs/tcc/AgileFlow_Avaliacao_Eficiencia_IA.docx'],
    ['Cenários demonstrativos (com prints)', 'docs/tcc/AgileFlow_Cenarios_Demonstrativos.docx'],
    ['Prints e dados brutos', 'docs/tcc/evidencias/ (cenario-01, cenario-02, cenario-03, performance, seguranca, testes-funcionais)'],
    ['Relatório Lighthouse original', 'docs/tcc/evidencias/performance/lighthouse-5.5.report.html'],
  ]);
  d.p('Sugestão de uso na escrita: capítulo de Desenvolvimento ← Documentação Técnica (seções 2–6); capítulo de Testes ← Relatório de Desempenho + Avaliação da IA; capítulo de Resultados ← Cenários Demonstrativos; Conclusão ← limitações (seção 7 acima).');

  await d.save(OUT);
  console.log('OK:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
