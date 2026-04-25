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
