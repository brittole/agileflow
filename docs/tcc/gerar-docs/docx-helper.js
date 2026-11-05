// Utilitário para gerar documentos DOCX do TCC com a lib `docx` (Node.js).
// Uso: const { DocBuilder } = require('./docx-helper');
const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun,
} = docx;

class DocBuilder {
  constructor(title) {
    this.children = [];
    this.children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })],
    }));
    this.children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'AgileFlow — Sistema Web de Gestão Ágil de Projetos com Inteligência Artificial', italics: true, size: 20, color: '666666' })],
    }));
    this.children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Documento gerado a partir do código-fonte real e de testes executados em 05/11/2026. Projeto Firebase: agileflow-tcc.`, size: 18, color: '888888' })],
    }));
    this.children.push(new Paragraph({ text: '' }));
  }

  h1(text) {
    this.children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true })] }));
    return this;
  }

  h2(text) {
    this.children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true })] }));
    return this;
  }

  h3(text) {
    this.children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, bold: true })] }));
    return this;
  }

  p(text, opts = {}) {
    this.children.push(new Paragraph({ children: [new TextRun({ text, ...opts })] }));
    return this;
  }

  bullet(text) {
    this.children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] }));
    return this;
  }

  code(text) {
    this.children.push(new Paragraph({
      shading: { fill: 'F4F4F4' },
      children: [new TextRun({ text, font: 'Consolas', size: 18 })],
    }));
    return this;
  }

  table(headers, rows) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map((h) => new TableCell({
        shading: { fill: 'D9E2F3' },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
      })),
    });
    const dataRows = rows.map((r) => new TableRow({
      children: r.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun(String(c))] })] })),
    }));
    this.children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
      rows: [headerRow, ...dataRows],
    }));
    this.children.push(new Paragraph({ text: '' }));
    return this;
  }

  image(filePath, widthPx, heightPx, caption) {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      this.children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data, transformation: { width: widthPx, height: heightPx }, type: 'png' })],
      }));
      if (caption) {
        this.children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: caption, italics: true, size: 18, color: '666666' })],
        }));
      }
    } else {
      this.p(`[Imagem não encontrada: ${filePath}]`, { italics: true, color: 'CC0000' });
    }
    return this;
  }

  async save(outPath) {
    const doc = new Document({
      creator: 'AgileFlow TCC',
      title: outPath,
      sections: [{ properties: {}, children: this.children }],
    });
    const buffer = await Packer.toBuffer(doc);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buffer);
    return outPath;
  }
}

module.exports = { DocBuilder };
