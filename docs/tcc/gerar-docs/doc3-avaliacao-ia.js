// Documento 3 — AgileFlow_Avaliacao_Eficiencia_IA.docx
const { DocBuilder } = require('./docx-helper');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'docs', 'tcc', 'AgileFlow_Avaliacao_Eficiencia_IA.docx');

async function main() {
  const d = new DocBuilder('AgileFlow — Avaliação de Eficiência da Inteligência Artificial');

  d.h1('1. Objetivo da Avaliação');
  d.p('Avaliar tecnicamente a eficiência da integração de IA (Google Gemini) no AgileFlow, de forma defensável perante a banca. A avaliação não assume que a IA é eficiente apenas por gerar respostas: define critérios objetivos, executa cenários reais e registra acertos, falhas e limitações. Nenhuma resposta da IA foi editada ou forçada.');

  d.h1('2. Metodologia');
  d.h2('2.1 Condições dos testes');
  d.table(['Item', 'Valor'], [
    ['Modelo', 'gemini-3.6-flash (estável)'],
    ['Parâmetros', 'responseMimeType=application/json, temperature=0.3, maxOutputTokens=4096'],
    ['Camada de acesso', 'Cloudflare Worker "agileflow-ai" (autenticação JWT + verificação de acesso ao projeto)'],
    ['Ambiente', 'Produção — https://agileflow-tcc.web.app, projeto Firebase agileflow-tcc'],
    ['Data', '05/11/2026'],
    ['Cenários', 'C1 Bom Andamento (8 cartões: 5 done/1 review/1 inProgress/1 todo), C2 Gargalo (8 cartões: 1 done/3 review/3 inProgress/1 todo), C3 Comparação C1 vs C2'],
    ['Execuções', 'Diagnóstico: 2 por cenário (consistência) + medições de latência; Comparação: 2'],
  ]);
  d.h2('2.2 Rubrica de avaliação (notas de 1 a 5)');
  d.p('Escala definida previamente. As notas são atribuídas por revisão humana sobre as respostas reais e NÃO representam precisão científica — são uma avaliação qualitativa estruturada.');
  d.table(['Nota', 'Significado'], [
    ['1', 'Incorreto/irrelevante: resposta errada, inventada ou inútil.'],
    ['2', 'Fraco: acerta parcialmente, com erros factuais ou recomendações genéricas.'],
    ['3', 'Adequado: correto na maior parte, com ressalvas pontuais.'],
    ['4', 'Bom: correto, relevante e útil, com pequenas falhas de forma.'],
    ['5', 'Excelente: correto, específico, consistente e diretamente aplicável.'],
  ]);
  d.h2('2.3 Critérios avaliados');
  d.bullet('Desempenho técnico: latência, taxa de sucesso, falhas, estabilidade.');
  d.bullet('Correção factual: proporção de afirmações verificáveis corretas (quantidades, status, projetos).');
  d.bullet('Relevância: a análise responde ao cenário e identifica os problemas existentes.');
  d.bullet('Consistência: execuções repetidas do mesmo cenário mantêm as conclusões essenciais.');
  d.bullet('Clareza: linguagem compreensível e estrutura organizada.');
  d.bullet('Utilidade: recomendações aplicáveis que ajudam a interpretar o projeto.');

  d.h1('3. Desempenho Técnico da Integração');
  d.table(['Operação', 'Execuções', 'Latências (ms)', 'Sucesso'], [
    ['Diagnóstico (C1)', '2', '4.151; 2.052', '2/2'],
    ['Diagnóstico (C2)', '2', '16.181; 4.043', '2/2'],
    ['Comparação (C1 vs C2)', '2', '14.553; 13.398', '2/2'],
  ]);
  d.p('Taxa de sucesso nas medições formais: 6/6 (100%). Observação registrada fora das medições: uma ocorrência de HTTP 503 ("high demand") do Gemini, falha transitória do provedor, tratada pelo aplicativo com mensagem de erro e resolvida em nova tentativa. A latência é dominada pelo tempo de geração do modelo, não pela integração (Worker + verificação de acesso respondem em centenas de ms).');

  d.h1('4. Correção Factual');
  d.p('Para cada resposta, as afirmações verificáveis (números de cartões, status, story points, throughput, WIP, amostras) foram conferidas contra os dados reais dos projetos.');
  d.table(['Cenário', 'Afirmações verificáveis', 'Corretas', 'Proporção'], [
    ['C1 — Bom Andamento', '6 (8 totais, 5 concluídos, 14 SP, throughput 5, WIP 1, distribuição 1/1/1)', '6', '100%'],
    ['C2 — Gargalo', '8 (8 totais, 1 concluído, 8 SP, 3 inProgress, 3 review, 1 todo, 1 done, amostra 1)', '8', '100%'],
    ['C3 — Comparação', '10 (throughput 5/1, SP 14/8, WIP 1/3, distribuições, amostras 5/1)', '10', '100%'],
  ]);
  d.p('Nenhuma informação inventada (alucinação factual) foi detectada nas respostas avaliadas. A IA citou corretamente a fragilidade estatística do cycle time com amostra pequena.');

  d.h1('5. Consistência');
  d.p('O Cenário 2 foi diagnosticado duas vezes com o mesmo estado. As duas respostas mantiveram idênticas as conclusões essenciais: throughput 1, represamento de 6 cartões entre inProgress e review, gargalo em Revisão, cycle time não confiável (n=1) e recomendação de limitar WIP. Não houve contradições relevantes entre as execuções — apenas variação de redação.');

  d.h1('6. Avaliação Qualitativa (rubrica, revisão humana)');
  d.table(['Critério', 'C1', 'C2', 'C3', 'Justificativa'], [
    ['Correção factual', '5', '5', '5', 'Todas as afirmações verificáveis corretas (ver seção 4).'],
    ['Relevância', '5', '5', '5', 'C1: reconheceu bom andamento; C2: identificou o gargalo em Revisão; C3: comparou corretamente e declarou A melhor com números.'],
    ['Consistência', '—', '5', '—', 'Duas execuções de C2 com conclusões essenciais idênticas.'],
    ['Clareza', '4', '4', '4', 'Estrutura organizada em seções; ressalva: cita cycle time em dias brutos (0,000016) sem arredondar.'],
    ['Utilidade', '4', '5', '5', 'C2/C3: recomendações diretamente aplicáveis (limitar WIP, escoar review). C1: útil, mas a leitura do cycle time como "problema de registro" é inferência incorreta no contexto de dados sintéticos.'],
  ]);
  d.p('Notas atribuídas por revisão humana sobre as respostas reais. Não são apresentadas como precisão científica.');

  d.h1('7. Limitações da Metodologia');
  d.bullet('Amostra pequena de execuções (2 por operação), definida para respeitar cotas gratuitas — descreve o comportamento observado, não uma distribuição estatística.');
  d.bullet('Os cenários usam dados sintéticos criados na mesma sessão; o cycle time artificialmente baixo foi detectado pela IA como anomalia, o que é registrado como limitação do cenário, não da IA.');
  d.bullet('A avaliação de relevância/clareza/utilidade é qualitativa (revisão humana única), sujeita a vieses do avaliador.');
  d.bullet('Resultados são específicos do modelo gemini-3.6-flash com os prompts e parâmetros atuais; trocar o modelo ou os prompts exige nova avaliação.');
  d.bullet('Não foram realizados testes de carga nem medições sob grande volume de dados.');

  d.h1('8. Conclusão');
  d.p('Nas condições avaliadas, a integração de IA do AgileFlow demonstrou: (a) integração tecnicamente estável, com taxa de sucesso de 100% nas medições formais e tratamento adequado de falha transitória do provedor; (b) respostas factualmente corretas (100% das afirmações verificáveis); (c) conclusões consistentes entre execuções repetidas; (d) recomendações relevantes e aplicáveis, incluindo a identificação correta do gargalo no cenário projetado para isso. As limitações — amostra pequena, dados sintéticos e avaliação qualitativa humana — estão explicitadas e não permitem generalizar os resultados para além das condições testadas.');

  await d.save(OUT);
  console.log('OK:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
