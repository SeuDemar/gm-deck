/**
 * Script para extrair coordenadas dos campos de formulário do PDF
 * 
 * Uso: npx tsx scripts/extract-pdf-coordinates.ts
 * ou: node --loader ts-node/esm scripts/extract-pdf-coordinates.ts
 */

import * as fs from "fs";
import * as path from "path";

interface FieldCoordinates {
  name: string;
  type: string;
  pdfRect: [number, number, number, number]; // [x1, y1, x2, y2] em pontos do PDF
  fieldType?: string;
  fieldValue?: string;
  textSize?: number;
  multiLine?: boolean;
  options?: Array<{ displayValue: string; exportValue: string }>;
}

async function extractCoordinates() {
  // Importa a versão legacy do PDF.js para Node.js
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { getDocument } = pdfjsLib;

  // Para Node.js, não precisa configurar worker (usa sync)
  // Mas vamos configurar mesmo assim para evitar erros
  if (typeof process !== "undefined" && process.versions?.node) {
    // Ambiente Node.js - não precisa de worker
  } else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
      process.cwd(),
      "public/pdf-js/pdf.worker.mjs"
    );
  }
  const pdfPath = path.join(process.cwd(), "public/fichas/FichaOrdem.pdf");
  
  console.log("📄 Carregando PDF:", pdfPath);
  
  // Lê o arquivo PDF como buffer e converte para Uint8Array
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfData = new Uint8Array(pdfBuffer);
  
  // Para Node.js, precisa passar as opções com data como Uint8Array
  const loadingTask = getDocument({
    data: pdfData,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  
  console.log(`✅ PDF carregado! Total de páginas: ${pdf.numPages}\n`);
  
  const allFields: Record<string, FieldCoordinates> = {};
  
  // Processa cada página
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    console.log(`📄 Processando página ${pageNum}...`);
    
    const page = await pdf.getPage(pageNum);
    const annotations = await page.getAnnotations();
    
    // Filtra apenas campos de formulário (Widget annotations)
    const formFields = annotations.filter((ann: any) => ann.subtype === "Widget");
    
    console.log(`   Encontrados ${formFields.length} campos de formulário\n`);
    
    formFields.forEach((annotation: any) => {
      const fieldName = annotation.fieldName || annotation.id || `field_${annotation.id}`;
      
      const fieldData: FieldCoordinates = {
        name: fieldName,
        type: annotation.fieldType || "Tx",
        pdfRect: annotation.rect, // [x1, y1, x2, y2] em pontos do PDF
        fieldType: annotation.fieldType,
        fieldValue: annotation.fieldValue || annotation.defaultFieldValue || "",
        textSize: annotation.textSize || 12,
        multiLine: annotation.multiLine || false,
      };
      
      // Adiciona opções se for um campo de seleção
      if (annotation.fieldType === "Ch" && annotation.options) {
        fieldData.options = annotation.options.map((opt: any) => ({
          displayValue: opt.displayValue || opt.exportValue || "",
          exportValue: opt.exportValue || opt.displayValue || "",
        }));
      }
      
      allFields[fieldName] = fieldData;
      
      // Calcula dimensões em pontos do PDF
      const pdfRect = annotation.rect;
      const pdfWidth = Math.abs(pdfRect[2] - pdfRect[0]);
      const pdfHeight = Math.abs(pdfRect[3] - pdfRect[1]);
      
      console.log(`   ✓ ${fieldName}:`);
      console.log(`     Tipo: ${fieldData.type}`);
      console.log(`     📐 Coordenadas PDF (pontos):`);
      console.log(`        x1=${pdfRect[0].toFixed(2)}, y1=${pdfRect[1].toFixed(2)}`);
      console.log(`        x2=${pdfRect[2].toFixed(2)}, y2=${pdfRect[3].toFixed(2)}`);
      console.log(`        left=${Math.min(pdfRect[0], pdfRect[2]).toFixed(2)}, top=${Math.max(pdfRect[1], pdfRect[3]).toFixed(2)}`);
      console.log(`        width=${pdfWidth.toFixed(2)}pt, height=${pdfHeight.toFixed(2)}pt`);
      console.log(`     Valor: ${fieldData.fieldValue || "(vazio)"}`);
      if (fieldData.options) {
        console.log(`     Opções: ${fieldData.options.length}`);
      }
      console.log("");
    });
  }
  
  // Cria o objeto final com metadados
  const output = {
    metadata: {
      pdfFile: "FichaOrdem.pdf",
      extractedAt: new Date().toISOString(),
      totalFields: Object.keys(allFields).length,
      scale: 1.2, // Escala usada no viewport
    },
    fields: allFields,
  };
  
  // Salva em JSON na pasta public para ser acessível via fetch
  const outputPath = path.join(process.cwd(), "public/data/ficha-coordinates.json");
  const outputDir = path.dirname(outputPath);
  
  // Cria o diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Coordenadas extraídas com sucesso!`);
  console.log(`📁 Salvo em: ${outputPath}`);
  console.log(`📊 Total de campos: ${Object.keys(allFields).length}\n`);
  
  return output;
}

// Executa a extração
(async () => {
  try {
    await extractCoordinates();
  } catch (error) {
    console.error("❌ Erro ao extrair coordenadas:", error);
    process.exit(1);
  }
})();

