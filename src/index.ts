import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { createLidarrClient } from './integrations/lidarr-client';
import { registerCommands, setupCommandListener } from './commands/command-handler';
import { readConfig } from './web/services/config-store';

dotenv.config();

const logger = createLogger('discord-bot');

// Runtime config managed by the web portal. Token from config.json takes
// precedence over the .env DISCORD_TOKEN so changes via the UI take effect
// on the next bot restart without the user having to edit files manually.
const runtimeConfig = readConfig();

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
const DISCORD_TOKEN = runtimeConfig.discord.token || process.env.DISCORD_TOKEN;
if (DISCORD_TOKEN && DISCORD_TOKEN !== 'your_discord_bot_token') {
  client.login(DISCORD_TOKEN).catch(err => {
    logger.error({
      err,
      tokenLength: DISCORD_TOKEN.length,
      tokenPrefix: DISCORD_TOKEN.substring(0, 4),
    }, 'Failed to login to Discord');
    process.exit(1);
  });
} else {
  logger.warn('No valid DISCORD_TOKEN found in .env. Bot will not connect to Discord.');
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    err: reason,
    promise: String(promise),
    type: typeof reason,
  }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({
    err: error,
    stack: error instanceof Error ? error.stack : 'N/A',
    message: error instanceof Error ? error.message : String(error),
  }, 'Uncaught Exception');
  process.exit(1);
});

logger.info('Discord bot starting...');

