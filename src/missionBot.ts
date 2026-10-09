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

  // Detección automática del nivel leyendo la insignia oficial de Rewards ("Asociado Plata" o "Asociado Oro")
  async detectUserTier(): Promise<'oro' | 'plata'> {
    // Si el usuario forzó explícitamente en su .env 'oro' o 'plata', respetarlo
    if (config.userTier === 'oro' || config.userTier === 'plata') {
      return config.userTier;
    }

    try {
      // Esperar brevemente a que cargue la interfaz
      await sleep(1500);

      // 1. Selector específico para la insignia de nivel moderna de Microsoft Rewards:
      // <p class="rounded-ctrlBadgeCorner px-2 py-1 text-globalCaption1Strong text-rewardsLevelBadgeFg bg-rewardsSilverBadgeBg">Asociado Plata</p>
      const badgeSelectors = [
        'p.text-rewardsLevelBadgeFg',
        'p[class*="rewardsLevelBadgeFg"]',
        'p[class*="rewardsSilverBadgeBg"]',
        'p[class*="rewardsGoldBadgeBg"]',
        'p.rounded-ctrlBadgeCorner',
        '.rounded-ctrlBadgeCorner'
      ];

      for (const sel of badgeSelectors) {
        const badges = await this.page.$$(sel);
        for (const badge of badges) {
          const text = (await badge.innerText().catch(() => '')).toLowerCase().trim();
          const attr = await badge.getAttribute('class').catch(() => '');
          const className = (attr || '').toLowerCase();

          // Comprobar si es Plata
          if (text.includes('plata') || text.includes('silver') || className.includes('rewardssilverbadgebg')) {
            console.log(`   🏷️ Insignia detectada: "${text}" ➔ Nivel PLATA`);
            return 'plata';
          }

          // Comprobar si es Oro
          if (text.includes('oro') || text.includes('gold') || className.includes('rewardsgoldbadgebg')) {
            console.log(`   🏷️ Insignia detectada: "${text}" ➔ Nivel ORO`);
            return 'oro';
          }
        }
      }

      // 2. XPath directo buscando el texto exacto proporcionado o clases
      const silverBadge = await this.page.$(
        'xpath=//p[contains(@class, "bg-rewardsSilverBadgeBg") or contains(@class, "text-rewardsLevelBadgeFg")][contains(text(), "Plata") or contains(text(), "Silver")] | //*[contains(text(), "Asociado Plata")] | //*[contains(text(), "Nivel 1")]'
      );
      if (silverBadge) {
        const text = await silverBadge.innerText().catch(() => 'Asociado Plata');
        console.log(`   🏷️ Insignia detectada por XPath: "${text.trim()}" ➔ Nivel PLATA`);
        return 'plata';
      }

      const goldBadge = await this.page.$(
        'xpath=//p[contains(@class, "bg-rewardsGoldBadgeBg") or contains(@class, "text-rewardsLevelBadgeFg")][contains(text(), "Oro") or contains(text(), "Gold")] | //*[contains(text(), "Asociado Oro")] | //*[contains(text(), "Nivel 2")]'
      );
      if (goldBadge) {
        const text = await goldBadge.innerText().catch(() => 'Asociado Oro');
        console.log(`   🏷️ Insignia detectada por XPath: "${text.trim()}" ➔ Nivel ORO`);
        return 'oro';
      }

      // 3. Evaluación general en el DOM por si el elemento está anidado
      const detectedInDOM = await this.page.evaluate(() => {
        const allBadgeElements = Array.from(document.querySelectorAll('p, span, div'));
        for (const el of allBadgeElements) {
          const classStr = el.className?.toString().toLowerCase() || '';
          const textStr = el.textContent?.toLowerCase().trim() || '';

          if (classStr.includes('rewardssilverbadgebg') || textStr === 'asociado plata' || textStr.includes('nivel 1')) {
            return 'plata';
          }
          if (classStr.includes('rewardsgoldbadgebg') || textStr === 'asociado oro' || textStr.includes('nivel 2')) {
            return 'oro';
          }
        }
        return null;
      });

      if (detectedInDOM) {
        console.log(`   🏷️ Nivel detectado en DOM: Nivel ${detectedInDOM.toUpperCase()}`);
        return detectedInDOM;
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Nota al detectar insignia de nivel:`, err.message);
    }

    // Por defecto si no se detecta (10 búsquedas seguras para evitar penalización)
    return 'plata';
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
