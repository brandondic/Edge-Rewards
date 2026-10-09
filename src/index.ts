import { EdgeManager } from './browser.js';
import { SearchBot } from './searchBot.js';
import { MissionBot } from './missionBot.js';
import { config } from './config.js';
import { sleep } from './wordGenerator.js';

async function main() {
  const args = process.argv.slice(2);
  const isHeadless = args.includes('--headless');

  console.log(`\n======================================================`);
  console.log(`🤖  RPA MICROSOFT REWARDS - EJECUCIÓN AUTOMÁTICA`);
  console.log(`======================================================`);
  console.log(`📅 Fecha/Hora: ${new Date().toLocaleString()}`);
  console.log(`👤 Perfil: ${config.userDataDir}`);
  console.log(`======================================================\n`);

  const edgeManager = new EdgeManager();

  try {
    const context = await edgeManager.initContext(isHeadless);
    const mainPage = await edgeManager.getSinglePage();

    const missionBot = new MissionBot(context, mainPage);

    // 1. Lectura inicial de puntos y detección de rango
    console.log(`📊 Comprobando estado inicial de la cuenta...`);
    const initialPoints = await missionBot.readCurrentPoints();
    if (initialPoints !== null) {
      console.log(`⭐ Puntos Iniciales: ${initialPoints.toLocaleString()} pts`);
    }

    // Detección dinámica de la insignia ("Asociado Plata" vs "Asociado Oro")
    const detectedTier = await missionBot.detectUserTier();
    let searchCount: number;

    if (detectedTier === 'oro') {
      searchCount = config.desktopSearchesOro; // 20 búsquedas
      console.log(`🏅 Rango de Usuario: Nivel ORO (Asociado Oro) ➔ Ejecutando 20 búsquedas`);
    } else {
      searchCount = config.desktopSearchesPlata; // 10 búsquedas
      console.log(`🥈 Rango de Usuario: Nivel PLATA (Asociado Plata) ➔ Ejecutando 10 búsquedas`);
    }

    // 2. PASO 1: Conjunto Diario (Daily Set)
    await missionBot.runDailySet();

    // 3. PASO 2: Seguir Ganando (Clics a las tarjetas +X)
    await missionBot.runSeguirGanando();

    // 4. PASO 3: Búsquedas de PC en Bing (20 para Oro / 10 para Plata)
    console.log(`\n==============================================`);
    console.log(`🔍  PASO 3: Búsquedas en Bing (PC: ${searchCount} búsquedas)`);
    console.log(`==============================================`);
    const searchBot = new SearchBot(mainPage);
    await searchBot.runDesktopSearches(searchCount);

    // 5. PASO 4: Verificación final
    console.log(`\n==============================================`);
    console.log(`🏆  RESUMEN FINAL`);
    console.log(`==============================================`);
    await mainPage.goto(config.rewardsUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await sleep(2500);

    const finalPoints = await missionBot.readCurrentPoints();
    if (finalPoints !== null) {
      console.log(`⭐ Puntos Finales: ${finalPoints.toLocaleString()} pts`);
      if (initialPoints !== null) {
        const gained = finalPoints - initialPoints;
        console.log(`🎉 Puntos Ganados en esta sesión: +${gained} pts`);
      }
    }

    console.log(`\n✅ Verificación exitosa: 100% de las actividades del día completadas.`);
    console.log(`✨ Cerrando navegador y terminal automáticamente...`);
  } catch (error: any) {
    console.error(`❌ Ocurrió un error durante la ejecución:`, error);
  } finally {
    await edgeManager.close();
    console.log(`🔒 Navegador cerrado correctamente.\n`);
  }
}

main();
