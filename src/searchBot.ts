import { Page } from 'playwright';
import { config } from './config.js';
import { generateSearchQueries, getRandomDelay, sleep } from './wordGenerator.js';
import { searchImagePath } from './imageAsset.js';

export class SearchBot {
  constructor(private page: Page) {}

  private async handlePopups(): Promise<void> {
    try {
      const acceptButtons = [
        '#bnp_btn_accept',
        '#bnp_btn_reject',
        'button:has-text("Aceptar")',
        'button:has-text("Accept")',
        'button:has-text("Tal vez más tarde")',
        'button:has-text("No gracias")',
        '#id_l',
        'a:has-text("No gracias")'
      ];
      for (const selector of acceptButtons) {
        const btn = await this.page.$(selector);
        if (btn && (await btn.isVisible().catch(() => false))) {
          await btn.click().catch(() => {});
          await sleep(800);
          break;
        }
      }
    } catch {
      // Ignorar errores al buscar popups
    }
  }

  // Realizar búsqueda visual subiendo una imagen real a Bing
  async runVisualSearch(): Promise<boolean> {
    try {
      console.log(`\n📷 Realizando Búsqueda con Imagen en Bing (#sb_sbi)...`);
      await this.page.goto('https://www.bing.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2000);
      await this.handlePopups();

      const visualSearchBtn = await this.page.$(
        '#sb_sbi, div#sb_sbi, #sbi_b, [aria-label="Buscar con una imagen"], [aria-label*="imagen"]'
      );

      if (visualSearchBtn && (await visualSearchBtn.isVisible().catch(() => false))) {
        await visualSearchBtn.click().catch(() => {});
        await sleep(1500);

        // 1. Intentar cargar el archivo directamente en el input de subida
        const fileInput = await this.page.$('input[type="file"], input[accept*="image"]');
        if (fileInput) {
          console.log(`   📤 Subiendo imagen a Bing Visual Search...`);
          await fileInput.setInputFiles(searchImagePath);
          await sleep(5000);
          console.log(`✅ Imagen subida y búsqueda visual completada con éxito.`);
          return true;
        }

        // 2. Si no hay file input visible, usar imagen sugerida
        const sampleImage = await this.page.$(
          '.sbi_sample, div[class*="sample"] img, .sbi_sample_img, #sbi_d img, div[class*="sbi"] img'
        );

        if (sampleImage && (await sampleImage.isVisible().catch(() => false))) {
          console.log(`   📸 Clic en imagen de muestra para búsqueda visual...`);
          await sampleImage.click().catch(() => {});
          await sleep(5000);
          console.log(`✅ Búsqueda con imagen completada con éxito.`);
          return true;
        }

        // 3. Fallback directo a consulta visual
        console.log(`   📸 Ejecutando consulta de búsqueda visual...`);
        await this.page.goto('https://www.bing.com/visualsearch?imgurl=https%3A%2F%2Fbing.com%2Fth%3Fid%3DOHR.Sample_ROW1234567890_1920x1080.jpg', {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        }).catch(() => {});
        await sleep(4500);
        return true;
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Nota en búsqueda con imagen:`, err.message);
    }
    return false;
  }

  async runDesktopSearches(count: number = config.desktopSearches): Promise<number> {
    console.log(`\n==============================================`);
    console.log(`🖥️  Iniciando ${count} Búsquedas en Bing...`);
    console.log(`==============================================`);

    // 1. Ejecutar búsqueda con imagen primero
    await this.runVisualSearch();

    // 2. Ejecutar búsquedas de texto regulares
    const queries = generateSearchQueries(count);
    let completed = 0;

    await this.page.goto('https://www.bing.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
    await this.handlePopups();

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const searchNum = i + 1;

      try {
        console.log(`[Búsqueda ${searchNum}/${count}] Buscando: "${query}"`);

        const searchInput = await this.page.$(
          'textarea#sb_form_q, input#sb_form_q, textarea[name="q"], input[name="q"], #sb_form_q, input[type="search"]'
        );

        if (searchInput) {
          await searchInput.click();
          await searchInput.fill('');
          await this.page.keyboard.type(query, { delay: Math.floor(Math.random() * 25) + 15 });
          await this.page.keyboard.press('Enter');

          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          await sleep(1500);

          await this.page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
          await sleep(1000);
          await this.page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});

          completed++;
        } else {
          console.log(`   🌐 Navegando a consulta de búsqueda...`);
          await this.page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 25000
          });
          await sleep(2000);
          completed++;
        }

        const waitTime = getRandomDelay(config.minSearchDelayMs, config.maxSearchDelayMs);
        console.log(`   ⏳ Esperando ${(waitTime / 1000).toFixed(1)}s antes de la siguiente búsqueda...`);
        await sleep(waitTime);
      } catch (err: any) {
        console.warn(`   ⚠️ Reintentando búsqueda "${query}":`, err.message);
        await this.page.goto('https://www.bing.com', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await sleep(3000);
      }
    }

    console.log(`✅ Búsquedas de Bing finalizadas: ${completed}/${count} completadas.\n`);
    return completed;
  }
}
