import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import axios from 'axios';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger';
import {
  readConfig,
  writeConfig,
  redactConfig,
  applyUpdate,
  AppConfig,
} from './services/config-store';
import {
  listAvailableLogs,
  readTail,
  tailFile,
} from './services/log-reader';
import {
  login,
  logout,
  requireAuth,
  isPasswordSet,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from './services/auth';

dotenv.config();

const logger = createLogger('web-portal');

const fastify = Fastify({
  logger: createLogger('fastify-server'),
});

const PLEX_CLIENT_IDENTIFIER = readConfig().plex.clientIdentifier;
const PORT = parseInt(process.env.PORT || '3000', 10);
const PLEX_API_TIMEOUT_MS = 10_000;

interface PlexPin {
  id: number;
  code: string;
  expiresIn?: number;
  expiresAt?: string;
  authToken?: string | null;
}

const pinStore = new Map<string, PlexPin>();

// --- Plugins ---
fastify.register(fastifyCookie);
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', '..', 'src', 'web', 'public'),
  prefix: '/',
  decorateReply: false,
});

// --- Health ---
fastify.get('/api/health', async () => ({
  status: 'online',
  authRequired: isPasswordSet(),
  message: 'MusicBot Web Portal',
}));

// --- Auth routes ---
fastify.post('/api/auth/login', async (request, reply) => {
  const body = request.body as { password?: string } | undefined;
  if (!body?.password) {
    return reply.code(400).send({ error: 'Password required' });
  }
  const token = login(body.password);
  if (!token) {
    return reply.code(401).send({ error: 'Invalid password' });
  }
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return { ok: true };
});

fastify.post('/api/auth/logout', async (request, reply) => {
  logout(request.cookies?.[SESSION_COOKIE_NAME]);
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return { ok: true };
});

fastify.get('/api/auth/status', async (request) => ({
  authRequired: isPasswordSet(),
  authenticated: !isPasswordSet() ||
    !!request.cookies?.[SESSION_COOKIE_NAME],
}));

// --- Config routes (protected) ---
fastify.get('/api/config', { preHandler: requireAuth }, async () => {
  return redactConfig(readConfig());
});

fastify.put('/api/config', { preHandler: requireAuth }, async (request, reply) => {
  const update = request.body as Partial<AppConfig>;
  if (!update || typeof update !== 'object') {
    return reply.code(400).send({ error: 'Invalid request body' });
  }
  const current = readConfig();
  const next = applyUpdate(current, update);
  try {
    writeConfig(next);
  } catch (err) {
    logger.error({ err }, 'Failed to persist config update');
    return reply.code(500).send({ error: 'Failed to write config' });
  }
  return redactConfig(next);
});

// --- Logs routes (protected) ---
fastify.get('/api/logs', { preHandler: requireAuth }, async () => {
  return { services: listAvailableLogs() };
});

interface LogsRoute {
  Params: { service: string };
  Querystring: { lines?: string };
}

fastify.get<LogsRoute>('/api/logs/:service', { preHandler: requireAuth }, async (request, reply) => {
  try {
    const lines = parseInt(request.query.lines || '200', 10);
    const entries = readTail(request.params.service, isNaN(lines) ? 200 : lines);
    return { service: request.params.service, entries };
  } catch (err) {
    return reply.code(400).send({
      error: err instanceof Error ? err.message : 'Invalid log request',
    });
  }
});

// SSE stream — emits one event per new log line.
fastify.get<LogsRoute>('/api/logs/:service/stream', { preHandler: requireAuth }, async (request, reply) => {
  let tail;
  try {
    tail = tailFile(request.params.service);
  } catch (err) {
    return reply.code(400).send({
      error: err instanceof Error ? err.message : 'Invalid log request',
    });
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.raw.write(': connected\n\n');

  const onLine = (entry: unknown) => {
    reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`);
  };
  tail.emitter.on('line', onLine);

  // Heartbeat to keep proxies from idling out the connection.
  const heartbeat = setInterval(() => reply.raw.write(': hb\n\n'), 30_000);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    tail.stop();
  });
});

// --- Plex auth (existing) ---
fastify.post('/api/auth/plex/pin', async (request, reply) => {
  try {
    logger.debug('Requesting PIN from Plex API');
    const response = await axios.post('https://plex.tv/api/v2/pins', null, {
      params: { strong: true },
      timeout: PLEX_API_TIMEOUT_MS,
      headers: {
        'X-Plex-Product': 'MusicBot',
        'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
        'Accept': 'application/json',
      },
    });
    const { id, code } = response.data;
    pinStore.set(id.toString(), response.data);
    logger.info({ pinId: id }, 'Successfully obtained Plex PIN');
    return reply.send({
      pinId: id,
      code,
      authUrl: `https://app.plex.tv/auth#?clientID=${PLEX_CLIENT_IDENTIFIER}&code=${code}&context[device][product]=MusicBot`,
    });
  } catch (error) {
    logger.error({
      err: error,
      code: axios.isAxiosError(error) ? error.code : 'unknown',
      status: axios.isAxiosError(error) ? error.response?.status : 'no-response',
    }, 'Failed to request Plex PIN');
    return reply.status(500).send({ error: 'Failed to communicate with Plex API' });
  }
});

interface PinStatusRoute { Params: { id: string } }
fastify.get<PinStatusRoute>('/api/auth/plex/pin/:id/status', async (request, reply) => {
  const pinId = request.params.id;
  if (!pinStore.has(pinId)) {
    logger.warn({ pinId }, 'PIN status check for non-existent PIN');
    return reply.status(404).send({ error: 'PIN not found' });
  }
  try {
    const response = await axios.get(`https://plex.tv/api/v2/pins/${pinId}`, {
      timeout: PLEX_API_TIMEOUT_MS,
      headers: {
        'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
        'Accept': 'application/json',
      },
    });
    const { authToken } = response.data;
    if (authToken) {
      logger.info({ pinId }, 'Plex authentication successful — persisting token');
      const cfg = readConfig();
      cfg.plex.token = authToken;
      writeConfig(cfg);
      return reply.send({ status: 'authenticated', persisted: true });
    }
    return reply.send({ status: 'pending' });
  } catch (error) {
    logger.error({
      err: error,
      pinId,
      code: axios.isAxiosError(error) ? error.code : 'unknown',
    }, 'Failed to check Plex PIN status');
    return reply.status(500).send({ error: 'Failed to verify PIN status' });
  }
});

export const startWebPortal = async () => {
  try {
    logger.info({ port: PORT }, 'Starting web portal server');
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    logger.info('Web Portal listening on http://0.0.0.0:' + PORT);
  } catch (err) {
    const errorCode = (err as NodeJS.ErrnoException)?.code || 'unknown';
    const baseDetails = {
      err,
      message: err instanceof Error ? err.message : String(err),
      port: PORT,
      code: errorCode,
    };
    if (errorCode === 'EADDRINUSE') {
      logger.error({
        ...baseDetails,
        hint: `Port ${PORT} is already bound. Check WEB_PORT in .env or kill the conflicting process.`,
      }, 'Failed to start web portal: Port already in use');
    } else if (errorCode === 'EACCES') {
      logger.error({
        ...baseDetails,
        hint: `Cannot bind to port ${PORT}. Ports < 1024 require root/sudo.`,
      }, 'Failed to start web portal: Permission denied');
    } else {
      logger.error(baseDetails, 'Failed to start web portal');
    }
    process.exit(1);
  }
};

if (require.main === module) {
  startWebPortal();
}
