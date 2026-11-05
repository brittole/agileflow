// Documento 2 — AgileFlow_Relatorio_Testes_Desempenho.docx
const { DocBuilder } = require('./docx-helper');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'docs', 'tcc', 'AgileFlow_Relatorio_Testes_Desempenho.docx');
const PERF = path.join(ROOT, 'docs', 'tcc', 'evidencias', 'performance');

function readJson(f) { return JSON.parse(fs.readFileSync(path.join(PERF, f), 'utf8').replace(/^﻿/, '')); }

async function main() {
  const nav = readJson('raw-5.1-carregamento-navegacao.json');
  const fs5 = readJson('raw-5.2-firestore.json');
  const kanban = readJson('raw-5.3-kanban-drag.json');
  const gemini = readJson('raw-5.4-gemini.json');
  const lh = JSON.parse(fs.readFileSync(path.join(PERF, 'lighthouse-5.5.report.json'), 'utf8'));

  const d = new DocBuilder('AgileFlow — Relatório de Testes de Desempenho');

  d.h1('1. Objetivo e Escopo');
  d.p('Medir o desempenho real do AgileFlow em produção (https://agileflow-tcc.web.app), cobrindo carregamento, navegação, consultas ao Firestore, reatividade do Kanban e chamadas à IA. Todos os testes foram executados em navegador desktop (Chrome, modo headless para o Lighthouse e headed para os fluxos), em 05/11/2026, na conta de teste administradora, contra o projeto Firebase agileflow-tcc.');
  d.h2('1.1 Ambiente e ferramentas');
  d.table(['Item', 'Valor'], [
    ['URL testada', 'https://agileflow-tcc.web.app'],
    ['Navegador', 'Chrome 156 (desktop)'],
    ['Automação', 'Playwright (fluxos e medições), Lighthouse 13.6 (auditoria desktop)'],
    ['Backend', 'Firebase (Auth, Firestore, Hosting) + Cloudflare Worker + Gemini API'],
    ['Rede', 'Residencial (valores incluem latência real de internet)'],
    ['Data', '05/11/2026'],
  ]);
  d.h2('1.2 Metodologia');
  d.p('Cada medição registra objetivo, procedimento, quantidade de execuções, resultados individuais, média, mínimo e máximo. As medições de navegação usam Date.now() entre o início da navegação e a renderização do elemento-alvo; as de Firestore usam performance.now() em torno das chamadas do SDK; as do Kanban medem do evento drop até o cartão aparecer na coluna de destino no DOM; as de IA medem do clique até o relatório renderizar. Nenhuma medição foi inventada ou alterada. Os dados brutos estão em docs/tcc/evidencias/performance/.');

  d.h1('2. Carregamento e Navegação (10 execuções cada)');
  d.table(['Teste', 'n', 'Média (ms)', 'Mín (ms)', 'Máx (ms)'], [
    ['Carregamento inicial (/)', nav.carregamentoInicial.n, nav.carregamentoInicial.media, nav.carregamentoInicial.min, nav.carregamentoInicial.max],
    ['Dashboard (até indicadores)', nav.dashboard.n, nav.dashboard.media, nav.dashboard.min, nav.dashboard.max],
    ['Kanban (até colunas e cartões)', nav.kanban.n, nav.kanban.media, nav.kanban.min, nav.kanban.max],
    ['Métricas/Desempenho', nav.metricas.n, nav.metricas.media, nav.metricas.min, nav.metricas.max],
  ]);
  d.p('Interpretação: o carregamento inicial é rápido (média 216 ms) porque o bundle é servido pelo CDN do Firebase Hosting. As telas internas levam ~1,3–1,9 s porque incluem autenticação restaurada + primeira resposta do onSnapshot do Firestore. Limitação: medições incluem latência de rede residencial e cache do navegador entre execuções consecutivas (valores após a primeira navegação tendem a ser menores).');

  d.h1('3. Firestore (10 execuções cada)');
  d.table(['Operação', 'n', 'Média (ms)', 'Mín (ms)', 'Máx (ms)'], [
    ['Consulta de projetos (ownerId + orderBy)', fs5.queryProjetos.n, fs5.queryProjetos.media, fs5.queryProjetos.min, fs5.queryProjetos.max],
    ['Consulta de cartões do projeto (projectId + orderBy)', fs5.queryCards.n, fs5.queryCards.media, fs5.queryCards.min, fs5.queryCards.max],
    ['Atualização de cartão (updateDoc)', fs5.updateCard.n, fs5.updateCard.media, fs5.updateCard.min, fs5.updateCard.max],
  ]);
  d.p('Interpretação: leituras e escritas ficam na faixa de 200–450 ms, compatíveis com a latência do Firestore em produção. O máximo de 635 ms na primeira atualização reflete o estabelecimento do canal de escrita. Limitação: volume pequeno de dados (projeto com 3–4 cartões); cenários de volume estão descritos na seção 6.');

  d.h1('4. Kanban — Reatividade da Movimentação (10 execuções cada sentido)');
  d.table(['Medição', 'n', 'Média (ms)', 'Mín (ms)', 'Máx (ms)'], [
    ['Drop → cartão renderizado em "Em andamento"', kanban.paraInProgress.n, kanban.paraInProgress.media, kanban.paraInProgress.min, kanban.paraInProgress.max],
    ['Drop → cartão renderizado em "Backlog"', kanban.paraBacklog.n, kanban.paraBacklog.media, kanban.paraBacklog.min, kanban.paraBacklog.max],
  ]);
  d.p('Interpretação: o tempo entre soltar o cartão e vê-lo na coluna de destino é de ~250 ms em média — inclui o writeBatch (status + evento de histórico), o commit no Firestore e a notificação do onSnapshot que atualiza a tela sem recarregar. Confirma o requisito de atualização em tempo real. Limitação: medido com um cartão por movimentação; não mede rajadas simultâneas de vários usuários.');

  d.h1('5. Gemini — Diagnóstico e Comparação (2 execuções cada)');
  const dg = gemini.diagnostico.map((x) => x.ms);
  const cp = gemini.comparacao.map((x) => x.ms);
  function stats(a) { return { n: a.length, media: Math.round(a.reduce((x, y) => x + y, 0) / a.length), min: Math.min(...a), max: Math.max(...a) }; }
  const dgs = stats(dg); const cps = stats(cp);
  d.table(['Operação', 'n', 'Média (ms)', 'Mín (ms)', 'Máx (ms)', 'Taxa de sucesso'], [
    ['Diagnóstico de projeto (/analyze)', dgs.n, dgs.media, dgs.min, dgs.max, '2/2'],
    ['Comparação de projetos (/compare)', cps.n, cps.media, cps.min, cps.max, '2/2'],
  ]);
  d.p('Interpretação: a latência da IA é dominada pelo tempo de geração do modelo (2–16 s), não pela integração. Observação registrada: em uma ocasião anterior aos testes formais, o Gemini respondeu HTTP 503 ("high demand") — falha transitória do provedor, tratada pelo aplicativo com mensagem "Erro ao consultar a IA." e resolvida em nova tentativa. Limitação: apenas 2 execuções por operação (conforme definido para economizar cota); amostra insuficiente para inferência estatística — os valores descrevem o comportamento observado, não garantem distribuição.');

  d.h1('6. Lighthouse (desktop, URL pública)');
  d.table(['Métrica', 'Valor'], [
    ['Performance', Math.round(lh.categories.performance.score * 100)],
    ['Accessibility', Math.round(lh.categories.accessibility.score * 100)],
    ['Best Practices', Math.round(lh.categories['best-practices'].score * 100)],
    ['SEO', Math.round(lh.categories.seo.score * 100)],
    ['First Contentful Paint', Math.round(lh.audits['first-contentful-paint'].numericValue) + ' ms'],
    ['Largest Contentful Paint', Math.round(lh.audits['largest-contentful-paint'].numericValue) + ' ms'],
    ['Total Blocking Time', Math.round(lh.audits['total-blocking-time'].numericValue) + ' ms'],
    ['Cumulative Layout Shift', lh.audits['cumulative-layout-shift'].numericValue],
    ['Speed Index', Math.round(lh.audits['speed-index'].numericValue) + ' ms'],
  ]);
  d.p('Relatório original: docs/tcc/evidencias/performance/lighthouse-5.5.report.html (e .json). Observação: a auditoria foi executada na página pública de login (rota /), que não exige autenticação. SEO 82 reflete o fato de ser uma aplicação autenticada (não pensada para indexação). Limitação: Lighthouse mede a página inicial; telas autenticadas foram medidas separadamente nas seções 2–4.');

  d.h1('7. Cenários de Volume');
  d.p('Não foram executados testes com 10/30/50 cartões nesta rodada. Os cenários de demonstração (seção de evidências) utilizam projetos com 8 cartões cada. Fica registrado como trabalho futuro a criação de projetos de teste isolados com volumes maiores, respeitando as cotas gratuitas e sem testes agressivos de carga.');

  d.h1('8. Conclusão');
  d.p('O AgileFlow apresenta, em produção, carregamento inicial rápido, reatividade do Kanban abaixo de 300 ms e consultas ao Firestore na faixa esperada para o serviço. A latência da IA (2–16 s) é inerente à geração do modelo e é tratada com feedback ao usuário. As métricas de Lighthouse desktop (Performance 100, Accessibility 97, Best Practices 100) indicam boa qualidade técnica da página pública. Todas as medições são reais e estão arquivadas em docs/tcc/evidencias/performance/.');

  await d.save(OUT);
  console.log('OK:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
