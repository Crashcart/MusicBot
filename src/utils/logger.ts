import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

export const LOG_DIR = process.env.LOG_DIR || '/app/data/logs';

function ensureLogDir(): boolean {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    return true;
  } catch {
    // /app/data/logs may not exist when running outside Docker — fall back to stdout-only.
    return false;
  }
}

const logDirWritable = ensureLogDir();

export const createLogger = (name: string) => {
  const level = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

  const targets: pino.TransportTargetOptions[] = [
    {
      target: 'pino-pretty',
      level,
      options: {
        colorize: isDev,
        singleLine: false,
        translateTime: 'SYS:standard',
      },
    },
  ];

  if (logDirWritable) {
    // Newline-delimited JSON, one file per service for easy tailing from the web UI.
    targets.push({
      target: 'pino/file',
      level,
      options: {
        destination: path.join(LOG_DIR, `${name}.log`),
        mkdir: true,
      },
    });
  }

  return pino({
    name,
    level,
    transport: { targets },
  });
};

export const getContextLogger = (name: string, context?: Record<string, unknown>) => {
  const logger = createLogger(name);
  return {
    debug: (msg: string, data?: Record<string, unknown>) =>
      logger.debug({ ...context, ...data }, msg),
    info: (msg: string, data?: Record<string, unknown>) =>
      logger.info({ ...context, ...data }, msg),
    warn: (msg: string, data?: Record<string, unknown>) =>
      logger.warn({ ...context, ...data }, msg),
    error: (msg: string, error?: unknown, data?: Record<string, unknown>) =>
      logger.error({ err: error, ...context, ...data }, msg),
  };
};
