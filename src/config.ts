import 'dotenv/config';
import path from 'path';

export type UserTier = 'oro' | 'plata' | 'auto';

export interface BotConfig {
  userTier: UserTier;
  desktopSearchesOro: number;
  desktopSearchesPlata: number;
  desktopSearches: number;
  minSearchDelayMs: number;
  maxSearchDelayMs: number;
  headless: boolean;
  profileDirectory: string;
  userDataDir: string;
  bingUrl: string;
  rewardsUrl: string;
}

const tier: UserTier = (process.env.REWARDS_TIER as UserTier) || 'oro';
const searchesOro = parseInt(process.env.SEARCHES_ORO || '20', 10);
const searchesPlata = parseInt(process.env.SEARCHES_PLATA || '10', 10);

// Configuración de la carpeta de perfil (leída desde .env para máxima privacidad)
const envUserDataDir = process.env.USER_DATA_DIR || '.edge_rewards_profile';
const resolvedUserDataDir = path.isAbsolute(envUserDataDir)
  ? envUserDataDir
  : path.resolve(process.cwd(), envUserDataDir);

export const config: BotConfig = {
  userTier: tier,
  desktopSearchesOro: searchesOro,
  desktopSearchesPlata: searchesPlata,
  desktopSearches: tier === 'plata' ? searchesPlata : searchesOro,
  minSearchDelayMs: parseInt(process.env.MIN_DELAY_MS || '6000', 10),
  maxSearchDelayMs: parseInt(process.env.MAX_DELAY_MS || '12000', 10),
  headless: process.env.HEADLESS === 'true',
  profileDirectory: process.env.EDGE_PROFILE || 'Default',
  userDataDir: resolvedUserDataDir,
  bingUrl: 'https://www.bing.com',
  rewardsUrl: 'https://rewards.bing.com/dashboard'
};
