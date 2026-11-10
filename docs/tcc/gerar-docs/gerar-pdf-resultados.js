// Gera PDF bonito com os resultados dos testes e a metodologia de cálculo das métricas.
// Uso: node gerar-pdf-resultados.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'docs', 'tcc', 'AgileFlow_Resultados_Testes_09-11.pdf');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>AgileFlow — Resultados dos Testes (09/11/2026)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Roboto, -apple-system, sans-serif;
    color: #1a2236;
    background: #fff;
    line-height: 1.6;
    padding: 40px;
    max-width: 900px;
    margin: 0 auto;
  }
  .header {
    text-align: center;
    border-bottom: 3px solid #4f7cff;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .header h1 {
    font-size: 2rem;
    background: linear-gradient(90deg, #4f7cff, #8b5cf6);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 8px;
  }
  .header p { color: #6b7280; font-size: 0.95rem; }
  h2 {
    font-size: 1.3rem;
    color: #4f7cff;
    margin: 32px 0 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e1e5ee;
  }
  h3 { font-size: 1.05rem; color: #1a2236; margin: 20px 0 10px; }
  p { margin-bottom: 12px; font-size: 0.95rem; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 0.9rem;
  }
  th {
    background: #4f7cff;
    color: #fff;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
  }
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #e1e5ee;
  }
  tr:nth-child(even) { background: #f8f9fc; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .box {
    background: #f8f9fc;
    border-left: 4px solid #4f7cff;
    padding: 16px 20px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
  }
  .box-warning {
    background: #fffbeb;
    border-left-color: #f59e0b;
  }
  .box-danger {
    background: #fef2f2;
    border-left-color: #ef4444;
  }
  .metric-formula {
    background: #1a2236;
    color: #e8ecf6;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: 'Consolas', monospace;
    font-size: 0.85rem;
    margin: 12px 0;
    overflow-x: auto;
  }
  .footer {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 2px solid #e1e5ee;
    text-align: center;
    color: #6b7280;
    font-size: 0.85rem;
  }
  ul { margin: 12px 0 12px 24px; }
  li { margin-bottom: 6px; font-size: 0.95rem; }
</style>
</head>
<body>

<div class="header">
  <h1>AgileFlow</h1>
  <p>Resultados dos Testes e Metodologia de Cálculo das Métricas</p>
  <p><strong>Data:</strong> 09/11/2026 | <strong>Ambiente:</strong> Produção (agileflow-tcc.web.app) | <strong>Billing:</strong> Nível 1 (pago)</p>
</div>

<h2>1. Como as métricas são calculadas</h2>

<p>O AgileFlow calcula métricas de fluxo a partir dos <strong>cartões</strong> e dos <strong>eventos de histórico</strong> (criação, movimentação, exclusão) registrados no Firestore. Nenhum dado é inventado — quando não há amostra suficiente, a métrica fica indisponível.</p>

<h3>1.1 Throughput (vazão)</h3>
<p>Número de cartões concluídos (movidos para "Concluído") dentro do período analisado (7 dias).</p>
<div class="metric-formula">
throughput = contagem de eventos "moved" → "done" nos últimos 7 dias
</div>

<h3>1.2 WIP (Work in Progress)</h3>
<p>Número de cartões atualmente em "Em andamento" no momento da medição.</p>
<div class="metric-formula">
wip = contagem de cartões com status = "inProgress" (agora)
</div>

<h3>1.3 Cycle Time (tempo de ciclo)</h3>
<p>Tempo médio entre o cartão entrar em "Em andamento" e ser "Concluído". Só é calculado para cartões com histórico completo (entrada em andamento + conclusão).</p>
<div class="metric-formula">
cycleTime[i] = (data de conclusão − data de entrada em andamento) em dias
averageCycleTimeDays = média de cycleTime[] (null se não há amostra)
</div>

<h3>1.4 Lead Time e Atraso do cartão</h3>
<p>O <strong>lead time</strong> de um cartão é o tempo decorrido desde que ele entrou em "Em andamento" (ou desde a criação, se nunca saiu do Backlog). O <strong>limite de prazo</strong> é igual aos Story Points do cartão, em dias.</p>
<div class="metric-formula">
leadTime = (agora − entrada em "Em andamento") em dias
limite = storyPoints (em dias)

se status = "done" → no prazo
se leadTime > limite → <strong>Atrasado</strong> (vermelho)
se leadTime ≥ limite − 1 e status ≠ "review" → <strong>Pode atrasar</strong> (amarelo)
senão → no prazo
</div>

<div class="box">
<strong>Exemplo real (09/11/2026):</strong> o cartão "Revisar portfólio atualizado" (1 Story Point) foi criado em 06/11. Em 09/11, seu lead time era de ~3 dias. Como 3 > 1, o cartão apareceu como <span class="badge badge-danger">Atrasado</span> no Kanban.
</div>

<h2>2. Resultados dos testes (09/11/2026)</h2>

<h3>2.1 Card atrasado — validado com tempo real</h3>
<p>Os cards foram criados em 06/11/2026. Em 09/11, com 3 dias decorridos, os cards com Story Points baixos apareceram atrasados de verdade, sem simulação.</p>

<table>
  <tr>
    <th>Cenário</th>
    <th>Card</th>
    <th>Story Points</th>
    <th>Status</th>
    <th>Estado do prazo</th>
  </tr>
  <tr>
    <td rowspan="2"><strong>Pedro</strong><br>(bom andamento)</td>
    <td>Revisar portfólio atualizado</td>
    <td>1</td>
    <td>Backlog</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td>Criar stories animados</td>
    <td>2</td>
    <td>Em andamento</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td rowspan="4"><strong>João</strong><br>(gargalo)</td>
    <td>Responder avaliações</td>
    <td>2</td>
    <td>Backlog</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td>Contar estoque de camisetas</td>
    <td>3</td>
    <td>Em andamento</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td>Atualizar preços</td>
    <td>2</td>
    <td>Em andamento</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td>Organizar arara de inverno</td>
    <td>3</td>
    <td>Em andamento</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td rowspan="2"><strong>Ana</strong><br>(comparação)</td>
    <td>Treinar equipe</td>
    <td>3</td>
    <td>Em andamento</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
  <tr>
    <td>Decorar salão para o Natal</td>
    <td>3</td>
    <td>Revisão</td>
    <td><span class="badge badge-danger">Atrasado</span></td>
  </tr>
</table>

<p><strong>Total: 8 cards atrasados de verdade</strong> nos 3 cenários, provando que a funcionalidade funciona com tempo real decorrido.</p>

<h3>2.2 Diagnóstico da IA (Gemini)</h3>

<table>
  <tr>
    <th>Cenário</th>
    <th>Tempo</th>
    <th>Resultado</th>
    <th>Correção factual</th>
  </tr>
  <tr>
    <td>Pedro (bom andamento)</td>
    <td>12,9s</td>
    <td><span class="badge badge-success">Sucesso</span></td>
    <td>6/6 afirmações corretas</td>
  </tr>
  <tr>
    <td>João (gargalo)</td>
    <td>20,3s</td>
    <td><span class="badge badge-success">Sucesso</span></td>
    <td>8/8 afirmações corretas</td>
  </tr>
  <tr>
    <td>Ana (comparação)</td>
    <td>15,4s</td>
    <td><span class="badge badge-success">Sucesso</span></td>
    <td>6/6 afirmações corretas</td>
  </tr>
  <tr>
    <td>Comparação Pedro vs João</td>
    <td>17,9s</td>
    <td><span class="badge badge-success">Sucesso</span></td>
    <td>10/10 afirmações corretas</td>
  </tr>
</table>

<h3>2.3 O que a IA identificou em cada cenário</h3>

<div class="box">
<strong>Pedro (bom andamento):</strong> "Alta taxa de conclusão: 5 dos 8 cartões finalizados (62,5%), 18 story points entregues. Controle de WIP baixo: apenas 1 cartão em progresso." — A IA reconheceu o bom andamento e detectou a anomalia do cycle time (dados sintéticos criados no mesmo dia).
</div>

<div class="box box-warning">
<strong>João (gargalo):</strong> "6 dos 8 cartões (75%) estão ativos simultaneamente entre 'inProgress' (3) e 'review' (3). A etapa de 'review' representa um gargalo crítico com 3 cartões retidos (37,5%)." — A IA identificou corretamente o gargalo e sugeriu limitar WIP e escoar a revisão.
</div>

<div class="box">
<strong>Ana (comparação):</strong> "3 cartões concluídos (5 story points) em 7 dias, throughput de 3. WIP em 2 cartões." — Diagnóstico correto do fluxo equilibrado.
</div>

<div class="box">
<strong>Comparação Pedro vs João:</strong> "O Projeto A apresenta desempenho superior: 5 cartões e 18 Story Points concluídos (throughput 5, WIP 1) contra 1 cartão e 1 Story Point do Projeto B (throughput 1, WIP 3, 6 cartões acumulados)." — A IA declarou A melhor com números corretos e sugeriu práticas de A para B.
</div>

<h2>3. Problemas encontrados e resolvidos</h2>

<table>
  <tr>
    <th>Problema</th>
    <th>Causa</th>
    <th>Solução</th>
  </tr>
  <tr>
    <td>IA falhava com 502/504</td>
    <td>Limite gratuito de 20 req/dia estourado (24 feitas)</td>
    <td>Billing ativado (Nível 1) — 10.000 req/dia</td>
  </tr>
  <tr>
    <td>Gemini lento (90s+)</td>
    <td>Alta demanda do provedor</td>
    <td>Retry automático no Worker (1 tentativa extra em 503/500) + timeout de 60s</td>
  </tr>
  <tr>
    <td>Admin não via projetos de Pedro/João</td>
    <td>Não era membro</td>
    <td>Pedro e João adicionaram a admin como membro via "Gerenciar equipe"</td>
  </tr>
</table>

<h2>4. Limitações documentadas</h2>

<ul>
  <li><strong>Cycle time artificialmente baixo:</strong> os cards foram criados e concluídos em 06/11, então o cycle time é de minutos (não dias). A IA detectou isso como anomalia — comportamento correto.</li>
  <li><strong>Gemini sob alta demanda:</strong> mesmo com billing, o provedor pode ter latência alta em horários de pico. O retry do Worker absorve a maioria dos casos.</li>
  <li><strong>Amostra pequena de execuções:</strong> 1 diagnóstico por cenário (conforme definido para economizar cota). Os resultados descrevem o comportamento observado, não uma distribuição estatística.</li>
</ul>

<h2>5. Custo real do TCC</h2>

<div class="box">
<strong>Cálculo:</strong> ~25 análises × ~800 tokens de entrada × $0,75/1M + ~500 tokens de saída × $3,75/1M = <strong>~$0,06 (6 centavos)</strong> dos R$ 200 pagos.
</div>

<p>O billing (Nível 1) foi ativado em 09/11 e resolveu o limite de 20 requisições/dia do nível gratuito. O custo real do TCC é desprezível.</p>

<div class="footer">
  <p>AgileFlow — Sistema Web de Gestão Ágil de Projetos com Inteligência Artificial</p>
  <p>Documento gerado em 09/11/2026 a partir de testes reais em produção. As imagens dos prints são anexadas separadamente.</p>
</div>

</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  });
  await browser.close();
  console.log('OK:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
