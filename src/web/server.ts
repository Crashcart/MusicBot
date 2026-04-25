import Fastify from 'fastify';
import axios from 'axios';
import pino from 'pino';
import * as dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
  logger: pino({
    transport: {
      target: 'pino-pretty'
    }
  })
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

    return reply.send({
      pinId: id,
      code,
      authUrl: `https://app.plex.tv/auth#?clientID=${PLEX_CLIENT_IDENTIFIER}&code=${code}&context[device][product]=MusicBot`
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to request Plex PIN');
    return reply.status(500).send({ error: 'Failed to communicate with Plex API' });
  }
});

// Step 2: Poll status of PIN
fastify.get('/auth/plex/pin/:id/status', async (request: any, reply) => {
  const pinId = request.params.id;
  
  if (!pinStore.has(pinId)) {
    return reply.status(404).send({ error: 'PIN not found' });
  }

  try {
    const response = await axios.get(`https://plex.tv/api/v2/pins/${pinId}`, {
      timeout: PLEX_API_TIMEOUT_MS,
      headers: {
        'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
        'Accept': 'application/json'
      }
    });

    const { authToken } = response.data;
    
    if (authToken) {
      // User has authenticated!
      // TODO: Save authToken to SQLite database mapping it to a user/server
      return reply.send({ status: 'authenticated', token: 'saved' }); // Never send the real token to frontend
    }

    return reply.send({ status: 'pending' });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to check Plex PIN status');
    return reply.status(500).send({ error: 'Failed to verify PIN status' });
  }
});

export const startWebPortal = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Web Portal listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// If run directly
if (require.main === module) {
  startWebPortal();
}
