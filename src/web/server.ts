import Fastify, { FastifyRequest } from 'fastify';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger('web-portal');

const fastify = Fastify({
  logger: createLogger('fastify-server'),
});

const PLEX_CLIENT_IDENTIFIER = process.env.PLEX_CLIENT_IDENTIFIER || 'musicbot-default-id';
const PORT = parseInt(process.env.PORT || '3000', 10);
const PLEX_API_TIMEOUT_MS = 10_000;

interface PlexPin {
  id: number;
  code: string;
  expiresIn?: number;
  expiresAt?: string;
  authToken?: string | null;
}

// In-memory store for pending PIN authentications. Will move to SQLite.
const pinStore = new Map<string, PlexPin>();

fastify.get('/', async (request, reply) => {
  return { status: 'online', message: 'MusicBot Web Portal' };
});

// Step 1: Request a PIN from Plex
fastify.post('/auth/plex/pin', async (request, reply) => {
  try {
    logger.debug('Requesting PIN from Plex API');
    const response = await axios.post('https://plex.tv/api/v2/pins', null, {
      params: { strong: true },
      timeout: PLEX_API_TIMEOUT_MS,
      headers: {
        'X-Plex-Product': 'MusicBot',
        'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
        'Accept': 'application/json'
      }
    });

    const { id, code } = response.data;
    pinStore.set(id.toString(), response.data);

    logger.info({
      pinId: id,
      expiresIn: response.data.expiresIn,
    }, 'Successfully obtained Plex PIN');

    return reply.send({
      pinId: id,
      code,
      authUrl: `https://app.plex.tv/auth#?clientID=${PLEX_CLIENT_IDENTIFIER}&code=${code}&context[device][product]=MusicBot`
    });
  } catch (error) {
    logger.error({
      err: error,
      message: error instanceof Error ? error.message : String(error),
      code: axios.isAxiosError(error) ? error.code : 'unknown',
      status: axios.isAxiosError(error) ? error.response?.status : 'no-response',
      timeout: axios.isAxiosError(error) ? error.message.includes('timeout') : false,
    }, 'Failed to request Plex PIN');
    return reply.status(500).send({ error: 'Failed to communicate with Plex API' });
  }
});

// Step 2: Poll status of PIN
type PinStatusRequest = FastifyRequest<{ Params: { id: string } }>;
fastify.get('/auth/plex/pin/:id/status', async (request: PinStatusRequest, reply) => {
  const pinId = request.params.id;

  if (!pinStore.has(pinId)) {
    logger.warn({ pinId }, 'PIN status check requested for non-existent PIN');
    return reply.status(404).send({ error: 'PIN not found' });
  }

  try {
    logger.debug({ pinId }, 'Checking Plex PIN status');
    const response = await axios.get(`https://plex.tv/api/v2/pins/${pinId}`, {
      timeout: PLEX_API_TIMEOUT_MS,
      headers: {
        'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
        'Accept': 'application/json'
      }
    });

    const { authToken, expiresAt } = response.data;

    if (authToken) {
      logger.info({
        pinId,
        tokenLength: authToken.length,
      }, 'Plex authentication successful');
      // TODO: Save authToken to SQLite database mapping it to a user/server.
      // Until persistence is implemented, do NOT advertise success — token is lost on restart.
      return reply.send({ status: 'authenticated', persisted: false });
    }

    logger.debug({ pinId, expiresAt }, 'Plex PIN still pending');
    return reply.send({ status: 'pending' });
  } catch (error) {
    logger.error({
      err: error,
      message: error instanceof Error ? error.message : String(error),
      code: axios.isAxiosError(error) ? error.code : 'unknown',
      status: axios.isAxiosError(error) ? error.response?.status : 'no-response',
      pinId,
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
    const errorCode = (err as any)?.code || 'unknown';
    const baseDetails = {
      err,
      message: err instanceof Error ? err.message : String(err),
      port: PORT,
      code: errorCode,
    };
    // EADDRINUSE = port already in use, EACCES = permission denied
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

// If run directly
if (require.main === module) {
  startWebPortal();
}
