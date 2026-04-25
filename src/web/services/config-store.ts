import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger';

const logger = createLogger('config-store');

const CONFIG_DIR = process.env.CONFIG_DIR || '/app/data';
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export interface AppConfig {
  discord: {
    token: string;
  };
  lidarr: {
    url: string;
    apiKey: string;
  };
  plex: {
    clientIdentifier: string;
    token?: string;
    serverUrl?: string;
  };
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  };
}

export type SecretKey =
  | 'discord.token'
  | 'lidarr.apiKey'
  | 'plex.token';

const SECRET_KEYS: ReadonlySet<SecretKey> = new Set([
  'discord.token',
  'lidarr.apiKey',
  'plex.token',
]);

const DEFAULT_CONFIG: AppConfig = {
  discord: { token: '' },
  lidarr: { url: '', apiKey: '' },
  plex: { clientIdentifier: 'musicbot-default-id' },
  logging: { level: 'info' },
};

function ensureDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export function readConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      // Bootstrap from environment variables on first run so existing .env-based
      // installations get a populated config.json without manual migration.
      const seeded = seedFromEnv();
      writeConfig(seeded);
      return seeded;
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return mergeWithDefaults(parsed);
  } catch (err) {
    logger.error({ err, path: CONFIG_PATH }, 'Failed to read config — returning defaults');
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: AppConfig): void {
  ensureDir();
  const tmp = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CONFIG_PATH);
  logger.info('Configuration updated');
}

/** Returns a copy of the config with all secrets masked for safe transport to the UI. */
export function redactConfig(config: AppConfig): AppConfig {
  return {
    ...config,
    discord: { token: maskSecret(config.discord.token) },
    lidarr: { ...config.lidarr, apiKey: maskSecret(config.lidarr.apiKey) },
    plex: { ...config.plex, token: config.plex.token ? maskSecret(config.plex.token) : undefined },
  };
}

/**
 * Apply a partial update from the UI. Skips any secret field whose incoming
 * value equals the masked placeholder — that means the UI showed the masked
 * version and the user didn't change it, so the existing secret is preserved.
 */
export function applyUpdate(current: AppConfig, update: Partial<AppConfig>): AppConfig {
  const next: AppConfig = JSON.parse(JSON.stringify(current));

  if (update.discord?.token !== undefined && !isMasked(update.discord.token)) {
    next.discord.token = update.discord.token;
  }
  if (update.lidarr?.url !== undefined) next.lidarr.url = update.lidarr.url;
  if (update.lidarr?.apiKey !== undefined && !isMasked(update.lidarr.apiKey)) {
    next.lidarr.apiKey = update.lidarr.apiKey;
  }
  if (update.plex?.clientIdentifier !== undefined) {
    next.plex.clientIdentifier = update.plex.clientIdentifier;
  }
  if (update.plex?.serverUrl !== undefined) next.plex.serverUrl = update.plex.serverUrl;
  if (update.plex?.token !== undefined && !isMasked(update.plex.token)) {
    next.plex.token = update.plex.token;
  }
  if (update.logging?.level !== undefined) next.logging.level = update.logging.level;

  return next;
}

export function isSecretKey(key: string): key is SecretKey {
  return SECRET_KEYS.has(key as SecretKey);
}

function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 12))}${value.slice(-2)}`;
}

function isMasked(value: string): boolean {
  // Heuristic: contains only the mask pattern (asterisks plus two chars at each end).
  return /^.{0,2}\*{2,}.{0,2}$/.test(value);
}

function mergeWithDefaults(partial: Partial<AppConfig>): AppConfig {
  return {
    discord: { ...DEFAULT_CONFIG.discord, ...partial.discord },
    lidarr: { ...DEFAULT_CONFIG.lidarr, ...partial.lidarr },
    plex: { ...DEFAULT_CONFIG.plex, ...partial.plex },
    logging: { ...DEFAULT_CONFIG.logging, ...partial.logging },
  };
}

function seedFromEnv(): AppConfig {
  return {
    discord: {
      token: process.env.DISCORD_TOKEN === 'your_discord_bot_token'
        ? ''
        : process.env.DISCORD_TOKEN || '',
    },
    lidarr: {
      url: process.env.LIDARR_URL || '',
      apiKey: process.env.LIDARR_API_KEY === 'your_lidarr_api_key'
        ? ''
        : process.env.LIDARR_API_KEY || '',
    },
    plex: {
      clientIdentifier: process.env.PLEX_CLIENT_IDENTIFIER || 'musicbot-default-id',
      token: process.env.PLEX_TOKEN || undefined,
      serverUrl: process.env.PLEX_SERVER_URL || undefined,
    },
    logging: {
      level: (process.env.LOG_LEVEL as AppConfig['logging']['level']) || 'info',
    },
  };
}
