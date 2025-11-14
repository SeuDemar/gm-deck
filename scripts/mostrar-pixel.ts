import * as fs from 'fs';
import * as path from 'path';

// Cores para o console (ANSI escape codes)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

// Encontra o campo "forca"
const forcaPixel = pixelsData.fields.forca;
const forcaOriginal = originalData.fields.forca;

if (!forcaPixel) {
  log(colors.red, '❌ Campo "forca" não encontrado no arquivo de pixels!');
  process.exit(1);
}

if (!forcaOriginal) {
  log(colors.red, '❌ Campo "forca" não encontrado no arquivo original!');
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
log(colors.cyan + colors.bright, '📍 POSIÇÃO DO CAMPO "FORCA" EM PIXELS');
console.log('='.repeat(80) + '\n');

// Mostra informações do arquivo original (pdfRect em pontos)
log(colors.yellow, '📄 Coordenadas Originais (PDF em pontos):');
console.log(`   pdfRect: [${forcaOriginal.pdfRect.join(', ')}]`);
const [x1, y1, x2, y2] = forcaOriginal.pdfRect;
const pdfLeft = Math.min(x1, x2);
const pdfTop = Math.max(y1, y2);
const pdfRight = Math.max(x1, x2);
const pdfBottom = Math.min(y1, y2);
console.log(`   Left: ${pdfLeft.toFixed(2)}pt | Top: ${pdfTop.toFixed(2)}pt`);
console.log(`   Right: ${pdfRight.toFixed(2)}pt | Bottom: ${pdfBottom.toFixed(2)}pt`);
console.log(`   Width: ${(pdfRight - pdfLeft).toFixed(2)}pt | Height: ${(pdfTop - pdfBottom).toFixed(2)}pt`);

console.log('\n' + '-'.repeat(80) + '\n');

// Mostra informações do arquivo de pixels
log(colors.green, '🖥️  Posição em Pixels (JSON atual):');
if (forcaPixel.position) {
  console.log(`   left: ${forcaPixel.position.left}px`);
  console.log(`   top: ${forcaPixel.position.top}px`);
  console.log(`   width: ${forcaPixel.position.width}px`);
  console.log(`   height: ${forcaPixel.position.height}px`);
  
  // Calcula posição do canto direito e inferior
  const right = forcaPixel.position.left + forcaPixel.position.width;
  const bottom = forcaPixel.position.top + forcaPixel.position.height;
  console.log(`   right: ${right}px`);
  console.log(`   bottom: ${bottom}px`);
  
  // Verifica se está negativo (fora dos limites)
  if (forcaPixel.position.left < 0) {
    log(colors.red, `   ⚠️  ATENÇÃO: left é NEGATIVO (${forcaPixel.position.left}px)`);
    log(colors.yellow, `   Isso significa que o campo está ${Math.abs(forcaPixel.position.left)}px à esquerda do container!`);
  }
  if (forcaPixel.position.top < 0) {
    log(colors.red, `   ⚠️  ATENÇÃO: top é NEGATIVO (${forcaPixel.position.top}px)`);
    log(colors.yellow, `   Isso significa que o campo está ${Math.abs(forcaPixel.position.top)}px acima do container!`);
  }
} else {
  log(colors.red, '   ❌ Campo não tem propriedade "position"!');
}

console.log('\n' + '-'.repeat(80) + '\n');

// Calcula o que deveria ser baseado na conversão padrão
log(colors.blue, '🧮 Cálculo Teórico (conversão pontos → pixels):');
const SCALE = pixelsData.metadata?.scale || 1.2;
const DPI = pixelsData.metadata?.dpi || 96;
const PT_TO_PX = (DPI / 72) * SCALE;
const PAGE_HEIGHT_PT = pixelsData.metadata?.pageHeightPt || 841.89;

console.log(`   Scale: ${SCALE}`);
console.log(`   DPI: ${DPI}`);
console.log(`   PT_TO_PX: ${PT_TO_PX.toFixed(6)}`);
console.log(`   Page Height (pt): ${PAGE_HEIGHT_PT}`);

// Converte as coordenadas originais
const calculatedLeft = pdfLeft * PT_TO_PX;
const calculatedTop = (PAGE_HEIGHT_PT - pdfTop) * PT_TO_PX;
const calculatedWidth = (pdfRight - pdfLeft) * PT_TO_PX;
const calculatedHeight = (pdfTop - pdfBottom) * PT_TO_PX;

console.log(`\n   Calculado:`);
console.log(`   left: ${calculatedLeft.toFixed(2)}px`);
console.log(`   top: ${calculatedTop.toFixed(2)}px`);
console.log(`   width: ${calculatedWidth.toFixed(2)}px`);
console.log(`   height: ${calculatedHeight.toFixed(2)}px`);

// Compara com o valor atual
console.log('\n' + '-'.repeat(80) + '\n');
log(colors.magenta, '📊 Diferença entre Calculado e Atual:');

if (forcaPixel.position) {
  const diffLeft = forcaPixel.position.left - calculatedLeft;
  const diffTop = forcaPixel.position.top - calculatedTop;
  const diffWidth = forcaPixel.position.width - calculatedWidth;
  const diffHeight = forcaPixel.position.height - calculatedHeight;
  
  console.log(`   Diferença em left: ${diffLeft.toFixed(2)}px (${diffLeft > 0 ? '+' : ''}${diffLeft.toFixed(2)})`);
  console.log(`   Diferença em top: ${diffTop.toFixed(2)}px (${diffTop > 0 ? '+' : ''}${diffTop.toFixed(2)})`);
  console.log(`   Diferença em width: ${diffWidth.toFixed(2)}px (${diffWidth > 0 ? '+' : ''}${diffWidth.toFixed(2)})`);
  console.log(`   Diferença em height: ${diffHeight.toFixed(2)}px (${diffHeight > 0 ? '+' : ''}${diffHeight.toFixed(2)})`);
  
  // Calcula o offset total
  const totalOffsetX = diffLeft;
  const totalOffsetY = diffTop;
  
  console.log(`\n   ${colors.yellow}Offset Total aplicado:`);
  console.log(`   X: ${totalOffsetX.toFixed(2)}px`);
  console.log(`   Y: ${totalOffsetY.toFixed(2)}px${colors.reset}`);
}

console.log('\n' + '='.repeat(80));
log(colors.cyan + colors.bright, '📋 JSON formatado para copiar:');
console.log('='.repeat(80) + '\n');

if (forcaPixel.position) {
  console.log(JSON.stringify({
    position: {
      left: forcaPixel.position.left,
      top: forcaPixel.position.top,
      width: forcaPixel.position.width,
      height: forcaPixel.position.height
    }
  }, null, 2));
}

console.log('\n');

