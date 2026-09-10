import { Page, BrowserContext } from 'playwright';
import { config } from './config.js';
import { sleep } from './wordGenerator.js';

export class MissionBot {
  constructor(private context: BrowserContext, private page: Page) {}

  private async cleanExtraTabs(): Promise<void> {
    try {
      const allPages = this.context.pages();
      for (const p of allPages) {
        if (p !== this.page) {
          p.close().catch(() => {});
        }
      }
    } catch {
      // Ignorar
    }
  }

  // Detección con XPaths exactos del estado de nivel en Microsoft Rewards
  async detectUserTier(): Promise<'oro' | 'plata'> {
    try {
      // 1. XPath exacto para Nivel 2 / Oro
      const level2Element = await this.page.$(
        'xpath=//*[contains(text(), "Nivel 2") or contains(text(), "Level 2") or contains(text(), "Nivel 2:") or contains(@aria-label, "Nivel 2") or contains(@aria-label, "Level 2") or contains(@title, "Nivel 2")]'
      );
      if (level2Element) {
        return 'oro';
      }

      // 2. XPath exacto para Nivel 1 / Plata
      const level1Element = await this.page.$(
        'xpath=//*[contains(text(), "Nivel 1") or contains(text(), "Level 1") or contains(text(), "Nivel 1:") or contains(@aria-label, "Nivel 1") or contains(@aria-label, "Level 1") or contains(@title, "Nivel 1")]'
      );
      if (level1Element) {
        return 'plata';
      }
    } catch {
      // En caso de error, usar la configuración
    }

    return config.userTier === 'plata' ? 'plata' : 'oro';
  }

  async readCurrentPoints(): Promise<number | null> {
    try {
      await this.cleanExtraTabs();
      await sleep(1000);

      const balanceSelectors = [
        'mee-rewards-counter-animation span',
        '#balanceSnippet span',
        '.points-count',
        'p.text-title1',
        'span[class*="text-title"]',
        '#id_rc',
        'span[id="id_rc"]',
        'div[class*="balance"] span',
        'div[class*="points"]'
      ];

      for (const sel of balanceSelectors) {
        const elements = await this.page.$$(sel);
        for (const el of elements) {
          const text = await el.innerText().catch(() => '');
          const cleanText = text.replace(/[^0-9]/g, '');
          if (cleanText && parseInt(cleanText, 10) > 0) {
            return parseInt(cleanText, 10);
          }
        }
      }

      const extractedPoints = await this.page.evaluate(() => {
        const allTextElements = Array.from(document.querySelectorAll('h1, h2, p, span, div'));
        for (const el of allTextElements) {
          const text = el.textContent?.trim() || '';
          if (/^\d{1,3}(?:[.,]\d{3})*$/.test(text)) {
            const num = parseInt(text.replace(/[.,]/g, ''), 10);
            const parentContext = el.parentElement?.parentElement?.textContent?.toLowerCase() || '';
            if (num > 0 && (parentContext.includes('puntos') || parentContext.includes('points') || parentContext.includes('disponible') || parentContext.includes('nivel'))) {
              return num;
            }
          }
        }
        return null;
      });

      if (extractedPoints !== null) {
        return extractedPoints;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  async runDailySet(): Promise<void> {
    console.log(`\n==============================================`);
    console.log(`🎯  PASO 1: Conjunto Diario en /dashboard`);
    console.log(`==============================================`);

    await this.cleanExtraTabs();
    await this.page.goto('https://rewards.bing.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(3000);

    // XPath de la cuadrícula de Conjunto Diario
    const dailyCards = await this.page.$$(
      'xpath=//div[contains(@class, "grid gap-3")]/a'
    );

    console.log(`📋 Detectadas ${dailyCards.length} tarjetas en el Conjunto Diario.`);

    for (let i = 0; i < dailyCards.length; i++) {
      try {
        const card = dailyCards[i];
        
        const rawText = (await card.innerText().catch(() => ''));
        const text = rawText.toLowerCase();

        // Omitir si ya está completada
        const hasCheck = await card.$(
          'span.mee-icon-CheckMark, span.mee-icon-SkypeCircleCheck, [class*="check"], svg[class*="check"]'
        );
        if (text.includes('completada') || text.includes('completadas') || hasCheck) {
          console.log(`   [Conjunto Diario ${i + 1}/${dailyCards.length}] ✅ Ya completada.`);
          continue;
        }

        const titleEl = await card.$('xpath=.//p[contains(@class, "Strong") or contains(@class, "text-globalBody")]');
        const title = titleEl ? await titleEl.innerText().catch(() => '') : rawText.split('\n')[0].trim().slice(0, 35);

        console.log(`   [Conjunto Diario ${i + 1}/${dailyCards.length}] 👉 Haciendo 1 clic en "${title}"...`);
        await card.scrollIntoViewIfNeeded().catch(() => {});
        await sleep(800);

        const [popup] = await Promise.all([
          this.context.waitForEvent('page', { timeout: 7000 }).catch(() => null),
          card.click({ force: true }).catch(() => {})
        ]);

        if (popup) {
          await popup.waitForLoadState('domcontentloaded').catch(() => {});
          await sleep(4500);
          await popup.close().catch(() => {});
        } else {
          const href = await card.getAttribute('href');
          if (href && href.startsWith('http')) {
            const temp = await this.context.newPage();
            await temp.goto(href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            await sleep(4500);
            await temp.close().catch(() => {});
          }
        }

        await this.cleanExtraTabs();
        await sleep(1000);
      } catch (err: any) {
        console.warn(`   ⚠️ Error en tarjeta ${i + 1}:`, err.message);
      }
    }
  }

  async runSeguirGanando(): Promise<void> {
    console.log(`\n==============================================`);
    console.log(`🎁  PASO 2: Sección "Seguir Ganando" en /earn`);
    console.log(`==============================================`);

    await this.cleanExtraTabs();
    await this.page.goto('https://rewards.bing.com/earn', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(3000);

    await this.page.evaluate(() => window.scrollBy(0, 500));
    await sleep(1000);

    // Desplegar si está cerrado
    const expandBtn = await this.page.$(
      'xpath=//section[@id="moreactivities"]//button[@aria-expanded="false"] | //button[contains(@aria-label, "Seguir ganando") and @aria-expanded="false"]'
    );
    if (expandBtn) {
      console.log('   🔽 Desplegando sección "Seguir ganando"...');
      await expandBtn.click().catch(() => {});
      await sleep(1500);
    }

    // XPath de la cuadrícula de Seguir Ganando en /earn
    const moreCards = await this.page.$$(
      'xpath=//div[contains(@class, "grid grid-cols-1")]/a | //section[@id="moreactivities"]//a[@href]'
    );

    console.log(`📋 Detectadas ${moreCards.length} tarjetas en "Seguir ganando".`);

    for (let i = 0; i < moreCards.length; i++) {
      try {
        const card = moreCards[i];
        
        const rawText = (await card.innerText().catch(() => ''));
        const text = rawText.toLowerCase();

        if (text.includes('completada') || text.includes('completadas')) {
          continue;
        }

        // Filtro estricto: solo si tiene +X
        const pointsBadge = await card.$('xpath=.//p[contains(@class, "text-statusInformativeTintFg") or contains(text(), "+")]');
        const pointsText = pointsBadge ? await pointsBadge.innerText().catch(() => '') : '';
        const pointsMatch = pointsText.match(/\+\s*(\d+)/);
        if (!pointsMatch) {
          continue;
        }

        const titleEl = await card.$('xpath=.//p[contains(@class, "Strong") or contains(@class, "text-globalBody")]');
        const title = titleEl ? await titleEl.innerText().catch(() => '') : rawText.split('\n')[0].trim().slice(0, 35);
        const points = pointsMatch[0];

        console.log(`   [Seguir Ganando ${i + 1}/${moreCards.length}] 👉 Haciendo 1 clic en "${title}" (${points} pts)...`);
        await card.scrollIntoViewIfNeeded().catch(() => {});
        await sleep(800);

        const [popup] = await Promise.all([
          this.context.waitForEvent('page', { timeout: 7000 }).catch(() => null),
          card.click({ force: true }).catch(() => {})
        ]);

        if (popup) {
          await popup.waitForLoadState('domcontentloaded').catch(() => {});
          await sleep(4500);
          await popup.close().catch(() => {});
        } else {
          const href = await card.getAttribute('href');
          if (href && href.startsWith('http')) {
            const temp = await this.context.newPage();
            await temp.goto(href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            await sleep(4500);
            await temp.close().catch(() => {});
          }
        }

        await this.cleanExtraTabs();
        await sleep(1000);
      } catch (err: any) {
        console.warn(`   ⚠️ Error en actividad ${i + 1}:`, err.message);
      }
    }

    console.log(`✅ Sección "Seguir Ganando" completada.\n`);
  }
}
