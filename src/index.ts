import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { createLidarrClient } from './integrations/lidarr-client';
import { registerCommands, setupCommandListener } from './commands/command-handler';

dotenv.config();

const logger = createLogger('discord-bot');

// Initialise external service clients
const lidarrClient = createLidarrClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ]
});

client.once('ready', async () => {
  logger.info(`Discord Bot logged in as ${client.user?.tag}`);

  // Register slash commands with Discord API
  await registerCommands(client);
});

// Set up command interaction listener
setupCommandListener(client, lidarrClient);

// Start Discord Bot
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (DISCORD_TOKEN && DISCORD_TOKEN !== 'your_discord_bot_token') {
  client.login(DISCORD_TOKEN).catch(err => {
    logger.error('Failed to login to Discord', err, {
      tokenLength: DISCORD_TOKEN.length,
      tokenPrefix: DISCORD_TOKEN.substring(0, 4),
    });
    process.exit(1);
  });
} else {
  logger.warn('No valid DISCORD_TOKEN found in .env. Bot will not connect to Discord.');
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', reason, {
    promise: String(promise),
    type: typeof reason,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error, {
    stack: error instanceof Error ? error.stack : 'N/A',
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

logger.info('Discord bot starting...');

