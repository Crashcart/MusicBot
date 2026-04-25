import Fastify from 'fastify';
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

// In-memory store for demonstrations. We will move this to SQLite.
const pinStore = new Map<string, any>();

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

    logger.info('Successfully obtained Plex PIN', {
      pinId: id,
      expiresIn: response.data.expiresIn,
    });

    return reply.send({
      pinId: id,
      code,
      authUrl: `https://app.plex.tv/auth#?clientID=${PLEX_CLIENT_IDENTIFIER}&code=${code}&context[device][product]=MusicBot`
    });
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      code: axios.isAxiosError(error) ? error.code : 'unknown',
      status: axios.isAxiosError(error) ? error.response?.status : 'no-response',
      timeout: axios.isAxiosError(error) ? error.message.includes('timeout') : false,
    };
    logger.error('Failed to request Plex PIN', error, errorDetails);
    return reply.status(500).send({ error: 'Failed to communicate with Plex API' });
  }
});

// Step 2: Poll status of PIN
fastify.get('/auth/plex/pin/:id/status', async (request: any, reply) => {
  const pinId = request.params.id;

  if (!pinStore.has(pinId)) {
    logger.warn('PIN status check requested for non-existent PIN', { pinId });
    return reply.status(404).send({ error: 'PIN not found' });
  }

  try {
    logger.debug('Checking Plex PIN status', { pinId });
    const response = await axios.get(`https://plex.tv/api/v2/pins/${pinId}`, {
      timeout: PLEX_API_TIMEOUT_MS,
      headers: {
        'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
        'Accept': 'application/json'
      }
    });

    const { authToken, expiresAt } = response.data;

    if (authToken) {
      logger.info('Plex authentication successful', {
        pinId,
        tokenLength: authToken.length,
      });
      // TODO: Save authToken to SQLite database mapping it to a user/server
      return reply.send({ status: 'authenticated', token: 'saved' }); // Never send the real token to frontend
    }

    logger.debug('Plex PIN still pending', { pinId, expiresAt });
    return reply.send({ status: 'pending' });
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      code: axios.isAxiosError(error) ? error.code : 'unknown',
      status: axios.isAxiosError(error) ? error.response?.status : 'no-response',
      pinId,
    };
    logger.error('Failed to check Plex PIN status', error, errorDetails);
    return reply.status(500).send({ error: 'Failed to verify PIN status' });
  }
});

export const startWebPortal = async () => {
  try {
    logger.info('Starting web portal server', { port: PORT });
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    logger.info('Web Portal listening on http://0.0.0.0:' + PORT);
  } catch (err) {
    const errorDetails = {
      message: err instanceof Error ? err.message : String(err),
      port: PORT,
      code: (err as any)?.code || 'unknown',
    };
    // EADDRINUSE = port already in use, EACCES = permission denied
    if ((err as any)?.code === 'EADDRINUSE') {
      logger.error('Failed to start web portal: Port already in use', err, {
        ...errorDetails,
        hint: `Port ${PORT} is already bound. Check WEB_PORT in .env or kill the conflicting process.`,
      });
    } else if ((err as any)?.code === 'EACCES') {
      logger.error('Failed to start web portal: Permission denied', err, {
        ...errorDetails,
        hint: `Cannot bind to port ${PORT}. Ports < 1024 require root/sudo.`,
      });
    } else {
      logger.error('Failed to start web portal', err, errorDetails);
    }
    process.exit(1);
  }
};

// If run directly
if (require.main === module) {
  startWebPortal();
}
