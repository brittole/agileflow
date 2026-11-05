// Documento 4 — AgileFlow_Cenarios_Demonstrativos.docx
const { DocBuilder } = require('./docx-helper');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'docs', 'tcc', 'AgileFlow_Cenarios_Demonstrativos.docx');
const EV = path.join(ROOT, 'docs', 'tcc', 'evidencias');

async function main() {
  const d = new DocBuilder('AgileFlow — Cenários Demonstrativos para a Banca');

  d.h1('Introdução');
  d.p('Este documento descreve três cenários demonstrativos executados na aplicação real em produção (https://agileflow-tcc.web.app), com projetos de teste isolados criados exclusivamente para a demonstração. Todos os prints são reais, capturados da aplicação funcionando em 05/11/2026. Nenhuma resposta da IA foi editada. Os projetos de teste são identificados como "Cenário 1/2" e podem ser excluídos após a apresentação.');

  // ============ CENÁRIO 1 ============
  d.h1('Cenário 1 — Projeto com Bom Andamento');
  d.h2('Dados utilizados');
  d.table(['Cartão', 'Story Points', 'Status final'], [
    ['C1 Login social', '3', 'Concluído'],
    ['C1 Cadastro de usuário', '5', 'Concluído'],
    ['C1 Recuperação de senha', '2', 'Concluído'],
    ['C1 Perfil do usuário', '3', 'Concluído'],
    ['C1 Logout', '1', 'Concluído'],
    ['C1 Validação de formulários', '2', 'Revisão'],
    ['C1 Tela de configurações', '3', 'Em andamento'],
    ['C1 Notificações', '5', 'Backlog'],
  ]);
  d.p('Métricas: 8 cartões, 5 concluídos (63%), WIP 1, 14 story points concluídos, throughput 5 em 7 dias.');
  d.h2('Procedimento');
  d.p('Cartões criados e movimentados pelo Kanban real (drag-and-drop), gerando eventos de histórico. Em seguida, o diagnóstico da IA foi executado na tela Desempenho.');
  d.h2('Resultado esperado vs. observado');
  d.p('Esperado: a IA reconhece o bom andamento. Observado: a IA reconheceu ("bom andamento... 5 dos 8 cartões concluídos, 14 story points, throughput 5, apenas 1 em progresso"), apontou WIP baixo como ponto forte e não identificou gargalo (correto). Detectou ainda a anomalia do cycle time (~0 dias), uma limitação dos dados sintéticos criados na mesma sessão. Tempo de resposta: 4.151 ms (houve uma tentativa anterior com HTTP 503 transitório do provedor).');
  d.h2('Evidências');
  d.image(path.join(EV, 'cenario-01-bom-andamento', '01-kanban.png'), 620, 380, 'Figura 1 — Kanban do Cenário 1: 5 cartões em Concluído.');
  d.image(path.join(EV, 'cenario-01-bom-andamento', '02-metricas.png'), 620, 380, 'Figura 2 — Métricas do Cenário 1.');
  d.image(path.join(EV, 'cenario-01-bom-andamento', '03-relatorio-ia.png'), 620, 380, 'Figura 3 — Relatório da IA do Cenário 1.');

  // ============ CENÁRIO 2 ============
  d.h1('Cenário 2 — Projeto com Gargalo');
  d.h2('Dados utilizados');
  d.table(['Cartão', 'Story Points', 'Status final'], [
    ['C2 Migração de banco', '8', 'Concluído'],
    ['C2 Integração pagamento', '8', 'Revisão'],
    ['C2 Relatórios PDF', '5', 'Revisão'],
    ['C2 Exportação CSV', '3', 'Revisão'],
    ['C2 API parceiros', '5', 'Em andamento'],
    ['C2 Webhooks', '3', 'Em andamento'],
    ['C2 Notificações push', '5', 'Em andamento'],
    ['C2 Auditoria', '2', 'Backlog'],
  ]);
  d.p('Métricas: 8 cartões, 1 concluído (13%), WIP 3, 8 story points concluídos, throughput 1 em 7 dias.');
  d.h2('Resultado esperado vs. observado');
  d.p('Esperado: a IA identifica o gargalo. Observado: a IA identificou corretamente — "Retenção na fase de Review: 3 cartões (37,5%)" e "75% do projeto (6 de 8) entre inProgress e review" — e recomendou priorizar a vazão da revisão e estabelecer limites de WIP. Também ressalvou que o cycle time não é confiável com amostra 1. Tempo de resposta: 16.181 ms, 1 tentativa.');
  d.h2('Evidências');
  d.image(path.join(EV, 'cenario-02-gargalo', '01-kanban.png'), 620, 380, 'Figura 4 — Kanban do Cenário 2: acúmulo em Andamento e Revisão.');
  d.image(path.join(EV, 'cenario-02-gargalo', '02-metricas.png'), 620, 380, 'Figura 5 — Métricas do Cenário 2.');
  d.image(path.join(EV, 'cenario-02-gargalo', '03-relatorio-ia.png'), 620, 380, 'Figura 6 — Relatório da IA do Cenário 2.');

  // ============ CENÁRIO 3 ============
  d.h1('Cenário 3 — Comparação entre Dois Projetos');
  d.h2('Dados utilizados');
  d.p('Projeto A = Cenário 1 (bom andamento); Projeto B = Cenário 2 (gargalo). Comparação executada na funcionalidade real "Comparar projetos".');
  d.h2('Resultado esperado vs. observado');
  d.p('Esperado: a IA identifica as diferenças e conclui corretamente. Observado: a IA declarou o Projeto A melhor em todas as dimensões (throughput 5 vs 1; 14 vs 8 story points; WIP 1 vs 3), apontou os gargalos de B (3 em andamento + 3 em revisão) e sugeriu práticas de A para B (limitar WIP, escoar revisão). Nenhuma afirmação sem fundamento foi identificada. Tempo de resposta: 14.553 ms, 1 tentativa.');
  d.h2('Evidências');
  d.image(path.join(EV, 'cenario-03-comparacao', '01-comparacao-ia.png'), 620, 380, 'Figura 7 — Relatório comparativo da IA (Cenário 1 vs Cenário 2).');

  d.h1('Análise Comparativa e Conclusões');
  d.table(['Aspecto', 'C1 Bom Andamento', 'C2 Gargalo', 'C3 Comparação'], [
    ['IA identificou a situação', 'Sim (bom andamento, sem gargalo)', 'Sim (gargalo em Revisão + WIP alto)', 'Sim (A melhor, com números)'],
    ['Correção factual', '6/6 afirmações corretas', '8/8 corretas', '10/10 corretas'],
    ['Tempo de resposta', '4.151 ms', '16.181 ms', '14.553 ms'],
    ['Recomendações úteis', 'Sim', 'Sim (limitar WIP, escoar review)', 'Sim (práticas de A para B)'],
  ]);
  d.p('Os três cenários demonstram que o AgileFlow registra o fluxo real de trabalho (Kanban + histórico), calcula métricas de fluxo e produz diagnósticos de IA factualmente corretos e úteis em situações distintas. As limitações (cycle time artificial em dados sintéticos; latência da IA dependente do provedor) estão documentadas nos arquivos de cada cenário.');

  await d.save(OUT);
  console.log('OK:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
