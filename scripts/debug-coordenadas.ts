import * as fs from 'fs';
import * as path from 'path';

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color: string, text: string) {
  console.log(`${color}${text}${colors.reset}`);
}

console.log('\n' + '='.repeat(80));
log(colors.cyan + colors.bright, '🔍 DEBUG: ORIGEM DOS PIXELS');
console.log('='.repeat(80) + '\n');

// 1. Coordenadas do PDF original (em pontos)
log(colors.blue, '1️⃣  ORIGEM: Coordenadas do PDF (em pontos)');
console.log('   - As coordenadas vêm do arquivo ficha-coordinates.json');
console.log('   - Formato: pdfRect: [x1, y1, x2, y2] em pontos (72 pontos = 1 polegada)');
console.log('   - Sistema de coordenadas do PDF: origem no canto INFERIOR ESQUERDO');
console.log('   - Exemplo campo "forca": pdfRect: [101.49, 595.28, 143.99, 630.28]');

console.log('\n' + '-'.repeat(80) + '\n');

// 2. Conversão pontos → pixels
log(colors.yellow, '2️⃣  CONVERSÃO: Pontos para Pixels');
const SCALE = 1.2;
const DPI = 96;
const PT_TO_PX = (DPI / 72) * SCALE;
console.log(`   - Fórmula: PT_TO_PX = (DPI / 72) * SCALE`);
console.log(`   - DPI: ${DPI} (pixels por polegada)`);
console.log(`   - SCALE: ${SCALE} (zoom/ampliação do PDF)`);
console.log(`   - PT_TO_PX = (${DPI} / 72) * ${SCALE} = ${PT_TO_PX.toFixed(6)}`);
console.log(`   - Isso significa: 1 ponto = ${PT_TO_PX.toFixed(2)} pixels`);

console.log('\n' + '-'.repeat(80) + '\n');

// 3. Viewport do PDF (dimensões reais na tela)
log(colors.green, '3️⃣  VIEWPORT: Dimensões do PDF na Tela');
console.log('   - O PDF é renderizado usando PDF.js com viewport({ scale: 1.2 })');
console.log('   - O viewport calcula as dimensões da página baseado no PDF real');
console.log('   - viewport.width = largura da página do PDF * SCALE * (DPI/72)');
console.log('   - viewport.height = altura da página do PDF * SCALE * (DPI/72)');
console.log('   - O viewport pode ter dimensões diferentes do que estamos assumindo!');

// Lê o arquivo original para ver as dimensões do PDF
const originalPath = path.join(process.cwd(), 'public', 'data', 'ficha-coordinates.json');
const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));

// Tenta encontrar as dimensões do PDF
let pageWidthPt = 595.276; // Padrão A4
let pageHeightPt = 803; // Do metadata ou padrão

// Calcula dimensões assumidas
const assumedWidthPx = pageWidthPt * PT_TO_PX;
const assumedHeightPx = pageHeightPt * PT_TO_PX;

console.log(`\n   Dimensões ASSUMIDAS (no script):`);
console.log(`   - Largura: ${pageWidthPt}pt = ${assumedWidthPx.toFixed(2)}px`);
console.log(`   - Altura: ${pageHeightPt}pt = ${assumedHeightPx.toFixed(2)}px`);

console.log('\n' + '-'.repeat(80) + '\n');

// 4. Container HTML onde os campos são posicionados
log(colors.cyan, '4️⃣  HTML/CSS: Onde os campos são posicionados');
console.log('   - annotationLayerDiv é criado com position: absolute');
console.log(`   - annotationLayerDiv.width = viewport.width (${assumedWidthPx.toFixed(2)}px)`);
console.log(`   - annotationLayerDiv.height = viewport.height (${assumedHeightPx.toFixed(2)}px)`);
console.log('   - annotationLayerDiv.left = 0');
console.log('   - annotationLayerDiv.top = 0');
console.log('   - Sistema de coordenadas HTML: origem no canto SUPERIOR ESQUERDO');
console.log('   - Os campos usam position: absolute com left e top relativos ao annotationLayerDiv');

console.log('\n' + '-'.repeat(80) + '\n');

// 5. Conversão do campo "forca" como exemplo
log(colors.red, '5️⃣  EXEMPLO: Conversão do campo "forca"');
const forcaOriginal = originalData.fields.forca;
if (forcaOriginal && forcaOriginal.pdfRect) {
  const [x1, y1, x2, y2] = forcaOriginal.pdfRect;
  const pdfLeft = Math.min(x1, x2);
  const pdfTop = Math.max(y1, y2);
  
  console.log(`\n   PDF (pontos):`);
  console.log(`   - pdfRect: [${x1}, ${y1}, ${x2}, ${y2}]`);
  console.log(`   - left: ${pdfLeft}pt, top: ${pdfTop}pt (sistema PDF - canto inferior esquerdo)`);
  
  // Conversão simples
  const leftPx = pdfLeft * PT_TO_PX;
  const topPx = pdfTop * PT_TO_PX;
  console.log(`\n   Conversão direta:`);
  console.log(`   - left: ${pdfLeft}pt * ${PT_TO_PX.toFixed(2)} = ${leftPx.toFixed(2)}px`);
  console.log(`   - top: ${pdfTop}pt * ${PT_TO_PX.toFixed(2)} = ${topPx.toFixed(2)}px`);
  
  // Inversão do eixo Y
  const htmlTop = assumedHeightPx - topPx;
  console.log(`\n   Inversão do eixo Y (PDF tem origem embaixo, HTML tem em cima):`);
  console.log(`   - htmlTop = ${assumedHeightPx.toFixed(2)}px - ${topPx.toFixed(2)}px = ${htmlTop.toFixed(2)}px`);
  
  // Offset aplicado
  const FORCA_REFERENCE_LEFT = -385;
  const FORCA_REFERENCE_TOP = 190.16;
  const OFFSET_X = leftPx - FORCA_REFERENCE_LEFT;
  const OFFSET_Y = htmlTop - FORCA_REFERENCE_TOP;
  
  console.log(`\n   Offset aplicado:`);
  console.log(`   - Posição calculada: left=${leftPx.toFixed(2)}, top=${htmlTop.toFixed(2)}`);
  console.log(`   - Posição referência: left=${FORCA_REFERENCE_LEFT}, top=${FORCA_REFERENCE_TOP}`);
  console.log(`   - Offset: X=${OFFSET_X.toFixed(2)}, Y=${OFFSET_Y.toFixed(2)}`);
  console.log(`   - Posição final: left=${(leftPx - OFFSET_X).toFixed(2)}, top=${(htmlTop - OFFSET_Y).toFixed(2)}`);
}

console.log('\n' + '='.repeat(80) + '\n');

// PROBLEMA POTENCIAL
log(colors.red + colors.bright, '⚠️  PROBLEMA POTENCIAL:');
console.log('   O viewport REAL do PDF pode ter dimensões diferentes!');
console.log('   - Estamos assumindo dimensões fixas no script');
console.log('   - Mas o viewport pode variar dependendo do PDF');
console.log('   - O viewport.width e viewport.height são calculados pelo PDF.js');
console.log('   - Precisamos usar as dimensões REAIS do viewport!');

console.log('\n' + '='.repeat(80) + '\n');

log(colors.cyan + colors.bright, '💡 SOLUÇÃO:');
console.log('   Precisamos verificar as dimensões REAIS do viewport no navegador');
console.log('   ou usar o viewport.convertToViewportPoint() do PDF.js');
console.log('   em vez de calcular manualmente.');

console.log('\n');

