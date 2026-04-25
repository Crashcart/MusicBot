import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const createLogger = (name: string) =>
  pino({
    name,
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: isDev,
        singleLine: false,
        translateTime: 'SYS:standard',
      },
    },
  });

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
