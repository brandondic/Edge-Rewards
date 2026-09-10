import { chromium, BrowserContext, Page } from 'playwright';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';
import { sleep } from './wordGenerator.js';

export class EdgeManager {
  private context: BrowserContext | null = null;

  private cleanLocks(): void {
    try {
      // Limpiar únicamente archivos de bloqueo del perfil aislado del bot
      const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
      for (const file of lockFiles) {
        const fullPath = path.join(config.userDataDir, file);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch {
      // Ignorar
    }
  }

  async initContext(headless: boolean = config.headless): Promise<BrowserContext> {
    this.cleanLocks();
    await sleep(200);

    if (!fs.existsSync(config.userDataDir)) {
      fs.mkdirSync(config.userDataDir, { recursive: true });
    }

    const baseArgs = [
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-infobars',
      '--test-type',
      '--disable-notifications',
      '--restore-last-session=false',
      '--disable-restore-session-state',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--disable-features=Translate,OptimizationHints,MediaRouter,msEdgeStartupBoost',
      '--start-maximized'
    ];

    console.log(`🔑 Abriendo Edge de forma limpia y directa...`);
    this.context = await chromium.launchPersistentContext(config.userDataDir, {
      channel: 'msedge',
      headless: headless,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      args: baseArgs,
      ignoreDefaultArgs: ['--enable-automation', '--no-sandbox']
    });

    return this.context;
  }

  async getSinglePage(): Promise<Page> {
    if (!this.context) {
      await this.initContext();
    }

    const pages = this.context!.pages();
    const mainPage = pages.length > 0 ? pages[0] : await this.context!.newPage();

    await mainPage.setViewportSize({ width: 1280, height: 800 });
    await mainPage.bringToFront().catch(() => {});

    console.log(`🌐 Navegando a ${config.rewardsUrl}...`);
    await mainPage.goto(config.rewardsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Cerrar cualquier pestaña about:blank extra que haya abierto Edge al arrancar
    const currentPages = this.context!.pages();
    for (let i = 1; i < currentPages.length; i++) {
      currentPages[i].close().catch(() => {});
    }

    return mainPage;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
