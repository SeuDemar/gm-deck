import * as fs from 'fs';
import * as path from 'path';

// Cores para o console (ANSI escape codes)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: string, text: string) {
  console.log(`${color}${text}${colors.reset}`);
}

// Carrega os arquivos JSON
const pixelsPath = path.join(process.cwd(), 'public', 'data', 'ficha-coordinates-pixels.json');
const originalPath = path.join(process.cwd(), 'public', 'data', 'ficha-coordinates.json');

const pixelsData = JSON.parse(fs.readFileSync(pixelsPath, 'utf8'));
const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));

// Parâmetros de conversão
const SCALE = 1.2;
const DPI = 96;
const PT_TO_PX = (DPI / 72) * SCALE;

// Campo "forca" antigo que estava correto (valores de referência)
const FORCA_REFERENCE_LEFT = -385;
const FORCA_REFERENCE_TOP = 190.16;

// Usa a altura da página do metadata ou calcula
const PAGE_HEIGHT_PT = pixelsData.metadata?.pageHeightPt || 803; // Altura da página em pontos
const PAGE_WIDTH_PT = 595.276; // Largura padrão A4 em pontos

// Dimensões da página em pixels
const PAGE_WIDTH_PX = PAGE_WIDTH_PT * PT_TO_PX;
const PAGE_HEIGHT_PX = PAGE_HEIGHT_PT * PT_TO_PX;

// Calcula onde o campo "forca" deveria estar (conversão padrão)
const forcaOriginal = originalData.fields.forca;
if (!forcaOriginal || !forcaOriginal.pdfRect) {
  console.error('❌ Campo "forca" não encontrado no arquivo original!');
  process.exit(1);
}

const [x1, y1, x2, y2] = forcaOriginal.pdfRect;
const pdfLeft = Math.min(x1, x2);
const pdfRight = Math.max(x1, x2);
const pdfBottom = Math.min(y1, y2);
const pdfTop = Math.max(y1, y2);

// Converte de pontos para pixels (conversão padrão)
const forcaLeftPx = pdfLeft * PT_TO_PX;
const forcaRightPx = pdfRight * PT_TO_PX;
const forcaBottomPx = pdfBottom * PT_TO_PX;
const forcaTopPx = pdfTop * PT_TO_PX;

// Inverte o eixo Y (PDF tem origem no canto inferior esquerdo)
const forcaHtmlTop = PAGE_HEIGHT_PX - forcaTopPx;
const forcaHtmlBottom = PAGE_HEIGHT_PX - forcaBottomPx;

// Posição calculada padrão do campo "forca"
const forcaCalculatedLeft = forcaLeftPx;
const forcaCalculatedTop = forcaHtmlTop;

// Calcula o offset: diferença entre onde deveria estar (calculado) e onde realmente está (referência)
// Offset = posição_calculada - posição_referência
// Ajustes calibrados manualmente: left precisa de -5px, top precisa de -73px
const OFFSET_X = forcaCalculatedLeft - FORCA_REFERENCE_LEFT - 5;
const OFFSET_Y = forcaCalculatedTop - FORCA_REFERENCE_TOP - 73;

console.log('\n' + '='.repeat(80));
log(colors.cyan + colors.bright, '🔄 RECALCULANDO TODAS AS COORDENADAS');
console.log('='.repeat(80) + '\n');

log(colors.blue, '📐 Parâmetros de Conversão:');
console.log(`   Scale: ${SCALE}`);
console.log(`   DPI: ${DPI}`);
console.log(`   PT_TO_PX: ${PT_TO_PX.toFixed(6)}`);
console.log(`   Page Width (pt): ${PAGE_WIDTH_PT}`);
console.log(`   Page Height (pt): ${PAGE_HEIGHT_PT}`);
console.log(`   Page Width (px): ${PAGE_WIDTH_PX.toFixed(2)}`);
console.log(`   Page Height (px): ${PAGE_HEIGHT_PX.toFixed(2)}`);

console.log('\n' + '-'.repeat(80) + '\n');

log(colors.yellow, '🎯 Campo "forca" como Referência:');
console.log(`   Campo "forca" pdfRect: [${x1}, ${y1}, ${x2}, ${y2}]`);
console.log(`   Posição Calculada (conversão padrão): left=${forcaCalculatedLeft.toFixed(2)}, top=${forcaCalculatedTop.toFixed(2)}`);
console.log(`   Posição Referência (antiga correta): left=${FORCA_REFERENCE_LEFT}, top=${FORCA_REFERENCE_TOP}`);
console.log(`   Offset Calculado: X=${OFFSET_X.toFixed(2)}, Y=${OFFSET_Y.toFixed(2)}`);
console.log(`   (Offset = Calculado - Referência)`);

console.log('\n' + '='.repeat(80) + '\n');

// Processa todos os campos
const convertedFields: Record<string, any> = {};
let totalFields = 0;
let convertedCount = 0;

Object.entries(originalData.fields).forEach(([fieldName, fieldData]: [string, any]) => {
  totalFields++;
  
  if (!fieldData.pdfRect || !Array.isArray(fieldData.pdfRect) || fieldData.pdfRect.length !== 4) {
    // Se não tem pdfRect, mantém o campo como está ou copia do pixelsData se existir
    if (pixelsData.fields[fieldName]) {
      convertedFields[fieldName] = { ...pixelsData.fields[fieldName] };
    } else {
      convertedFields[fieldName] = { ...fieldData };
    }
    return;
  }

  const [x1, y1, x2, y2] = fieldData.pdfRect;
  const pdfLeft = Math.min(x1, x2);
  const pdfRight = Math.max(x1, x2);
  const pdfBottom = Math.min(y1, y2);
  const pdfTop = Math.max(y1, y2);

  // Converte de pontos para pixels (conversão padrão)
  const leftPx = pdfLeft * PT_TO_PX;
  const rightPx = pdfRight * PT_TO_PX;
  const bottomPx = pdfBottom * PT_TO_PX;
  const topPx = pdfTop * PT_TO_PX;

  // Inverte o eixo Y (PDF tem origem no canto inferior esquerdo)
  const htmlTop = PAGE_HEIGHT_PX - topPx;
  const htmlBottom = PAGE_HEIGHT_PX - bottomPx;

  const width = rightPx - leftPx;
  const height = htmlBottom - htmlTop;

  // Aplica o offset para corrigir o sistema de coordenadas
  // Offset foi calculado como: calculado - referência
  // Então: posição_corrigida = posição_calculada - offset
  const correctedLeft = leftPx - OFFSET_X;
  const correctedTop = htmlTop - OFFSET_Y;

  // Cria o campo convertido
  const convertedField = {
    ...fieldData,
    position: {
      left: Math.round(correctedLeft * 100) / 100,
      top: Math.round(correctedTop * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
    }
  };

  // Remove pdfRect pois não é mais necessário (usamos position)
  delete convertedField.pdfRect;

  convertedFields[fieldName] = convertedField;
  convertedCount++;
});

// Atualiza o arquivo com as coordenadas recalculadas
const updatedData = {
  ...pixelsData,
  metadata: {
    ...pixelsData.metadata,
    forcaReferenceLeft: FORCA_REFERENCE_LEFT,
    forcaReferenceTop: FORCA_REFERENCE_TOP,
    forcaCalculatedLeft: forcaCalculatedLeft,
    forcaCalculatedTop: forcaCalculatedTop,
    offsetX: OFFSET_X,
    offsetY: OFFSET_Y,
    recalculatedAt: new Date().toISOString(),
  },
  fields: convertedFields,
};

// Salva o arquivo atualizado
fs.writeFileSync(pixelsPath, JSON.stringify(updatedData, null, 2), 'utf8');

console.log('\n' + '='.repeat(80));
log(colors.green + colors.bright, '✅ RECALCULAÇÃO CONCLUÍDA!');
console.log('='.repeat(80) + '\n');

log(colors.cyan, '📊 Estatísticas:');
console.log(`   Total de campos: ${totalFields}`);
console.log(`   Campos convertidos: ${convertedCount}`);
console.log(`   Campos mantidos: ${totalFields - convertedCount}`);

console.log('\n' + '-'.repeat(80) + '\n');

log(colors.green, '📝 Arquivo atualizado:');
console.log(`   ${pixelsPath}`);

console.log('\n');

// Mostra alguns exemplos
log(colors.yellow, '📋 Exemplos de campos convertidos:');
const exampleFields = ['forca', 'personagem', 'jogador'];
exampleFields.forEach(fieldName => {
  if (convertedFields[fieldName]) {
    const field = convertedFields[fieldName];
    if (field.position) {
      console.log(`\n   ${fieldName}:`);
      console.log(`     left: ${field.position.left}`);
      console.log(`     top: ${field.position.top}`);
      console.log(`     width: ${field.position.width}`);
      console.log(`     height: ${field.position.height}`);
    }
  }
});

console.log('\n');

